import fs from "fs";
import path from "path";
import {
  PlayerCard,
  CardEfficiencyResult,
  PlayerProfileResult,
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

export interface ArchetypeDef {
  id: string;
  group: "FW" | "MF" | "DF" | "GK";
  name: string;
  desc: string;
  weights: Record<string, number>;
}

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: "line_breaker_st",
    group: "FW",
    name: "침투형 스트라이커 (Line Breaker)",
    desc: "높은 속력·가속력과 오프더볼 위치 선정을 바탕으로 수비 뒷공간을 허무는 침투 특화 공격수",
    weights: {
      속력: 0.24,
      가속력: 0.24,
      "위치 선정": 0.2,
      "골 결정력": 0.16,
      "반응 속도": 0.08,
      민첩성: 0.08,
    },
  },
  {
    id: "target_man_st",
    group: "FW",
    name: "타겟터 / 포스트 플레이어 (Target Man)",
    desc: "압도적인 몸싸움과 헤더, 점프력을 활용해 전방에서 볼을 키핑하고 제공권을 장악하는 정통 스트라이커",
    weights: {
      몸싸움: 0.26,
      헤더: 0.22,
      점프: 0.16,
      "골 결정력": 0.16,
      "슛 파워": 0.12,
      "볼 컨트롤": 0.08,
    },
  },
  {
    id: "technical_crack_fw",
    group: "FW",
    name: "크랙 / 드리블형 공격수 (Technical Crack)",
    desc: "민첩한 방향 전환과 정교한 볼 터치, 감아차기 능력으로 밀집 수비를 단독 돌파하는 크랙형 공격수",
    weights: {
      드리블: 0.24,
      민첩성: 0.2,
      "볼 컨트롤": 0.16,
      가속력: 0.16,
      커브: 0.12,
      밸런스: 0.12,
    },
  },
  {
    id: "linkup_false9_fw",
    group: "FW",
    name: "연계형 포워드 / 펄스 나인 (Link-up Forward)",
    desc: "2선과 유기적인 짧은 패스 연계 및 중거리 슈팅 능력을 겸비해 공격 활로를 여는 전술형 포워드",
    weights: {
      "짧은 패스": 0.22,
      시야: 0.2,
      "중거리 슛": 0.18,
      "볼 컨트롤": 0.16,
      "골 결정력": 0.12,
      침착성: 0.12,
    },
  },
  {
    id: "poacher_st",
    group: "FW",
    name: "박스 포처 (Penalty Box Poacher)",
    desc: "페널티 박스 안 반 박자 빠른 반응 속도와 위치 선정, 원터치 골 결정력이 극대화된 결정력 특화 공격수",
    weights: {
      "골 결정력": 0.28,
      "위치 선정": 0.24,
      "반응 속도": 0.18,
      발리슛: 0.12,
      "슛 파워": 0.1,
      침착성: 0.08,
    },
  },
  {
    id: "complete_forward",
    group: "FW",
    name: "육각형 만능 공격수 (Complete Forward)",
    desc: "스피드, 골 결정력, 중거리 슛, 연계, 피지컬까지 약점 없이 모든 공격 전술을 소화하는 올라운더",
    weights: {
      속력: 0.16,
      "골 결정력": 0.18,
      "슛 파워": 0.16,
      "중거리 슛": 0.14,
      몸싸움: 0.14,
      드리블: 0.12,
      "짧은 패스": 0.1,
    },
  },
  {
    id: "deep_lying_playmaker",
    group: "MF",
    name: "딥라잉 플레이메이커 (Deep-Lying Playmaker)",
    desc: "정교한 롱패스와 넓은 시야, 침착한 탈압박으로 후방에서 전방으로 볼을 배급하는 사령관",
    weights: {
      "긴 패스": 0.26,
      "짧은 패스": 0.24,
      시야: 0.22,
      "볼 컨트롤": 0.14,
      침착성: 0.14,
    },
  },
  {
    id: "box_to_box_cm",
    group: "MF",
    name: "박스 투 박스 엔진 (Box-to-Box Midfielder)",
    desc: "왕성한 스태미너와 공수 밸런스, 강력한 중거리 슛을 바탕으로 경기장 전역을 장악하는 중원 엔진",
    weights: {
      스태미너: 0.22,
      "중거리 슛": 0.18,
      "슛 파워": 0.14,
      "짧은 패스": 0.16,
      가로채기: 0.15,
      몸싸움: 0.15,
    },
  },
  {
    id: "holding_destroyer_cdm",
    group: "MF",
    name: "수비형 홀딩 미드필더 (Anchor CDM)",
    desc: "포백 보호에 특화된 가로채기·태클·몸싸움 능력으로 상대 2선 공격을 원천 차단하는 중원 방파제",
    weights: {
      가로채기: 0.24,
      태클: 0.22,
      "대인 수비": 0.2,
      몸싸움: 0.18,
      적극성: 0.16,
    },
  },
  {
    id: "ball_carrying_mezzala",
    group: "MF",
    name: "볼 운반형 메짤라 (Ball-Carrying Mezzala)",
    desc: "빠른 가속력과 드리블, 민첩성으로 중원에서 직접 볼을 운반해 하프스페이스를 타격하는 미드필더",
    weights: {
      드리블: 0.24,
      가속력: 0.2,
      민첩성: 0.18,
      "볼 컨트롤": 0.16,
      "짧은 패스": 0.12,
      크로스: 0.1,
    },
  },
  {
    id: "shadow_striker_cam",
    group: "MF",
    name: "세컨드 스트라이커형 공미 (Shadow Striker CAM)",
    desc: "2선에서 날카로운 중거리 포와 박스 침투로 직접 득점을 생산하는 공격 가담 특화 미드필더",
    weights: {
      "중거리 슛": 0.24,
      "슛 파워": 0.2,
      "위치 선정": 0.18,
      "골 결정력": 0.16,
      "짧은 패스": 0.12,
      커브: 0.1,
    },
  },
  {
    id: "stopper_cb",
    group: "DF",
    name: "파이터형 대인 방어 센터백 (Stopper CB)",
    desc: "강력한 몸싸움과 적극성, 스탠딩 태클로 상대 공격수를 강하게 압박해 볼을 탈취하는 파이터형 수비수",
    weights: {
      몸싸움: 0.26,
      적극성: 0.2,
      태클: 0.22,
      "대인 수비": 0.2,
      헤더: 0.12,
    },
  },
  {
    id: "cover_sweeper_cb",
    group: "DF",
    name: "스위퍼 / 커버형 센터백 (Cover CB)",
    desc: "뛰어난 속력·가속력과 가로채기 지능으로 수비 라인 뒷공간 침투를 빠르게 커버하는 기동형 센터백",
    weights: {
      속력: 0.24,
      가속력: 0.2,
      가로채기: 0.22,
      "대인 수비": 0.18,
      "반응 속도": 0.16,
    },
  },
  {
    id: "ball_playing_cb",
    group: "DF",
    name: "빌드업형 센터백 (Ball-Playing CB)",
    desc: "안정적인 수비력에 더해 정확한 롱패스와 볼 컨트롤로 후방 빌드업의 기점이 되는 현대적 센터백",
    weights: {
      "긴 패스": 0.22,
      "짧은 패스": 0.2,
      "볼 컨트롤": 0.16,
      침착성: 0.14,
      "대인 수비": 0.14,
      가로채기: 0.14,
    },
  },
  {
    id: "overlapping_wingback",
    group: "DF",
    name: "공격 가담형 오버래핑 윙백 (Attacking Wingback)",
    desc: "폭발적인 측면 스피드와 날카로운 크로스, 지치지 않는 체력으로 측면 공격을 주도하는 윙백",
    weights: {
      속력: 0.22,
      가속력: 0.2,
      크로스: 0.22,
      스태미너: 0.18,
      커브: 0.1,
      드리블: 0.08,
    },
  },
  {
    id: "defensive_fullback",
    group: "DF",
    name: "수비 안정형 밸런스 풀백 (Defensive Fullback)",
    desc: "상대 윙어의 돌파를 봉쇄하는 대인 수비와 태클, 빠른 복귀 속도를 갖춘 수비 지향 풀백",
    weights: {
      태클: 0.22,
      "대인 수비": 0.22,
      속력: 0.2,
      가로채기: 0.18,
      몸싸움: 0.18,
    },
  },
  {
    id: "sweeper_keeper_gk",
    group: "GK",
    name: "스위퍼 골키퍼 (Sweeper Keeper)",
    desc: "동물적인 반사신경과 다이빙 선방 능력, 정확한 킥 배급력을 겸비한 수문장",
    weights: {
      "GK 다이빙": 0.26,
      "GK 반응속도": 0.26,
      "GK 핸들링": 0.2,
      "GK 위치 선정": 0.18,
      "GK 킥": 0.1,
    },
  },
];

