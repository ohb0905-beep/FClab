"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Users,
  Shield,
  Sliders,
  Compass,
  Swords,
  Bookmark,
  Search,
  RefreshCw,
  ArrowRight,
  Trash2,
  Sparkles,
  TrendingUp,
  Calculator,
  X,
  ArrowLeftRight,
  Sun,
  Moon,
  Info,
  ChevronDown,
  ChevronUp,
  Flame,
  Crown,
} from "lucide-react";
import {
  LabTab,
  PlayerCard,
  CardEfficiencyResult,
  SavedSquad,
  SquadSlot,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  formatBpKorean,
  getEnhanceBadgeStyle,
  getPositionToneClass,
} from "@/lib/fclab-types";
import { PlayerAvatar, SeasonBadge } from "@/components/fclab/VisualCharts";
import PlayerLabView from "@/components/fclab/PlayerLabView";
import SquadLabView from "@/components/fclab/SquadLabView";
import CardEfficiencyLabView from "@/components/fclab/CardEfficiencyLabView";
import PlayerProfileLabView from "@/components/fclab/PlayerProfileLabView";
import MatchLabView from "@/components/fclab/MatchLabView";
import MarketLabView from "@/components/fclab/MarketLabView";

interface DashboardPayload {
  systemRules?: SystemRules;
  rules?: SystemRules;
  stats: {
    totalCards: number;
    detailedCards: number;
    seasonsCount: number;
    hasNexonApiKey: boolean;
    serverTime: string;
  };
  connectionStatus: {
    nexonStaticMetadata: boolean;
    fcDatacenterCrawler: boolean;
    nexonUserMatchApi: boolean;
  };
  topCards: PlayerCard[];
  efficiencyPicks: CardEfficiencyResult[];
  savedSquads: SavedSquad[];
  availableSeasons: {
    season_code: string;
    season_name: string;
    season_img: string;
  }[];
  positionWeights: Record<string, Record<string, number>>;
}

const PRICE_BRACKET_FILTERS = [
  { id: "ALL", label: "전체 가격대" },
  { id: "5m_20m", label: "500만~2,000만 BP" },
  { id: "20m_50m", label: "2,000만~5,000만 BP" },
  { id: "50m_100m", label: "5,000만~1억 BP" },
  { id: "100m_300m", label: "1억~3억 BP" },
];

