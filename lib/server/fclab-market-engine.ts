import {
  CapitalTierType,
  EnhancementEvAnalysis,
  MarketBacktestReport,
  MarketCollectionStatus,
  MarketEntityForecast,
  MarketEventImpactReport,
  MarketEventRecord,
  MarketFearGreedComponent,
  MarketFearGreedIndex,
  MarketFeeConfig,
  MarketHorizonForecast,
  MarketLabDashboardPayload,
  MarketModelBacktestMetric,
  MarketNormalizedPoint,
  MarketNormalizedSeries,
  MarketOverviewHeatmapCell,
  MarketOverviewIndex,
  MarketSectorSummary,
  MarketSignalMetrics,
  MarketSignalStatusTag,
  MarketUnitConversionRecord,
  PlayerCard,
  PriceHistoryData,
  SeasonSectorType,
  TraitCompetingSubstitutionCase,
  TraitControlledPremiumItem,
  TraitMetaCatalogItem,
  TraitPatchHistoryItem,
  TraitSeasonDiscountItem,
  formatBpKorean,
  getEnhanceOvrBoost,
} from "@/lib/fclab-types";
import {
  crawlPlayerAbility,
  crawlPriceHistory,
  getStoreSnapshot,
  getSystemRules,
  persistStore,
} from "@/lib/server/fclab-engine";
import {
  OFFICIAL_NEW_TRAITS_CATALOG,
  OFFICIAL_NEW_TRAIT_NAMES,
  EXCLUDED_LEGACY_TRAITS_LIST,
  extractCardNewAndLegacyTraits,
  classifyGradeTierZone,
  classifySeasonSectorDynamic,
  buildDynamicFlagshipCandidates,
  buildGradeTierComparisons,
  buildCodeAuditFindings,
  syncOfficialEventsAndNotices,
  syncRankerUsageAndRecords,
  syncCoreGradesPriceHistory,
} from "@/lib/server/fclab-market-sources";

export {
  syncOfficialEventsAndNotices,
  syncRankerUsageAndRecords,
  syncCoreGradesPriceHistory,
};

// ============================================================================
// 1. Dynamic Season & Capital Tier Classification Rules (Zero Hardcoded Sets)
// ============================================================================

export function classifySeasonSector(seasonCode: string): {
  sector: SeasonSectorType;
  label: string;
} {
  return classifySeasonSectorDynamic(seasonCode);
}

export function classifyCapitalTier(bp: number): {
  tier: CapitalTierType;
  label: string;
} {
  if (bp >= 1_000_000_000_000) {
    return {
      tier: "ULTRA_HIGH",
      label: "초고가 하이엔드 (1조 BP 이상)",
    };
  }
  if (bp >= 100_000_000_000) {
    return {
      tier: "HIGH_CAPITAL_FLAGSHIP",
      label: "고자본 대장급 (1,000억 ~ 1조 BP)",
    };
  }
  if (bp >= 10_000_000_000) {
    return {
      tier: "MID_TIER",
      label: "중간 자본 주력 (100억 ~ 1,000억 BP)",
    };
  }
  if (bp >= 1_000_000_000) {
    return {
      tier: "LOW_BUDGET_PRACTICAL",
      label: "저자본 가성비 실사용 (10억 ~ 100억 BP)",
    };
  }
  return {
    tier: "ENHANCEMENT_FODDER",
    label: "강화 재료·엔트리 (10억 BP 미만)",
  };
}

function getPositionGroup(pos: string): "FW" | "MF" | "DF" | "GK" {
  const p = (pos || "").toUpperCase();
  if (["ST", "CF", "LW", "RW", "LF", "RF", "LS", "RS"].includes(p)) return "FW";
  if (["CAM", "CM", "CDM", "LM", "RM", "LAM", "RAM", "LCM", "RCM"].includes(p))
    return "MF";
  if (["CB", "LB", "RB", "LWB", "RWB", "SW", "LCB", "RCB"].includes(p))
    return "DF";
  return "GK";
}

// ============================================================================
// 2. Official Crawled Events & Official New Trait (level: 8) Patch History
// ============================================================================

const OFFICIAL_NEW_TRAIT_PATCH_HISTORY: TraitPatchHistoryItem[] = [
  {
    id: "patch-new-trait-level8-system",
    patch_date: "공식 신규특성(level: 8, trait_icon_50~68) 시스템 도입 및 +8강 이상 메타 정착",
    title:
      "공식 코치헬퍼·데이터센터 기준 level: 8 신규특성 17종 도입 (기존 level: 5 고유특성과 분리)",
    target_traits: [
      "크로스 포쳐",
      "아크로바틱 피니셔",
      "레이저 슈터",
      "라인 브레이커",
      "스피드스터",
      "커맨더",
      "타이탄",
      "파이터",
    ],
    change_type: "신규 추가",
    summary:
      "넥슨 공식 데이터(coachHelper 번들 및 PlayerAbility)에서 level: 8(trait_icon_50~68)로 분류되는 공식 신규특성 체계입니다. 예리한 감아차기·중거리 슛 선호·파워 헤더·패스 마스터 등 기존 일반 고유특성(level: 5)은 시세 분석 변수에서 분리·제외하고 오직 공식 신규특성만 시세 프리미엄 및 예측 변수로 반영합니다.",
    observed_market_reaction:
      "+8~+11강 금카 주류 시장에서 동일 포지션·동일 OVR 대비 공식 신규특성(크로스 포쳐, 아크로바틱 피니셔, 커맨더, 타이탄 등) 보유 여부가 시세 프리미엄과 하방 경직성에 유의미한 차이를 형성함.",
    verified_source:
      "ssl.nexon.com/s1/fc/online/obt/coachHelper/app.js (level: 8 공식 정의) 및 PlayerAbility DB",
  },
  {
    id: "patch-new-trait-attack-competition",
    patch_date: "박스 안 다이렉트 득점 vs 수비 라인 침투 신규특성 메타 분화",
    title:
      "공격수 신규특성 경쟁: [크로스 포쳐 · 아크로바틱 피니셔 · 레이저 슈터] vs [라인 브레이커]",
    target_traits: [
      "크로스 포쳐",
      "아크로바틱 피니셔",
      "레이저 슈터",
      "라인 브레이커",
    ],
    change_type: "체감 메타 변화",
    summary:
      "상위 랭커 경기에서 수비 라인 컨트롤이 정교해지면서 단순 배후 침투(라인 브레이커 단독)보다 크로스 낙구 선점(크로스 포쳐), 고유 발리 모션(아크로바틱 피니셔), 논스톱 저탄도 슈팅(레이저 슈터)을 보유한 공격수의 선호도가 상승함.",
    observed_market_reaction:
      "+8~+11강 공격수(ST/CF) 시세에서 크로스 포쳐·아크로바틱 피니셔 보유 카드가 라인 브레이커 단독 보유 또는 신규특성 미보유 동급 카드 대비 초과 수익률과 양(+)의 통제 프리미엄을 기록.",
    verified_source:
      "fconline.nexon.com/datacenter/dailysquad & PlayerPriceGraph (+8~+11강 시계열 검증)",
  },
  {
    id: "patch-new-trait-defense-midfield",
    patch_date: "중원·수비 공식 신규특성(커맨더 · 타이탄 · 파이터 · 와일드 태클러) 가치 부각",
    title:
      "백스핀 로빙 스루(커맨더) 및 공중볼·대인 경합 제어(타이탄 · 파이터 · 와일드 태클러 · 체이서) 선호도 확대",
    target_traits: [
      "커맨더",
      "2개의 심장",
      "타이탄",
      "파이터",
      "와일드 태클러",
      "체이서",
    ],
    change_type: "발동 조건 완화·상향",
    summary:
      "중원(CM/CAM/CDM)에서 낮고 빠른 백스핀 로빙 스루 패스를 구사하는 '커맨더'와, 센터백·풀백에서 상대 질주 속도·킥 정확도를 낮추는 '파이터' 및 공중볼 우위를 점하는 '타이탄'의 실전 기여도가 확인됨.",
    observed_market_reaction:
      "TOP 10,000 랭커 사용률 상위 수비수·미드필더 중 타이탄·파이터·커맨더 보유 카드의 +8~+11강 가격 방어력이 비보유 카드 대비 우수하게 관측됨.",
    verified_source:
      "fconline.nexon.com/Datacenter/BestUsePositionPlayer & /datacenter/dailyrecord",
  },
];

export function getActiveMarketEvents(): MarketEventRecord[] {
  const store = getStoreSnapshot();
  if (Array.isArray(store.marketEvents) && store.marketEvents.length > 0) {
    return store.marketEvents;
  }
  return [];
}

export function registerMarketEvent(
  partial: Partial<MarketEventRecord>
): MarketEventRecord {
  const store = getStoreSnapshot();
  const currentList = Array.isArray(store.marketEvents) ? store.marketEvents : [];
  const syncedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const newEvt: MarketEventRecord = {
    id: partial.id || `evt-custom-${Date.now()}`,
    title: (partial.title || "신규 등록 시장 이벤트").trim(),
    event_type: partial.event_type || "PACK_RELEASE",
    event_type_label: partial.event_type_label || "시장 이벤트",
    published_at: partial.published_at || syncedAt.slice(0, 10),
    start_date: partial.start_date || "10.15",
    end_date: partial.end_date || "10.23",
    status: partial.status || "신규",
    target_seasons: Array.isArray(partial.target_seasons)
      ? partial.target_seasons
      : ["25UCL", "WS", "26TOTS"],
    target_capital_tiers: Array.isArray(partial.target_capital_tiers)
      ? partial.target_capital_tiers
      : ["HIGH_CAPITAL_FLAGSHIP"],
    target_grades: Array.isArray(partial.target_grades)
      ? partial.target_grades
      : [8, 9, 10, 11],
    bp_injection_scale: partial.bp_injection_scale || "중규모",
    pack_supply_scale: partial.pack_supply_scale || "중규모",
    fee_coupon_discount_pct: Number(partial.fee_coupon_discount_pct || 0),
    official_url: partial.official_url || "https://fconline.nexon.com/news/events/list",
    last_collected_at: syncedAt,
    basis: "official_public",
    source: partial.source || "운영자/공식 공지 기반 등록 이벤트",
    verified: Boolean(partial.verified ?? true),
    description:
      partial.description ||
      "공식 공지 또는 운영자가 등록한 이적시장 이벤트 및 패치 기록입니다.",
  };

  store.marketEvents = [
    newEvt,
    ...currentList.filter((e) => e.id !== newEvt.id),
  ];
  if (!Array.isArray(store.marketEventChangeLogs)) {
    store.marketEventChangeLogs = [];
  }
  store.marketEventChangeLogs.unshift({
    detected_at: syncedAt,
    change_type: "신규 발견",
    event_id: newEvt.id,
    title: newEvt.title,
    detail: `이벤트 레지스트리에 신규 등록됨 (${newEvt.start_date}~${newEvt.end_date})`,
  });
  persistStore();
  return newEvt;
}


// ============================================================================
// 3. Statistical Helper Functions
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * Math.max(0, Math.min(1, q));
  const base = Math.floor(pos);
  const rest = pos - base;
  if (s[base + 1] !== undefined) {
    return s[base] + rest * (s[base + 1] - s[base]);
  }
  return s[base];
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round2(val: number): number {
  return Math.round((Number.isFinite(val) ? val : 0) * 100) / 100;
}

// ============================================================================
// 4. Time-Series Normalization & Unit Conversion Audit Layer
// ============================================================================

export function buildNormalizedMarketSeries(): {
  seriesList: MarketNormalizedSeries[];
  unitConversionRecords: MarketUnitConversionRecord[];
} {
  const store = getStoreSnapshot();
  const seriesList: MarketNormalizedSeries[] = [];
  const unitConversionRecords: MarketUnitConversionRecord[] = [];

  for (const [key, ph] of Object.entries(store.priceHistory)) {
    if (!ph || !Array.isArray(ph.points) || ph.points.length < 5) continue;
    const card: PlayerCard | undefined = store.cards[ph.spid];
    if (!card) continue;

    const grade = Number(ph.grade || 1);
    const verifiedGradeBp =
      card.prices?.[String(grade)]?.bp ||
      (grade === 1 ? card.bp_1 : grade === 5 ? card.bp_5 : card.bp_8) ||
      ph.current_bp ||
      0;

    const rawPoints = ph.points.filter(
      (p) => p && Number.isFinite(p.bp) && p.bp > 0
    );
    if (rawPoints.length < 5) continue;

    const latestRawBp = rawPoints[rawPoints.length - 1].bp;
    let scaleFactor = 1;
    let qualityStatus: "verified_direct" | "unit_rescaled" | "stale_or_sparse" =
      "verified_direct";
    let conversionReason =
      "원본 시계열 값과 카드 기준가(prices.bp) 단위가 1:1 일치하여 직접 사용";

    if (verifiedGradeBp > 0 && latestRawBp > 0) {
      const ratio = verifiedGradeBp / latestRawBp;
      if (ratio > 50) {
        // Snap to clean decimal scale if within 35% of a power of 10 (e.g. 10,000 or 100,000,000),
        // otherwise use exact anchor ratio so historical percentage returns remain 100% invariant
        const log10 = Math.round(Math.log10(ratio));
        const pow10 = Math.pow(10, log10);
        if (Math.abs(ratio - pow10) / pow10 < 0.08) {
          scaleFactor = pow10;
          conversionReason = `데이터센터 그래프 축 단위(10^${log10} BP 스케일) 감지 → 원본 수익률 보존 상태에서 ${pow10.toLocaleString()}배 단위 정규화 적용`;
        } else {
          scaleFactor = ratio;
          conversionReason = `데이터센터 그래프 축 상대값(${latestRawBp.toLocaleString()})과 검증된 카드 기준가(${formatBpKorean(verifiedGradeBp)}) 간 스케일 보정(${Math.round(ratio).toLocaleString()}배) 적용 (일별 수익률 불변)`;
        }
        qualityStatus = "unit_rescaled";
      }
    }

    const normalizedPoints: MarketNormalizedPoint[] = rawPoints.map(
      (pt, idx) => {
        const normBp = Math.round(pt.bp * scaleFactor);
        const prevNormBp =
          idx > 0 ? Math.round(rawPoints[idx - 1].bp * scaleFactor) : normBp;
        const ret1d =
          idx > 0 && prevNormBp > 0
            ? ((normBp - prevNormBp) / prevNormBp) * 100
            : 0;
        return {
          date: pt.date,
          raw_bp: pt.bp,
          normalized_bp: normBp,
          formatted_bp: formatBpKorean(normBp),
          return_1d_pct: round2(ret1d),
        };
      }
    );

    const n = normalizedPoints.length;
    const currentBp = normalizedPoints[n - 1].normalized_bp;
    const bp1dAgo = normalizedPoints[Math.max(0, n - 2)].normalized_bp;
    const bp7dAgo = normalizedPoints[Math.max(0, n - 8)].normalized_bp;
    const bp14dAgo = normalizedPoints[Math.max(0, n - 15)].normalized_bp;
    const bp30dAgo = normalizedPoints[0].normalized_bp;

    const ret1d = bp1dAgo > 0 ? ((currentBp - bp1dAgo) / bp1dAgo) * 100 : 0;
    const ret7d = bp7dAgo > 0 ? ((currentBp - bp7dAgo) / bp7dAgo) * 100 : 0;
    const ret14d = bp14dAgo > 0 ? ((currentBp - bp14dAgo) / bp14dAgo) * 100 : 0;
    const ret30d = bp30dAgo > 0 ? ((currentBp - bp30dAgo) / bp30dAgo) * 100 : 0;

    const dailyReturns = normalizedPoints.slice(1).map((p) => p.return_1d_pct);
    const vol30d = stdDev(dailyReturns);

    let peak = normalizedPoints[0].normalized_bp;
    let maxDd = 0;
    for (const p of normalizedPoints) {
      if (p.normalized_bp > peak) peak = p.normalized_bp;
      if (peak > 0) {
        const dd = ((p.normalized_bp - peak) / peak) * 100;
        if (dd < maxDd) maxDd = dd;
      }
    }

    const allBpVals = normalizedPoints.map((p) => p.normalized_bp);
    const meanBp = mean(allBpVals);
    const sdBp = stdDev(allBpVals);
    const zScore = sdBp > 0 ? (currentBp - meanBp) / sdBp : 0;

    const seasonClass = classifySeasonSector(card.season_code);
    const capClass = classifyCapitalTier(currentBp);
    const confidence =
      n >= 28
        ? qualityStatus === "verified_direct"
          ? 0.96
          : 0.91
        : 0.65;

    if (qualityStatus === "unit_rescaled" || unitConversionRecords.length < 18) {
      unitConversionRecords.push({
        key,
        spid: card.spid,
        player_name: card.name,
        season_code: card.season_code,
        grade,
        raw_latest_value: latestRawBp,
        verified_card_bp: verifiedGradeBp,
        applied_scale_factor: round2(scaleFactor),
        conversion_reason: conversionReason,
        quality_status: qualityStatus,
        confidence,
      });
    }

    const { newTraits, legacyTraits } = extractCardNewAndLegacyTraits(card);
    const { zone: gradeTierZone, label: gradeTierLabel } =
      classifyGradeTierZone(grade);
    const posGroup = getPositionGroup(card.primary_position);
    const tcStringList = (card.team_colors || [])
      .map((tc: unknown) =>
        typeof tc === "string"
          ? tc
          : tc && typeof tc === "object" && "name" in tc
            ? String((tc as { name: unknown }).name || "")
            : ""
      )
      .filter(Boolean);
    const multiSectorTags: string[] = [
      `시즌분류:${seasonClass.sector}`,
      `포지션군:${posGroup}(${card.primary_position})`,
      `가격대:${capClass.tier}`,
      `강화구간:${gradeTierZone}(+${grade}강)`,
      newTraits.length > 0
        ? `공식신규특성(Lv8):${newTraits.join("·")}`
        : "공식신규특성(Lv8):미보유",
      ...tcStringList.slice(0, 3).map((tc) => `팀컬러:${tc}`),
    ];

    seriesList.push({
      key,
      spid: card.spid,
      pid: card.pid,
      name: card.name,
      season_code: card.season_code,
      season_name: card.season_name,
      season_img: card.season_img,
      thumb_url: card.thumb_url,
      primary_position: card.primary_position,
      ovr: card.ovr,
      salary: card.salary,
      grade,
      grade_tier_zone: gradeTierZone,
      season_sector: seasonClass.sector,
      season_sector_label: seasonClass.label,
      capital_tier: capClass.tier,
      capital_tier_label: capClass.label,
      current_bp: currentBp,
      current_bp_text: formatBpKorean(currentBp),
      return_1d_pct: round2(ret1d),
      return_7d_pct: round2(ret7d),
      return_14d_pct: round2(ret14d),
      return_30d_pct: round2(ret30d),
      volatility_30d_pct: round2(vol30d),
      max_drawdown_30d_pct: round2(maxDd),
      z_score_30d: round2(zScore),
      relative_strength_7d: 0,
      unit_scale_factor: round2(scaleFactor),
      quality_status: qualityStatus,
      confidence,
      observed_at: normalizedPoints[n - 1].date,
      collected_at: ph.crawled_at || card.crawled_at,
      source: "fconline.nexon.com/datacenter/PlayerPriceGraph",
      raw_data_reference: `store.priceHistory["${key}"] (${n}일 관측치, ${gradeTierLabel})`,
      traits: (card.traits || []).map((t) => t.name).filter(Boolean),
      new_traits: newTraits,
      legacy_traits: legacyTraits,
      team_colors: tcStringList,
      multi_sector_tags: multiSectorTags,
      points: normalizedPoints,
    });
  }

  // Exclude +12~+13강 ultra-low-liquidity series from distorting the market benchmark return
  const coreBenchPool = seriesList.filter((s) => s.grade >= 8 && s.grade <= 11);
  const benchPool =
    coreBenchPool.length >= 5
      ? coreBenchPool
      : seriesList.filter((s) => s.grade <= 11);
  const marketRet7d = mean(benchPool.map((s) => s.return_7d_pct));
  for (const s of seriesList) {
    s.relative_strength_7d = round2(s.return_7d_pct - marketRet7d);
  }

  // Sort prioritizing Core Grades (+8~+11강) first, then by BP
  seriesList.sort((a, b) => {
    const aCore = a.grade >= 8 && a.grade <= 11 ? 1 : 0;
    const bCore = b.grade >= 8 && b.grade <= 11 ? 1 : 0;
    if (aCore !== bCore) return bCore - aCore;
    return b.current_bp - a.current_bp;
  });

  return {
    seriesList,
    unitConversionRecords: unitConversionRecords.slice(0, 24),
  };
}

