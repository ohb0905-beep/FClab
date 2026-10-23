import {
  getServerNexonApiKey,
  getStoreSnapshot,
  crawlPlayerAbility,
  ensurePlayerSalaryAndMeta,
  getSystemRules,
  updateSystemRules,
  syncNexonMetadata,
} from "@/lib/server/fclab-engine";
import { MatchAnalysisResponse, SystemRules } from "@/lib/fclab-types";

const NEXON_BASE_URL = "https://open.api.nexon.com";

export class NexonServiceError extends Error {
  statusCode: number;
  errorCode: string;
  requiresApiKey: boolean;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    requiresApiKey = false
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.requiresApiKey = requiresApiKey;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nexonGet<T>(
  path: string,
  params?: Record<string, string | number>,
  maxRetries = 3
): Promise<T> {
  const apiKey = getServerNexonApiKey();
  if (!apiKey) {
    throw new NexonServiceError(
      401,
      "MISSING_API_KEY",
      "서버 환경 변수(NEXON_OPEN_API_KEY)가 아직 연결되지 않았습니다. AI Studio의 Secrets 패널 또는 서버 환경 설정에 넥슨 Open API 키를 등록하면 실제 구단주 전적 및 매치 상세 데이터를 조회할 수 있습니다.",
      true
    );
  }

  const url = new URL(`${NEXON_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let resp: Response;
    try {
      resp = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-nxopen-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(350 * (attempt + 1));
        continue;
      }
      throw new NexonServiceError(
        502,
        "NETWORK_ERROR",
        `넥슨 Open API 서버 연결 실패: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (resp.ok) {
      return (await resp.json()) as T;
    }

    let errCode = `HTTP_${resp.status}`;
    let errMsg = resp.statusText;
    try {
      const errJson = (await resp.json()) as {
        error?: { name?: string; message?: string };
      };
      if (errJson?.error?.name) errCode = errJson.error.name;
      if (errJson?.error?.message) errMsg = errJson.error.message;
    } catch {
      // ignore json parse error
    }

    if (
      (resp.status === 429 ||
        errCode === "OPENAPI00007" ||
        resp.status >= 500) &&
      attempt < maxRetries
    ) {
      await sleep(450 * (attempt + 1));
      continue;
    }

    const friendlyMap: Record<string, string> = {
      OPENAPI00001: "넥슨 서버 내부 오류가 발생했습니다.",
      OPENAPI00002: "해당 게임(FC 온라인) 권한이 없는 API 키입니다.",
      OPENAPI00003: "유효하지 않은 식별자(ouid 또는 matchId)입니다.",
      OPENAPI00004:
        "존재하지 않는 구단주 닉네임이거나 파라미터가 올바르지 않습니다. 정확한 대소문자/철자를 확인해 주세요.",
      OPENAPI00005:
        "서버에 등록된 NEXON_OPEN_API_KEY가 유효하지 않습니다. 키 값을 확인해 주세요.",
      OPENAPI00006: "잘못된 API 경로 요청입니다.",
      OPENAPI00007:
        "넥슨 Open API 초당 호출 한도(Rate Limit, 테스트 키 초당 5회)를 초과했습니다. 잠시 후 다시 시도해 주세요.",
      OPENAPI00009: "데이터 준비 중입니다. 잠시 후 다시 시도해 주세요.",
    };

    throw new NexonServiceError(
      resp.status,
      errCode,
      friendlyMap[errCode] || `넥슨 Open API 오류 (${errCode}): ${errMsg}`,
      errCode === "OPENAPI00005"
    );
  }

  throw new NexonServiceError(
    500,
    "UNKNOWN_ERROR",
    "넥슨 Open API 호출 재시도 횟수를 초과했습니다."
  );
}

/**
 * [요구사항 3] 실시간 매치 데이터 기반 상한선 자동 추론 (Match Heuristics)
 * - 매치에 등장한 모든 선수의 spGrade 최댓값을 감지해 SystemRules.maxEnhanceLevel 및 enhanceOvrBoosts 자동 확장
 * - 공식경기(matchType === 50)의 선발 11명(spPosition 0..27, 후보 28 제외) 급여 총합을 역추적하여 SystemRules.salaryCap 자동 갱신
 */
export async function analyzeMatchForRuleUpdates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matchDetails: any[],
  fallbackMatchType = 50
): Promise<{
  updated: boolean;
  rules: SystemRules;
  detectedMaxGrade: number;
  detectedMaxStarterSalary: number;
  matchStarterSalaryMap: Record<string, number>;
}> {
  const store = getStoreSnapshot();
  const currentRules = getSystemRules();
  let detectedMaxGrade = currentRules.maxEnhanceLevel;
  let detectedMaxStarterSalary = 0;
  const matchStarterSalaryMap: Record<string, number> = {};

  // 1. Collect all starter spids from official matches (matchType === 50) that are missing salary in store
  const missingStarterSpids = new Set<number>();

  for (const m of matchDetails) {
    const mType = Number(m?.matchType ?? fallbackMatchType);
    const minfoList = Array.isArray(m?.matchInfo) ? m.matchInfo : [];

    for (const info of minfoList) {
      const players = Array.isArray(info?.player) ? info.player : [];
      for (const p of players) {
        const grade = Number(p?.spGrade ?? 1);
        if (grade > detectedMaxGrade && grade <= 20) {
          detectedMaxGrade = grade;
        }
        const spid = Number(p?.spId ?? 0);
        const spPos = Number(p?.spPosition ?? 28);
        if (mType === 50 && spid > 0 && spPos >= 0 && spPos <= 27) {
          if (!store.cards[spid] || !store.cards[spid].salary) {
            missingStarterSpids.add(spid);
          }
        }
      }
    }
  }

  // On-demand crawl missing starter salaries (bounded concurrency to keep latency low)
  const missingList = Array.from(missingStarterSpids).slice(0, 22);
  for (let i = 0; i < missingList.length; i += 6) {
    const batch = missingList.slice(i, i + 6);
    await Promise.all(batch.map((spid) => ensurePlayerSalaryAndMeta(spid)));
  }

  // 2. Calculate totalStarterSalary for every Starting XI (spPosition 0..27) in official matches (matchType === 50)
  for (const m of matchDetails) {
    const matchId = String(m?.matchId || "");
    const mType = Number(m?.matchType ?? fallbackMatchType);
    const minfoList = Array.isArray(m?.matchInfo) ? m.matchInfo : [];

    for (const info of minfoList) {
      const players = Array.isArray(info?.player) ? info.player : [];
      const starters = players.filter((p: { spId?: number; spPosition?: number }) => {
        const spid = Number(p?.spId ?? 0);
        const pos = Number(p?.spPosition ?? 28);
        return spid > 0 && pos >= 0 && pos <= 27;
      });

      if (starters.length === 11) {
        let allConfirmed = true;
        let squadSalarySum = 0;
        for (const st of starters) {
          const spid = Number(st.spId);
          const sal = Number(store.cards[spid]?.salary || 0);
          if (sal <= 0) {
            allConfirmed = false;
            break;
          }
          squadSalarySum += sal;
        }

        if (allConfirmed && squadSalarySum > 0) {
          if (matchId && info?.ouid) {
            matchStarterSalaryMap[`${matchId}_${info.ouid}`] = squadSalarySum;
          }
          if (mType === 50 && squadSalarySum > detectedMaxStarterSalary) {
            detectedMaxStarterSalary = squadSalarySum;
          }
        }
      }
    }
  }

  let updated = false;
  const partialUpdate: Partial<SystemRules> = {};

  if (detectedMaxGrade > currentRules.maxEnhanceLevel && detectedMaxGrade <= 20) {
    partialUpdate.maxEnhanceLevel = detectedMaxGrade;
    updated = true;
  }

  if (detectedMaxStarterSalary > currentRules.salaryCap && detectedMaxStarterSalary <= 450) {
    // 5 단위 올림 보정 (예: 311~315 스쿼드 관측 시 315로 상향)
    const roundedCap = Math.ceil(detectedMaxStarterSalary / 5) * 5;
    partialUpdate.salaryCap = roundedCap;
    updated = true;
  }

  let finalRules = currentRules;
  if (updated) {
    partialUpdate.syncSource = "match_heuristics";
    partialUpdate.lastSyncedAt =
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    finalRules = updateSystemRules(partialUpdate);
  }

  return {
    updated,
    rules: finalRules,
    detectedMaxGrade,
    detectedMaxStarterSalary,
    matchStarterSalaryMap,
  };
}

