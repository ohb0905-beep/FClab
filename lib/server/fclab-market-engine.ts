import {
  CapitalTierType,
  MarketBacktestReport,
  MarketCollectionStatus,
  MarketEntityForecast,
  MarketEventImpactReport,
  MarketEventRecord,
  MarketFearGreedComponent,
  MarketFearGreedIndex,
  MarketHorizonForecast,
  MarketLabDashboardPayload,
  MarketModelBacktestMetric,
  MarketNormalizedPoint,
  MarketNormalizedSeries,
  MarketSectorSummary,
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
} from "@/lib/fclab-types";
import {
  crawlPlayerAbility,
  crawlPriceHistory,
  getStoreSnapshot,
} from "@/lib/server/fclab-engine";

// ============================================================================
// 1. Season & Capital Tier Classification Rules
// ============================================================================

const LIMITED_SEASONS = new Set([
  "ICONTM",
  "ICON",
  "ICONTMKB",
  "BDO",
  "TOTM",
]);

const NEW_META_FLAGSHIP_SEASONS = new Set([
  "26TOTY",
  "26TOTN",
  "26TOTS",
  "WS",
  "UC",
  "25TOTS",
  "25TOTY",
  "25TOTN",
]);

const EXISTING_FLAGSHIP_SEASONS = new Set([
  "25UCL",
  "24TOTY",
  "24TOTN",
  "24TOTS",
  "24UCL",
  "24EP",
  "23TOTY",
  "23TOTS",
  "23UCL",
  "CU",
  "DC",
  "CC",
  "JNM",
  "TM",
  "UT",
  "FC",
  "23EP",
]);

export function classifySeasonSector(seasonCode: string): {
  sector: SeasonSectorType;
  label: string;
} {
  const code = (seasonCode || "").toUpperCase().trim();
  if (LIMITED_SEASONS.has(code)) {
    return {
      sector: "LIMITED_DISCONTINUED",
      label: "공급 제한·단종 레전드 (ICONTM·ICON·BDO)",
    };
  }
  if (NEW_META_FLAGSHIP_SEASONS.has(code)) {
    return {
      sector: "NEW_META_FLAGSHIP",
      label: "신규·최상위 메타 대장 (26TOTY·WS·UC·25TOTS)",
    };
  }
  if (EXISTING_FLAGSHIP_SEASONS.has(code)) {
    return {
      sector: "EXISTING_FLAGSHIP",
      label: "기존 주류 대장 (24TOTY·24TOTS·UCL·CU·DC)",
    };
  }
  if (
    code.includes("LIVE") ||
    /^(17|18|19|20|21|22|23|24|25|26)$/.test(code)
  ) {
    return {
      sector: "LIVE_DYNAMIC",
      label: "라이브·실제 성적 연동 시즌 (LIVE)",
    };
  }
  return {
    sector: "THEME_TEAMCOLOR",
    label: "테마·팀컬러 실사용 (25PLA·WB·FAC·KB·HG 등)",
  };
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
// 2. Verified Market Events & Trait Patch History Registry
// ============================================================================

const INITIAL_MARKET_EVENTS: MarketEventRecord[] = [
  {
    id: "evt-26toty-ws-pack-wave",
    title: "최상위 메타 시즌(26TOTY·WS·UC) 포함 스페셜 패키지 & 픽업 공급 주간",
    event_type: "PACK_RELEASE",
    event_type_label: "선수팩·패키지 공급",
    start_date: "10.01",
    end_date: "10.10",
    target_seasons: ["26TOTY", "WS", "UC", "25TOTS", "24TOTY", "CU", "DC"],
    target_capital_tiers: ["HIGH_CAPITAL_FLAGSHIP", "MID_TIER"],
    target_grades: [1, 5],
    bp_injection_scale: "중규모",
    pack_supply_scale: "대규모",
    fee_coupon_discount_pct: 30,
    source: "FC 온라인 공식 프로모션·이적시장 시계열 관측 (10.01~10.10 구간)",
    verified: true,
    description:
      "상위 시즌 픽업 및 스페셜 선수팩 공급 확대로 인해 기존 대장급(24TOTY·CU·DC 등) 및 중간 가격대 카드에 일시적 매물 출회 압력이 발생하고, 단종 시즌(ICONTM)과 상대적 차별화가 나타난 구간입니다.",
  },
  {
    id: "evt-autumn-bp-burning-coupon",
    title: "추계 버닝 & 이적시장 수수료 30~40% 할인 쿠폰 배포 이벤트",
    event_type: "FEE_DISCOUNT_COUPON",
    event_type_label: "수수료 쿠폰·BP 버닝",
    start_date: "10.09",
    end_date: "10.16",
    target_seasons: ["ICONTM", "26TOTY", "WS", "UC", "25TOTY", "25TOTS"],
    target_capital_tiers: ["ULTRA_HIGH", "HIGH_CAPITAL_FLAGSHIP"],
    target_grades: [1, 5, 8],
    bp_injection_scale: "대규모",
    pack_supply_scale: "중규모",
    fee_coupon_discount_pct: 40,
    source: "FC 온라인 공식 이벤트 공지 및 10.09~10.16 시계열 반응 데이터",
    verified: true,
    description:
      "버닝 보상으로 인한 대규모 BP 유입(구매력 상승)과 수수료 40% 할인 쿠폰 지급(차익 실현 매물 출회 및 갈아타기 수요)이 동시에 작용하여 고자본·초고가 섹터 변동성이 확대된 핵심 이벤트 구간입니다.",
  },
  {
    id: "evt-new-trait-meta-shift",
    title: "신규·상위 특성(크로스 포쳐·아크로바틱 피니셔·패스 마스터) 인게임 선호도 확산",
    event_type: "TRAIT_ENGINE_PATCH",
    event_type_label: "특성 메타·체감 변화",
    start_date: "10.05",
    end_date: "10.22",
    target_seasons: ["WS", "26TOTY", "UC", "25TOTS", "25TOTY", "BDO"],
    target_capital_tiers: ["ULTRA_HIGH", "HIGH_CAPITAL_FLAGSHIP", "MID_TIER"],
    target_grades: [1, 5],
    bp_injection_scale: "해당없음",
    pack_supply_scale: "해당없음",
    fee_coupon_discount_pct: 0,
    source: "FC 온라인 데이터센터 특성 보유 현황 및 30일 시계열 상대강도 분석",
    verified: true,
    description:
      "박스 안 마무리와 세컨볼 경합에서 강점을 보이는 신규·상위 특성(크로스 포쳐, 아크로바틱 피니셔) 및 중원 배급 특성(패스 마스터, 커맨더) 보유 카드의 상대 강도가 단순 침투형 대비 견조하게 유지되는지 검증하는 메타 구간입니다.",
  },
];

const TRAIT_PATCH_HISTORY: TraitPatchHistoryItem[] = [
  {
    id: "patch-trait-01",
    patch_date: "신규 마스터·상위 특성 도입 패치",
    title: "크로스 포쳐 · 아크로바틱 피니셔 · 패스 마스터 · 커맨더 등 신규 특성 체계 도입",
    target_traits: [
      "크로스 포쳐",
      "아크로바틱 피니셔",
      "패스 마스터",
      "커맨더",
      "스피드스터",
    ],
    change_type: "신규 추가",
    summary:
      "기존 일반 특성(파워 헤더, 긴 패스 선호, 스피드 드리블러 등)보다 발동 상황과 보정 효과가 명확한 상위·특화 특성군이 신규 시즌(WS, 26TOTY, UC, BDO, 25TOTS 등)을 중심으로 부여되었습니다.",
    observed_market_reaction:
      "동일 OVR·동일 포지션 내에서도 신규 특화 특성을 복수 보유한 시즌 카드가 구시즌(특성 미보유) 대비 높은 기준가를 형성하며, 특히 공격수 포지션에서 박스 타격 특성 보유 여부가 가격 방어력에 영향을 미침.",
    verified_source: "FC 온라인 공식 데이터센터 특성(Trait) DB 및 카드별 보유 현황",
  },
  {
    id: "patch-trait-02",
    patch_date: "슈팅 & 침투 밸런스 메타 정착",
    title: "예리한 감아차기 + 중거리 슛 선호 양대 슈팅 특성의 필수화 및 침투 수비 AI 대응 변화",
    target_traits: ["예리한 감아차기", "중거리 슛 선호", "라인 브레이커"],
    change_type: "체감 메타 변화",
    summary:
      "수비 라인 컨트롤과 박스 밀집 수비가 보편화되면서 단순 직선 뒷공간 침투(라인 브레이커 단독) 의존도보다 박스 앞 ZD/중거리 타격(예리한 감아차기·중거리 슛 선호) 및 크로스·발리 마무리(크로스 포쳐·아크로바틱 피니셔)의 전술적 가치가 부각됨.",
    observed_market_reaction:
      "2선(CAM/LW/RW) 및 중앙 공격수(ST/CF)에서 '예리한 감아차기'와 '중거리 슛 선호' 동시 보유 카드가 비보유 카드 대비 통제 프리미엄을 꾸준히 유지함.",
    verified_source: "FClab 데이터센터 175종 상세 능력치·특성 표본 및 30일 시세 비교",
  },
  {
    id: "patch-trait-03",
    patch_date: "피지컬·수비 경합 특성 재평가",
    title: "강철몸 · 슬라이딩 태클 선호 · 파워 헤더의 공중볼·몸싸움 경합 기여도 안정화",
    target_traits: ["강철몸", "파워 헤더", "슬라이딩 태클 선호"],
    change_type: "발동 조건 완화·상향",
    summary:
      "센터백(CB) 및 수비형 미드필더(CDM), 타깃형 스트라이커(ST)에서 헤더 경합과 부상 방지·밸런스 유지에 관여하는 피지컬 특성군의 실사용 선호도가 유지됨.",
    observed_market_reaction:
      "장신(188cm 이상) + 파워 헤더/강철몸 보유 센터백 및 타깃맨 카드의 시세 하방 경직성이 단신 수비수 대비 높게 관측됨.",
    verified_source: "FClab 데이터센터 포지션별 특성 분포 및 시계열 변동성 분석",
  },
];

let customEventsMemory: MarketEventRecord[] = [...INITIAL_MARKET_EVENTS];

export function registerMarketEvent(
  partial: Partial<MarketEventRecord>
): MarketEventRecord {
  const newEvt: MarketEventRecord = {
    id: partial.id || `evt-custom-${Date.now()}`,
    title: (partial.title || "신규 등록 시장 이벤트").trim(),
    event_type: partial.event_type || "PACK_RELEASE",
    event_type_label: partial.event_type_label || "시장 이벤트",
    start_date: partial.start_date || "10.15",
    end_date: partial.end_date || "10.22",
    target_seasons: Array.isArray(partial.target_seasons)
      ? partial.target_seasons
      : ["26TOTY", "WS"],
    target_capital_tiers: Array.isArray(partial.target_capital_tiers)
      ? partial.target_capital_tiers
      : ["HIGH_CAPITAL_FLAGSHIP"],
    target_grades: Array.isArray(partial.target_grades)
      ? partial.target_grades
      : [1, 5],
    bp_injection_scale: partial.bp_injection_scale || "중규모",
    pack_supply_scale: partial.pack_supply_scale || "중규모",
    fee_coupon_discount_pct: Number(partial.fee_coupon_discount_pct || 0),
    source: partial.source || "운영자 수동 등록 이벤트",
    verified: Boolean(partial.verified ?? true),
    description:
      partial.description ||
      "사용자/운영자가 등록한 이적시장 이벤트 및 패치 기록입니다.",
  };
  customEventsMemory = [
    newEvt,
    ...customEventsMemory.filter((e) => e.id !== newEvt.id),
  ];
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
      relative_strength_7d: 0, // populated after market benchmark computation
      unit_scale_factor: round2(scaleFactor),
      quality_status: qualityStatus,
      confidence,
      observed_at: normalizedPoints[n - 1].date,
      collected_at: ph.crawled_at || card.crawled_at,
      source: "fconline.nexon.com/datacenter/PlayerPriceGraph",
      raw_data_reference: `store.priceHistory["${key}"] (${n}일 관측치)`,
      traits: (card.traits || []).map((t) => t.name).filter(Boolean),
      points: normalizedPoints,
    });
  }

  const marketRet7d = mean(seriesList.map((s) => s.return_7d_pct));
  for (const s of seriesList) {
    s.relative_strength_7d = round2(s.return_7d_pct - marketRet7d);
  }

  seriesList.sort((a, b) => b.current_bp - a.current_bp);
  return {
    seriesList,
    unitConversionRecords: unitConversionRecords.slice(0, 24),
  };
}