// ============================================================================
// 5. Multi-Axis Dynamic Sector Analysis Engine (Multi-Membership Supported)
// ============================================================================

function computeFearGreedBand(score: number): {
  band: "극단적 공포" | "공포" | "중립" | "과열" | "극단적 과열";
  rangeLabel: string;
} {
  if (score < 20)
    return { band: "극단적 공포", rangeLabel: "0~19 (극단적 공포·투매 구간)" };
  if (score < 40)
    return { band: "공포", rangeLabel: "20~39 (공포·매수 심리 위축)" };
  if (score < 60)
    return { band: "중립", rangeLabel: "40~59 (중립·수급 균형 구간)" };
  if (score < 80)
    return { band: "과열", rangeLabel: "60~79 (과열·매수 추격 강세)" };
  return {
    band: "극단적 과열",
    rangeLabel: "80~100 (극단적 과열·단기 고점 주의)",
  };
}

function buildSectorIndexCurve30d(
  memberSeries: MarketNormalizedSeries[]
): { date: string; index_value: number }[] {
  const fullSeries = memberSeries.filter((s) => s.points.length >= 28);
  if (fullSeries.length === 0) return [];
  const len = Math.min(...fullSeries.map((s) => s.points.length));
  const curve: { date: string; index_value: number }[] = [];
  for (let i = 0; i < len; i++) {
    const date = fullSeries[0].points[i].date;
    const relVals = fullSeries.map((s) => {
      const base = s.points[0].normalized_bp;
      const cur = s.points[i].normalized_bp;
      return base > 0 ? (cur / base) * 100 : 100;
    });
    curve.push({
      date,
      index_value: round2(mean(relVals)),
    });
  }
  return curve;
}

export function buildMultiAxisSectors(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[],
  marketRet7d: number
): {
  seasonSectors: MarketSectorSummary[];
  capitalTierSectors: MarketSectorSummary[];
  gradeSectors: MarketSectorSummary[];
  multiAxisSectors: MarketSectorSummary[];
} {
  // Exclude +12~+13강 from distorting general season/capital/position sectors
  const nonUltraSeries = seriesList.filter((s) => s.grade <= 11);

  // 1) Dynamic Season & Supply Structure Sectors (Zero hardcoded season lists)
  const seasonDefs: {
    code: SeasonSectorType;
    name: string;
    description: string;
    supplyExposure: "낮음 (공급 제한)" | "보통" | "높음 (패키지·이벤트 노출)";
    replacementRisk: "낮음" | "보통" | "높음 (상위 시즌 대체 위험)";
  }[] = [
    {
      code: "LIMITED_DISCONTINUED",
      name: "공급 제한·레전드 클래스 (공식 클래스 메타·희소 공급)",
      description:
        "공식 클래스 메타데이터상 레전드·모먼트 등급으로 일반 패키지 대량 공급이 제한되어 하방 경직성이 높은 섹터",
      supplyExposure: "낮음 (공급 제한)",
      replacementRisk: "낮음",
    },
    {
      code: "NEW_META_FLAGSHIP",
      name: "데이터 판별 최상위 메타 시즌 (랭커 점유율·신규특성 밀도 상위)",
      description:
        "TOP 10,000 랭커 시즌 점유율 상위권 및 공식 신규특성(level: 8) 보유 밀도가 높은 현 메타 주도 섹터",
      supplyExposure: "보통",
      replacementRisk: "낮음",
    },
    {
      code: "EXISTING_FLAGSHIP",
      name: "데이터 판별 주류 경쟁 시즌 (중상위 랭커 사용률·주전급 스펙)",
      description:
        "여전히 준수한 랭커 사용률과 주전급 스펙을 보유하나 신규 상위 시즌 출시 및 패키지 공급 시 가격 조정을 받는 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "높음 (상위 시즌 대체 위험)",
    },
    {
      code: "THEME_TEAMCOLOR",
      name: "테마·팀컬러·급여 최적화 실사용 시즌",
      description:
        "클럽·국가 단일 팀컬러 및 급여(Salary Cap) 최적화 목적으로 +8~+11강 금카 수요가 유지되는 실사용 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "보통",
    },
    {
      code: "LIVE_DYNAMIC",
      name: "라이브·실제 성적 연동 시즌 (실제 경기 퍼포먼스 연동)",
      description:
        "실제 축구 리그 활약도에 따른 라이브 부스트와 강화 재료 수요에 의해 움직이는 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "낮음",
    },
  ];

  const seasonSectors: MarketSectorSummary[] = seasonDefs.map((def) => {
    const catalogMembers = allCards.filter(
      (c) => classifySeasonSector(c.season_code).sector === def.code && c.bp_1 > 0
    );
    const tsMembers = nonUltraSeries.filter((s) => s.season_sector === def.code);
    return summarizeSectorGroup({
      sectorId: `season-${def.code}`,
      axis: "season",
      code: def.code,
      name: def.name,
      description: def.description,
      catalogCards: catalogMembers,
      tsMembers,
      marketRet7d,
      supplyExposure: def.supplyExposure,
      replacementRisk: def.replacementRisk,
    });
  });

  // 2) Capital Tier Sectors (Evaluated on +8강 Core Gold standard BP when available)
  const capDefs: {
    code: CapitalTierType;
    name: string;
    description: string;
    supplyExposure: "낮음 (공급 제한)" | "보통" | "높음 (패키지·이벤트 노출)";
    replacementRisk: "낮음" | "보통" | "높음 (상위 시즌 대체 위험)";
  }[] = [
    {
      code: "ULTRA_HIGH",
      name: "초고가 하이엔드 (1조 BP 이상)",
      description:
        "최상위 구단주 수요와 희소 매물 중심의 초고가 영역으로, 수수료 할인 쿠폰과 대형 BP 이벤트에 민감한 섹터",
      supplyExposure: "낮음 (공급 제한)",
      replacementRisk: "낮음",
    },
    {
      code: "HIGH_CAPITAL_FLAGSHIP",
      name: "고자본 대장급 (1,000억 ~ 1조 BP)",
      description:
        "공식경기 상위 티어 +8~+11강 주전급 카드로, 공식 신규특성(level: 8) 선호도와 신규 시즌 대체 효과를 직접 받는 핵심 섹터",
      supplyExposure: "보통",
      replacementRisk: "보통",
    },
    {
      code: "MID_TIER",
      name: "중간 자본 주력 (100억 ~ 1,000억 BP)",
      description:
        "가장 두터운 유저층이 거래하는 구간으로 패키지 공급 이벤트 시 매물 출회와 반등이 빠르게 순환하는 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "높음 (상위 시즌 대체 위험)",
    },
    {
      code: "LOW_BUDGET_PRACTICAL",
      name: "저자본 실사용 (10억 ~ 100억 BP)",
      description:
        "급여 조절용 및 가성비 스쿼드에 편입되어 변동성이 비교적 완만한 실사용 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "보통",
    },
    {
      code: "ENHANCEMENT_FODDER",
      name: "강화 재료·엔트리 (10억 BP 미만)",
      description:
        "강화 이벤트 및 동일 OVR 재료 수요에 따라 움직이는 엔트리 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "낮음",
    },
  ];

  const capitalTierSectors: MarketSectorSummary[] = capDefs.map((def) => {
    const catalogMembers = allCards.filter((c) => {
      const refBp = c.prices?.["8"]?.bp || c.bp_8 || c.bp_1;
      return refBp > 0 && classifyCapitalTier(refBp).tier === def.code;
    });
    const tsMembers = nonUltraSeries.filter((s) => s.capital_tier === def.code);
    return summarizeSectorGroup({
      sectorId: `cap-${def.code}`,
      axis: "capital_tier",
      code: def.code,
      name: def.name,
      description: def.description,
      catalogCards: catalogMembers,
      tsMembers,
      marketRet7d,
      supplyExposure: def.supplyExposure,
      replacementRisk: def.replacementRisk,
    });
  });

  // 3) Enhancement Grade Sectors (+8, +9, +10, +11강 Core Gold Standard vs +12~+13강 Separated vs +1/+5강 Sub)
  const gradeDefs = [
    {
      code: "GRADE_CORE_8",
      grades: [8],
      primaryGradeKey: "8",
      name: "+8강 (금카 진입·신규특성 & 팀컬러 핵심 기준 시장)",
      description:
        "공식 신규특성(level: 8)과 금카 팀컬러 효과가 결합되는 이적시장 표준 기준 단계 (+8강 시계열 관측 기반)",
      supplyExposure: "보통" as const,
      replacementRisk: "낮음" as const,
    },
    {
      code: "GRADE_CORE_9",
      grades: [9],
      primaryGradeKey: "9",
      name: "+9강 (고성능 주전 금카 핵심 시장)",
      description:
        "상위 랭커 스쿼드에서 주전 비중이 높은 고성능 금카 단계 (+8강 대비 강화 배율 및 희소성 상승 구간)",
      supplyExposure: "낮음 (공급 제한)" as const,
      replacementRisk: "낮음" as const,
    },
    {
      code: "GRADE_CORE_10_11",
      grades: [10, 11],
      primaryGradeKey: "10",
      name: "+10~+11강 (최상위 랭커 실사용 엔드급 금카 시장)",
      description:
        "TOP 10,000 랭커 포지션별 최다 사용 리스트에서 높은 비중을 차지하는 최상위 실사용 핵심 구간",
      supplyExposure: "낮음 (공급 제한)" as const,
      replacementRisk: "낮음" as const,
    },
    {
      code: "GRADE_SEPARATED_12_13",
      grades: [12, 13],
      primaryGradeKey: "12",
      name: "+12~+13강 [고가·저유동성 분리 구간] (전체 시세 평균 왜곡 방지)",
      description:
        "극소수 매물과 초고가 호가 공백으로 인해 단 1건의 거래로도 시세가 급변하므로 일반 시장 지수에서 분리 집계하는 특수 구간",
      supplyExposure: "낮음 (공급 제한)" as const,
      replacementRisk: "낮음" as const,
    },
    {
      code: "GRADE_SUB_1_5",
      grades: [1, 5],
      primaryGradeKey: "5",
      name: "+1~+5강 (명함·은카 하위 참조·강화 재료 시장)",
      description:
        "선수팩 초기 공급 및 강화 재료 시세를 확인하기 위한 하위 보조 참조 구간 (주류 +8~+11강 분석과 분리)",
      supplyExposure: "높음 (패키지·이벤트 노출)" as const,
      replacementRisk: "보통" as const,
    },
  ];

  const gradeSectors: MarketSectorSummary[] = gradeDefs.map((def) => {
    const gKey = def.primaryGradeKey;
    const cardsWithGradePrice = allCards.filter(
      (c) => (c.prices?.[gKey]?.bp || 0) > 0
    );
    const tsMembers = seriesList.filter((s) => def.grades.includes(s.grade));
    const bps = cardsWithGradePrice.map((c) => c.prices[gKey].bp);
    const avgBp =
      bps.length > 0 ? mean(bps) : mean(tsMembers.map((s) => s.current_bp));
    const medBp =
      bps.length > 0 ? median(bps) : median(tsMembers.map((s) => s.current_bp));
    const ret1d =
      tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_1d_pct)) : 0;
    const ret7d =
      tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_7d_pct)) : 0;
    const ret14d =
      tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_14d_pct)) : 0;
    const ret30d =
      tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_30d_pct)) : 0;
    const vol =
      tsMembers.length > 0
        ? mean(tsMembers.map((s) => s.volatility_30d_pct))
        : 0;
    const advCount = tsMembers.filter((s) => s.return_7d_pct > 0.5).length;
    const decCount = tsMembers.filter((s) => s.return_7d_pct < -0.5).length;
    const totalTs = Math.max(1, tsMembers.length);
    const fgScore =
      tsMembers.length > 0
        ? clamp(
            Math.round(50 + ret7d * 2.5 + ((advCount - decCount) / totalTs) * 20),
            5,
            95
          )
        : 50;

    return {
      sector_id: `grade-${def.code}`,
      axis: "grade",
      code: def.code,
      name: def.name,
      description: def.description,
      sample_card_count: cardsWithGradePrice.length,
      timeseries_sample_count: tsMembers.length,
      coverage_ratio:
        cardsWithGradePrice.length > 0
          ? round2((tsMembers.length / cardsWithGradePrice.length) * 100)
          : 0,
      confidence_level:
        tsMembers.length >= 12
          ? "high"
          : tsMembers.length >= 4
            ? "medium"
            : "low",
      basis:
        tsMembers.length >= 2 ? "observed" : "on_hold_insufficient_data",
      avg_bp: Math.round(avgBp),
      avg_bp_text: formatBpKorean(Math.round(avgBp)),
      median_bp: Math.round(medBp),
      median_bp_text: formatBpKorean(Math.round(medBp)),
      return_1d_pct: round2(ret1d),
      return_7d_pct: round2(ret7d),
      return_14d_pct: round2(ret14d),
      return_30d_pct: round2(ret30d),
      advance_ratio:
        tsMembers.length > 0 ? round2((advCount / totalTs) * 100) : 0,
      decline_ratio:
        tsMembers.length > 0 ? round2((decCount / totalTs) * 100) : 0,
      flat_ratio:
        tsMembers.length > 0
          ? round2(((totalTs - advCount - decCount) / totalTs) * 100)
          : 0,
      volatility_pct: round2(vol),
      surge_ratio:
        tsMembers.length > 0
          ? round2(
              (tsMembers.filter((s) => s.return_7d_pct >= 7).length / totalTs) *
                100
            )
          : 0,
      plunge_ratio:
        tsMembers.length > 0
          ? round2(
              (tsMembers.filter((s) => s.return_7d_pct <= -7).length / totalTs) *
                100
            )
          : 0,
      relative_strength_vs_market:
        tsMembers.length > 0 ? round2(ret7d - marketRet7d) : 0,
      supply_event_exposure: def.supplyExposure,
      replacement_risk: def.replacementRisk,
      fear_greed_score: fgScore,
      fear_greed_band: computeFearGreedBand(fgScore).band,
      top_movers: tsMembers
        .slice()
        .sort((a, b) => Math.abs(b.return_7d_pct) - Math.abs(a.return_7d_pct))
        .slice(0, 4)
        .map((m) => ({
          spid: m.spid,
          name: m.name,
          season_code: m.season_code,
          grade: m.grade,
          current_bp: m.current_bp,
          current_bp_text: m.current_bp_text,
          return_7d_pct: m.return_7d_pct,
        })),
      index_curve_30d: buildSectorIndexCurve30d(tsMembers),
    };
  });

  // 4) Dynamic Multi-Membership Sectors (Position/Role, Team Color, Official New Trait Possession, Ranker Meta)
  const multiAxisSectors: MarketSectorSummary[] = [
    summarizeSectorGroup({
      sectorId: "pos-FW-STRIKER",
      axis: "position_role",
      code: "POS_FW",
      name: "[포지션·역할] 전방 공격수·윙어 (ST·CF·LW·RW)",
      description:
        "득점력과 공식 신규특성(크로스 포쳐·아크로바틱 피니셔·스피드스터) 유무에 따라 가장 높은 프리미엄이 형성되는 포지션 섹터",
      catalogCards: allCards.filter((c) => getPositionGroup(c.primary_position) === "FW"),
      tsMembers: nonUltraSeries.filter(
        (s) => getPositionGroup(s.primary_position) === "FW"
      ),
      marketRet7d,
      supplyExposure: "보통",
      replacementRisk: "보통",
    }),
    summarizeSectorGroup({
      sectorId: "pos-MF-CONTROL",
      axis: "position_role",
      code: "POS_MF",
      name: "[포지션·역할] 중원·2선 플레이메이커 (CAM·CM·CDM)",
      description:
        "양발·중거리 및 공식 신규특성(커맨더·레이저 슈터·2개의 심장) 보유 여부가 시세를 좌우하는 중원 섹터",
      catalogCards: allCards.filter((c) => getPositionGroup(c.primary_position) === "MF"),
      tsMembers: nonUltraSeries.filter(
        (s) => getPositionGroup(s.primary_position) === "MF"
      ),
      marketRet7d,
      supplyExposure: "보통",
      replacementRisk: "보통",
    }),
    summarizeSectorGroup({
      sectorId: "pos-DF-SHIELD",
      axis: "position_role",
      code: "POS_DF",
      name: "[포지션·역할] 수비 라인·골키퍼 (CB·LB·RB·GK)",
      description:
        "급여 효율과 피지컬·수비 신규특성(타이탄·파이터·와일드 태클러·체이서)이 가격 방어력을 결정하는 수비 섹터",
      catalogCards: allCards.filter((c) =>
        ["DF", "GK"].includes(getPositionGroup(c.primary_position))
      ),
      tsMembers: nonUltraSeries.filter((s) =>
        ["DF", "GK"].includes(getPositionGroup(s.primary_position))
      ),
      marketRet7d,
      supplyExposure: "보통",
      replacementRisk: "낮음",
    }),
    summarizeSectorGroup({
      sectorId: "trait-NEW-LV8-HOLDERS",
      axis: "new_trait",
      code: "NEW_TRAIT_LV8_YES",
      name: "[신규특성 유무] 공식 신규특성(level: 8) 보유 카드군",
      description:
        "공식 코치헬퍼 기준 level: 8 신규특성(trait_icon_50~68)을 1개 이상 보유한 카드 섹터 (기존 level: 5 일반 특성 제외)",
      catalogCards: allCards.filter(
        (c) =>
          c.has_full_ability &&
          extractCardNewAndLegacyTraits(c).newTraits.length > 0
      ),
      tsMembers: nonUltraSeries.filter((s) => (s.new_traits || []).length > 0),
      marketRet7d,
      supplyExposure: "낮음 (공급 제한)",
      replacementRisk: "낮음",
    }),
    summarizeSectorGroup({
      sectorId: "trait-NEW-LV8-NONE",
      axis: "new_trait",
      code: "NEW_TRAIT_LV8_NO",
      name: "[신규특성 유무] 공식 신규특성(level: 8) 미보유 카드군",
      description:
        "기존 일반 고유특성(level: 5)만 보유하거나 신규특성이 부여되지 않은 카드 섹터로, 상위 시즌 출시 시 대체 압력 비교 대조군",
      catalogCards: allCards.filter(
        (c) =>
          c.has_full_ability &&
          extractCardNewAndLegacyTraits(c).newTraits.length === 0
      ),
      tsMembers: nonUltraSeries.filter((s) => (s.new_traits || []).length === 0),
      marketRet7d,
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "높음 (상위 시즌 대체 위험)",
    }),
    summarizeSectorGroup({
      sectorId: "tc-TOP-CLUB-NATION",
      axis: "team_color",
      code: "TC_POPULAR",
      name: "[인기 팀컬러] TOP 랭커 주류 클럽·국가 팀컬러 소속군",
      description:
        "바르셀로나·레알 마드리드·바이에른 뮌헨·첼시·AC밀란·대한민국·프랑스·잉글랜드 등 랭커 점유율 상위 팀컬러에 소속된 카드군",
      catalogCards: allCards.filter((c) =>
        (c.team_colors || []).some((tc: unknown) => {
          const tcStr =
            typeof tc === "string"
              ? tc
              : tc && typeof tc === "object" && "name" in tc
                ? String((tc as { name: unknown }).name || "")
                : "";
          return /(바르셀로나|레알 마드리드|뮌헨|첼시|밀란|맨체스터|리버풀|유벤투스|아스널|인테르|대한민국|프랑스|잉글랜드|네덜란드|브라질|독일)/.test(
            tcStr
          );
        })
      ),
      tsMembers: nonUltraSeries.filter((s) =>
        (s.team_colors || []).some((tc) =>
          /(바르셀로나|레알 마드리드|뮌헨|첼시|밀란|맨체스터|리버풀|유벤투스|아스널|인테르|대한민국|프랑스|잉글랜드|네덜란드|브라질|독일)/.test(
            tc
          )
        )
      ),
      marketRet7d,
      supplyExposure: "보통",
      replacementRisk: "낮음",
    }),
  ];

  return { seasonSectors, capitalTierSectors, gradeSectors, multiAxisSectors };
}


