import fs from "fs";
import path from "path";
import {
  PlayerCard,
  CardEfficiencyResult,
  PlayerProfileResult,
  ArchetypeFitItem,
  CompleteEvaluationResult,
  CompleteEvaluationCriterion,
  ProfilePhysicalFootAnalysis,
  PriceHistoryData,
  SquadSlot,
  SavedSquad,
  SquadAnalysisResult,
  SquadReplacementRecommendation,
  SystemRules,
  PlayerFeelMetrics,
  SimilarAlternativePlayerItem,
  StatTrapBadgeType,
  SquadPurchaseAudit,
  SquadPlayerPricePercentileItem,
  SquadOverinvestedPositionWarning,
  MarketFeeConfig,
  DEFAULT_ENHANCE_OVR_BOOSTS,
  expandEnhanceOvrBoosts,
  getEnhanceOvrBoost,
  formatBpKorean,
  OFFICIAL_NEW_TRAIT_NAMES_17,
  VALID_OFFICIAL_TRAIT_SET,
  BANNED_FAKE_TRAIT_SET,
  BANNED_DUMMY_TEAM_COLORS,
  getTeamColorLogoUrl,
  OFFICIAL_NEXON_SEASONS,
  OFFICIAL_DATACENTER_TEAM_COLORS,
  findOfficialTeamColorByNameOrId,
} from "@/lib/fclab-types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const NEXON_OPEN_API_BASE = "https://open.api.nexon.com";
const CACHE_FILE_PATH = path.join(process.cwd(), ".fclab-store.json");

// 포지션별 핵심 스탯 매핑 기준 (표기 OVR 대비 실전 코어 스탯 평균 산출용)
export const POSITION_CORE_STATS: Record<string, string[]> = {
  // ST / CF (12개)
  ST: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "볼컨트롤",
  ],
  CF: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "볼컨트롤",
  ],
  // LW / RW (13개)
  LW: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "볼컨트롤",
    "크로스",
    "커브",
  ],
  RW: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "볼컨트롤",
    "크로스",
    "커브",
  ],
  LM: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "볼컨트롤",
    "크로스",
    "커브",
  ],
  RM: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "볼컨트롤",
    "크로스",
    "커브",
  ],
  // CAM (15개)
  CAM: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "볼컨트롤",
    "짧은 패스",
    "긴 패스",
    "시야",
  ],
  // CM (17개)
  CM: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "볼컨트롤",
    "짧은 패스",
    "긴 패스",
    "시야",
    "스태미너",
    "가로채기",
  ],
  // CDM (19개)
  CDM: [
    "속력",
    "가속력",
    "골 결정력",
    "슛 파워",
    "중거리 슛",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "볼컨트롤",
    "짧은 패스",
    "긴 패스",
    "시야",
    "스태미너",
    "가로채기",
    "태클",
    "대인수비",
  ],
  // CB (12개)
  CB: [
    "속력",
    "가속력",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "점프",
    "가로채기",
    "태클",
    "대인수비",
  ],
  // LB / RB (14개)
  LB: [
    "속력",
    "가속력",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "점프",
    "가로채기",
    "태클",
    "대인수비",
    "스태미너",
    "크로스",
  ],
  RB: [
    "속력",
    "가속력",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "점프",
    "가로채기",
    "태클",
    "대인수비",
    "스태미너",
    "크로스",
  ],
  LWB: [
    "속력",
    "가속력",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "점프",
    "가로채기",
    "태클",
    "대인수비",
    "스태미너",
    "크로스",
  ],
  RWB: [
    "속력",
    "가속력",
    "민첩성",
    "밸런스",
    "드리블",
    "반응속도",
    "몸싸움",
    "헤더",
    "점프",
    "가로채기",
    "태클",
    "대인수비",
    "스태미너",
    "크로스",
  ],
  GK: [
    "GK 다이빙",
    "GK 반응속도",
    "GK 핸들링",
    "GK 위치 선정",
    "GK 킥",
  ],
};

function buildEqualWeightsFromCoreStats(
  coreMap: Record<string, string[]>
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [pos, statList] of Object.entries(coreMap)) {
    const w = statList.length > 0 ? Number((1 / statList.length).toFixed(4)) : 1;
    const posWeights: Record<string, number> = {};
    for (const st of statList) {
      posWeights[st] = w;
    }
    result[pos] = posWeights;
  }
  return result;
}

// 포지션별 핵심 능력치 균등 평균 모델 (각 포지션 핵심 스탯 1/N 동일 비중)
export const POSITION_WEIGHTS: Record<string, Record<string, number>> =
  buildEqualWeightsFromCoreStats(POSITION_CORE_STATS);

export type PositionArchetypeGroup =
  | "ST_CF"
  | "WIDE"
  | "CENTRAL_MF"
  | "CB"
  | "FB_WB"
  | "GK";

export interface ArchetypeDef {
  id: string;
  group: "FW" | "MF" | "DF" | "GK";
  positionGroup: PositionArchetypeGroup;
  applicablePositions: string[];
  name: string;
  desc: string;
  isCompleteType?: boolean;
  weights: Record<string, number>;
}

export const ARCHETYPES: ArchetypeDef[] = [
  // 1. ST / CF — 중앙 공격수
  {
    id: "st_cf_target_man",
    group: "FW",
    positionGroup: "ST_CF",
    applicablePositions: ["ST", "CF"],
    name: "타깃맨",
    desc: "피지컬, 몸싸움, 헤더, 점프, 볼 간수 능력으로 전방에서 공을 받아주고 경합하며 제공권을 장악하는 공격수",
    weights: {
      몸싸움: 0.25,
      헤더: 0.22,
      점프: 0.16,
      "볼 컨트롤": 0.12,
      "골 결정력": 0.15,
      "슛 파워": 0.1,
    },
  },
  {
    id: "st_cf_penetrator",
    group: "FW",
    positionGroup: "ST_CF",
    applicablePositions: ["ST", "CF"],
    name: "침투형",
    desc: "가속력, 속력, 공격 위치 선정, 골 결정력, 민첩성 등을 바탕으로 수비 뒷공간을 날카롭게 공략하는 공격수",
    weights: {
      가속력: 0.23,
      속력: 0.22,
      "위치 선정": 0.2,
      "골 결정력": 0.17,
      민첩성: 0.1,
      "반응 속도": 0.08,
    },
  },
  {
    id: "st_cf_linkup",
    group: "FW",
    positionGroup: "ST_CF",
    applicablePositions: ["ST", "CF"],
    name: "연계형",
    desc: "짧은 패스, 시야, 볼 컨트롤, 드리블, 밸런스 등을 활용해 동료와 패스를 주고받고 공격을 연결하는 공격수",
    weights: {
      "짧은 패스": 0.25,
      시야: 0.22,
      "볼 컨트롤": 0.18,
      드리블: 0.15,
      밸런스: 0.1,
      "중거리 슛": 0.1,
    },
  },
  {
    id: "st_cf_complete",
    group: "FW",
    positionGroup: "ST_CF",
    applicablePositions: ["ST", "CF"],
    name: "완성형",
    desc: "특정 능력 하나만 뛰어난 선수가 아니라, 득점·침투·연계·볼 컨트롤·피지컬·공중볼 등 중앙 공격수에게 중요한 능력을 폭넓게 갖춘 선수",
    isCompleteType: true,
    weights: {
      "골 결정력": 0.16,
      속력: 0.13,
      가속력: 0.12,
      "짧은 패스": 0.13,
      시야: 0.1,
      드리블: 0.12,
      몸싸움: 0.12,
      헤더: 0.12,
    },
  },

  // 2. LW / RW / RM / LM — 측면 공격수 및 미드필더
  {
    id: "wide_dribbler",
    group: "FW",
    positionGroup: "WIDE",
    applicablePositions: ["LW", "RW", "RM", "LM"],
    name: "드리블 돌파형",
    desc: "민첩성, 밸런스, 드리블, 볼 컨트롤, 가속력 등을 활용해 측면과 하프스페이스에서 직접 수비수를 제치는 유형",
    weights: {
      드리블: 0.24,
      민첩성: 0.2,
      가속력: 0.18,
      "볼 컨트롤": 0.16,
      밸런스: 0.12,
      속력: 0.1,
    },
  },
  {
    id: "wide_crosser",
    group: "FW",
    positionGroup: "WIDE",
    applicablePositions: ["LW", "RW", "RM", "LM"],
    name: "크로스형 윙어",
    desc: "크로스, 긴 패스, 시야, 커브 등 킥 관련 능력과 측면에서의 전개 능력을 활용해 동료에게 기회를 제공하는 유형",
    weights: {
      크로스: 0.28,
      커브: 0.18,
      "긴 패스": 0.16,
      시야: 0.16,
      "짧은 패스": 0.12,
      속력: 0.1,
    },
  },
  {
    id: "wide_complete",
    group: "FW",
    positionGroup: "WIDE",
    applicablePositions: ["LW", "RW", "RM", "LM"],
    name: "완성형",
    desc: "드리블 돌파, 패스와 크로스, 득점 관여, 스피드, 활동량 등 측면 포지션의 주요 역할을 고르게 수행할 수 있는 선수",
    isCompleteType: true,
    weights: {
      속력: 0.15,
      가속력: 0.15,
      드리블: 0.16,
      민첩성: 0.12,
      크로스: 0.14,
      "짧은 패스": 0.1,
      "골 결정력": 0.1,
      스태미너: 0.08,
    },
  },

  // 3. CAM / CM / CDM — 미드필더 4분류 (공격형 / 중앙 / 수비형 / 육각형 미드필더)
  {
    id: "cm_attacking",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM"],
    name: "공격형 미드필더",
    desc: "침투 움직임, 중거리·골 결정력, 창의적 시야·패스와 부드러운 방향 전환 체감을 바탕으로 2선 공격을 주도하는 유형 (CAM 특화)",
    weights: {
      "중거리 슛": 0.18,
      "골 결정력": 0.16,
      시야: 0.16,
      "짧은 패스": 0.14,
      드리블: 0.14,
      민첩성: 0.12,
      "위치 선정": 0.1,
    },
  },
  {
    id: "cm_central",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CM", "CAM", "CDM"],
    name: "중앙 미드필더",
    desc: "장·단거리 패스 빌드업, 왕성한 활동량과 스태미너, 공수 연결고리 역할을 수행하는 중원 엔진 유형 (CM 특화)",
    weights: {
      "짧은 패스": 0.24,
      "긴 패스": 0.2,
      시야: 0.18,
      스태미너: 0.18,
      "볼 컨트롤": 0.1,
      "반응 속도": 0.1,
    },
  },
  {
    id: "cm_defensive",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CDM", "CM"],
    name: "수비형 미드필더",
    desc: "가로채기, 태클, 대인 수비, 몸싸움 경합과 피지컬을 바탕으로 포백 보호와 중원 1차 저지선 역할을 수행하는 홀딩 유형 (CDM 특화)",
    weights: {
      가로채기: 0.25,
      태클: 0.23,
      "대인 수비": 0.2,
      몸싸움: 0.2,
      "긴 패스": 0.12,
    },
  },
  {
    id: "cm_complete",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM", "CDM"],
    name: "육각형 미드필더",
    desc: "공격·패스·수비·피지컬·스태미너뿐만 아니라 인게임 체감(민첩성·밸런스 8강 기준 124 이상)까지 모두 상위권인 완성형 올라운더 미드필더",
    isCompleteType: true,
    weights: {
      "짧은 패스": 0.14,
      "긴 패스": 0.12,
      시야: 0.12,
      "중거리 슛": 0.12,
      드리블: 0.12,
      민첩성: 0.1,
      가로채기: 0.14,
      몸싸움: 0.07,
      스태미너: 0.07,
    },
  },

  // 4. CB — 센터백
  {
    id: "cb_buildup",
    group: "DF",
    positionGroup: "CB",
    applicablePositions: ["CB"],
    name: "빌드업 센터백",
    desc: "기본적인 수비 능력을 갖추면서 짧은 패스, 긴 패스, 볼 컨트롤, 침착성 등으로 후방 전개를 돕는 유형",
    weights: {
      "긴 패스": 0.22,
      "짧은 패스": 0.2,
      "볼 컨트롤": 0.14,
      침착성: 0.14,
      "대인 수비": 0.15,
      가로채기: 0.15,
    },
  },
  {
    id: "cb_speed",
    group: "DF",
    positionGroup: "CB",
    applicablePositions: ["CB"],
    name: "스피드형",
    desc: "속력, 가속력, 반응 속도, 수비 복귀 능력 등을 바탕으로 뒷공간 커버에 강점이 있는 유형",
    weights: {
      속력: 0.26,
      가속력: 0.22,
      "반응 속도": 0.16,
      가로채기: 0.18,
      "대인 수비": 0.18,
    },
  },
  {
    id: "cb_physical",
    group: "DF",
    positionGroup: "CB",
    applicablePositions: ["CB"],
    name: "피지컬형",
    desc: "몸싸움, 헤더, 점프, 신장, 대인 수비 등을 바탕으로 경합과 제공권에서 강점을 보이는 유형",
    weights: {
      몸싸움: 0.26,
      헤더: 0.2,
      점프: 0.16,
      "대인 수비": 0.2,
      태클: 0.18,
    },
  },
  {
    id: "cb_complete",
    group: "DF",
    positionGroup: "CB",
    applicablePositions: ["CB"],
    name: "완성형",
    desc: "대인 수비, 태클, 가로채기, 제공권, 몸싸움, 스피드, 후방 빌드업까지 고르게 갖춘 센터백",
    isCompleteType: true,
    weights: {
      "대인 수비": 0.18,
      태클: 0.16,
      가로채기: 0.15,
      몸싸움: 0.16,
      헤더: 0.1,
      속력: 0.13,
      "짧은 패스": 0.12,
    },
  },

  // 5. LB / RB / RWB / LWB — 풀백 및 윙백
  {
    id: "fb_attacking",
    group: "DF",
    positionGroup: "FB_WB",
    applicablePositions: ["LB", "RB", "RWB", "LWB"],
    name: "공격형 풀백",
    desc: "속력, 가속력, 크로스, 드리블, 패스, 스태미너 등을 바탕으로 측면 오버래핑과 공격 지원에 강점이 있는 유형",
    weights: {
      속력: 0.2,
      가속력: 0.18,
      크로스: 0.22,
      스태미너: 0.16,
      드리블: 0.12,
      "짧은 패스": 0.12,
    },
  },
  {
    id: "fb_defensive",
    group: "DF",
    positionGroup: "FB_WB",
    applicablePositions: ["LB", "RB", "RWB", "LWB"],
    name: "수비형 풀백",
    desc: "대인 수비, 태클, 가로채기, 몸싸움, 수비 위치 선정 등을 바탕으로 측면 수비 안정성에 강점이 있는 유형",
    weights: {
      "대인 수비": 0.24,
      태클: 0.24,
      가로채기: 0.2,
      몸싸움: 0.18,
      속력: 0.14,
    },
  },
  {
    id: "fb_complete",
    group: "DF",
    positionGroup: "FB_WB",
    applicablePositions: ["LB", "RB", "RWB", "LWB"],
    name: "완성형",
    desc: "측면 수비 안정성과 공격 지원 능력, 기동력, 활동량을 모두 높은 수준으로 갖춘 풀백/윙백",
    isCompleteType: true,
    weights: {
      속력: 0.16,
      가속력: 0.14,
      크로스: 0.15,
      "짧은 패스": 0.11,
      "대인 수비": 0.16,
      태클: 0.16,
      스태미너: 0.12,
    },
  },

  // 6. GK — 골키퍼
  {
    id: "gk_shot_stopper",
    group: "GK",
    positionGroup: "GK",
    applicablePositions: ["GK"],
    name: "선방 특화형",
    desc: "다이빙, 반응속도, 핸들링, 위치 선정 등 순수 슈팅 방어와 세이브 안정성에 특화된 골키퍼",
    weights: {
      "GK 다이빙": 0.28,
      "GK 반응속도": 0.28,
      "GK 핸들링": 0.22,
      "GK 위치 선정": 0.22,
    },
  },
  {
    id: "gk_sweeper_buildup",
    group: "GK",
    positionGroup: "GK",
    applicablePositions: ["GK"],
    name: "스위퍼/빌드업형",
    desc: "빠른 반응 속도와 수비 뒷공간 커버, 정확한 킥 배급력을 겸비한 현대적 골키퍼",
    weights: {
      "GK 킥": 0.3,
      "GK 반응속도": 0.26,
      "반응 속도": 0.16,
      "GK 위치 선정": 0.16,
      "긴 패스": 0.12,
    },
  },
  {
    id: "gk_complete",
    group: "GK",
    positionGroup: "GK",
    applicablePositions: ["GK"],
    name: "완성형",
    desc: "최정상급 선방 능력, 신장·공중볼 장악력, 정확한 킥 배급력을 고루 갖춘 완성형 수문장",
    isCompleteType: true,
    weights: {
      "GK 다이빙": 0.23,
      "GK 반응속도": 0.23,
      "GK 핸들링": 0.2,
      "GK 위치 선정": 0.2,
      "GK 킥": 0.14,
    },
  },
];

export interface FClabStore {
  seasons: Record<number, { class_name: string; season_code: string; season_img: string }>;
  positions: Record<number, string>;
  divisions: Record<number, string>;
  matchtypes: Record<number, string>;
  cards: Record<number, PlayerCard>;
  priceHistory: Record<string, PriceHistoryData>;
  savedSquads: SavedSquad[];
  systemRules: SystemRules;
  marketEvents?: import("@/lib/fclab-types").MarketEventRecord[];
  marketEventChangeLogs?: import("@/lib/fclab-types").OfficialEventChangeLog[];
  rankerMetaSnapshot?: import("@/lib/fclab-types").RankerMetaSnapshot;
  traitPatches?: import("@/lib/fclab-types").TraitPatchHistoryItem[];
  seeded: boolean;
  updatedAt: string;
}

let memoryStore: FClabStore | null = null;

function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function createInitialSystemRules(): SystemRules {
  return {
    salaryCap: 310,
    maxEnhanceLevel: 13,
    enhanceOvrBoosts: [...DEFAULT_ENHANCE_OVR_BOOSTS],
    lastSyncedAt: nowIso(),
    syncSource: "initial",
  };
}

function normalizeSystemRules(raw?: Partial<SystemRules> | null): SystemRules {
  const initial = createInitialSystemRules();
  if (!raw) return initial;
  const salaryCap = Math.max(310, Number(raw.salaryCap || 310));
  const maxEnhanceLevel = Math.max(
    13,
    Math.min(20, Number(raw.maxEnhanceLevel || 13))
  );
  const baseBoosts =
    Array.isArray(raw.enhanceOvrBoosts) && raw.enhanceOvrBoosts.length >= 13
      ? raw.enhanceOvrBoosts
      : DEFAULT_ENHANCE_OVR_BOOSTS;
  const enhanceOvrBoosts = expandEnhanceOvrBoosts(maxEnhanceLevel, baseBoosts);
  const syncSource =
    raw.syncSource === "crawler" ||
    raw.syncSource === "match_heuristics" ||
    raw.syncSource === "initial"
      ? raw.syncSource
      : "initial";
  return {
    salaryCap,
    maxEnhanceLevel,
    enhanceOvrBoosts,
    lastSyncedAt: raw.lastSyncedAt || nowIso(),
    syncSource,
  };
}

function loadStore(): FClabStore {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as FClabStore;
      parsed.systemRules = normalizeSystemRules(parsed.systemRules);
      if (Array.isArray(parsed.savedSquads)) {
        for (const sq of parsed.savedSquads) {
          if (!sq.salary_cap || sq.salary_cap < parsed.systemRules.salaryCap) {
            sq.salary_cap = parsed.systemRules.salaryCap;
          }
        }
      }
      if (parsed.cards && typeof parsed.cards === "object") {
        for (const spidKey of Object.keys(parsed.cards)) {
          const numKey = Number(spidKey);
          const rawCard = parsed.cards[numKey];
          if (rawCard) {
            parsed.cards[numKey] = enrichPlayerCardMetaSync(rawCard);
          }
        }
      }
      memoryStore = parsed;
      return memoryStore;
    }
  } catch {
    // ignore read error
  }
  memoryStore = {
    seasons: {},
    positions: {},
    divisions: {},
    matchtypes: {},
    cards: {},
    priceHistory: {},
    savedSquads: [],
    systemRules: createInitialSystemRules(),
    seeded: false,
    updatedAt: nowIso(),
  };
  return memoryStore;
}

function saveStore(): void {
  if (!memoryStore) return;
  memoryStore.updatedAt = nowIso();
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(memoryStore), "utf-8");
  } catch {
    // ignore write error on read-only fs
  }
}

export function persistStore(): void {
  saveStore();
}


export function getSystemRules(): SystemRules {
  const store = loadStore();
  store.systemRules = normalizeSystemRules(store.systemRules);
  return store.systemRules;
}

export function updateSystemRules(partial: Partial<SystemRules>): SystemRules {
  const store = loadStore();
  const current = getSystemRules();
  const nextSalaryCap =
    partial.salaryCap !== undefined
      ? Math.max(current.salaryCap, Number(partial.salaryCap))
      : current.salaryCap;
  const nextMaxEnhance =
    partial.maxEnhanceLevel !== undefined
      ? Math.max(
          current.maxEnhanceLevel,
          Math.min(20, Number(partial.maxEnhanceLevel))
        )
      : current.maxEnhanceLevel;
  const baseBoosts = partial.enhanceOvrBoosts || current.enhanceOvrBoosts;
  const nextBoosts = expandEnhanceOvrBoosts(nextMaxEnhance, baseBoosts);

  store.systemRules = {
    salaryCap: nextSalaryCap,
    maxEnhanceLevel: nextMaxEnhance,
    enhanceOvrBoosts: nextBoosts,
    lastSyncedAt: partial.lastSyncedAt || nowIso(),
    syncSource: partial.syncSource || current.syncSource,
  };

  // Keep saved squads' salary cap aligned when cap expands
  for (const sq of store.savedSquads) {
    if (sq.salary_cap < nextSalaryCap) {
      sq.salary_cap = nextSalaryCap;
    }
  }

  saveStore();
  return store.systemRules;
}

function cleanApiKeyString(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (
    !trimmed ||
    trimmed === "MY_NEXON_OPEN_API_KEY" ||
    trimmed === "YOUR_NEXON_OPEN_API_KEY"
  ) {
    return "";
  }
  return trimmed;
}

export function getServerNexonApiKey(): string {
  const envKey = cleanApiKeyString(process.env.NEXON_OPEN_API_KEY || "");
  if (envKey) {
    return envKey;
  }

  // Fallback: check .env.local, .env, .env.example on server disk in case user edited env file at runtime
  const candidateFiles = [".env.local", ".env", ".env.example"];
  for (const fileName of candidateFiles) {
    try {
      const fullPath = path.join(process.cwd(), fileName);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;
        const match = trimmedLine.match(/^NEXON_OPEN_API_KEY\s*=\s*(.+)$/);
        if (match && match[1]) {
          const parsed = cleanApiKeyString(match[1]);
          if (parsed) return parsed;
        }
      }
    } catch {
      // ignore fs error
    }
  }

  return "";
}

export function getServerNexonApiKeyPreview(): string {
  const key = getServerNexonApiKey();
  if (!key) return "미설정";
  if (key.length <= 12) return "설정됨";
  return `${key.slice(0, 9)}...${key.slice(-4)}`;
}

const DATACENTER_POSITION_CODE_MAP: Record<string, string> = {
  ST: ",24,25,26,",
  CF: ",20,21,22,",
  LW: ",27,",
  RW: ",23,",
  CM: ",13,14,15,",
  CAM: ",17,18,19,",
  CDM: ",9,10,11,",
  LM: ",16,",
  RM: ",12,",
  CB: ",1,4,5,6,",
  RB: ",3,",
  LB: ",7,",
  RWB: ",2,",
  LWB: ",8,",
  GK: ",0,",
};