interface FClabStore {
  seasons: Record<number, { class_name: string; season_code: string; season_img: string }>;
  positions: Record<number, string>;
  divisions: Record<number, string>;
  matchtypes: Record<number, string>;
  cards: Record<number, PlayerCard>;
  priceHistory: Record<string, PriceHistoryData>;
  savedSquads: SavedSquad[];
  systemRules: SystemRules;
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

export function analyzePlayerProfileSync(
  card: PlayerCard,
  grade = 1,
  teamColorBonus = 0
): PlayerProfileResult {
  const rules = getSystemRules();
  const clampedGrade = Math.max(1, Math.min(rules.maxEnhanceLevel, grade));
  const stats = card.stats || {};
  const baseOvr = Number(card.ovr || 105);
  const pos = card.primary_position || "ST";

  let primaryGroup: "FW" | "MF" | "DF" | "GK" = "DF";
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(pos)) primaryGroup = "FW";
  else if (["CAM", "CM", "CDM", "LM", "RM"].includes(pos)) primaryGroup = "MF";
  else if (pos === "GK") primaryGroup = "GK";

  const archetypeScores = [];
  for (const arch of ARCHETYPES) {
    if (primaryGroup === "GK" && arch.group !== "GK") continue;
    if (primaryGroup !== "GK" && arch.group === "GK") continue;

    let weightedVal = 0;
    const contributors = [];
    for (const [sName, w] of Object.entries(arch.weights)) {
      const sVal = getStatWithBonus(stats, sName, clampedGrade, teamColorBonus, baseOvr);
      weightedVal += sVal * w;
      contributors.push({ stat: sName, value: sVal, weight: w });
    }

    if (arch.id === "target_man_st" && (card.height || 180) >= 187) {
      weightedVal += 3;
    } else if (
      arch.id === "technical_crack_fw" &&
      (card.skill_moves || "").includes("★")
    ) {
      weightedVal += 1.5;
    }

    const effOvr =
      baseOvr +
      getEnhanceOvrBoost(clampedGrade, rules.enhanceOvrBoosts) +
      teamColorBonus;
    const relativeRatio = (weightedVal / Math.max(80, effOvr)) * 90;
    const absBonus = Math.max(0, (weightedVal - 105) * 0.35);
    const groupBonus = arch.group === primaryGroup ? 4 : -4;
    const fitPct = Math.min(
      99,
      Math.max(35, Math.round(relativeRatio + absBonus + groupBonus))
    );

    contributors.sort((a, b) => b.value * b.weight - a.value * a.weight);
    archetypeScores.push({
      id: arch.id,
      group: arch.group,
      name: arch.name,
      desc: arch.desc,
      raw_score: Number(weightedVal.toFixed(1)),
      fit_percent: fitPct,
      key_stats: contributors.slice(0, 4),
    });
  }