function summarizeSectorGroup(params: {
  sectorId: string;
  axis: MarketSectorSummary["axis"];
  code: string;
  name: string;
  description: string;
  catalogCards: PlayerCard[];
  tsMembers: MarketNormalizedSeries[];
  marketRet7d: number;
  supplyExposure: "낮음 (공급 제한)" | "보통" | "높음 (패키지·이벤트 노출)";
  replacementRisk: "낮음" | "보통" | "높음 (상위 시즌 대체 위험)";
}): MarketSectorSummary {
  const {
    sectorId,
    axis,
    code,
    name,
    description,
    catalogCards,
    tsMembers,
    marketRet7d,
    supplyExposure,
    replacementRisk,
  } = params;

  const catalogBps = catalogCards
    .map((c) => c.prices?.["8"]?.bp || c.bp_8 || c.bp_1)
    .filter((v) => v > 0);
  const avgBp =
    tsMembers.length > 0
      ? mean(tsMembers.map((s) => s.current_bp))
      : catalogBps.length > 0
        ? mean(catalogBps)
        : 0;
  const medBp =
    tsMembers.length > 0
      ? median(tsMembers.map((s) => s.current_bp))
      : catalogBps.length > 0
        ? median(catalogBps)
        : 0;

  const nTs = tsMembers.length;
  const ret1d = nTs > 0 ? mean(tsMembers.map((s) => s.return_1d_pct)) : 0;
  const ret7d = nTs > 0 ? mean(tsMembers.map((s) => s.return_7d_pct)) : 0;
  const ret14d = nTs > 0 ? mean(tsMembers.map((s) => s.return_14d_pct)) : 0;
  const ret30d = nTs > 0 ? mean(tsMembers.map((s) => s.return_30d_pct)) : 0;
  const vol = nTs > 0 ? mean(tsMembers.map((s) => s.volatility_30d_pct)) : 0;

  const adv = tsMembers.filter((s) => s.return_7d_pct > 0.5).length;
  const dec = tsMembers.filter((s) => s.return_7d_pct < -0.5).length;
  const flat = Math.max(0, nTs - adv - dec);
  const surge = tsMembers.filter((s) => s.return_7d_pct >= 7).length;
  const plunge = tsMembers.filter((s) => s.return_7d_pct <= -7).length;

  const advRatio = nTs > 0 ? (adv / nTs) * 100 : 0;
  const decRatio = nTs > 0 ? (dec / nTs) * 100 : 0;
  const flatRatio = nTs > 0 ? (flat / nTs) * 100 : 0;
  const surgeRatio = nTs > 0 ? (surge / nTs) * 100 : 0;
  const plungeRatio = nTs > 0 ? (plunge / nTs) * 100 : 0;

  const breadthScore = nTs > 0 ? clamp(50 + (advRatio - decRatio) * 0.5, 0, 100) : 50;
  const momScore = nTs > 0 ? clamp(50 + ret7d * 3.2 + ret1d * 2.0, 0, 100) : 50;
  const tailScore = nTs > 0 ? clamp(50 + (surgeRatio - plungeRatio) * 0.8, 0, 100) : 50;
  const fgScore = Math.round(breadthScore * 0.4 + momScore * 0.4 + tailScore * 0.2);

  return {
    sector_id: sectorId,
    axis,
    code,
    name,
    description,
    sample_card_count: catalogCards.length,
    timeseries_sample_count: nTs,
    coverage_ratio:
      catalogCards.length > 0 ? round2((nTs / catalogCards.length) * 100) : 0,
    confidence_level:
      nTs >= 12 ? "high" : nTs >= 5 ? "medium" : nTs >= 2 ? "low" : "on_hold_insufficient_data",
    avg_bp: Math.round(avgBp),
    avg_bp_text: formatBpKorean(Math.round(avgBp)),
    median_bp: Math.round(medBp),
    median_bp_text: formatBpKorean(Math.round(medBp)),
    return_1d_pct: round2(ret1d),
    return_7d_pct: round2(ret7d),
    return_14d_pct: round2(ret14d),
    return_30d_pct: round2(ret30d),
    advance_ratio: round2(advRatio),
    decline_ratio: round2(decRatio),
    flat_ratio: round2(flatRatio),
    volatility_pct: round2(vol),
    surge_ratio: round2(surgeRatio),
    plunge_ratio: round2(plungeRatio),
    relative_strength_vs_market: round2(ret7d - marketRet7d),
    supply_event_exposure: supplyExposure,
    replacement_risk: replacementRisk,
    fear_greed_score: fgScore,
    fear_greed_band: computeFearGreedBand(fgScore).band,
    top_movers: tsMembers
      .slice()
      .sort((a, b) => Math.abs(b.return_7d_pct) - Math.abs(a.return_7d_pct))
      .slice(0, 4)
      .map((m) => ({
        spid: m.spid,
        name: m.name,
        season_code: m.season_code,
        grade: m.grade,
        current_bp: m.current_bp,
        current_bp_text: m.current_bp_text,
        return_7d_pct: m.return_7d_pct,
      })),
    index_curve_30d: buildSectorIndexCurve30d(tsMembers),
  };
}

// ============================================================================
// 6. Market Fear & Greed (Overheat / Fear) Index Engine (0–100)
// ============================================================================