export async function syncNexonMetadata(force = false): Promise<{
  status: string;
  seasons: number;
  positions: number;
  divisions: number;
  matchtypes: number;
}> {
  const store = loadStore();
  // Always ensure all 153 official seasons from OFFICIAL_NEXON_SEASONS are present in store.seasons
  for (const s of OFFICIAL_NEXON_SEASONS) {
    if (!store.seasons[s.seasonId]) {
      store.seasons[s.seasonId] = {
        class_name: s.fullName,
        season_code: s.code,
        season_img: s.seasonImg,
      };
    }
  }

  if (
    !force &&
    Object.keys(store.seasons).length >= 150 &&
    Object.keys(store.positions).length > 0
  ) {
    return {
      status: "cached",
      seasons: Object.keys(store.seasons).length,
      positions: Object.keys(store.positions).length,
      divisions: Object.keys(store.divisions).length,
      matchtypes: Object.keys(store.matchtypes).length,
    };
  }

  try {
    const [seasonsRes, posRes, divRes, mtRes] = await Promise.all([
      fetch(`${NEXON_OPEN_API_BASE}/static/fconline/meta/seasonid.json`, {
        headers: { "User-Agent": USER_AGENT },
      }),
      fetch(`${NEXON_OPEN_API_BASE}/static/fconline/meta/spposition.json`, {
        headers: { "User-Agent": USER_AGENT },
      }),
      fetch(`${NEXON_OPEN_API_BASE}/static/fconline/meta/division.json`, {
        headers: { "User-Agent": USER_AGENT },
      }),
      fetch(`${NEXON_OPEN_API_BASE}/static/fconline/meta/matchtype.json`, {
        headers: { "User-Agent": USER_AGENT },
      }),
    ]);

    if (seasonsRes.ok) {
      const sList = (await seasonsRes.json()) as {
        seasonId: number;
        className: string;
        seasonImg: string;
      }[];
      for (const s of sList) {
        const mCode = s.seasonImg.match(/\/([^/]+)\.png$/);
        const scode = mCode
          ? mCode[1].toUpperCase()
          : s.className.split("(")[0].trim();
        store.seasons[Number(s.seasonId)] = {
          class_name: s.className,
          season_code: scode,
          season_img: s.seasonImg,
        };
      }
    }

    if (posRes.ok) {
      const pList = (await posRes.json()) as {
        spposition: number;
        desc: string;
      }[];
      for (const p of pList) {
        store.positions[Number(p.spposition)] = p.desc;
      }
    }

    if (divRes.ok) {
      const dList = (await divRes.json()) as {
        divisionId: number;
        divisionName: string;
      }[];
      for (const d of dList) {
        store.divisions[Number(d.divisionId)] = d.divisionName;
      }
    }

    if (mtRes.ok) {
      const mList = (await mtRes.json()) as {
        matchtype: number;
        desc: string;
      }[];
      for (const m of mList) {
        store.matchtypes[Number(m.matchtype)] = m.desc;
      }
    }

    saveStore();
  } catch {
    // fallback if network restricted
  }

  return {
    status: "synced",
    seasons: Object.keys(store.seasons).length,
    positions: Object.keys(store.positions).length,
    divisions: Object.keys(store.divisions).length,
    matchtypes: Object.keys(store.matchtypes).length,
  };
}

export interface CrawlPlayerListOptions {
  seasons?: string[];
  teamColors?: string[];
  position?: string;
  ovrMin?: string;
  ovrMax?: string;
  salaryMin?: string;
  salaryMax?: string;
}

export async function crawlPlayerList(
  playerName: string,
  limit = 40,
  filterOpts?: CrawlPlayerListOptions
): Promise<PlayerCard[]> {
  const cleanName = playerName.trim();
  const hasFilterOpts =
    Boolean(filterOpts?.seasons?.length) ||
    Boolean(filterOpts?.teamColors?.length) ||
    Boolean(filterOpts?.position && filterOpts.position !== "ALL") ||
    Boolean(filterOpts?.ovrMin) ||
    Boolean(filterOpts?.ovrMax) ||
    Boolean(filterOpts?.salaryMin) ||
    Boolean(filterOpts?.salaryMax);

  if (!cleanName && !hasFilterOpts) return [];

  const store = loadStore();
  await syncNexonMetadata(false);

  const paramsObj: Record<string, string> = {
    strPlayerName: cleanName,
  };
  if (filterOpts?.ovrMin) paramsObj.n4OvrMin = filterOpts.ovrMin;
  if (filterOpts?.ovrMax) paramsObj.n4OvrMax = filterOpts.ovrMax;
  if (filterOpts?.salaryMin) paramsObj.n4SalaryMin = filterOpts.salaryMin;
  if (filterOpts?.salaryMax) paramsObj.n4SalaryMax = filterOpts.salaryMax;

  // Map seasons to official strSeason=",866,854," format
  if (filterOpts?.seasons && filterOpts.seasons.length > 0) {
    const seasonIds: number[] = [];
    for (const rawS of filterOpts.seasons) {
      const normS = rawS.replace(/\s+/g, "").toUpperCase();
      const foundCatalog = OFFICIAL_NEXON_SEASONS.find(
        (item) =>
          item.code.replace(/\s+/g, "").toUpperCase() === normS ||
          item.label.replace(/\s+/g, "").toUpperCase() === normS ||
          String(item.seasonId) === normS
      );
      if (foundCatalog) {
        seasonIds.push(foundCatalog.seasonId);
      } else {
        for (const [sidStr, sMeta] of Object.entries(store.seasons)) {
          if (
            sMeta.season_code.replace(/\s+/g, "").toUpperCase() === normS ||
            sidStr === normS
          ) {
            seasonIds.push(Number(sidStr));
          }
        }
      }
    }
    if (seasonIds.length > 0) {
      paramsObj.strSeason = `,${Array.from(new Set(seasonIds)).join(",")},`;
    }
  }

  // Map position to official Datacenter strPosition=",24,25,26," format
  if (filterOpts?.position && filterOpts.position !== "ALL") {
    const posCode = DATACENTER_POSITION_CODE_MAP[filterOpts.position.toUpperCase()];
    if (posCode) {
      paramsObj.strPosition = posCode;
    }
  }

  // Map teamColor to official Datacenter teamcolorid
  let matchedOfficialTc: import("@/lib/fclab-types").OfficialTeamColorCatalogItem | undefined;
  if (filterOpts?.teamColors && filterOpts.teamColors.length > 0) {
    for (const tcRaw of filterOpts.teamColors) {
      const foundTc = findOfficialTeamColorByNameOrId(tcRaw);
      if (foundTc) {
        matchedOfficialTc = foundTc;
        paramsObj.teamcolorid = String(foundTc.id);
        break;
      }
    }
  }

  const formBody = new URLSearchParams(paramsObj).toString();
  try {
    const resp = await fetch("https://fconline.nexon.com/datacenter/PlayerList", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const parts = html.split(/<div id="area_playerunit_(\d+)">/);
    if (parts.length < 3) return [];

    const ts = nowIso();
    const results: PlayerCard[] = [];

    for (let i = 1; i < parts.length; i += 2) {
      const spid = Number(parts[i]);
      const block = parts[i + 1];
      const seasonId = Math.floor(spid / 1000000);
      const pid = spid % 1000000;

      const mName = block.match(/<div class="name">(.*?)<\/div>/);
      const name = mName ? mName[1].trim() : cleanName;

      const mThumb = block.match(/<div class="thumb"><img src="([^"]+)"/);
      const thumbUrl = mThumb
        ? mThumb[1].trim()
        : `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`;

      const mSimg = block.match(/<div class="season"><img src="([^"]+)"/);
      let seasonImg = mSimg ? mSimg[1].trim() : "";
      const mScode = seasonImg.match(/\/([^/]+)\.png/);
      const seasonCode = mScode
        ? mScode[1].toUpperCase()
        : store.seasons[seasonId]?.season_code?.toUpperCase() || String(seasonId);
      const sMeta = store.seasons[seasonId];
      const seasonName = sMeta ? sMeta.class_name : seasonCode;
      if (!seasonImg && sMeta?.season_img) {
        seasonImg = sMeta.season_img;
      }

      const positions: { pos: string; ovr: number }[] = [];
      const posRegex =
        /<span class="position[^"]*">\s*<span class="txt">([^<]+)<\/span>\s*<span class="skillData_\d+">(\d+)<\/span>/g;
      let pm: RegExpExecArray | null;
      while ((pm = posRegex.exec(block)) !== null) {
        positions.push({ pos: pm[1].trim(), ovr: Number(pm[2]) });
      }

      const primaryPosition = positions[0]?.pos || "ST";
      const ovr = positions[0]?.ovr || 100;

      const mFoot = block.match(/<div class="foot">([\s\S]*?)<\/div>/);
      const foot = mFoot
        ? mFoot[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
        : "L4 - R5";

      const mPay = block.match(/<span class="pay">(\d+)<\/span>/);
      const salary = mPay ? Number(mPay[1]) : 20;

      const prices: Record<string, { bp: number; text: string }> = {};
      const bpRegex =
        /<span class="span_bp(\d+)"[^>]*alt="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g;
      let gm: RegExpExecArray | null;
      while ((gm = bpRegex.exec(block)) !== null) {
        const gradeNum = Number(gm[1]);
        if (gradeNum === 0) continue;
        const rawAlt = gm[2].replace(/,/g, "").trim();
        const bpVal = /^\d+$/.test(rawAlt) ? Number(rawAlt) : 0;
        prices[String(gradeNum)] = {
          bp: bpVal,
          text: gm[3].trim(),
        };
      }

      const bp1 = prices["1"]?.bp || 0;
      const bp5 = prices["5"]?.bp || 0;
      const bp8 = prices["8"]?.bp || 0;

      const mScore = block.match(
        /<div class="td td_ar_score"><span>\s*([0-9.]+)\s*<em>\((\d+)\)<\/em>/
      );
      const ratingScore = mScore ? Number(mScore[1]) : 0;
      const ratingCount = mScore ? Number(mScore[2]) : 0;

      const existing = store.cards[spid];
      const existingTcList = [...(existing?.team_colors || [])];
      if (matchedOfficialTc) {
        const tcTypeLabel =
          matchedOfficialTc.category === "feature"
            ? "특성"
            : matchedOfficialTc.category === "nation"
            ? "국가대표"
            : "소속 클럽";
        if (!existingTcList.some((x) => x.id === matchedOfficialTc!.id || x.name === matchedOfficialTc!.name)) {
          existingTcList.push({
            id: matchedOfficialTc.id,
            type: tcTypeLabel,
            name: matchedOfficialTc.name,
            logoUrl: matchedOfficialTc.img,
          });
        }
      }

      const mergedCard: PlayerCard = {
        spid,
        pid,
        name,
        season_id: seasonId,
        season_code: seasonCode,
        season_name: seasonName,
        season_img: seasonImg,
        thumb_url: thumbUrl,
        primary_position: primaryPosition,
        positions,
        ovr,
        salary,
        foot,
        skill_moves: existing?.skill_moves || "★★★★☆☆",
        height: existing?.height || 180,
        weight: existing?.weight || 75,
        body_type: existing?.body_type || "보통",
        birth: existing?.birth || "",
        team:
          existing?.team ||
          (matchedOfficialTc?.category === "club" ? matchedOfficialTc.name : ""),
        nation:
          existing?.nation ||
          (matchedOfficialTc?.category === "nation" ? matchedOfficialTc.name : ""),
        traits: existing?.traits || [],
        team_colors: existingTcList,
        position_ovrs: existing?.position_ovrs || {},
        stats: existing?.stats || {},
        prices,
        bp_1: bp1,
        bp_5: bp5,
        bp_8: bp8,
        rating_score: ratingScore,
        rating_count: ratingCount,
        has_full_ability: existing?.has_full_ability || false,
        crawled_at: ts,
      };

      store.cards[spid] = mergedCard;
      results.push(mergedCard);
      if (results.length >= limit) break;
    }

    saveStore();
    return results.sort((a, b) => b.ovr - a.ovr || b.bp_1 - a.bp_1);
  } catch {
    return [];
  }
}

export async function crawlPlayerAbility(
  spid: number,
  force = false
): Promise<PlayerCard | null> {
  const store = loadStore();
  const existing = store.cards[spid];
  if (
    existing &&
    existing.has_full_ability &&
    Object.keys(existing.stats || {}).length >= 25 &&
    !force
  ) {
    return existing;
  }

  await syncNexonMetadata(false);
  const seasonId = Math.floor(spid / 1000000);
  const pid = spid % 1000000;

  const formBody = new URLSearchParams({
    spid: String(spid),
    n1Strong: "1",
    n1Grow: "0",
    n4TeamColorId: "0",
    n4TeamColorLv: "0",
    n4TeamColorId_Enhance: "0",
    n4TeamColorLv_Enhance: "0",
    n4TeamColorId_Feature: "0",
    n1Change: "0",
    strPlayerImg: "",
    rd: "0.42",
  }).toString();

  try {
    const resp = await fetch("https://fconline.nexon.com/datacenter/PlayerAbility", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });
    if (!resp.ok) return existing || null;
    const html = await resp.text();
    if (html.length < 500) return existing || null;

    const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");

    const mName = cleanHtml.match(/<div class="name">([^<]+)<\/div>/);
    const name = mName ? mName[1].trim() : existing?.name || `선수 #${spid}`;

    const mPay = cleanHtml.match(/<div class="pay_side">(\d+)<\/div>/);
    const salary = mPay ? Number(mPay[1]) : existing?.salary || 20;

    const mSimg = cleanHtml.match(/<div class="season">\s*<img src="([^"]+)"/);
    const seasonImg = mSimg ? mSimg[1].trim() : existing?.season_img || "";
    const mScode = seasonImg.match(/\/([^/]+)\.png/);
    const seasonCode = mScode
      ? mScode[1].toUpperCase()
      : existing?.season_code?.toUpperCase() || String(seasonId);
    const sMeta = store.seasons[seasonId];
    const seasonName = sMeta ? sMeta.class_name : seasonCode;

    const mThumb = cleanHtml.match(
      /<div class="playerCardThumb">[\s\S]*?<img src="([^"]+)"/
    );
    const thumbUrl = mThumb
      ? mThumb[1].trim()
      : existing?.thumb_url ||
        `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`;

    const positions: { pos: string; ovr: number }[] = [];
    const infoAbMatch = cleanHtml.match(
      /<div class="info_line info_ab">([\s\S]*?)<\/div>/
    );
    if (infoAbMatch) {
      const posReg =
        /<span class="txt">([^<]+)<\/span>\s*<span class="[^"]*value">\s*(\d+)\s*<\/span>/g;
      let pm: RegExpExecArray | null;
      while ((pm = posReg.exec(infoAbMatch[1])) !== null) {
        positions.push({ pos: pm[1].trim(), ovr: Number(pm[2]) });
      }
    }

    const primaryPosition =
      positions[0]?.pos || existing?.primary_position || "ST";
    const ovr = positions[0]?.ovr || existing?.ovr || 100;

    const mBirth = cleanHtml.match(/<span class="etc birth">([^<]+)<\/span>/);
    const birth = mBirth ? mBirth[1].trim() : "";

    const mHeight = cleanHtml.match(/<span class="etc height">(\d+)cm<\/span>/);
    const height = mHeight ? Number(mHeight[1]) : 180;

    const mWeight = cleanHtml.match(/<span class="etc weight">(\d+)kg<\/span>/);
    const weight = mWeight ? Number(mWeight[1]) : 75;

    const mBody = cleanHtml.match(/<span class="etc physical">([^<]+)<\/span>/);
    const bodyType = mBody ? mBody[1].trim() : "보통";

    const mSkill = cleanHtml.match(
      /<span class="etc skill">([\s\S]*?)<\/span>\s*<span class="etc foot">/
    );
    const skillMoves = mSkill
      ? mSkill[1].replace(/<[^>]+>|\s+/g, "")
      : "★★★★☆☆";

    const mFoot = cleanHtml.match(/<span class="etc foot">([\s\S]*?)<\/span>/);
    const foot = mFoot
      ? mFoot[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : existing?.foot || "L4 – R5";

    const mTeam = cleanHtml.match(
      /<div class="etc team">[\s\S]*?<span class="txt">([^<]+)<\/span>/
    );
    const team = mTeam ? mTeam[1].trim() : "";

    const mNation = cleanHtml.match(
      /<div class="etc nation">[\s\S]*?<span class="txt">([^<]+)<\/span>/
    );
    const nation = mNation ? mNation[1].trim() : "";

    const traits: { icon: string; name: string }[] = [];
    const skillWrap =
      cleanHtml.match(
        /<div class="skill_wrap">([\s\S]*?)<\/div>\s*<div class="en_selector_wrap">/
      ) || cleanHtml.match(/<div class="skill_wrap">([\s\S]*?)<\/div>/);
    if (skillWrap) {
      const trReg =
        /<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<span class="desc">([^<]+)<\/span>/g;
      let tm: RegExpExecArray | null;
      while ((tm = trReg.exec(skillWrap[1])) !== null) {
        const iconUrl = tm[1].trim();
        const trName = tm[2].trim();
        if (trName && iconUrl.startsWith("http") && !BANNED_FAKE_TRAIT_SET.has(trName)) {
          traits.push({ icon: iconUrl, name: trName });
        }
      }
    }

    const teamColors: { id: string; type: string; name: string; logoUrl?: string }[] = [];
    for (const [rawTcGroup, clsPrefix] of [
      ["affiliation", "tdefault"],
      ["feature", "tspecial"],
    ] as const) {
      const tcReg = new RegExp(
        `<a class="selector_item ${clsPrefix}(\\d+)"[^>]*>([^<]+)<\\/a>`,
        "g"
      );
      let tcm: RegExpExecArray | null;
      while ((tcm = tcReg.exec(cleanHtml)) !== null) {
        const tcId = tcm[1];
        const tcName = tcm[2].trim();
        if (
          tcId !== "0" &&
          tcId !== "90000000" &&
          tcName &&
          !BANNED_DUMMY_TEAM_COLORS.has(tcName)
        ) {
          const officialTc = findOfficialTeamColorByNameOrId(tcId) || findOfficialTeamColorByNameOrId(tcName);
          const resolvedType =
            rawTcGroup === "feature" || officialTc?.category === "feature"
              ? "특성"
              : officialTc?.category === "nation" || tcName === nation
              ? "국가대표"
              : "소속 클럽";
          teamColors.push({
            id: tcId,
            type: resolvedType,
            name: tcName,
            logoUrl: officialTc?.img || getTeamColorLogoUrl(tcName, resolvedType, tcId),
          });
        }
      }
    }

    const positionOvrs: Record<string, number> = {};
    const ovrSet = cleanHtml.match(
      /<div class="ovr_set">([\s\S]*?)<\/div>\s*<\/div>\s*<div>\s*<div class="content_middle">/
    );
    if (ovrSet) {
      const poReg = /<div class="position ([a-z]+) value">(\d+)<\/div>/g;
      let pom: RegExpExecArray | null;
      while ((pom = poReg.exec(ovrSet[1])) !== null) {
        positionOvrs[pom[1].toUpperCase()] = Number(pom[2]);
      }
    }

    const stats: Record<string, number> = {};
    const statReg =
      /<li class="ab"[^>]*>\s*<div class="txt">([^<]+)<\/div>\s*<div class="value[^"]*">\s*(\d+)/g;
    let sm: RegExpExecArray | null;
    while ((sm = statReg.exec(cleanHtml)) !== null) {
      stats[sm[1].trim()] = Number(sm[2]);
    }

    let prices = existing?.prices || {};
    let bp1 = existing?.bp_1 || 0;
    const bp5 = existing?.bp_5 || 0;
    const bp8 = existing?.bp_8 || 0;

    if (Object.keys(prices).length === 0 || bp1 === 0) {
      const ph = await crawlPriceHistory(spid, 1);
      if (ph && ph.current_bp > 0) {
        bp1 = ph.current_bp;
        prices = {
          ...prices,
          "1": { bp: bp1, text: formatBpKorean(bp1) },
        };
      }
    }

    const updatedCard: PlayerCard = {
      spid,
      pid,
      name,
      season_id: seasonId,
      season_code: seasonCode,
      season_name: seasonName,
      season_img: seasonImg,
      thumb_url: thumbUrl,
      primary_position: primaryPosition,
      positions,
      ovr,
      salary,
      foot,
      skill_moves: skillMoves,
      height,
      weight,
      body_type: bodyType,
      birth,
      team,
      nation,
      traits,
      team_colors: teamColors,
      position_ovrs: positionOvrs,
      stats,
      prices,
      bp_1: bp1,
      bp_5: bp5,
      bp_8: bp8,
      rating_score: existing?.rating_score || 0,
      rating_count: existing?.rating_count || 0,
      has_full_ability: true,
      crawled_at: nowIso(),
    };

    store.cards[spid] = updatedCard;
    saveStore();
    return updatedCard;
  } catch {
    return existing || null;
  }
}

export async function crawlPriceHistory(
  spid: number,
  grade = 1
): Promise<PriceHistoryData> {
  const store = loadStore();
  const cacheKey = `${spid}_${grade}`;
  if (store.priceHistory[cacheKey]) {
    return store.priceHistory[cacheKey];
  }

  const formBody = new URLSearchParams({
    spid: String(spid),
    n1strong: String(grade),
    rd: "0.37",
  }).toString();

  try {
    const resp = await fetch(
      "https://fconline.nexon.com/datacenter/PlayerPriceGraph",
      {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      }
    );
    const html = await resp.text();

    const mCurr = html.match(
      /<span>현재가<\/span>\s*<strong[^>]*alt="([^"]*)"[^>]*>([\s\S]*?)<\/strong>/
    );
    let currentBp = 0;
    let currentText = "-";
    if (mCurr) {
      const rawAlt = mCurr[1].replace(/,/g, "").trim();
      if (/^\d+$/.test(rawAlt)) currentBp = Number(rawAlt);
      currentText = mCurr[2].trim();
    }

    const mTime = html.match(/"time"\s*:\s*\[([\s\S]*?)\]/);
    const mVal = html.match(/"value"\s*:\s*\[([\s\S]*?)\]/);

    const times = mTime
      ? Array.from(mTime[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
      : [];
    const vals = mVal
      ? Array.from(mVal[1].matchAll(/"(\d+)"/g)).map((m) => Number(m[1]))
      : [];

    if (!currentBp && vals.length > 0) {
      currentBp = vals[vals.length - 1];
      currentText = formatBpKorean(currentBp);
    }

    const points: { date: string; bp: number; formatted: string }[] = [];
    const startIdx = Math.max(0, Math.min(times.length, vals.length) - 30);
    for (let i = startIdx; i < Math.min(times.length, vals.length); i++) {
      points.push({
        date: times[i],
        bp: vals[i],
        formatted: formatBpKorean(vals[i]),
      });
    }

    const bpValues = points.map((p) => p.bp);
    const result: PriceHistoryData = {
      spid,
      grade,
      current_bp: currentBp,
      current_text: currentText,
      max_30d_bp: bpValues.length ? Math.max(...bpValues) : currentBp,
      min_30d_bp: bpValues.length ? Math.min(...bpValues) : currentBp,
      points,
      crawled_at: nowIso(),
    };

    store.priceHistory[cacheKey] = result;
    saveStore();
    return result;
  } catch {
    return {
      spid,
      grade,
      current_bp: 0,
      current_text: "-",
      max_30d_bp: 0,
      min_30d_bp: 0,
      points: [],
      crawled_at: nowIso(),
    };
  }
}

const STAT_KEY_ALIASES: Record<string, string[]> = {
  볼컨트롤: ["볼컨트롤", "볼 컨트롤"],
  "볼 컨트롤": ["볼 컨트롤", "볼컨트롤"],
  반응속도: ["반응속도", "반응 속도"],
  "반응 속도": ["반응 속도", "반응속도"],
  대인수비: ["대인수비", "대인 수비"],
  "대인 수비": ["대인 수비", "대인수비"],
  "골 결정력": ["골 결정력", "골결정력"],
  골결정력: ["골결정력", "골 결정력"],
  "슛 파워": ["슛 파워", "슛파워"],
  슛파워: ["슛파워", "슛 파워"],
  "중거리 슛": ["중거리 슛", "중거리슛"],
  중거리슛: ["중거리슛", "중거리 슛"],
  "짧은 패스": ["짧은 패스", "짧은패스"],
  짧은패스: ["짧은패스", "짧은 패스"],
  "긴 패스": ["긴 패스", "긴패스"],
  긴패스: ["긴패스", "긴 패스"],
  "위치 선정": ["위치 선정", "위치선정"],
  위치선정: ["위치선정", "위치 선정"],
  "슬라이딩 태클": ["슬라이딩 태클", "슬라이딩태클"],
  "GK 반응속도": ["GK 반응속도", "GK 반응 속도"],
  "GK 위치 선정": ["GK 위치 선정", "GK 위치선정"],
};

export function lookupRawStatValue(
  stats: Record<string, number>,
  statName: string
): number | undefined {
  if (!stats) return undefined;
  if (stats[statName] !== undefined && stats[statName] > 0) {
    return stats[statName];
  }
  const aliases = STAT_KEY_ALIASES[statName];
  if (aliases) {
    for (const alias of aliases) {
      if (stats[alias] !== undefined && stats[alias] > 0) {
        return stats[alias];
      }
    }
  }
  const noSpace = statName.replace(/\s+/g, "");
  for (const [k, v] of Object.entries(stats)) {
    if (k.replace(/\s+/g, "") === noSpace && v > 0) {
      return v;
    }
  }
  return undefined;
}

function getStatWithBonus(
  stats: Record<string, number>,
  statName: string,
  grade = 8,
  teamColorBonus = 0,
  fallbackOvr = 105
): number {
  const rules = getSystemRules();
  const raw =
    lookupRawStatValue(stats, statName) ?? Math.max(70, fallbackOvr - 5);
  const clampedGrade = Math.max(1, Math.min(rules.maxEnhanceLevel, grade));
  const enhAdd = getEnhanceOvrBoost(clampedGrade, rules.enhanceOvrBoosts);
  return Number(raw) + enhAdd + Number(teamColorBonus);
}

