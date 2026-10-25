"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  SlidersHorizontal,
  Scale,
  Crosshair,
  Zap,
  Shield,
  Compass,
  Flame,
  Sparkles,
  Award,
  Flag,
  Trophy,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PlayerCard,
  CardEfficiencyResult,
  PlayerProfileResult,
  PriceHistoryData,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  getEnhanceOvrBoost,
  getEnhanceBadgeStyle,
  getStatColorClass,
  getPositionToneClass,
} from "@/lib/fclab-types";
import {
  PlayerAvatar,
  SeasonBadge,
  HexRadarChart,
  PriceTrendChart,
  GradeEfficiencyBarChart,
} from "./VisualCharts";

interface PlayerLabViewProps {
  rules?: SystemRules;
  initialSpid?: number | null;
  initialQuery?: string;
  bookmarkedSpids: number[];
  onToggleBookmark: (card: PlayerCard) => void;
  onSendToEfficiencyLab: (name: string, position: string) => void;
  onSendToProfileLab: (spid: number, compareSpid?: number) => void;
  onAddToSquadSlot: (card: PlayerCard, grade: number) => void;
}

const STAT_CATEGORIES: { title: string; keys: string[] }[] = [
  {
    title: "스피드 및 돌파",
    keys: ["속력", "가속력", "드리블", "볼 컨트롤", "민첩성", "밸런스", "반응 속도"],
  },
  {
    title: "슈팅 및 결정력",
    keys: [
      "골 결정력",
      "슛 파워",
      "중거리 슛",
      "위치 선정",
      "발리 슛",
      "페널티 킥",
      "커브",
      "프리킥",
    ],
  },
  {
    title: "패스 및 시야",
    keys: ["짧은 패스", "긴 패스", "시야", "크로스"],
  },
  {
    title: "수비 및 피지컬",
    keys: [
      "대인 수비",
      "태클",
      "슬라이딩 태클",
      "가로채기",
      "몸싸움",
      "스태미너",
      "적극성",
      "점프",
      "헤더",
      "침착성",
    ],
  },
];

function getTraitVisualStyle(traitName: string): {
  Icon: React.ComponentType<{ className?: string }>;
  badgeTone: string;
  iconColor: string;
} {
  if (
    traitName.includes("감아차기") ||
    traitName.includes("중거리") ||
    traitName.includes("슈팅") ||
    traitName.includes("칩슛") ||
    traitName.includes("아웃사이드")
  ) {
    return {
      Icon: Crosshair,
      badgeTone:
        "bg-rose-500/15 border-rose-500/40 text-rose-200",
      iconColor: "text-rose-400",
    };
  }
  if (
    traitName.includes("드리블") ||
    traitName.includes("스피드") ||
    traitName.includes("개인기") ||
    traitName.includes("플레어")
  ) {
    return {
      Icon: Zap,
      badgeTone:
        "bg-amber-500/15 border-amber-500/40 text-amber-200",
      iconColor: "text-amber-400",
    };
  }
  if (
    traitName.includes("패스") ||
    traitName.includes("플레이메이커") ||
    traitName.includes("크로스")
  ) {
    return {
      Icon: Compass,
      badgeTone:
        "bg-sky-500/15 border-sky-500/40 text-sky-200",
      iconColor: "text-sky-400",
    };
  }
  if (
    traitName.includes("헤더") ||
    traitName.includes("강철몸") ||
    traitName.includes("승부욕")
  ) {
    return {
      Icon: Flame,
      badgeTone:
        "bg-orange-500/15 border-orange-500/40 text-orange-200",
      iconColor: "text-orange-400",
    };
  }
  if (
    traitName.includes("수비") ||
    traitName.includes("태클") ||
    traitName.includes("GK")
  ) {
    return {
      Icon: Shield,
      badgeTone:
        "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
      iconColor: "text-emerald-400",
    };
  }
  return {
    Icon: Sparkles,
    badgeTone:
      "bg-purple-500/15 border-purple-500/40 text-purple-200",
    iconColor: "text-purple-400",
  };
}