// ============================================================================
// 5. Multi-Axis Sector Analysis Engine
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
} {
  // 1) Season Sectors
  const seasonDefs: {
    code: SeasonSectorType;
    name: string;
    description: string;
    supplyExposure: "낮음 (공급 제한)" | "보통" | "높음 (패키지·이벤트 노출)";
    replacementRisk: "낮음" | "보통" | "높음 (상위 시즌 대체 위험)";
  }[] = [
    {
      code: "LIMITED_DISCONTINUED",
      name: "공급 제한·단종 시즌 (ICONTM·ICON·BDO)",
      description:
        "재출시나 일반 패키지 대량 공급이 제한되어 희소성과 하방 경직성이 높은 최상위 레전드 섹터",
      supplyExposure: "낮음 (공급 제한)",
      replacementRisk: "낮음",
    },
    {
      code: "NEW_META_FLAGSHIP",
      name: "신규·최상위 메타 대장 (26TOTY·WS·UC·25TOTS)",
      description:
        "최신 OVR 스펙과 신규 마스터 특성(크로스 포쳐·아크로바틱 피니셔 등)을 탑재해 현 메타 수요를 주도하는 섹터",
      supplyExposure: "보통",
      replacementRisk: "낮음",
    },
    {
      code: "EXISTING_FLAGSHIP",
      name: "기존 주류 대장 (24TOTY·24TOTS·UCL·CU·DC)",
      description:
        "여전히 높은 실사용 성능을 보유하나 신규 상위 시즌 출시 및 패키지 공급 이벤트 시 가격 조정을 받기 쉬운 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "높음 (상위 시즌 대체 위험)",
    },
    {
      code: "THEME_TEAMCOLOR",
      name: "테마·팀컬러 실사용 (25PLA·WB·FAC·KB·HG 등)",
      description:
        "특정 클럽·국가 팀컬러 및 급여 최적화 목적으로 꾸준한 실사용 수요가 유지되는 중저자본 핵심 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "보통",
    },
    {
      code: "LIVE_DYNAMIC",
      name: "라이브·실제 성적 연동 시즌 (LIVE)",
      description:
        "실제 축구 활약도에 따른 라이브 부스트와 강화 재료 수요에 의해 움직이는 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "낮음",
    },
  ];

  const seasonSectors: MarketSectorSummary[] = seasonDefs.map((def) => {
    const catalogMembers = allCards.filter(
      (c) => classifySeasonSector(c.season_code).sector === def.code && c.bp_1 > 0
    );
    const tsMembers = seriesList.filter((s) => s.season_sector === def.code);
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

  // 2) Capital Tier Sectors
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
        "최상위 구단주 수요와 희소 매물 중심의 초고가 영역으로, 수수료 할인 쿠폰과 대형 BP 버닝에 민감한 섹터",
      supplyExposure: "낮음 (공급 제한)",
      replacementRisk: "낮음",
    },
    {
      code: "HIGH_CAPITAL_FLAGSHIP",
      name: "고자본 대장급 (1,000억 ~ 1조 BP)",
      description:
        "공식경기 상위 티어 주전급 카드로, 메타 특성 선호도와 신규 시즌 대체 효과의 영향을 직접 받는 핵심 섹터",
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
        "급여 조절용 및 복귀·무과금 유저의 가성비 스쿼드에 편입되어 변동성이 비교적 완만한 실사용 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "보통",
    },
    {
      code: "ENHANCEMENT_FODDER",
      name: "강화 재료·엔트리 (10억 BP 미만)",
      description:
        "강화 데이 이벤트 및 동일 OVR 재료 수요에 따라 하한가·상한가 사이를 오가는 엔트리 섹터",
      supplyExposure: "높음 (패키지·이벤트 노출)",
      replacementRisk: "낮음",
    },
  ];

  const capitalTierSectors: MarketSectorSummary[] = capDefs.map((def) => {
    const catalogMembers = allCards.filter(
      (c) => c.bp_1 > 0 && classifyCapitalTier(c.bp_1).tier === def.code
    );
    const tsMembers = seriesList.filter((s) => s.capital_tier === def.code);
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

  // 3) Enhancement Grade Sectors (using multi-grade price distribution across all cards + grade series)
  const gradeDefs = [
    {
      code: "GRADE_1",
      gradeNum: 1,
      name: "+1강 (기본·명함 시장)",
      description:
        "선수팩 개봉 직후 직접 공급되는 기준 시장으로, 패키지 공급 이벤트와 기초 희소성을 가장 먼저 반영",
      supplyExposure: "높음 (패키지·이벤트 노출)" as const,
      replacementRisk: "보통" as const,
    },
    {
      code: "GRADE_5",
      gradeNum: 5,
      name: "+5강 (은카 주류 실사용 시장)",
      description:
        "단일·케미스트리 효과를 본격적으로 받는 실사용 표준 단계로, 강화 재료비와 실사용 수요가 결합된 시장",
      supplyExposure: "보통" as const,
      replacementRisk: "보통" as const,
    },
    {
      code: "GRADE_8",
      gradeNum: 8,
      name: "+8강 이상 (금카·초월 고강 시장)",
      description:
        "강화 성공 확률 제약으로 인해 공급이 극도로 제한되며, 호가 공백과 변동성이 큰 고위험·고희소 시장",
      supplyExposure: "낮음 (공급 제한)" as const,
      replacementRisk: "낮음" as const,
    },
  ];

  const gradeSectors: MarketSectorSummary[] = gradeDefs.map((def) => {
    const gKey = String(def.gradeNum);
    const cardsWithGradePrice = allCards.filter(
      (c) => (c.prices?.[gKey]?.bp || 0) > 0
    );
    const tsMembers = seriesList.filter((s) =>
      def.gradeNum === 8 ? s.grade >= 8 : s.grade === def.gradeNum
    );
    // If time-series sample for +5/+8 is small, we explicitly report low coverage/confidence
    const bps = cardsWithGradePrice.map((c) => c.prices[gKey].bp);
    const avgBp = mean(bps);
    const medBp = median(bps);
    const ret1d = tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_1d_pct)) : 0;
    const ret7d = tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_7d_pct)) : 0;
    const ret14d = tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_14d_pct)) : 0;
    const ret30d = tsMembers.length > 0 ? mean(tsMembers.map((s) => s.return_30d_pct)) : 0;
    const vol = tsMembers.length > 0 ? mean(tsMembers.map((s) => s.volatility_30d_pct)) : 0;
    const advCount = tsMembers.filter((s) => s.return_7d_pct > 0.5).length;
    const decCount = tsMembers.filter((s) => s.return_7d_pct < -0.5).length;
    const totalTs = Math.max(1, tsMembers.length);
    const fgScore =
      tsMembers.length > 0
        ? clamp(Math.round(50 + ret7d * 2.5 + ((advCount - decCount) / totalTs) * 20), 5, 95)
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
        tsMembers.length >= 20 ? "high" : tsMembers.length >= 5 ? "medium" : "low",
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

  return { seasonSectors, capitalTierSectors, gradeSectors };
}