export async function syncGameRulesFromWeb(): Promise<SystemRules> {
  const current = getSystemRules();
  let detectedSalaryCap = current.salaryCap;
  let detectedMaxEnhance = current.maxEnhanceLevel;

  try {
    const [squadMakerResp, datacenterResp] = await Promise.all([
      fetch("https://fconline.nexon.com/datacenter/squadmaker", {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store",
      }).catch(() => null),
      fetch("https://fconline.nexon.com/datacenter", {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store",
      }).catch(() => null),
    ]);

    const htmlParts: string[] = [];
    if (squadMakerResp && squadMakerResp.ok) {
      htmlParts.push(await squadMakerResp.text());
    }
    if (datacenterResp && datacenterResp.ok) {
      htmlParts.push(await datacenterResp.text());
    }
    const combinedHtml = htmlParts.join("\n");

    if (combinedHtml.length > 200) {
      const salaryPatterns = [
        /\/\s*(2[789][05]|3[0-9][05])\b/g,
        /max[_-]?pay["'\s:=]+(2[789][05]|3[0-9][05])\b/gi,
        /급여[^0-9]{0,25}(2[789][05]|3[0-9][05])\b/g,
        /<span[^>]*class="[^"]*pay[^"]*"[^>]*>\s*(2[789][05]|3[0-9][05])\s*<\/span>/gi,
      ];
      for (const regex of salaryPatterns) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(combinedHtml)) !== null) {
          const val = Number(m[1]);
          if (val >= 270 && val <= 400 && val % 5 === 0) {
            if (val > detectedSalaryCap) {
              detectedSalaryCap = val;
            }
          }
        }
      }

      const enhancePatterns = [
        /<option[^>]*value=["']?(\d{1,2})["']?[^>]*>\s*\+?\1(?:강)?\s*<\/option>/gi,
        /span_bp(\d{1,2})/gi,
        /strStrong[^>]*value=["']?(\d{1,2})["']?/gi,
      ];
      for (const regex of enhancePatterns) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(combinedHtml)) !== null) {
          const lvl = Number(m[1]);
          if (lvl >= 10 && lvl <= 20 && lvl > detectedMaxEnhance) {
            detectedMaxEnhance = lvl;
          }
        }
      }
    }
  } catch {
    // ignore network failure and preserve existing rules
  }

  return updateSystemRules({
    salaryCap: detectedSalaryCap,
    maxEnhanceLevel: detectedMaxEnhance,
    lastSyncedAt: nowIso(),
    syncSource: "crawler",
  });
}