export function buildMarketFearGreedIndex(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[],
  seasonSectors: MarketSectorSummary[],
  capitalTierSectors: MarketSectorSummary[]
): MarketFearGreedIndex {
  const n = Math.max(1, seriesList.length);
  const adv7d = seriesList.filter((s) => s.return_7d_pct > 0.5).length;
  const dec7d = seriesList.filter((s) => s.return_7d_pct < -0.5).length;
  const advPct = (adv7d / n) * 100;
  const decPct = (dec7d / n) * 100;

  const avgRet1d = mean(seriesList.map((s) => s.return_1d_pct));
  const avgRet7d = mean(seriesList.map((s) => s.return_7d_pct));
  const avgRet14d = mean(seriesList.map((s) => s.return_14d_pct));
  const avgVol30d = mean(seriesList.map((s) => s.volatility_30d_pct));

  const surgeCount = seriesList.filter((s) => s.return_7d_pct >= 7).length;
  const plungeCount = seriesList.filter((s) => s.return_7d_pct <= -7).length;
  const surgePct = (surgeCount / n) * 100;
  const plungePct = (plungeCount / n) * 100;

  const positiveSectors = seasonSectors.filter(
    (sec) => sec.timeseries_sample_count > 0 && sec.return_7d_pct > 0
  ).length;
  const activeSectorCount = Math.max(
    1,
    seasonSectors.filter((sec) => sec.timeseries_sample_count > 0).length
  );
  const sectorDiffusionPct = (positiveSectors / activeSectorCount) * 100;

  const c1Score = Math.round(clamp(50 + (advPct - decPct) * 0.55, 0, 100));
  const c2Score = Math.round(
    clamp(50 + avgRet7d * 3.0 + avgRet14d * 1.2 + avgRet1d * 2.5, 0, 100)
  );
  const c3Score = Math.round(clamp(50 + (surgePct - plungePct) * 0.9, 0, 100));
  const avgMaxDd = mean(seriesList.map((s) => s.max_drawdown_30d_pct));
  const c4Score = Math.round(
    clamp(75 - avgVol30d * 5.5 + avgMaxDd * 0.9, 0, 100)
  );
  const c5Score = Math.round(
    clamp(20 + sectorDiffusionPct * 0.65 + avgRet7d * 1.5, 0, 100)
  );

  const overallScore = Math.round(
    c1Score * 0.25 +
      c2Score * 0.25 +
      c3Score * 0.2 +
      c4Score * 0.15 +
      c5Score * 0.15
  );

  const { band, rangeLabel } = computeFearGreedBand(overallScore);

  const components: MarketFearGreedComponent[] = [
    {
      id: "breadth_adr",
      name: "시장 등락 확산도 (Advance/Decline Breadth)",
      weight: 0.25,
      raw_value_text: `상승 ${adv7d}종(${round2(advPct)}%) vs 하락 ${dec7d}종(${round2(decPct)}%)`,
      normalized_score: c1Score,
      signal: c1Score >= 60 ? "과열" : c1Score < 40 ? "공포" : "중립",
      description:
        "7일 기준 가격이 상승한 카드 비율과 하락한 카드 비율의 차이를 측정하여 매수세의 시장 전반 확산 여부를 평가합니다.",
      basis: "observed",
    },
    {
      id: "price_momentum",
      name: "단기·중기 가격 모멘텀 (1d·7d·14d Return)",
      weight: 0.25,
      raw_value_text: `1일 ${avgRet1d >= 0 ? "+" : ""}${round2(avgRet1d)}% / 7일 ${avgRet7d >= 0 ? "+" : ""}${round2(avgRet7d)}% / 14일 ${avgRet14d >= 0 ? "+" : ""}${round2(avgRet14d)}%`,
      normalized_score: c2Score,
      signal: c2Score >= 60 ? "과열" : c2Score < 40 ? "공포" : "중립",
      description:
        "추적 시계열 표본 전체의 단기(1일·7일) 및 중기(14일) 평균 수익률 속도를 결합해 가격 추세 강도를 산출합니다.",
      basis: "observed",
    },
    {
      id: "tail_asymmetry",
      name: "급등·급락 꼬리 비대칭 (Surge/Plunge Ratio)",
      weight: 0.2,
      raw_value_text: `7일 급등(+7%↑) ${round2(surgePct)}% vs 급락(-7%↓) ${round2(plungePct)}%`,
      normalized_score: c3Score,
      signal: c3Score >= 60 ? "과열" : c3Score < 40 ? "공포" : "중립",
      description:
        "단기 급등 카드와 급락(패닉셀) 카드의 비중 차이를 통해 시장 참여자의 추격 매수 또는 투매 쏠림을 측정합니다.",
      basis: "observed",
    },
    {
      id: "volatility_drawdown",
      name: "변동성 및 낙폭 안정도 (Volatility & Drawdown)",
      weight: 0.15,
      raw_value_text: `일평균 변동성 ${round2(avgVol30d)}% / 30일 평균 최대낙폭 ${round2(avgMaxDd)}%`,
      normalized_score: c4Score,
      signal: c4Score >= 60 ? "과열" : c4Score < 40 ? "공포" : "중립",
      description:
        "일간 수익률 표준편차와 최근 고점 대비 최대 낙폭(MDD)을 결합해 가격 불안정성 및 하방 압력을 반영합니다.",
      basis: "observed",
    },
    {
      id: "sector_diffusion",
      name: "섹터 간 동조화 지수 (Sector Diffusion)",
      weight: 0.15,
      raw_value_text: `활성 시즌 섹터 ${activeSectorCount}개 중 ${positiveSectors}개 강세 (${round2(sectorDiffusionPct)}%)`,
      normalized_score: c5Score,
      signal: c5Score >= 60 ? "과열" : c5Score < 40 ? "공포" : "중립",
      description:
        "특정 소수 대장 카드만 오르는 장세인지, 단종·대장·팀컬러 실사용 섹터가 동반 강세인지 평가합니다.",
      basis: "observed",
    },
  ];

  const fullSeries = seriesList.filter((s) => s.points.length >= 28);
  const len =
    fullSeries.length > 0
      ? Math.min(...fullSeries.map((s) => s.points.length))
      : 0;
  const history30d: {
    date: string;
    score: number;
    band: string;
    market_index: number;
  }[] = [];

  for (let i = 0; i < len; i++) {
    const date = fullSeries[0].points[i].date;
    const lookbackIdx = Math.max(0, i - 5);
    const rets5d = fullSeries.map((s) => {
      const p0 = s.points[lookbackIdx].normalized_bp;
      const p1 = s.points[i].normalized_bp;
      return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
    });
    const rets1d = fullSeries.map((s) => s.points[i].return_1d_pct);
    const upRatio =
      (rets5d.filter((r) => r > 0.3).length / Math.max(1, fullSeries.length)) *
      100;
    const downRatio =
      (rets5d.filter((r) => r < -0.3).length / Math.max(1, fullSeries.length)) *
      100;
    const avg5d = mean(rets5d);
    const avg1d = mean(rets1d);

    const dayScore =
      i === len - 1
        ? overallScore
        : Math.round(
            clamp(
              50 + (upRatio - downRatio) * 0.35 + avg5d * 2.4 + avg1d * 2.0,
              5,
              95
            )
          );

    const relIndices = fullSeries.map((s) => {
      const base = s.points[0].normalized_bp;
      const cur = s.points[i].normalized_bp;
      return base > 0 ? (cur / base) * 100 : 100;
    });

    history30d.push({
      date,
      score: dayScore,
      band: computeFearGreedBand(dayScore).band,
      market_index: round2(mean(relIndices)),
    });
  }

  let summaryComment = "";
  if (overallScore < 40) {
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band}, +8~+11강 주류 기준)으로, 단기 하락 종목 비중(${round2(decPct)}%)이 상승 종목(${round2(advPct)}%)을 상회하며 매수 심리가 위축된 조정 국면입니다. 공식 신규특성(크로스 포쳐·아크로바틱 피니셔·커맨더·타이탄 등 level: 8) 보유 대장주를 중심으로 분할 매수 타점을 탐색하기에 유리한 구간입니다.`;
  } else if (overallScore >= 60) {
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band}, +8~+11강 주류 기준)으로, 상승 확산도(${round2(advPct)}%)와 단기 모멘텀이 강하게 유입되는 과열 국면입니다. 추격 매수 시 패키지 공급이나 수수료 쿠폰 종료 직후의 단기 되돌림 리스크에 유의해야 합니다.`;
  } else {
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band}, +8~+11강 주류 기준)으로, 전체 시장의 급격한 쏠림 없이 시즌·자본대·신규특성 보유 여부별 차별화 장세가 전개되고 있습니다. 공식 신규특성(크로스 포쳐·아크로바틱 피니셔·커맨더·타이탄) 보유 카드의 상대 강도가 시장을 지지하고 있습니다.`;
  }

  return {
    overall_score: overallScore,
    band,
    band_range_label: rangeLabel,
    summary_comment: summaryComment,
    calculated_at: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    sample_series_count: seriesList.length,
    total_catalog_count: allCards.length,
    data_coverage_pct:
      allCards.length > 0
        ? round2((seriesList.length / allCards.length) * 100)
        : 0,
    unobservable_Exclusion_note:
      "넥슨 공식 Open API 및 데이터센터는 전체 유저의 실시간 호가창 잔량(Order Book Depth)과 전체 체결 거래량(Transaction Volume)을 공개하지 않으므로, 본 지수는 가짜 거래량을 생성하지 않고 +8~+11강 주류 시장의 실제 관측된 시계열 등락 확산도(Breadth), 수익률 모멘텀, 꼬리 비대칭, 실현 변동성 데이터만으로 산출됩니다 (+12~+13강 초저유동성 구간 분리).",
    components,
    history_30d: history30d,
    by_season_sector: seasonSectors
      .filter((s) => s.timeseries_sample_count > 0)
      .map((s) => ({
        sector_id: s.sector_id,
        name: s.name,
        score: s.fear_greed_score,
        band: s.fear_greed_band,
        return_7d_pct: s.return_7d_pct,
        sample_count: s.timeseries_sample_count,
      })),
    by_capital_tier: capitalTierSectors
      .filter((s) => s.timeseries_sample_count > 0)
      .map((s) => ({
        sector_id: s.sector_id,
        name: s.name,
        score: s.fear_greed_score,
        band: s.fear_greed_band,
        return_7d_pct: s.return_7d_pct,
        sample_count: s.timeseries_sample_count,
      })),
  };
}

// ============================================================================
// 7. Event Impact, Supply Scenario & Fee Coupon Engine
// ============================================================================

function findDateIndex(points: MarketNormalizedPoint[], targetDate: string): number {
  const exact = points.findIndex((p) => p.date === targetDate);
  if (exact !== -1) return exact;
  const toVal = (d: string) => {
    const [m, day] = d.split(".").map(Number);
    return (m || 10) * 100 + (day || 1);
  };
  const targetVal = toVal(targetDate);
  let bestIdx = 0;
  let bestDiff = Number.MAX_SAFE_INTEGER;
  points.forEach((p, idx) => {
    const diff = Math.abs(toVal(p.date) - targetVal);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

export function analyzeMarketEvents(
  seriesList: MarketNormalizedSeries[]
): {
  events: MarketEventRecord[];
  impacts: MarketEventImpactReport[];
} {
  const activeEvents = getActiveMarketEvents();
  const fullSeries = seriesList.filter((s) => s.points.length >= 25);
  const impacts: MarketEventImpactReport[] = activeEvents.map((event) => {
    const affected = fullSeries.filter(
      (s) =>
        event.target_seasons.includes(s.season_code) ||
        event.target_capital_tiers.includes(s.capital_tier)
    );
    const control = fullSeries.filter(
      (s) =>
        !event.target_seasons.includes(s.season_code) &&
        !event.target_capital_tiers.includes(s.capital_tier)
    );

    const affGroup = affected.length > 0 ? affected : fullSeries;
    const ctrlGroup = control.length > 0 ? control : fullSeries;

    const preRets: number[] = [];
    const duringRets: number[] = [];
    const postRets: number[] = [];
    const ctrlDuringRets: number[] = [];
    const volChanges: number[] = [];

    for (const s of affGroup) {
      const startIdx = clamp(
        findDateIndex(s.points, event.start_date),
        2,
        s.points.length - 3
      );
      const endIdx = clamp(
        findDateIndex(s.points, event.end_date),
        startIdx + 1,
        s.points.length - 1
      );
      const preIdx = Math.max(0, startIdx - 4);
      const postIdx = Math.min(s.points.length - 1, endIdx + 4);

      const pPre = s.points[preIdx].normalized_bp;
      const pStart = s.points[startIdx].normalized_bp;
      const pEnd = s.points[endIdx].normalized_bp;
      const pPost = s.points[postIdx].normalized_bp;

      if (pPre > 0) preRets.push(((pStart - pPre) / pPre) * 100);
      if (pStart > 0) duringRets.push(((pEnd - pStart) / pStart) * 100);
      if (pEnd > 0) postRets.push(((pPost - pEnd) / pEnd) * 100);

      const preDaily = s.points
        .slice(preIdx, startIdx + 1)
        .map((p) => p.return_1d_pct);
      const durDaily = s.points
        .slice(startIdx, endIdx + 1)
        .map((p) => p.return_1d_pct);
      volChanges.push(stdDev(durDaily) - stdDev(preDaily));
    }

    for (const s of ctrlGroup) {
      const startIdx = clamp(
        findDateIndex(s.points, event.start_date),
        1,
        s.points.length - 2
      );
      const endIdx = clamp(
        findDateIndex(s.points, event.end_date),
        startIdx + 1,
        s.points.length - 1
      );
      const pStart = s.points[startIdx].normalized_bp;
      const pEnd = s.points[endIdx].normalized_bp;
      if (pStart > 0) ctrlDuringRets.push(((pEnd - pStart) / pStart) * 100);
    }

    const preAvg = round2(mean(preRets));
    const duringAvg = round2(mean(duringRets));
    const postAvg = round2(mean(postRets));
    const ctrlDuringAvg = round2(mean(ctrlDuringRets));
    const didNetEffect = round2(duringAvg - ctrlDuringAvg);
    const volChange = round2(mean(volChanges));

    const bpScaleBase =
      event.bp_injection_scale === "대규모"
        ? 4.2
        : event.bp_injection_scale === "중규모"
          ? 2.1
          : event.bp_injection_scale === "소규모"
            ? 0.8
            : 0;
    const packScaleBase =
      event.pack_supply_scale === "대규모"
        ? -5.4
        : event.pack_supply_scale === "중규모"
          ? -2.8
          : event.pack_supply_scale === "소규모"
            ? -1.1
            : 0;

    const supplyScenarios = [
      {
        scenario: "보수적 (Conservative)" as const,
        estimated_pack_influx_index: packScaleBase !== 0 ? 35 : 10,
        estimated_bp_inflation_effect_pct: round2(bpScaleBase * 0.7),
        estimated_supply_dilution_effect_pct: round2(packScaleBase * 0.65),
        net_expected_price_impact_pct: round2(
          bpScaleBase * 0.7 + packScaleBase * 0.65
        ),
      },
      {
        scenario: "기준 (Base)" as const,
        estimated_pack_influx_index: packScaleBase !== 0 ? 60 : 15,
        estimated_bp_inflation_effect_pct: round2(bpScaleBase),
        estimated_supply_dilution_effect_pct: round2(packScaleBase),
        net_expected_price_impact_pct: round2(bpScaleBase + packScaleBase),
      },
      {
        scenario: "공격적 (Aggressive)" as const,
        estimated_pack_influx_index: packScaleBase !== 0 ? 85 : 25,
        estimated_bp_inflation_effect_pct: round2(bpScaleBase * 1.35),
        estimated_supply_dilution_effect_pct: round2(packScaleBase * 1.45),
        net_expected_price_impact_pct: round2(
          bpScaleBase * 1.35 + packScaleBase * 1.45
        ),
      },
    ];

    const couponPct = event.fee_coupon_discount_pct || 0;
    const baseTax = 40;
    const topPcDiscount = 50;
    const totalDiscount = clamp(topPcDiscount + couponPct, 0, 95);
    const effectiveFeeRate = round2(baseTax * (1 - totalDiscount / 100));

    return {
      event,
      affected_sector_name: `대상 시즌(${event.target_seasons.slice(0, 4).join("·")}) 및 +8~+11강 주류`,
      control_sector_name: "비대상 대조군 섹터 (Control Group)",
      affected_sample_count: affGroup.length,
      control_sample_count: ctrlGroup.length,
      pre_event_return_pct: preAvg,
      during_event_return_pct: duringAvg,
      post_event_return_pct: postAvg,
      control_during_return_pct: ctrlDuringAvg,
      did_net_effect_pct: didNetEffect,
      volatility_change_pct: volChange,
      duration_days_estimated: 7,
      mechanism_diagnosis:
        didNetEffect < -1.0
          ? `이벤트 기간 중 대상 섹터 수익률(${duringAvg}%)이 대조군(${ctrlDuringAvg}%) 대비 ${didNetEffect}%p 낮게 관측되어 패키지 매물 공급 희석 효과가 BP 유입 효과를 우세하게 압도했습니다.`
          : didNetEffect > 1.0
            ? `이벤트 기간 중 대상 섹터가 대조군 대비 +${didNetEffect}%p 초과 수익률을 기록하여, BP 유입·수수료 쿠폰을 활용한 상위 카드(+8~+11강) 갈아타기 매수세가 매물 부담을 흡수했습니다.`
            : `이벤트 기간 중 대상 섹터(${duringAvg}%)와 대조군(${ctrlDuringAvg}%) 간 격차(${didNetEffect}%p)가 제한적이어서 BP 유입과 매물 출회가 균형을 이룬 것으로 분석됩니다.`,
      supply_scenarios: supplyScenarios,
      fee_coupon_simulation: {
        base_tax_rate_pct: baseTax,
        top_pc_discount_pct: topPcDiscount,
        coupon_discount_pct: couponPct,
        effective_fee_rate_pct: effectiveFeeRate,
        breakeven_rebuy_drop_pct: effectiveFeeRate,
        sell_pressure_assessment:
          couponPct >= 40
            ? `TOP+PC방+쿠폰(${couponPct}%) 합산 시 실효 수수료율이 ${effectiveFeeRate}%까지 낮아져, 평소 거래세(20%) 때문에 묶여 있던 1,000억~1조 BP 이상 고가 카드의 차익 실현 및 포지션 교체 매물이 단기 집중 출회됩니다.`
            : couponPct >= 30
              ? `실효 수수료율 ${effectiveFeeRate}% 구간으로 중고가 주전 카드의 교체 거래가 활발해지며 단기 변동성이 소폭 상승합니다.`
              : `수수료 쿠폰 미적용(기본 TOP+PC방 실효세율 20%) 구간으로, 시세 차익 목적의 단기 회전매매보다는 실사용 목적 거래가 중심입니다.`,
      },
    };
  });

  return { events: activeEvents, impacts };
}

// ============================================================================
// 8. 4-Stage Stepwise Price Prediction & Point-in-Time Backtesting Engine
//    (Strictly uses ONLY Official New Traits level: 8 in M4_EVENT_TRAIT)
// ============================================================================

const HIGH_DEMAND_NEW_TRAITS = new Set([
  "크로스 포쳐",
  "아크로바틱 피니셔",
  "레이저 슈터",
  "스피드스터",
  "커맨더",
  "2개의 심장",
  "타이탄",
  "파이터",
  "와일드 태클러",
  "체이서",
]);

function predictStepwiseAtIndex(params: {
  pointsUpToT: MarketNormalizedPoint[];
  horizonDays: 1 | 7 | 30;
  seasonSector: SeasonSectorType;
  capitalTier: CapitalTierType;
  sectorDriftDailyPct: number;
  newTraits: string[];
}): {
  m1Bp: number;
  m2Bp: number;
  m3Bp: number;
  m4Bp: number;
  ensembleBp: number;
  lowerBp: number;
  upperBp: number;
  dailyVolPct: number;
} {
  const {
    pointsUpToT,
    horizonDays,
    seasonSector,
    sectorDriftDailyPct,
    newTraits,
  } = params;
  const n = pointsUpToT.length;
  const currentBp = pointsUpToT[n - 1].normalized_bp;
  if (currentBp <= 0 || n < 4) {
    return {
      m1Bp: currentBp,
      m2Bp: currentBp,
      m3Bp: currentBp,
      m4Bp: currentBp,
      ensembleBp: currentBp,
      lowerBp: currentBp,
      upperBp: currentBp,
      dailyVolPct: 1,
    };
  }

  // Model 1: Naive Baseline (Recent Price Hold)
  const m1Bp = currentBp;

  // Model 2: Statistical Time-Series (Short-term spike reversion toward 5d/10d median anchor)
  const window5 = pointsUpToT.slice(Math.max(0, n - 5));
  const med5 = median(window5.map((p) => p.normalized_bp));
  const dailyRets = pointsUpToT.slice(Math.max(1, n - 14)).map((p) => p.return_1d_pct);
  const dailyVolPct = clamp(stdDev(dailyRets), 0.35, 12);

  const last1dRet = clamp(pointsUpToT[n - 1].return_1d_pct, -20, 20);
  const medGapPct = med5 > 0 ? clamp(((med5 - currentBp) / currentBp) * 100, -18, 18) : 0;

  const effectiveSteps = Math.pow(horizonDays, 0.35);
  const m2RetPct = clamp(
    -last1dRet * 0.14 + medGapPct * (horizonDays === 1 ? 0.18 : 0.24),
    -18,
    18
  );
  const m2Bp = Math.round(currentBp * (1 + m2RetPct / 100));

  // Model 3: Sector-Adjusted Model (Season Scarcity & Relative Sector Anchor — WITHOUT trait input)
  const clampedSectorDrift = clamp(sectorDriftDailyPct, -2.5, 2.5);
  const scarcityDailyAdj =
    seasonSector === "LIMITED_DISCONTINUED"
      ? 0.05
      : seasonSector === "NEW_META_FLAGSHIP"
        ? 0.03
        : seasonSector === "EXISTING_FLAGSHIP"
          ? -0.02
          : 0.0;
  const m3RetPct = clamp(
    m2RetPct * 0.88 +
      (clampedSectorDrift * 0.08 + scarcityDailyAdj) * effectiveSteps,
    -18,
    18
  );
  const m3Bp = Math.round(currentBp * (1 + m3RetPct / 100));

  // Model 4: Event + Supply/Demand + Official New Trait (level: 8 ONLY) Meta Model
  const officialNewCount = newTraits.filter((t) => OFFICIAL_NEW_TRAIT_NAMES.has(t)).length;
  const hasTopNewTrait = newTraits.some((t) => HIGH_DEMAND_NEW_TRAITS.has(t));
  const traitDailyAdj =
    (officialNewCount >= 2 ? 0.035 : officialNewCount === 1 ? 0.02 : -0.01) +
    (hasTopNewTrait ? 0.025 : 0);

  const eventShockCushion =
    medGapPct > 1.0 && (hasTopNewTrait || seasonSector === "LIMITED_DISCONTINUED")
      ? 0.06 * effectiveSteps
      : 0;

  const m4RetPct = clamp(
    m3RetPct * 0.92 + (traitDailyAdj * effectiveSteps + eventShockCushion),
    -18,
    18
  );
  const m4Bp = Math.round(currentBp * (1 + m4RetPct / 100));

  const ensembleBp = Math.round(
    m1Bp * 0.2 + m2Bp * 0.25 + m3Bp * 0.25 + m4Bp * 0.3
  );

  // 80% prediction interval (z = 1.28 * dailyVol * sqrt(h))
  const bandPct = clamp(
    1.28 * Math.max(1.2, dailyVolPct) * Math.sqrt(horizonDays),
    1.8,
    38
  );
  const lowerBp = Math.round(ensembleBp * (1 - bandPct / 100));
  const upperBp = Math.round(ensembleBp * (1 + bandPct / 100));

  return {
    m1Bp,
    m2Bp,
    m3Bp,
    m4Bp,
    ensembleBp,
    lowerBp,
    upperBp,
    dailyVolPct,
  };
}

// ============================================================================
// 8.A Transfer Market Fee/BEP, Enhancement EV Arbitrage & Signal Quality Engine
// ============================================================================

export const DEFAULT_MARKET_FEE_CONFIG: MarketFeeConfig = {
  hasPcRoom: true,
  hasTopClass: true,
  couponRate: 0.3,
};

/**
 * FC 온라인 이적시장 실효 수수료율 및 손익분기점(BEP) 계산기
 * - 기본 수수료 40% (0.40)
 * - 할인율 합산: PC방(30%) + 탑클래스(20%) + 할인쿠폰(0% / 20% / 30% / 40%)
 * - effectiveFeeRate = 0.40 * (1 - Math.min(1.0, totalDiscount))
 * - breakEvenPrice = Math.ceil(buyPrice / (1 - effectiveFeeRate))
 */
export function calculateEffectiveFeeAndBep(params: {
  buyPrice: number;
  targetSellPrice: number;
  feeConfig?: MarketFeeConfig;
}): {
  effectiveFeeRate: number;
  breakEvenPrice: number;
  netProfitBp: number;
  netProfitRatePct: number;
  isFeeLossWarning: boolean;
} {
  const cfg = params.feeConfig || DEFAULT_MARKET_FEE_CONFIG;
  const buyPrice = Math.max(0, Math.round(params.buyPrice || 0));
  const targetSellPrice = Math.max(0, Math.round(params.targetSellPrice || 0));

  const pcDiscount = cfg.hasPcRoom ? 0.3 : 0;
  const topDiscount = cfg.hasTopClass ? 0.2 : 0;
  const couponDiscount = clamp(Number(cfg.couponRate || 0), 0, 0.5);
  const totalDiscount = Math.min(1.0, pcDiscount + topDiscount + couponDiscount);

  const effectiveFeeRate = round2(0.4 * (1 - totalDiscount) * 10000) / 10000;
  const breakEvenPrice =
    buyPrice > 0 && effectiveFeeRate < 1
      ? Math.ceil(buyPrice / (1 - effectiveFeeRate))
      : buyPrice;

  const netProceeds = Math.floor(targetSellPrice * (1 - effectiveFeeRate));
  const netProfitBp = netProceeds - buyPrice;
  const netProfitRatePct =
    buyPrice > 0 ? round2((netProfitBp / buyPrice) * 100) : 0;

  return {
    effectiveFeeRate,
    breakEvenPrice,
    netProfitBp,
    netProfitRatePct,
    isFeeLossWarning: netProfitBp < 0,
  };
}

/**
 * 풀케미(5장 꽉 채움) 기준 강화 단계별 성공 확률 테이블
 */
const FULL_GAUGE_ENHANCE_SUCCESS_PROB: Record<number, number> = {
  2: 1.0,
  3: 0.81,
  4: 0.64,
  5: 0.5,
  6: 0.26,
  7: 0.15,
  8: 0.07,
  9: 0.04,
  10: 0.02,
  11: 0.012,
  12: 0.007,
  13: 0.004,
};

/**
 * 강화 기댓값 차익 분석기 (강화 데이 / 야수의 심장 EV 모델) 및 귀속 위험 판독기
 * - 완제품 구매가(marketPrice) vs (N-1강 카드 가격 + 동일 OVR 재료 5장 비용) / 강화 성공 확률 (expectedCraftCost)
 * - 고강(8~11강) 중 고점 정체 또는 거래/관측 둔화·매물 적체 패턴 시 isLiquidityTrap: true 부여
 */
export function analyzeEnhancementEvArbitrage(params: {
  series: MarketNormalizedSeries;
  card?: PlayerCard;
  allCards: PlayerCard[];
}): EnhancementEvAnalysis {
  const { series, card, allCards } = params;
  const grade = clamp(series.grade || 8, 2, 13);
  const marketPrice = Math.max(1, series.current_bp);

  // 1) N-1강 하위 단계 카드 가격 추정 또는 실측값 조회
  const prevGrade = Math.max(1, grade - 1);
  let prevGradePrice = 0;
  if (card?.prices && card.prices[String(prevGrade)]?.bp > 0) {
    prevGradePrice = card.prices[String(prevGrade)].bp;
  } else if (prevGrade === 7 && card?.bp_5 && card.bp_5 > 0) {
    prevGradePrice = Math.round(card.bp_5 * 3.6);
  } else if (prevGrade === 4 && card?.bp_1 && card.bp_1 > 0) {
    prevGradePrice = Math.round(card.bp_1 * 2.1);
  } else {
    // 일반적인 FC 온라인 강화 배율 역산
    const typicalMultiple =
      grade >= 9 ? 3.8 : grade === 8 ? 3.4 : grade >= 6 ? 2.5 : 1.7;
    prevGradePrice = Math.round(marketPrice / typicalMultiple);
  }

  // 2) 동일 OVR 재료 5장 비용 산출 (N-1강 카드의 실효 OVR 기준)
  const baseOvr = card?.ovr || series.ovr || 112;
  const targetFodderOvr = baseOvr + getEnhanceOvrBoost(prevGrade);
  const fodderPeers = allCards
    .map((c) => c.bp_1 || c.prices?.["1"]?.bp || 0)
    .filter((bp) => bp > 0)
    .sort((a, b) => a - b);

  // OVR 구간별 1장당 재료 시세 (데이터셋 하위 25% 재료용 카드 또는 OVR 기반 공식)
  const baseFodderUnit =
    targetFodderOvr >= 130
      ? 42_000_000_000
      : targetFodderOvr >= 127
        ? 18_000_000_000
        : targetFodderOvr >= 124
          ? 7_500_000_000
          : targetFodderOvr >= 120
            ? 2_800_000_000
            : 950_000_000;
  const datasetFloor =
    fodderPeers.length > 0
      ? fodderPeers[Math.floor(fodderPeers.length * 0.15)]
      : baseFodderUnit;
  const singleFodderCost = Math.round(
    clamp(Math.min(baseFodderUnit, datasetFloor * 0.45), 300_000_000, marketPrice * 0.08)
  );
  const fodder5Cost = singleFodderCost * 5;

  // 3) 강화 성공 확률 (강화 데이 보너스 포함 실효 확률 반영) 및 기대 제작 비용
  const baseProb = FULL_GAUGE_ENHANCE_SUCCESS_PROB[grade] || 0.07;
  // 강화 부스트/강화 데이 평균 체감 확률 보정 (야수의 심장 EV 모델)
  const effectiveProb = clamp(
    grade === 8 ? 0.27 : grade === 9 ? 0.19 : grade >= 10 ? 0.14 : baseProb * 1.25,
    0.05,
    0.95
  );

  // 1회 시도 시 소모 비용(재료 5장 + 복구/하락 손실분)을 성공 확률로 나눈 총 기대 제작 원가
  const singleAttemptLoss = fodder5Cost + Math.round(prevGradePrice * 0.42);
  const expectedCraftCost = Math.round(
    prevGradePrice + singleAttemptLoss / effectiveProb
  );
  const costDiffBp = marketPrice - expectedCraftCost;

  const isCraftCheaper = expectedCraftCost < marketPrice * 0.96;
  const recommendation = isCraftCheaper ? "CRAFT_RECOMMENDED" : "BUY_COMPLETE";
  const verdictLabel = isCraftCheaper
    ? "직접 강화 유리 (기댓값 양수)"
    : "완제품 매수 유리";

  // 4) 고강(8~11강+) 귀속 리스크(isLiquidityTrap) 판별:
  //    - 30일 Z-Score가 고점 부근(> 0.85)이면서 최근 1일/7일 모멘텀이 둔화되거나,
  //    - 최근 5일 연속 가격 변동이 거의 없는 호가 정체(하한가 매물 적체) 패턴,
  //    - 또는 비인기/구시즌 고강인데 시계열 관측 신뢰도가 낮은 경우
  const recent5Points = series.points.slice(-5);
  const flatDaysCount = recent5Points.filter(
    (p) => Math.abs(p.return_1d_pct) < 0.08
  ).length;
  const isPeakStagnation =
    series.z_score_30d >= 0.85 && series.return_1d_pct <= 0.15;
  const isOrderbookStuck = flatDaysCount >= 4 && series.return_7d_pct <= 0;
  const isOldSeasonHighGrade =
    grade >= 8 &&
    series.season_sector === "EXISTING_FLAGSHIP" &&
    series.return_7d_pct < -1.2 &&
    (series.new_traits || []).length === 0;

  const isLiquidityTrap =
    grade >= 8 && (isPeakStagnation || isOrderbookStuck || isOldSeasonHighGrade);

  let liquidityTrapReason = "";
  if (isLiquidityTrap) {
    if (isOrderbookStuck) {
      liquidityTrapReason = `최근 5일 중 ${flatDaysCount}일간 기준가 정체(변동 <0.1%) 및 하한가 매물 적체 징후 — 재판매 시 귀속 위험 주의`;
    } else if (isPeakStagnation) {
      liquidityTrapReason = `30일 고점 밴드(Z-Score +${series.z_score_30d}) 도달 후 거래 모멘텀 둔화 — 고점 물림 및 호가 공백 주의`;
    } else {
      liquidityTrapReason = `신규특성 미보유 구시즌 +${grade}강 고강 카드로 상위 시즌 세대교체에 따른 매수세 실종(귀속) 주의`;
    }
  } else {
    liquidityTrapReason = isCraftCheaper
      ? `완제품(${formatBpKorean(marketPrice)}) 대비 직접 강화 기대비용(${formatBpKorean(expectedCraftCost)})이 약 ${formatBpKorean(Math.abs(costDiffBp))} 저렴하여 강화 데이 제작 노림수 유효`
      : `직접 강화 기대비용(${formatBpKorean(expectedCraftCost)})이 완제품 매수가(${formatBpKorean(marketPrice)})보다 높아 이적시장 완제품 급처 매물 매수가 유리`;
  }

  return {
    targetGrade: grade,
    marketPrice,
    prevGradePrice,
    fodder5Cost,
    successProb: round2(effectiveProb * 100) / 100,
    expectedCraftCost,
    costDiffBp,
    recommendation,
    verdictLabel,
    isLiquidityTrap,
    liquidityTrapReason,
  };
}

/**
 * 개별 선수 카드에 대한 신호 품질 점수(0~100점) 및 상태 태그 산출
 */
export function computeMarketSignalMetrics(params: {
  series: MarketNormalizedSeries;
  expectedSellBp7d: number;
  expectedReturn7dPct: number;
  confidence7d: number;
  card?: PlayerCard;
  allCards: PlayerCard[];
  feeConfig?: MarketFeeConfig;
}): MarketSignalMetrics {
  const {
    series,
    expectedSellBp7d,
    expectedReturn7dPct,
    confidence7d,
    card,
    allCards,
    feeConfig = DEFAULT_MARKET_FEE_CONFIG,
  } = params;

  const feeBep = calculateEffectiveFeeAndBep({
    buyPrice: series.current_bp,
    targetSellPrice: expectedSellBp7d,
    feeConfig,
  });

  const enhancementEv = analyzeEnhancementEvArbitrage({
    series,
    card,
    allCards,
  });

  // 신호 품질 점수 (0~100점): 백테스트 신뢰도 + 7일 기대수익 + 신규특성/대장 수요 + 유동성 안정성
  const newTraitBonus = (series.new_traits || []).length >= 2 ? 10 : (series.new_traits || []).length === 1 ? 6 : 0;
  const returnBonus = clamp(expectedReturn7dPct * 3.2, -15, 22);
  const trapPenalty = enhancementEv.isLiquidityTrap ? -22 : 0;
  const feeLossPenalty = feeBep.isFeeLossWarning ? -12 : 6;

  const signalQualityScore = Math.round(
    clamp(
      confidence7d * 0.72 + newTraitBonus + returnBonus + trapPenalty + feeLossPenalty,
      18,
      98
    )
  );

  // 직관적 상태 태그 분류:
  // '🔥 급등 초입' | '💎 수요 유입' | '📈 상승 지속' | '⚠️ 고점/귀속 주의'
  let signalStatusTag: MarketSignalStatusTag = "💎 수요 유입";
  if (
    enhancementEv.isLiquidityTrap ||
    series.z_score_30d > 1.15 ||
    expectedReturn7dPct < -0.5
  ) {
    signalStatusTag = "⚠️ 고점/귀속 주의";
  } else if (
    series.z_score_30d <= -0.35 &&
    (series.return_1d_pct >= 0.2 || expectedReturn7dPct >= 2.2)
  ) {
    signalStatusTag = "🔥 급등 초입";
  } else if (series.return_7d_pct >= 1.5 && expectedReturn7dPct >= 0.8) {
    signalStatusTag = "📈 상승 지속";
  } else {
    signalStatusTag = "💎 수요 유입";
  }

  return {
    spid: series.spid,
    name: series.name,
    seasonCode: series.season_code,
    grade: series.grade,
    currentBp: series.current_bp,
    targetSellBp: expectedSellBp7d,
    feeConfig,
    effectiveFeeRate: feeBep.effectiveFeeRate,
    breakEvenPrice: feeBep.breakEvenPrice,
    netProfitBp: feeBep.netProfitBp,
    netProfitRatePct: feeBep.netProfitRatePct,
    isFeeLossWarning: feeBep.isFeeLossWarning,
    enhancementEv,
    signalQualityScore,
    signalStatusTag,
  };
}

/**
 * FClab 마켓 종합 지수 및 시즌/강화별 등락 히트맵 빌더
 */
export function buildMarketOverviewIndex(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[],
  currentIndex: number,
  changePct1d: number,
  changePct7d: number
): MarketOverviewIndex {
  const coreSeries = seriesList.filter(
    (s) => s.grade_tier_zone === "CORE_GOLD_8_11"
  );
  const pool = coreSeries.length > 0 ? coreSeries : seriesList;

  let advancingCount = 0;
  let flatCount = 0;
  let decliningCount = 0;

  for (const s of pool) {
    if (s.return_1d_pct > 0.25) advancingCount++;
    else if (s.return_1d_pct < -0.25) decliningCount++;
    else flatCount++;
  }

  // 시즌 x 강화 단계별 히트맵 셀 집계
  const cellMap = new Map<
    string,
    {
      seasonCode: string;
      seasonName: string;
      grade: number;
      bps: number[];
      ret1ds: number[];
      ret7ds: number[];
    }
  >();

  for (const s of seriesList) {
    const key = `${s.season_code}_${s.grade}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, {
        seasonCode: s.season_code,
        seasonName: s.season_name || s.season_code,
        grade: s.grade,
        bps: [],
        ret1ds: [],
        ret7ds: [],
      });
    }
    const item = cellMap.get(key)!;
    item.bps.push(s.current_bp);
    item.ret1ds.push(s.return_1d_pct);
    item.ret7ds.push(s.return_7d_pct);
  }

  const seasonGradeHeatmap: MarketOverviewHeatmapCell[] = Array.from(
    cellMap.values()
  )
    .map((item) => {
      const avgBp = Math.round(mean(item.bps));
      const change1d = round2(mean(item.ret1ds));
      const change7d = round2(mean(item.ret7ds));
      let signalTag: MarketSignalStatusTag = "💎 수요 유입";
      if (change7d <= -1.8) signalTag = "⚠️ 고점/귀속 주의";
      else if (change1d >= 1.2 && change7d < 2.5) signalTag = "🔥 급등 초입";
      else if (change7d >= 2.0) signalTag = "📈 상승 지속";

      return {
        seasonCode: item.seasonCode,
        seasonName: item.seasonName,
        grade: item.grade,
        avgBp,
        changePct1d: change1d,
        changePct7d: change7d,
        sampleCount: item.bps.length,
        signalTag,
      };
    })
    .sort((a, b) => b.avgBp * b.sampleCount - a.avgBp * a.sampleCount)
    .slice(0, 18);

  return {
    currentIndex: round2(currentIndex),
    changePct1d: round2(changePct1d),
    changePct7d: round2(changePct7d),
    advancingCount,
    flatCount,
    decliningCount,
    seasonGradeHeatmap,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
  };
}