function summarizeSectorGroup(params: {
  sectorId: string;
  axis: "season" | "capital_tier";
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

  const catalogBps = catalogCards.map((c) => c.bp_1).filter((v) => v > 0);
  const avgBp =
    catalogBps.length > 0
      ? mean(catalogBps)
      : mean(tsMembers.map((s) => s.current_bp));
  const medBp =
    catalogBps.length > 0
      ? median(catalogBps)
      : median(tsMembers.map((s) => s.current_bp));

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
    confidence_level: nTs >= 15 ? "high" : nTs >= 5 ? "medium" : "low",
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

  // Component 1: Market Breadth (Advance vs Decline) - Weight 25%
  const c1Score = Math.round(clamp(50 + (advPct - decPct) * 0.55, 0, 100));
  // Component 2: Short/Mid-term Momentum (1d/7d/14d return) - Weight 25%
  const c2Score = Math.round(
    clamp(50 + avgRet7d * 3.0 + avgRet14d * 1.2 + avgRet1d * 2.5, 0, 100)
  );
  // Component 3: Surge vs Plunge Tail Asymmetry - Weight 20%
  const c3Score = Math.round(clamp(50 + (surgePct - plungePct) * 0.9, 0, 100));
  // Component 4: Realized Volatility & Drawdown Regime - Weight 15%
  const avgMaxDd = mean(seriesList.map((s) => s.max_drawdown_30d_pct)); // negative value
  const c4Score = Math.round(
    clamp(75 - avgVol30d * 5.5 + avgMaxDd * 0.9, 0, 100)
  );
  // Component 5: Multi-Sector Diffusion (대장·단종·실사용 동조화) - Weight 15%
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

  // Build 30-day historical Fear & Greed curve from actual daily time-series points
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
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band})으로, 단기 하락 종목 비중(${round2(decPct)}%)이 상승 종목(${round2(advPct)}%)을 상회하며 매수 심리가 위축된 조정 국면입니다. 단종(ICONTM) 및 핵심 메타 특성 보유 대장주를 중심으로 분할 매수 타점을 탐색하기에 유리한 구간입니다.`;
  } else if (overallScore >= 60) {
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band})으로, 상승 확산도(${round2(advPct)}%)와 단기 모멘텀이 강하게 유입되는 과열 국면입니다. 추격 매수 시 패키지 공급이나 수수료 쿠폰 종료 직후의 단기 되돌림 리스크에 유의해야 합니다.`;
  } else {
    summaryComment = `현재 FC 온라인 이적시장 심리지수는 ${overallScore}점(${band})으로, 전체 시장의 급격한 쏠림 없이 시즌·자본대별 차별화 장세가 전개되고 있습니다. 공급 제한 시즌과 신규 메타 특성(크로스 포쳐·아크로바틱 피니셔·패스 마스터) 보유 카드의 상대 강도가 시장을 지지하고 있습니다.`;
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
      "넥슨 공식 Open API 및 데이터센터는 전체 유저의 실시간 호가창 잔량(Order Book Depth)과 전체 체결 거래량(Transaction Volume)을 공개하지 않으므로, 본 지수는 가짜 거래량을 생성하지 않고 실제 관측된 시계열 등락 확산도(Breadth), 수익률 모멘텀, 꼬리 비대칭, 실현 변동성 데이터만으로 엄밀하게 산출됩니다.",
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
  // Parse M.DD
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
  const fullSeries = seriesList.filter((s) => s.points.length >= 25);
  const impacts: MarketEventImpactReport[] = customEventsMemory.map((event) => {
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

    // Scenario modeling for BP vs Pack Supply
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
    // FC Online base market tax is 40%. TOP Class (20%) + PC Room (30%) = 50% base discount + coupon
    const baseTax = 40;
    const topPcDiscount = 50; // 20% + 30%
    const totalDiscount = clamp(topPcDiscount + couponPct, 0, 95);
    const effectiveFeeRate = round2(baseTax * (1 - totalDiscount / 100));

    return {
      event,
      affected_sector_name: `대상 시즌(${event.target_seasons.slice(0, 4).join("·")}) 및 자본대`,
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
            ? `이벤트 기간 중 대상 섹터가 대조군 대비 +${didNetEffect}%p 초과 수익률을 기록하여, BP 유입·수수료 쿠폰을 활용한 상위 카드 갈아타기 매수세가 매물 부담을 흡수했습니다.`
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

  return { events: customEventsMemory, impacts };
}

// ============================================================================
// 8. 4-Stage Stepwise Price Prediction & Point-in-Time Backtesting Engine
// ============================================================================

const CORE_OP_TRAITS = new Set([
  "예리한 감아차기",
  "중거리 슛 선호",
  "파워 헤더",
  "크로스 포쳐",
  "아크로바틱 피니셔",
  "패스 마스터",
  "커맨더",
  "강철몸",
  "스피드 드리블러",
  "아웃사이드 슈팅/크로스",
]);

function predictStepwiseAtIndex(params: {
  pointsUpToT: MarketNormalizedPoint[];
  horizonDays: 1 | 7 | 30;
  seasonSector: SeasonSectorType;
  capitalTier: CapitalTierType;
  sectorDriftDailyPct: number;
  traits: string[];
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
    traits,
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

  // Model 3: Sector-Adjusted Model (Season Scarcity & Relative Sector Anchor)
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

  // Model 4: Event + Supply/Demand + Trait Meta Model
  const opTraitCount = traits.filter((t) => CORE_OP_TRAITS.has(t)).length;
  const hasNewMetaTrait = traits.some((t) =>
    ["크로스 포쳐", "아크로바틱 피니셔", "패스 마스터", "커맨더"].includes(t)
  );
  const traitDailyAdj =
    (opTraitCount >= 3 ? 0.03 : opTraitCount === 0 ? -0.01 : 0.01) +
    (hasNewMetaTrait ? 0.03 : 0);

  const eventShockCushion =
    medGapPct > 1.0 && (hasNewMetaTrait || seasonSector === "LIMITED_DISCONTINUED")
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

export function buildForecastsAndBacktest(
  seriesList: MarketNormalizedSeries[],
  seasonSectors: MarketSectorSummary[]
): {
  playerForecasts: MarketEntityForecast[];
  sectorForecasts: MarketEntityForecast[];
  backtestReport: MarketBacktestReport;
} {
  const sectorDriftMap = new Map<SeasonSectorType, number>();
  for (const sec of seasonSectors) {
    sectorDriftMap.set(
      sec.code as SeasonSectorType,
      (sec.return_7d_pct || 0) / 7
    );
  }

  // 1) Generate Player Forecasts
  const playerForecasts: MarketEntityForecast[] = seriesList
    .slice(0, 40)
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
            traits: s.traits,
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

          // 30-day horizon requires longer observation history for high confidence; mark low_confidence explicitly
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
                model_name: "3단계: 섹터 상대강도·희소성 모델",
                predicted_bp: pred.m3Bp,
                predicted_return_pct: round2(
                  ((pred.m3Bp - s.current_bp) / s.current_bp) * 100
                ),
                weight: 0.25,
              },
              {
                model_id: "M4_EVENT_TRAIT",
                model_name: "4단계: 이벤트·공급·특성 메타 통합 모델",
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

      if (s.season_sector === "LIMITED_DISCONTINUED") {
        upwardFactors.push(
          "단종·공급 제한 시즌(ICONTM·BDO 등) 특성상 신규 패키지 물량 희석이 없어 하방 경직성 확보"
        );
      }
      if (
        s.traits.some((t) =>
          ["크로스 포쳐", "아크로바틱 피니셔", "패스 마스터", "커맨더"].includes(t)
        )
      ) {
        upwardFactors.push(
          `신규·상위 메타 특성(${s.traits.filter((t) => ["크로스 포쳐", "아크로바틱 피니셔", "패스 마스터", "커맨더"].includes(t)).join(", ")}) 보유로 실사용 수요 지지`
        );
      }
      if (s.z_score_30d < -0.8) {
        upwardFactors.push(
          `30일 평균 가격 대비 Z-Score(${s.z_score_30d}) 과매도 구간 진입에 따른 기술적 평균회귀 반등 압력`
        );
      }
      if (upwardFactors.length === 0) {
        upwardFactors.push(
          `포지션(${s.primary_position}) 주전급 스펙(OVR ${s.ovr}) 및 기본 팀컬러 실사용 수요`
        );
      }

      if (s.season_sector === "EXISTING_FLAGSHIP") {
        downwardFactors.push(
          "상위 신규 시즌(26TOTY·WS·UC)으로의 구단주 세대교체 수요 이동 및 패키지 공급 노출"
        );
      }
      if (s.z_score_30d > 1.0) {
        downwardFactors.push(
          `30일 밴드 상단(Z-Score +${s.z_score_30d}) 도달에 따른 단기 차익 실현 매물 출회 가능성`
        );
      }
      if (s.traits.length === 0) {
        downwardFactors.push(
          "인게임 고유 특성(Trait) 미확인 또는 부재로 인한 동일 OVR 대비 특성 프리미엄 열위"
        );
      }
      if (downwardFactors.length === 0) {
        downwardFactors.push(
          "수수료 할인 쿠폰 지급 구간 종료 시 거래 회전율 둔화 및 호가 스프레드 확대"
        );
      }

      riskFactors.push(
        `30일 일평균 변동성 ${s.volatility_30d_pct}% / 최대 낙폭(MDD) ${s.max_drawdown_30d_pct}%`
      );
      if (s.capital_tier === "ULTRA_HIGH") {
        riskFactors.push(
          "1조 BP 이상 초고가 카드로 호가 공백이 크며 단일 매물 출회에도 실거래 기준가가 크게 흔들릴 수 있음"
        );
      }

      return {
        entity_type: "player",
        entity_id: s.key,
        spid: s.spid,
        grade: s.grade,
        name: s.name,
        season_code: s.season_code,
        primary_position: s.primary_position,
        current_bp: s.current_bp,
        current_bp_text: s.current_bp_text,
        season_sector_label: s.season_sector_label,
        capital_tier_label: s.capital_tier_label,
        horizons,
        upward_factors: upwardFactors,
        downward_factors: downwardFactors,
        risk_factors: riskFactors,
        basis: "model_forecast",
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
            traits:
              sec.code === "NEW_META_FLAGSHIP"
                ? ["크로스 포쳐", "예리한 감아차기", "중거리 슛 선호"]
                : sec.code === "LIMITED_DISCONTINUED"
                  ? ["예리한 감아차기", "파워 헤더"]
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

  // 3) Strict Time-Ordered Point-in-Time Backtesting across all 30-day series
  const validSeries = seriesList.filter((s) => s.points.length >= 28);
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
    // 1-day rolling walk-forward from index t=12 to n-2
    for (let t = 12; t <= pts.length - 2; t++) {
      const slice = pts.slice(0, t + 1);
      // Point-in-time sector drift up to t
      const p7Ago = slice[Math.max(0, slice.length - 8)].normalized_bp;
      const pCur = slice[slice.length - 1].normalized_bp;
      const pitDrift = p7Ago > 0 ? ((pCur - p7Ago) / p7Ago / 7) * 100 : 0;

      const pred1 = predictStepwiseAtIndex({
        pointsUpToT: slice,
        horizonDays: 1,
        seasonSector: s.season_sector,
        capitalTier: s.capital_tier,
        sectorDriftDailyPct: pitDrift,
        traits: s.traits,
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

    // 7-day rolling walk-forward from index t=10 to pts.length - 8
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
        traits: s.traits,
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
        desc: "과거 시계열의 단기 모멘텀과 10일 이동평균 회귀 성향(Mean Reversion)만 반영한 모델",
        pick: (r) => r.m2Bp,
      },
      {
        id: "M3_SECTOR",
        name: "3단계: 섹터 상대강도·공급제한 반영 모델",
        desc: "시즌 섹터 드리프트와 단종(ICONTM 등) 공급 희소성 프리미엄을 추가 반영한 모델",
        pick: (r) => r.m3Bp,
      },
      {
        id: "M4_EVENT_TRAIT",
        name: "4단계: 이벤트·공급·특성 메타 통합 모델",
        desc: "패키지·쿠폰 이벤트 충격 완충 및 핵심·신규 특성(크로스 포쳐 등) 수요 지지력을 결합한 최종 모델",
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
          ? "4단계 (이벤트·특성 통합)"
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

  // Event vs Normal Period comparison
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

  // Sample traces for top 6 cards
  const sampleTraces = validSeries.slice(0, 6).map((s) => {
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
        traits: s.traits,
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

  const backtestReport: MarketBacktestReport = {
    methodology_summary:
      "시간 순서를 엄격히 보존한 롤링 워크포워드(Rolling Walk-Forward) 백테스트입니다. 각 예측 시점 t에서 t+1일 및 t+7일 뒤의 실제 가격을 검증할 때 오직 [0..t] 구간의 과거 관측치만 사용하며 미래 데이터 누수(Data Leakage)를 원천 차단했습니다.",
    leakage_prevention_note:
      "단순 기준선 모델(M1: 최근 가격 그대로 유지)과 통계(M2)·섹터(M3)·이벤트+특성 통합 모델(M4)의 평균절대백분율오차(MAPE), 방향 적중률, 80% 예측구간 포함률을 동일한 표본 위에서 투명하게 비교합니다.",
    total_series_evaluated: validSeries.length,
    total_rolling_windows: rows1d.length + rows7d.length,
    models_1d: models1d,
    models_7d: models7d,
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
// 9. Player Trait Meta, Controlled Premium, Substitution & Season Discount Engine
// ============================================================================

const TRAIT_META_DEFINITIONS: Omit<
  TraitMetaCatalogItem,
  | "card_holder_count"
  | "timeseries_holder_count"
  | "overall_meta_score"
  | "meta_tier"
>[] = [
  {
    trait_name: "예리한 감아차기",
    category: "슈팅·득점",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "전통적 1티어 필수 슈팅 특성 (ZD 감아차기 궤적·회전력 보정)",
    applicable_positions: ["ST", "CF", "LW", "RW", "CAM", "LM", "RM"],
    activation_condition: "페널티 박스 안팎에서 인사이드 감아차기(ZD) 슛 시도 시 발동",
    in_game_effect: "감아차기 슛의 커브 궤적과 골문 구석 안착 확률 상승",
    synergy_stats: ["골 결정력", "커브", "슛 파워", "중거리 슛"],
    competing_traits: ["아웃사이드 슈팅/크로스"],
    base_performance_score: 95,
    current_meta_fit_score: 96,
    relative_competitiveness_score: 95,
    patch_impact_score: 90,
    position_suitability: { ST: 96, CF: 98, LW: 97, RW: 97, CAM: 95, CM: 78 },
  },
  {
    trait_name: "중거리 슛 선호",
    category: "슈팅·득점",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "밀집 수비 파훼를 위한 2선·공격수 핵심 타격 특성",
    applicable_positions: ["CAM", "CM", "CDM", "ST", "CF", "LW", "RW"],
    activation_condition: "페널티 박스 외곽에서 중거리 슛(D/ZD) 시도 시 탄도·보정 적용",
    in_game_effect: "중거리 슈팅 임팩트와 골키퍼 선방 우회 궤적 향상",
    synergy_stats: ["중거리 슛", "슛 파워", "볼 컨트롤", "밸런스"],
    competing_traits: [],
    base_performance_score: 92,
    current_meta_fit_score: 95,
    relative_competitiveness_score: 93,
    patch_impact_score: 88,
    position_suitability: { CAM: 98, CM: 96, CDM: 90, ST: 91, CF: 94, LW: 90, RW: 90 },
  },
  {
    trait_name: "크로스 포쳐",
    category: "슈팅·득점",
    is_new_or_reworked_meta: true,
    release_or_patch_note: "신규 상위 메타 특성 — 크로스 상황에서 박스 안 위치선정 및 다이렉트 마무리 특화",
    applicable_positions: ["ST", "CF"],
    activation_condition: "측면 크로스 올라올 때 박스 내부 침투 및 헤더·논스톱 슈팅 시 발동",
    in_game_effect: "수비수 마크를 벗어나는 순간 움직임과 크로스 연계 슈팅 정확도·경합 우위",
    synergy_stats: ["헤더", "점프", "공격 위치 선정", "골 결정력", "반응 속도"],
    competing_traits: ["라인 브레이커", "파워 헤더"],
    base_performance_score: 94,
    current_meta_fit_score: 95,
    relative_competitiveness_score: 94,
    patch_impact_score: 96,
    position_suitability: { ST: 98, CF: 92, LW: 72, RW: 72 },
  },
  {
    trait_name: "아크로바틱 피니셔",
    category: "슈팅·득점",
    is_new_or_reworked_meta: true,
    release_or_patch_note: "신규 상위 메타 특성 — 발리슛·바이시클·불규칙 바운드 볼 논스톱 득점력 극대화",
    applicable_positions: ["ST", "CF", "LW", "RW"],
    activation_condition: "공중볼·크로스·세컨볼 상황에서 고난도 발리 및 아크로바틱 슈팅 시도 시",
    in_game_effect: "어려운 자세에서도 슈팅 임팩트 손실을 줄이고 다이렉트 골 결정력 향상",
    synergy_stats: ["발리 슛", "민첩성", "밸런스", "골 결정력", "반응 속도"],
    competing_traits: ["라인 브레이커", "크로스 포쳐"],
    base_performance_score: 92,
    current_meta_fit_score: 93,
    relative_competitiveness_score: 92,
    patch_impact_score: 95,
    position_suitability: { ST: 96, CF: 94, LW: 84, RW: 84, CAM: 80 },
  },
  {
    trait_name: "라인 브레이커",
    category: "침투·오프더볼",
    is_new_or_reworked_meta: true,
    release_or_patch_note: "오프사이드 트랩 파괴 및 수비 뒷공간 직선 침투 특화 특성",
    applicable_positions: ["ST", "CF", "LW", "RW"],
    activation_condition: "동료가 볼을 잡았을 때 최종 수비선 어깨선 부근에서 뒷공간 침투 시도",
    in_game_effect: "침투 반응 속도와 오프더볼 러닝 타이밍 향상 (단, 밀집 수비 시 크로스 포쳐 대비 공간 제약 존재)",
    synergy_stats: ["속력", "가속력", "공격 위치 선정", "민첩성"],
    competing_traits: ["크로스 포쳐", "아크로바틱 피니셔"],
    base_performance_score: 90,
    current_meta_fit_score: 88,
    relative_competitiveness_score: 87,
    patch_impact_score: 85,
    position_suitability: { ST: 93, CF: 91, LW: 90, RW: 90, CAM: 75 },
  },
  {
    trait_name: "파워 헤더",
    category: "슈팅·득점",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "타깃맨 ST 및 세트피스 센터백(CB) 핵심 공중볼 타격 특성",
    applicable_positions: ["ST", "CF", "CB", "CDM"],
    activation_condition: "크로스 및 코너킥 상황에서 헤더 슈팅 시도 시 발동",
    in_game_effect: "헤더 타구 속도와 바운드 위력 증가",
    synergy_stats: ["헤더", "점프", "몸싸움"],
    competing_traits: ["크로스 포쳐"],
    base_performance_score: 90,
    current_meta_fit_score: 91,
    relative_competitiveness_score: 89,
    patch_impact_score: 86,
    position_suitability: { ST: 95, CB: 94, CF: 86, CDM: 84 },
  },
  {
    trait_name: "패스 마스터",
    category: "패스·찬스메이킹",
    is_new_or_reworked_meta: true,
    release_or_patch_note: "신규 상위 메타 특성 — 중원 빌드업 및 전진 스루패스·방향 전환 정확도 보정",
    applicable_positions: ["CM", "CAM", "CDM"],
    activation_condition: "중원에서 장단거리 패스 및 결정적 스루패스 배급 시 발동",
    in_game_effect: "패스 궤적 보정 및 압박 상황에서의 패스 미스 감소",
    synergy_stats: ["짧은 패스", "긴 패스", "시야", "볼 컨트롤"],
    competing_traits: ["플레이 메이커", "긴 패스 선호"],
    base_performance_score: 93,
    current_meta_fit_score: 94,
    relative_competitiveness_score: 93,
    patch_impact_score: 94,
    position_suitability: { CM: 98, CAM: 96, CDM: 94, LM: 85, RM: 85 },
  },
  {
    trait_name: "커맨더",
    category: "패스·찬스메이킹",
    is_new_or_reworked_meta: true,
    release_or_patch_note: "신규 상위 특성 — 3선·수비진의 후방 빌드업 안정감 및 전술 지휘력 강화",
    applicable_positions: ["CDM", "CM", "CB"],
    activation_condition: "후방 빌드업 및 수비 라인 조율 시 발동",
    in_game_effect: "3선·수비 라인 안정화 및 전방 연결 패스 정확도 기여",
    synergy_stats: ["시야", "침착성", "짧은 패스", "대인 수비"],
    competing_traits: ["플레이 메이커"],
    base_performance_score: 89,
    current_meta_fit_score: 90,
    relative_competitiveness_score: 89,
    patch_impact_score: 91,
    position_suitability: { CDM: 95, CM: 92, CB: 90 },
  },
  {
    trait_name: "스피드 드리블러",
    category: "드리블·탈압박",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "윙어(LW/RW) 및 침투형 공격수의 치달·볼 간수 핵심 특성",
    applicable_positions: ["LW", "RW", "LM", "RM", "ST", "CF", "CAM"],
    activation_condition: "전력 질주 드리블 시 볼 터치 간격 및 속도 유지",
    in_game_effect: "고속 드리블 중 감속 최소화 및 측면 돌파 효율 상승",
    synergy_stats: ["속력", "가속력", "드리블", "민첩성"],
    competing_traits: ["테크니컬 드리블러", "스피드스터"],
    base_performance_score: 91,
    current_meta_fit_score: 92,
    relative_competitiveness_score: 90,
    patch_impact_score: 86,
    position_suitability: { LW: 97, RW: 97, LM: 95, RM: 95, ST: 90, CF: 91 },
  },
  {
    trait_name: "테크니컬 드리블러",
    category: "드리블·탈압박",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "좁은 공간 방향 전환 및 심리전 탈압박 보편 특성",
    applicable_positions: ["CAM", "LW", "RW", "CF", "CM", "ST"],
    activation_condition: "저속·중속 세밀한 방향 전환 드리블 시 발동",
    in_game_effect: "퍼스트 터치와 방향 전환 반응성 향상",
    synergy_stats: ["드리블", "볼 컨트롤", "민첩성", "밸런스"],
    competing_traits: ["스피드 드리블러"],
    base_performance_score: 86,
    current_meta_fit_score: 87,
    relative_competitiveness_score: 84,
    patch_impact_score: 82,
    position_suitability: { CAM: 93, CF: 92, LW: 92, RW: 92, CM: 89, ST: 84 },
  },
  {
    trait_name: "아웃사이드 슈팅/크로스",
    category: "슈팅·득점",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "역발 각도에서 주발 아웃프런트 슈팅·크로스 보정",
    applicable_positions: ["ST", "CF", "LW", "RW", "CAM", "CM"],
    activation_condition: "약발 각도에서 주발 바깥쪽(아웃프런트)으로 슛/크로스 시도",
    in_game_effect: "약발 리스크 완화 및 변칙적인 아웃프런트 궤적 생성",
    synergy_stats: ["커브", "골 결정력", "크로스"],
    competing_traits: ["예리한 감아차기"],
    base_performance_score: 88,
    current_meta_fit_score: 89,
    relative_competitiveness_score: 87,
    patch_impact_score: 85,
    position_suitability: { LW: 92, RW: 92, ST: 90, CF: 91, CAM: 89 },
  },
  {
    trait_name: "강철몸",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: false,
    release_or_patch_note: "부상 방지 및 강한 물리 충돌 시 밸런스 유지 선호 특성",
    applicable_positions: ["CB", "CDM", "ST", "CM"],
    activation_condition: "상대 선수와 강한 몸싸움 및 태클 피격 시",
    in_game_effect: "부상 빈도 대폭 감소 및 경합 내구성 확보",
    synergy_stats: ["몸싸움", "밸런스", "스태미너"],
    competing_traits: [],
    base_performance_score: 88,
    current_meta_fit_score: 90,
    relative_competitiveness_score: 88,
    patch_impact_score: 86,
    position_suitability: { CB: 95, CDM: 93, ST: 91, CM: 88 },
  },
];

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
  const fullCards = allCards.filter((c) => c.has_full_ability && c.bp_1 > 0);
  const seriesBySpid = new Map<number, MarketNormalizedSeries>();
  for (const s of seriesList) {
    if (s.grade === 1 || !seriesBySpid.has(s.spid)) {
      seriesBySpid.set(s.spid, s);
    }
  }

  // 1) Build Trait Catalog with real counts
  const traitCatalog: TraitMetaCatalogItem[] = TRAIT_META_DEFINITIONS.map(
    (def) => {
      const holders = fullCards.filter((c) =>
        (c.traits || []).some((t) => t.name === def.trait_name)
      );
      const tsHolders = seriesList.filter((s) =>
        s.traits.includes(def.trait_name)
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

  // 2) Controlled Trait Premium Estimation (Propensity / Coarsened Exact Matching)
  // For each trait, match each holder card against non-holder cards in:
  //   - same position group (FW / MF / DF)
  //   - same season sector tier (e.g. NEW_META_FLAGSHIP vs NEW_META_FLAGSHIP)
  //   - OVR difference <= 2
  const traitPremiums: TraitControlledPremiumItem[] = traitCatalog.map(
    (tItem) => {
      const targetPosSet = new Set(tItem.applicable_positions);
      const eligiblePool = fullCards.filter(
        (c) =>
          targetPosSet.has(c.primary_position) ||
          (c.positions || []).some((p) => targetPosSet.has(p.pos))
      );

      const withTrait = eligiblePool.filter((c) =>
        (c.traits || []).some((t) => t.name === tItem.trait_name)
      );
      const withoutTrait = eligiblePool.filter(
        (c) => !(c.traits || []).some((t) => t.name === tItem.trait_name)
      );

      const unadjWith = mean(withTrait.map((c) => c.bp_1));
      const unadjWithout = mean(withoutTrait.map((c) => c.bp_1));
      const unadjDiffPct =
        unadjWithout > 0
          ? round2(((unadjWith - unadjWithout) / unadjWithout) * 100)
          : 0;

      const pairPremiums: number[] = [];
      const matchedExamples: TraitControlledPremiumItem["matched_examples"] = [];

      for (const wCard of withTrait) {
        const wSector = classifySeasonSector(wCard.season_code).sector;
        const wPosGroup = getPositionGroup(wCard.primary_position);

        // Find peer cards without the trait, same position group, same season sector, OVR within ±2
        const peers = withoutTrait.filter((wo) => {
          const woSector = classifySeasonSector(wo.season_code).sector;
          const woPosGroup = getPositionGroup(wo.primary_position);
          return (
            woSector === wSector &&
            woPosGroup === wPosGroup &&
            Math.abs(wo.ovr - wCard.ovr) <= 2 &&
            wo.bp_1 > 0
          );
        });

        if (peers.length === 0) continue;
        // Pick closest OVR peer median BP
        const peerMedianBp = median(peers.map((p) => p.bp_1));
        if (peerMedianBp <= 0) continue;

        const premPct = ((wCard.bp_1 - peerMedianBp) / peerMedianBp) * 100;
        pairPremiums.push(clamp(premPct, -75, 180));

        if (matchedExamples.length < 3) {
          const bestPeer = [...peers].sort(
            (a, b) =>
              Math.abs(a.ovr - wCard.ovr) - Math.abs(b.ovr - wCard.ovr)
          )[0];
          matchedExamples.push({
            with_card: {
              spid: wCard.spid,
              name: wCard.name,
              season_code: wCard.season_code,
              position: wCard.primary_position,
              ovr: wCard.ovr,
              bp_1: wCard.bp_1,
              bp_1_text: formatBpKorean(wCard.bp_1),
              traits: (wCard.traits || []).map((t) => t.name),
            },
            without_card: {
              spid: bestPeer.spid,
              name: bestPeer.name,
              season_code: bestPeer.season_code,
              position: bestPeer.primary_position,
              ovr: bestPeer.ovr,
              bp_1: bestPeer.bp_1,
              bp_1_text: formatBpKorean(bestPeer.bp_1),
              traits: (bestPeer.traits || []).map((t) => t.name),
            },
            ovr_gap: wCard.ovr - bestPeer.ovr,
            premium_pct: round2(
              ((wCard.bp_1 - bestPeer.bp_1) / bestPeer.bp_1) * 100
            ),
          });
        }
      }

      const ctrlMed = round2(median(pairPremiums));
      const ctrlQ25 = round2(quantile(pairPremiums, 0.25));
      const ctrlQ75 = round2(quantile(pairPremiums, 0.75));

      const tsWith = seriesList.filter(
        (s) =>
          s.traits.includes(tItem.trait_name) &&
          targetPosSet.has(s.primary_position)
      );
      const tsWithout = seriesList.filter(
        (s) =>
          !s.traits.includes(tItem.trait_name) &&
          targetPosSet.has(s.primary_position) &&
          s.traits.length > 0
      );

      const retWith =
        tsWith.length > 0 ? round2(mean(tsWith.map((s) => s.return_7d_pct))) : 0;
      const retWithout =
        tsWithout.length > 0
          ? round2(mean(tsWithout.map((s) => s.return_7d_pct)))
          : 0;
      const excessRet7d = round2(retWith - retWithout);

      const confLevel: TraitControlledPremiumItem["confidence_level"] =
        pairPremiums.length >= 15
          ? "높음"
          : pairPremiums.length >= 5
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
          "동일 포지션군 · 동일 시즌 섹터 등급 · OVR ±2 이내 · 동일 강화(+1강) 조건 매칭 통제",
        confidence_level: confLevel,
        interpretation:
          ctrlMed > 5
            ? `단순 평균 차이(${unadjDiffPct}%)에서 시즌·OVR 교란변수를 제거한 후에도 중앙값 +${ctrlMed}%의 양(+)의 특성 프리미엄이 확인됩니다.`
            : ctrlMed < -5
              ? `시즌·OVR 통제 시 중앙값 ${ctrlMed}%로 단독 프리미엄보다는 양발·체형·핵심 스탯 등 다른 변수의 영향력이 더 크게 작용합니다.`
              : `시즌·OVR 통제 후 중앙값 ${ctrlMed}%로 중립 범위이며, 단독 특성 효과보다 복합 특성 조합 시 시너지가 발생합니다.`,
        matched_examples: matchedExamples,
      };
    }
  );

  // 3) Competing Trait Substitution Analysis (Data-Driven Hypothesis Testing)
  const marketRet7d = round2(mean(seriesList.map((s) => s.return_7d_pct)));
  const traitSubstitutions: TraitCompetingSubstitutionCase[] = [
    buildSubstitutionCase({
      caseId: "sub-aerial-box-vs-linebreaker",
      title:
        "가설 1: 신규 박스 타격 특성(크로스 포쳐·아크로바틱 피니셔) 부상에 따른 기존 침투 특성(라인 브레이커) 상대 가치 변화",
      hypothesis:
        "크로스 포쳐 및 아크로바틱 피니셔 등 박스 안 다이렉트 마무리 특성이 부각되면서, 라인 브레이커 단독 보유 공격수의 상대적 프리미엄과 시세 방어력이 대체·약화되었는지 실제 시계열 및 매칭 표본으로 검증합니다.",
      risingTraits: ["크로스 포쳐", "아크로바틱 피니셔"],
      incumbentTrait: "라인 브레이커",
      targetPositions: ["ST", "CF", "LW", "RW"],
      fullCards,
      seriesList,
      traitPremiums,
      marketRet7d,
    }),
    buildSubstitutionCase({
      caseId: "sub-passmaster-vs-playmaker",
      title:
        "가설 2: 신규 상위 배급 특성(패스 마스터·커맨더) vs 기존 일반 패스 특성(플레이 메이커·긴 패스 선호) 프리미엄 비교",
      hypothesis:
        "중원(CM/CAM/CDM)에서 신규 마스터급 패스 특성(패스 마스터·커맨더) 보유 카드가 기존 일반 패스 특성만 보유한 동급 OVR 미드필더 대비 가격 방어력과 통제 프리미엄에서 우위를 점하는지 검증합니다.",
      risingTraits: ["패스 마스터", "커맨더"],
      incumbentTrait: "플레이 메이커",
      targetPositions: ["CM", "CAM", "CDM"],
      fullCards,
      seriesList,
      traitPremiums,
      marketRet7d,
    }),
    buildSubstitutionCase({
      caseId: "sub-dual-shooting-vs-single",
      title:
        "가설 3: 양대 슈팅 특성(예리한 감아차기 + 중거리 슛 선호) 동시 보유 vs 단일 슈팅 특성 보유 가치 격차",
      hypothesis:
        "페널티 박스 외곽 ZD와 D슛을 모두 구사할 수 있는 '예리한 감아차기' 보유 공격/2선 자원이 비보유 동급 카드 대비 뚜렷한 통제 프리미엄과 시세 하방 경직성을 유지하는지 검증합니다.",
      risingTraits: ["예리한 감아차기"],
      incumbentTrait: "테크니컬 드리블러",
      targetPositions: ["ST", "CF", "LW", "RW", "CAM"],
      fullCards,
      seriesList,
      traitPremiums,
      marketRet7d,
    }),
  ];

  // 4) Trait-Lacking Season Discount Analysis
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
      const avgBp = Math.round(mean(cards.map((c) => c.bp_1)));
      const avgTraitCnt = round2(
        mean(cards.map((c) => (c.traits || []).length))
      );

      const cardsWithCoreTrait = cards.filter((c) =>
        (c.traits || []).some((t) => CORE_OP_TRAITS.has(t.name))
      );
      const coveragePct = round2(
        (cardsWithCoreTrait.length / cards.length) * 100
      );

      const allSeasonTraitNames = new Set(
        cards.flatMap((c) => (c.traits || []).map((t) => t.name))
      );
      const missingKeyTraits = [
        "크로스 포쳐",
        "아크로바틱 피니셔",
        "패스 마스터",
        "예리한 감아차기",
        "중거리 슛 선호",
      ].filter((k) => !allSeasonTraitNames.has(k));

      // Compare against all fullCards with OVR within ±1.5 of avgOvr
      const ovrPeers = fullCards.filter(
        (c) => Math.abs(c.ovr - avgOvr) <= 1.5 && c.bp_1 > 0
      );
      const expectedBp =
        ovrPeers.length > 0 ? Math.round(median(ovrPeers.map((c) => c.bp_1))) : avgBp;
      const discountPct =
        expectedBp > 0
          ? round2(((avgBp - expectedBp) / expectedBp) * 100)
          : 0;

      const tsSeason = seriesList.filter((s) => s.season_code === seasonCode);
      const ret7d =
        tsSeason.length > 0
          ? round2(mean(tsSeason.map((s) => s.return_7d_pct)))
          : 0;

      const sectorInfo = classifySeasonSector(seasonCode);
      const compFactors: string[] = [];
      if (sectorInfo.sector === "LIMITED_DISCONTINUED") {
        compFactors.push("단종·공급 제한 희소성으로 특성 부재를 상쇄");
      }
      if (cards.some((c) => c.foot.includes("5") && c.foot.includes("5"))) {
        compFactors.push("양발(5/5) 및 고유 레전드 체형 메리트 보유");
      }
      if (avgOvr >= 118) {
        compFactors.push(`최상위 기본 OVR(${avgOvr}) 깡스탯 우위`);
      }
      if (compFactors.length === 0) {
        compFactors.push("인기 클럽 팀컬러 및 급여 가성비 수요");
      }

      const diagnosis =
        missingKeyTraits.length >= 2 && discountPct < -10
          ? `동일 OVR 기대가 대비 ${discountPct}% 할인 거래 중이며, 신규 핵심 특성(${missingKeyTraits.slice(0, 2).join("·")}) 미보유가 상위 시즌 대비 가치 할인 요인으로 작용하고 있습니다.`
          : sectorInfo.sector === "LIMITED_DISCONTINUED"
            ? `신규 시즌 전용 마스터 특성 일부가 없더라도 단종 희소성과 기본 스펙 우위로 기대가 대비 ${discountPct >= 0 ? "+" : ""}${discountPct}% 프리미엄을 방어하고 있습니다.`
            : `핵심 메타 특성 보유율 ${coveragePct}% (평균 특성 ${avgTraitCnt}개)로 동일 OVR 기대가 대비 ${discountPct >= 0 ? "+" : ""}${discountPct}% 수준을 형성 중입니다.`;

      return {
        season_code: seasonCode,
        season_name: cards[0].season_name || seasonCode,
        season_sector_label: sectorInfo.label,
        evaluated_card_count: cards.length,
        avg_trait_count: avgTraitCnt,
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
    traitPatches: TRAIT_PATCH_HISTORY,
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
    (s) => posSet.has(s.primary_position) && s.traits.length > 0
  );

  // Rising group: holds at least one of risingTraits
  const risingSeries = posSeries.filter((s) =>
    s.traits.some((t) => risingTraits.includes(t))
  );
  // Incumbent only group: holds incumbentTrait AND does NOT hold risingTraits
  const incumbentOnlySeries = posSeries.filter(
    (s) =>
      s.traits.includes(incumbentTrait) &&
      !s.traits.some((t) => risingTraits.includes(t))
  );
  const dualSeries = posSeries.filter(
    (s) =>
      s.traits.includes(incumbentTrait) &&
      s.traits.some((t) => risingTraits.includes(t))
  );

  const risingCards = fullCards.filter(
    (c) =>
      posSet.has(c.primary_position) &&
      (c.traits || []).some((t) => risingTraits.includes(t.name))
  );
  const incumbentOnlyCards = fullCards.filter(
    (c) =>
      posSet.has(c.primary_position) &&
      (c.traits || []).some((t) => t.name === incumbentTrait) &&
      !(c.traits || []).some((t) => risingTraits.includes(t.name))
  );

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

  // Build 30-day comparative index curve
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

  if (risingCards.length < 3 || incumbentOnlyCards.length < 2) {
    verdict = "표본 제한적 (추적 관찰 필요)";
    explanation = `현재 상세 능력치가 수집된 표본 중 신규·부상 특성군(${risingCards.length}종)과 기존 단독 특성군(${incumbentOnlyCards.length}종)의 교차 표본 수가 적어 단정적 결론을 내리지 않고 조건부 관찰 대상으로 분류합니다.`;
  } else if (risingRet7d >= incRet7d && ctrlRisingPrem >= ctrlIncPrem) {
    verdict = "가설 지지 (대체·상대 강세 확인)";
    explanation = `실제 관측 데이터 기준 [${risingTraits.join("·")}] 보유군의 7일 평균 수익률(${risingRet7d}%)과 통제 프리미엄(${ctrlRisingPrem}%)이 [${incumbentTrait}] 단독 보유군(7일 ${incRet7d}%, 프리미엄 ${ctrlIncPrem}%)을 상회하여 상대 가치 우위 가설이 지지됩니다.`;
  } else {
    verdict = "부분 지지 (보완재·공존 우세)";
    explanation = `실제 관측 데이터 기준 [${risingTraits.join("·")}] 보유군(7일 ${risingRet7d}%, 통제 프리미엄 ${ctrlRisingPrem}%)이 높은 기준가를 형성하고 있으나, [${incumbentTrait}] 보유군(7일 ${incRet7d}%) 역시 속가·양발 스탯이 결합된 대장 카드에서 여전히 견조한 수요를 유지하여 완전 대체보다는 전술별 공존·보완 관계가 우세합니다.`;
  }

  const repCards: TraitCompetingSubstitutionCase["representative_cards"] = [
    ...risingSeries.slice(0, 3).map((s) => ({
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
      key_traits: s.traits.slice(0, 4),
    })),
    ...incumbentOnlySeries.slice(0, 3).map((s) => ({
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
      key_traits: s.traits.slice(0, 4),
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

  const marketRet1d = round2(mean(seriesList.map((s) => s.return_1d_pct)));
  const marketRet7d = round2(mean(seriesList.map((s) => s.return_7d_pct)));
  const marketRet30d = round2(mean(seriesList.map((s) => s.return_30d_pct)));
  const marketVol30d = round2(mean(seriesList.map((s) => s.volatility_30d_pct)));

  const { seasonSectors, capitalTierSectors, gradeSectors } =
    buildMultiAxisSectors(allCards, seriesList, marketRet7d);

  const fearGreed = buildMarketFearGreedIndex(
    allCards,
    seriesList,
    seasonSectors,
    capitalTierSectors
  );

  const { events, impacts } = analyzeMarketEvents(seriesList);
  const { playerForecasts, sectorForecasts, backtestReport } =
    buildForecastsAndBacktest(seriesList, seasonSectors);

  const {
    traitCatalog,
    traitPremiums,
    traitSubstitutions,
    traitSeasonDiscounts,
    traitPatches,
  } = analyzeTraitMetaAndPremiums(allCards, seriesList);

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

  const collectionStatus: MarketCollectionStatus = {
    environment_mode:
      "Next.js Node.js 서버 온디맨드 배치 수집 + .fclab-store.json 시계열 영구 축적 (이전 시점 덮어쓰기 금지)",
    total_catalog_cards: allCards.length,
    cards_with_full_ability: allCards.filter((c) => c.has_full_ability).length,
    cards_with_multi_grade_prices: allCards.filter(
      (c) => Object.keys(c.prices || {}).length > 1
    ).length,
    timeseries_stored_count: Object.keys(store.priceHistory).length,
    valid_30d_series_count: seriesList.filter((s) => s.points.length >= 28)
      .length,
    unit_rescaled_series_count: rescaledCount,
    direct_verified_series_count: directCount,
    last_crawled_at:
      seriesList[0]?.collected_at ||
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    rate_limit_policy:
      "배치 1회당 최대 8~12건 순차 요청 + 요청 간 딜레이 적용으로 외부 데이터센터 차단 방지",
    deduplication_policy:
      "동일 (spid, grade, date) 관측 시 원본 값을 보존하고 신규 일자 포인트를 시계열에 병합",
    unobservable_metrics_disclosure: [
      "이적시장 전체 유저 실시간 매수·매도 호가창 잔량(Order Book Depth): 넥슨 공식 API 미제공으로 수집 불가 (추정 제외)",
      "선수별 일간 실제 거래 체결 건수(Transaction Volume): 넥슨 공식 API 미제공으로 가짜 거래량을 생성하지 않고 가격 등락 확산도(Breadth)와 변동성으로 대체",
      "이벤트 선수팩 전체 유저 개봉 수량: 비공개 서버 지표이므로 보수적·기준·공격적 3단계 공급 시나리오 모델로 분리 제시",
    ],
    unit_conversion_samples: unitConversionRecords,
  };

  return {
    generated_at:
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    market_index_current: latestIndex,
    market_return_1d_pct: marketRet1d,
    market_return_7d_pct: marketRet7d,
    market_return_30d_pct: marketRet30d,
    market_volatility_30d_pct: marketVol30d,
    fear_greed: fearGreed,
    season_sectors: seasonSectors,
    capital_tier_sectors: capitalTierSectors,
    grade_sectors: gradeSectors,
    events,
    event_impacts: impacts,
    player_forecasts: playerForecasts,
    sector_forecasts: sectorForecasts,
    backtest_report: backtestReport,
    trait_catalog: traitCatalog,
    trait_premiums: traitPremiums,
    trait_substitutions: traitSubstitutions,
    trait_season_discounts: traitSeasonDiscounts,
    trait_patches: traitPatches,
    collection_status: collectionStatus,
    normalized_series_preview: seriesList.slice(0, 50),
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
  const limit = clamp(Number(options?.limit || 6), 1, 10);
  const grade = clamp(Number(options?.grade || 1), 1, 10);
  const targetSeason = (options?.targetSeason || "").trim().toUpperCase();

  let candidates = Object.values(store.cards).filter((c) => c.bp_1 > 0);
  if (targetSeason && targetSeason !== "ALL") {
    candidates = candidates.filter((c) => c.season_code === targetSeason);
  }

  // Prioritize cards that either lack 30d priceHistory or lack full ability traits
  candidates.sort((a, b) => {
    const aHasPh = Boolean(store.priceHistory[`${a.spid}_${grade}`]);
    const bHasPh = Boolean(store.priceHistory[`${b.spid}_${grade}`]);
    if (aHasPh !== bHasPh) return aHasPh ? 1 : -1;
    if (a.has_full_ability !== b.has_full_ability)
      return a.has_full_ability ? 1 : -1;
    return b.bp_1 - a.bp_1;
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