function TraitIconBadge({
  trait,
}: {
  trait: { icon?: string; name: string };
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { Icon, badgeTone, iconColor } = getTraitVisualStyle(trait.name);
  const hasValidImg =
    Boolean(trait.icon) &&
    trait.icon!.startsWith("http") &&
    !imgFailed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${badgeTone}`}
    >
      {hasValidImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trait.icon}
          alt={trait.name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-4 h-4 object-contain shrink-0"
        />
      ) : (
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
      )}
      <span>{trait.name}</span>
    </span>
  );
}

const NATION_CREST_MAP: Record<string, { code: string; bg: string }> = {
  대한민국: { code: "KOR", bg: "bg-rose-600 text-white" },
  브라질: { code: "BRA", bg: "bg-amber-500 text-slate-950" },
  네덜란드: { code: "NED", bg: "bg-orange-500 text-white" },
  잉글랜드: { code: "ENG", bg: "bg-slate-200 text-rose-700" },
  프랑스: { code: "FRA", bg: "bg-blue-600 text-white" },
  우루과이: { code: "URU", bg: "bg-sky-500 text-white" },
  벨기에: { code: "BEL", bg: "bg-red-700 text-amber-300" },
  모로코: { code: "MAR", bg: "bg-emerald-700 text-rose-200" },
  독일: { code: "GER", bg: "bg-slate-800 text-amber-400" },
  스페인: { code: "ESP", bg: "bg-red-600 text-amber-300" },
  포르투갈: { code: "POR", bg: "bg-rose-700 text-emerald-300" },
  아르헨티나: { code: "ARG", bg: "bg-sky-400 text-slate-950" },
  이탈리아: { code: "ITA", bg: "bg-blue-500 text-white" },
};

const CLUB_CREST_MAP: Record<string, { code: string; bg: string }> = {
  "레알 마드리드": { code: "RMA", bg: "bg-indigo-600 text-amber-300" },
  "AC 밀란": { code: "ACM", bg: "bg-red-700 text-white" },
  "토트넘 홋스퍼": { code: "TOT", bg: "bg-slate-200 text-slate-900" },
  "맨체스터 유나이티드": { code: "MUN", bg: "bg-red-600 text-amber-200" },
  "바이에른 뮌헨": { code: "FCB", bg: "bg-rose-600 text-white" },
  "리버풀 FC": { code: "LIV", bg: "bg-red-700 text-amber-200" },
  "첼시 FC": { code: "CHE", bg: "bg-blue-600 text-white" },
  "파리 생제르맹": { code: "PSG", bg: "bg-blue-800 text-rose-300" },
  "인터 밀란": { code: "INT", bg: "bg-blue-700 text-slate-100" },
  "FC 바르셀로나": { code: "BAR", bg: "bg-rose-700 text-amber-300" },
  "보루시아 도르트문트": { code: "BVB", bg: "bg-amber-400 text-slate-950" },
  "바이어 04 레버쿠젠": { code: "B04", bg: "bg-red-600 text-white" },
  "SSC 나폴리": { code: "NAP", bg: "bg-sky-500 text-white" },
  "PSV 에인트호번": { code: "PSV", bg: "bg-rose-600 text-white" },
  "아인트라흐트 프랑크푸르트": { code: "SGE", bg: "bg-slate-800 text-rose-400" },
};

function TeamColorLogoBadge({
  name,
  type,
  compact = false,
}: {
  name: string;
  type?: string;
  compact?: boolean;
}) {
  const cleanName = name.trim();
  const nationStyle = NATION_CREST_MAP[cleanName];
  const clubStyle =
    CLUB_CREST_MAP[cleanName] ||
    Object.entries(CLUB_CREST_MAP).find(([k]) => cleanName.includes(k))?.[1];

  const isNation =
    Boolean(nationStyle) ||
    type === "국가대표" ||
    ["대한민국", "브라질", "네덜란드", "잉글랜드", "프랑스", "우루과이", "벨기에", "모로코", "독일", "스페인", "포르투갈", "아르헨티나", "이탈리아"].includes(cleanName);

  const badgeCode =
    nationStyle?.code ||
    clubStyle?.code ||
    cleanName.replace(/[^A-Za-z가-힣0-9]/g, "").slice(0, 2).toUpperCase();

  const crestBg =
    nationStyle?.bg ||
    clubStyle?.bg ||
    (isNation
      ? "bg-rose-600 text-white"
      : "bg-emerald-600 text-white");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${
        compact
          ? "px-1.5 py-0.5 text-[11px] bg-slate-800/90 border-slate-700 text-slate-200"
          : "px-2 py-1 text-xs bg-[#0B0F17] border-slate-700/90 text-slate-200"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-mono font-extrabold leading-none tracking-tighter shrink-0 ${crestBg}`}
      >
        {isNation ? (
          <Flag className="w-2.5 h-2.5 mr-0.5 inline" />
        ) : (
          <Trophy className="w-2.5 h-2.5 mr-0.5 inline" />
        )}
        {badgeCode}
      </span>
      <span className="font-medium">{cleanName}</span>
      {!compact && type && (
        <span className="text-[10px] text-slate-400">({type})</span>
      )}
    </span>
  );
}