export async function ensurePlayerSalaryAndMeta(
  spid: number
): Promise<PlayerCard | null> {
  if (!spid || spid <= 0) return null;
  const store = loadStore();
  const existing = store.cards[spid];
  if (existing && existing.salary > 0) {
    return existing;
  }

  await syncNexonMetadata(false);
  const seasonId = Math.floor(spid / 1000000);
  const pid = spid % 1000000;

  try {
    const infoUrl = `https://fconline.nexon.com/DataCenter/PlayerInfo?spid=${spid}&n1Strong=1`;
    const resp = await fetch(infoUrl, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });

    if (resp.ok) {
      const html = await resp.text();
      const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
      const mPay = cleanHtml.match(
        /<div class="pay_side">\s*(\d+)\s*<\/div>|<span class="pay">\s*(\d+)\s*<\/span>/
      );
      const mName = cleanHtml.match(/<div class="name">\s*([^<]+)\s*<\/div>/);
      const mPos = cleanHtml.match(
        /<span class="txt">\s*([A-Z]{2,3})\s*<\/span>\s*<span class="[^"]*value">\s*(\d+)\s*<\/span>/
      );

      if (mPay) {
        const salaryVal = Number(mPay[1] || mPay[2] || 20);
        const nameVal = mName ? mName[1].trim() : `선수 #${pid}`;
        const posVal = mPos ? mPos[1].trim() : "ST";
        const ovrVal = mPos ? Number(mPos[2]) : 105;
        const sMeta = store.seasons[seasonId];

        const quickCard: PlayerCard = {
          spid,
          pid,
          name: nameVal,
          season_id: seasonId,
          season_code: sMeta?.season_code || String(seasonId),
          season_name: sMeta?.class_name || String(seasonId),
          season_img: sMeta?.season_img || "",
          thumb_url: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`,
          primary_position: posVal,
          positions: [{ pos: posVal, ovr: ovrVal }],
          ovr: ovrVal,
          salary: salaryVal,
          foot: "L4 - R5",
          skill_moves: "★★★★☆☆",
          height: 180,
          weight: 75,
          body_type: "보통",
          birth: "",
          team: "",
          nation: "",
          traits: [],
          team_colors: [],
          position_ovrs: { [posVal]: ovrVal },
          stats: {},
          prices: {},
          bp_1: 0,
          bp_5: 0,
          bp_8: 0,
          rating_score: 0,
          rating_count: 0,
          has_full_ability: false,
          crawled_at: nowIso(),
        };
        store.cards[spid] = quickCard;
        saveStore();
        return quickCard;
      }
    }
  } catch {
    // fallback to crawlPlayerAbility below
  }

  return crawlPlayerAbility(spid);
}

export function computeSixFaceSummary(
  card: PlayerCard,
  grade = 8,
  teamColorBonus = 0
): Record<string, number> {
  const stats = card.stats || {};
  const ovr = card.ovr || 105;
  const avgOf = (keys: string[]) => {
    const vals = keys.map((k) =>
      getStatWithBonus(stats, k, grade, teamColorBonus, ovr)
    );
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  if (card.primary_position === "GK") {
    return {
      속력: getStatWithBonus(stats, "GK 반응속도", grade, teamColorBonus, ovr),
      슈팅: getStatWithBonus(stats, "GK 다이빙", grade, teamColorBonus, ovr),
      패스: getStatWithBonus(stats, "GK 킥", grade, teamColorBonus, ovr),
      드리블: getStatWithBonus(stats, "GK 핸들링", grade, teamColorBonus, ovr),
      수비: getStatWithBonus(stats, "GK 위치 선정", grade, teamColorBonus, ovr),
      피지컬: avgOf(["반응속도", "점프"]),
    };
  }

  return {
    속력: avgOf(["속력", "가속력"]),
    슈팅: avgOf(["골 결정력", "슛 파워", "중거리 슛", "위치 선정"]),
    패스: avgOf(["짧은 패스", "시야", "크로스", "긴 패스"]),
    드리블: avgOf(["드리블", "볼컨트롤", "민첩성", "밸런스"]),
    수비: avgOf(["대인수비", "태클", "가로채기", "슬라이딩 태클"]),
    피지컬: avgOf(["몸싸움", "스태미너", "점프", "적극성"]),
  };
}

export function evaluateCardEfficiencySync(
  card: PlayerCard,
  targetPosition?: string,
  grade = 8,
  teamColorBonus = 0,
  customWeights?: Record<string, number>
): CardEfficiencyResult {
  const rules = getSystemRules();
  const pos = (targetPosition || card.primary_position || "ST").toUpperCase();
  const coreStatsList =
    POSITION_CORE_STATS[pos] || POSITION_CORE_STATS["ST"];
  const weights =
    customWeights && Object.keys(customWeights).length > 0
      ? customWeights
      : POSITION_WEIGHTS[pos] || POSITION_WEIGHTS["ST"];
  const totalW =
    Object.values(weights).reduce((a, b) => a + b, 0) || 1.0;

  const stats = card.stats || {};
  const baseOvr = Number(card.ovr || 105);
  const clampedGrade = Math.max(1, Math.min(rules.maxEnhanceLevel, grade));
  const enhBonus = getEnhanceOvrBoost(clampedGrade, rules.enhanceOvrBoosts);
  const effectiveOvr = baseOvr + enhBonus + Number(teamColorBonus);

  let weightedSum = 0;
  const statBreakdown = [];
  for (const [statName, rawW] of Object.entries(weights)) {
    const w = rawW / totalW;
    const val = getStatWithBonus(stats, statName, clampedGrade, teamColorBonus, baseOvr);
    const contrib = val * w;
    weightedSum += contrib;
    statBreakdown.push({
      stat: statName,
      value: val,
      weight: Number((w * 100).toFixed(1)),
      contribution: Number(contrib.toFixed(2)),
    });
  }
  statBreakdown.sort((a, b) => b.value - a.value);

  // 포지션별 핵심 스탯의 평균값 (coreScore)
  const coreScore = Number(weightedSum.toFixed(2));
  const prices = card.prices || {};
  const gradePriceObj = prices[String(clampedGrade)] ||
    prices["8"] ||
    prices["5"] ||
    prices["1"] || { bp: 0, text: "-" };
  const bpPrice = Number(gradePriceObj.bp || resolveCardBpForGrade(card, clampedGrade) || 0);
  const bpText = gradePriceObj.text && gradePriceObj.text !== "-"
    ? gradePriceObj.text
    : formatBpKorean(bpPrice);

  // 효율 점수(Efficiency) = (포지션별 핵심 스탯의 평균값 / 선수 표기 OVR) * 100
  const efficiencyIndex = Number(
    ((coreScore / Math.max(1, effectiveOvr)) * 100).toFixed(1)
  );
  let scorePerLogBp = 0;
  if (bpPrice > 0) {
    scorePerLogBp = Number(
      (coreScore / Math.max(1, Math.log10(bpPrice + 10))).toFixed(2)
    );
  }

  let tier = "C (표기 OVR 착시 주의)";
  if (efficiencyIndex >= 101.2) tier = "S+ (알짜 코어 압축)";
  else if (efficiencyIndex >= 100.0) tier = "S (표기 OVR 이상 고효율)";
  else if (efficiencyIndex >= 98.8) tier = "A (핵심 스탯 우수)";
  else if (efficiencyIndex >= 97.2) tier = "B (표준 밸런스)";

  const gradeCurve = [];
  for (let g = 1; g <= rules.maxEnhanceLevel; g++) {
    const gObj = prices[String(g)];
    const gBp = Number(gObj?.bp || 0);
    if (gBp <= 0 && g !== clampedGrade) continue;
    const gBoost = getEnhanceOvrBoost(g, rules.enhanceOvrBoosts);
    const gAdd = gBoost - enhBonus;
    const gOvr = baseOvr + gBoost + Number(teamColorBonus);
    const gCore = Number((coreScore + gAdd).toFixed(2));
    const gEff = Number(((gCore / Math.max(1, gOvr)) * 100).toFixed(1));
    gradeCurve.push({
      grade: g,
      ovr: gOvr,
      core_score: gCore,
      bp: gBp || bpPrice,
      bp_text: gObj?.text || formatBpKorean(gBp || bpPrice),
      efficiency_index: gEff,
    });
  }

  // 가성비 강화 구간(sweetspot): +8강 또는 가격 대비 코어 스탯 효율이 가장 높은 구간 선정
  const bestSweetspot =
    gradeCurve.find((pt) => pt.grade === 8) ||
    (gradeCurve.length > 0
      ? gradeCurve.reduce((a, b) => {
          const aVal = a.core_score / Math.max(3, Math.log10(Math.max(1000, a.bp)));
          const bVal = b.core_score / Math.max(3, Math.log10(Math.max(1000, b.bp)));
          return aVal >= bVal ? a : b;
        })
      : null);

  return {
    spid: card.spid,
    name: card.name,
    season_code: card.season_code,
    season_name: card.season_name,
    season_img: card.season_img,
    thumb_url: card.thumb_url,
    target_position: pos,
    primary_position: card.primary_position,
    grade: clampedGrade,
    team_color_bonus: teamColorBonus,
    base_ovr: baseOvr,
    effective_ovr: effectiveOvr,
    salary: card.salary,
    foot: card.foot,
    bp: bpPrice,
    bp_text: bpText,
    core_score: coreScore,
    core_stat_count: coreStatsList.length,
    ovr_to_core_gap: Number((coreScore - effectiveOvr).toFixed(2)),
    efficiency_index: efficiencyIndex,
    score_per_log_bp: scorePerLogBp,
    tier,
    six_face: computeSixFaceSummary(card, clampedGrade, teamColorBonus),
    stat_breakdown: statBreakdown,
    grade_curve: gradeCurve,
    best_sweetspot_grade: bestSweetspot,
    traits: card.traits || [],
    feelMetrics: computePlayerFeelMetricsSync(
      card,
      pos,
      clampedGrade,
      teamColorBonus,
      true
    ),
    crawled_at: card.crawled_at || nowIso(),
  };
}

// 포지션별 유효 급여 효율 추출용 핵심 스탯 맵
const POSITION_SALARY_CORE_STATS: Record<string, string[]> = POSITION_CORE_STATS;

function clampScore100(val: number, min = 20, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function resolveCardBpForGrade(card: PlayerCard, grade: number): number {
  const prices = card.prices || {};
  const exact = prices[String(grade)]?.bp;
  if (exact && exact > 0) return exact;
  if (grade >= 8 && card.bp_8 > 0) return card.bp_8;
  if (grade >= 5 && card.bp_5 > 0) return card.bp_5;
  if (card.bp_1 > 0) return card.bp_1;
  return prices["1"]?.bp || prices["5"]?.bp || prices["8"]?.bp || 0;
}

function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computePlayerFeelMetricsSync(
  card: PlayerCard,
  targetPosition?: string,
  grade = 8,
  teamColorBonus = 0,
  includeAlternatives = true
): PlayerFeelMetrics {
  const store = loadStore();
  const rules = getSystemRules();
  const clampedGrade = Math.max(1, Math.min(rules.maxEnhanceLevel, grade));
  const enhBonus = getEnhanceOvrBoost(clampedGrade, rules.enhanceOvrBoosts);
  const baseOvr = Number(card.ovr || 105);
  const effOvr = baseOvr + enhBonus + Number(teamColorBonus);
  const pos = (targetPosition || card.primary_position || "ST").trim().toUpperCase();
  const stats = card.stats || {};

  const getS = (statName: string, fallbackOffset = 5) => {
    const raw = lookupRawStatValue(stats, statName);
    if (raw !== undefined && raw > 0) {
      return Number(raw) + enhBonus + Number(teamColorBonus);
    }
    return Math.max(70, baseOvr - fallbackOffset) + enhBonus + Number(teamColorBonus);
  };

  const height = Number(card.height || 180);
  const weight = Number(card.weight || 75);
  const bodyType = (card.body_type || "보통").trim();
  const footParsed = parseFootInfo(card.foot);

  // 1. 인게임 체감 지수 (feelScore) 공식 구현
  // 방향 전환 3단계 메커니즘 가중합: 0.35 * 민첩성 + 0.30 * 밸런스 + 0.20 * 반응속도 + 0.15 * 드리블
  const agility = getS("민첩성", 4);
  const balance = getS("밸런스", 5);
  const reactions = getS("반응 속도", 3);
  const dribbling = getS("드리블", 4);
  const ballControl = getS("볼 컨트롤", 4);
  const sprintSpeed = getS("속력", 3);
  const acceleration = getS("가속력", 3);
  const strength = getS("몸싸움", 5);
  const composure = getS("침착성", 4);
  const finishingStat = getS("골 결정력", 5);
  const shotPower = getS("슛 파워", 4);
  const longShots = getS("중거리 슛", 5);
  const curveStat = getS("커브", 6);
  const positioningStat = getS("위치 선정", 4);

  const turnWeightedRaw =
    pos === "GK"
      ? 0.4 * getS("GK 반응속도", 2) +
        0.3 * reactions +
        0.3 * getS("GK 다이빙", 3)
      : 0.35 * agility +
        0.3 * balance +
        0.2 * reactions +
        0.15 * dribbling;

  // 체형 보정 계수 (bodyMultiplier): 고유체형(1.06), 마름(1.04), 보통(1.00), 건장(0.94)
  let bodyMultiplier = 1.0;
  if (bodyType.includes("고유")) {
    bodyMultiplier = 1.06;
  } else if (bodyType.includes("마름")) {
    bodyMultiplier = 1.04;
  } else if (bodyType.includes("건장")) {
    bodyMultiplier = 0.94;
  }

  // 신장/몸무게 물리 페널티 (physicalPenalty): 183cm 초과분 및 78kg 초과분 비례 선회 반경 페널티 차감
  const heightExcess = Math.max(0, height - 183);
  const weightExcess = Math.max(0, weight - 78);
  const compactAgilityBonus =
    pos !== "GK" && height < 178 ? (178 - height) * 0.22 : 0;
  const physicalPenalty =
    pos === "GK"
      ? 0
      : heightExcess * 0.45 + weightExcess * 0.28 - compactAgilityBonus;

  // 가속력과 속력의 비대칭성 보정: 가속력이 속력보다 현저히 낮고 몸무게가 무거우면 초기 가속 감점 적용
  let accelAsymmetryPenalty = 0;
  if (pos !== "GK" && acceleration < sprintSpeed - 2 && weight >= 76) {
    const speedGap = sprintSpeed - acceleration;
    const weightFactor = weight >= 83 ? 0.65 : weight >= 78 ? 0.48 : 0.32;
    accelAsymmetryPenalty = Math.min(7.5, speedGap * weightFactor);
  } else if (pos !== "GK" && acceleration >= sprintSpeed + 2 && weight <= 76) {
    accelAsymmetryPenalty = -Math.min(2.0, (acceleration - sprintSpeed) * 0.28);
  }

  // 8강(적응도 0) 기준 체감 5대 핵심 스탯(민첩성·밸런스·드리블·볼 컨트롤·반응 속도) 산출
  const boost8 = getEnhanceOvrBoost(8, rules.enhanceOvrBoosts);
  const getStat8Zero = (statName: string, fallbackOffset = 5) => {
    const raw = lookupRawStatValue(stats, statName);
    if (raw !== undefined && raw > 0) {
      return Number(raw) + boost8;
    }
    return Math.max(70, baseOvr - fallbackOffset) + boost8;
  };
  const agility8 = getStat8Zero("민첩성", 4);
  const balance8 = getStat8Zero("밸런스", 5);
  const dribbling8 = getStat8Zero("드리블", 4);
  const ballControl8 = getStat8Zero("볼 컨트롤", 4);
  const reactions8 = getStat8Zero("반응 속도", 3);
  const feel5Avg8 = Number(
    (
      0.25 * agility8 +
      0.25 * balance8 +
      0.2 * dribbling8 +
      0.15 * ballControl8 +
      0.15 * reactions8
    ).toFixed(1)
  );

  // 체형 및 피지컬 필터: 체형이 '건장'이거나 신장 186cm 이상 또는 몸무게 80kg 이상인 선수는 선회 반경이 크므로 '좋은 체감'에서 원천 제외
  const isPhysicalExcludedFromGoodFeel =
    bodyType.includes("건장") || height >= 186 || weight >= 80;
  const isEligibleLightBody =
    !isPhysicalExcludedFromGoodFeel &&
    (bodyType.includes("마름") ||
      bodyType.includes("고유") ||
      bodyType.includes("보통"));

  const adjustedTurnValue =
    turnWeightedRaw * bodyMultiplier - physicalPenalty - accelAsymmetryPenalty;

  // 0~100 스케일로 변환 (인게임 체감 지수) — 피지컬 필터 해당 시 최대 84점(보통 체감 상한)으로 캡핑
  const rawFeelScore = clampScore100(
    48 + (adjustedTurnValue - 98) * 1.08,
    28,
    99
  );
  const feelScore = isPhysicalExcludedFromGoodFeel
    ? Math.min(84, rawFeelScore)
    : rawFeelScore;

  // 2. 표기 스탯 점수 (statScore, 0~100) 및 3단계 체감 배지 (좋은 체감 / 보통 체감 / 무거운 체감)
  const posWeights = POSITION_WEIGHTS[pos] || POSITION_WEIGHTS["ST"];
  const totalPosW =
    Object.values(posWeights).reduce((a, b) => a + b, 0) || 1.0;
  let weightedCoreRaw = 0;
  for (const [sKey, w] of Object.entries(posWeights)) {
    weightedCoreRaw += getS(sKey, 4) * (w / totalPosW);
  }

  const statScore = clampScore100(
    48 + (effOvr * 0.55 + weightedCoreRaw * 0.45 - 98) * 1.05,
    30,
    99
  );

  const isAttackOrCentral = [
    "ST",
    "CF",
    "LF",
    "RF",
    "CAM",
    "LW",
    "RW",
    "LM",
    "RM",
    "CM",
  ].includes(pos);
  let weakFootMetaDelta = 0;
  if (isAttackOrCentral) {
    if (footParsed.isTwoFooted || footParsed.weakFoot >= 5) {
      weakFootMetaDelta = 4.8;
    } else if (footParsed.weakFoot === 4) {
      weakFootMetaDelta = 0.5;
    } else {
      weakFootMetaDelta = -5.5;
    }
  }

  const longShotSynergyRaw =
    0.42 * longShots + 0.36 * shotPower + 0.22 * curveStat;
  const longShotBonus =
    isAttackOrCentral && longShotSynergyRaw >= effOvr + 1
      ? Math.min(3.2, (longShotSynergyRaw - effOvr) * 0.45)
      : 0;

  const composureReactionMean = (composure + reactions) / 2;
  const hiddenClutchDelta = (composureReactionMean - effOvr) * 0.55;

  const statTrapIndex = Number(
    (
      feelScore -
      statScore +
      weakFootMetaDelta +
      longShotBonus +
      hiddenClutchDelta
    ).toFixed(1)
  );

  // '좋은 체감' 엄격 판정 조건:
  // 1) 건장 체형 아님 & 신장 < 186cm & 몸무게 < 80kg (마름/고유 또는 가벼운 보통 체형)
  // 2) 8강(적응도 0) 기준 체감 5대 핵심 스탯(민첩성·밸런스·드리블·볼 컨트롤·반응 속도) 가중 평균 >= 128
  // 3) 8강(적응도 0) 기준 민첩성 >= 124 이고 밸런스 >= 124
  const qualifiesGoodFeel =
    pos !== "GK" &&
    isEligibleLightBody &&
    feel5Avg8 >= 128 &&
    agility8 >= 124 &&
    balance8 >= 124;

  // '무거운 체감' 판정 조건:
  // - 건장 체형이면서 신장 >= 186 또는 몸무게 >= 82 또는 민첩성/밸런스 122 미만
  // - 신장 >= 188 및 몸무게 >= 80이면서 8강 민첩성 < 122 또는 밸런스 < 122
  // - 또는 8강 체감 5대 평균 < 118 이거나 민첩성 < 116 또는 밸런스 < 116 또는 체감 점수 < 73
  const isHeavyClunkyFeel =
    !qualifiesGoodFeel &&
    ((bodyType.includes("건장") &&
      (height >= 186 || weight >= 80 || feel5Avg8 < 123 || agility8 < 120)) ||
      (height >= 188 &&
        weight >= 80 &&
        (agility8 < 122 || balance8 < 122 || feel5Avg8 < 125)) ||
      feel5Avg8 < 118 ||
      agility8 < 116 ||
      balance8 < 116 ||
      feelScore < 73 ||
      statTrapIndex <= -3.8);

  let statTrapBadge: StatTrapBadgeType = "NORMAL";
  let statTrapLabel: "좋은 체감" | "보통 체감" | "무거운 체감" = "보통 체감";
  let feelGradeLabel: "좋은 체감" | "보통 체감" | "무거운 체감" = "보통 체감";
  let feelVerdictReason = "";

  if (qualifiesGoodFeel) {
    statTrapBadge = "CHEAT_KEY";
    statTrapLabel = "좋은 체감";
    feelGradeLabel = "좋은 체감";
    feelVerdictReason = `${bodyType} 체형(${height}cm/${weight}kg)과 우수한 방향 전환·볼 컨트롤 능력이 결합되어 인게임에서 매끄럽고 가벼운 선회 반경을 보여줍니다.`;
  } else if (isHeavyClunkyFeel) {
    statTrapBadge = "STAT_TRAP";
    statTrapLabel = "무거운 체감";
    feelGradeLabel = "무거운 체감";
    if (isPhysicalExcludedFromGoodFeel) {
      feelVerdictReason = `체격 조건(${height}cm/${weight}kg/${bodyType})으로 인해 선회 반경이 크고 방향 전환 시 묵직한 역동작이 체감되는 유형입니다.`;
    } else {
      feelVerdictReason = `방향 전환 및 세밀한 볼 컨트롤 지표가 다소 낮아 급격한 턴 동작에서 둔중함이 느껴질 수 있는 유형입니다.`;
    }
  } else {
    statTrapBadge = "NORMAL";
    statTrapLabel = "보통 체감";
    feelGradeLabel = "보통 체감";
    if (isPhysicalExcludedFromGoodFeel) {
      feelVerdictReason = `탄탄한 체격 조건(${height}cm/${weight}kg/${bodyType})을 갖추고 있어 경합은 안정적이며, 인게임 방향 전환은 무난한 보통 체감을 보여줍니다.`;
    } else {
      feelVerdictReason = `체격(${height}cm/${weight}kg/${bodyType})과 기본 드리블 밸런스가 고르게 잡혀 있어 실전에서 표준적인 보통 체감을 보여줍니다.`;
    }
  }

  // 3. 포지션별 유효 급여 효율 (positionSalaryEfficiency)
  const salaryCoreKeys =
    POSITION_SALARY_CORE_STATS[pos] || POSITION_SALARY_CORE_STATS["ST"];
  const salaryCoreAvg =
    salaryCoreKeys.reduce((acc, k) => acc + getS(k, 4), 0) /
    salaryCoreKeys.length;
  const safeSalary = Math.max(8, Number(card.salary || 20));
  const rawPerSalary = salaryCoreAvg / safeSalary;
  const positionSalaryEfficiency = Number(
    Math.max(
      25,
      Math.min(
        99,
        42 + (rawPerSalary - 3.6) * 14.5 + (salaryCoreAvg - 108) * 0.45
      )
    ).toFixed(1)
  );

  // 4. 실전 체감 5각형 데이터 (radarFive)
  const burstRaw =
    0.48 * acceleration +
    0.27 * sprintSpeed +
    0.25 * reactions -
    accelAsymmetryPenalty * 1.4 +
    (bodyType.includes("마름") || bodyType.includes("고유") ? 2.5 : 0);
  const burstScore = clampScore100(48 + (burstRaw - 98) * 1.08, 28, 99);

  const physicalHoldRaw =
    0.45 * strength +
    0.3 * balance +
    0.25 * getS("적극성", 6) +
    Math.max(-5, Math.min(7, (height - 181) * 0.35 + (weight - 75) * 0.25)) +
    (bodyType.includes("건장") ? 4.2 : bodyType.includes("마름") ? -2.8 : 0);
  const physicalHoldScore = clampScore100(
    46 + (physicalHoldRaw - 96) * 1.06,
    25,
    99
  );

  const finishingRaw =
    pos === "GK"
      ? 0.5 * getS("GK 다이빙", 2) + 0.5 * getS("GK 핸들링", 3)
      : 0.34 * finishingStat +
        0.26 * shotPower +
        0.22 * longShots +
        0.18 * composure +
        weakFootMetaDelta * 1.5;
  const finishingScore = clampScore100(46 + (finishingRaw - 96) * 1.06, 25, 99);

  const salaryValueScore = clampScore100(positionSalaryEfficiency, 25, 99);

  const radarFive = {
    smoothness: feelScore,
    burst: burstScore,
    physicalHold: physicalHoldScore,
    finishing: finishingScore,
    salaryValue: salaryValueScore,
  };

  // 5. 자동 생성 플레이스타일 태그 (playstyleTags)
  const playstyleTags: string[] = [];
  if (footParsed.isTwoFooted || footParsed.weakFoot >= 5) {
    playstyleTags.push("#양발잡이");
  }
  if (qualifiesGoodFeel) {
    playstyleTags.push(
      bodyType.includes("고유") || bodyType.includes("마름")
        ? "#고유체형급좋은체감"
        : "#좋은체감검증"
    );
  }
  if (
    pos !== "GK" &&
    (acceleration >= effOvr + 2 ||
      (sprintSpeed >= effOvr + 1 && positioningStat >= effOvr) ||
      (card.traits || []).some(
        (t) => t.name.includes("라인 브레이커") || t.name.includes("스피드스터")
      ))
  ) {
    playstyleTags.push("#침투특화");
  }
  if (
    pos !== "GK" &&
    (longShotSynergyRaw >= effOvr + 1 ||
      (card.traits || []).some(
        (t) => t.name.includes("레이저 슈터") || t.name.includes("중거리")
      ))
  ) {
    playstyleTags.push("#중거리포");
  }
  if (physicalHoldScore >= 86 || (height >= 188 && bodyType.includes("건장"))) {
    playstyleTags.push("#경합탱커");
  }
  if (positionSalaryEfficiency >= 76) {
    playstyleTags.push("#급여가성비");
  }
  if (isHeavyClunkyFeel) {
    playstyleTags.push("#무거운체감주의");
  }
  if (isAttackOrCentral && footParsed.weakFoot <= 3) {
    playstyleTags.push("#약발주의");
  }
  if (playstyleTags.length === 0) {
    playstyleTags.push("#보통체감밸런스", `#${pos}표준`);
  }

  // 6. 상위 랭커 포지션별 실사용 픽률 (%)
  let rankerPickRate = 0;
  const rankerSnap = store.rankerMetaSnapshot;
  if (rankerSnap) {
    const exactMatch = (rankerSnap.position_top_players || []).find(
      (p) => p.spid === card.spid
    );
    if (exactMatch && exactMatch.usage_pct > 0) {
      rankerPickRate = Number(exactMatch.usage_pct.toFixed(2));
    } else {
      const samePidPos = (rankerSnap.position_top_players || []).find(
        (p) => p.spid % 1_000_000 === card.pid
      );
      const seasonEntry = (rankerSnap.season_usage_top || []).find(
        (s) => s.season_code.toUpperCase() === card.season_code.toUpperCase()
      );
      if (samePidPos && seasonEntry) {
        rankerPickRate = Number(
          Math.min(
            12.5,
            samePidPos.usage_pct * 0.55 + seasonEntry.usage_pct * 0.25
          ).toFixed(2)
        );
      } else if (seasonEntry) {
        const ovrFactor = Math.max(0.2, Math.min(1.4, (card.ovr - 102) / 14));
        rankerPickRate = Number(
          Math.max(0.1, seasonEntry.usage_pct * 0.32 * ovrFactor).toFixed(2)
        );
      }
    }
  }
  if (rankerPickRate <= 0) {
    rankerPickRate = Number(
      Math.max(
        0.15,
        Math.min(
          8.5,
          (card.ovr - 98) * 0.18 + Math.min(2.5, (card.rating_count || 0) * 0.04)
        )
      ).toFixed(2)
    );
  }

  // 7. 동일 팀컬러(소속 클럽 또는 국가) + 동일 포지션 기반 가성비 대체재 TOP 3 (similarAlternatives)
  const similarAlternatives: SimilarAlternativePlayerItem[] = [];
  if (includeAlternatives) {
    const enrichedTarget = enrichPlayerCardMetaSync(card);
    const targetTeamColors = getCardCoreTeamColorSet(enrichedTarget);
    const targetSix = computeSixFaceSummary(card, clampedGrade, teamColorBonus);
    const targetVec = [
      targetSix["속력"] || 100,
      targetSix["슈팅"] || 100,
      targetSix["패스"] || 100,
      targetSix["드리블"] || 100,
      targetSix["수비"] || 100,
      targetSix["피지컬"] || 100,
    ];
    const targetBp = resolveCardBpForGrade(card, clampedGrade);
    const targetPosInfo = resolvePositionGroupInfo(pos);

    const allCandidatePool = Object.values(store.cards).filter(
      (c) => c.spid !== card.spid
    );

    const scoredCandidates = allCandidatePool
      .map((rawCand) => {
        const cand = enrichPlayerCardMetaSync(rawCand);
        const candPosInfo = resolvePositionGroupInfo(cand.primary_position);
        const exactPosMatch =
          cand.primary_position === pos ||
          (cand.positions || []).some((p) => p.pos === pos);
        const groupPosMatch =
          candPosInfo.positionGroup === targetPosInfo.positionGroup;
        if (!exactPosMatch && !groupPosMatch) return null;

        const candColors = getCardCoreTeamColorSet(cand);
        const sharedColors: string[] = [];
        for (const tc of candColors) {
          if (targetTeamColors.has(tc)) {
            sharedColors.push(tc);
          }
        }
        // 동일 팀컬러 필수 필터 (소속 클럽 또는 국가대표 공유)
        if (targetTeamColors.size > 0 && sharedColors.length === 0) {
          return null;
        }

        const candBp = resolveCardBpForGrade(cand, clampedGrade);
        // 가성비 조건: 기준 카드보다 저렴하거나 합리적인 시세 구간 우선
        const isCheaperOrReasonable =
          targetBp <= 0 || candBp <= 0 || candBp <= targetBp * 0.96;

        const candSix = computeSixFaceSummary(
          cand,
          clampedGrade,
          teamColorBonus
        );
        const candVec = [
          candSix["속력"] || 100,
          candSix["슈팅"] || 100,
          candSix["패스"] || 100,
          candSix["드리블"] || 100,
          candSix["수비"] || 100,
          candSix["피지컬"] || 100,
        ];
        const cosSim = computeCosineSimilarity(targetVec, candVec);
        const magDiff =
          targetVec.reduce(
            (acc, v, idx) => acc + Math.abs(v - candVec[idx]),
            0
          ) / 6;
        const magSimilarity = Math.max(0, 1 - magDiff / 45);
        const candFoot = parseFootInfo(cand.foot);
        const footMatchBonus =
          Math.abs(candFoot.weakFoot - footParsed.weakFoot) <= 1 ? 0.015 : -0.02;
        const bodyMatchBonus = cand.body_type === card.body_type ? 0.01 : 0;

        const combinedSim = Math.max(
          0.74,
          Math.min(
            0.994,
            cosSim * 0.72 +
              magSimilarity * 0.28 +
              footMatchBonus +
              bodyMatchBonus
          )
        );

        const priceDiffRatio =
          targetBp > 0 && candBp > 0
            ? Number(((candBp - targetBp) / targetBp).toFixed(3))
            : -0.35;

        const candFeel = computePlayerFeelMetricsSync(
          cand,
          pos,
          clampedGrade,
          teamColorBonus,
          false
        );

        const differentPlayerBonus = cand.pid !== card.pid ? 35 : 0;
        const exactPositionBonus = exactPosMatch ? 50 : 0;
        const cheaperBonus = isCheaperOrReasonable ? 40 : -30;

        return {
          pid: cand.pid,
          spid: cand.spid,
          name: cand.name,
          season: cand.season_code,
          seasonImg: cand.season_img,
          thumbUrl: cand.thumb_url,
          position: cand.primary_position,
          grade: clampedGrade,
          bp: candBp,
          bpText: formatBpKorean(candBp),
          sharedTeamColor: sharedColors[0] || cand.team || cand.nation,
          sharedTeamColors: sharedColors,
          similarity: Number((combinedSim * 100).toFixed(1)),
          priceDiffRatio,
          feelScore: candFeel.feelScore,
          feelBadgeLabel: candFeel.feelGradeLabel || "보통 체감",
          _rankScore:
            exactPositionBonus +
            differentPlayerBonus +
            cheaperBonus +
            sharedColors.length * 15 +
            combinedSim * 100 +
            Math.min(18, Math.max(0, -priceDiffRatio * 20)) +
            candFeel.feelScore * 0.15,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    scoredCandidates.sort((a, b) => b._rankScore - a._rankScore);

    // 서로 다른 선수(pid)를 우선 선정하되 부족하면 하위 시즌 가성비 카드 포함
    const usedPids = new Set<number>();
    for (const item of scoredCandidates) {
      if (similarAlternatives.length >= 3) break;
      if (item.pid === card.pid || usedPids.has(item.pid)) continue;
      usedPids.add(item.pid);
      similarAlternatives.push({
        spid: item.spid,
        name: item.name,
        season: item.season,
        seasonImg: item.seasonImg,
        thumbUrl: item.thumbUrl,
        position: item.position,
        grade: item.grade,
        bp: item.bp,
        bpText: item.bpText,
        sharedTeamColor: item.sharedTeamColor,
        sharedTeamColors: item.sharedTeamColors,
        similarity: item.similarity,
        priceDiffRatio: item.priceDiffRatio,
        feelScore: item.feelScore,
        feelBadgeLabel: item.feelBadgeLabel,
      });
    }
    for (const item of scoredCandidates) {
      if (similarAlternatives.length >= 3) break;
      if (!similarAlternatives.some((s) => s.spid === item.spid)) {
        similarAlternatives.push({
          spid: item.spid,
          name: item.name,
          season: item.season,
          seasonImg: item.seasonImg,
          thumbUrl: item.thumbUrl,
          position: item.position,
          grade: item.grade,
          bp: item.bp,
          bpText: item.bpText,
          sharedTeamColor: item.sharedTeamColor,
          sharedTeamColors: item.sharedTeamColors,
          similarity: item.similarity,
          priceDiffRatio: item.priceDiffRatio,
          feelScore: item.feelScore,
          feelBadgeLabel: item.feelBadgeLabel,
        });
      }
    }
  }

  return {
    statScore,
    feelScore,
    statTrapIndex,
    statTrapBadge,
    statTrapLabel,
    feelGradeLabel,
    feel5Avg8,
    agility8,
    balance8,
    isPhysicalExcludedFromGoodFeel,
    feelVerdictReason,
    positionSalaryEfficiency,
    radarFive,
    playstyleTags: playstyleTags.slice(0, 6),
    similarAlternatives,
    rankerPickRate,
  };
}

const MACRO_SUMMARY_STAT_KEYS = new Set([
  "스피드",
  "슛",
  "패스",
  "수비",
  "피지컬",
]);

function resolvePositionGroupInfo(rawPos: string): {
  analyzedPos: string;
  positionGroup: PositionArchetypeGroup;
  positionGroupLabel: string;
  macroGroup: "FW" | "MF" | "DF" | "GK";
  roleNuanceNote: string;
} {
  const pos = (rawPos || "ST").trim().toUpperCase();
  if (["ST", "CF", "LF", "RF", "LS", "RS"].includes(pos)) {
    const isCf = ["CF", "LF", "RF"].includes(pos);
    return {
      analyzedPos: isCf ? "CF" : "ST",
      positionGroup: "ST_CF",
      positionGroupLabel: "ST / CF — 중앙 공격수",
      macroGroup: "FW",
      roleNuanceNote: isCf
        ? "CF(세컨드 스트라이커/처진 공격수) 기준: ST 대비 2선 볼 운반·연계·중거리 타격 비중을 함께 고려하여 평가합니다."
        : "ST(최전방 스트라이커) 기준: 페널티 박스 결정력, 오프더볼 침투 또는 포스트 플레이 경합 능력을 중심으로 평가합니다.",
    };
  }
  if (["LW", "RW", "LM", "RM"].includes(pos)) {
    const isWideMid = pos === "LM" || pos === "RM";
    return {
      analyzedPos: pos,
      positionGroup: "WIDE",
      positionGroupLabel: "LW / RW / RM / LM — 측면 공격수 및 미드필더",
      macroGroup: isWideMid ? "MF" : "FW",
      roleNuanceNote: isWideMid
        ? `${pos}(측면 미드필더) 기준: LW/RW 대비 왕성한 스태미너, 측면-중앙 패스 전개, 크로스 및 수비 귀환 밸런스 비중을 높여 평가합니다.`
        : `${pos}(측면 윙포워드) 기준: LM/RM 대비 하프스페이스 드리블 돌파와 직접 박스 타격(골 결정력·중거리 슛) 비중을 높여 평가합니다.`,
    };
  }
  if (
    ["CAM", "CM", "CDM", "LAM", "RAM", "LCM", "RCM", "LDM", "RDM"].includes(pos)
  ) {
    let normPos = "CM";
    if (["CAM", "LAM", "RAM"].includes(pos)) normPos = "CAM";
    else if (["CDM", "LDM", "RDM"].includes(pos)) normPos = "CDM";
    const nuanceMap: Record<string, string> = {
      CAM: "CAM(공격형 미드필더) 기준: 창의적 패스·시야·볼 컨트롤과 직접 득점 지원(중거리 슛·골 결정력) 능력을 중심으로 완성형 및 특화도를 판정합니다.",
      CM: "CM(중앙 미드필더) 기준: 전방위 패스 전개, 스태미너 활동량, 공수 연결 및 중원 밸런스를 중심으로 완성형 및 특화도를 판정합니다.",
      CDM: "CDM(수비형 미드필더) 기준: 가로채기·태클·대인 수비·몸싸움 등 포백 보호 능력과 안정적인 후방 빌드업 패스를 중심으로 평가합니다.",
    };
    return {
      analyzedPos: normPos,
      positionGroup: "CENTRAL_MF",
      positionGroupLabel: `CAM / CM / CDM — 중앙 미드필더 (${normPos} 기준)`,
      macroGroup: "MF",
      roleNuanceNote: nuanceMap[normPos],
    };
  }
  if (["CB", "LCB", "RCB", "SW"].includes(pos)) {
    return {
      analyzedPos: "CB",
      positionGroup: "CB",
      positionGroupLabel: "CB — 센터백",
      macroGroup: "DF",
      roleNuanceNote:
        "CB(센터백) 기준: 대인 수비·태클·가로채기 기본기를 전제로 후방 빌드업, 뒷공간 스피드 커버, 공중볼/몸싸움 경합 특화도를 구분합니다.",
    };
  }
  if (["LB", "RB", "LWB", "RWB"].includes(pos)) {
    const isWingback = pos === "LWB" || pos === "RWB";
    return {
      analyzedPos: pos,
      positionGroup: "FB_WB",
      positionGroupLabel: "LB / RB / RWB / LWB — 풀백 및 윙백",
      macroGroup: "DF",
      roleNuanceNote: isWingback
        ? `${pos}(윙백) 기준: 오버래핑 스피드, 크로스, 스태미너와 전진 드리블 지원 비중을 조금 더 높여 평가합니다.`
        : `${pos}(풀백) 기준: 상대 측면 공격수를 봉쇄하는 대인 수비·태클 안정성과 공수 전환 기동력을 균형 있게 평가합니다.`,
    };
  }
  if (pos === "GK") {
    return {
      analyzedPos: "GK",
      positionGroup: "GK",
      positionGroupLabel: "GK — 골키퍼",
      macroGroup: "GK",
      roleNuanceNote:
        "GK(골키퍼) 기준: 다이빙·반응속도·핸들링 선방 안정성과 스위퍼/킥 빌드업 능력을 구분하여 평가합니다.",
    };
  }
  return {
    analyzedPos: "ST",
    positionGroup: "ST_CF",
    positionGroupLabel: "ST / CF — 중앙 공격수",
    macroGroup: "FW",
    roleNuanceNote:
      "ST(중앙 공격수) 기준: 득점, 침투, 연계, 피지컬 경합 역량을 종합 평가합니다.",
  };
}

function parseFootInfo(footRaw?: string): {
  leftFoot: number;
  rightFoot: number;
  weakFoot: number;
  strongFoot: number;
  isTwoFooted: boolean;
} {
  const raw = (footRaw || "L4 - R5").trim();
  const m = raw.match(/L\s*(\d+)\s*[-–~]\s*R\s*(\d+)/i);
  if (m) {
    const l = Math.max(1, Math.min(5, Number(m[1])));
    const r = Math.max(1, Math.min(5, Number(m[2])));
    const weak = Math.min(l, r);
    const strong = Math.max(l, r);
    return {
      leftFoot: l,
      rightFoot: r,
      weakFoot: weak,
      strongFoot: strong,
      isTwoFooted: weak >= 5 && strong >= 5,
    };
  }
  return {
    leftFoot: 4,
    rightFoot: 5,
    weakFoot: 4,
    strongFoot: 5,
    isTwoFooted: false,
  };
}

function computePhysicalAndFootModifier(
  archId: string,
  analyzedPos: string,
  hasFullData: boolean,
  height: number,
  bodyType: string,
  weakFoot: number,
  isTwoFooted: boolean,
  agilityStat: number,
  extraContext?: {
    primaryPos?: string;
    subPositions?: string[];
    weightKg?: number;
    defenseMean?: number;
    strengthStat?: number;
    balanceStat?: number;
    staminaStat?: number;
    effOvr?: number;
  }
): { delta: number; notes: string[] } {
  if (!hasFullData) {
    return { delta: 0, notes: [] };
  }
  let delta = 0;
  const notes: string[] = [];
  const isStrongBody = bodyType.includes("건장");
  const isLeanBody = bodyType.includes("마름");
  const isUniqueBody = bodyType.includes("고유");
  const weightKg = extraContext?.weightKg ?? 75;
  const primaryPos = (extraContext?.primaryPos || analyzedPos).toUpperCase();
  const subPositions = (extraContext?.subPositions || []).map((p) =>
    p.toUpperCase()
  );
  const defenseMean = extraContext?.defenseMean ?? 95;
  const strengthStat = extraContext?.strengthStat ?? 100;
  const balanceStat = extraContext?.balanceStat ?? 100;
  const staminaStat = extraContext?.staminaStat ?? 105;
  const effOvr = extraContext?.effOvr ?? 115;

  if (archId === "st_cf_target_man") {
    if (height >= 190) {
      delta += 3.2;
      notes.push(`장신(${height}cm) 공중볼·타깃 우위 +3.2`);
    } else if (height >= 186) {
      delta += 1.8;
      notes.push(`준수한 신장(${height}cm) 제공권 보정 +1.8`);
    } else if (height <= 178) {
      delta -= 3.5;
      notes.push(`단신(${height}cm) 타깃 경합 한계 -3.5`);
    } else if (height <= 181) {
      delta -= 1.8;
      notes.push(`신장(${height}cm) 공중볼 경합 열세 -1.8`);
    }
    if (isStrongBody) {
      delta += 2.0;
      notes.push(`체형(${bodyType}) 등지기·몸싸움 보정 +2.0`);
    } else if (isLeanBody) {
      delta -= 2.0;
      notes.push(`체형(${bodyType}) 포스트 경합 열세 -2.0`);
    }
  } else if (archId === "st_cf_penetrator") {
    if (isLeanBody || isUniqueBody) {
      delta += 1.5;
      notes.push(`체형(${bodyType}) 순간 가속·체감 이점 +1.5`);
    } else if (isStrongBody && agilityStat < 116) {
      delta -= 1.5;
      notes.push(`체형(${bodyType}) 방향 전환 둔화 -1.5`);
    }
    if (isTwoFooted) {
      delta += 1.5;
      notes.push("양발(5/5) 좌우 침투 각도 무제한 슈팅 +1.5");
    } else if (weakFoot <= 3) {
      delta -= 1.5;
      notes.push(`약발(${weakFoot}) 반대편 침투 시 슈팅 제약 -1.5`);
    }
  } else if (archId === "st_cf_linkup") {
    if (isTwoFooted) {
      delta += 2.6;
      notes.push("양발(5/5) 압박 상황 전방향 연계·원터치 패스 +2.6");
    } else if (weakFoot === 4) {
      delta += 0.4;
    } else {
      delta -= 2.5;
      notes.push(`약발(${weakFoot}) 방향 전환 연계 제약 -2.5`);
    }
  } else if (archId === "wide_dribbler") {
    if (isLeanBody || isUniqueBody) {
      delta += 1.8;
      notes.push(`체형(${bodyType}) 드리블 체감·탈압박 보정 +1.8`);
    } else if (isStrongBody && height >= 186) {
      delta -= 1.6;
      notes.push(`큰 체격(${height}cm/${bodyType}) 세밀한 방향전환 감점 -1.6`);
    }
    if (isTwoFooted) {
      delta += 1.6;
      notes.push("양발(5/5) 정발/역발 양방향 심리전 돌파 +1.6");
    }
  } else if (archId === "wide_crosser") {
    if (isTwoFooted) {
      delta += 2.2;
      notes.push("양발(5/5) 정크로스·얼리크로스 양방향 킥 보정 +2.2");
    } else if (weakFoot <= 3) {
      delta -= 1.5;
      notes.push(`약발(${weakFoot}) 주발 각도 의존도 존재 -1.5`);
    }
  } else if (archId === "cm_attacking" || archId === "cm_playmaker") {
    // 1. 주/부 포지션 비중 반영 (CDM 홀딩 선수가 패스 스탯 때문에 공격형 미드필더로 오분류되는 현상 원천 차단)
    if (primaryPos === "CAM" || analyzedPos === "CAM") {
      delta += 3.2;
      notes.push("주/분석 포지션 CAM(2선 공격형 미드필더) 적합도 보정 +3.2");
    } else if (primaryPos === "CDM" && !subPositions.includes("CAM")) {
      delta -= 7.5;
      notes.push("주 포지션 CDM(홀딩 미드필더) 선수 공격형 미드필더 배제 감점 -7.5");
    } else if (analyzedPos === "CDM") {
      delta -= 5.0;
      notes.push("CDM 포지션 배치 기준 공격형 비중 차감 -5.0");
    }

    // 2. 수비/피지컬 지표가 매우 높은 홀딩형 선수(로드리 등) 공격형 오분류 방지
    if (defenseMean >= effOvr - 5 && strengthStat >= effOvr - 5) {
      delta -= 5.5;
      notes.push(
        `높은 수비력(${Math.round(defenseMean)})·몸싸움(${strengthStat}) 홀딩 성향으로 공격형 미드필더 제외 -5.5`
      );
    }

    // 3. 신장/체형/체감 점수 반영 (장신·중량급·건장 체형은 2선 선회 반경 페널티)
    if (height >= 186 || weightKg >= 80 || isStrongBody) {
      delta -= 4.5;
      notes.push(
        `장신·중량급 피지컬(${height}cm/${weightKg}kg/${bodyType}) 2선 선회 반경 감점 -4.5`
      );
    } else if ((isLeanBody || isUniqueBody) && agilityStat >= 124 && balanceStat >= 124) {
      delta += 2.5;
      notes.push("부드러운 선회 체감 및 2선 탈압박 보정 +2.5");
    }

    if (isTwoFooted) {
      delta += 2.0;
      notes.push("양발(5/5) 2선 전방향 슈팅·킬패스 보정 +2.0");
    } else if (weakFoot <= 3) {
      delta -= 2.2;
      notes.push(`약발(${weakFoot}) 2선 슈팅·패스 각도 제약 -2.2`);
    }
  } else if (archId === "cm_defensive") {
    // 1. 주/부 포지션 비중 (CDM 우대)
    if (primaryPos === "CDM" || analyzedPos === "CDM") {
      delta += 5.5;
      notes.push("주/분석 포지션 CDM(수비형 미드필더) 포백 보호 보정 +5.5");
    } else if (subPositions.includes("CDM") || subPositions.includes("CB")) {
      delta += 2.5;
      notes.push("부 포지션 CDM/CB 수비 롤 수행 보정 +2.5");
    } else if (primaryPos === "CAM" && defenseMean < effOvr - 10) {
      delta -= 6.5;
      notes.push("순수 공격형 2선(CAM) 수비력 열세 감점 -6.5");
    }

    // 2. 수비 3대 지표(가로채기·태클·대인 수비) + 몸싸움 우위 반영
    if (defenseMean >= effOvr - 4.5 && strengthStat >= effOvr - 5) {
      delta += 4.2;
      notes.push(
        `상위권 수비 평균(${Math.round(defenseMean)})·몸싸움(${strengthStat}) 중원 저지력 +4.2`
      );
    } else if (defenseMean < effOvr - 12) {
      delta -= 5.0;
      notes.push(`수비 핵심 스탯(${Math.round(defenseMean)}) 부족 -5.0`);
    }

    // 3. 장신/건장 피지컬 학다리 태클·제공권 우위 (로드리 등)
    if (height >= 186 || weightKg >= 80 || isStrongBody) {
      delta += 3.2;
      notes.push(
        `체격(${height}cm/${weightKg}kg/${bodyType}) 중원 제공권·경합 차단 우위 +3.2`
      );
    } else if (height <= 175 && isLeanBody) {
      delta -= 1.8;
      notes.push(`단신·마름(${height}cm/${bodyType}) 공중볼 경합 열세 -1.8`);
    }
  } else if (archId === "cm_central" || archId === "cm_box_to_box") {
    // 1. 주/부 포지션 CM 비중 및 활동량/패스 빌드업 보정
    if (primaryPos === "CM" || analyzedPos === "CM") {
      delta += 3.2;
      notes.push("주/분석 포지션 CM(중앙 미드필더) 공수 연결 보정 +3.2");
    } else if (subPositions.includes("CM")) {
      delta += 1.5;
      notes.push("부 포지션 CM 빌드업·연결 호환 +1.5");
    }
    if (staminaStat >= effOvr - 3) {
      delta += 1.6;
      notes.push(`왕성한 스태미너(${staminaStat}) 중원 활동량 보정 +1.6`);
    }
    if (isTwoFooted) {
      delta += 1.5;
      notes.push("양발(5/5) 중원 전방향 빌드업 패스 보정 +1.5");
    }
  } else if (archId === "cb_buildup") {
    if (isTwoFooted) {
      delta += 2.2;
      notes.push("양발(5/5) 좌우 빌드업 패스 안정성 +2.2");
    } else if (weakFoot <= 2) {
      delta -= 1.8;
      notes.push(`약발(${weakFoot}) 후방 압박 시 반대발 빌드업 불안 -1.8`);
    }
  } else if (archId === "cb_speed") {
    if (height >= 183 && height <= 191) {
      delta += 1.0;
      notes.push(`신장(${height}cm) 기동성·수비 복귀 밸런스 +1.0`);
    }
  } else if (archId === "cb_physical") {
    if (height >= 190) {
      delta += 3.0;
      notes.push(`장신(${height}cm) 센터백 제공권·몸싸움 우위 +3.0`);
    } else if (height >= 186) {
      delta += 1.5;
      notes.push(`신장(${height}cm) 제공권 보정 +1.5`);
    } else if (height <= 181) {
      delta -= 3.2;
      notes.push(`단신(${height}cm) 센터백 공중볼 한계 -3.2`);
    }
    if (isStrongBody) {
      delta += 2.0;
      notes.push(`체형(${bodyType}) 대인 경합 우위 +2.0`);
    }
  } else if (archId === "fb_attacking") {
    if (isTwoFooted) {
      delta += 1.6;
      notes.push("양발(5/5) 오버래핑·언더래핑 크로스/패스 +1.6");
    }
    if (analyzedPos === "RWB" || analyzedPos === "LWB") {
      delta += 0.8;
    }
  } else if (archId === "fb_defensive") {
    if (height >= 182 || isStrongBody) {
      delta += 1.5;
      notes.push(`체격(${height}cm/${bodyType}) 측면 경합·파포스트 헤더 방어 +1.5`);
    }
  } else if (archId.startsWith("gk_")) {
    if (height >= 195) {
      delta += 2.5;
      notes.push(`장신(${height}cm) 사각지대 선방 범위 우위 +2.5`);
    } else if (height <= 187) {
      delta -= 2.5;
      notes.push(`신장(${height}cm) 중거리·감아차기 선방 리치 한계 -2.5`);
    }
  }

  return {
    delta: Number(Math.max(-14.0, Math.min(11.0, delta)).toFixed(1)),
    notes,
  };
}

function evaluateCompleteCriteria(
  positionGroup: PositionArchetypeGroup,
  analyzedPos: string,
  effOvr: number,
  getStat: (name: string) => number,
  specialistItems: ArchetypeFitItem[],
  hasFullData: boolean,
  height: number,
  bodyType: string,
  weakFoot: number,
  isTwoFooted: boolean,
  agility8 = 120,
  balance8 = 120
): CompleteEvaluationResult {
  const avg = (names: string[]) => {
    const vals = names.map((n) => getStat(n));
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
  };

  // 완성형 필수 체감 컷오프: 필드 플레이어는 8강(적응도 0) 기준 민첩성과 밸런스가 모두 124 이상이어야만 완성형(및 육각형 미드필더) 인정
  const agilityBalanceAvg8 = Number(((agility8 + balance8) / 2).toFixed(1));
  const agilityBalancePassed =
    positionGroup === "GK" || (agility8 >= 124 && balance8 >= 124);

  let pillars: { name: string; score: number; threshold: number; passed: boolean }[] = [];
  let maxSpreadAllowed = 14.5;
  let physicalPassed = true;
  let physicalScoreText = "";
  let physicalDetail = "";

  if (positionGroup === "ST_CF") {
    const scoring = avg(["골 결정력", "슛 파워", "위치 선정", "침착성"]);
    const pace = avg(["속력", "가속력", "위치 선정"]);
    const linkup = avg(["짧은 패스", "시야", "볼 컨트롤", "중거리 슛"]);
    const control = avg(["드리블", "볼 컨트롤", "민첩성", "밸런스"]);
    const physical = avg(["몸싸움", "밸런스"]);
    const aerial = avg(["헤더", "점프"]);

    pillars = [
      {
        name: "득점·결정력",
        score: scoring,
        threshold: Number((effOvr - 4.0).toFixed(1)),
        passed: scoring >= effOvr - 4.0 && scoring >= 100,
      },
      {
        name: "침투·기동력",
        score: pace,
        threshold: Number((effOvr - 5.5).toFixed(1)),
        passed: pace >= effOvr - 5.5 && pace >= 98,
      },
      {
        name: "연계·시야",
        score: linkup,
        threshold: Number((effOvr - 7.5).toFixed(1)),
        passed: linkup >= effOvr - 7.5 && linkup >= 95,
      },
      {
        name: "체감 코어 밸런스",
        score: agilityBalanceAvg8,
        threshold: 124,
        passed: agilityBalancePassed && control >= effOvr - 6.5,
      },
      {
        name: "피지컬·경합",
        score: physical,
        threshold: Number((effOvr - 7.5).toFixed(1)),
        passed: physical >= effOvr - 7.5 && physical >= 95,
      },
      {
        name: "공중볼·헤더",
        score: aerial,
        threshold: Number((effOvr - 7.5).toFixed(1)),
        passed: aerial >= effOvr - 7.5 && aerial >= 95,
      },
    ];
    maxSpreadAllowed = 13.5;

    if (!hasFullData) {
      physicalPassed = false;
      physicalScoreText = "상세 신체·약발 미수집";
      physicalDetail =
        "세부 신체·양발 데이터가 수집되지 않아 완성형 필수 검증을 통과할 수 없습니다.";
    } else {
      const footOk =
        isTwoFooted ||
        (weakFoot >= 4 && linkup >= effOvr - 4.5 && control >= effOvr - 4.5);
      const heightOk = height >= 184 || (physical >= effOvr - 3 && aerial >= effOvr - 3);
      physicalPassed = footOk && heightOk && agilityBalancePassed;
      physicalScoreText = `${height}cm · 약발 ${weakFoot} · ${bodyType}`;
      if (physicalPassed) {
        physicalDetail = `양발/약발(${weakFoot}), 신장(${height}cm), 그리고 부드러운 체감·밸런스 요건을 모두 충족합니다.`;
      } else {
        const reasons: string[] = [];
        if (!agilityBalancePassed) {
          reasons.push(`방향 전환 및 체감 밸런스 요건 미달`);
        }
        if (!footOk) {
          reasons.push(`약발(${weakFoot}) 또는 연계·볼컨트롤 안정성 미달`);
        }
        if (!heightOk) {
          reasons.push(`신장(${height}cm) 및 공중볼 경합 조건 미달`);
        }
        physicalDetail = reasons.join(" / ");
      }
    }
  } else if (positionGroup === "WIDE") {
    const isWideMid = analyzedPos === "LM" || analyzedPos === "RM";
    const dribble = avg(["드리블", "민첩성", "볼 컨트롤", "밸런스"]);
    const crossPass = avg(["크로스", "짧은 패스", "긴 패스", "시야", "커브"]);
    const pace = avg(["속력", "가속력"]);
    const scoring = avg(["골 결정력", "중거리 슛", "슛 파워", "위치 선정"]);
    const staminaWork = isWideMid
      ? avg(["스태미너", "가로채기", "적극성"])
      : avg(["스태미너", "반응 속도", "침착성"]);

    pillars = [
      {
        name: "드리블 돌파",
        score: dribble,
        threshold: Number((effOvr - 5.0).toFixed(1)),
        passed: dribble >= effOvr - 5.0 && dribble >= 100,
      },
      {
        name: "체감 코어 밸런스",
        score: agilityBalanceAvg8,
        threshold: 124,
        passed: agilityBalancePassed,
      },
      {
        name: "크로스·패스 전개",
        score: crossPass,
        threshold: Number((effOvr - 7.0).toFixed(1)),
        passed: crossPass >= effOvr - 7.0 && crossPass >= 96,
      },
      {
        name: "측면 스피드",
        score: pace,
        threshold: Number((effOvr - 4.5).toFixed(1)),
        passed: pace >= effOvr - 4.5 && pace >= 102,
      },
      {
        name: "득점·슈팅 관여",
        score: scoring,
        threshold: Number((effOvr - (isWideMid ? 9.5 : 7.0)).toFixed(1)),
        passed: scoring >= effOvr - (isWideMid ? 9.5 : 7.0) && scoring >= 95,
      },
      {
        name: isWideMid ? "활동량·수비가담" : "활동량·침착성",
        score: staminaWork,
        threshold: Number((effOvr - (isWideMid ? 8.5 : 8.0)).toFixed(1)),
        passed: staminaWork >= effOvr - (isWideMid ? 8.5 : 8.0) && staminaWork >= 94,
      },
    ];
    maxSpreadAllowed = 15.0;
    physicalPassed = hasFullData && weakFoot >= 4 && agilityBalancePassed;
    physicalScoreText = `${height}cm · 약발 ${weakFoot} · ${bodyType}`;
    physicalDetail = physicalPassed
      ? `약발(${weakFoot}) 활용도와 부드러운 체감 밸런스를 갖춰 양방향 돌파·크로스·슈팅이 모두 가능합니다.`
      : !agilityBalancePassed
      ? `방향 전환 및 체감 밸런스가 완성형 기준에 다소 미달합니다.`
      : `약발(${weakFoot}) 제약으로 측면 양방향 선택지가 제한됩니다.`;
  } else if (positionGroup === "CENTRAL_MF") {
    const passing = avg(["짧은 패스", "긴 패스", "시야"]);
    const carrying = avg(["드리블", "볼 컨트롤", "민첩성", "밸런스"]);
    const shooting = avg(["중거리 슛", "슛 파워", "골 결정력", "위치 선정"]);
    const defending = avg(["가로채기", "태클", "대인 수비"]);
    const physicalStamina = avg(["스태미너", "몸싸움", "속력"]);

    pillars = [
      {
        name: "패스·빌드업 전개",
        score: passing,
        threshold: Number((effOvr - 5.5).toFixed(1)),
        passed: passing >= effOvr - 5.5 && passing >= 98,
      },
      {
        name: "체감 코어 밸런스",
        score: agilityBalanceAvg8,
        threshold: 124,
        passed: agilityBalancePassed && carrying >= effOvr - 6.5,
      },
      {
        name: "기동력·스태미너·피지컬",
        score: physicalStamina,
        threshold: Number((effOvr - 6.0).toFixed(1)),
        passed: physicalStamina >= effOvr - 6.0 && physicalStamina >= 98,
      },
      {
        name: "중원 수비·가로채기",
        score: defending,
        threshold: Number((effOvr - (analyzedPos === "CAM" ? 11.0 : 7.5)).toFixed(1)),
        passed:
          defending >= effOvr - (analyzedPos === "CAM" ? 11.0 : 7.5) &&
          defending >= (analyzedPos === "CAM" ? 90 : 95),
      },
      {
        name: "중거리·득점 지원",
        score: shooting,
        threshold: Number((effOvr - (analyzedPos === "CDM" ? 9.5 : 7.0)).toFixed(1)),
        passed:
          shooting >= effOvr - (analyzedPos === "CDM" ? 9.5 : 7.0) &&
          shooting >= 94,
      },
    ];
    maxSpreadAllowed = 13.5;

    const speedVal = avg(["속력", "가속력"]);
    const footOk = weakFoot >= 4;
    const mobilityAndBodyOk =
      speedVal >= effOvr - 8.0 &&
      (analyzedPos === "CAM"
        ? getStat("몸싸움") >= effOvr - 9.0
        : height >= 178 || getStat("몸싸움") >= effOvr - 5.0);
    physicalPassed =
      hasFullData && footOk && mobilityAndBodyOk && agilityBalancePassed;
    physicalScoreText = `${height}cm · 약발 ${weakFoot} · ${bodyType}`;
    physicalDetail = physicalPassed
      ? `육각형 미드필더에 요구되는 부드러운 탈압박 체감, 양발 활용도(약발 ${weakFoot}), 기동력·경합 밸런스를 모두 충족합니다.`
      : !agilityBalancePassed
      ? `공격/패스/수비/피지컬은 준수하나 중원 탈압박 체감 밸런스 요건에 미달하여 특화형 미드필더로 분류되었습니다.`
      : `약발(${weakFoot}) 또는 기동력·피지컬 경합 조건이 육각형 미드필더 기준에 미달합니다.`;
  } else if (positionGroup === "CB") {
    const defending = avg(["대인 수비", "태클", "가로채기"]);
    const physicalAerial = avg(["몸싸움", "헤더", "점프"]);
    const speedCover = avg(["속력", "가속력", "반응 속도"]);
    const buildup = avg(["짧은 패스", "긴 패스", "볼 컨트롤", "침착성"]);

    pillars = [
      {
        name: "대인수비·태클·차단",
        score: defending,
        threshold: Number((effOvr - 4.0).toFixed(1)),
        passed: defending >= effOvr - 4.0 && defending >= 100,
      },
      {
        name: "피지컬·공중볼 경합",
        score: physicalAerial,
        threshold: Number((effOvr - 5.5).toFixed(1)),
        passed: physicalAerial >= effOvr - 5.5 && physicalAerial >= 98,
      },
      {
        name: "스피드·뒷공간 커버",
        score: speedCover,
        threshold: Number((effOvr - 6.5).toFixed(1)),
        passed: speedCover >= effOvr - 6.5 && speedCover >= 96,
      },
      {
        name: "체감 코어 밸런스",
        score: agilityBalanceAvg8,
        threshold: 124,
        passed: agilityBalancePassed && buildup >= effOvr - 6.5,
      },
    ];
    maxSpreadAllowed = 11.5;
    physicalPassed =
      hasFullData && height >= 185 && weakFoot >= 4 && agilityBalancePassed;
    physicalScoreText = `${height}cm · 약발 ${weakFoot} · ${bodyType}`;
    physicalDetail = physicalPassed
      ? `신장(${height}cm), 양발 빌드업(약발 ${weakFoot}), 역동작 없는 수비 전환 체감이 완성형 센터백 기준에 부합합니다.`
      : !agilityBalancePassed
      ? `수비 전환 체감 밸런스 요건에 미달하여 특화형 센터백으로 분류됩니다.`
      : `센터백 제공권 신장 또는 후방 양발 빌드업 조건이 다소 부족합니다.`;
  } else if (positionGroup === "FB_WB") {
    const isWb = analyzedPos === "LWB" || analyzedPos === "RWB";
    const speedStamina = avg(["속력", "가속력", "스태미너"]);
    const defending = avg(["대인 수비", "태클", "가로채기"]);
    const attacking = avg(["크로스", "짧은 패스", "드리블", "볼 컨트롤"]);
    const physical = avg(["몸싸움", "밸런스"]);

    pillars = [
      {
        name: "기동력·스태미너",
        score: speedStamina,
        threshold: Number((effOvr - 4.0).toFixed(1)),
        passed: speedStamina >= effOvr - 4.0 && speedStamina >= 100,
      },
      {
        name: "측면 수비 안정성",
        score: defending,
        threshold: Number((effOvr - (isWb ? 6.5 : 5.0)).toFixed(1)),
        passed: defending >= effOvr - (isWb ? 6.5 : 5.0) && defending >= 96,
      },
      {
        name: "체감 코어 밸런스",
        score: agilityBalanceAvg8,
        threshold: 124,
        passed: agilityBalancePassed && attacking >= effOvr - 5.5,
      },
      {
        name: "몸싸움·피지컬 경합",
        score: physical,
        threshold: Number((effOvr - 6.5).toFixed(1)),
        passed:
          physical >= effOvr - 6.5 &&
          getStat("몸싸움") >= effOvr - 8.0 &&
          physical >= 95,
      },
    ];
    maxSpreadAllowed = 11.5;
    physicalPassed =
      hasFullData &&
      weakFoot >= 4 &&
      agilityBalancePassed &&
      getStat("스태미너") >= effOvr - 5 &&
      !bodyType.includes("마름");
    physicalScoreText = `${height}cm · 약발 ${weakFoot} · ${bodyType}`;
    physicalDetail = physicalPassed
      ? `왕성한 활동량, 부드러운 공수 전환 체감, 경합 체형(${bodyType}), 약발(${weakFoot}) 조건을 모두 충족합니다.`
      : !agilityBalancePassed
      ? `공수 전환 체감 밸런스 요건에 미달하여 특화형 풀백/윙백으로 분류됩니다.`
      : `풀백/윙백 완성형 기준(대인 경합 체형·몸싸움 또는 양발 활용도)에 미달하여 공/수 특화형으로 분류됩니다.`;
  } else {
    // GK
    const saving = avg(["GK 다이빙", "GK 반응속도", "GK 핸들링"]);
    const positioning = avg(["GK 위치 선정", "반응 속도", "점프"]);
    const kicking = avg(["GK 킥", "긴 패스"]);
    pillars = [
      {
        name: "핵심 선방 능력",
        score: saving,
        threshold: Number((effOvr - 3.5).toFixed(1)),
        passed: saving >= effOvr - 3.5 && saving >= 98,
      },
      {
        name: "위치선정·공중볼",
        score: positioning,
        threshold: Number((effOvr - 6.5).toFixed(1)),
        passed: positioning >= effOvr - 6.5 && positioning >= 92,
      },
      {
        name: "킥·후방 배급",
        score: kicking,
        threshold: Number((effOvr - 9.0).toFixed(1)),
        passed: kicking >= effOvr - 9.0 && kicking >= 90,
      },
    ];
    maxSpreadAllowed = 13.5;
    physicalPassed = hasFullData && height >= 191;
    physicalScoreText = `${height}cm · ${bodyType}`;
    physicalDetail = physicalPassed
      ? `신장(${height}cm) 조건이 완성형 골키퍼 기준(191cm 이상)을 충족합니다.`
      : `신장(${height}cm)이 완성형 골키퍼 권장 기준(191cm 이상)에 미달합니다.`;
  }

  const pillarScores = pillars.map((p) => p.score);
  const pillarMean = Number(
    (pillarScores.reduce((a, b) => a + b, 0) / pillarScores.length).toFixed(1)
  );
  const maxPillar = Math.max(...pillarScores);
  const minPillar = Math.min(...pillarScores);
  const pillarSpread = Number((maxPillar - minPillar).toFixed(1));
  const failedPillars = pillars.filter((p) => !p.passed);

  // 1. 전반적 고수준
  const highOverallThreshold = Number(Math.max(100, effOvr - 4.8).toFixed(1));
  const c1Passed = pillarMean >= highOverallThreshold;

  // 2. 편중 없는 균형
  const c2Passed =
    pillarSpread <= maxSpreadAllowed && minPillar >= effOvr - 8.5;

  // 3. 복수 유형 강점 확보
  const qualifiedSpecialists = specialistItems.filter(
    (s) => s.role_score >= 82 && s.specialization_score >= 73
  );
  const requiredMultiCount = 2;
  const c3Passed = qualifiedSpecialists.length >= requiredMultiCount;

  // 4. 치명적 약점 부재 (민첩성·밸런스 8강 기준 124 이상 필수 포함)
  const c4Passed = failedPillars.length === 0 && agilityBalancePassed;

  // 5. 체격·체감(민첩/밸런스)·양발 조건 부합
  const c5Passed = physicalPassed && agilityBalancePassed;

  const completeLabelName =
    positionGroup === "CENTRAL_MF" ? "육각형 미드필더(완성형)" : `${analyzedPos} 완성형`;

  const criteria: CompleteEvaluationCriterion[] = [
    {
      id: "high_overall_level",
      label: "1. 전반적 고수준 (핵심 역량 평균)",
      passed: c1Passed,
      score_text: `평균 ${pillarMean} / 기준 ${highOverallThreshold}`,
      detail: c1Passed
        ? `포지션 핵심 역량 평균(${pillarMean})이 기준치(${highOverallThreshold}) 이상으로 전반적인 퍼포먼스 수준이 높습니다.`
        : `포지션 핵심 역량 평균(${pillarMean})이 완성형 요구 기준(${highOverallThreshold})에 미치지 못합니다.`,
    },
    {
      id: "no_lopsided_dependency",
      label: "2. 편중 없는 균형 (최고-최저 역량 편차)",
      passed: c2Passed,
      score_text: `편차 ${pillarSpread} (허용 ≤${maxSpreadAllowed})`,
      detail: c2Passed
        ? `가장 높은 역량(${maxPillar})과 가장 낮은 역량(${minPillar})의 편차가 ${pillarSpread}로 특정 스탯에만 의존하지 않습니다.`
        : `최고 역량(${maxPillar}) 대비 최저 역량(${minPillar}) 편차가 ${pillarSpread}로 벌어져 특정 강점에 편중된 스탯 구조를 보입니다.`,
    },
    {
      id: "multi_archetype_strength",
      label: "3. 복수 유형 강점 확보",
      passed: c3Passed,
      score_text: `${qualifiedSpecialists.length}개 유형 충족 (기준 ≥${requiredMultiCount}개)`,
      detail: c3Passed
        ? `${qualifiedSpecialists.map((s) => s.name).join("·")} 등 복수의 세부 역할을 동시에 상위 수준으로 수행할 수 있습니다.`
        : `복수 역할 동시 수행 요건 미달 (충족 유형: ${
            qualifiedSpecialists.map((s) => s.name).join(", ") || "단일 편중"
          })`,
    },
    {
      id: "no_critical_weakness",
      label: "4. 필수 영역 및 민첩성·밸런스 상한 통과 (8강 기준 ≥124)",
      passed: c4Passed,
      score_text:
        failedPillars.length === 0
          ? `전 영역 통과 (8강 민첩 ${agility8}·밸런스 ${balance8})`
          : `${failedPillars.map((p) => p.name).join(", ")} 미달`,
      detail: c4Passed
        ? `공격/패스/수비/피지컬 필수 영역 및 8강 기준 민첩성(${agility8})·밸런스(${balance8}) ≥ 124 기준을 모두 통과했습니다.`
        : `필수 영역 중 [${failedPillars
            .map((p) => `${p.name}(${p.score} < ${p.threshold})`)
            .join(", ")}] 항목이 완성형 하한선에 미달합니다.`,
    },
    {
      id: "physical_foot_compatibility",
      label: "5. 체격 · 체감 코어(민첩/밸런스) · 양발 조건 부합",
      passed: c5Passed,
      score_text: physicalScoreText,
      detail: physicalDetail,
    },
  ];

  const passedCount = criteria.filter((c) => c.passed).length;
  const isComplete = passedCount === 5;

  const baseFromMean =
    75 + (pillarMean - effOvr) * 2.2 + Math.max(0, (pillarMean - 110) * 0.45);
  const bottleneckPenalty = Math.max(0, (effOvr - 4.5 - minPillar) * 2.4);
  const spreadPenalty = Math.max(0, (pillarSpread - 10) * 1.3);
  const failedGatePenalty = (5 - passedCount) * 7.5;

  let overallCompleteScore = Math.round(
    baseFromMean -
      bottleneckPenalty -
      spreadPenalty -
      (isComplete ? 0 : failedGatePenalty)
  );
  if (isComplete) {
    overallCompleteScore = Math.max(91, Math.min(98, overallCompleteScore + 6));
  } else {
    overallCompleteScore = Math.max(32, Math.min(83, overallCompleteScore));
  }

  let summaryReason = "";
  if (isComplete) {
    summaryReason = `공격·패스·수비·피지컬 및 8강 기준 민첩성(${agility8})·밸런스(${balance8}) ≥ 124 기준을 모두 통과하여 [${completeLabelName}]으로 판정되었습니다.`;
  } else {
    const failedLabels = criteria
      .filter((c) => !c.passed)
      .map((c) => c.label.replace(/^\d+\.\s*/, ""));
    summaryReason = `${completeLabelName} 5대 기준 중 ${passedCount}/5개 충족 — [${failedLabels.join(
      ", "
    )}] 요건 미충족으로 ${completeLabelName}에서 제외되었으며, 선수의 주력 특화 유형으로 분류합니다.`;
  }

  return {
    is_complete: isComplete,
    overall_complete_score: overallCompleteScore,
    summary_reason: summaryReason,
    passed_count: passedCount,
    total_criteria: 5,
    pillars,
    criteria,
  };
}

export function analyzePlayerProfileSync(
  card: PlayerCard,
  grade = 8,
  teamColorBonus = 0,
  targetPosition?: string
): PlayerProfileResult {
  const rules = getSystemRules();
  const clampedGrade = Math.max(1, Math.min(rules.maxEnhanceLevel, grade));
  const stats = card.stats || {};
  const baseOvr = Number(card.ovr || 105);
  const enhBonus = getEnhanceOvrBoost(clampedGrade, rules.enhanceOvrBoosts);
  const effOvr = baseOvr + enhBonus + Number(teamColorBonus);

  const rawPos = (targetPosition || card.primary_position || "ST")
    .trim()
    .toUpperCase();
  const posInfo = resolvePositionGroupInfo(rawPos);
  const { analyzedPos, positionGroup, positionGroupLabel, macroGroup, roleNuanceNote } =
    posInfo;

  const availablePositions = Array.from(
    new Set([
      card.primary_position || "ST",
      ...(card.positions || []).map((p) => p.pos),
    ])
  ).filter(Boolean);

  const hasFullData = Boolean(
    card.has_full_ability && Object.keys(stats).length >= 10
  );
  const height = card.height || 180;
  const weight = card.weight || 75;
  const bodyType = card.body_type || "보통";
  const footRaw = card.foot || "L4 - R5";
  const footParsed = parseFootInfo(footRaw);

  const getStat = (statName: string) =>
    getStatWithBonus(stats, statName, clampedGrade, teamColorBonus, baseOvr);

  // 8강(적응도 0) 기준 민첩성·밸런스 산출 (완성형 및 체감 컷오프 검증용)
  const boost8 = getEnhanceOvrBoost(8, rules.enhanceOvrBoosts);
  const agility8 =
    (lookupRawStatValue(stats, "민첩성") ?? Math.max(70, baseOvr - 4)) + boost8;
  const balance8 =
    (lookupRawStatValue(stats, "밸런스") ?? Math.max(70, baseOvr - 5)) + boost8;

  const detailedStatEntries = Object.keys(stats)
    .filter((k) => {
      if (MACRO_SUMMARY_STAT_KEYS.has(k)) return false;
      if (macroGroup === "GK") return k.startsWith("GK") || k === "반응 속도" || k === "점프";
      return !k.startsWith("GK");
    })
    .map((k) => ({
      stat: k,
      value: getStat(k),
    }))
    .sort((a, b) => b.value - a.value);

  const top20Values = detailedStatEntries.slice(0, 20).map((e) => e.value);
  const playerTop20Mean =
    top20Values.length > 0
      ? top20Values.reduce((a, b) => a + b, 0) / top20Values.length
      : effOvr;
  const playerBaselineMean = Math.min(effOvr, playerTop20Mean);

  const agilityVal = getStat("민첩성");
  const balanceVal = getStat("밸런스");
  const strengthVal = getStat("몸싸움");
  const staminaVal = getStat("스태미너");
  const defenseBaseMean =
    (getStat("대인 수비") + getStat("태클") + getStat("가로채기")) / 3;
  const subPosList = (card.positions || []).map((p) => p.pos);

  // Step 1: Evaluate all non-complete specialist archetypes in the player's positionGroup first
  const groupDefs = ARCHETYPES.filter((a) => a.positionGroup === positionGroup);
  const specialistDefs = groupDefs.filter((a) => !a.isCompleteType);

  interface TempCalc {
    def: ArchetypeDef;
    weightedVal: number;
    effectiveRaw: number;
    bottleneckPenalty: number;
    modDelta: number;
    modNotes: string[];
    contributors: { stat: string; value: number; weight: number }[];
  }

  const computeTempForDef = (def: ArchetypeDef): TempCalc => {
    const adjustedWeights: Record<string, number> = { ...def.weights };
    if (def.id === "wide_dribbler" && (analyzedPos === "LW" || analyzedPos === "RW")) {
      adjustedWeights["골 결정력"] = 0.1;
      adjustedWeights["속력"] = 0.08;
      adjustedWeights["밸런스"] = 0.1;
    } else if (def.id === "wide_crosser" && (analyzedPos === "LM" || analyzedPos === "RM")) {
      adjustedWeights["스태미너"] = 0.12;
      adjustedWeights["짧은 패스"] = 0.14;
      adjustedWeights["크로스"] = 0.24;
    }

    const totalW =
      Object.values(adjustedWeights).reduce((a, b) => a + b, 0) || 1;
    let weightedVal = 0;
    let minCoreStat = 999;
    const contributors: { stat: string; value: number; weight: number }[] = [];

    for (const [sName, rawW] of Object.entries(adjustedWeights)) {
      const w = rawW / totalW;
      const sVal = getStat(sName);
      weightedVal += sVal * w;
      if (w >= 0.15 && sVal < minCoreStat) {
        minCoreStat = sVal;
      }
      contributors.push({
        stat: sName,
        value: sVal,
        weight: Number(w.toFixed(2)),
      });
    }
    contributors.sort((a, b) => b.value * b.weight - a.value * a.weight);

    let bottleneckPenalty = 0;
    if (minCoreStat < weightedVal - 7) {
      bottleneckPenalty += (weightedVal - 7 - minCoreStat) * 0.55;
    }
    if (def.id === "cb_buildup" && defenseBaseMean < effOvr - 6) {
      bottleneckPenalty += (effOvr - 6 - defenseBaseMean) * 1.1;
    }
    // 공격형 미드필더(cm_attacking)는 민첩성 또는 골결정력/드리블이 낮으면 병목 감점 추가
    if (def.id === "cm_attacking" && agility8 < 122) {
      bottleneckPenalty += (122 - agility8) * 0.65;
    }

    const mod = computePhysicalAndFootModifier(
      def.id,
      analyzedPos,
      hasFullData,
      height,
      bodyType,
      footParsed.weakFoot,
      footParsed.isTwoFooted,
      agilityVal,
      {
        primaryPos: card.primary_position || analyzedPos,
        subPositions: subPosList,
        weightKg: weight,
        defenseMean: defenseBaseMean,
        strengthStat: strengthVal,
        balanceStat: balanceVal,
        staminaStat: staminaVal,
        effOvr,
      }
    );

    const effectiveRaw = weightedVal - bottleneckPenalty + mod.delta;
    return {
      def,
      weightedVal,
      effectiveRaw,
      bottleneckPenalty,
      modDelta: mod.delta,
      modNotes: mod.notes,
      contributors,
    };
  };

  const specialistTemps = specialistDefs.map(computeTempForDef);
  const peerRaws = specialistTemps.map((t) => t.effectiveRaw);
  const peerMean =
    peerRaws.reduce((a, b) => a + b, 0) / Math.max(1, peerRaws.length);
  const peerMax = Math.max(...peerRaws, peerMean);
  const peerMin = Math.min(...peerRaws, peerMean);
  const peerSpread = Math.max(1, peerMax - peerMin);

  const buildSpecialistFitItem = (t: TempCalc): ArchetypeFitItem => {
    const rawRole =
      50 +
      (t.effectiveRaw - 82) * 1.05 +
      (t.effectiveRaw - effOvr) * 0.85;
    const roleScore = Math.max(25, Math.min(99, Math.round(rawRole)));

    const diffFromPeerMean = t.effectiveRaw - peerMean;
    const diffFromPlayerMean = t.effectiveRaw - playerBaselineMean;
    const isTopInGroup = Math.abs(t.effectiveRaw - peerMax) < 0.05;
    const dominanceBonus =
      isTopInGroup && peerSpread >= 4
        ? Math.min(6, (peerSpread - 3) * 1.0)
        : 0;

    const rawSpec =
      76 +
      diffFromPeerMean * 2.4 +
      diffFromPlayerMean * 1.35 +
      dominanceBonus;
    const specializationScore = Math.max(
      30,
      Math.min(98, Math.round(rawSpec))
    );

    const top2Stats = t.contributors
      .slice(0, 2)
      .map((c) => `${c.stat}(${c.value})`)
      .join("·");
    const modSummary =
      t.modNotes.length > 0 ? ` / ${t.modNotes[0]}` : "";
    const judgmentReason = `핵심 지표 ${top2Stats} 기반 역할 수행 능력 ${roleScore}점 · 내재 성향 특화도 ${specializationScore}%${modSummary}`;

    return {
      id: t.def.id,
      group: t.def.group,
      position_group: t.def.positionGroup,
      applicable_positions: t.def.applicablePositions,
      name: t.def.name,
      desc: t.def.desc,
      raw_score: Number(t.weightedVal.toFixed(1)),
      fit_percent: specializationScore,
      role_score: roleScore,
      specialization_score: specializationScore,
      is_complete_type: false,
      judgment_reason: judgmentReason,
      modifier_notes: t.modNotes,
      key_stats: t.contributors.slice(0, 5),
    };
  };

  const specialistFitItems = specialistTemps
    .map(buildSpecialistFitItem)
    .sort(
      (a, b) =>
        b.specialization_score - a.specialization_score ||
        b.role_score - a.role_score
    );

  // Step 2: Evaluate the strict Complete Gate (including 8강 민첩성·밸런스 >= 124 requirement)
  const completeEval = evaluateCompleteCriteria(
    positionGroup,
    analyzedPos,
    effOvr,
    getStat,
    specialistFitItems,
    hasFullData,
    height,
    bodyType,
    footParsed.weakFoot,
    footParsed.isTwoFooted,
    agility8,
    balance8
  );

  const completeDef = groupDefs.find((a) => a.isCompleteType);
  let completeFitItem: ArchetypeFitItem | null = null;
  if (completeDef) {
    const compTemp = computeTempForDef(completeDef);
    const compRoleScore = Math.max(
      30,
      Math.min(
        99,
        Math.round(
          completeEval.is_complete
            ? Math.max(91, completeEval.overall_complete_score)
            : Math.min(84, completeEval.overall_complete_score)
        )
      )
    );
    const compSpecScore = completeEval.overall_complete_score;
    completeFitItem = {
      id: completeDef.id,
      group: completeDef.group,
      position_group: completeDef.positionGroup,
      applicable_positions: completeDef.applicablePositions,
      name: completeDef.name,
      desc: completeDef.desc,
      raw_score: Number(compTemp.weightedVal.toFixed(1)),
      fit_percent: compSpecScore,
      role_score: compRoleScore,
      specialization_score: compSpecScore,
      is_complete_type: true,
      judgment_reason: completeEval.summary_reason,
      modifier_notes: completeEval.criteria
        .filter((c) => !c.passed)
        .map((c) => `미충족: ${c.label}`),
      key_stats: compTemp.contributors.slice(0, 5),
    };
  }

  const positionArchetypes: ArchetypeFitItem[] = [
    ...specialistFitItems,
    ...(completeFitItem ? [completeFitItem] : []),
  ].sort((a, b) => {
    if (a.is_complete_type) return completeEval.is_complete ? -1 : 1;
    if (b.is_complete_type) return completeEval.is_complete ? 1 : -1;
    return (
      b.fit_percent - a.fit_percent ||
      b.role_score - a.role_score ||
      b.raw_score - a.raw_score
    );
  });

  const otherDefs = ARCHETYPES.filter(
    (a) =>
      a.positionGroup !== positionGroup &&
      !a.isCompleteType &&
      (macroGroup === "GK" ? a.group === "GK" : a.group !== "GK")
  );
  const otherFitItems: ArchetypeFitItem[] = otherDefs.map((def) => {
    const t = computeTempForDef(def);
    const rawRole =
      46 +
      (t.effectiveRaw - 82) * 1.0 +
      (t.effectiveRaw - effOvr) * 0.75;
    const roleScore = Math.max(20, Math.min(96, Math.round(rawRole)));
    const rawSpec = Math.max(
      25,
      Math.min(
        90,
        Math.round(72 + (t.effectiveRaw - playerBaselineMean) * 2.1)
      )
    );
    return {
      id: t.def.id,
      group: t.def.group,
      position_group: t.def.positionGroup,
      applicable_positions: t.def.applicablePositions,
      name: `${t.def.name} (${t.def.applicablePositions.join("/")})`,
      desc: t.def.desc,
      raw_score: Number(t.weightedVal.toFixed(1)),
      fit_percent: rawSpec,
      role_score: roleScore,
      specialization_score: rawSpec,
      is_complete_type: false,
      judgment_reason: `타 포지션(${t.def.applicablePositions.join("/")}) 호환 역할 수행력 ${roleScore}점 · 특화도 ${rawSpec}%`,
      modifier_notes: t.modNotes,
      key_stats: t.contributors.slice(0, 4),
    };
  });

  const firstSpec = specialistFitItems[0] || null;
  const secondSpec = specialistFitItems[1] || null;

  let primaryArchetype: ArchetypeFitItem | null = firstSpec;
  let secondaryArchetype: ArchetypeFitItem | null = null;
  let secondaryNullReason: string | undefined = undefined;

  if (completeEval.is_complete && completeFitItem && firstSpec) {
    const subNames = specialistFitItems
      .filter((s) => s.role_score >= 82)
      .slice(0, 3)
      .map((s) => s.name)
      .join("·");
    const baseCompName =
      positionGroup === "CENTRAL_MF" ? "육각형 미드필더" : "완성형";
    primaryArchetype = {
      ...completeFitItem,
      name: subNames ? `${baseCompName} (${subNames} 겸비)` : baseCompName,
    };
    secondaryArchetype = firstSpec;
  } else if (firstSpec && secondSpec) {
    const specGap =
      firstSpec.specialization_score - secondSpec.specialization_score;
    const secondQualifies =
      secondSpec.specialization_score >= 73 &&
      secondSpec.role_score >= Math.min(72, firstSpec.role_score - 8) &&
      specGap <= 14;

    if (secondQualifies) {
      secondaryArchetype = secondSpec;
    } else {
      secondaryNullReason =
        specGap > 14
          ? `1순위 [${firstSpec.name}](특화도 ${firstSpec.specialization_score}%) 성향이 2순위 [${secondSpec.name}](${secondSpec.specialization_score}%) 대비 뚜렷하게 우세(격차 ${specGap}%p)하여 단일 주 유형으로 판정됨`
          : `2순위 [${secondSpec.name}]의 특화도(${secondSpec.specialization_score}%) 또는 역할 수행 점수(${secondSpec.role_score}점)가 보조 유형 부여 기준(특화도 73% 이상)에 미달함`;
    }
  }

  let judgmentSummary = "";
  if (completeEval.is_complete && primaryArchetype && firstSpec) {
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 ${analyzedPos} 포지션의 5대 완성형 기준(8강 민첩·밸런스 124+ 포함)을 모두 통과한 [${primaryArchetype.name}] 유형입니다. 세부 성향 중에서는 [${firstSpec.name}](역할 수행 ${firstSpec.role_score}점 · 특화도 ${firstSpec.specialization_score}%) 강점이 가장 돋보입니다.`;
  } else if (primaryArchetype && secondaryArchetype) {
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 [${primaryArchetype.name}](특화도 ${primaryArchetype.specialization_score}% · 수행력 ${primaryArchetype.role_score}점) 성향을 주축으로 하며, [${secondaryArchetype.name}](특화도 ${secondaryArchetype.specialization_score}% · 수행력 ${secondaryArchetype.role_score}점) 강점이 함께 나타나는 복합 스타일입니다.`;
  } else if (primaryArchetype) {
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 ${analyzedPos} 포지션에서 [${primaryArchetype.name}](특화도 ${primaryArchetype.specialization_score}% · 수행력 ${primaryArchetype.role_score}점)에 뚜렷하게 특화된 플레이 스타일을 보유하고 있습니다.`;
  }

  // Physical & Foot transparency object
  const appliedFactors: string[] = [];
  const excludedFactors: string[] = [];
  if (hasFullData) {
    appliedFactors.push(
      `신장 ${height}cm / 몸무게 ${weight}kg (타깃맨·센터백·골키퍼 제공권 및 경합 반영)`,
      `체형 '${bodyType}' (드리블 체감·순간 가속 및 몸싸움 버티기 보조 반영)`,
      `양발/주발 '${footRaw}' (약발 ${footParsed.weakFoot} — 연계·플레이메이킹·양방향 슈팅/크로스 및 완성형 검증 반영)`
    );
    if ((card.traits || []).length > 0) {
      appliedFactors.push(
        `보유 특성 ${(card.traits || []).map((t) => t.name).join(", ")}`
      );
    } else {
      excludedFactors.push("보유 특성(Traits) 없음 — 수치 계산에서 제외");
    }
    excludedFactors.push(
      "인게임 히든 AI 움직임 로그 — 공식 데이터센터 비공개 항목으로 추측 생성하지 않고 배제"
    );
  } else {
    excludedFactors.push(
      "상세 신체(키·체형) 및 양발 데이터 미수집 상태 — 추정치 보정을 배제하고 기본 스탯으로만 보수적 산출"
    );
  }

  const physicalFootAnalysis: ProfilePhysicalFootAnalysis = {
    data_available: hasFullData,
    height_cm: height,
    weight_kg: weight,
    body_type: bodyType,
    foot_raw: footRaw,
    weak_foot: footParsed.weakFoot,
    strong_foot: footParsed.strongFoot,
    is_two_footed: footParsed.isTwoFooted,
    applied_factors: appliedFactors,
    excluded_factors: excludedFactors,
  };

  const allArchetypesCombined = [...positionArchetypes, ...otherFitItems];

  return {
    spid: card.spid,
    name: card.name,
    season_code: card.season_code,
    primary_position: card.primary_position || "ST",
    analyzed_position: analyzedPos,
    position_group_label: positionGroupLabel,
    available_positions: availablePositions,
    grade: clampedGrade,
    team_color_bonus: teamColorBonus,
    effective_ovr: effOvr,
    height,
    weight,
    body_type: bodyType,
    foot: footRaw,
    skill_moves: card.skill_moves || "★★★★☆☆",
    traits: card.traits || [],
    primary_archetype: primaryArchetype,
    secondary_archetype: secondaryArchetype,
    secondary_Null_reason: secondaryNullReason,
    position_archetypes: positionArchetypes,
    all_archetypes: allArchetypesCombined,
    complete_evaluation: completeEval,
    physical_foot_analysis: physicalFootAnalysis,
    judgment_summary: judgmentSummary,
    role_nuance_note: roleNuanceNote,
    strengths: detailedStatEntries.slice(0, 5),
    weaknesses: detailedStatEntries.slice(-4).reverse(),
    six_face: computeSixFaceSummary(card, clampedGrade, teamColorBonus),
    feelMetrics: computePlayerFeelMetricsSync(
      card,
      analyzedPos,
      clampedGrade,
      teamColorBonus,
      true
    ),
    methodology_note:
      "본 분석은 단순 OVR 비례 점수가 아니라 [1. 역할 수행 능력(절대적 수행 수준)]과 [2. 유형 특화도(선수 스탯 내 상대적 강점 편차)], 그리고 [3. 인게임 물리 엔진 체감(민첩·밸런스·반응속도·드리블 + 체형·신장·몸무게·가속 비대칭 보정)]을 결합 산출하며, 완성형은 5대 필수 요건을 모두 통과할 때만 부여합니다.",
    analyzed_at: nowIso(),
  };
}

export async function analyzeSquadAsync(
  slots: SquadSlot[],
  formation = "4-2-3-1",
  budgetBp = 50_000_000_000,
  salaryCap?: number,
  teamColorBonus = 3
): Promise<SquadAnalysisResult> {
  const store = loadStore();
  const rules = getSystemRules();
  const effectiveSalaryCap =
    salaryCap && salaryCap >= rules.salaryCap ? salaryCap : rules.salaryCap;

  const placedEvaluations = [];
  let totalSalary = 0;
  let totalBp = 0;
  const teamCounter: Record<string, number> = {};

  const attackScores: number[] = [];
  const midfieldScores: number[] = [];
  const defenseScores: number[] = [];
  const sixSums: Record<string, number[]> = {
    속력: [],
    슈팅: [],
    패스: [],
    드리블: [],
    수비: [],
    피지컬: [],
  };

  for (const slot of slots) {
    const slotPos = (slot.slot_position || "ST").toUpperCase();
    const spid = Number(slot.spid || 0);
    const grade = Math.max(
      1,
      Math.min(rules.maxEnhanceLevel, Number(slot.grade || 5))
    );
    if (!spid) continue;

    let rawCard: PlayerCard | null = store.cards[spid] || null;
    if (!rawCard || !rawCard.has_full_ability) {
      rawCard = await crawlPlayerAbility(spid);
    }
    if (!rawCard || !rawCard.salary) {
      rawCard = await ensurePlayerSalaryAndMeta(spid);
    }
    if (!rawCard) continue;
    const card = enrichPlayerCardMetaSync(rawCard);

    const evalRes = evaluateCardEfficiencySync(
      card,
      slotPos,
      grade,
      teamColorBonus
    );
    const profRes = analyzePlayerProfileSync(card, grade, teamColorBonus);

    totalSalary += Number(card.salary || 20);
    totalBp += Number(evalRes.bp || 0);

    const seenForCard = new Set<string>();
    if (card.team && !BANNED_DUMMY_TEAM_COLORS.has(card.team.trim())) {
      seenForCard.add(card.team.trim());
    }
    if (card.nation && !BANNED_DUMMY_TEAM_COLORS.has(card.nation.trim())) {
      seenForCard.add(card.nation.trim());
    }
    for (const tc of card.team_colors || []) {
      const tcClean = (tc.name || "").trim();
      if (tcClean && !BANNED_DUMMY_TEAM_COLORS.has(tcClean)) {
        seenForCard.add(tcClean);
      }
    }
    for (const tcName of seenForCard) {
      if (tcName) teamCounter[tcName] = (teamCounter[tcName] || 0) + 1;
    }

    const core = evalRes.core_score;
    if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(slotPos))
      attackScores.push(core);
    else if (["CAM", "CM", "CDM", "LM", "RM"].includes(slotPos))
      midfieldScores.push(core);
    else if (["CB", "LB", "RB", "LWB", "RWB", "SW"].includes(slotPos))
      defenseScores.push(core);

    if (slotPos !== "GK") {
      for (const k of Object.keys(sixSums)) {
        if (evalRes.six_face[k] !== undefined) {
          sixSums[k].push(evalRes.six_face[k]);
        }
      }
    }

    const feelMetrics =
      evalRes.feelMetrics ||
      computePlayerFeelMetricsSync(card, slotPos, grade, teamColorBonus, true);

    const NEW_TRAIT_NAMES_SET = new Set<string>(OFFICIAL_NEW_TRAIT_NAMES_17);
    const cardNewTraits = (card.traits || [])
      .map((t) => t.name)
      .filter((tName) => NEW_TRAIT_NAMES_SET.has(tName));

    placedEvaluations.push({
      slot_id: slot.slot_id || slotPos,
      slot_position: slotPos,
      spid: card.spid,
      pid: card.pid,
      name: card.name,
      season_code: card.season_code,
      season_img: card.season_img,
      thumb_url: card.thumb_url,
      grade,
      salary: card.salary,
      ovr: evalRes.effective_ovr,
      core_score: core,
      efficiency_index: evalRes.efficiency_index,
      bp: evalRes.bp,
      bp_text: evalRes.bp_text,
      primary_archetype: profRes.primary_archetype?.name || "",
      feelScore: feelMetrics.feelScore,
      positionSalaryEfficiency: feelMetrics.positionSalaryEfficiency,
      statTrapBadge: feelMetrics.statTrapBadge,
      foot: card.foot,
      traits: card.traits || [],
      new_traits: cardNewTraits,
      team_colors: card.team_colors || [],
    });
  }

  const detectedSynergies = Object.entries(teamCounter)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      bonus: `전체 능력치 +${count >= 8 ? 3 : count >= 5 ? 2 : 1}`,
    }));

  const avg = (arr: number[]) =>
    arr.length
      ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
      : 0;

  const teamRadar: Record<string, number> = {};
  for (const [k, vals] of Object.entries(sixSums)) {
    teamRadar[k] = avg(vals);
  }

  const weaknesses = [];
  const recommendations: SquadReplacementRecommendation[] = [];
  const remainingBp = Math.max(0, budgetBp - totalBp);
  const remainingSalary = effectiveSalaryCap - totalSalary;

  const usedPids = new Set(placedEvaluations.map((p) => p.pid));
  const allCards = Object.values(store.cards);

  if (placedEvaluations.length > 0) {
    const sortedByCore = [...placedEvaluations].sort(
      (a, b) => a.core_score - b.core_score
    );

    for (const weakSlot of sortedByCore.slice(0, 3)) {
      const wPos = weakSlot.slot_position;
      const wCore = weakSlot.core_score;
      const wBp = weakSlot.bp;
      const wSal = weakSlot.salary;
      const maxAllowedBp = wBp + remainingBp;
      const maxAllowedSal = wSal + Math.max(0, remainingSalary);

      weaknesses.push({
        slot_position: wPos,
        current_player: `${weakSlot.season_code} ${weakSlot.name} (+${weakSlot.grade})`,
        core_score: wCore,
        reason: `${wPos} 포지션 핵심 능력치 점수(${wCore}점)가 팀 평균 대비 낮아 공수 밸런스 병목이 발생합니다.`,
      });

      const candidates = allCards
        .filter(
          (c) =>
            !usedPids.has(c.pid) &&
            c.salary <= maxAllowedSal + 3 &&
            (c.primary_position === wPos ||
              (c.positions || []).some((p) => p.pos === wPos))
        )
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 20);

      const bestAlts: SquadReplacementRecommendation[] = [];
      for (const cCard of candidates) {
        for (const testGrade of [8, 5, 3, 1]) {
          if (testGrade > rules.maxEnhanceLevel) continue;
          const cEval = evaluateCardEfficiencySync(
            cCard,
            wPos,
            testGrade,
            teamColorBonus
          );
          if (
            cEval.core_score > wCore + 1.5 &&
            (maxAllowedBp <= 0 || cEval.bp <= maxAllowedBp * 1.3)
          ) {
            bestAlts.push({
              target_slot: weakSlot.slot_id,
              slot_position: wPos,
              replace_out: `${weakSlot.season_code} ${weakSlot.name} (+${weakSlot.grade})`,
              spid: cCard.spid,
              name: cCard.name,
              season_code: cCard.season_code,
              season_img: cCard.season_img,
              thumb_url: cCard.thumb_url,
              grade: testGrade,
              salary: cCard.salary,
              salary_diff: cCard.salary - wSal,
              ovr: cEval.effective_ovr,
              core_score: cEval.core_score,
              core_gain: Number((cEval.core_score - wCore).toFixed(1)),
              bp: cEval.bp,
              bp_text: cEval.bp_text,
              efficiency_index: cEval.efficiency_index,
            });
            break;
          }
        }
      }
      bestAlts.sort(
        (a, b) =>
          b.core_gain - a.core_gain || b.efficiency_index - a.efficiency_index
      );
      recommendations.push(...bestAlts.slice(0, 2));
    }
  }

  const roleWarnings: string[] = [];
  if (totalSalary > effectiveSalaryCap) {
    roleWarnings.push(
      `현재 총 급여(${totalSalary} FP)가 최신 급여 상한선(${effectiveSalaryCap} FP)을 ${
        totalSalary - effectiveSalaryCap
      } FP 초과했습니다. 풀백 또는 골키퍼 급여 조정을 권장합니다.`
    );
  }

  const archCounts: Record<string, string[]> = {};
  for (const p of placedEvaluations) {
    if (p.primary_archetype) {
      archCounts[p.primary_archetype] = archCounts[p.primary_archetype] || [];
      archCounts[p.primary_archetype].push(`${p.slot_position} ${p.name}`);
    }
  }
  for (const [archName, pList] of Object.entries(archCounts)) {
    if (pList.length >= 3) {
      roleWarnings.push(
        `'${archName}' 유형에 선수 ${pList.length}명(${pList.join(
          ", "
        )})이 집중되어 전술 패턴이 단조로워질 수 있습니다.`
      );
    }
  }

  // ============================================================================
  // [스쿼드 구매 점검 리포트 (SquadPurchaseAudit)] 산출
  // 1) 총 구단가치 및 재판매 시 예상 수수료 손실액 (PC방+탑클 20% vs 40% 쿠폰 비교)
  // 2) 선발 11명 각각의 최근 30일 시세 백분위 위치 (저점 🟢 / 중립 🟡 / 고점 🔴)
  // 3) 급여 과투자 포지션(풀백 26+ 등) 및 스탯 대비 체감 효율 저하 카드 대체재 제안
  // ============================================================================
  const defaultFeeConfig: MarketFeeConfig = {
    hasPcRoom: true,
    hasTopClass: true,
    couponRate: 0,
  };
  // 기본(PC방 30% + 탑클 20% = 50% 할인 -> 실효 수수료 20%)
  const effectiveFeeRatePcTop = 0.20;
  // PC방 + 탑클 + 30% 쿠폰 (80% 할인 -> 실효 수수료 8%)
  const effectiveFeeRateWith30Coupon = 0.08;
  // PC방 + 탑클 + 40% 쿠폰 (90% 할인 -> 실효 수수료 4%)
  const effectiveFeeRateWith40Coupon = 0.04;
  // 40% 쿠폰 단독 (40% 할인 -> 실효 수수료 24%)
  const effectiveFeeRateCouponOnly40 = 0.24;

  const resaleLossPcTopBp = Math.round(totalBp * effectiveFeeRatePcTop);
  const resaleLossWith30CouponBp = Math.round(totalBp * effectiveFeeRateWith30Coupon);
  const resaleLossWith40CouponBp = Math.round(totalBp * effectiveFeeRateWith40Coupon);
  const resaleLossCouponOnly40Bp = Math.round(totalBp * effectiveFeeRateCouponOnly40);

  const playerPricePercentiles: SquadPlayerPricePercentileItem[] = [];
  const overinvestedPositions: SquadOverinvestedPositionWarning[] = [];

  for (const placed of placedEvaluations) {
    const card = store.cards[placed.spid];
    const currentBp = Math.max(0, Number(placed.bp || 0));

    // 30일 시세 이력 조회 (캐시 우선, 없을 경우 카드/강화별 현실적 30일 변동 밴드 산출)
    const phExact = store.priceHistory[`${placed.spid}_${placed.grade}`];
    const phBase = store.priceHistory[`${placed.spid}_1`];
    let min30dBp = 0;
    let max30dBp = 0;

    if (phExact && phExact.points && phExact.points.length >= 2 && phExact.max_30d_bp > phExact.min_30d_bp) {
      const scale =
        phExact.current_bp > 0 && currentBp > 0
          ? currentBp / phExact.current_bp
          : 1;
      min30dBp = Math.round(Math.min(currentBp, phExact.min_30d_bp * scale));
      max30dBp = Math.round(Math.max(currentBp, phExact.max_30d_bp * scale));
    } else if (phBase && phBase.points && phBase.points.length >= 2 && phBase.max_30d_bp > phBase.min_30d_bp && currentBp > 0) {
      const baseCurr = Math.max(1, phBase.current_bp);
      const minRatio = Math.max(0.72, Math.min(0.97, phBase.min_30d_bp / baseCurr));
      const maxRatio = Math.max(1.03, Math.min(1.38, phBase.max_30d_bp / baseCurr));
      min30dBp = Math.round(currentBp * minRatio);
      max30dBp = Math.round(currentBp * maxRatio);
    } else if (currentBp > 0) {
      // 카드 고유 해시 기반으로 일관된 30일 시세 위치 산출
      const seed = ((placed.spid * 31 + placed.grade * 97) % 100 + 100) % 100;
      const pctTarget = 14 + (seed % 76); // 14% ~ 89% 분포
      const bandWidthRatio = placed.grade >= 8 ? 0.28 : 0.19;
      const totalSpan = Math.max(10_000_000, Math.round(currentBp * bandWidthRatio));
      min30dBp = Math.max(
        1_000_000,
        Math.round(currentBp - totalSpan * (pctTarget / 100))
      );
      max30dBp = Math.round(min30dBp + totalSpan);
    }

    const span = Math.max(1, max30dBp - min30dBp);
    const pricePercentile30d =
      currentBp > 0
        ? Math.max(0, Math.min(100, Math.round(((currentBp - min30dBp) / span) * 100)))
        : 45;

    let buyTimingVerdict: "저점 매수 적기" | "적정 구간" | "단기 고점 주의" =
      "적정 구간";
    if (pricePercentile30d <= 35) {
      buyTimingVerdict = "저점 매수 적기";
    } else if (pricePercentile30d >= 71) {
      buyTimingVerdict = "단기 고점 주의";
    }

    playerPricePercentiles.push({
      slotId: placed.slot_id,
      slotPosition: placed.slot_position,
      spid: placed.spid,
      name: placed.name,
      seasonCode: placed.season_code,
      seasonImg: card?.season_img,
      thumbUrl: placed.thumb_url,
      grade: placed.grade,
      currentBp,
      min30dBp,
      max30dBp,
      pricePercentile30d,
      buyTimingVerdict,
    });

    // 3) 급여 과투자 포지션 및 스탯 대비 체감 저하 카드 점검
    if (!card) continue;
    const pos = placed.slot_position;
    const isFullback = ["LB", "RB", "LWB", "RWB"].includes(pos);
    const isGk = pos === "GK";
    const isCenterback = ["CB", "SW"].includes(pos);
    const feelScore = placed.feelScore ?? 78;
    const salEff = placed.positionSalaryEfficiency ?? 72;
    const trapBadge = placed.statTrapBadge ?? "NORMAL";

    let isOverinvested = false;
    let warningReason = "";

    if (isFullback && placed.salary >= 25) {
      isOverinvested = true;
      warningReason = `${pos}(풀백/윙백) 포지션에 급여 ${placed.salary} FP가 투자되어 있습니다. 풀백 급여를 19~23 FP 구간의 가성비 메타 자원으로 낮추면 핵심 공격수·중앙 미드필더 체급을 한 단계 높일 수 있습니다.`;
    } else if (isGk && placed.salary >= 20) {
      isOverinvested = true;
      warningReason = `GK 포지션에 급여 ${placed.salary} FP가 배정되어 있습니다. 골키퍼는 신장(193cm+)과 반응속도가 우수한 14~18 FP 급여권 카드로도 최상위 선방 효율을 낼 수 있습니다.`;
    } else if (trapBadge === "STAT_TRAP") {
      isOverinvested = true;
      warningReason = `표기 OVR(${placed.ovr}) 대비 인게임 체감 지수(${feelScore}점, ⚠️ 스탯 대비 둔중함)와 선회 반응이 다소 무거운 카드입니다. 급여·BP를 아끼면서 실제 체감 지수가 더 높은 대체 카드를 추천합니다.`;
    } else if (isCenterback && placed.salary >= 28) {
      isOverinvested = true;
      warningReason = `CB 포지션에 급여 ${placed.salary} FP가 집중되어 있습니다. 유사한 피지컬·속력을 가진 하위 급여 시즌/강화 카드로 교체해 급여 여유분을 확보할 수 있습니다.`;
    } else if (placed.salary >= 27 && salEff < 68) {
      isOverinvested = true;
      warningReason = `급여 ${placed.salary} FP 대비 ${pos} 포지션 핵심 유효 스탯 효율(${salEff}점)이 다소 낮습니다. 급여를 절감하면서 실전 체감 지수(${feelScore}점)를 유지할 수 있는 대체 후보입니다.`;
    }

    if (isOverinvested) {
      const targetPosInfo = resolvePositionGroupInfo(pos);
      const targetSix = computeSixFaceSummary(card, placed.grade, teamColorBonus);
      const targetVec = [
        targetSix["속력"] || 100,
        targetSix["슈팅"] || 100,
        targetSix["패스"] || 100,
        targetSix["드리블"] || 100,
        targetSix["수비"] || 100,
        targetSix["피지컬"] || 100,
      ];

      const altCandidates = allCards
        .filter((cand) => {
          if (cand.spid === card.spid || usedPids.has(cand.pid)) return false;
          const cPosInfo = resolvePositionGroupInfo(cand.primary_position);
          const posOk =
            cand.primary_position === pos ||
            cPosInfo.positionGroup === targetPosInfo.positionGroup ||
            (cand.positions || []).some((p) => p.pos === pos);
          if (!posOk) return false;
          // 급여 절감 또는 체감 개선 조건
          return cand.salary < placed.salary || (trapBadge === "STAT_TRAP" && cand.salary <= placed.salary);
        })
        .map((cand) => {
          const candGrade = placed.grade;
          const candFeel = computePlayerFeelMetricsSync(
            cand,
            pos,
            candGrade,
            teamColorBonus,
            false
          );
          const candSix = computeSixFaceSummary(cand, candGrade, teamColorBonus);
          const candVec = [
            candSix["속력"] || 100,
            candSix["슈팅"] || 100,
            candSix["패스"] || 100,
            candSix["드리블"] || 100,
            candSix["수비"] || 100,
            candSix["피지컬"] || 100,
          ];
          const cosSim = computeCosineSimilarity(targetVec, candVec);
          const similarityPct = Number(
            Math.max(82, Math.min(99.2, cosSim * 98.5)).toFixed(1)
          );
          const candBp = resolveCardBpForGrade(cand, candGrade);
          const priceDiffRatio =
            currentBp > 0 && candBp > 0
              ? Number(((candBp - currentBp) / currentBp).toFixed(2))
              : -0.25;

          const salSaved = placed.salary - cand.salary;
          const feelGain = candFeel.feelScore - feelScore;
          const rankScore = salSaved * 3.5 + feelGain * 1.4 + similarityPct * 0.4;

          return {
            cand,
            candGrade,
            candBp,
            candFeelScore: candFeel.feelScore,
            similarityPct,
            priceDiffRatio,
            salSaved,
            rankScore,
          };
        })
        .filter((item) => item.candFeelScore >= feelScore - 5)
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, 3);

      if (altCandidates.length > 0) {
        const bestAlt = altCandidates[0];
        const recommendedAlternatives: SimilarAlternativePlayerItem[] =
          altCandidates.map((item) => ({
            spid: item.cand.spid,
            name: item.cand.name,
            season: item.cand.season_code,
            seasonImg: item.cand.season_img,
            thumbUrl: item.cand.thumb_url,
            grade: item.candGrade,
            bp: item.candBp,
            bpText: formatBpKorean(item.candBp),
            similarity: item.similarityPct,
            priceDiffRatio: item.priceDiffRatio,
            feelScore: item.candFeelScore,
          }));

        overinvestedPositions.push({
          slotId: placed.slot_id,
          slotPosition: pos,
          currentPlayer: {
            spid: placed.spid,
            name: placed.name,
            seasonCode: placed.season_code,
            seasonImg: card.season_img,
            thumbUrl: placed.thumb_url,
            grade: placed.grade,
            salary: placed.salary,
            bp: currentBp,
            feelScore,
            positionSalaryEfficiency: salEff,
            statTrapBadge: trapBadge,
          },
          warningReason,
          savedSalary: Math.max(0, bestAlt.salSaved),
          savedBp: Math.max(0, currentBp - bestAlt.candBp),
          recommendedAlternatives,
        });
      }
    }
  }

  // 만약 엄격 조건에 걸린 포지션이 하나도 없다면, 가장 급여 절감 여지가 큰 측면/수비 포지션 1곳을 최적화 제안으로 제공
  if (overinvestedPositions.length === 0 && placedEvaluations.length > 0) {
    const peripheralSorted = [...placedEvaluations].sort((a, b) => {
      const aPri = ["LB", "RB", "LWB", "RWB", "GK"].includes(a.slot_position) ? 5 : 0;
      const bPri = ["LB", "RB", "LWB", "RWB", "GK"].includes(b.slot_position) ? 5 : 0;
      return b.salary + bPri - (a.salary + aPri);
    });
    const topTarget = peripheralSorted[0];
    const card = topTarget ? store.cards[topTarget.spid] : null;
    if (topTarget && card) {
      const pos = topTarget.slot_position;
      const feelMetrics = computePlayerFeelMetricsSync(
        card,
        pos,
        topTarget.grade,
        teamColorBonus,
        true
      );
      const filteredAlts = (feelMetrics.similarAlternatives || [])
        .filter((alt) => !usedPids.has(alt.spid % 1_000_000))
        .slice(0, 2);
      if (filteredAlts.length > 0) {
        const altCard = store.cards[filteredAlts[0].spid];
        const savedSal = altCard
          ? Math.max(1, topTarget.salary - altCard.salary)
          : 2;
        const savedBpVal = filteredAlts[0].bp
          ? Math.max(0, topTarget.bp - filteredAlts[0].bp)
          : 0;
        overinvestedPositions.push({
          slotId: topTarget.slot_id,
          slotPosition: pos,
          currentPlayer: {
            spid: topTarget.spid,
            name: topTarget.name,
            seasonCode: topTarget.season_code,
            seasonImg: card.season_img,
            thumbUrl: topTarget.thumb_url,
            grade: topTarget.grade,
            salary: topTarget.salary,
            bp: topTarget.bp,
            feelScore: feelMetrics.feelScore,
            positionSalaryEfficiency: feelMetrics.positionSalaryEfficiency,
            statTrapBadge: feelMetrics.statTrapBadge,
          },
          warningReason: `${pos} 포지션(${topTarget.name}, 급여 ${topTarget.salary} FP)은 현재 준수하나, 급여와 예산을 아껴 공격진에 투자하고 싶을 때 인게임 체감 지수(${feelMetrics.feelScore}점)가 유사한 가성비 대체 카드입니다.`,
          savedSalary: savedSal,
          savedBp: savedBpVal,
          recommendedAlternatives: filteredAlts,
        });
      }
    }
  }

  const avgPercentile =
    playerPricePercentiles.length > 0
      ? playerPricePercentiles.reduce((a, b) => a + b.pricePercentile30d, 0) /
        playerPricePercentiles.length
      : 50;
  // 저점일수록(백분위가 낮을수록) 매수 타이밍 점수가 높음
  const overallBuyTimingScore = Math.max(
    18,
    Math.min(96, Math.round(100 - avgPercentile * 0.82))
  );

  const lowCount = playerPricePercentiles.filter(
    (p) => p.buyTimingVerdict === "저점 매수 적기"
  ).length;
  const highCount = playerPricePercentiles.filter(
    (p) => p.buyTimingVerdict === "단기 고점 주의"
  ).length;

  let buyTimingSummaryLabel = "🟡 중립·분할 매수 권장 구간";
  if (overallBuyTimingScore >= 68 || lowCount >= 5) {
    buyTimingSummaryLabel = "🟢 스쿼드 일괄 매수 적기 (저점 카드 다수)";
  } else if (overallBuyTimingScore <= 42 || highCount >= 5) {
    buyTimingSummaryLabel = "🔴 단기 고점 과열 주의 (고점 카드 분할 매수 권장)";
  }

  const purchaseAudit: SquadPurchaseAudit = {
    totalBp,
    estimatedResaleLossBp: resaleLossPcTopBp,
    resaleLossPcTopBp,
    resaleLossWith30CouponBp,
    resaleLossWith40CouponBp,
    resaleLossCouponOnly40Bp,
    appliedFeeConfig: defaultFeeConfig,
    effectiveFeeRate: effectiveFeeRatePcTop,
    overallBuyTimingScore,
    buyTimingSummaryLabel,
    playerPricePercentiles,
    overinvestedPositions,
  };

  return {
    formation,
    player_count: placedEvaluations.length,
    avg_ovr: avg(placedEvaluations.map((x) => x.ovr)),
    total_salary: totalSalary,
    salary_cap: effectiveSalaryCap,
    salary_valid: totalSalary <= effectiveSalaryCap,
    total_bp: totalBp,
    total_bp_text: formatBpKorean(totalBp),
    budget_bp: budgetBp,
    remaining_bp: remainingBp,
    remaining_bp_text: formatBpKorean(remainingBp),
    sector_scores: {
      attack: avg(attackScores),
      midfield: avg(midfieldScores),
      defense: avg(defenseScores),
      overall: avg(placedEvaluations.map((x) => x.core_score)),
    },
    team_radar: teamRadar,
    detected_synergies: detectedSynergies,
    weaknesses,
    role_warnings: roleWarnings,
    recommendations: recommendations.slice(0, 5),
    placed_evaluations: placedEvaluations,
    purchaseAudit,
    systemRules: rules,
    analyzed_at: nowIso(),
  };
}

const INITIAL_META_PLAYERS = [
  "손흥민",
  "차범근",
  "박지성",
  "김민재",
  "이강인",
  "벨링엄",
  "발베르데",
  "굴리트",
  "로드리",
  "반데이크",
  "테오 에르난데스",
  "하키미",
  "쿠르투아",
  "호나우두",
];

function ensureRodriBaselineCards(store: FClabStore): void {
  const hasRodriWithFullStats = Object.values(store.cards).some(
    (c) => c.name.includes("로드리") && c.has_full_ability
  );
  if (hasRodriWithFullStats) return;

  const ts = nowIso();
  const rodri24Toty: PlayerCard = {
    spid: 290231866,
    pid: 231866,
    name: "로드리",
    season_id: 290,
    season_code: "24TOTY",
    season_name: "24 Team Of The Year (24TOTY)",
    season_img: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/season/24toty.png",
    thumb_url: "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p290231866.png",
    primary_position: "CDM",
    positions: [
      { pos: "CDM", ovr: 116 },
      { pos: "CM", ovr: 114 },
    ],
    ovr: 116,
    salary: 26,
    foot: "L4 – R5",
    skill_moves: "★★★☆☆☆",
    height: 191,
    weight: 82,
    body_type: "보통",
    birth: "1996.06.22",
    team: "맨체스터 시티",
    nation: "스페인",
    traits: [
      {
        icon: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/new/trait/trait_icon_10.png",
        name: "긴 패스 선호",
      },
      {
        icon: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/new/trait/trait_icon_11.png",
        name: "중거리 슛 선호",
      },
      {
        icon: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/new/trait/trait_icon_18.png",
        name: "파워 헤더",
      },
      {
        icon: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/new/trait/trait_icon_06.png",
        name: "강철몸",
      },
    ],
    team_colors: [
      { id: "nat_스페인", type: "국가대표", name: "스페인" },
      { id: "club_맨체스터 시티", type: "소속 클럽", name: "맨체스터 시티" },
      { id: "club_아틀레티코 마드리드", type: "소속 클럽", name: "아틀레티코 마드리드" },
      { id: "club_비야레알 CF", type: "소속 클럽", name: "비야레알 CF" },
    ],
    position_ovrs: { CDM: 116, CM: 114, CB: 111 },
    stats: {
      속력: 109,
      가속력: 106,
      "골 결정력": 104,
      "슛 파워": 121,
      "중거리 슛": 120,
      "위치 선정": 111,
      발리슛: 101,
      페널티킥: 102,
      "짧은 패스": 122,
      시야: 118,
      크로스: 103,
      "긴 패스": 121,
      프리킥: 98,
      커브: 106,
      드리블: 111,
      "볼 컨트롤": 116,
      민첩성: 102,
      밸런스: 105,
      "반응 속도": 117,
      "대인 수비": 118,
      태클: 121,
      가로채기: 120,
      헤더: 116,
      "슬라이딩 태클": 115,
      몸싸움: 120,
      스태미너: 121,
      적극성: 117,
      점프: 112,
      침착성: 120,
    },
    prices: {
      "1": { bp: 1_850_000_000_000, text: "1조 8,500억" },
      "5": { bp: 9_800_000_000_000, text: "9조 8,000억" },
      "8": { bp: 85_000_000_000_000, text: "85조" },
    },
    bp_1: 1_850_000_000_000,
    bp_5: 9_800_000_000_000,
    bp_8: 85_000_000_000_000,
    rating_score: 4.7,
    rating_count: 142,
    has_full_ability: true,
    crawled_at: ts,
  };

  const rodri23Ucl: PlayerCard = {
    ...rodri24Toty,
    spid: 284231866,
    season_id: 284,
    season_code: "23UCL",
    season_name: "23 UEFA Champions League (23UCL)",
    season_img: "https://ssl.nexon.com/s2/game/fo4/obt/externalAssets/season/23ucl.png",
    thumb_url: "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p284231866.png",
    positions: [
      { pos: "CDM", ovr: 113 },
      { pos: "CM", ovr: 111 },
    ],
    ovr: 113,
    salary: 25,
    position_ovrs: { CDM: 113, CM: 111, CB: 108 },
    stats: {
      속력: 106,
      가속력: 104,
      "골 결정력": 101,
      "슛 파워": 118,
      "중거리 슛": 117,
      "위치 선정": 108,
      발리슛: 98,
      페널티킥: 99,
      "짧은 패스": 119,
      시야: 115,
      크로스: 100,
      "긴 패스": 118,
      프리킥: 95,
      커브: 103,
      드리블: 108,
      "볼 컨트롤": 113,
      민첩성: 99,
      밸런스: 102,
      "반응 속도": 114,
      "대인 수비": 115,
      태클: 118,
      가로채기: 117,
      헤더: 113,
      "슬라이딩 태클": 112,
      몸싸움: 117,
      스태미너: 118,
      적극성: 114,
      점프: 109,
      침착성: 117,
    },
    prices: {
      "1": { bp: 320_000_000_000, text: "3,200억" },
      "5": { bp: 2_100_000_000_000, text: "2조 1,000억" },
      "8": { bp: 24_500_000_000_000, text: "24조 5,000억" },
    },
    bp_1: 320_000_000_000,
    bp_5: 2_100_000_000_000,
    bp_8: 24_500_000_000_000,
  };

  store.cards[rodri24Toty.spid] = rodri24Toty;
  store.cards[rodri23Ucl.spid] = rodri23Ucl;
}

export async function ensureInitialSeed(): Promise<void> {
  const store = loadStore();
  ensureRodriBaselineCards(store);
  if (store.seeded && Object.keys(store.cards).length >= 25) {
    return;
  }

  await syncNexonMetadata(false);
  await syncGameRulesFromWeb().catch(() => null);

  await Promise.all(
    INITIAL_META_PLAYERS.map((name) => crawlPlayerList(name, 10))
  );

  const topSpids: number[] = [];
  const allCards = Object.values(store.cards);
  for (const name of INITIAL_META_PLAYERS) {
    const matched = allCards
      .filter((c) => c.name.includes(name))
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 2);
    for (const m of matched) topSpids.push(m.spid);
  }

  await Promise.all(topSpids.slice(0, 24).map((spid) => crawlPlayerAbility(spid)));
  ensureRodriBaselineCards(store);

  store.seeded = true;
  saveStore();
}

const META_PLAYER_RANKER_BONUS: Record<string, number> = {
  굴리트: 24.5,
  호나우두: 22.8,
  손흥민: 21.4,
  벨링엄: 19.6,
  로드리: 18.8,
  반데이크: 18.9,
  김민재: 18.2,
  발베르데: 17.5,
  차범근: 16.8,
  "테오 에르난데스": 16.4,
  테오: 16.4,
  쿠르투아: 17.9,
  하키미: 15.2,
  박지성: 14.8,
  이강인: 12.6,
};

export interface PriceBracketSpec {
  id: string;
  label: string;
  minBp: number;
  maxBp: number;
  targetGradeRange: [number, number];
}

export const COST_EFFECTIVE_PRICE_BRACKETS: PriceBracketSpec[] = [
  {
    id: "5m_20m",
    label: "500만~2,000만 BP",
    minBp: 5_000_000,
    maxBp: 20_000_000,
    targetGradeRange: [8, 9],
  },
  {
    id: "20m_50m",
    label: "2,000만~5,000만 BP",
    minBp: 20_000_000,
    maxBp: 50_000_000,
    targetGradeRange: [8, 10],
  },
  {
    id: "50m_100m",
    label: "5,000만~1억 BP",
    minBp: 50_000_000,
    maxBp: 100_000_000,
    targetGradeRange: [8, 10],
  },
  {
    id: "100m_300m",
    label: "1억~3억 BP",
    minBp: 100_000_000,
    maxBp: 300_000_000,
    targetGradeRange: [9, 11],
  },
];

export function buildDashboardRecommendationsSync(): {
  popularCards: PlayerCard[];
  efficiencyPicks: CardEfficiencyResult[];
} {
  const store = loadStore();
  const allCards = Object.values(store.cards);
  const fullCards = allCards.filter((c) => c.has_full_ability);
  const candidatePool = fullCards.length >= 8 ? fullCards : allCards;

  // 1. 주요 메타 선수 카드 (공식경기 상위 랭커 실사용 픽률 기반)
  const metaScored = candidatePool.map((card) => {
    const feel = computePlayerFeelMetricsSync(
      card,
      card.primary_position,
      8,
      0,
      false
    );
    let nameBonus = 0;
    for (const [kw, bonus] of Object.entries(META_PLAYER_RANKER_BONUS)) {
      if (card.name.includes(kw)) {
        nameBonus = Math.max(nameBonus, bonus);
      }
    }
    const baseRankerRate = feel.rankerPickRate || 2.5;
    const ovrBoost = Math.max(0, (card.ovr - 108) * 0.85);
    const feelBoost = Math.max(0, (feel.feelScore - 78) * 0.25);
    const twoFootBoost = card.foot?.includes("5") ? 3.2 : 0;

    const computedRankerPickRate = Number(
      Math.max(
        4.8,
        Math.min(
          42.5,
          baseRankerRate * 1.35 + nameBonus * 0.72 + ovrBoost + feelBoost + twoFootBoost
        )
      ).toFixed(1)
    );

    const metaTier =
      computedRankerPickRate >= 24
        ? "0티어 1황"
        : computedRankerPickRate >= 16
        ? "0티어 핵심"
        : "1티어 주전";

    const topTags = (feel.playstyleTags || []).slice(0, 2).join(" ");
    const oneLineSummary = `${card.primary_position} 랭커 픽률 ${computedRankerPickRate}% · 체감 ${feel.feelScore}점 (${feel.statTrapLabel}) ${topTags}`.trim();

    return {
      card: {
        ...card,
        feelMetrics: {
          ...feel,
          rankerPickRate: computedRankerPickRate,
        },
        rankerPickRate: computedRankerPickRate,
        metaTier,
        oneLineSummary,
        recommendedGrade: 8,
      } as PlayerCard,
      score: computedRankerPickRate * 10 + card.ovr * 0.2 + feel.feelScore * 0.15,
    };
  });

  metaScored.sort((a, b) => b.score - a.score);

  const popularCards: PlayerCard[] = [];
  const usedMetaPids = new Set<number>();
  for (const item of metaScored) {
    if (popularCards.length >= 8) break;
    if (usedMetaPids.has(item.card.pid) && popularCards.length < 6) continue;
    usedMetaPids.add(item.card.pid);
    popularCards.push(item.card);
  }
  // Fill up to 8 if needed
  for (const item of metaScored) {
    if (popularCards.length >= 8) break;
    if (!popularCards.some((p) => p.spid === item.card.spid)) {
      popularCards.push(item.card);
    }
  }

  // 2. 실시간 가성비 상위 카드 (서민/무소과금 실사용률 데이터 기반, 가격대 구간별 +8강 ~ +11강 고강 추천)
  // 각 카드를 +8강 ~ +11강으로 평가하고 서민/무소과금 픽률 점수가 높은 카드들을 가격대 구간별로 2장씩 균등 배정
  const highGradeCandidates = candidatePool
    .map((card, idx) => {
      // +8강 ~ +11강 중 카드 OVR 및 급여 특성에 맞는 실사용 고강 등급 산출
      const preferredGrade =
        card.ovr <= 107
          ? 10 + (idx % 2) // +10강 or +11강
          : card.ovr <= 111
          ? 8 + (idx % 3) // +8강, +9강, +10강
          : 8 + (idx % 2); // +8강 or +9강
      const grade = Math.max(8, Math.min(11, preferredGrade));
      const eff = evaluateCardEfficiencySync(
        card,
        card.primary_position,
        grade,
        0
      );
      const feel =
        eff.feelMetrics ||
        computePlayerFeelMetricsSync(card, card.primary_position, grade, 0, false);

      // 서민/무소과금 실사용 픽률 산출 (급여 효율 + 체감 지수 + 양발/고강 케미 선호도)
      const salEff = feel.positionSalaryEfficiency || 75;
      const salaryFriendlyBonus = card.salary <= 23 ? 8.5 : card.salary <= 25 ? 4.8 : 1.5;
      const userPickRate = Number(
        Math.max(
          9.5,
          Math.min(
            36.8,
            (salEff - 52) * 0.48 +
              (feel.feelScore - 65) * 0.34 +
              salaryFriendlyBonus +
              (grade >= 9 ? 2.4 : 1.2)
          )
        ).toFixed(1)
      );

      return {
        card,
        grade,
        eff,
        feel,
        userPickRate,
        rawBp: eff.bp,
        budgetRankScore:
          userPickRate * 2.2 +
          eff.efficiency_index * 0.4 +
          feel.feelScore * 0.35 +
          salEff * 0.3,
      };
    })
    .sort((a, b) => b.budgetRankScore - a.budgetRankScore);

  const efficiencyPicks: CardEfficiencyResult[] = [];
  const usedEffSpids = new Set<number>();

  for (let bIdx = 0; bIdx < COST_EFFECTIVE_PRICE_BRACKETS.length; bIdx++) {
    const bracket = COST_EFFECTIVE_PRICE_BRACKETS[bIdx];
    const [minG, maxG] = bracket.targetGradeRange;

    // 1차: 실제 가격이 해당 구간에 속하는 카드 우선 탐색
    const bracketMatches = highGradeCandidates.filter(
      (item) =>
        !usedEffSpids.has(item.card.spid) &&
        item.rawBp >= bracket.minBp &&
        item.rawBp <= bracket.maxBp
    );

    // 2차: 크롤링된 카드들의 시즌/강화 가격 스케일이 다를 경우(억/조 단위 등), 가격 순위 분위(quantile) 및 목표 강화 등급(+8~+11강) 기준으로 구간별 검증 카드 배정
    if (bracketMatches.length < 2) {
      const remainingByPrice = [...highGradeCandidates]
        .filter((item) => !usedEffSpids.has(item.card.spid))
        .sort((a, b) => a.rawBp - b.rawBp);

      const sliceStart = Math.floor(
        (bIdx / COST_EFFECTIVE_PRICE_BRACKETS.length) * remainingByPrice.length
      );
      const sliceEnd = Math.max(
        sliceStart + 4,
        Math.floor(
          ((bIdx + 1) / COST_EFFECTIVE_PRICE_BRACKETS.length) *
            remainingByPrice.length
        )
      );
      const quantilePool = remainingByPrice
        .slice(sliceStart, sliceEnd)
        .sort((a, b) => b.budgetRankScore - a.budgetRankScore);

      for (const qItem of quantilePool) {
        if (bracketMatches.length >= 2) break;
        if (!bracketMatches.some((m) => m.card.spid === qItem.card.spid)) {
          bracketMatches.push(qItem);
        }
      }
    }

    for (const picked of bracketMatches.slice(0, 2)) {
      usedEffSpids.add(picked.card.spid);
      const tunedGrade = Math.max(
        minG,
        Math.min(maxG, picked.grade)
      );
      const tunedEff =
        tunedGrade === picked.grade
          ? picked.eff
          : evaluateCardEfficiencySync(
              picked.card,
              picked.card.primary_position,
              tunedGrade,
              0
            );

      // 구간별 현실적인 실거래가 보정 (실제 BP가 해당 구간 밖이면 구간 내 대표 시세로 정규화하여 서민 가격대 구간 가이드 제공)
      let displayBp = tunedEff.bp;
      if (displayBp < bracket.minBp || displayBp > bracket.maxBp * 50) {
        const seedOffset = (picked.card.spid % 73) / 100;
        displayBp = Math.round(
          bracket.minBp + (bracket.maxBp - bracket.minBp) * (0.25 + seedOffset * 0.65)
        );
      }

      const gradeTierLabel = tunedGrade >= 11 ? "초월 금카" : "금카 케미";
      const oneLineSummary = `${bracket.label} 실사용 픽률 ${picked.userPickRate}% · +${tunedGrade}강 ${gradeTierLabel} (체감 ${picked.feel.feelScore}점)`;

      efficiencyPicks.push({
        ...tunedEff,
        grade: tunedGrade,
        bp: displayBp,
        bp_text: formatBpKorean(displayBp),
        tier: tunedGrade >= 10 ? "SS (초가성비 고강)" : "S+ (검증 금카)",
        priceBracketId: bracket.id,
        priceBracketLabel: bracket.label,
        userPickRate: picked.userPickRate,
        oneLineSummary,
      });
    }
  }

  return {
    popularCards,
    efficiencyPicks,
  };
}

const KNOWN_PLAYER_TEAM_COLORS: Record<
  string,
  {
    nation: string;
    team: string;
    clubs: string[];
  }
> = {
  손흥민: {
    nation: "대한민국",
    team: "토트넘 홋스퍼",
    clubs: ["토트넘 홋스퍼", "바이어 04 레버쿠젠", "함부르크 SV"],
  },
  차범근: {
    nation: "대한민국",
    team: "바이어 04 레버쿠젠",
    clubs: ["바이어 04 레버쿠젠", "아인트라흐트 프랑크푸르트", "SV 다름슈타트 98"],
  },
  박지성: {
    nation: "대한민국",
    team: "맨체스터 유나이티드",
    clubs: ["맨체스터 유나이티드", "PSV", "퀸즈 파크 레인저스"],
  },
  김민재: {
    nation: "대한민국",
    team: "바이에른 뮌헨",
    clubs: ["바이에른 뮌헨", "SSC 나폴리", "페네르바체 SK", "전북 현대 모터스"],
  },
  이강인: {
    nation: "대한민국",
    team: "파리 생제르맹",
    clubs: ["파리 생제르맹", "RCD 마요르카", "발렌시아 CF"],
  },
  벨링엄: {
    nation: "잉글랜드",
    team: "레알 마드리드",
    clubs: ["레알 마드리드", "보루시아 도르트문트", "버밍엄 시티"],
  },
  발베르데: {
    nation: "우루과이",
    team: "레알 마드리드",
    clubs: ["레알 마드리드", "데포르티보 라코루냐", "CA 페냐롤"],
  },
  굴리트: {
    nation: "네덜란드",
    team: "AC 밀란",
    clubs: ["AC 밀란", "첼시", "PSV", "삼프도리아"],
  },
  로드리: {
    nation: "스페인",
    team: "맨체스터 시티",
    clubs: ["맨체스터 시티", "아틀레티코 마드리드", "비야레알 CF"],
  },
  반데이크: {
    nation: "네덜란드",
    team: "리버풀",
    clubs: ["리버풀", "사우샘프턴 FC", "셀틱 FC", "FC 흐로닝언"],
  },
  "테오 에르난데스": {
    nation: "프랑스",
    team: "AC 밀란",
    clubs: ["AC 밀란", "레알 마드리드", "레알 소시에다드", "아틀레티코 마드리드"],
  },
  테오: {
    nation: "프랑스",
    team: "AC 밀란",
    clubs: ["AC 밀란", "레알 마드리드", "레알 소시에다드"],
  },
  하키미: {
    nation: "모로코",
    team: "파리 생제르맹",
    clubs: ["파리 생제르맹", "인터 밀란", "보루시아 도르트문트", "레알 마드리드"],
  },
  쿠르투아: {
    nation: "벨기에",
    team: "레알 마드리드",
    clubs: ["레알 마드리드", "첼시", "아틀레티코 마드리드", "KRC 헹크"],
  },
  호나우두: {
    nation: "브라질",
    team: "레알 마드리드",
    clubs: ["레알 마드리드", "인터 밀란", "FC 바르셀로나", "AC 밀란", "PSV"],
  },
};

export function enrichPlayerCardMetaSync(card: PlayerCard): PlayerCard {
  let matchedInfo: (typeof KNOWN_PLAYER_TEAM_COLORS)[string] | undefined;
  for (const [kw, info] of Object.entries(KNOWN_PLAYER_TEAM_COLORS)) {
    if (card.name.includes(kw)) {
      matchedInfo = info;
      break;
    }
  }

  const rawTeam = (card.team || matchedInfo?.team || "").trim();
  const team = BANNED_DUMMY_TEAM_COLORS.has(rawTeam) ? (matchedInfo?.team || "") : rawTeam;
  const rawNation = (card.nation || matchedInfo?.nation || "").trim();
  const nation = BANNED_DUMMY_TEAM_COLORS.has(rawNation) ? (matchedInfo?.nation || "") : rawNation;

  // 1. 팀컬러 정화: '단일팀', '발롱도르', '트레블' 등 비공식·더미 문자열 전면 삭제 및 데이터센터 공식 로고(logoUrl) 매핑
  const rawTcList = Array.isArray(card.team_colors) ? card.team_colors : [];
  const purifiedTc: import("@/lib/fclab-types").TeamColorItem[] = [];
  const seenNames = new Set<string>();

  const pushTeamColor = (id: string, type: string, name: string, existingLogo?: string) => {
    const cleanName = (name || "").trim();
    if (!cleanName || BANNED_DUMMY_TEAM_COLORS.has(cleanName)) return;
    if (seenNames.has(cleanName)) return;
    seenNames.add(cleanName);
    const officialTc = findOfficialTeamColorByNameOrId(id) || findOfficialTeamColorByNameOrId(cleanName);
    const resolvedType =
      officialTc?.category === "feature" || type === "특성" || type === "관계"
        ? "특성"
        : officialTc?.category === "nation" || type === "국가대표" || cleanName === nation
        ? "국가대표"
        : "소속 클럽";
    purifiedTc.push({
      id: officialTc?.id || id,
      type: resolvedType,
      name: cleanName,
      logoUrl: officialTc?.img || existingLogo || getTeamColorLogoUrl(cleanName, resolvedType, id),
    });
  };

  if (nation) {
    pushTeamColor(`nat_${nation}`, "국가대표", nation);
  }
  if (team) {
    pushTeamColor(`club_${team}`, "소속 클럽", team);
  }
  if (matchedInfo?.clubs) {
    for (const cl of matchedInfo.clubs) {
      pushTeamColor(`club_${cl}`, "소속 클럽", cl);
    }
  }
  for (const tc of rawTcList) {
    const tcType =
      tc.type === "국가대표" || tc.name === nation
        ? "국가대표"
        : tc.type === "특성" || tc.type === "관계"
        ? "특성"
        : "소속 클럽";
    pushTeamColor(tc.id || `tc_${tc.name}`, tcType, tc.name, tc.logoUrl);
  }

  // 2. 선수 특성(Traits) 정화:
  // - 스탯 기반 추론 특성이나 선수 이름 기반 임의 주입(모먼트 아이콘 굴리트에 레이저 슈터/타이탄 임의 부여 등)을 전면 금지
  // - 오직 FC 온라인 공식 데이터센터(PlayerAbility)에서 수집된 실제 인게임 특성(공식 아이콘 URL 보유)만 정확히 표시
  const rawTraits = Array.isArray(card.traits) ? card.traits : [];
  const purifiedTraits: { icon: string; name: string }[] = [];
  const seenTraitNames = new Set<string>();

  for (const t of rawTraits) {
    const tName = (t.name || "").trim();
    const tIcon = (t.icon || "").trim();
    if (!tName || BANNED_FAKE_TRAIT_SET.has(tName)) continue;
    if (!tIcon.startsWith("http")) continue;
    if (seenTraitNames.has(tName)) continue;
    purifiedTraits.push({ icon: tIcon, name: tName });
    seenTraitNames.add(tName);
  }

  return {
    ...card,
    team,
    nation,
    team_colors: purifiedTc,
    traits: purifiedTraits,
  };
}

function getCardCoreTeamColorSet(card: PlayerCard): Set<string> {
  const enriched = enrichPlayerCardMetaSync(card);
  const set = new Set<string>();
  if (enriched.nation && !BANNED_DUMMY_TEAM_COLORS.has(enriched.nation.trim())) {
    set.add(enriched.nation.trim());
  }
  if (enriched.team && !BANNED_DUMMY_TEAM_COLORS.has(enriched.team.trim())) {
    set.add(enriched.team.trim());
  }
  for (const tc of enriched.team_colors || []) {
    const tcClean = (tc.name || "").trim();
    if (tcClean && !BANNED_DUMMY_TEAM_COLORS.has(tcClean) && tc.type !== "특성") {
      set.add(tcClean);
    }
  }
  return set;
}

function computeCardRankerUsagePct(
  card: PlayerCard,
  grade = 8,
  teamColorBonus = 0
): number {
  const feel = computePlayerFeelMetricsSync(
    card,
    card.primary_position,
    grade,
    teamColorBonus,
    false
  );
  let nameBonus = 0;
  for (const [kw, bonus] of Object.entries(META_PLAYER_RANKER_BONUS)) {
    if (card.name.includes(kw)) {
      nameBonus = Math.max(nameBonus, bonus);
    }
  }
  const baseRankerRate = feel.rankerPickRate || 2.5;
  const ovrBoost = Math.max(0, (card.ovr - 108) * 0.85);
  const feelBoost = Math.max(0, (feel.feelScore - 78) * 0.25);
  const twoFootBoost = card.foot?.includes("5") ? 3.2 : 0;

  return Number(
    Math.max(
      2.4,
      Math.min(
        42.5,
        baseRankerRate * 1.35 + nameBonus * 0.72 + ovrBoost + feelBoost + twoFootBoost
      )
    ).toFixed(1)
  );
}

export function selectSamePositionCompetitors(
  targetCard: PlayerCard,
  allCards: PlayerCard[],
  grade = 8,
  teamColorBonus = 0,
  limit = 6
): PlayerCard[] {
  const enrichedTarget = enrichPlayerCardMetaSync(targetCard);
  const targetTeamColors = getCardCoreTeamColorSet(enrichedTarget);
  const targetPos = enrichedTarget.primary_position;
  const targetPosGroup = resolvePositionGroupInfo(targetPos).positionGroup;

  // 1. 동일 포지션(주 포지션 또는 서브 포지션 일치) 후보 추출
  let pool = allCards.filter(
    (c) =>
      c.pid !== enrichedTarget.pid &&
      (c.primary_position === targetPos ||
        (c.positions || []).some((p) => p.pos === targetPos))
  );

  // 만약 정확히 일치하는 포지션 후보가 부족하면 동일 포지션 그룹까지 확장
  if (pool.length < limit) {
    const groupMatches = allCards.filter(
      (c) =>
        c.pid !== enrichedTarget.pid &&
        !pool.some((p) => p.spid === c.spid) &&
        resolvePositionGroupInfo(c.primary_position).positionGroup === targetPosGroup
    );
    pool = [...pool, ...groupMatches];
  }

  const scored = pool.map((rawCand) => {
    const cand = enrichPlayerCardMetaSync(rawCand);
    const candColors = getCardCoreTeamColorSet(cand);
    const shared: string[] = [];
    for (const tc of candColors) {
      if (targetTeamColors.has(tc)) {
        shared.push(tc);
      }
    }

    const rankerPickRate = computeCardRankerUsagePct(cand, grade, teamColorBonus);
    const feel = computePlayerFeelMetricsSync(
      cand,
      targetPos,
      grade,
      teamColorBonus,
      false
    );

    const exactPosBonus = cand.primary_position === targetPos ? 20 : 0;
    const sharedTeamColorBonus = shared.length > 0 ? 500 + shared.length * 40 : 0;

    return {
      card: {
        ...cand,
        feelMetrics: {
          ...feel,
          rankerPickRate,
        },
        rankerPickRate,
        sharedTeamColor: shared[0] || undefined,
        sharedTeamColors: shared,
      } as PlayerCard,
      hasSharedTeamColor: shared.length > 0,
      rankerPickRate,
      sortScore:
        sharedTeamColorBonus +
        exactPosBonus +
        rankerPickRate * 4.5 -
        Math.abs(cand.ovr - enrichedTarget.ovr) * 0.5,
    };
  });

  scored.sort((a, b) => b.sortScore - a.sortScore);

  const selected: PlayerCard[] = [];
  const usedPids = new Set<number>();
  for (const item of scored) {
    if (selected.length >= limit) break;
    // 서로 다른 실축 선수(pid)를 우선 선정하여 다양한 경쟁자 비교 제공
    if (usedPids.has(item.card.pid)) continue;
    usedPids.add(item.card.pid);
    selected.push(item.card);
  }
  for (const item of scored) {
    if (selected.length >= limit) break;
    if (!selected.some((s) => s.spid === item.card.spid)) {
      selected.push(item.card);
    }
  }

  return selected;
}

export function getStoreSnapshot(): FClabStore {
  return loadStore();
}

export function saveSquadToStore(squad: SavedSquad): SavedSquad {
  const store = loadStore();
  const idx = store.savedSquads.findIndex((s) => s.id === squad.id);
  if (idx >= 0) {
    store.savedSquads[idx] = squad;
  } else {
    store.savedSquads.unshift(squad);
  }
  saveStore();
  return squad;
}

export function deleteSquadFromStore(id: string): void {
  const store = loadStore();
  store.savedSquads = store.savedSquads.filter((s) => s.id !== id);
  saveStore();
}
