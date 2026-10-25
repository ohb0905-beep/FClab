import { NextRequest, NextResponse } from "next/server";
import {
  ensureInitialSeed,
  getStoreSnapshot,
  getServerNexonApiKey,
  getServerNexonApiKeyPreview,
  getSystemRules,
  syncGameRulesFromWeb,
  syncNexonMetadata,
  crawlPlayerList,
  crawlPlayerAbility,
  crawlPriceHistory,
  evaluateCardEfficiencySync,
  analyzePlayerProfileSync,
  computePlayerFeelMetricsSync,
  buildDashboardRecommendationsSync,
  enrichPlayerCardMetaSync,
  selectSamePositionCompetitors,
  analyzeSquadAsync,
  saveSquadToStore,
  deleteSquadFromStore,
  POSITION_WEIGHTS,
  POSITION_CORE_STATS,
  ARCHETYPES,
} from "@/lib/server/fclab-engine";
import {
  analyzeUserMatchesOnServer,
  NexonServiceError,
} from "@/lib/server/nexon-match-service";
import {
  buildMarketLabDashboard,
  registerMarketEvent,
  runIncrementalMarketCollectionBatch,
  syncOfficialEventsAndNotices,
  syncRankerUsageAndRecords,
  syncCoreGradesPriceHistory,
} from "@/lib/server/fclab-market-engine";