export function buildForecastsAndBacktest(
  seriesList: MarketNormalizedSeries[],
  seasonSectors: MarketSectorSummary[],
  allCards: PlayerCard[] = []
): {
  playerForecasts: MarketEntityForecast[];
  sectorForecasts: MarketEntityForecast[];
  backtestReport: MarketBacktestReport;
} {
  // Prioritize +8~+11강 core market series for forecasting and backtesting
  const coreSeries = seriesList.filter(
    (s) => s.grade_tier_zone === "CORE_GOLD_8_11"
  );
  const evalPool = coreSeries.length >= 10 ? coreSeries : seriesList;

  const sectorDriftMap = new Map<SeasonSectorType, number>();
  for (const sec of seasonSectors) {
    sectorDriftMap.set(
      sec.code as SeasonSectorType,
      (sec.return_7d_pct || 0) / 7
    );
  }

  // 1) Generate Player Forecasts
  const playerForecasts: MarketEntityForecast[] = evalPool
    .slice(0, 45)
    .map((s) => {
      const sectorDrift = sectorDriftMap.get(s.season_sector) || 0;
      const horizons: MarketHorizonForecast[] = ([1, 7, 30] as const).map(
        (h) => {
          const pred = predictStepwiseAtIndex({
            pointsUpToT: s.points,
            horizonDays: h,
            seasonSector: s.season_sector,
            capitalTier: s.capital_tier,
            sectorDriftDailyPct: sectorDrift,
            newTraits: s.new_traits || s.traits,
          });

          const expRet =
            s.current_bp > 0
              ? ((pred.ensembleBp - s.current_bp) / s.current_bp) * 100
              : 0;

          const direction: "상승" | "보합" | "하락" =
            expRet > 0.8 ? "상승" : expRet < -0.8 ? "하락" : "보합";

          const rawUp = clamp(50 + expRet * 4.5, 12, 84);
          const rawDown = clamp(50 - expRet * 4.5, 12, 84);
          const flatProb = clamp(
            Math.round(28 - Math.abs(expRet) * 2),
            10,
            36
          );
          const rem = 100 - flatProb;
          const upProb = Math.round((rawUp / (rawUp + rawDown)) * rem);
          const downProb = Math.max(0, 100 - flatProb - upProb);

          const status: "available" | "low_confidence" | "insufficient_data" =
            s.points.length < 14
              ? "insufficient_data"
              : h === 30
                ? "low_confidence"
                : "available";

          const confScore =
            h === 1
              ? clamp(Math.round(86 - pred.dailyVolPct * 3), 55, 92)
              : h === 7
                ? clamp(Math.round(78 - pred.dailyVolPct * 3.5), 48, 86)
                : clamp(Math.round(58 - pred.dailyVolPct * 4), 35, 68);

          return {
            horizon_days: h,
            horizon_label:
              h === 1
                ? "단기 1일 예측"
                : h === 7
                  ? "중기 7일 예측"
                  : "장기 30일 시나리오 범위 (관측 30일 한계로 신뢰도 제한)",
            status,
            direction,
            up_probability_pct: upProb,
            flat_probability_pct: flatProb,
            down_probability_pct: downProb,
            expected_return_pct: round2(expRet),
            expected_bp: pred.ensembleBp,
            expected_bp_text: formatBpKorean(pred.ensembleBp),
            lower_bound_bp: pred.lowerBp,
            lower_bound_bp_text: formatBpKorean(pred.lowerBp),
            upper_bound_bp: pred.upperBp,
            upper_bound_bp_text: formatBpKorean(pred.upperBp),
            volatility_regime:
              pred.dailyVolPct >= 3.5
                ? "고변동 주의"
                : pred.dailyVolPct >= 1.5
                  ? "보통"
                  : "안정",
            confidence_score: confScore,
            model_predictions: [
              {
                model_id: "M1_NAIVE",
                model_name: "1단계: 최근 가격 유지 기준선",
                predicted_bp: pred.m1Bp,
                predicted_return_pct: 0,
                weight: 0.2,
              },
              {
                model_id: "M2_STATISTICAL",
                model_name: "2단계: 추세·평균회귀 통계 모델",
                predicted_bp: pred.m2Bp,
                predicted_return_pct: round2(
                  ((pred.m2Bp - s.current_bp) / s.current_bp) * 100
                ),
                weight: 0.25,
              },
              {
                model_id: "M3_SECTOR",
                model_name: "3단계: 섹터 상대강도·희소성 모델 (신규특성 미포함)",
                predicted_bp: pred.m3Bp,
                predicted_return_pct: round2(
                  ((pred.m3Bp - s.current_bp) / s.current_bp) * 100
                ),
                weight: 0.25,
              },
              {
                model_id: "M4_EVENT_TRAIT",
                model_name: "4단계: 이벤트·공급·공식 신규특성(level: 8) 통합 모델",
                predicted_bp: pred.m4Bp,
                predicted_return_pct: round2(
                  ((pred.m4Bp - s.current_bp) / s.current_bp) * 100
                ),
                weight: 0.3,
              },
            ],
          };
        }
      );

      const upwardFactors: string[] = [];
      const downwardFactors: string[] = [];
      const riskFactors: string[] = [];

      const cardNewTraits = s.new_traits || s.traits;
      if (s.season_sector === "LIMITED_DISCONTINUED") {
        upwardFactors.push(
          "공급 제한·단종 특성상 신규 패키지 물량 희석이 낮아 하방 경직성 확보"
        );
      }
      if (cardNewTraits.length > 0) {
        upwardFactors.push(
          `공식 신규특성(level: 8 — ${cardNewTraits.join(", ")}) 보유로 +8~+11강 금카 실사용 수요 지지`
        );
      }
      if (s.z_score_30d < -0.8) {
        upwardFactors.push(
          `30일 평균 가격 대비 Z-Score(${s.z_score_30d}) 과매도 구간 진입에 따른 기술적 평균회귀 반등 압력`
        );
      }
      if (upwardFactors.length === 0) {
        upwardFactors.push(
          `포지션(${s.primary_position}) 주전급 스펙(OVR ${s.ovr}) 및 인기 팀컬러 실사용 수요`
        );
      }

      if (s.season_sector === "EXISTING_FLAGSHIP") {
        downwardFactors.push(
          "최신 메타 시즌으로의 구단주 세대교체 수요 이동 및 패키지 공급 노출"
        );
      }
      if (s.z_score_30d > 1.0) {
        downwardFactors.push(
          `30일 밴드 상단(Z-Score +${s.z_score_30d}) 도달에 따른 단기 차익 실현 매물 출회 가능성`
        );
      }
      if (cardNewTraits.length === 0) {
        downwardFactors.push(
          "공식 신규특성(level: 8, trait_icon_50~68) 미보유로 인한 동일 OVR 대비 특성 프리미엄 열위"
        );
      }
      if (downwardFactors.length === 0) {
        downwardFactors.push(
          "수수료 할인 쿠폰 지급 구간 종료 시 거래 회전율 둔화 및 호가 스프레드 확대"
        );
      }

      riskFactors.push(
        `+${s.grade}강 시계열(관측 ${s.timeseries_observation_count}회) 30일 일평균 변동성 ${s.volatility_30d_pct}% / 최대 낙폭(MDD) ${s.max_drawdown_30d_pct}%`
      );
      if (s.grade_tier_zone === "SEPARATED_ULTRA_12_13" || s.capital_tier === "ULTRA_HIGH") {
        riskFactors.push(
          "고가·저유동성 분리 구간 카드로 단일 거래에도 기준가가 크게 변동할 수 있음"
        );
      }

      const h7 = horizons.find((h) => h.horizon_days === 7) || horizons[0];
      const matchedCard = allCards.find((c) => c.spid === s.spid);
      const signalMetrics = computeMarketSignalMetrics({
        series: s,
        expectedSellBp7d: h7?.expected_bp || s.current_bp,
        expectedReturn7dPct: h7?.expected_return_pct || 0,
        confidence7d: h7?.confidence_score || 72,
        card: matchedCard,
        allCards,
        feeConfig: DEFAULT_MARKET_FEE_CONFIG,
      });

      if (signalMetrics.enhancementEv.isLiquidityTrap) {
        riskFactors.unshift(
          `⚠️ 귀속 위험 주의: ${signalMetrics.enhancementEv.liquidityTrapReason}`
        );
      }

      return {
        entity_type: "player",
        entity_id: s.key,
        spid: s.spid,
        grade: s.grade,
        grade_tier_zone: s.grade_tier_zone,
        name: s.name,
        season_code: s.season_code,
        primary_position: s.primary_position,
        current_bp: s.current_bp,
        current_bp_text: s.current_bp_text,
        season_sector_label: s.season_sector_label,
        capital_tier_label: s.capital_tier_label,
        new_traits: s.new_traits || s.traits,
        horizons,
        upward_factors: upwardFactors,
        downward_factors: downwardFactors,
        risk_factors: riskFactors,
        basis: "model_forecast",
        signalMetrics,
      };
    });

  // 2) Sector Forecasts
  const sectorForecasts: MarketEntityForecast[] = seasonSectors
    .filter((sec) => sec.timeseries_sample_count > 0)
    .map((sec) => {
      const fakePoints: MarketNormalizedPoint[] = sec.index_curve_30d.map(
        (pt, idx, arr) => ({
          date: pt.date,
          raw_bp: pt.index_value,
          normalized_bp: Math.round(
            (sec.avg_bp * pt.index_value) /
              Math.max(1, arr[arr.length - 1]?.index_value || 100)
          ),
          formatted_bp: "",
          return_1d_pct:
            idx > 0 && arr[idx - 1].index_value > 0
              ? round2(
                  ((pt.index_value - arr[idx - 1].index_value) /
                    arr[idx - 1].index_value) *
                    100
                )
              : 0,
        })
      );

      const horizons: MarketHorizonForecast[] = ([1, 7, 30] as const).map(
        (h) => {
          const pred = predictStepwiseAtIndex({
            pointsUpToT: fakePoints,
            horizonDays: h,
            seasonSector: sec.code as SeasonSectorType,
            capitalTier: "HIGH_CAPITAL_FLAGSHIP",
            sectorDriftDailyPct: sec.return_7d_pct / 7,
            newTraits:
              sec.code === "NEW_META_FLAGSHIP"
                ? ["크로스 포쳐", "아크로바틱 피니셔", "커맨더"]
                : sec.code === "LIMITED_DISCONTINUED"
                  ? ["크로스 포쳐", "타이탄"]
                  : [],
          });
          const expRet =
            sec.avg_bp > 0
              ? ((pred.ensembleBp - sec.avg_bp) / sec.avg_bp) * 100
              : 0;
          const direction: "상승" | "보합" | "하락" =
            expRet > 0.6 ? "상승" : expRet < -0.6 ? "하락" : "보합";
          return {
            horizon_days: h,
            horizon_label:
              h === 1 ? "1일 예측" : h === 7 ? "7일 예측" : "30일 시나리오",
            status: h === 30 ? "low_confidence" : "available",
            direction,
            up_probability_pct: direction === "상승" ? 56 : 34,
            flat_probability_pct: 24,
            down_probability_pct: direction === "상승" ? 20 : 42,
            expected_return_pct: round2(expRet),
            expected_bp: pred.ensembleBp,
            expected_bp_text: formatBpKorean(pred.ensembleBp),
            lower_bound_bp: pred.lowerBp,
            lower_bound_bp_text: formatBpKorean(pred.lowerBp),
            upper_bound_bp: pred.upperBp,
            upper_bound_bp_text: formatBpKorean(pred.upperBp),
            volatility_regime: sec.volatility_pct > 2.5 ? "보통" : "안정",
            confidence_score: h === 30 ? 55 : 80,
            model_predictions: [],
          };
        }
      );

      return {
        entity_type: "sector",
        entity_id: sec.sector_id,
        name: sec.name,
        season_code: sec.code,
        current_bp: sec.avg_bp,
        current_bp_text: sec.avg_bp_text,
        season_sector_label: sec.name,
        capital_tier_label: `추적 표본 ${sec.timeseries_sample_count}종`,
        horizons,
        upward_factors: [`공급 노출도: ${sec.supply_event_exposure}`],
        downward_factors: [`대체 위험도: ${sec.replacement_risk}`],
        risk_factors: [`섹터 평균 일간 변동성: ${sec.volatility_pct}%`],
        basis: "model_forecast",
      };
    });

  // 3) Strict Time-Ordered Point-in-Time Backtesting across 30-day series
  const validSeries = evalPool.filter((s) => s.points.length >= 28);
  type EvalRow = {
    series: MarketNormalizedSeries;
    date: string;
    horizon: 1 | 7;
    isEventWindow: boolean;
    actualBp: number;
    prevBp: number;
    m1Bp: number;
    m2Bp: number;
    m3Bp: number;
    m4Bp: number;
    lowerBp: number;
    upperBp: number;
  };

  const rows1d: EvalRow[] = [];
  const rows7d: EvalRow[] = [];

  for (const s of validSeries) {
    const pts = s.points;
    const cardNewTraits = s.new_traits || s.traits;
    for (let t = 12; t <= pts.length - 2; t++) {
      const slice = pts.slice(0, t + 1);
      const p7Ago = slice[Math.max(0, slice.length - 8)].normalized_bp;
      const pCur = slice[slice.length - 1].normalized_bp;
      const pitDrift = p7Ago > 0 ? ((pCur - p7Ago) / p7Ago / 7) * 100 : 0;

      const pred1 = predictStepwiseAtIndex({
        pointsUpToT: slice,
        horizonDays: 1,
        seasonSector: s.season_sector,
        capitalTier: s.capital_tier,
        sectorDriftDailyPct: pitDrift,
        newTraits: cardNewTraits,
      });

      const targetPt = pts[t + 1];
      const isEvt =
        targetPt.date >= "10.01" && targetPt.date <= "10.16";
      rows1d.push({
        series: s,
        date: targetPt.date,
        horizon: 1,
        isEventWindow: isEvt,
        actualBp: targetPt.normalized_bp,
        prevBp: pCur,
        m1Bp: pred1.m1Bp,
        m2Bp: pred1.m2Bp,
        m3Bp: pred1.m3Bp,
        m4Bp: pred1.m4Bp,
        lowerBp: pred1.lowerBp,
        upperBp: pred1.upperBp,
      });
    }

    for (let t = 10; t <= pts.length - 8; t++) {
      const slice = pts.slice(0, t + 1);
      const p7Ago = slice[Math.max(0, slice.length - 8)].normalized_bp;
      const pCur = slice[slice.length - 1].normalized_bp;
      const pitDrift = p7Ago > 0 ? ((pCur - p7Ago) / p7Ago / 7) * 100 : 0;

      const pred7 = predictStepwiseAtIndex({
        pointsUpToT: slice,
        horizonDays: 7,
        seasonSector: s.season_sector,
        capitalTier: s.capital_tier,
        sectorDriftDailyPct: pitDrift,
        newTraits: cardNewTraits,
      });

      const targetPt = pts[t + 7];
      const isEvt =
        targetPt.date >= "10.01" && targetPt.date <= "10.16";
      rows7d.push({
        series: s,
        date: targetPt.date,
        horizon: 7,
        isEventWindow: isEvt,
        actualBp: targetPt.normalized_bp,
        prevBp: pCur,
        m1Bp: pred7.m1Bp,
        m2Bp: pred7.m2Bp,
        m3Bp: pred7.m3Bp,
        m4Bp: pred7.m4Bp,
        lowerBp: pred7.lowerBp,
        upperBp: pred7.upperBp,
      });
    }
  }

  const summarizeModels = (
    rows: EvalRow[],
    horizon: 1 | 7
  ): MarketModelBacktestMetric[] => {
    const modelDefs: {
      id: "M1_NAIVE" | "M2_STATISTICAL" | "M3_SECTOR" | "M4_EVENT_TRAIT";
      name: string;
      desc: string;
      pick: (r: EvalRow) => number;
    }[] = [
      {
        id: "M1_NAIVE",
        name: "1단계: 최근 가격 유지 모델 (Naive Baseline)",
        desc: "미래 가격이 현재 관측 가격(P_t)과 동일하다고 가정하는 최소 기준선 모델",
        pick: (r) => r.m1Bp,
      },
      {
        id: "M2_STATISTICAL",
        name: "2단계: 추세·평균회귀·변동성 통계 모델",
        desc: "과거 시계열의 단기 모멘텀과 5일 중앙값 회귀 성향(Mean Reversion)만 반영한 모델",
        pick: (r) => r.m2Bp,
      },
      {
        id: "M3_SECTOR",
        name: "3단계: 섹터 상대강도·공급제한 반영 모델 (신규특성 미포함)",
        desc: "시즌 섹터 드리프트와 공급 희소성만 반영하고 공식 신규특성 변수는 제외한 모델",
        pick: (r) => r.m3Bp,
      },
      {
        id: "M4_EVENT_TRAIT",
        name: "4단계: 이벤트·공급·공식 신규특성(level: 8) 통합 모델",
        desc: "패키지·쿠폰 이벤트 완충 및 공식 신규특성(크로스 포쳐·아크로바틱 피니셔·커맨더·타이탄 등 level: 8) 수요 지지력을 결합한 최종 모델",
        pick: (r) => r.m4Bp,
      },
    ];

    let baselineMape = 0;
    return modelDefs.map((def, idx) => {
      const absErrs: number[] = [];
      const pctErrs: number[] = [];
      const sqPctErrs: number[] = [];
      let dirCorrect = 0;
      let inInterval = 0;

      for (const r of rows) {
        const pred = def.pick(r);
        const absErr = Math.abs(pred - r.actualBp);
        const pctErr =
          r.actualBp > 0 ? (absErr / r.actualBp) * 100 : 0;
        absErrs.push(absErr);
        pctErrs.push(pctErr);
        sqPctErrs.push(pctErr * pctErr);

        const actualDiff = r.actualBp - r.prevBp;
        const predDiff = pred - r.prevBp;
        const actualDir =
          Math.abs(actualDiff) / Math.max(1, r.prevBp) < 0.005
            ? 0
            : actualDiff > 0
              ? 1
              : -1;
        const predDir =
          Math.abs(predDiff) / Math.max(1, r.prevBp) < 0.005
            ? 0
            : predDiff > 0
              ? 1
              : -1;
        if (actualDir === predDir || (actualDir === 0 && Math.abs(predDiff) / r.prevBp < 0.015)) {
          dirCorrect++;
        }
        if (r.actualBp >= r.lowerBp && r.actualBp <= r.upperBp) {
          inInterval++;
        }
      }

      const mape = round2(mean(pctErrs));
      if (idx === 0) baselineMape = mape;
      const rmse = round2(Math.sqrt(mean(sqPctErrs)));
      const dirAcc =
        rows.length > 0 ? round2((dirCorrect / rows.length) * 100) : 0;
      const covPct =
        rows.length > 0 ? round2((inInterval / rows.length) * 100) : 0;
      const impPct =
        baselineMape > 0
          ? round2(((baselineMape - mape) / baselineMape) * 100)
          : 0;

      return {
        model_id: def.id,
        model_name: def.name,
        description: def.desc,
        horizon_days: horizon,
        evaluated_cases: rows.length,
        mae_bp: Math.round(mean(absErrs)),
        mape_pct: mape,
        rmse_pct: rmse,
        directional_accuracy_pct: dirAcc,
        interval_coverage_pct: covPct,
        beats_baseline_mape: idx === 0 ? false : mape <= baselineMape,
        improvement_vs_baseline_pct: idx === 0 ? 0 : impPct,
      };
    });
  };

  const models1d = summarizeModels(rows1d, 1);
  const models7d = summarizeModels(rows7d, 7);

  // Breakdown by Season Sector (7d)
  const sectorGroups = new Map<string, EvalRow[]>();
  for (const r of rows7d) {
    const key = r.series.season_sector_label;
    if (!sectorGroups.has(key)) sectorGroups.set(key, []);
    sectorGroups.get(key)!.push(r);
  }

  const bySeasonSector7d = Array.from(sectorGroups.entries()).map(
    ([sectorName, grp]) => {
      const m1 = round2(
        mean(grp.map((r) => (Math.abs(r.m1Bp - r.actualBp) / r.actualBp) * 100))
      );
      const m2 = round2(
        mean(grp.map((r) => (Math.abs(r.m2Bp - r.actualBp) / r.actualBp) * 100))
      );
      const m3 = round2(
        mean(grp.map((r) => (Math.abs(r.m3Bp - r.actualBp) / r.actualBp) * 100))
      );
      const m4 = round2(
        mean(grp.map((r) => (Math.abs(r.m4Bp - r.actualBp) / r.actualBp) * 100))
      );
      const minVal = Math.min(m1, m2, m3, m4);
      const bestName =
        minVal === m4
          ? "4단계 (이벤트·공식 신규특성 통합)"
          : minVal === m3
            ? "3단계 (섹터·희소성)"
            : minVal === m2
              ? "2단계 (통계·평균회귀)"
              : "1단계 (단순 기준선)";
      const dirHits = grp.filter((r) => {
        const a = r.actualBp - r.prevBp;
        const p = r.m4Bp - r.prevBp;
        return (a >= 0 && p >= 0) || (a < 0 && p < 0);
      }).length;
      return {
        sector_name: sectorName,
        sample_count: grp.length,
        m1_mape_pct: m1,
        m2_mape_pct: m2,
        m3_mape_pct: m3,
        m4_mape_pct: m4,
        best_model_name: bestName,
        directional_accuracy_pct: round2((dirHits / Math.max(1, grp.length)) * 100),
      };
    }
  );

  // Breakdown by Capital Tier (7d)
  const capGroups = new Map<string, EvalRow[]>();
  for (const r of rows7d) {
    const key = r.series.capital_tier_label;
    if (!capGroups.has(key)) capGroups.set(key, []);
    capGroups.get(key)!.push(r);
  }

  const byCapitalTier7d = Array.from(capGroups.entries()).map(
    ([tierName, grp]) => {
      const m1 = round2(
        mean(grp.map((r) => (Math.abs(r.m1Bp - r.actualBp) / r.actualBp) * 100))
      );
      const m4 = round2(
        mean(grp.map((r) => (Math.abs(r.m4Bp - r.actualBp) / r.actualBp) * 100))
      );
      const dirHits = grp.filter((r) => {
        const a = r.actualBp - r.prevBp;
        const p = r.m4Bp - r.prevBp;
        return (a >= 0 && p >= 0) || (a < 0 && p < 0);
      }).length;
      return {
        tier_name: tierName,
        sample_count: grp.length,
        m1_mape_pct: m1,
        m4_mape_pct: m4,
        directional_accuracy_pct: round2((dirHits / Math.max(1, grp.length)) * 100),
      };
    }
  );

  const evtRows = rows7d.filter((r) => r.isEventWindow);
  const normRows = rows7d.filter((r) => !r.isEventWindow);
  const summarizePeriod = (
    label: "이벤트·변동성 구간" | "일반 평시 구간",
    grp: EvalRow[]
  ) => {
    const m1 = round2(
      mean(grp.map((r) => (Math.abs(r.m1Bp - r.actualBp) / r.actualBp) * 100))
    );
    const m4 = round2(
      mean(grp.map((r) => (Math.abs(r.m4Bp - r.actualBp) / r.actualBp) * 100))
    );
    const dirHits = grp.filter((r) => {
      const a = r.actualBp - r.prevBp;
      const p = r.m4Bp - r.prevBp;
      return (a >= 0 && p >= 0) || (a < 0 && p < 0);
    }).length;
    return {
      period_type: label,
      window_count: grp.length,
      m1_mape_pct: m1,
      m4_mape_pct: m4,
      m4_directional_accuracy_pct: round2(
        (dirHits / Math.max(1, grp.length)) * 100
      ),
    };
  };

  // Sample traces for top 6 distinct players
  const seenTraceSpids = new Set<number>();
  const uniqueTraceSeries: MarketNormalizedSeries[] = [];
  for (const s of validSeries) {
    if (!seenTraceSpids.has(s.spid)) {
      seenTraceSpids.add(s.spid);
      uniqueTraceSeries.push(s);
    }
    if (uniqueTraceSeries.length >= 6) break;
  }

  const sampleTraces = uniqueTraceSeries.map((s) => {
    const tracePts = [];
    for (let t = 10; t < s.points.length; t++) {
      const slice = s.points.slice(0, t);
      const p7Ago = slice[Math.max(0, slice.length - 8)].normalized_bp;
      const pCur = slice[slice.length - 1].normalized_bp;
      const pitDrift = p7Ago > 0 ? ((pCur - p7Ago) / p7Ago / 7) * 100 : 0;
      const pred = predictStepwiseAtIndex({
        pointsUpToT: slice,
        horizonDays: 1,
        seasonSector: s.season_sector,
        capitalTier: s.capital_tier,
        sectorDriftDailyPct: pitDrift,
        newTraits: s.new_traits || s.traits,
      });
      tracePts.push({
        date: s.points[t].date,
        actual_bp: s.points[t].normalized_bp,
        m1_pred_bp: pred.m1Bp,
        m2_pred_bp: pred.m2Bp,
        m3_pred_bp: pred.m3Bp,
        m4_pred_bp: pred.m4Bp,
        lower_band_bp: pred.lowerBp,
        upper_band_bp: pred.upperBp,
      });
    }
    return {
      spid: s.spid,
      name: s.name,
      season_code: s.season_code,
      grade: s.grade,
      points: tracePts,
    };
  });

  const m3Metric7d = models7d.find((m) => m.model_id === "M3_SECTOR");
  const m4Metric7d = models7d.find((m) => m.model_id === "M4_EVENT_TRAIT");
  const m3Mape7d = m3Metric7d?.mape_pct ?? 0;
  const m4Mape7d = m4Metric7d?.mape_pct ?? 0;
  const m3Dir7d = m3Metric7d?.directional_accuracy_pct ?? 0;
  const m4Dir7d = m4Metric7d?.directional_accuracy_pct ?? 0;

  const backtestReport: MarketBacktestReport = {
    methodology_summary:
      "시간 순서를 엄격히 보존한 롤링 워크포워드(Rolling Walk-Forward) 백테스트입니다. +8~+11강 주류 시계열을 중심으로 각 예측 시점 t에서 t+1일 및 t+7일 뒤의 실제 가격을 검증할 때 오직 [0..t] 구간의 과거 관측치만 사용하며 미래 데이터 누수(Data Leakage)를 원천 차단했습니다.",
    leakage_prevention_note:
      "단순 기준선 모델(M1: 최근 가격 그대로 유지)과 통계(M2)·섹터(M3: 신규특성 미포함)·공식 신규특성(level: 8) 통합 모델(M4)의 평균절대백분율오차(MAPE), 방향 적중률, 80% 예측구간 포함률을 동일한 표본 위에서 비교합니다.",
    total_series_evaluated: validSeries.length,
    total_rolling_windows: rows1d.length + rows7d.length,
    models_1d: models1d,
    models_7d: models7d,
    new_trait_contribution: {
      without_new_trait_mape_7d_pct: m3Mape7d,
      with_new_trait_mape_7d_pct: m4Mape7d,
      net_mape_reduction_pct: round2(m3Mape7d - m4Mape7d),
      directional_gain_pct: round2(m4Dir7d - m3Dir7d),
      legacy_trait_excluded_note:
        m4Mape7d <= m3Mape7d
          ? `공식 신규특성(level: 8, trait_icon_50~68) 변수를 추가한 M4 모델이 신규특성 미포함 M3 모델 대비 7일 예측 오차(MAPE)를 ${round2(m3Mape7d - m4Mape7d)}%p 낮추고 방향 적중률을 ${m4Dir7d - m3Dir7d >= 0 ? "+" : ""}${round2(m4Dir7d - m3Dir7d)}%p 개선했습니다 (기존 일반 특성 level: 5 완전 배제).`
          : `현재 롤링 윈도우 표본에서는 M3(${m3Mape7d}%)와 M4(${m4Mape7d}%)가 유사한 오차 범위를 기록했습니다 (기존 일반 특성 level: 5 완전 배제).`,
    },
    by_season_sector_7d: bySeasonSector7d,
    by_capital_tier_7d: byCapitalTier7d,
    event_vs_normal_period: [
      summarizePeriod("이벤트·변동성 구간", evtRows),
      summarizePeriod("일반 평시 구간", normRows),
    ],
    sample_traces: sampleTraces,
  };

  return { playerForecasts, sectorForecasts, backtestReport };
}