export default function FClabMainPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("home");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [systemRules, setSystemRules] = useState<SystemRules>(
    DEFAULT_SYSTEM_RULES
  );
  const [loadingDash, setLoadingDash] = useState(true);

  // 테마 상태: 기본 화이트(light) 테마 + 다크모드 토글 지원
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("fclab_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      localStorage.setItem("fclab_theme", nextTheme);
    } catch {
      // ignore storage error
    }
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  // Cross-tab navigation states (초기 상태는 모두 비워둠 - Clean Empty State)
  const [targetPlayerSpid, setTargetPlayerSpid] = useState<number | null>(null);
  const [targetPlayerQuery, setTargetPlayerQuery] = useState<string>("");
  const [targetEfficiencyName, setTargetEfficiencyName] = useState<string>("");
  const [targetEfficiencyPos, setTargetEfficiencyPos] = useState<string>("LW");
  const [targetProfileSpid, setTargetProfileSpid] = useState<number | null>(
    null
  );
  const [targetProfileCompareSpid, setTargetProfileCompareSpid] = useState<
    number | null
  >(null);
  const [externalSquadSlots, setExternalSquadSlots] = useState<
    SquadSlot[] | null
  >(null);

  // Bookmarked players (stored in localStorage)
  const [bookmarkedCards, setBookmarkedCards] = useState<PlayerCard[]>([]);

  // Quick search on Home
  const [quickSearch, setQuickSearch] = useState("");
  const [quickResults, setQuickResults] = useState<PlayerCard[]>([]);
  const [quickSearching, setQuickSearching] = useState(false);

  // 대시보드 필터 및 '자세히 보기(접기/펴기)' 상태
  const [selectedBracketId, setSelectedBracketId] = useState<string>("ALL");
  const [expandedEffSpids, setExpandedEffSpids] = useState<Record<string, boolean>>({});
  const [expandedMetaSpids, setExpandedMetaSpids] = useState<Record<number, boolean>>({});
  const [showEngineGuide, setShowEngineGuide] = useState<boolean>(false);

  // 상단 빠른 수수료 계산기 모달 상태
  const [showFeeCalcModal, setShowFeeCalcModal] = useState(false);
  const [calcSellPriceInput, setCalcSellPriceInput] = useState<string>("100");
  const [calcSellUnit, setCalcSellUnit] = useState<number>(100_000_000); // 기본 '억 BP'
  const [calcTargetNetInput, setCalcTargetNetInput] = useState<string>("100");
  const [calcPcBang, setCalcPcBang] = useState<boolean>(true);
  const [calcTopClass, setCalcTopClass] = useState<boolean>(true);
  const [calcCouponPct, setCalcCouponPct] = useState<0 | 20 | 30 | 40>(30);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await fetch("/api/fclab/v1/dashboard");
      if (res.ok) {
        const raw = await res.json();
        const incomingRules: SystemRules =
          raw.systemRules || raw.rules || DEFAULT_SYSTEM_RULES;
        setSystemRules(incomingRules);
        setDashboard({
          systemRules: incomingRules,
          rules: incomingRules,
          stats: raw.stats ?? {
            totalCards: raw.cached_player_count ?? 0,
            detailedCards: (raw.popular_cards ?? []).length,
            seasonsCount: Math.max(1, Math.round((raw.meta_spid_count ?? 0) / 500)),
            hasNexonApiKey: Boolean(raw.nexon_key_configured),
            serverTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          },
          connectionStatus: raw.connectionStatus ?? {
            nexonStaticMetadata: (raw.meta_spid_count ?? 0) > 0,
            fcDatacenterCrawler: (raw.cached_player_count ?? 0) > 0,
            nexonUserMatchApi: Boolean(raw.nexon_key_configured),
          },
          topCards: raw.topCards ?? raw.popular_cards ?? [],
          efficiencyPicks: raw.efficiencyPicks ?? raw.top_efficiency_cards ?? [],
          savedSquads: raw.savedSquads ?? raw.saved_squads ?? [],
          availableSeasons: raw.availableSeasons ?? [],
          positionWeights: raw.positionWeights ?? raw.position_weights ?? {},
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    try {
      const raw = localStorage.getItem("fclab_bookmarks");
      if (raw) {
        setBookmarkedCards(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [loadDashboard]);

  const handleToggleBookmark = (card: PlayerCard) => {
    setBookmarkedCards((prev) => {
      const exists = prev.some((c) => c.spid === card.spid);
      const next = exists
        ? prev.filter((c) => c.spid !== card.spid)
        : [card, ...prev];
      try {
        localStorage.setItem("fclab_bookmarks", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleInspectInPlayerLab = (spid: number, nameHint?: string) => {
    setTargetPlayerSpid(spid);
    if (nameHint) setTargetPlayerQuery(nameHint);
    setActiveTab("player");
  };

  const handleSendToEfficiencyLab = (name: string, position: string) => {
    setTargetEfficiencyName(name);
    setTargetEfficiencyPos(position || "LW");
    setActiveTab("efficiency");
  };

  const handleSendToProfileLab = (spid: number, compareSpid?: number) => {
    setTargetProfileSpid(spid);
    setTargetProfileCompareSpid(compareSpid || null);
    setActiveTab("profile");
  };

  const handleAddToSquadSlot = (card: PlayerCard, grade: number) => {
    const baseSlots = externalSquadSlots || [];
    const targetPos = card.primary_position;
    if (baseSlots.length > 0) {
      const updated = [...baseSlots];
      const matchIdx = updated.findIndex(
        (s) => s.slot_position === targetPos || s.spid === 0
      );
      if (matchIdx >= 0) {
        updated[matchIdx] = {
          ...updated[matchIdx],
          spid: card.spid,
          grade,
        };
      } else {
        updated[0] = { ...updated[0], spid: card.spid, grade };
      }
      setExternalSquadSlots(updated);
    } else {
      setExternalSquadSlots([
        {
          slot_id: targetPos || "ST",
          slot_position: targetPos || "ST",
          spid: card.spid,
          grade,
        },
      ]);
    }
    setActiveTab("squad");
  };

  const handleSendToSquadLab = (slots: SquadSlot[]) => {
    setExternalSquadSlots(slots);
    setActiveTab("squad");
  };

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setQuickSearching(true);
    try {
      const res = await fetch(
        `/api/fclab/v1/players/search?q=${encodeURIComponent(quickSearch.trim())}&crawl=1`
      );
      const data = await res.json();
      if (Array.isArray(data.cards)) {
        setQuickResults(data.cards.slice(0, 8));
      }
    } catch {
      // ignore
    } finally {
      setQuickSearching(false);
    }
  };

  const handleDeleteSavedSquad = async (id: string) => {
    try {
      await fetch(`/api/fclab/v1/squads?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      loadDashboard();
    } catch {
      // ignore
    }
  };

  const toggleEffDetail = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEffSpids((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMetaDetail = (spid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMetaSpids((prev) => ({ ...prev, [spid]: !prev[spid] }));
  };

  const TABS: {
    id: LabTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }[] = [
    {
      id: "home",
      label: "통합 대시보드",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: "player",
      label: "선수 탐색",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "efficiency",
      label: "카드 효율 분석",
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: "profile",
      label: "선수 유형 분석",
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: "squad",
      label: "스쿼드 메이커",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "market",
      label: "이적시장 · 메타 분석",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "match",
      label: "매치 분석",
      icon: <Swords className="w-4 h-4" />,
    },
    {
      id: "saved",
      label: "보관함",
      icon: <Bookmark className="w-4 h-4" />,
      badge:
        bookmarkedCards.length + (dashboard?.savedSquads?.length || 0) ||
        undefined,
    },
  ];

  // 수수료 계산기 실시간 연산
  const calcTotalDiscountRatio = Math.min(
    1.0,
    (calcPcBang ? 0.3 : 0) + (calcTopClass ? 0.2 : 0) + calcCouponPct / 100
  );
  const calcEffectiveFeeRate = Number(
    (0.4 * (1 - calcTotalDiscountRatio)).toFixed(4)
  );
  const calcGrossBp = Math.max(
    0,
    Math.round((Number(calcSellPriceInput) || 0) * calcSellUnit)
  );
  const calcBaseFeeBp = Math.round(calcGrossBp * 0.4);
  const calcActualFeeBp = Math.round(calcGrossBp * calcEffectiveFeeRate);
  const calcSavedFeeBp = Math.max(0, calcBaseFeeBp - calcActualFeeBp);
  const calcNetProceedsBp = Math.max(0, calcGrossBp - calcActualFeeBp);

  const calcDesiredNetBp = Math.max(
    0,
    Math.round((Number(calcTargetNetInput) || 0) * calcSellUnit)
  );
  const calcRequiredListPriceBp =
    calcEffectiveFeeRate < 1
      ? Math.ceil(calcDesiredNetBp / (1 - calcEffectiveFeeRate))
      : calcDesiredNetBp;

  const filteredEfficiencyPicks = (dashboard?.efficiencyPicks || []).filter(
    (pick) =>
      selectedBracketId === "ALL" || pick.priceBracketId === selectedBracketId
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors">
      {/* Top Global Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  FClab
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  체감 · 픽률 분석실
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                FC 온라인 실사용 픽률 · 인게임 체감 · 스쿼드 진단 플랫폼
              </p>
            </div>
          </div>

          {/* Right Action Controls: 수수료 계산기 + 화이트/다크 테마 토글 + 스쿼드 메이커 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFeeCalcModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>🧮 수수료 계산기</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title="화이트 / 다크 테마 전환"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {theme === "light" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>☀️ 화이트</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>🌙 다크</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab("squad")}
              className="hidden sm:flex px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> 스쿼드 메이커
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800/60 bg-slate-100/70 dark:bg-[#0E1422]/90">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 상단 빠른 이적시장 수수료 계산기 모달 */}
      {showFeeCalcModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowFeeCalcModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 dark:bg-[#161F33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    🧮 FC 온라인 이적시장 수수료 & 역산 계산기
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    기본 수수료 40% 기준 · PC방(30%) + 탑클래스(20%) + 할인쿠폰 즉시 계산
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeeCalcModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
              {/* 1. 할인 혜택 및 단위 설정 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    1. 수수료 감면 혜택 선택
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      총 할인율{" "}
                      <strong className="text-emerald-600 dark:text-emerald-300 font-mono">
                        {Math.round(calcTotalDiscountRatio * 100)}%
                      </strong>
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                      실효 수수료율 {(calcEffectiveFeeRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcPcBang((v) => !v)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        calcPcBang
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                      }`}
                    >
                      PC방 접속 (-30%) {calcPcBang ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcTopClass((v) => !v)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        calcTopClass
                          ? "bg-cyan-600 text-white border-cyan-600"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                      }`}
                    >
                      탑클래스 (-20%) {calcTopClass ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {([0, 20, 30, 40] as const).map((cp) => (
                      <button
                        key={cp}
                        type="button"
                        onClick={() => setCalcCouponPct(cp)}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          calcCouponPct === cp
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        {cp === 0 ? "쿠폰 없음" : `${cp}% 쿠폰`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 입력 단위 선택 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    금액 입력 단위
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: "억 BP 단위", val: 100_000_000 },
                      { label: "조 BP 단위", val: 1_000_000_000_000 },
                      { label: "1 BP 직접 입력", val: 1 },
                    ].map((u) => (
                      <button
                        key={u.val}
                        type="button"
                        onClick={() => setCalcSellUnit(u.val)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          calcSellUnit === u.val
                            ? "bg-slate-800 text-white dark:bg-indigo-500/25 dark:text-indigo-200 border-slate-800 dark:border-indigo-400/50"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. 정방향 계산: 매도가 입력 -> 실수령액 산출 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      ① 매도가 입력 → 실수령액 계산
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      판매 등록 가격 (
                      {calcSellUnit === 1_000_000_000_000
                        ? "조 BP"
                        : calcSellUnit === 100_000_000
                        ? "억 BP"
                        : "BP"}
                      )
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={calcSellPriceInput}
                      onChange={(e) => setCalcSellPriceInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      환산 매도가: {formatBpKorean(calcGrossBp)}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        기본 수수료 (40%)
                      </span>
                      <span className="font-mono text-slate-500 line-through">
                        -{formatBpKorean(calcBaseFeeBp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        할인 절감액 (-{Math.round(calcTotalDiscountRatio * 100)}%)
                      </span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-300 font-semibold">
                        +{formatBpKorean(calcSavedFeeBp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        실제 차감 수수료 ({(calcEffectiveFeeRate * 100).toFixed(1)}%)
                      </span>
                      <span className="font-mono text-rose-600 dark:text-rose-300 font-bold">
                        -{formatBpKorean(calcActualFeeBp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">
                        최종 실수령액
                      </span>
                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-300">
                        {formatBpKorean(calcNetProceedsBp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. 역산 계산기: 목표 실수령액 -> 최소 매도가 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> ② 목표 수령액 역산 계산기
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      손에 쥐고 싶은 목표 금액 (
                      {calcSellUnit === 1_000_000_000_000
                        ? "조 BP"
                        : calcSellUnit === 100_000_000
                        ? "억 BP"
                        : "BP"}
                      )
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={calcTargetNetInput}
                      onChange={(e) => setCalcTargetNetInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      목표 실수령액: {formatBpKorean(calcDesiredNetBp)}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        적용 실효 수수료율
                      </span>
                      <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">
                        {(calcEffectiveFeeRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        예상 수수료 차감액
                      </span>
                      <span className="font-mono text-rose-600 dark:text-rose-300">
                        -{formatBpKorean(Math.max(0, calcRequiredListPriceBp - calcDesiredNetBp))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">
                        최소 등록해야 할 매도가
                      </span>
                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-300">
                        {formatBpKorean(calcRequiredListPriceBp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "home" && (
          <div className="space-y-8">
            {/* Hero Section (깔끔한 화이트/다크 대응 + 핵심 검색창 + 자세히 보기 토글) */}
            <div className="relative rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>실사용 픽률 · 인게임 체감 · 스쿼드 구매 진단</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    복잡한 수식 없이 한눈에 보는{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      진짜 체감 & 실사용 픽률
                    </span>
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    표기 OVR에 속지 마세요. <strong>서민·무소과금 유저들의 가격대별 +8~+11강 실사용 픽률</strong>과{" "}
                    <strong>공식경기 상위 랭커 핵심 메타 픽률</strong>만 직관적으로 요약해 드립니다.
                  </p>

                  {/* 자세히 보기 (접기/펴기) 버튼 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEngineGuide((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>ℹ️ 자세히 보기 (체감 지수 · 픽률 산출 원리)</span>
                      {showEngineGuide ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {showEngineGuide && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                        <p>
                          • <strong>인게임 체감 지수 (0~100점)</strong>: 방향 전환 핵심 스탯(민첩성·밸런스·반응속도·드리블)에 체형(고유/마름 보너스, 건장 페널티) 및 신장·몸무게 선회 반경을 반영한 실전 체감 점수입니다.
                        </p>
                        <p>
                          • <strong>실시간 가성비 상위 카드 (+8~+11강)</strong>: 단순 스탯/가격 비율이 아니라, 실제 서민·무소과금 구단주들이 가장 많이 채택하는 가격대 구간별 금카·초월고강 실사용 픽률 상위 카드입니다.
                        </p>
                        <p>
                          • <strong>주요 메타 선수 카드</strong>: 공식경기 상위 랭커들의 포지션별 실제 기용률(Ranker Pick Rate)이 가장 높은 주전 메타 카드입니다.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Search Form (초기값 빈 상태) */}
                  <form
                    onSubmit={handleQuickSearch}
                    className="flex flex-col sm:flex-row gap-2 max-w-xl pt-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        placeholder="선수 이름 검색 (예: 굴리트, 손흥민, 호나우두, 벨링엄)..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={quickSearching}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {quickSearching ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      즉시 검색
                    </button>
                  </form>

                  {/* Quick Search Results */}
                  {quickResults.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-2 max-w-xl">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>검색 결과 ({quickResults.length}건)</span>
                        <button
                          onClick={() => setQuickResults([])}
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                        >
                          닫기
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quickResults.map((c) => (
                          <div
                            key={c.spid}
                            onClick={() => handleInspectInPlayerLab(c.spid, c.name)}
                            className="p-2 rounded-lg bg-white dark:bg-slate-950/80 hover:bg-emerald-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <PlayerAvatar
                                spid={c.spid}
                                pid={c.pid}
                                thumbUrl={c.thumb_url}
                                name={c.name}
                                size={34}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <SeasonBadge
                                    seasonImg={c.season_img}
                                    seasonCode={c.season_code}
                                  />
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {c.name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {c.primary_position} · OVR {c.ovr} · 급여 {c.salary}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Quick Summary Cards */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setActiveTab("player")}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-emerald-50/60 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      선수 탐색
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      체감 · 뻥스탯 판독
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      💎 체감 괴물 vs ⚠️ 스탯 대비 둔중함 즉시 비교
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("squad")}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-cyan-50/60 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                      스쿼드 메이커
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      구매 시점 · 급여 진단
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      급여 {systemRules.salaryCap} 캡 & 11명 시세 저점 진단
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("market")}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      이적시장 · 메타 분석
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      BEP · 직강 기댓값
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      수수료 손익분기점 & 강화 데이 제작 효율
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("match")}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      매치 분석
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      구단주 전적 · 처방전
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      공식경기 패배 원인 진단 및 전술 개선안
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: 실시간 가성비 상위 카드 (서민/무소과금 실사용 픽률 기반 + 가격대 구간별 +8강~+11강 고강 추천) */}
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      실시간 가성비 상위 카드 (+8강 ~ +11강 실사용 픽률 TOP)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    단순 스탯/가격 비율이 아닌 <strong>서민·무소과금 구단주들의 실제 픽률(실사용률)</strong>로 검증된 가격대별 금카·초월고강 추천입니다.
                  </p>
                </div>

                {/* 가격대 구간 필터 버튼 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {PRICE_BRACKET_FILTERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBracketId(b.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                        selectedBracketId === b.id
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingDash ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredEfficiencyPicks.map((pick) => {
                    const cardKey = `${pick.spid}-${pick.grade}`;
                    const isExpanded = Boolean(expandedEffSpids[cardKey]);
                    const badgeStyle = getEnhanceBadgeStyle(pick.grade);
                    const feelScore = pick.feelMetrics?.feelScore ?? 84;
                    const trapLabel = pick.feelMetrics?.statTrapLabel ?? "💎 체감 괴물";

                    return (
                      <div
                        key={cardKey}
                        onClick={() => handleInspectInPlayerLab(pick.spid, pick.name)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#111827] hover:border-amber-400 dark:hover:border-amber-500/60 border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-3">
                          {/* 상단: 가격대 배지 + 서민 실사용 픽률 */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {pick.priceBracketLabel || "가성비 구간"}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              실사용 픽률 {pick.userPickRate ?? 24.5}%
                            </span>
                          </div>

                          {/* 선수 프로필 + 강화 배지 */}
                          <div className="flex items-center gap-3">
                            <PlayerAvatar
                              spid={pick.spid}
                              thumbUrl={pick.thumb_url}
                              name={pick.name}
                              size={50}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPositionToneClass(
                                    pick.target_position
                                  )}`}
                                >
                                  {pick.target_position}
                                </span>
                                <SeasonBadge
                                  seasonImg={pick.season_img}
                                  seasonCode={pick.season_code}
                                />
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] border ${badgeStyle.className}`}
                                >
                                  {badgeStyle.label}
                                </span>
                              </div>
                              <div className="text-base font-black text-slate-900 dark:text-white truncate mt-1">
                                {pick.name}
                              </div>
                            </div>
                          </div>

                          {/* 핵심 지표 3가지 (큼직하고 직관적인 요약) */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200/80 dark:border-slate-800">
                            <div>
                              <div className="text-[10px] text-slate-500">체감 지수</div>
                              <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {feelScore}점
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">실효 OVR</div>
                              <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                                {pick.effective_ovr}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">시세</div>
                              <div className="text-xs font-black font-mono text-amber-600 dark:text-amber-300 truncate">
                                {pick.bp_text}
                              </div>
                            </div>
                          </div>

                          {/* 한줄 핵심 요약 */}
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                            {pick.oneLineSummary ||
                              `+${pick.grade}강 금카 · 체감 ${feelScore}점 (${trapLabel})`}
                          </p>
                        </div>

                        {/* 하단: 자세히 보기 (접기/펴기) */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              {trapLabel} · 급여 {pick.salary}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => toggleEffDetail(cardKey, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <span>ℹ️ 자세히 보기</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span>포지션 핵심 점수 / 급여 효율</span>
                                <span className="font-mono font-bold">
                                  {pick.core_score}점 /{" "}
                                  {pick.feelMetrics?.positionSalaryEfficiency ?? 82}점
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>주발 / 약발</span>
                                <span className="font-mono">{pick.foot}</span>
                              </div>
                              {pick.feelMetrics?.playstyleTags && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {pick.feelMetrics.playstyleTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendToEfficiencyLab(
                                      pick.name,
                                      pick.target_position
                                    )
                                  }
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold text-center cursor-pointer"
                                >
                                  시즌/강화 효율 비교
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 2: 주요 메타 선수 카드 (공식경기 상위 랭커 실사용 픽률 기반) */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      주요 메타 선수 카드 (상위 랭커 픽률 TOP)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    공식경기 <strong>상위 랭커들의 실제 포지션별 픽률(Ranker Pick Rate)</strong> 점유율이 가장 높은 핵심 주전 카드입니다.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("player")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  선수 탐색 전체 보기 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingDash ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(dashboard?.topCards || []).map((card, idx) => {
                    const isExpanded = Boolean(expandedMetaSpids[card.spid]);
                    const rankerRate =
                      card.rankerPickRate ??
                      card.feelMetrics?.rankerPickRate ??
                      18.5;
                    const feelScore = card.feelMetrics?.feelScore ?? 88;
                    const trapLabel =
                      card.feelMetrics?.statTrapLabel ?? "💎 체감 괴물";
                    const metaTier = card.metaTier || "0티어 핵심";
                    const displayBp =
                      card.bp_5 > 0
                        ? formatBpKorean(card.bp_5)
                        : card.bp_1 > 0
                        ? formatBpKorean(card.bp_1)
                        : "시세 조회";

                    return (
                      <div
                        key={card.spid}
                        onClick={() => handleInspectInPlayerLab(card.spid, card.name)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#111827] hover:border-emerald-500 dark:hover:border-emerald-500/60 border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-3">
                          {/* 상단: 순위/티어 배지 + 상위 랭커 픽률 */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              #{idx + 1} {metaTier}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                              랭커 픽률 {rankerRate}%
                            </span>
                          </div>

                          {/* 선수 정보 */}
                          <div className="flex items-center gap-3">
                            <PlayerAvatar
                              spid={card.spid}
                              pid={card.pid}
                              thumbUrl={card.thumb_url}
                              name={card.name}
                              size={50}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPositionToneClass(
                                    card.primary_position
                                  )}`}
                                >
                                  {card.primary_position}
                                </span>
                                <SeasonBadge
                                  seasonImg={card.season_img}
                                  seasonCode={card.season_code}
                                />
                              </div>
                              <div className="text-base font-black text-slate-900 dark:text-white truncate mt-1">
                                {card.name}
                              </div>
                            </div>
                          </div>

                          {/* 핵심 요약 박스 */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200/80 dark:border-slate-800">
                            <div>
                              <div className="text-[10px] text-slate-500">체감 지수</div>
                              <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {feelScore}점
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">기본 OVR</div>
                              <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                                {card.ovr}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">기준가</div>
                              <div className="text-xs font-black font-mono text-amber-600 dark:text-amber-300 truncate">
                                {displayBp}
                              </div>
                            </div>
                          </div>

                          {/* 한줄 요약 */}
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                            {card.oneLineSummary ||
                              `${card.primary_position} 랭커 픽률 ${rankerRate}% · ${trapLabel}`}
                          </p>
                        </div>

                        {/* 자세히 보기 토글 */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              급여 {card.salary} · {card.foot}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => toggleMetaDetail(card.spid, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <span>ℹ️ 자세히 보기</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span>신장 / 체중 / 체형</span>
                                <span className="font-mono">
                                  {card.height}cm · {card.weight}kg · {card.body_type}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>체감 판정 / 급여 효율</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {trapLabel} (
                                  {card.feelMetrics?.positionSalaryEfficiency ?? 80}점)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddToSquadSlot(card, 5)}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  스쿼드 메이커 담기
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendToProfileLab(card.spid)}
                                  className="flex-1 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                                >
                                  유형 분석
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "player" && (
          <PlayerLabView
            rules={systemRules}
            initialSpid={targetPlayerSpid}
            initialQuery={targetPlayerQuery}
            bookmarkedSpids={bookmarkedCards.map((c) => c.spid)}
            onToggleBookmark={handleToggleBookmark}
            onSendToEfficiencyLab={handleSendToEfficiencyLab}
            onSendToProfileLab={handleSendToProfileLab}
            onAddToSquadSlot={handleAddToSquadSlot}
          />
        )}

        {activeTab === "efficiency" && (
          <CardEfficiencyLabView
            rules={systemRules}
            initialPlayerName={targetEfficiencyName}
            initialPosition={targetEfficiencyPos}
            positionWeightsMap={dashboard?.positionWeights || {}}
            onInspectInPlayerLab={(spid) => handleInspectInPlayerLab(spid)}
          />
        )}

        {activeTab === "profile" && (
          <PlayerProfileLabView
            rules={systemRules}
            initialSpid={targetProfileSpid}
            initialCompareSpid={targetProfileCompareSpid}
            onInspectInPlayerLab={(spid) => handleInspectInPlayerLab(spid)}
            onSendToEfficiencyLab={handleSendToEfficiencyLab}
          />
        )}

        {activeTab === "squad" && (
          <SquadLabView
            rules={systemRules}
            savedSquads={dashboard?.savedSquads || []}
            externalSlots={externalSquadSlots}
            onRefreshSquads={loadDashboard}
            onInspectPlayerInLab={(spid) => handleInspectInPlayerLab(spid)}
          />
        )}

        {activeTab === "market" && (
          <MarketLabView
            initialCards={dashboard?.topCards || []}
            onInspectPlayer={(spid) => handleInspectInPlayerLab(spid)}
          />
        )}

        {activeTab === "match" && (
          <MatchLabView
            nexonKeyConfigured={dashboard?.stats?.hasNexonApiKey ?? false}
            nexonKeyPreview={dashboard?.stats?.hasNexonApiKey ? "설정됨" : "미설정"}
            rules={systemRules}
            onRulesUpdated={(nextRules) => setSystemRules(nextRules)}
            onInspectPlayerInLab={(spid) => handleInspectInPlayerLab(spid)}
            onImportStartingXIToSquadLab={handleSendToSquadLab}
          />
        )}

        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-500" />
                저장된 스쿼드 및 관심 선수 보관함
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                스쿼드 메이커에서 저장한 커스텀 스쿼드와 선수 탐색에서 북마크한 관심 카드를 관리합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Saved Squads */}
              <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                    저장된 스쿼드 ({dashboard?.savedSquads?.length || 0})
                  </h3>
                  <button
                    onClick={() => setActiveTab("squad")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                  >
                    + 스쿼드 메이커 열기
                  </button>
                </div>
                {(dashboard?.savedSquads || []).length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    저장된 스쿼드가 없습니다. 스쿼드 메이커에서 나만의 스쿼드를 구성하고 저장해 보세요.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(dashboard?.savedSquads || []).map((sq) => (
                      <div
                        key={sq.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {sq.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              {sq.formation}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            예산 한도: {formatBpKorean(sq.budget_bp)} · 급여 캡:{" "}
                            {sq.salary_cap} · 케미 +{sq.team_color_bonus}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setExternalSquadSlots(sq.slots);
                              setActiveTab("squad");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            불러오기
                          </button>
                          <button
                            onClick={() => handleDeleteSavedSquad(sq.id)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bookmarked Players */}
              <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                    북마크한 관심 선수 ({bookmarkedCards.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab("player")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                  >
                    + 선수 탐색하기
                  </button>
                </div>

                {bookmarkedCards.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    북마크한 선수가 없습니다. 선수 탐색에서 북마크 아이콘을 눌러 추가해 보세요.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bookmarkedCards.map((c) => (
                      <div
                        key={c.spid}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div
                          onClick={() => handleInspectInPlayerLab(c.spid, c.name)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        >
                          <PlayerAvatar
                            spid={c.spid}
                            pid={c.pid}
                            thumbUrl={c.thumb_url}
                            name={c.name}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <SeasonBadge
                                seasonImg={c.season_img}
                                seasonCode={c.season_code}
                              />
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {c.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.primary_position} · OVR {c.ovr} · 급여 {c.salary}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleBookmark(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090D14] py-5 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              FClab
            </span>
            <span>·</span>
            <span>
              Data based on NEXON Open API & FC Online Datacenter
            </span>
          </div>
          <div>
            급여 {systemRules.salaryCap} 캡 · 최대 +{systemRules.maxEnhanceLevel}강 지원
          </div>
        </div>
      </footer>
    </div>
  );
}