  archetypeScores.sort(
    (a, b) => b.fit_percent - a.fit_percent || b.raw_score - a.raw_score
  );

  const nonGkStats = Object.keys(stats)
    .filter((k) => !k.startsWith("GK") || primaryGroup === "GK")
    .map((k) => ({
      stat: k,
      value: getStatWithBonus(stats, k, clampedGrade, teamColorBonus, baseOvr),
    }))
    .sort((a, b) => b.value - a.value);

  return {
    spid: card.spid,
    name: card.name,
    season_code: card.season_code,
    primary_position: pos,
    grade: clampedGrade,
    team_color_bonus: teamColorBonus,
    height: card.height || 180,
    weight: card.weight || 75,
    body_type: card.body_type || "보통",
    foot: card.foot || "L4 - R5",
    skill_moves: card.skill_moves || "★★★★☆☆",
    traits: card.traits || [],
    primary_archetype: archetypeScores[0] || null,
    secondary_archetype: archetypeScores[1] || null,
    all_archetypes: archetypeScores.slice(0, 8),
    strengths: nonGkStats.slice(0, 5),
    weaknesses: nonGkStats.slice(-4).reverse(),
    six_face: computeSixFaceSummary(card, clampedGrade, teamColorBonus),
    methodology_note:
      "본 결과는 실제 인게임 플레이 행동 로그 확정 판정이 아닌, 수집된 34개 세부 능력치·신체조건·특성 가중치 행렬에 기반한 플레이 스타일 적합도 분석입니다.",
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