export async function analyzeUserMatchesOnServer(
  nickname: string,
  matchtype = 50,
  limit = 15
): Promise<MatchAnalysisResponse> {
  await syncNexonMetadata(false);
  const store = getStoreSnapshot();
  const apiKey = getServerNexonApiKey();
  const isTestKey = apiKey.startsWith("test_");

  // Step 1: Resolve ouid by nickname
  const idRes = await nexonGet<{ ouid?: string }>("/fconline/v1/id", {
    nickname: nickname.trim(),
  });
  const ouid = idRes.ouid;
  if (!ouid) {
    throw new NexonServiceError(
      404,
      "USER_NOT_FOUND",
      `'${nickname}' 구단주를 찾을 수 없습니다.`
    );
  }

  if (isTestKey) {
    await sleep(220);
  }

  const effectiveLimit = Math.min(Math.max(5, limit), isTestKey ? 10 : 20);

  const [basic, maxDiv, matchIds] = await Promise.all([
    nexonGet<{ ouid: string; nickname: string; level: number }>(
      "/fconline/v1/user/basic",
      { ouid }
    ),
    nexonGet<
      { matchType: number; division: number; achievementDate: string }[]
    >("/fconline/v1/user/maxdivision", { ouid }).catch(() => []),
    nexonGet<string[]>("/fconline/v1/user/match", {
      ouid,
      matchtype,
      offset: 0,
      limit: effectiveLimit,
    }).catch(() => []),
  ]);

  const enrichedDivisions = Array.isArray(maxDiv)
    ? maxDiv.map((d) => ({
        matchType: d.matchType,
        matchTypeName:
          store.matchtypes[d.matchType] || `매치타입 ${d.matchType}`,
        division: d.division,
        divisionName: store.divisions[d.division] || `등급 ${d.division}`,
        achievementDate: d.achievementDate || "",
      }))
    : [];

  const targetMatchIds = Array.isArray(matchIds)
    ? matchIds.slice(0, effectiveLimit)
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchDetails: any[] = [];
  const batchSize = isTestKey ? 3 : 5;
  for (let i = 0; i < targetMatchIds.length; i += batchSize) {
    if (isTestKey) {
      await sleep(650);
    }
    const batch = targetMatchIds.slice(i, i + batchSize);
    const batchRes = await Promise.all(
      batch.map((mid) =>
        nexonGet<Record<string, unknown>>("/fconline/v1/match-detail", {
          matchid: mid,
        }).catch(() => null)
      )
    );
    for (const r of batchRes) {
      if (r && Array.isArray(r.matchInfo)) {
        matchDetails.push(r);
      }
    }
  }

  // Run Match Heuristics to detect any new maxEnhanceLevel or salaryCap updates automatically
  const heuristicsRes = await analyzeMatchForRuleUpdates(
    matchDetails,
    matchtype
  );

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let possessionSum = 0;
  let shotsTotal = 0;
  let shotsEffective = 0;
  let shotsOutPenalty = 0;
  let passTry = 0;
  let passSuccess = 0;
  let throughPassTry = 0;
  let throughPassSuccess = 0;
  let tackleTry = 0;
  let tackleSuccess = 0;

  const recentSequence: string[] = [];
  const matchesList = [];
  const playerPerf: Record<
    number,
    {
      spid: number;
      season_code: string;
      grade: number;
      position: string;
      appearances: number;
      goals: number;
      assists: number;
      rating_sum: number;
    }
  > = {};
  const latestStartingXI: {
    spid: number;
    name: string;
    season_code: string;
    position: string;
    grade: number;
    salary?: number;
    rating: number;
  }[] = [];

  for (let idx = 0; idx < matchDetails.length; idx++) {
    const m = matchDetails[idx];
    const minfoList = m.matchInfo || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let myInfo: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let oppInfo: any = null;

    for (const info of minfoList) {
      if (
        info.ouid === ouid ||
        String(info.nickname || "").toLowerCase() ===
          nickname.trim().toLowerCase()
      ) {
        myInfo = info;
      } else {
        oppInfo = info;
      }
    }
    if (!myInfo) continue;

    const detail = myInfo.matchDetail || {};
    const shoot = myInfo.shoot || {};
    const passStat = myInfo.pass || {};
    const defence = myInfo.defence || {};

    const resStr = String(detail.matchResult || "무");
    if (resStr === "승") {
      wins++;
      recentSequence.push("승");
    } else if (resStr === "패") {
      losses++;
      recentSequence.push("패");
    } else {
      draws++;
      recentSequence.push("무");
    }

    const gf = Number(shoot.goalTotalDisplay ?? shoot.goalTotal ?? 0);
    const ga = oppInfo
      ? Number(
          oppInfo.shoot?.goalTotalDisplay ?? oppInfo.shoot?.goalTotal ?? 0
        )
      : 0;
    goalsFor += gf;
    goalsAgainst += ga;
    possessionSum += Number(detail.possession ?? 50);

    const stTot = Number(shoot.shootTotal ?? 0);
    const stEff = Number(shoot.effectiveShootTotal ?? 0);
    shotsTotal += stTot;
    shotsEffective += stEff;
    shotsOutPenalty += Number(shoot.shootOutPenalty ?? 0);

    const pTry = Number(passStat.passTry ?? 0);
    const pSuc = Number(passStat.passSuccess ?? 0);
    passTry += pTry;
    passSuccess += pSuc;
    throughPassTry += Number(passStat.throughPassTry ?? 0);
    throughPassSuccess += Number(passStat.throughPassSuccess ?? 0);

    const tTry = Number(defence.tackleTry ?? 0);
    const tSuc = Number(defence.tackleSuccess ?? 0);
    tackleTry += tTry;
    tackleSuccess += tSuc;

    const matchIdStr = String(m.matchId || "");
    const starterSalary =
      heuristicsRes.matchStarterSalaryMap[`${matchIdStr}_${myInfo.ouid}`] ||
      undefined;

    matchesList.push({
      matchId: matchIdStr,
      matchDate: String(m.matchDate || ""),
      result: resStr,
      opponent: String(oppInfo?.nickname || "상대 구단주"),
      score: `${gf} : ${ga}`,
      goalsFor: gf,
      goalsAgainst: ga,
      possession: Number(detail.possession ?? 50),
      shots: stTot,
      effectiveShots: stEff,
      passRate: pTry > 0 ? Number(((pSuc / pTry) * 100).toFixed(1)) : 0,
      controller: String(detail.controller || "keyboard"),
      starterTotalSalary: starterSalary,
    });

    const players = Array.isArray(myInfo.player) ? myInfo.player : [];
    for (const p of players) {
      const spid = Number(p.spId || 0);
      const spPos = Number(p.spPosition ?? 28);
      const spGrade = Number(p.spGrade ?? 1);
      const status = p.status || {};
      const spRating = Number(status.spRating ?? 0);
      if (spid <= 0) continue;

      const posName = store.positions[spPos] || "SUB";
      const seasonId = Math.floor(spid / 1000000);
      const seasonCode =
        store.seasons[seasonId]?.season_code || String(seasonId);

      if (idx === 0 && spPos >= 0 && spPos <= 27 && posName !== "SUB") {
        latestStartingXI.push({
          spid,
          name: store.cards[spid]?.name || `선수 #${spid % 1000000}`,
          season_code: seasonCode,
          position: posName,
          grade: spGrade,
          salary: store.cards[spid]?.salary,
          rating: spRating,
        });
      }

      if (spRating <= 0) continue;
      if (!playerPerf[spid]) {
        playerPerf[spid] = {
          spid,
          season_code: seasonCode,
          grade: spGrade,
          position: posName,
          appearances: 0,
          goals: 0,
          assists: 0,
          rating_sum: 0,
        };
      }
      playerPerf[spid].appearances += 1;
      playerPerf[spid].goals += Number(status.goal ?? 0);
      playerPerf[spid].assists += Number(status.assist ?? 0);
      playerPerf[spid].rating_sum += spRating;
      if (posName !== "SUB") {
        playerPerf[spid].position = posName;
      }
    }
  }

  // Enrich top starting XI and top performing player names & salaries via on-demand crawler if not in cache
  const topPerfSpids = Object.values(playerPerf)
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 6)
    .map((x) => x.spid);

  const unknownSpids = Array.from(
    new Set([...latestStartingXI.map((x) => x.spid), ...topPerfSpids])
  )
    .filter((id) => !store.cards[id] || !store.cards[id].salary)
    .slice(0, 8);

  if (unknownSpids.length > 0) {
    await Promise.all(
      unknownSpids.map((id) => ensurePlayerSalaryAndMeta(id))
    );
  }

  for (const xi of latestStartingXI) {
    if (store.cards[xi.spid]) {
      xi.name = store.cards[xi.spid].name;
      xi.season_code = store.cards[xi.spid].season_code;
      xi.salary = store.cards[xi.spid].salary;
    }
  }

  const topPlayers = Object.values(playerPerf)
    .map((p) => {
      const card = store.cards[p.spid];
      const apps = Math.max(1, p.appearances);
      return {
        spid: p.spid,
        name: card?.name || `선수 #${p.spid % 1000000}`,
        season_code: card?.season_code || p.season_code,
        thumb_url:
          card?.thumb_url ||
          `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${p.spid}.png`,
        grade: p.grade,
        position: p.position,
        salary: card?.salary,
        appearances: apps,
        goals: p.goals,
        assists: p.assists,
        avgRating: Number((p.rating_sum / apps).toFixed(2)),
      };
    })
    .sort((a, b) => b.avgRating - a.avgRating || b.goals - a.goals)
    .slice(0, 12);

  const totalMatches = matchesList.length;
  const tot = Math.max(1, totalMatches);
  const winRate =
    totalMatches > 0 ? Number(((wins / tot) * 100).toFixed(1)) : 0;
  const avgGf =
    totalMatches > 0 ? Number((goalsFor / tot).toFixed(2)) : 0;
  const avgGa =
    totalMatches > 0 ? Number((goalsAgainst / tot).toFixed(2)) : 0;
  const avgPoss =
    totalMatches > 0 ? Number((possessionSum / tot).toFixed(1)) : 0;
  const shotAcc =
    shotsTotal > 0 ? Number(((shotsEffective / shotsTotal) * 100).toFixed(1)) : 0;
  const outBoxRatio =
    shotsTotal > 0
      ? Number(((shotsOutPenalty / shotsTotal) * 100).toFixed(1))
      : 0;
  const passAcc =
    passTry > 0 ? Number(((passSuccess / passTry) * 100).toFixed(1)) : 0;
  const throughAcc =
    throughPassTry > 0
      ? Number(((throughPassSuccess / throughPassTry) * 100).toFixed(1))
      : 0;
  const tackleAcc =
    tackleTry > 0 ? Number(((tackleSuccess / tackleTry) * 100).toFixed(1)) : 0;

  const diagnostics: {
    category: string;
    severity: "high" | "medium" | "positive";
    observed_fact: string;
    possible_cause: string;
    recommended_action: string;
  }[] = [];

  if (heuristicsRes.updated) {
    diagnostics.push({
      category: "인게임 최신 룰 자동 감지·갱신 완료 (Match Heuristics)",
      severity: "positive",
      observed_fact: `매치 데이터 역추적을 통해 선발 11인 최고 급여 합(${heuristicsRes.detectedMaxStarterSalary} FP) 또는 최고 강화 단계(+${heuristicsRes.detectedMaxGrade}강)가 관측되었습니다.`,
      possible_cause:
        "인게임 패치로 인해 급여 상한선 또는 강화 단계 상한이 확장된 스쿼드가 실제 매치에서 포착되었습니다.",
      recommended_action: `FClab 시스템 규칙이 급여 한도 ${heuristicsRes.rules.salaryCap} FP / 최대 강화 +${heuristicsRes.rules.maxEnhanceLevel}강으로 자동 동기화되었습니다.`,
    });
  }

  if (totalMatches === 0) {
    diagnostics.push({
      category: "선택한 매치 타입의 최근 경기 기록 없음",
      severity: "medium",
      observed_fact: `'${basic.nickname || nickname}' 구단주의 선택된 매치 모드(코드 ${matchtype})에서 최근 진행된 경기 내역이 조회되지 않았습니다.`,
      possible_cause:
        "해당 매치 타입(예: 공식경기 1vs1)을 최근에 플레이하지 않았거나 감독모드·클래식 1on1 등 다른 모드를 주로 플레이했을 수 있습니다.",
      recommended_action:
        "상단 매치 타입 선택창에서 '감독모드' 또는 '클래식 1on1' 등으로 변경하여 다시 조회해 보세요.",
    });
  } else {
    if (avgGa >= 2.0) {
      diagnostics.push({
        category: "수비 안정성 점검 필요",
        severity: "high",
        observed_fact: `최근 ${totalMatches}경기 평균 실점이 ${avgGa}골(태클 성공률 ${tackleAcc}%)로 높게 나타났습니다.`,
        possible_cause:
          "수비형 미드필더(CDM)의 1차 저지선 커버 부족이거나 풀백의 공격 가담 후 뒷공간 노출 가능성이 있습니다.",
        recommended_action:
          "Squad Lab에서 CDM 및 CB 포지션의 가로채기·속력·대인 수비 코어 점수를 점검하고, 수비형 홀딩 유형 배치를 권장합니다.",
      });
    } else {
      diagnostics.push({
        category: "수비 밸런스 안정",
        severity: "positive",
        observed_fact: `경기당 평균 실점 ${avgGa}골, 태클 성공률 ${tackleAcc}%로 안정적인 수비 지표를 기록하고 있습니다.`,
        possible_cause:
          "센터백과 볼란치 조합이 상대 침투를 효과적으로 제어하고 있습니다.",
        recommended_action:
          "현재 수비 라인 구성을 유지하며 잔여 예산을 공격진 강화 단계 상승에 투자하세요.",
      });
    }

    if (outBoxRatio >= 42) {
      diagnostics.push({
        category: "중거리 슈팅 비중 편중",
        severity: "medium",
        observed_fact: `전체 슈팅 중 페널티 박스 밖 중거리 슛 비중이 ${outBoxRatio}%입니다 (유효슈팅률 ${shotAcc}%).`,
        possible_cause:
          "상대 밀집 수비 공략 시 박스 안 침투 패스보다 2선 중거리 슈팅에 의존하는 패턴이 관찰됩니다.",
        recommended_action:
          "CAM/CM 포지션에 중거리 슛·슛 파워 115+ 및 예리한 감아차기/파워 슛 특성 보유 카드를 배치하거나 침투형 ST를 보강하세요.",
      });
    } else if (avgGf < 1.5) {
      diagnostics.push({
        category: "득점 결정력 보강 필요",
        severity: "high",
        observed_fact: `경기당 평균 득점이 ${avgGf}골(유효슈팅률 ${shotAcc}%, 스루패스 성공률 ${throughAcc}%)로 낮습니다.`,
        possible_cause:
          "최전방 스트라이커의 위치 선정·골 결정력 부족 또는 2선 스루패스 연결 정확도 저하가 원인일 수 있습니다.",
        recommended_action:
          "Card Efficiency Lab에서 ST 포지션 골 결정력·위치 선정 가중치를 높여 고효율 스트라이커를 탐색해 보세요.",
      });
    } else {
      diagnostics.push({
        category: "공격 화력 우수",
        severity: "positive",
        observed_fact: `경기당 평균 ${avgGf}득점, 유효슈팅 전환율 ${shotAcc}%로 준수한 결정력을 유지 중입니다.`,
        possible_cause:
          "박스 안팎의 슈팅 분배와 주전 공격진의 결정력이 효과적으로 작동하고 있습니다.",
        recommended_action:
          "평점 상위 공격수를 중심으로 팀컬러 단계를 유지·강화하세요.",
      });
    }
  }

  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  return {
    user: {
      ouid,
      nickname: basic.nickname || nickname,
      level: basic.level || 1,
      maxDivisions: enrichedDivisions,
      fetchedAt: nowStr,
    },
    analysis: {
      ouid,
      nickname: basic.nickname || nickname,
      metrics: {
        totalMatches,
        wins,
        draws,
        losses,
        winRate,
        avgGoalsFor: avgGf,
        avgGoalsAgainst: avgGa,
        goalDiff: goalsFor - goalsAgainst,
        avgPossession: avgPoss,
        shotAccuracy: shotAcc,
        outBoxShotRatio: outBoxRatio,
        passAccuracy: passAcc,
        throughPassAccuracy: throughAcc,
        tackleAccuracy: tackleAcc,
        recentSequence: recentSequence.slice(0, 10),
      },
      matches: matchesList,
      topPlayers,
      latestStartingXI,
      diagnostics,
      heuristicsUpdate: {
        updated: heuristicsRes.updated,
        detectedMaxGrade: heuristicsRes.detectedMaxGrade,
        detectedMaxStarterSalary: heuristicsRes.detectedMaxStarterSalary,
        appliedSalaryCap: heuristicsRes.rules.salaryCap,
        appliedMaxEnhanceLevel: heuristicsRes.rules.maxEnhanceLevel,
      },
      methodologyNote:
        "관찰된 사실(공식 API 매치 기록)과 가능한 전술/스쿼드 원인, 추천 행동을 구분하여 제시합니다. 공식경기 선발 11인의 급여 총합과 최고 강화 단계를 실시간 역추적(Match Heuristics)하여 인게임 패치 상한선을 자율 갱신합니다.",
      analyzedAt: nowStr,
    },
    systemRules: heuristicsRes.rules,
  };
}