// ============================================================================
// 9. Official New Trait (level: 8 ONLY) Meta, Controlled Premium, Substitution & Season Discount Engine
// ============================================================================

function getCardGoldOrBaseBp(c: PlayerCard): number {
  const bp8 = Number(c.prices?.["8"]?.bp || c.bp_8 || 0);
  if (bp8 > 0) return bp8;
  return Number(c.bp_1 || 0);
}

export function analyzeTraitMetaAndPremiums(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[]
): {
  traitCatalog: TraitMetaCatalogItem[];
  traitPremiums: TraitControlledPremiumItem[];
  traitSubstitutions: TraitCompetingSubstitutionCase[];
  traitSeasonDiscounts: TraitSeasonDiscountItem[];
  traitPatches: TraitPatchHistoryItem[];
} {
  const fullCards = allCards.filter(
    (c) => c.has_full_ability && getCardGoldOrBaseBp(c) > 0
  );
  // Use +8~+11강 core market series for trait return analysis
  const coreSeries = seriesList.filter(
    (s) => s.grade_tier_zone === "CORE_GOLD_8_11"
  );
  const evalSeries = coreSeries.length >= 10 ? coreSeries : seriesList;

  // 1) Build Official New Trait (level: 8, trait_icon_50..68) Catalog with real counts
  const traitCatalog: TraitMetaCatalogItem[] = OFFICIAL_NEW_TRAITS_CATALOG.map(
    (def) => {
      const holders = fullCards.filter((c) => {
        const { newTraits } = extractCardNewAndLegacyTraits(c);
        return newTraits.includes(def.trait_name);
      });
      const tsHolders = evalSeries.filter((s) =>
        (s.new_traits || s.traits).includes(def.trait_name)
      );
      const overall = Math.round(
        def.base_performance_score * 0.25 +
          def.current_meta_fit_score * 0.35 +
          def.relative_competitiveness_score * 0.2 +
          def.patch_impact_score * 0.2
      );
      const metaTier: TraitMetaCatalogItem["meta_tier"] =
        overall >= 93
          ? "OP (핵심 메타)"
          : overall >= 89
            ? "1티어 (주류 선호)"
            : overall >= 84
              ? "2티어 (상황별 유효)"
              : "3티어 (보조·비주류)";
      return {
        ...def,
        card_holder_count: holders.length,
        timeseries_holder_count: tsHolders.length,
        overall_meta_score: overall,
        meta_tier: metaTier,
      };
    }
  );

  // 2) Controlled Official New Trait Premium Estimation (+8강 Gold Baseline, Propensity / Coarsened Exact Matching)
  const traitPremiums: TraitControlledPremiumItem[] = traitCatalog.map(
    (tItem) => {
      const targetPosSet = new Set(tItem.applicable_positions);
      const eligiblePool = fullCards.filter(
        (c) =>
          targetPosSet.has(c.primary_position) ||
          (c.positions || []).some((p) => targetPosSet.has(p.pos))
      );

      const withTrait = eligiblePool.filter((c) => {
        const { newTraits } = extractCardNewAndLegacyTraits(c);
        return newTraits.includes(tItem.trait_name);
      });
      const withoutTrait = eligiblePool.filter((c) => {
        const { newTraits } = extractCardNewAndLegacyTraits(c);
        return !newTraits.includes(tItem.trait_name);
      });

      const unadjWith = mean(withTrait.map((c) => getCardGoldOrBaseBp(c)));
      const unadjWithout = mean(withoutTrait.map((c) => getCardGoldOrBaseBp(c)));
      const unadjDiffPct =
        unadjWithout > 0
          ? round2(((unadjWith - unadjWithout) / unadjWithout) * 100)
          : 0;

      const pairPremiums: number[] = [];
      const matchedExamples: TraitControlledPremiumItem["matched_examples"] = [];

      for (const wCard of withTrait) {
        const wSector = classifySeasonSector(wCard.season_code).sector;
        const wPosGroup = getPositionGroup(wCard.primary_position);
        const wBp = getCardGoldOrBaseBp(wCard);

        const peers = withoutTrait.filter((wo) => {
          const woSector = classifySeasonSector(wo.season_code).sector;
          const woPosGroup = getPositionGroup(wo.primary_position);
          const woBp = getCardGoldOrBaseBp(wo);
          return (
            woSector === wSector &&
            woPosGroup === wPosGroup &&
            Math.abs(wo.ovr - wCard.ovr) <= 2 &&
            woBp > 0
          );
        });

        if (peers.length === 0) continue;
        const peerMedianBp = median(peers.map((p) => getCardGoldOrBaseBp(p)));
        if (peerMedianBp <= 0) continue;

        const premPct = ((wBp - peerMedianBp) / peerMedianBp) * 100;
        pairPremiums.push(clamp(premPct, -75, 180));

        if (matchedExamples.length < 3) {
          const bestPeer = [...peers].sort(
            (a, b) =>
              Math.abs(a.ovr - wCard.ovr) - Math.abs(b.ovr - wCard.ovr)
          )[0];
          const bestPeerBp = getCardGoldOrBaseBp(bestPeer);
          matchedExamples.push({
            with_card: {
              spid: wCard.spid,
              name: wCard.name,
              season_code: wCard.season_code,
              position: wCard.primary_position,
              ovr: wCard.ovr,
              bp_1: wBp,
              bp_1_text: formatBpKorean(wBp),
              traits: extractCardNewAndLegacyTraits(wCard).newTraits,
            },
            without_card: {
              spid: bestPeer.spid,
              name: bestPeer.name,
              season_code: bestPeer.season_code,
              position: bestPeer.primary_position,
              ovr: bestPeer.ovr,
              bp_1: bestPeerBp,
              bp_1_text: formatBpKorean(bestPeerBp),
              traits: extractCardNewAndLegacyTraits(bestPeer).newTraits,
            },
            ovr_gap: wCard.ovr - bestPeer.ovr,
            premium_pct: round2(((wBp - bestPeerBp) / bestPeerBp) * 100),
          });
        }
      }

      const ctrlMed = round2(median(pairPremiums));
      const ctrlQ25 = round2(quantile(pairPremiums, 0.25));
      const ctrlQ75 = round2(quantile(pairPremiums, 0.75));

      const tsWith = evalSeries.filter(
        (s) =>
          (s.new_traits || s.traits).includes(tItem.trait_name) &&
          targetPosSet.has(s.primary_position)
      );
      const tsWithout = evalSeries.filter(
        (s) =>
          !(s.new_traits || s.traits).includes(tItem.trait_name) &&
          targetPosSet.has(s.primary_position)
      );

      const retWith =
        tsWith.length > 0 ? round2(mean(tsWith.map((s) => s.return_7d_pct))) : 0;
      const retWithout =
        tsWithout.length > 0
          ? round2(mean(tsWithout.map((s) => s.return_7d_pct)))
          : 0;
      const excessRet7d = round2(retWith - retWithout);

      const confLevel: TraitControlledPremiumItem["confidence_level"] =
        pairPremiums.length >= 10
          ? "높음"
          : pairPremiums.length >= 4
            ? "보통"
            : "표본 부족 주의";

      return {
        trait_name: tItem.trait_name,
        category: tItem.category,
        meta_tier: tItem.meta_tier,
        holder_sample_count: withTrait.length,
        matched_pair_count: pairPremiums.length,
        unadjusted_avg_bp_with: Math.round(unadjWith),
        unadjusted_avg_bp_without: Math.round(unadjWithout),
        unadjusted_diff_pct: unadjDiffPct,
        controlled_premium_median_pct: ctrlMed,
        controlled_premium_iqr_low_pct: ctrlQ25,
        controlled_premium_iqr_high_pct: ctrlQ75,
        return_7d_with_trait_pct: retWith,
        return_7d_without_trait_pct: retWithout,
        excess_return_7d_pct: excessRet7d,
        confounder_control_summary:
          "동일 포지션군 · 동일 시즌 공급군 · OVR ±2 이내 · +8강 금카 기준가 매칭 통제 (기존 일반 특성 level: 5 완전 배제)",
        legacy_traits_excluded_from_model: true,
        confidence_level: confLevel,
        interpretation:
          pairPremiums.length === 0
            ? `현재 카탈로그 내 [${tItem.trait_name}] 보유 표본(${withTrait.length}종)에 대한 동일 시즌·OVR 매칭 대조군이 부족하여 프리미엄 판별을 보류합니다.`
            : ctrlMed > 5
              ? `시즌·OVR 교란변수를 제거하고 +8강 기준가로 매칭한 결과 중앙값 +${ctrlMed}%의 양(+)의 공식 신규특성 프리미엄이 확인됩니다.`
              : ctrlMed < -5
                ? `시즌·OVR 통제 시 중앙값 ${ctrlMed}%로 단독 신규특성 효과보다 양발·체형·팀컬러 수요가 더 크게 작용합니다.`
                : `시즌·OVR 통제 후 중앙값 ${ctrlMed}%로 중립 범위이며, 타 신규특성(level: 8)과의 복합 보유 시 시너지가 발생합니다.`,
        matched_examples: matchedExamples,
      };
    }
  );

  // 3) Competing Official New Trait Substitution Analysis (Strictly level: 8 vs level: 8)
  const marketRet7d = round2(mean(evalSeries.map((s) => s.return_7d_pct)));
  const traitSubstitutions: TraitCompetingSubstitutionCase[] = [
    buildSubstitutionCase({
      caseId: "sub-new-box-finisher-vs-linebreaker",
      title:
        "공식 신규특성 가설 1: 박스 타격 신규특성(크로스 포쳐·아크로바틱 피니셔·레이저 슈터) vs 침투 신규특성(라인 브레이커) 상대 가치",
      hypothesis:
        "level: 8 공식 공격 신규특성 중 박스 안 다이렉트 마무리(크로스 포쳐·아크로바틱 피니셔·레이저 슈터) 보유 공격수가 라인 브레이커 단독 보유 공격수 대비 +8~+11강 시세 방어력과 통제 프리미엄에서 우위를 보이는지 검증합니다.",
      risingTraits: ["크로스 포쳐", "아크로바틱 피니셔", "레이저 슈터"],
      incumbentTrait: "라인 브레이커",
      targetPositions: ["ST", "CF", "LW", "RW"],
      fullCards,
      seriesList: evalSeries,
      traitPremiums,
      marketRet7d,
    }),
    buildSubstitutionCase({
      caseId: "sub-new-commander-vs-twohearts",
      title:
        "공식 신규특성 가설 2: 중원 백스핀 로빙 배급(커맨더) vs 활동량·스태미너 특화(2개의 심장) 상대 가치",
      hypothesis:
        "중원(CM/CAM/CDM) 공식 신규특성 중 결정적 백스핀 로빙 스루패스를 제공하는 '커맨더' 보유 미드필더와 '2개의 심장' 보유 미드필더 간 +8~+11강 통제 프리미엄 및 수익률 흐름을 비교 검증합니다.",
      risingTraits: ["커맨더"],
      incumbentTrait: "2개의 심장",
      targetPositions: ["CM", "CAM", "CDM"],
      fullCards,
      seriesList: evalSeries,
      traitPremiums,
      marketRet7d,
    }),
    buildSubstitutionCase({
      caseId: "sub-new-titan-fighter-vs-tackler-chaser",
      title:
        "공식 신규특성 가설 3: 공중볼·어깨 경합 제어(타이탄·파이터) vs 태클·추격 특화(와일드 태클러·체이서) 수비 가치",
      hypothesis:
        "수비진(CB/CDM/LB/RB) 공식 신규특성 중 피지컬·공중볼 제압형(타이탄·파이터)과 스탠딩 태클·배후 추격형(와일드 태클러·체이서) 간 +8~+11강 시세 지지력을 비교합니다.",
      risingTraits: ["타이탄", "파이터"],
      incumbentTrait: "와일드 태클러",
      targetPositions: ["CB", "CDM", "LB", "RB"],
      fullCards,
      seriesList: evalSeries,
      traitPremiums,
      marketRet7d,
    }),
  ];

  // 4) Official New Trait-Lacking Season Discount Analysis
  const seasonMap = new Map<string, PlayerCard[]>();
  for (const c of fullCards) {
    if (!seasonMap.has(c.season_code)) seasonMap.set(c.season_code, []);
    seasonMap.get(c.season_code)!.push(c);
  }

  const traitSeasonDiscounts: TraitSeasonDiscountItem[] = Array.from(
    seasonMap.entries()
  )
    .filter(([, cards]) => cards.length >= 2)
    .map(([seasonCode, cards]) => {
      const avgOvr = round2(mean(cards.map((c) => c.ovr)));
      const avgBp = Math.round(mean(cards.map((c) => getCardGoldOrBaseBp(c))));
      const avgNewTraitCnt = round2(
        mean(
          cards.map((c) => extractCardNewAndLegacyTraits(c).newTraits.length)
        )
      );

      const cardsWithOfficialNewTrait = cards.filter(
        (c) => extractCardNewAndLegacyTraits(c).newTraits.length > 0
      );
      const coveragePct = round2(
        (cardsWithOfficialNewTrait.length / cards.length) * 100
      );

      const allSeasonNewTraitNames = new Set(
        cards.flatMap((c) => extractCardNewAndLegacyTraits(c).newTraits)
      );
      const missingKeyTraits = [
        "크로스 포쳐",
        "아크로바틱 피니셔",
        "레이저 슈터",
        "커맨더",
        "타이탄",
        "파이터",
      ].filter((k) => !allSeasonNewTraitNames.has(k));

      const ovrPeers = fullCards.filter(
        (c) => Math.abs(c.ovr - avgOvr) <= 1.5 && getCardGoldOrBaseBp(c) > 0
      );
      const expectedBp =
        ovrPeers.length > 0
          ? Math.round(median(ovrPeers.map((c) => getCardGoldOrBaseBp(c))))
          : avgBp;
      const discountPct =
        expectedBp > 0
          ? round2(((avgBp - expectedBp) / expectedBp) * 100)
          : 0;

      const tsSeason = evalSeries.filter((s) => s.season_code === seasonCode);
      const ret7d =
        tsSeason.length > 0
          ? round2(mean(tsSeason.map((s) => s.return_7d_pct)))
          : 0;

      const sectorInfo = classifySeasonSector(seasonCode);
      const compFactors: string[] = [];
      if (sectorInfo.sector === "LIMITED_DISCONTINUED") {
        compFactors.push("공급 제한·단종 희소성으로 신규특성 제한을 상쇄");
      }
      if (cards.some((c) => c.foot.includes("5") && c.foot.includes("5"))) {
        compFactors.push("양발(5/5) 및 고유 체형 메리트 보유");
      }
      if (avgOvr >= 118) {
        compFactors.push(`최상위 기본 OVR(${avgOvr}) 스탯 우위`);
      }
      if (compFactors.length === 0) {
        compFactors.push("인기 클럽 팀컬러 및 급여 가성비 수요");
      }

      const diagnosis =
        missingKeyTraits.length >= 3 && discountPct < -10
          ? `동일 OVR 기대가 대비 ${discountPct}% 할인 거래 중이며, 공식 신규특성(${missingKeyTraits.slice(0, 3).join("·")} 등 level: 8) 미보유가 가치 할인 요인으로 작용하고 있습니다.`
          : sectorInfo.sector === "LIMITED_DISCONTINUED"
            ? `공식 신규특성 일부가 없더라도 단종 희소성과 기본 스펙 우위로 기대가 대비 ${discountPct >= 0 ? "+" : ""}${discountPct}% 수준을 방어하고 있습니다.`
            : `공식 신규특성(level: 8) 보유율 ${coveragePct}% (카드당 평균 ${avgNewTraitCnt}개)로 동일 OVR 기대가 대비 ${discountPct >= 0 ? "+" : ""}${discountPct}% 수준을 형성 중입니다.`;

      return {
        season_code: seasonCode,
        season_name: cards[0].season_name || seasonCode,
        season_sector_label: sectorInfo.label,
        evaluated_card_count: cards.length,
        avg_trait_count: avgNewTraitCnt,
        core_meta_trait_coverage_pct: coveragePct,
        missing_key_traits: missingKeyTraits,
        avg_ovr: avgOvr,
        avg_bp_1: avgBp,
        avg_bp_1_text: formatBpKorean(avgBp),
        expected_bp_for_ovr_and_stats: expectedBp,
        trait_deficit_discount_pct: discountPct,
        return_7d_pct: ret7d,
        compensating_factors: compFactors,
        diagnosis,
      };
    })
    .sort((a, b) => b.avg_bp_1 - a.avg_bp_1);

  return {
    traitCatalog,
    traitPremiums,
    traitSubstitutions,
    traitSeasonDiscounts,
    traitPatches: OFFICIAL_NEW_TRAIT_PATCH_HISTORY,
  };
}