function nowUtc(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    await ensureInitialSeed();
    const { path: pathSegments } = await context.params;
    const subPath = pathSegments.join("/");
    const sp = req.nextUrl.searchParams;
    const store = getStoreSnapshot();

    // 0. GET /api/fclab/rules or /api/fclab/v1/rules
    if (subPath === "rules" || subPath === "v1/rules") {
      const rules = getSystemRules();
      return NextResponse.json({
        ok: true,
        rules,
        systemRules: rules,
      });
    }

    // 1. GET /api/fclab/v1/dashboard
    if (subPath === "v1/dashboard") {
      const allCards = Object.values(store.cards);
      const fullCards = allCards.filter((c) => c.has_full_ability);
      const { popularCards: topCards, efficiencyPicks: effPicks } =
        buildDashboardRecommendationsSync();

      const seasonSet = new Map<
        string,
        { season_code: string; season_name: string; season_img: string }
      >();
      for (const c of allCards) {
        if (!seasonSet.has(c.season_code)) {
          seasonSet.set(c.season_code, {
            season_code: c.season_code,
            season_name: c.season_name,
            season_img: c.season_img,
          });
        }
      }

      const hasNexonKey = Boolean(getServerNexonApiKey());
      const keyPreview = getServerNexonApiKeyPreview();
      const systemRules = getSystemRules();

      return NextResponse.json({
        ok: true,
        status: "ok",
        meta_spid_count: Object.keys(store.seasons).length > 0 ? 64850 : 0,
        cached_player_count: allCards.length,
        popular_cards: topCards,
        top_efficiency_cards: effPicks,
        saved_squads: store.savedSquads,
        nexon_key_configured: hasNexonKey,
        nexon_key_preview: keyPreview,
        position_weights: POSITION_WEIGHTS,
        position_core_stats: POSITION_CORE_STATS,
        systemRules,
        rules: systemRules,
        stats: {
          totalCards: allCards.length,
          detailedCards: fullCards.length,
          seasonsCount: Object.keys(store.seasons).length,
          hasNexonApiKey: hasNexonKey,
          serverTime: nowUtc(),
        },
        connectionStatus: {
          nexonStaticMetadata: Object.keys(store.seasons).length > 0,
          fcDatacenterCrawler: allCards.length > 0,
          nexonUserMatchApi: hasNexonKey,
        },
        topCards,
        efficiencyPicks: effPicks,
        savedSquads: store.savedSquads,
        availableSeasons: Array.from(seasonSet.values()),
        positionWeights: POSITION_WEIGHTS,
        positionCoreStats: POSITION_CORE_STATS,
        archetypes: ARCHETYPES,
      });
    }

    // 2. GET /api/fclab/v1/players/search
    if (subPath === "v1/players/search") {
      const q = (sp.get("q") || "").trim();
      const pos = (sp.get("position") || "").trim().toUpperCase();
      const season = (sp.get("season") || "").trim();
      const sortBy = sp.get("sort") || "ovr_desc";
      const forceCrawl = sp.get("crawl") === "1";

      if (q) {
        const existingMatches = Object.values(store.cards).filter((c) =>
          c.name.includes(q)
        );
        if (existingMatches.length < 3 || forceCrawl) {
          await crawlPlayerList(q, 40);
        }
      }

      let filtered = Object.values(store.cards);
      if (q) {
        filtered = filtered.filter((c) =>
          c.name.toLowerCase().includes(q.toLowerCase())
        );
      }
      if (pos && pos !== "ALL") {
        filtered = filtered.filter(
          (c) =>
            c.primary_position === pos ||
            (c.positions || []).some((p) => p.pos === pos)
        );
      }
      if (season && season !== "ALL") {
        filtered = filtered.filter((c) => c.season_code === season);
      }

      const trapBadgeFilter = (sp.get("trap_badge") || "ALL").trim().toUpperCase();
      let enriched = filtered.map((rawCard) => {
        const c = enrichPlayerCardMetaSync(rawCard);
        return {
          ...c,
          feelMetrics: computePlayerFeelMetricsSync(
            c,
            pos && pos !== "ALL" ? pos : c.primary_position,
            8,
            0,
            false
          ),
        };
      });

      if (trapBadgeFilter !== "ALL") {
        enriched = enriched.filter(
          (c) => c.feelMetrics?.statTrapBadge === trapBadgeFilter
        );
      }

      if (sortBy === "bp_desc") {
        enriched.sort((a, b) => b.bp_1 - a.bp_1 || b.ovr - a.ovr);
      } else if (sortBy === "bp_asc") {
        enriched.sort((a, b) => {
          const aBp = a.bp_1 > 0 ? a.bp_1 : Number.MAX_SAFE_INTEGER;
          const bBp = b.bp_1 > 0 ? b.bp_1 : Number.MAX_SAFE_INTEGER;
          return aBp - bBp || b.ovr - a.ovr;
        });
      } else if (sortBy === "salary_asc") {
        enriched.sort((a, b) => a.salary - b.salary || b.ovr - a.ovr);
      } else if (sortBy === "salary_desc") {
        enriched.sort((a, b) => b.salary - a.salary || b.ovr - a.ovr);
      } else if (sortBy === "feel_desc") {
        enriched.sort(
          (a, b) =>
            (b.feelMetrics?.feelScore || 0) - (a.feelMetrics?.feelScore || 0) ||
            b.ovr - a.ovr
        );
      } else if (sortBy === "salary_eff_desc") {
        enriched.sort(
          (a, b) =>
            (b.feelMetrics?.positionSalaryEfficiency || 0) -
              (a.feelMetrics?.positionSalaryEfficiency || 0) || b.ovr - a.ovr
        );
      } else if (sortBy === "ranker_desc") {
        enriched.sort(
          (a, b) =>
            (b.feelMetrics?.rankerPickRate || 0) -
              (a.feelMetrics?.rankerPickRate || 0) || b.ovr - a.ovr
        );
      } else if (sortBy === "ovr_asc") {
        enriched.sort((a, b) => a.ovr - b.ovr || a.bp_1 - b.bp_1);
      } else if (sortBy === "season_desc") {
        enriched.sort(
          (a, b) =>
            b.season_code.localeCompare(a.season_code) || b.ovr - a.ovr
        );
      } else if (sortBy === "rating_desc") {
        enriched.sort(
          (a, b) =>
            b.rating_score - a.rating_score || b.rating_count - a.rating_count
        );
      } else {
        enriched.sort((a, b) => b.ovr - a.ovr || b.bp_1 - a.bp_1);
      }

      const cards = enriched.slice(0, 60);
      return NextResponse.json({
        ok: true,
        cards,
        items: cards,
        count: cards.length,
        query: q,
        systemRules: getSystemRules(),
        fetchedAt: nowUtc(),
      });
    }

    // 3. GET /api/fclab/v1/players/detail
    if (subPath === "v1/players/detail") {
      const rules = getSystemRules();
      const spid = Number(sp.get("spid") || 0);
      const grade = Math.max(
        1,
        Math.min(rules.maxEnhanceLevel, Number(sp.get("grade") || 8))
      );
      const teamColor = Number(sp.get("team_color") ?? 0);
      const targetPos = (sp.get("pos") || "").trim().toUpperCase();
      const refresh = sp.get("refresh") === "1";

      if (spid <= 0) {
        return NextResponse.json(
          { ok: false, error: "유효한 선수 식별자(spid)가 필요합니다." },
          { status: 400 }
        );
      }

      const rawCard = await crawlPlayerAbility(spid, refresh);
      if (!rawCard) {
        return NextResponse.json(
          { ok: false, error: `선수 카드(${spid}) 정보를 불러올 수 없습니다.` },
          { status: 404 }
        );
      }
      const card = enrichPlayerCardMetaSync(rawCard);

      const posToUse = targetPos || card.primary_position || "ST";
      const efficiency = evaluateCardEfficiencySync(
        card,
        posToUse,
        grade,
        teamColor
      );
      const profile = analyzePlayerProfileSync(card, grade, teamColor, posToUse);
      const priceHistory = await crawlPriceHistory(
        spid,
        Math.min(Math.max(1, grade), rules.maxEnhanceLevel)
      );

      const allCards = Object.values(store.cards);
      const otherSeasons = allCards
        .filter((c) => c.pid === card.pid && c.spid !== spid)
        .map(enrichPlayerCardMetaSync)
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 12);

      // 동일 포지션 경쟁 카드: 동일 핵심 팀컬러(소속 클럽/국가) 공유 + 해당 포지션 랭커 픽률 상위 기준 우선 선정
      const competitors = selectSamePositionCompetitors(
        card,
        allCards,
        grade,
        teamColor,
        6
      );

      return NextResponse.json({
        ok: true,
        card,
        efficiency,
        profile,
        priceHistory,
        otherSeasons,
        competitors,
        systemRules: getSystemRules(),
        fetchedAt: nowUtc(),
      });
    }

    // 4. GET /api/fclab/v1/profile/analyze
    if (subPath === "v1/profile/analyze") {
      const rules = getSystemRules();
      const spid = Number(sp.get("spid") || 0);
      const compareSpid = Number(sp.get("compare_spid") || 0);
      const grade = Math.max(
        1,
        Math.min(rules.maxEnhanceLevel, Number(sp.get("grade") || 8))
      );
      const teamColor = Number(sp.get("team_color") ?? 0);

      const rawCard = await crawlPlayerAbility(spid);
      if (!rawCard) {
        return NextResponse.json(
          { ok: false, error: "분석할 선수 카드를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      const card = enrichPlayerCardMetaSync(rawCard);

      const targetPos = (sp.get("pos") || sp.get("position") || "").trim().toUpperCase();
      const primaryProfile = analyzePlayerProfileSync(
        card,
        grade,
        teamColor,
        targetPos || undefined
      );
      let compareCard = null;
      let compareProfile = null;

      if (compareSpid > 0 && compareSpid !== spid) {
        const rawCompare = await crawlPlayerAbility(compareSpid);
        if (rawCompare) {
          compareCard = enrichPlayerCardMetaSync(rawCompare);
          compareProfile = analyzePlayerProfileSync(
            compareCard,
            grade,
            teamColor,
            targetPos || undefined
          );
        }
      }

      return NextResponse.json({
        ok: true,
        card,
        profile: primaryProfile,
        compareCard,
        compareProfile,
        compare_profile: compareProfile,
        systemRules: getSystemRules(),
        analyzedAt: nowUtc(),
      });
    }

    // 5. GET /api/fclab/v1/squads
    if (subPath === "v1/squads") {
      return NextResponse.json({
        ok: true,
        squads: store.savedSquads,
        systemRules: getSystemRules(),
      });
    }

    // 6. GET /api/fclab/v1/match/analyze
    if (subPath === "v1/match/analyze") {
      const nickname = (sp.get("nickname") || "").trim();
      const matchtype = Number(sp.get("matchtype") || 50);
      const limit = Number(sp.get("limit") || 15);

      if (!nickname) {
        return NextResponse.json(
          { ok: false, error: "조회할 구단주 닉네임을 입력해 주세요." },
          { status: 400 }
        );
      }

      const result = await analyzeUserMatchesOnServer(
        nickname,
        matchtype,
        limit
      );
      return NextResponse.json({
        ok: true,
        user: result.user,
        analysis: result.analysis,
        systemRules: result.systemRules || getSystemRules(),
      });
    }

    // 7. GET /api/fclab/v1/settings
    if (subPath === "v1/settings") {
      const hasApiKey = Boolean(getServerNexonApiKey());
      const allCards = Object.values(store.cards);
      return NextResponse.json({
        ok: true,
        hasApiKey,
        keyPreview: getServerNexonApiKeyPreview(),
        systemRules: getSystemRules(),
        connectionStatus: {
          nexonStaticMetadata: Object.keys(store.seasons).length > 0,
          fcDatacenterCrawler: allCards.length > 0,
          nexonUserMatchApi: hasApiKey,
        },
        dbStats: {
          totalCards: allCards.length,
          fullAbilityCards: allCards.filter((c) => c.has_full_ability).length,
          seasons: Object.keys(store.seasons).length,
        },
      });
    }

    // 8. GET /api/fclab/v1/market/overview
    if (subPath === "v1/market/overview") {
      if ((store.marketEvents || []).length === 0) {
        await syncOfficialEventsAndNotices().catch(() => null);
      }
      if (!store.rankerMetaSnapshot) {
        await syncRankerUsageAndRecords().catch(() => null);
      }
      const payload = buildMarketLabDashboard();
      return NextResponse.json({
        ok: true,
        ...payload,
        systemRules: getSystemRules(),
      });
    }

    // 9. GET /api/fclab/v1/market/player
    if (subPath === "v1/market/player") {
      const rules = getSystemRules();
      const spid = Number(sp.get("spid") || 0);
      const grade = Math.max(
        1,
        Math.min(rules.maxEnhanceLevel, Number(sp.get("grade") || 8))
      );
      if (spid <= 0) {
        return NextResponse.json(
          { ok: false, error: "유효한 선수 spid가 필요합니다." },
          { status: 400 }
        );
      }
      await crawlPlayerAbility(spid);
      await crawlPriceHistory(spid, grade);
      const payload = buildMarketLabDashboard();
      const targetSeries =
        payload.normalized_series_preview.find(
          (s) => s.spid === spid && s.grade === grade
        ) ||
        payload.normalized_series_preview.find((s) => s.spid === spid) ||
        null;
      const targetForecast =
        payload.player_forecasts.find(
          (f) => f.spid === spid && f.grade === grade
        ) ||
        payload.player_forecasts.find((f) => f.spid === spid) ||
        null;

      return NextResponse.json({
        ok: true,
        series: targetSeries,
        forecast: targetForecast,
        dashboard: payload,
        systemRules: rules,
      });
    }

    return NextResponse.json(
      { ok: false, error: `지원하지 않는 GET 엔드포인트: ${subPath}` },
      { status: 404 }
    );
  } catch (err) {
    if (err instanceof NexonServiceError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: err.errorCode,
          errorCode: err.errorCode,
          requires_api_key: err.requiresApiKey,
          requiresApiKey: err.requiresApiKey,
          systemRules: getSystemRules(),
        },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: `서버 처리 오류: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    await ensureInitialSeed();
    const { path: pathSegments } = await context.params;
    const subPath = pathSegments.join("/");
    const body = await req.json().catch(() => ({}));
    const store = getStoreSnapshot();

    // 0. POST /api/fclab/rules/sync or /api/fclab/v1/rules/sync
    if (subPath === "rules/sync" || subPath === "v1/rules/sync") {
      const rules = await syncGameRulesFromWeb();
      return NextResponse.json({
        ok: true,
        rules,
        systemRules: rules,
        syncedAt: rules.lastSyncedAt,
      });
    }

    // 1. POST /api/fclab/v1/efficiency/analyze
    if (subPath === "v1/efficiency/analyze") {
      const rules = getSystemRules();
      const playerQuery = String(body.query || "").trim();
      const targetPos = String(body.position || "ST").trim().toUpperCase();
      const grade = Math.max(
        1,
        Math.min(rules.maxEnhanceLevel, Number(body.grade || 8))
      );
      const teamColor = Number(body.team_color ?? 0);
      const maxBp = Number(body.max_bp || 0);
      const customWeights = body.custom_weights as
        | Record<string, number>
        | undefined;

      if (playerQuery) {
        const existing = Object.values(store.cards).filter((c) =>
          c.name.includes(playerQuery)
        );
        if (existing.length < 3) {
          await crawlPlayerList(playerQuery, 30);
        }
      }

      let candidates = Object.values(store.cards);
      if (playerQuery) {
        candidates = candidates
          .filter((c) =>
            c.name.toLowerCase().includes(playerQuery.toLowerCase())
          )
          .sort((a, b) => b.ovr - a.ovr)
          .slice(0, 15);
      } else {
        candidates = candidates
          .filter(
            (c) =>
              c.primary_position === targetPos ||
              (c.positions || []).some((p) => p.pos === targetPos)
          )
          .sort((a, b) => b.ovr - a.ovr)
          .slice(0, 20);
      }

      const evaluations = [];
      for (let i = 0; i < candidates.length; i++) {
        let card = candidates[i];
        if (i < 8 && !card.has_full_ability) {
          const crawled = await crawlPlayerAbility(card.spid);
          if (crawled) card = crawled;
        }
        const ev = evaluateCardEfficiencySync(
          card,
          targetPos,
          grade,
          teamColor,
          customWeights
        );
        if (maxBp > 0 && ev.bp > maxBp) continue;
        evaluations.push(ev);
      }

      evaluations.sort(
        (a, b) =>
          b.efficiency_index - a.efficiency_index ||
          b.core_score - a.core_score
      );

      return NextResponse.json({
        ok: true,
        position: targetPos,
        grade,
        teamColorBonus: teamColor,
        weightsUsed:
          customWeights ||
          POSITION_WEIGHTS[targetPos] ||
          POSITION_WEIGHTS["ST"],
        results: evaluations,
        recommendedTop: evaluations[0] || null,
        systemRules: getSystemRules(),
        analyzedAt: nowUtc(),
      });
    }

    // 2. POST /api/fclab/v1/profile/analyze
    if (subPath === "v1/profile/analyze") {
      const rules = getSystemRules();
      const spid = Number(body.spid || 0);
      const compareSpid = Number(body.compare_spid || 0);
      const grade = Math.max(
        1,
        Math.min(rules.maxEnhanceLevel, Number(body.grade || 8))
      );
      const teamColor = Number(body.team_color ?? 0);

      const rawCard = await crawlPlayerAbility(spid);
      if (!rawCard) {
        return NextResponse.json(
          { ok: false, error: "분석할 선수 카드를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      const card = enrichPlayerCardMetaSync(rawCard);

      const targetPos = String(body.pos || body.position || "")
        .trim()
        .toUpperCase();
      const primaryProfile = analyzePlayerProfileSync(
        card,
        grade,
        teamColor,
        targetPos || undefined
      );
      let compareCard = null;
      let compareProfile = null;

      if (compareSpid > 0 && compareSpid !== spid) {
        const rawCompare = await crawlPlayerAbility(compareSpid);
        if (rawCompare) {
          compareCard = enrichPlayerCardMetaSync(rawCompare);
          compareProfile = analyzePlayerProfileSync(
            compareCard,
            grade,
            teamColor,
            targetPos || undefined
          );
        }
      }

      return NextResponse.json({
        ok: true,
        card,
        profile: primaryProfile,
        compareCard,
        compareProfile,
        compare_profile: compareProfile,
        systemRules: getSystemRules(),
        analyzedAt: nowUtc(),
      });
    }

    // 3. POST /api/fclab/v1/squads/evaluate
    if (subPath === "v1/squads/evaluate") {
      const rules = getSystemRules();
      const slots = Array.isArray(body.slots) ? body.slots : [];
      const formation = String(body.formation || "4-2-3-1");
      const budgetBp = Number(body.budget_bp || 50_000_000_000);
      const salaryCap = Number(body.salary_cap || rules.salaryCap);
      const teamColorBonus = Number(body.team_color_bonus ?? 3);

      const analysis = await analyzeSquadAsync(
        slots,
        formation,
        budgetBp,
        salaryCap,
        teamColorBonus
      );
      return NextResponse.json({
        ok: true,
        ...analysis,
        systemRules: getSystemRules(),
      });
    }

    // 4. POST /api/fclab/v1/squads/save
    if (subPath === "v1/squads/save") {
      const rules = getSystemRules();
      const ts = nowUtc();
      const saved = saveSquadToStore({
        id: String(body.id || `squad-${Date.now()}`),
        name: String(body.name || "나의 커스텀 스쿼드").trim(),
        formation: String(body.formation || "4-2-3-1"),
        budget_bp: Number(body.budget_bp || 50_000_000_000),
        salary_cap: Number(body.salary_cap || rules.salaryCap),
        team_color_name: String(body.team_color_name || "커스텀 팀컬러"),
        team_color_bonus: Number(body.team_color_bonus ?? 3),
        slots: Array.isArray(body.slots) ? body.slots : [],
        created_at: ts,
        updated_at: ts,
      });
      return NextResponse.json({
        ok: true,
        status: "saved",
        id: saved.id,
        systemRules: rules,
        updatedAt: ts,
      });
    }

    // 5. POST /api/fclab/v1/squads/delete
    if (subPath === "v1/squads/delete") {
      const id = String(body.id || "");
      deleteSquadFromStore(id);
      return NextResponse.json({ ok: true, status: "deleted", id });
    }

    // 6. POST /api/fclab/v1/settings
    if (subPath === "v1/settings") {
      const action = String(body.action || "");
      if (action === "crawl_players") {
        const namesRaw = String(body.playerNames || "").trim();
        const names = namesRaw
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 5);
        let crawledCount = 0;
        for (const name of names) {
          const list = await crawlPlayerList(name, 25);
          crawledCount += list.length;
          for (const c of list.slice(0, 3)) {
            await crawlPlayerAbility(c.spid);
          }
        }
        return NextResponse.json({
          ok: true,
          status: "crawled",
          crawledCount,
          systemRules: getSystemRules(),
          message: `${names.length}명의 선수 카드 및 세부 스탯·시세 실시간 수집이 완료되었습니다.`,
        });
      }
      if (action === "sync_meta") {
        const res = await syncNexonMetadata(true);
        const rules = await syncGameRulesFromWeb();
        return NextResponse.json({ ok: true, ...res, systemRules: rules });
      }
    }

    // 7. POST /api/fclab/v1/market/collect
    if (subPath === "v1/market/collect") {
      const batchResult = await runIncrementalMarketCollectionBatch({
        limit: Number(body.limit || 6),
        grade: Number(body.grade || 8),
        targetSeason: String(body.season || ""),
      });
      const dashboard = buildMarketLabDashboard();
      return NextResponse.json({
        ok: true,
        batchResult,
        dashboard,
        systemRules: getSystemRules(),
      });
    }

    // 8. POST /api/fclab/v1/market/events
    if (subPath === "v1/market/events") {
      const created = registerMarketEvent(body);
      const dashboard = buildMarketLabDashboard();
      return NextResponse.json({
        ok: true,
        event: created,
        dashboard,
        systemRules: getSystemRules(),
      });
    }

    // 9. POST /api/fclab/v1/market/sync-sources
    if (subPath === "v1/market/sync-sources") {
      const target = String(body.target || body.mode || "all");
      let eventsRes = null;
      let rankerRes = null;
      let gradesRes = null;
      if (target === "all" || target === "events") {
        eventsRes = await syncOfficialEventsAndNotices();
      }
      if (target === "all" || target === "ranker") {
        rankerRes = await syncRankerUsageAndRecords();
      }
      if (target === "all" || target === "grades") {
        gradesRes = await syncCoreGradesPriceHistory({
          maxRequests: Number(body.maxRequests || body.spidCount || 12),
          grades: Array.isArray(body.grades)
            ? body.grades.map(Number)
            : [8, 9, 10, 11, 12, 13],
        });
      }
      const dashboard = buildMarketLabDashboard();
      return NextResponse.json({
        ok: true,
        eventsRes,
        rankerRes,
        gradesRes,
        dashboard,
        systemRules: getSystemRules(),
      });
    }

    return NextResponse.json(
      { ok: false, error: `지원하지 않는 POST 엔드포인트: ${subPath}` },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `서버 처리 오류: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
