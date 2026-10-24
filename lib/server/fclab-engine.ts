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
  DEFAULT_ENHANCE_OVR_BOOSTS,
  expandEnhanceOvrBoosts,
  getEnhanceOvrBoost,
  formatBpKorean,
} from "@/lib/fclab-types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const NEXON_OPEN_API_BASE = "https://open.api.nexon.com";
const CACHE_FILE_PATH = path.join(process.cwd(), ".fclab-store.json");

// 포지션별 핵심 능력치 가중치 모델 (합계 = 1.0)
export const POSITION_WEIGHTS: Record<string, Record<string, number>> = {
  ST: {
    "골 결정력": 0.2,
    "위치 선정": 0.16,
    속력: 0.14,
    가속력: 0.13,
    "슛 파워": 0.12,
    드리블: 0.08,
    몸싸움: 0.09,
    침착성: 0.08,
  },
  CF: {
    "골 결정력": 0.16,
    "중거리 슛": 0.14,
    속력: 0.13,
    가속력: 0.13,
    "짧은 패스": 0.11,
    드리블: 0.11,
    "위치 선정": 0.12,
    민첩성: 0.1,
  },
  LW: {
    속력: 0.19,
    가속력: 0.19,
    드리블: 0.15,
    민첩성: 0.13,
    크로스: 0.12,
    "골 결정력": 0.11,
    커브: 0.11,
  },
  RW: {
    속력: 0.19,
    가속력: 0.19,
    드리블: 0.15,
    민첩성: 0.13,
    크로스: 0.12,
    "골 결정력": 0.11,
    커브: 0.11,
  },
  CAM: {
    "짧은 패스": 0.17,
    시야: 0.16,
    "중거리 슛": 0.15,
    "볼 컨트롤": 0.13,
    드리블: 0.13,
    민첩성: 0.13,
    "슛 파워": 0.13,
  },
  CM: {
    "짧은 패스": 0.18,
    "긴 패스": 0.15,
    시야: 0.14,
    스태미너: 0.15,
    "볼 컨트롤": 0.13,
    "중거리 슛": 0.13,
    가로채기: 0.12,
  },
  CDM: {
    가로채기: 0.18,
    태클: 0.17,
    "대인 수비": 0.15,
    몸싸움: 0.14,
    "짧은 패스": 0.13,
    "긴 패스": 0.11,
    스태미너: 0.12,
  },
  CB: {
    "대인 수비": 0.19,
    태클: 0.18,
    가로채기: 0.16,
    몸싸움: 0.17,
    속력: 0.14,
    헤더: 0.08,
    점프: 0.08,
  },
  LB: {
    속력: 0.19,
    가속력: 0.17,
    태클: 0.15,
    가로채기: 0.15,
    스태미너: 0.14,
    크로스: 0.1,
    "대인 수비": 0.1,
  },
  RB: {
    속력: 0.19,
    가속력: 0.17,
    태클: 0.15,
    가로채기: 0.15,
    스태미너: 0.14,
    크로스: 0.1,
    "대인 수비": 0.1,
  },
  GK: {
    "GK 다이빙": 0.24,
    "GK 반응속도": 0.24,
    "GK 핸들링": 0.2,
    "GK 위치 선정": 0.2,
    "GK 킥": 0.12,
  },
};

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

  // 3. CAM / CM / CDM — 중앙 미드필더
  {
    id: "cm_playmaker",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM", "CDM"],
    name: "플레이메이커",
    desc: "짧은 패스, 긴 패스, 시야, 볼 컨트롤, 드리블 등을 바탕으로 공격 전개와 기회 창출을 주도하는 유형",
    weights: {
      "짧은 패스": 0.25,
      시야: 0.23,
      "긴 패스": 0.18,
      "볼 컨트롤": 0.16,
      드리블: 0.1,
      침착성: 0.08,
    },
  },
  {
    id: "cm_defensive",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM", "CDM"],
    name: "수비형 미드필더",
    desc: "가로채기, 태클, 대인 수비, 몸싸움, 위치 선정 등을 바탕으로 중원 수비와 포백 보호 역할을 수행하는 유형",
    weights: {
      가로채기: 0.25,
      태클: 0.23,
      "대인 수비": 0.2,
      몸싸움: 0.18,
      적극성: 0.14,
    },
  },
  {
    id: "cm_box_to_box",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM", "CDM"],
    name: "박스투박스 미드필더",
    desc: "스태미너, 활동량, 공수 가담, 패스, 수비, 슈팅 지원 등을 바탕으로 넓은 범위를 오가며 기여하는 유형",
    weights: {
      스태미너: 0.22,
      "짧은 패스": 0.16,
      "중거리 슛": 0.16,
      가로채기: 0.16,
      몸싸움: 0.15,
      속력: 0.15,
    },
  },
  {
    id: "cm_complete",
    group: "MF",
    positionGroup: "CENTRAL_MF",
    applicablePositions: ["CAM", "CM", "CDM"],
    name: "완성형",
    desc: "패스·시야·볼 운반·기동력·수비·피지컬·슈팅 지원 등 해당 중앙 미드필더 역할에서 요구되는 능력을 폭넓게 갖춘 선수",
    isCompleteType: true,
    weights: {
      "짧은 패스": 0.16,
      "긴 패스": 0.12,
      시야: 0.14,
      드리블: 0.12,
      "중거리 슛": 0.12,
      가로채기: 0.12,
      몸싸움: 0.11,
      스태미너: 0.11,
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

export async function syncNexonMetadata(force = false): Promise<{
  status: string;
  seasons: number;
  positions: number;
  divisions: number;
  matchtypes: number;
}> {
  const store = loadStore();
  if (
    !force &&
    Object.keys(store.seasons).length > 0 &&
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

export async function crawlPlayerList(
  playerName: string,
  limit = 40
): Promise<PlayerCard[]> {
  const cleanName = playerName.trim();
  if (!cleanName) return [];

  const store = loadStore();
  await syncNexonMetadata(false);

  const formBody = new URLSearchParams({ strPlayerName: cleanName }).toString();
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
      const seasonCode = mScode ? mScode[1] : String(seasonId);
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
        team: existing?.team || "",
        nation: existing?.nation || "",
        traits: existing?.traits || [],
        team_colors: existing?.team_colors || [],
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
    const seasonCode = mScode ? mScode[1] : existing?.season_code || String(seasonId);
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
    const skillWrap = cleanHtml.match(
      /<div class="skill_wrap">([\s\S]*?)<\/div>\s*<div class="en_selector_wrap">/
    );
    if (skillWrap) {
      const trReg =
        /<img src="([^"]+)"[^>]*>[\s\S]*?<span class="desc">([^<]+)<\/span>/g;
      let tm: RegExpExecArray | null;
      while ((tm = trReg.exec(skillWrap[1])) !== null) {
        traits.push({ icon: tm[1].trim(), name: tm[2].trim() });
      }
    }

    const teamColors: { id: string; type: string; name: string }[] = [];
    for (const [tcType, clsPrefix] of [
      ["소속", "tdefault"],
      ["관계", "tspecial"],
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
          !["소속 팀컬러", "관계 팀컬러", "강화 팀컬러"].includes(tcName)
        ) {
          teamColors.push({ id: tcId, type: tcType, name: tcName });
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

function getStatWithBonus(
  stats: Record<string, number>,
  statName: string,
  grade = 1,
  teamColorBonus = 0,
  fallbackOvr = 105
): number {
  const rules = getSystemRules();
  const raw = stats[statName] ?? Math.max(70, fallbackOvr - 5);
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
  grade = 1,
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
      피지컬: avgOf(["반응 속도", "점프"]),
    };
  }

  return {
    속력: avgOf(["속력", "가속력"]),
    슈팅: avgOf(["골 결정력", "슛 파워", "중거리 슛", "위치 선정"]),
    패스: avgOf(["짧은 패스", "시야", "크로스", "긴 패스"]),
    드리블: avgOf(["드리블", "볼 컨트롤", "민첩성", "밸런스"]),
    수비: avgOf(["대인 수비", "태클", "가로채기", "슬라이딩 태클"]),
    피지컬: avgOf(["몸싸움", "스태미너", "점프", "적극성"]),
  };
}

export function evaluateCardEfficiencySync(
  card: PlayerCard,
  targetPosition?: string,
  grade = 1,
  teamColorBonus = 0,
  customWeights?: Record<string, number>
): CardEfficiencyResult {
  const rules = getSystemRules();
  const pos = (targetPosition || card.primary_position || "ST").toUpperCase();
  const weights =
    customWeights || POSITION_WEIGHTS[pos] || POSITION_WEIGHTS["ST"];
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
  statBreakdown.sort((a, b) => b.weight - a.weight);

  const coreScore = Number(weightedSum.toFixed(2));
  const prices = card.prices || {};
  const gradePriceObj = prices[String(clampedGrade)] ||
    prices["1"] || { bp: 0, text: "-" };
  const bpPrice = Number(gradePriceObj.bp || 0);
  const bpText = gradePriceObj.text || formatBpKorean(bpPrice);

  const perfDelta = Math.max(10, coreScore - 80);
  let efficiencyIndex = 0;
  let scorePerLogBp = 0;
  if (bpPrice > 0) {
    const logPrice = Math.max(3, Math.log10(Math.max(bpPrice, 1000)));
    efficiencyIndex = Number(
      (Math.pow(perfDelta, 1.55) / (logPrice * 2.35)).toFixed(1)
    );
    scorePerLogBp = Number(
      (coreScore / Math.max(1, Math.log10(bpPrice + 10))).toFixed(2)
    );
  }

  let tier = "C (프리미엄/시세 높음)";
  if (efficiencyIndex >= 88) tier = "S+ (초고효율 가성비)";
  else if (efficiencyIndex >= 74) tier = "S (검증된 고효율)";
  else if (efficiencyIndex >= 60) tier = "A (우수 밸런스)";
  else if (efficiencyIndex >= 46) tier = "B (하이엔드/표준)";

  const gradeCurve = [];
  for (let g = 1; g <= rules.maxEnhanceLevel; g++) {
    const gObj = prices[String(g)];
    const gBp = Number(gObj?.bp || 0);
    if (gBp <= 0) continue;
    const gBoost = getEnhanceOvrBoost(g, rules.enhanceOvrBoosts);
    const gAdd = gBoost - enhBonus;
    const gCore = Number((coreScore + gAdd).toFixed(2));
    const gDelta = Math.max(10, gCore - 80);
    const gLog = Math.max(3, Math.log10(Math.max(gBp, 1000)));
    const gEff = Number(
      (Math.pow(gDelta, 1.55) / (gLog * 2.35)).toFixed(1)
    );
    gradeCurve.push({
      grade: g,
      ovr: baseOvr + gBoost + Number(teamColorBonus),
      core_score: gCore,
      bp: gBp,
      bp_text: gObj?.text || formatBpKorean(gBp),
      efficiency_index: gEff,
    });
  }

  const bestSweetspot =
    gradeCurve.length > 0
      ? gradeCurve.reduce((a, b) =>
          a.efficiency_index >= b.efficiency_index ? a : b
        )
      : null;

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
    ovr_to_core_gap: Number((coreScore - effectiveOvr).toFixed(2)),
    efficiency_index: efficiencyIndex,
    score_per_log_bp: scorePerLogBp,
    tier,
    six_face: computeSixFaceSummary(card, clampedGrade, teamColorBonus),
    stat_breakdown: statBreakdown,
    grade_curve: gradeCurve,
    best_sweetspot_grade: bestSweetspot,
    traits: card.traits || [],
    crawled_at: card.crawled_at || nowIso(),
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
  agilityStat: number
): { delta: number; notes: string[] } {
  if (!hasFullData) {
    return { delta: 0, notes: [] };
  }
  let delta = 0;
  const notes: string[] = [];
  const isStrongBody = bodyType.includes("건장");
  const isLeanBody = bodyType.includes("마름");
  const isUniqueBody = bodyType.includes("고유");

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
  } else if (archId === "cm_playmaker") {
    if (isTwoFooted) {
      delta += 2.6;
      notes.push("양발(5/5) 중원 전방향 탈압박·롱패스 배급 +2.6");
    } else if (weakFoot <= 3) {
      delta -= 2.4;
      notes.push(`약발(${weakFoot}) 반대 전환 패스 각도 제약 -2.4`);
    }
  } else if (archId === "cm_defensive") {
    if (height >= 186 || isStrongBody) {
      delta += 1.8;
      notes.push(`체격(${height}cm/${bodyType}) 중원 경합·차단 우위 +1.8`);
    } else if (height <= 175 && isLeanBody) {
      delta -= 1.2;
      notes.push(`체격(${height}cm/${bodyType}) 공중볼 경합 열세 -1.2`);
    }
  } else if (archId === "cm_box_to_box") {
    if (isTwoFooted) {
      delta += 1.5;
      notes.push("양발(5/5) 공수 전환 패스·중거리 슈팅 보정 +1.5");
    }
    if (height >= 184 && !isLeanBody) {
      delta += 1.0;
      notes.push(`신장(${height}cm) 중원 장악력 보정 +1.0`);
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
    delta: Number(Math.max(-4.5, Math.min(4.5, delta)).toFixed(1)),
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
  isTwoFooted: boolean
): CompleteEvaluationResult {
  const avg = (names: string[]) => {
    const vals = names.map((n) => getStat(n));
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
  };

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
        name: "볼컨트롤·드리블",
        score: control,
        threshold: Number((effOvr - 6.5).toFixed(1)),
        passed: control >= effOvr - 6.5 && control >= 96,
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
      physicalPassed = footOk && heightOk;
      physicalScoreText = `${height}cm · ${bodyType} · 약발 ${weakFoot}`;
      if (physicalPassed) {
        physicalDetail = isTwoFooted
          ? `양발(5/5)과 준수한 신장(${height}cm)을 모두 갖춰 전방위 슈팅·연계·제공권 제약이 없습니다.`
          : `약발(${weakFoot})과 신장(${height}cm)·연계 밸런스가 완성형 기준을 충족합니다.`;
      } else {
        const reasons: string[] = [];
        if (!footOk) {
          reasons.push(
            `약발(${weakFoot}) 조건 또는 비양발 공격수의 연계·볼컨트롤 최소 기준 미달`
          );
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
    physicalPassed = hasFullData && weakFoot >= 4;
    physicalScoreText = `${height}cm · ${bodyType} · 약발 ${weakFoot}`;
    physicalDetail = physicalPassed
      ? `약발(${weakFoot}) 이상으로 정발 크로스와 역발 컷인 슈팅/패스를 모두 수행 가능합니다.`
      : `약발(${weakFoot}) 제약으로 측면 양방향 선택지가 제한됩니다.`;
  } else if (positionGroup === "CENTRAL_MF") {
    const passing = avg(["짧은 패스", "긴 패스", "시야"]);
    const carrying = avg(["드리블", "볼 컨트롤", "민첩성", "밸런스"]);
    const shooting = avg(["중거리 슛", "슛 파워", "골 결정력", "위치 선정"]);
    const defending = avg(["가로채기", "태클", "대인 수비"]);
    const physicalStamina = avg(["스태미너", "몸싸움", "속력"]);

    if (analyzedPos === "CAM") {
      pillars = [
        {
          name: "패스·창의성",
          score: passing,
          threshold: Number((effOvr - 4.5).toFixed(1)),
          passed: passing >= effOvr - 4.5 && passing >= 100,
        },
        {
          name: "볼운반·탈압박",
          score: carrying,
          threshold: Number((effOvr - 6.0).toFixed(1)),
          passed: carrying >= effOvr - 6.0 && carrying >= 98,
        },
        {
          name: "득점·슈팅 지원",
          score: shooting,
          threshold: Number((effOvr - 6.5).toFixed(1)),
          passed: shooting >= effOvr - 6.5 && shooting >= 98,
        },
        {
          name: "기동력·몸싸움·활동량",
          score: physicalStamina,
          threshold: Number((effOvr - 7.5).toFixed(1)),
          passed: physicalStamina >= effOvr - 7.5 && physicalStamina >= 96,
        },
        {
          name: "전방 압박·수비지원",
          score: defending,
          threshold: Number((effOvr - 14.0).toFixed(1)),
          passed: defending >= effOvr - 14.0 && defending >= 85,
        },
      ];
      maxSpreadAllowed = 15.5;
    } else if (analyzedPos === "CDM") {
      pillars = [
        {
          name: "수비·차단력",
          score: defending,
          threshold: Number((effOvr - 4.5).toFixed(1)),
          passed: defending >= effOvr - 4.5 && defending >= 100,
        },
        {
          name: "피지컬·활동량",
          score: physicalStamina,
          threshold: Number((effOvr - 6.0).toFixed(1)),
          passed: physicalStamina >= effOvr - 6.0 && physicalStamina >= 98,
        },
        {
          name: "후방 빌드업 패스",
          score: passing,
          threshold: Number((effOvr - 7.0).toFixed(1)),
          passed: passing >= effOvr - 7.0 && passing >= 96,
        },
        {
          name: "탈압박·볼컨트롤",
          score: carrying,
          threshold: Number((effOvr - 8.5).toFixed(1)),
          passed: carrying >= effOvr - 8.5 && carrying >= 94,
        },
        {
          name: "2선 슈팅 지원",
          score: shooting,
          threshold: Number((effOvr - 10.5).toFixed(1)),
          passed: shooting >= effOvr - 10.5 && shooting >= 90,
        },
      ];
      maxSpreadAllowed = 14.0;
    } else {
      // CM
      pillars = [
        {
          name: "패스·시야 전개",
          score: passing,
          threshold: Number((effOvr - 5.5).toFixed(1)),
          passed: passing >= effOvr - 5.5 && passing >= 98,
        },
        {
          name: "볼운반·탈압박",
          score: carrying,
          threshold: Number((effOvr - 6.5).toFixed(1)),
          passed: carrying >= effOvr - 6.5 && carrying >= 96,
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
          threshold: Number((effOvr - 8.5).toFixed(1)),
          passed: defending >= effOvr - 8.5 && defending >= 94,
        },
        {
          name: "중거리·득점 지원",
          score: shooting,
          threshold: Number((effOvr - 7.5).toFixed(1)),
          passed: shooting >= effOvr - 7.5 && shooting >= 95,
        },
      ];
      maxSpreadAllowed = 13.5;
    }

    const speedVal = avg(["속력", "가속력"]);
    const footOk = weakFoot >= 4;
    const mobilityAndBodyOk =
      speedVal >= effOvr - 8.0 &&
      (analyzedPos === "CAM"
        ? getStat("몸싸움") >= effOvr - 9.0
        : height >= 178 || getStat("몸싸움") >= effOvr - 5.0);
    physicalPassed = hasFullData && footOk && mobilityAndBodyOk;
    physicalScoreText = `${height}cm · ${bodyType} · 약발 ${weakFoot} · 속가 ${speedVal}`;
    physicalDetail = physicalPassed
      ? `${analyzedPos} 완성형에 요구되는 양발 활용도(약발 ${weakFoot}), 기동력(${speedVal}), 중원 경합 밸런스를 충족합니다.`
      : `약발(${weakFoot}) 또는 기동력(속가 ${speedVal})/피지컬 경합 조건이 ${analyzedPos} 완성형 기준에 미달합니다.`;
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
        name: "후방 빌드업·패스",
        score: buildup,
        threshold: Number((effOvr - 6.5).toFixed(1)),
        passed: buildup >= effOvr - 6.5 && buildup >= 95,
      },
    ];
    maxSpreadAllowed = 11.5;
    physicalPassed = hasFullData && height >= 185 && weakFoot >= 4;
    physicalScoreText = `${height}cm · ${bodyType} · 약발 ${weakFoot}`;
    physicalDetail = physicalPassed
      ? `신장(${height}cm)과 체형(${bodyType}), 양발/약발(${weakFoot}) 빌드업 조건이 완성형 센터백 기준에 부합합니다.`
      : `센터백 완성형 필수 신장(185cm 이상, 현재 ${height}cm) 또는 후방 양발 빌드업(약발 4 이상) 조건 미달입니다.`;
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
        name: "오버래핑·크로스·패스",
        score: attacking,
        threshold: Number((effOvr - 5.5).toFixed(1)),
        passed: attacking >= effOvr - 5.5 && attacking >= 96,
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
      getStat("스태미너") >= effOvr - 5 &&
      !bodyType.includes("마름");
    physicalScoreText = `${height}cm · ${bodyType} · 약발 ${weakFoot}`;
    physicalDetail = physicalPassed
      ? `왕성한 활동량과 피지컬 경합 체형(${bodyType}), 약발(${weakFoot}) 조건을 모두 충족합니다.`
      : `풀백/윙백 완성형 기준(대인 경합 체형·몸싸움 또는 약발 4 이상)에 미달하여 공/수 특화형으로 분류됩니다.`;
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

  // 4. 치명적 약점 부재
  const c4Passed = failedPillars.length === 0;

  // 5. 체격 및 발 조건 부합
  const c5Passed = physicalPassed;

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
      label: "4. 치명적 약점 부재 (필수 하한선 통과)",
      passed: c4Passed,
      score_text:
        failedPillars.length === 0
          ? `${pillars.length}/${pillars.length} 영역 통과`
          : `${failedPillars.map((p) => p.name).join(", ")} 미달`,
      detail: c4Passed
        ? `포지션 필수 ${pillars.length}대 영역(${pillars.map((p) => p.name).join("·")})에서 치명적인 약점이 발견되지 않았습니다.`
        : `필수 영역 중 [${failedPillars
            .map((p) => `${p.name}(${p.score} < ${p.threshold})`)
            .join(", ")}] 항목이 완성형 하한선에 미달합니다.`,
    },
    {
      id: "physical_foot_compatibility",
      label: "5. 체격 및 양발/약발 조건 부합",
      passed: c5Passed,
      score_text: physicalScoreText,
      detail: physicalDetail,
    },
  ];

  const passedCount = criteria.filter((c) => c.passed).length;
  const isComplete = passedCount === 5;

  // Calculate strict complete score
  // Base score from pillarMean & minPillar bottleneck
  const baseFromMean = 75 + (pillarMean - effOvr) * 2.2 + Math.max(0, (pillarMean - 110) * 0.45);
  const bottleneckPenalty = Math.max(0, (effOvr - 4.5 - minPillar) * 2.4);
  const spreadPenalty = Math.max(0, (pillarSpread - 10) * 1.3);
  const failedGatePenalty = (5 - passedCount) * 7.5;

  let overallCompleteScore = Math.round(
    baseFromMean - bottleneckPenalty - spreadPenalty - (isComplete ? 0 : failedGatePenalty)
  );
  if (isComplete) {
    overallCompleteScore = Math.max(91, Math.min(98, overallCompleteScore + 6));
  } else {
    overallCompleteScore = Math.max(32, Math.min(83, overallCompleteScore));
  }

  let summaryReason = "";
  if (isComplete) {
    summaryReason = `5대 엄격 검증 기준(전반적 고수준·편중 없는 균형·복수 유형 강점·약점 부재·신체/양발 조건)을 모두 통과하여 [${analyzedPos} 완성형]으로 판정되었습니다.`;
  } else {
    const failedLabels = criteria
      .filter((c) => !c.passed)
      .map((c) => c.label.replace(/^\d+\.\s*/, ""));
    summaryReason = `완성형 5대 기준 중 ${passedCount}/5개 충족 — [${failedLabels.join(
      ", "
    )}] 요건 미충족으로 완성형 판정에서 제외되었으며, 선수의 뚜렷한 특화 유형을 중심으로 분류합니다.`;
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
  grade = 1,
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

  // Compute player's baseline core stat mean (excluding GK stats unless GK, and excluding macro summary keys)
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
  const defenseBaseMean =
    (getStat("대인 수비") + getStat("태클") + getStat("가로채기")) / 3;

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
    // Position-specific weight adjustments for grouped positions (LW/RW vs LM/RM, CAM vs CM vs CDM)
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

    // Bottleneck penalty if a major required stat for this archetype is severely lacking
    let bottleneckPenalty = 0;
    if (minCoreStat < weightedVal - 7) {
      bottleneckPenalty += (weightedVal - 7 - minCoreStat) * 0.55;
    }
    // Special rule for Ball-Playing CB: requires basic defensive stability
    if (def.id === "cb_buildup" && defenseBaseMean < effOvr - 6) {
      bottleneckPenalty += (effOvr - 6 - defenseBaseMean) * 1.1;
    }

    const mod = computePhysicalAndFootModifier(
      def.id,
      analyzedPos,
      hasFullData,
      height,
      bodyType,
      footParsed.weakFoot,
      footParsed.isTwoFooted,
      agilityVal
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
    // 1. Role Capability Score (역할 수행 능력: 절대적 스탯 수준 + 포지션 기준 적합도, 0~99)
    // High OVR card with 128 effectiveRaw -> ~94; Low OVR card with 72 effectiveRaw -> ~46
    const rawRole =
      50 +
      (t.effectiveRaw - 82) * 1.05 +
      (t.effectiveRaw - effOvr) * 0.85;
    const roleScore = Math.max(25, Math.min(99, Math.round(rawRole)));

    // 2. Specialization Score (유형 특화도: 선수 본인의 OVR/평균 능력치 대비 해당 유형으로 얼마나 특화되었는가, 0~99)
    // Completely decoupled from absolute OVR!
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

  // Step 2: Evaluate the strict 5-Criteria Complete Gate for this position group
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
    footParsed.isTwoFooted
  );

  // Build Complete ArchetypeFitItem for this position group
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

  // Position archetypes list: specialists + complete type
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

  // Also compute other position groups' specialist archetypes for full cross-position exploration
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

  // Step 3: Determine Primary Type, Secondary Type, and Judgment Summary
  const firstSpec = specialistFitItems[0] || null;
  const secondSpec = specialistFitItems[1] || null;

  let primaryArchetype: ArchetypeFitItem | null = firstSpec;
  let secondaryArchetype: ArchetypeFitItem | null = null;
  let secondaryNullReason: string | undefined = undefined;

  if (completeEval.is_complete && completeFitItem && firstSpec) {
    // Player passed all 5 strict criteria for Complete!
    const subNames = specialistFitItems
      .filter((s) => s.role_score >= 82)
      .slice(0, 3)
      .map((s) => s.name)
      .join("·");
    primaryArchetype = {
      ...completeFitItem,
      name: subNames ? `완성형 (${subNames} 겸비)` : "완성형",
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
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 ${analyzedPos} 포지션의 5대 완성형 기준을 모두 통과한 [${primaryArchetype.name}] 유형입니다. 세부 성향 중에서는 [${firstSpec.name}](역할 수행 ${firstSpec.role_score}점 · 특화도 ${firstSpec.specialization_score}%) 강점이 가장 돋보입니다.`;
  } else if (primaryArchetype && secondaryArchetype) {
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 [${primaryArchetype.name}](특화도 ${primaryArchetype.specialization_score}% · 수행력 ${primaryArchetype.role_score}점) 성향을 주축으로 하며, [${secondaryArchetype.name}](특화도 ${secondaryArchetype.specialization_score}% · 수행력 ${secondaryArchetype.role_score}점) 강점이 함께 나타나는 복합 스타일입니다. (${completeEval.summary_reason})`;
  } else if (primaryArchetype) {
    judgmentSummary = `${card.name}(${card.season_code}) 선수는 ${analyzedPos} 포지션에서 [${primaryArchetype.name}](특화도 ${primaryArchetype.specialization_score}% · 수행력 ${primaryArchetype.role_score}점)에 뚜렷하게 특화된 전형적 플레이 스타일을 보유하고 있습니다.`;
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
    methodology_note:
      "본 분석은 단순 OVR 비례 점수가 아니라 [1. 역할 수행 능력(절대적 수행 수준)]과 [2. 유형 특화도(선수 스탯 내 상대적 강점 편차)]를 분리 산출하며, 완성형은 5대 필수 요건(전반적 고수준·편중 없는 균형·복수 강점·치명적 약점 부재·신체/양발 조건)을 모두 통과할 때만 부여합니다.",
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

    let card: PlayerCard | null = store.cards[spid] || null;
    if (!card || !card.has_full_ability) {
      card = await crawlPlayerAbility(spid);
    }
    if (!card || !card.salary) {
      card = await ensurePlayerSalaryAndMeta(spid);
    }
    if (!card) continue;

    const evalRes = evaluateCardEfficiencySync(
      card,
      slotPos,
      grade,
      teamColorBonus
    );
    const profRes = analyzePlayerProfileSync(card, grade, teamColorBonus);

    totalSalary += Number(card.salary || 20);
    totalBp += Number(evalRes.bp || 0);

    if (card.team) teamCounter[card.team] = (teamCounter[card.team] || 0) + 1;
    if (card.nation)
      teamCounter[card.nation] = (teamCounter[card.nation] || 0) + 1;
    for (const tc of card.team_colors || []) {
      if (tc.name) teamCounter[tc.name] = (teamCounter[tc.name] || 0) + 1;
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

    placedEvaluations.push({
      slot_id: slot.slot_id || slotPos,
      slot_position: slotPos,
      spid: card.spid,
      pid: card.pid,
      name: card.name,
      season_code: card.season_code,
      thumb_url: card.thumb_url,
      grade,
      salary: card.salary,
      ovr: evalRes.effective_ovr,
      core_score: core,
      efficiency_index: evalRes.efficiency_index,
      bp: evalRes.bp,
      bp_text: evalRes.bp_text,
      primary_archetype: profRes.primary_archetype?.name || "",
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

  if (placedEvaluations.length > 0) {
    const sortedByCore = [...placedEvaluations].sort(
      (a, b) => a.core_score - b.core_score
    );
    const usedPids = new Set(placedEvaluations.map((p) => p.pid));
    const allCards = Object.values(store.cards);

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

  return {
    formation,
    player_count: placedEvaluations.length,
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
  "반데이크",
  "테오 에르난데스",
  "하키미",
  "쿠르투아",
  "호나우두",
];

export async function ensureInitialSeed(): Promise<void> {
  const store = loadStore();
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

  await Promise.all(topSpids.slice(0, 22).map((spid) => crawlPlayerAbility(spid)));

  const currentRules = getSystemRules();
  if (store.savedSquads.length === 0) {
    const findBestSpid = (kw: string, fallbackPos: string): number => {
      const list = Object.values(store.cards)
        .filter((c) => c.name.includes(kw) && c.has_full_ability)
        .sort((a, b) => b.ovr - a.ovr);
      if (list[0]) return list[0].spid;
      const posMatch = Object.values(store.cards)
        .filter((c) => c.primary_position === fallbackPos)
        .sort((a, b) => b.ovr - a.ovr);
      return posMatch[0]?.spid || 0;
    };

    const ts = nowIso();
    store.savedSquads.push({
      id: "default-meta-4231",
      name: "FClab 추천 메타 스쿼드 (4-2-3-1)",
      formation: "4-2-3-1",
      budget_bp: 50_000_000_000,
      salary_cap: currentRules.salaryCap,
      team_color_name: "단일/강화 케미 (+3)",
      team_color_bonus: 3,
      slots: [
        { slot_id: "ST", slot_position: "ST", spid: findBestSpid("호나우두", "ST"), grade: 5 },
        { slot_id: "LW", slot_position: "LW", spid: findBestSpid("손흥민", "LW"), grade: 5 },
        { slot_id: "RW", slot_position: "RW", spid: findBestSpid("차범근", "RW"), grade: 5 },
        { slot_id: "CAM", slot_position: "CAM", spid: findBestSpid("벨링엄", "CAM"), grade: 5 },
        { slot_id: "CDM1", slot_position: "CDM", spid: findBestSpid("굴리트", "CDM"), grade: 5 },
        { slot_id: "CDM2", slot_position: "CDM", spid: findBestSpid("박지성", "CM"), grade: 5 },
        { slot_id: "LB", slot_position: "LB", spid: findBestSpid("테오", "LB"), grade: 5 },
        { slot_id: "CB1", slot_position: "CB", spid: findBestSpid("김민재", "CB"), grade: 5 },
        { slot_id: "CB2", slot_position: "CB", spid: findBestSpid("반데이크", "CB"), grade: 5 },
        { slot_id: "RB", slot_position: "RB", spid: findBestSpid("하키미", "RB"), grade: 5 },
        { slot_id: "GK", slot_position: "GK", spid: findBestSpid("쿠르투아", "GK"), grade: 5 },
      ],
      created_at: ts,
      updated_at: ts,
    });
  }

  store.seeded = true;
  saveStore();
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