export default function PlayerLabView({
  rules = DEFAULT_SYSTEM_RULES,
  initialSpid,
  initialQuery = "",
  bookmarkedSpids,
  onToggleBookmark,
  onSendToEfficiencyLab,
  onSendToProfileLab,
  onAddToSquadSlot,
}: PlayerLabViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery || "");
  const [posFilter, setPosFilter] = useState("ALL");
  const [trapBadgeFilter, setTrapBadgeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("ovr_desc");
  const [cards, setCards] = useState<PlayerCard[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedSpid, setSelectedSpid] = useState<number | null>(
    initialSpid || null
  );
  const [compareSpid, setCompareSpid] = useState<number | null>(null);
  // 기본 강화 단계: +8강(8카), 기본 적응도/팀컬러 보너스: 0
  const [grade, setGrade] = useState<number>(8);
  const [teamColorBonus, setTeamColorBonus] = useState<number>(0);
  const [compareBeforeAfter, setCompareBeforeAfter] = useState<boolean>(true);
  const [showFormulaDetail, setShowFormulaDetail] = useState<boolean>(false);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    card: PlayerCard;
    efficiency: CardEfficiencyResult;
    profile: PlayerProfileResult;
    priceHistory: PriceHistoryData;
    otherSeasons: PlayerCard[];
    competitors: PlayerCard[];
    fetchedAt: string;
  } | null>(null);

  const [compareDetail, setCompareDetail] = useState<{
    card: PlayerCard;
    efficiency: CardEfficiencyResult;
  } | null>(null);

  const dynamicEnhanceLevels = Array.from(
    { length: Math.max(1, rules.maxEnhanceLevel) },
    (_, i) => i + 1
  );

  const runSearch = useCallback(
    async (
      qStr: string,
      pos: string,
      sort: string,
      trapBadge = "ALL",
      forceCrawl = false
    ) => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: qStr,
          position: pos,
          sort,
          trap_badge: trapBadge,
          crawl: forceCrawl ? "1" : "0",
        });
        const res = await fetch(`/api/fclab/v1/players/search?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data.cards)) {
          setCards(data.cards);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    runSearch(searchQuery, posFilter, sortBy, trapBadgeFilter, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posFilter, sortBy, trapBadgeFilter]);

  useEffect(() => {
    if (initialSpid) {
      setSelectedSpid(initialSpid);
    }
  }, [initialSpid]);

  const loadPlayerDetail = useCallback(
    async (spid: number, g: number, tc: number, forceRefresh = false) => {
      setDetailLoading(true);
      try {
        const params = new URLSearchParams({
          spid: String(spid),
          grade: String(g),
          team_color: String(tc),
          refresh: forceRefresh ? "1" : "0",
        });
        const res = await fetch(`/api/fclab/v1/players/detail?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDetailData(data);
        }
      } catch {
        // ignore
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedSpid) {
      loadPlayerDetail(selectedSpid, grade, teamColorBonus, false);
    }
  }, [selectedSpid, grade, teamColorBonus, loadPlayerDetail]);

  useEffect(() => {
    if (!compareSpid) {
      setCompareDetail(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams({
          spid: String(compareSpid),
          grade: String(grade),
          team_color: String(teamColorBonus),
        });
        const res = await fetch(`/api/fclab/v1/players/detail?${params.toString()}`);
        if (res.ok && active) {
          const d = await res.json();
          setCompareDetail({ card: d.card, efficiency: d.efficiency });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [compareSpid, grade, teamColorBonus]);

  const activeCard = detailData?.card;
  const activeEff = detailData?.efficiency;
  const activeProf = detailData?.profile;
  const enhAdd = getEnhanceOvrBoost(grade, rules.enhanceOvrBoosts);
  const totalAdd = enhAdd + teamColorBonus;
  const currentBadge = getEnhanceBadgeStyle(grade);

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(searchQuery, posFilter, sortBy, trapBadgeFilter, true);
            }}
            className="flex-1 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="선수 이름 검색 (예: 손흥민, 호날두, 굴리트, 벨링엄, 이강인, 음바페...)"
                className="w-full pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              {searching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              실시간 검색·크롤링
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-slate-800">
              {["ALL", "ST", "CF", "LW", "RW", "CAM", "CM", "CDM", "CB", "LB", "RB", "GK"].map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosFilter(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      posFilter === p
                        ? "bg-slate-800 text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {p === "ALL" ? "전체" : p}
                  </button>
                )
              )}
            </div>

            <select
              value={trapBadgeFilter}
              onChange={(e) => setTrapBadgeFilter(e.target.value)}
              className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              title="체감 판독 배지 필터"
            >
              <option value="ALL">체감 판독: 전체</option>
              <option value="CHEAT_KEY">💎 체감 괴물 / 꿀매물</option>
              <option value="NORMAL">일반 밸런스</option>
              <option value="STAT_TRAP">⚠️ 스탯 대비 둔중함</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0B0F17] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ovr_desc">OVR 높은순</option>
              <option value="feel_desc">인게임 체감 지수순</option>
              <option value="salary_eff_desc">유효 급여 효율순</option>
              <option value="ranker_desc">상위 랭커 픽률(%)순</option>
              <option value="bp_desc">1강 시세 높은순</option>
              <option value="bp_asc">1강 시세 낮은순</option>
              <option value="salary_asc">급여(FP) 낮은순</option>
              <option value="rating_desc">구단주 평점순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left Player Card List (5 cols) / Right Detailed Inspector (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              01. 탐색된 선수 카드 목록
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              총 {cards.length}장
            </span>
          </div>

          <div className="divide-y divide-slate-800/70 max-h-[780px] overflow-y-auto">
            {searching ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                <p>FC 온라인 공식 데이터센터에서 선수 카드를 탐색 중입니다...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                조건에 일치하는 선수가 없습니다. 상단 검색창에서 원하는 선수 이름을 검색해 보세요.
              </div>
            ) : (
              cards.map((c) => {
                const isSelected = c.spid === selectedSpid;
                const isBookmarked = bookmarkedSpids.includes(c.spid);
                const bp1Text = c.prices?.["1"]?.text || "-";
                const bp5Text = c.prices?.["5"]?.text || "-";
                const fm = c.feelMetrics;

                return (
                  <div
                    key={c.spid}
                    onClick={() => setSelectedSpid(c.spid)}
                    className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-slate-800/75"
                        : "hover:bg-slate-800/35"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar
                        src={c.thumb_url}
                        spid={c.spid}
                        name={c.name}
                        className="w-12 h-12"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <SeasonBadge
                            seasonImg={c.season_img}
                            seasonCode={c.season_code}
                          />
                          <span className="text-sm font-semibold text-slate-100 truncate">
                            {c.name}
                          </span>
                          {fm && (
                            <span
                              className={`text-[11px] font-mono font-semibold ${
                                fm.statTrapBadge === "CHEAT_KEY"
                                  ? "text-cyan-300"
                                  : fm.statTrapBadge === "STAT_TRAP"
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {fm.statTrapBadge === "CHEAT_KEY"
                                ? "💎 체감괴물"
                                : fm.statTrapBadge === "STAT_TRAP"
                                ? "⚠️ 둔중주의"
                                : "일반체감"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-mono tabular-nums flex-wrap">
                          <span
                            className={`font-semibold ${getPositionToneClass(
                              c.primary_position
                            )}`}
                          >
                            {c.primary_position}
                          </span>
                          <span>·</span>
                          <span className="text-slate-200 font-semibold">
                            OVR {c.ovr}
                          </span>
                          <span>·</span>
                          <span>급여 {c.salary}</span>
                          <span>·</span>
                          <span>{c.foot}</span>
                        </div>
                        {fm && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                            <span className="text-emerald-400 font-semibold">
                              체감 {fm.feelScore}
                            </span>
                            <span>·</span>
                            <span className="text-sky-400">
                              급여효율 {fm.positionSalaryEfficiency}
                            </span>
                            <span>·</span>
                            <span className="text-amber-300">
                              랭커픽 {fm.rankerPickRate}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-xs font-semibold text-emerald-400">
                          1강 {bp1Text}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          5강 {bp5Text}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(c);
                        }}
                        title="관심 선수 저장"
                        className="p-1.5 text-slate-400 hover:text-amber-300 transition-colors"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detailed Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {detailLoading && !activeCard ? (
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
              <p>선수 세부 능력치(34개 항목) 및 30일 시세 추이를 수집·분석하고 있습니다...</p>
            </div>
          ) : !activeCard || !activeEff || !activeProf ? (
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
              좌측 목록에서 분석할 선수 카드를 선택해 주세요.
            </div>
          ) : (
            <>
              {/* Card Header & Simulation Controls */}
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar
                      src={activeCard.thumb_url}
                      spid={activeCard.spid}
                      name={activeCard.name}
                      className="w-20 h-20"
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeasonBadge
                          seasonImg={activeCard.season_img}
                          seasonCode={activeCard.season_code}
                          className="h-5"
                        />
                        <h2 className="text-xl font-bold text-slate-100 font-display">
                          {activeCard.name}
                        </h2>
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded border ${currentBadge.className}`}
                        >
                          {currentBadge.label} ({currentBadge.tierName})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono tabular-nums">
                        <span
                          className={`font-bold ${getPositionToneClass(
                            activeCard.primary_position
                          )}`}
                        >
                          {activeCard.primary_position}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-emerald-400 font-bold">
                          적용 OVR {activeCard.ovr + totalAdd}
                        </span>
                        <span className="text-slate-500">
                          (기본 {activeCard.ovr} + 강화 {enhAdd} + 적응도/팀컬러 {teamColorBonus})
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>급여 {activeCard.salary} FP</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{activeCard.height}cm</span>
                        <span>·</span>
                        <span>{activeCard.weight}kg</span>
                        <span>·</span>
                        <span>{activeCard.body_type}</span>
                        <span>·</span>
                        <span>양발/주발 {activeCard.foot}</span>
                        <span>·</span>
                        <span>개인기 {activeCard.skill_moves}</span>
                      </div>

                      {/* 소속 클럽 및 국가대표 팀컬러 로고 배지 */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {activeCard.nation && (
                          <TeamColorLogoBadge
                            name={activeCard.nation}
                            type="국가대표"
                            compact
                          />
                        )}
                        {activeCard.team && (
                          <TeamColorLogoBadge
                            name={activeCard.team}
                            type="소속 클럽"
                            compact
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-xs text-slate-400">
                        +{grade}강 기준 이적시장 시세
                      </div>
                      <div className="text-lg font-bold text-emerald-400">
                        {activeEff.bp_text} BP
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAddToSquadSlot(activeCard, grade)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        스쿼드에 배치
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSendToEfficiencyLab(
                            activeCard.name,
                            activeCard.primary_position
                          )
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                      >
                        카드 효율 분석
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 보유 고유 특성 (Traits) 시각 아이콘 배지 */}
                {activeCard.traits && activeCard.traits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    <span className="text-xs font-semibold text-slate-400 mr-1">
                      보유 특성:
                    </span>
                    {activeCard.traits.map((t) => (
                      <TraitIconBadge key={t.name} trait={t} />
                    ))}
                  </div>
                )}

                {/* Interactive Enhancement (Dynamic 1..rules.maxEnhanceLevel) & Team Color Simulation Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                  <div className="md:col-span-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        강화 단계 설정 (기본 +8강 금카 · 최대 +{rules.maxEnhanceLevel}강)
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        +{grade}강 (OVR +{enhAdd})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={rules.maxEnhanceLevel}
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1">
                      {dynamicEnhanceLevels.map((g) => {
                        const bStyle = getEnhanceBadgeStyle(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGrade(g)}
                            className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                              grade === g
                                ? bStyle.className
                                : "bg-[#0B0F17] border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            +{g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs text-slate-400 mb-1.5">
                      적응도 &amp; 팀컬러 보너스 (기본 0 · 현재 +{teamColorBonus})
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[0, 1, 2, 3, 4, 5, 7, 9].map((tc) => (
                        <button
                          key={tc}
                          type="button"
                          onClick={() => setTeamColorBonus(tc)}
                          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                            teamColorBonus === tc
                              ? "bg-sky-600 border-sky-500 text-white font-semibold"
                              : "bg-[#0B0F17] border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          +{tc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col justify-between">
                    <label className="block text-xs text-slate-400 mb-1.5">
                      상승폭 표시
                    </label>
                    <button
                      type="button"
                      onClick={() => setCompareBeforeAfter((v) => !v)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                        compareBeforeAfter
                          ? "bg-slate-800 border-emerald-500/80 text-emerald-300"
                          : "bg-[#0B0F17] border-slate-800 text-slate-300"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      1강 대비
                    </button>
                  </div>
                </div>

                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">
                      인게임 체감 지수 · 판독
                    </div>
                    <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                      {activeEff.feelMetrics?.feelScore ?? activeEff.core_score}점
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 truncate">
                      {activeEff.feelMetrics?.statTrapBadge === "CHEAT_KEY"
                        ? "💎 체감 괴물 / 꿀매물"
                        : activeEff.feelMetrics?.statTrapBadge === "STAT_TRAP"
                        ? "⚠️ 스탯 대비 둔중함"
                        : "일반 밸런스"}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">
                      핵심 스탯 vs OVR 효율
                    </div>
                    <div className="text-lg font-mono font-bold text-sky-400 tabular-nums mt-0.5">
                      {activeEff.efficiency_index}점
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      핵심평균 {activeEff.core_score} / OVR {activeEff.effective_ovr}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">
                      상위 랭커 픽률 · 주 유형
                    </div>
                    <div className="text-lg font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                      {activeEff.feelMetrics?.rankerPickRate ?? 0}%
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 truncate">
                      {activeProf.primary_archetype?.name.split("(")[0] ||
                        "올라운더"}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">
                      추천 가성비 강화 구간
                    </div>
                    <div className="text-lg font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                      +{activeEff.best_sweetspot_grade?.grade || 8}강
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {activeEff.best_sweetspot_grade?.bp_text || "-"} BP
                    </div>
                  </div>
                </div>

                {/* Collapsible Formula Details Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFormulaDetail((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ℹ️ 체감 및 효율 산출 기준 자세히 보기</span>
                    {showFormulaDetail ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showFormulaDetail && (
                    <div className="mt-2 p-3 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-400 space-y-1 leading-relaxed">
                      <p>
                        • <strong className="text-slate-200">인게임 체감 지수:</strong> 방향 전환 4대 스탯(민첩성·밸런스·반응속도·드리블)에 체형 보정(고유/마름 우대) 및 신장·몸무게 물리 페널티를 반영한 실전 체감 점수입니다.
                      </p>
                      <p>
                        • <strong className="text-slate-200">핵심 스탯 vs OVR 효율:</strong> (포지션 핵심 스탯 평균 ÷ 표기 OVR) × 100 공식으로 산출되어, 프리킥·페널티킥 등으로 표기 OVR만 부풀려진 카드를 걸러냅니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 6-Face Radar & 30-Day Market Price Trend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      02. 6대 핵심 능력치 밸런스
                    </h3>
                    {compareDetail && (
                      <button
                        type="button"
                        onClick={() => setCompareSpid(null)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        비교 해제
                      </button>
                    )}
                  </div>
                  <HexRadarChart
                    primaryData={activeEff.six_face}
                    compareData={compareDetail?.efficiency.six_face || null}
                    primaryLabel={`${activeCard.season_code} ${activeCard.name} (+${grade})`}
                    compareLabel={
                      compareDetail
                        ? `${compareDetail.card.season_code} ${compareDetail.card.name} (+${grade})`
                        : undefined
                    }
                    size={230}
                  />
                </div>

                <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-100">
                      03. 이적시장 30일 시세 추이 및 강화별 효율
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      조회: {detailData?.fetchedAt.slice(0, 16)}
                    </span>
                  </div>
                  <PriceTrendChart
                    points={detailData?.priceHistory?.points || []}
                  />
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400 mb-2">
                      강화 단계별 코어 효율 비교 (클릭 시 강화 단계 전환)
                    </div>
                    <GradeEfficiencyBarChart
                      curve={activeEff.grade_curve}
                      activeGrade={grade}
                      onSelectGrade={(g) => setGrade(g)}
                    />
                  </div>
                </div>
              </div>

              {/* 34 Detailed Stats Grid */}
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      04. 세부 능력치 (34개 인게임 스탯)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      강화 +{grade}강(+{enhAdd}) 및 적응도/팀컬러(+{teamColorBonus})가 반영된 실제 인게임 능력치입니다.
                    </p>
                  </div>
                  {activeCard.traits && activeCard.traits.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeCard.traits.map((t) => (
                        <TraitIconBadge key={t.name} trait={t} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {STAT_CATEGORIES.map((cat) => (
                    <div
                      key={cat.title}
                      className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3.5 space-y-2"
                    >
                      <div className="text-xs font-semibold text-slate-300 border-b border-slate-800 pb-1.5">
                        {cat.title}
                      </div>
                      <div className="space-y-1.5">
                        {cat.keys.map((sKey) => {
                          const baseVal =
                            activeCard.stats?.[sKey] ??
                            activeCard.stats?.[sKey.replace(/\s+/g, "")] ??
                            Math.max(70, activeCard.ovr - 5);
                          const finalVal = baseVal + totalAdd;
                          const compBase =
                            compareDetail?.card.stats?.[sKey] ??
                            compareDetail?.card.stats?.[sKey.replace(/\s+/g, "")];
                          const compFinal =
                            compBase !== undefined ? compBase + totalAdd : null;
                          const diffFromComp =
                            compFinal !== null ? finalVal - compFinal : null;

                          return (
                            <div
                              key={sKey}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-400">{sKey}</span>
                              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                                {compareBeforeAfter && totalAdd > 0 && (
                                  <span className="text-[11px] text-slate-500">
                                    {baseVal}→
                                  </span>
                                )}
                                <span className={getStatColorClass(finalVal)}>
                                  {finalVal}
                                </span>
                                {diffFromComp !== null && diffFromComp !== 0 && (
                                  <span
                                    className={`text-[11px] ${
                                      diffFromComp > 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    (
                                    {diffFromComp > 0
                                      ? `+${diffFromComp}`
                                      : diffFromComp}
                                    )
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Team Colors List with Club / Nation Logos */}
                {activeCard.team_colors && activeCard.team_colors.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="text-slate-300 font-semibold mr-1">
                      소속 클럽 및 국가대표 팀컬러:
                    </span>
                    {activeCard.team_colors.map((tc, i) => (
                      <TeamColorLogoBadge
                        key={`${tc.id}-${i}`}
                        name={tc.name}
                        type={tc.type}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Same Player Other Seasons & Same Position Competitors */}
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">
                    05. 동일 선수 타 시즌 카드 및 동포지션 경쟁자 비교
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      onSendToProfileLab(
                        activeCard.spid,
                        compareSpid || detailData?.competitors?.[0]?.spid
                      )
                    }
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    선수 유형 분석에서 정밀 비교
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-400">
                      동일 선수({activeCard.name})의 다른 시즌 카드
                    </div>
                    <div className="divide-y divide-slate-800/70 bg-[#0B0F17] border border-slate-800 rounded-lg overflow-hidden">
                      {(detailData?.otherSeasons || []).slice(0, 5).map((os) => (
                        <div
                          key={os.spid}
                          className="px-3 py-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-2">
                            <SeasonBadge
                              seasonImg={os.season_img}
                              seasonCode={os.season_code}
                            />
                            <span className="font-medium text-slate-200">
                              {os.primary_position} · OVR {os.ovr} · 급여{" "}
                              {os.salary}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono tabular-nums">
                            <span className="text-emerald-400">
                              {os.prices?.[String(grade)]?.text ||
                                os.prices?.["8"]?.text ||
                                os.prices?.["1"]?.text ||
                                "-"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCompareSpid(os.spid)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1"
                            >
                              <Scale className="w-3 h-3" />
                              비교
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        동일 포지션({activeCard.primary_position}) 경쟁 카드
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        동일 팀컬러 · 랭커 픽률 우선
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/70 bg-[#0B0F17] border border-slate-800 rounded-lg overflow-hidden">
                      {(detailData?.competitors || []).slice(0, 5).map((comp) => {
                        const sharedTc =
                          comp.sharedTeamColor ||
                          comp.team ||
                          comp.nation;
                        const pickRate =
                          comp.rankerPickRate ??
                          comp.feelMetrics?.rankerPickRate ??
                          0;
                        return (
                          <div
                            key={comp.spid}
                            className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <SeasonBadge
                                seasonImg={comp.season_img}
                                seasonCode={comp.season_code}
                              />
                              <span className="font-semibold text-slate-100">
                                {comp.name}
                              </span>
                              <span className="text-slate-400 font-mono">
                                OVR {comp.ovr}
                              </span>
                              {sharedTc && (
                                <TeamColorLogoBadge
                                  name={sharedTc}
                                  compact
                                />
                              )}
                              {pickRate > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px]">
                                  픽률 {pickRate}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                              <span className="text-emerald-400">
                                {comp.prices?.[String(grade)]?.text ||
                                  comp.prices?.["8"]?.text ||
                                  comp.prices?.["1"]?.text ||
                                  "-"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCompareSpid(comp.spid)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1"
                              >
                                <Scale className="w-3 h-3" />
                                비교
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