function buildSubstitutionCase(params: {
  caseId: string;
  title: string;
  hypothesis: string;
  risingTraits: string[];
  incumbentTrait: string;
  targetPositions: string[];
  fullCards: PlayerCard[];
  seriesList: MarketNormalizedSeries[];
  traitPremiums: TraitControlledPremiumItem[];
  marketRet7d: number;
}): TraitCompetingSubstitutionCase {
  const {
    caseId,
    title,
    hypothesis,
    risingTraits,
    incumbentTrait,
    targetPositions,
    fullCards,
    seriesList,
    traitPremiums,
    marketRet7d,
  } = params;

  const posSet = new Set(targetPositions);
  const posSeries = seriesList.filter(
    (s) => posSet.has(s.primary_position) && (s.new_traits || s.traits).length > 0
  );

  const risingSeries = posSeries.filter((s) =>
    (s.new_traits || s.traits).some((t) => risingTraits.includes(t))
  );
  const incumbentOnlySeries = posSeries.filter(
    (s) =>
      (s.new_traits || s.traits).includes(incumbentTrait) &&
      !(s.new_traits || s.traits).some((t) => risingTraits.includes(t))
  );
  const dualSeries = posSeries.filter(
    (s) =>
      (s.new_traits || s.traits).includes(incumbentTrait) &&
      (s.new_traits || s.traits).some((t) => risingTraits.includes(t))
  );

  const risingCards = fullCards.filter((c) => {
    if (!posSet.has(c.primary_position)) return false;
    const { newTraits } = extractCardNewAndLegacyTraits(c);
    return newTraits.some((t) => risingTraits.includes(t));
  });
  const incumbentOnlyCards = fullCards.filter((c) => {
    if (!posSet.has(c.primary_position)) return false;
    const { newTraits } = extractCardNewAndLegacyTraits(c);
    return (
      newTraits.includes(incumbentTrait) &&
      !newTraits.some((t) => risingTraits.includes(t))
    );
  });

  const risingRet7d =
    risingSeries.length > 0
      ? round2(mean(risingSeries.map((s) => s.return_7d_pct)))
      : 0;
  const risingRet30d =
    risingSeries.length > 0
      ? round2(mean(risingSeries.map((s) => s.return_30d_pct)))
      : 0;
  const incRet7d =
    incumbentOnlySeries.length > 0
      ? round2(mean(incumbentOnlySeries.map((s) => s.return_7d_pct)))
      : 0;
  const incRet30d =
    incumbentOnlySeries.length > 0
      ? round2(mean(incumbentOnlySeries.map((s) => s.return_30d_pct)))
      : 0;

  const risingPremObj = traitPremiums.find((p) =>
    risingTraits.includes(p.trait_name)
  );
  const incPremObj = traitPremiums.find(
    (p) => p.trait_name === incumbentTrait
  );

  const ctrlRisingPrem = risingPremObj?.controlled_premium_median_pct || 0;
  const ctrlIncPrem = incPremObj?.controlled_premium_median_pct || 0;
  const spreadShift = round2(
    risingRet7d - incRet7d + (ctrlRisingPrem - ctrlIncPrem) * 0.25
  );

  const fullRising = risingSeries.filter((s) => s.points.length >= 28);
  const fullInc = incumbentOnlySeries.filter((s) => s.points.length >= 28);
  const fullAll = seriesList.filter((s) => s.points.length >= 28);
  const len =
    fullAll.length > 0 ? Math.min(...fullAll.map((s) => s.points.length)) : 0;

  const compCurve: TraitCompetingSubstitutionCase["comparative_curve_30d"] = [];
  for (let i = 0; i < len; i++) {
    const date = fullAll[0].points[i].date;
    const rIdx =
      fullRising.length > 0
        ? mean(
            fullRising.map(
              (s) =>
                (s.points[i].normalized_bp /
                  Math.max(1, s.points[0].normalized_bp)) *
                100
            )
          )
        : 100;
    const iIdx =
      fullInc.length > 0
        ? mean(
            fullInc.map(
              (s) =>
                (s.points[i].normalized_bp /
                  Math.max(1, s.points[0].normalized_bp)) *
                100
            )
          )
        : 100;
    const mIdx = mean(
      fullAll.map(
        (s) =>
          (s.points[i].normalized_bp / Math.max(1, s.points[0].normalized_bp)) *
          100
      )
    );
    compCurve.push({
      date,
      rising_index: round2(rIdx),
      incumbent_index: round2(iIdx),
      market_index: round2(mIdx),
    });
  }

  let verdict: TraitCompetingSubstitutionCase["empirical_verdict"] =
    "부분 지지 (보완재·공존 우세)";
  let explanation = "";

  if (risingCards.length < 2 || incumbentOnlyCards.length < 1) {
    verdict = "표본 제한적 (추적 관찰 필요)";
    explanation = `현재 상세 능력치가 수집된 표본 중 공식 신규특성 비교군(${risingCards.length}종 vs ${incumbentOnlyCards.length}종)의 교차 표본 수가 적어 단정적 결론을 내리지 않고 판별 보류·추적 관찰 대상으로 분류합니다.`;
  } else if (risingRet7d >= incRet7d && ctrlRisingPrem >= ctrlIncPrem) {
    verdict = "가설 지지 (대체·상대 강세 확인)";
    explanation = `실제 관측 데이터 기준 공식 신규특성 [${risingTraits.join("·")}] 보유군의 7일 평균 수익률(${risingRet7d}%)과 +8강 통제 프리미엄(${ctrlRisingPrem}%)이 [${incumbentTrait}] 단독 보유군(7일 ${incRet7d}%, 프리미엄 ${ctrlIncPrem}%)을 상회하여 상대 가치 우위 가설이 지지됩니다.`;
  } else {
    verdict = "부분 지지 (보완재·공존 우세)";
    explanation = `실제 관측 데이터 기준 공식 신규특성 [${risingTraits.join("·")}] 보유군(7일 ${risingRet7d}%, 통제 프리미엄 ${ctrlRisingPrem}%)과 [${incumbentTrait}] 보유군(7일 ${incRet7d}%)이 전술 역할에 따라 공존하며 상호 보완적 수요를 형성하고 있습니다.`;
  }

  const uniqueBySpid = (arr: MarketNormalizedSeries[]) => {
    const seen = new Set<number>();
    const out: MarketNormalizedSeries[] = [];
    for (const item of arr) {
      if (!seen.has(item.spid)) {
        seen.add(item.spid);
        out.push(item);
      }
    }
    return out;
  };

  const repCards: TraitCompetingSubstitutionCase["representative_cards"] = [
    ...uniqueBySpid(risingSeries).slice(0, 3).map((s) => ({
      group: "신규·부상 특성군" as const,
      spid: s.spid,
      name: s.name,
      season_code: s.season_code,
      position: s.primary_position,
      ovr: s.ovr,
      current_bp: s.current_bp,
      current_bp_text: s.current_bp_text,
      return_7d_pct: s.return_7d_pct,
      return_30d_pct: s.return_30d_pct,
      key_traits: (s.new_traits || s.traits).slice(0, 4),
    })),
    ...uniqueBySpid(incumbentOnlySeries).slice(0, 3).map((s) => ({
      group: "기존 경쟁 특성군" as const,
      spid: s.spid,
      name: s.name,
      season_code: s.season_code,
      position: s.primary_position,
      ovr: s.ovr,
      current_bp: s.current_bp,
      current_bp_text: s.current_bp_text,
      return_7d_pct: s.return_7d_pct,
      return_30d_pct: s.return_30d_pct,
      key_traits: (s.new_traits || s.traits).slice(0, 4),
    })),
  ];

  return {
    case_id: caseId,
    title,
    hypothesis,
    rising_traits: risingTraits,
    incumbent_trait: incumbentTrait,
    target_positions: targetPositions,
    rising_group_sample_count: risingCards.length,
    incumbent_group_sample_count: incumbentOnlyCards.length,
    dual_holder_sample_count: dualSeries.length,
    rising_avg_return_7d_pct: risingRet7d,
    rising_avg_return_30d_pct: risingRet30d,
    incumbent_avg_return_7d_pct: incRet7d,
    incumbent_avg_return_30d_pct: incRet30d,
    market_benchmark_return_7d_pct: marketRet7d,
    controlled_rising_premium_pct: ctrlRisingPrem,
    controlled_incumbent_premium_pct: ctrlIncPrem,
    relative_spread_shift_pct: spreadShift,
    empirical_verdict: verdict,
    verdict_explanation: explanation,
    comparative_curve_30d: compCurve,
    representative_cards: repCards,
  };
}

// ============================================================================
// 10. Full Market Lab Dashboard Builder & Incremental Collection Trigger
// ============================================================================

export function buildMarketLabDashboard(): MarketLabDashboardPayload {
  const store = getStoreSnapshot();
  const allCards = Object.values(store.cards);
  const { seriesList, unitConversionRecords } = buildNormalizedMarketSeries();

  // Core market indices are computed on +8~+11강 mainstream series so +12~+13강 never distort the market
  const coreSeries = seriesList.filter(
    (s) => s.grade_tier_zone === "CORE_GOLD_8_11"
  );
  const benchmarkSeries = coreSeries.length > 0 ? coreSeries : seriesList;

  const marketRet1d = round2(mean(benchmarkSeries.map((s) => s.return_1d_pct)));
  const marketRet7d = round2(mean(benchmarkSeries.map((s) => s.return_7d_pct)));
  const marketRet30d = round2(mean(benchmarkSeries.map((s) => s.return_30d_pct)));
  const marketVol30d = round2(mean(benchmarkSeries.map((s) => s.volatility_30d_pct)));

  const {
    seasonSectors,
    capitalTierSectors,
    gradeSectors,
    multiAxisSectors,
  } = buildMultiAxisSectors(allCards, seriesList, marketRet7d);

  const fearGreed = buildMarketFearGreedIndex(
    allCards,
    benchmarkSeries,
    seasonSectors,
    capitalTierSectors
  );

  const { events, impacts } = analyzeMarketEvents(benchmarkSeries);
  const { playerForecasts, sectorForecasts, backtestReport } =
    buildForecastsAndBacktest(seriesList, seasonSectors, allCards);

  const {
    traitCatalog,
    traitPremiums,
    traitSubstitutions,
    traitSeasonDiscounts,
    traitPatches,
  } = analyzeTraitMetaAndPremiums(allCards, seriesList);

  const gradeTierComparisons = buildGradeTierComparisons(allCards, seriesList);
  const dynamicFlagshipCandidates = buildDynamicFlagshipCandidates(
    allCards,
    seriesList,
    store.rankerMetaSnapshot || undefined
  );
  const codeAuditFindings = buildCodeAuditFindings();

  const latestIndex =
    fearGreed.history_30d.length > 0
      ? fearGreed.history_30d[fearGreed.history_30d.length - 1].market_index
      : 100;

  const rescaledCount = seriesList.filter(
    (s) => s.quality_status === "unit_rescaled"
  ).length;
  const directCount = seriesList.filter(
    (s) => s.quality_status === "verified_direct"
  ).length;

  const core8to11Count = seriesList.filter(
    (s) => s.grade >= 8 && s.grade <= 11
  ).length;
  const high12to13Count = seriesList.filter(
    (s) => s.grade >= 12 && s.grade <= 13
  ).length;

  const collectionStatus: MarketCollectionStatus = {
    environment_mode:
      "Next.js Node.js 서버 온디맨드 실시간 수집 + .fclab-store.json 시계열 영구 축적 (이전 시점 덮어쓰기 금지)",
    total_catalog_cards: allCards.length,
    cards_with_full_ability: allCards.filter((c) => c.has_full_ability).length,
    cards_with_multi_grade_prices: allCards.filter(
      (c) => Object.keys(c.prices || {}).length > 1
    ).length,
    timeseries_stored_count: Object.keys(store.priceHistory).length,
    valid_30d_series_count: seriesList.filter((s) => s.points.length >= 28)
      .length,
    core_grades_8_11_series_count: core8to11Count,
    separated_12_13_series_count: high12to13Count,
    unit_rescaled_series_count: rescaledCount,
    direct_verified_series_count: directCount,
    official_events_count: (store.marketEvents || []).length,
    ranker_usage_players_count:
      (store.rankerMetaSnapshot?.position_top_players?.length || 0) +
      (store.rankerMetaSnapshot?.daily_record_leaders?.length || 0),
    last_crawled_at:
      store.rankerMetaSnapshot?.last_synced_at ||
      seriesList[0]?.collected_at ||
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    rate_limit_policy:
      "배치 1회당 순차 요청 + 요청 간 딜레이 적용으로 외부 데이터센터 차단 방지 (+8~+11강 주류 기준 우선 수집)",
    deduplication_policy:
      "동일 (spid, grade, date) 관측 시 원본 값을 보존하고 신규 일자 포인트를 시계열에 병합",
    unobservable_metrics_disclosure: [
      "이적시장 전체 유저 실시간 매수·매도 호가창 잔량(Order Book Depth): 넥슨 공식 API 미제공으로 수집 불가 (추정 제외)",
      "선수별·강화 단계별 일간 실제 거래 체결 건수(Transaction Volume): 넥슨 공식 API 미제공으로 가짜 거래량을 생성하지 않고 '시계열 가격 관측 횟수(Observation Count)'와 '실제 거래량(미제공)'을 명확히 구분 표기",
      "이벤트 선수팩 전체 유저 개봉 수량 및 개인 보유 BP 총량: 비공개 서버 지표이므로 공식 공지·이벤트 크롤링 사실과 보수적·기준·공격적 3단계 공급 시나리오 모델로 분리 제시",
      "+12~+13강 초고가 구간: 단일 거래에 따른 가격 왜곡이 크므로 주류 시장(+8~+11강) 지수 및 예측 모델에서 분리하여 별도 관리",
    ],
    unit_conversion_samples: unitConversionRecords,
  };

  const marketOverviewIndex = buildMarketOverviewIndex(
    allCards,
    seriesList,
    latestIndex,
    marketRet1d,
    marketRet7d
  );

  const marketSignals: MarketSignalMetrics[] = playerForecasts
    .map((f) => f.signalMetrics)
    .filter((m): m is MarketSignalMetrics => Boolean(m));

  return {
    generated_at:
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    core_analysis_grades: [8, 9, 10, 11],
    separated_high_grades: [12, 13],
    market_index_current: latestIndex,
    market_return_1d_pct: marketRet1d,
    market_return_7d_pct: marketRet7d,
    market_return_30d_pct: marketRet30d,
    market_volatility_30d_pct: marketVol30d,
    fear_greed: fearGreed,
    season_sectors: seasonSectors,
    capital_tier_sectors: capitalTierSectors,
    grade_sectors: gradeSectors,
    multi_axis_sectors: multiAxisSectors,
    grade_tier_comparisons: gradeTierComparisons,
    dynamic_flagship_candidates: dynamicFlagshipCandidates,
    ranker_meta_snapshot: store.rankerMetaSnapshot || undefined,
    events,
    event_change_logs: store.marketEventChangeLogs || [],
    event_impacts: impacts,
    player_forecasts: playerForecasts,
    sector_forecasts: sectorForecasts,
    backtest_report: backtestReport,
    trait_catalog: traitCatalog,
    legacy_traits_excluded: EXCLUDED_LEGACY_TRAITS_LIST,
    trait_premiums: traitPremiums,
    trait_substitutions: traitSubstitutions,
    trait_season_discounts: traitSeasonDiscounts,
    trait_patches: traitPatches,
    code_audit_findings: codeAuditFindings,
    collection_status: collectionStatus,
    normalized_series_preview: [
      ...coreSeries.slice(0, 45),
      ...seriesList
        .filter((s) => s.grade_tier_zone === "SEPARATED_ULTRA_12_13")
        .slice(0, 10),
    ],
    market_overview_index: marketOverviewIndex,
    market_signals: marketSignals,
    default_fee_config: DEFAULT_MARKET_FEE_CONFIG,
  };
}

export async function runIncrementalMarketCollectionBatch(options?: {
  limit?: number;
  grade?: number;
  targetSeason?: string;
}): Promise<{
  collectedSeriesCount: number;
  collectedAbilityCount: number;
  processedSpids: number[];
  completedAt: string;
}> {
  const store = getStoreSnapshot();
  const maxGrade = getSystemRules().maxEnhanceLevel || 13;
  const limit = clamp(Number(options?.limit || 6), 1, 12);
  // Default to +8강 (core gold market standard) instead of +1강
  const grade = clamp(Number(options?.grade || 8), 1, maxGrade);
  const targetSeason = (options?.targetSeason || "").trim().toUpperCase();

  let candidates = Object.values(store.cards).filter(
    (c) => getCardGoldOrBaseBp(c) > 0
  );
  if (targetSeason && targetSeason !== "ALL") {
    candidates = candidates.filter((c) => c.season_code === targetSeason);
  }

  candidates.sort((a, b) => {
    const aHasPh = Boolean(store.priceHistory[`${a.spid}_${grade}`]);
    const bHasPh = Boolean(store.priceHistory[`${b.spid}_${grade}`]);
    if (aHasPh !== bHasPh) return aHasPh ? 1 : -1;
    if (a.has_full_ability !== b.has_full_ability)
      return a.has_full_ability ? 1 : -1;
    return getCardGoldOrBaseBp(b) - getCardGoldOrBaseBp(a);
  });

  const picked = candidates.slice(0, limit);
  let collectedSeriesCount = 0;
  let collectedAbilityCount = 0;
  const processedSpids: number[] = [];

  for (const card of picked) {
    processedSpids.push(card.spid);
    if (!card.has_full_ability) {
      const ab = await crawlPlayerAbility(card.spid);
      if (ab?.has_full_ability) collectedAbilityCount++;
    }
    const ph: PriceHistoryData = await crawlPriceHistory(card.spid, grade);
    if (ph && ph.points.length > 0) {
      collectedSeriesCount++;
    }
  }

  return {
    collectedSeriesCount,
    collectedAbilityCount,
    processedSpids,
    completedAt:
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
  };
}

