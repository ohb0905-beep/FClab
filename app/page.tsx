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
  Zap,
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

export default function FClabMainPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("home");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [systemRules, setSystemRules] = useState<SystemRules>(
    DEFAULT_SYSTEM_RULES
  );

  // 기본 테마: 세련된 다크블루(Dark Blue) 테마 (#0B1120 / #111827)
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("fclab_theme_v2");
      if (savedTheme === "light") {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      } else {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("fclab_theme_v2", nextTheme);
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
  const [targetMatchNickname, setTargetMatchNickname] = useState<string>("");

  // Bookmarked players (stored in localStorage)
  const [bookmarkedCards, setBookmarkedCards] = useState<PlayerCard[]>([]);

  // 대시보드 상단 통합 빠른 검색바 (선수 탐색 / 매치 분석 직행)
  const [quickSearchMode, setQuickSearchMode] = useState<"player" | "owner">(
    "player"
  );
  const [quickSearch, setQuickSearch] = useState("");
  const [quickResults, setQuickResults] = useState<PlayerCard[]>([]);
  const [quickSearching, setQuickSearching] = useState(false);
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
            seasonsCount: Math.max(
              1,
              Math.round((raw.meta_spid_count ?? 0) / 500)
            ),
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

  const handleJumpToPlayerSearch = (queryStr: string) => {
    const clean = queryStr.trim();
    if (!clean) return;
    setTargetPlayerQuery(clean);
    setTargetPlayerSpid(null);
    setActiveTab("player");
  };

  const handleJumpToOwnerMatchAnalysis = (nicknameStr: string) => {
    const clean = nicknameStr.trim();
    if (!clean) return;
    setTargetMatchNickname(clean);
    setActiveTab("match");
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
    const trimmed = quickSearch.trim();
    if (!trimmed) return;

    if (quickSearchMode === "owner") {
      handleJumpToOwnerMatchAnalysis(trimmed);
      return;
    }

    setQuickSearching(true);
    try {
      const res = await fetch(
        `/api/fclab/v1/players/search?q=${encodeURIComponent(trimmed)}&crawl=1`
      );
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        setQuickResults(data.cards.slice(0, 8));
      } else {
        handleJumpToPlayerSearch(trimmed);
      }
    } catch {
      handleJumpToPlayerSearch(trimmed);
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

  // 빠른 이동 허브 6개 핵심 카드
  const QUICK_HUB_CARDS: {
    id: LabTab;
    emojiTitle: string;
    subtitle: string;
    desc: string;
    highlights: string[];
    accentBorder: string;
    badgeClass: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "player",
      emojiTitle: "🔍 선수 탐색",
      subtitle: "상세 스탯 · 체감 판독 · 경쟁자 비교",
      desc: "상세 필터 기반 선수 검색 및 동일 팀컬러 상위 랭커 경쟁 카드 비교",
      highlights: ["34개 인게임 스탯 (+8강 기준)", "공식 특성 아이콘 & 팀컬러 로고", "동일 팀컬러 랭커 경쟁자 비교"],
      accentBorder: "hover:border-blue-500/70",
      badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <Search className="w-5 h-5 text-blue-400" />,
    },
    {
      id: "squad",
      emojiTitle: "⚽ 스쿼드 메이커",
      subtitle: "24개 포메이션 · 급여/예산 · 케미 진단",
      desc: "드래그 앤 드롭 전술 보드, 실시간 급여/예산 및 동일 팀컬러 대체재 진단",
      highlights: [`최신 급여 ${systemRules.salaryCap} 캡 & 평균 OVR`, "4백·3백·5백 24종 포메이션", "신규 특성 배지 & 시세 저점 진단"],
      accentBorder: "hover:border-cyan-400/70",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: "efficiency",
      emojiTitle: "⚡ 카드 효율 분석",
      subtitle: "핵심 스탯 평균 vs 표기 OVR",
      desc: "포지션별 핵심 스탯 대비 OVR 진짜 가성비 카드 발굴",
      highlights: ["(핵심 스탯 평균 ÷ OVR) × 100", "거품 스탯 제거 실전 압축도", "+8강 스윗스팟 효율 곡선"],
      accentBorder: "hover:border-blue-500/70",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      icon: <Zap className="w-5 h-5 text-blue-400" />,
    },
    {
      id: "profile",
      emojiTitle: "🧬 선수 유형 분석",
      subtitle: "체감 3단계 · 미드필더 4분류 · 대체재",
      desc: "체감 3단계 판독, 미드필더 4분류 및 동일 팀컬러 대체재 추천",
      highlights: ["좋은/보통/무거운 체감 엄격 필터", "공격형·중앙·수비형·육각형 MF", "동일 팀컬러 가성비 대체재 TOP 3"],
      accentBorder: "hover:border-cyan-400/70",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: "market",
      emojiTitle: "📈 이적시장 · 메타 분석",
      subtitle: "시세 지수 · 시즌 히트맵 · 신규 특성 17종",
      desc: "전체 시장 시세 그래프, 실사용 시즌 히트맵, 신규 특성 4분류 & 티어표",
      highlights: ["신규 특성 17종 개별 분리 비교", "공격·연계·수비·GK 4분류 필터", "시즌 로고 시세 등락 히트맵"],
      accentBorder: "hover:border-blue-500/70",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
    },
    {
      id: "match",
      emojiTitle: "🏆 매치 분석",
      subtitle: "공식경기 전적 · 패배 원인 · 스쿼드 연동",
      desc: "구단주 공식경기 전적 및 메타 분석",
      highlights: ["최근 공식경기 승률·슈팅·패스 분석", "패배 원인 진단 및 전술 처방", "주전 11명 스쿼드 메이커 즉시 연동"],
      accentBorder: "hover:border-cyan-400/70",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: <Swords className="w-5 h-5 text-cyan-400" />,
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-blue-700 dark:selection:text-cyan-200 transition-colors">
      {/* Top Global Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-500 dark:group-hover:text-cyan-400 transition-colors">
                  FClab
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/30">
                  FC 온라인 데이터 분석실
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                인게임 체감 · 포지션 코어 효율 · 스쿼드 메이커 · 이적시장 메타 플랫폼
              </p>
            </div>
          </div>

          {/* Right Action Controls: 수수료 계산기 + 다크블루/라이트 테마 토글 + 스쿼드 메이커 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFeeCalcModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B]/80 dark:hover:bg-[#1E293B] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
              <span>🧮 수수료 계산기</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title="다크블루 / 화이트 테마 전환"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B]/80 dark:hover:bg-[#1E293B] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>🌙 다크블루</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>☀️ 화이트</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab("squad")}
              className="hidden sm:flex px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> 스쿼드 메이커
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-[#111827]/90">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-white dark:bg-blue-500/20 text-blue-700 dark:text-cyan-300 border border-blue-500/40 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-[#1E293B]/60 border border-transparent"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-700 dark:text-cyan-300">
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
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 dark:bg-[#1E293B]/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
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
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    1. 수수료 감면 혜택 선택
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      총 할인율{" "}
                      <strong className="text-blue-600 dark:text-cyan-400 font-mono">
                        {Math.round(calcTotalDiscountRatio * 100)}%
                      </strong>
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/30 font-mono">
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
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                      }`}
                    >
                      PC방 접속 (-30%) {calcPcBang ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcTopClass((v) => !v)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        calcTopClass
                          ? "bg-cyan-600 text-white border-cyan-500"
                          : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
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
                            ? "bg-blue-500 text-white border-blue-400"
                            : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        {cp === 0 ? "쿠폰 없음" : `${cp}% 쿠폰`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 입력 단위 선택 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
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
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. 정방향 계산 & 3. 역산 계산기 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-black text-blue-600 dark:text-cyan-400 block">
                    ① 매도가 입력 → 실수령액 계산
                  </span>

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
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      환산 매도가: {formatBpKorean(calcGrossBp)}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
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
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                        +{formatBpKorean(calcSavedFeeBp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        실제 차감 수수료 ({(calcEffectiveFeeRate * 100).toFixed(1)}%)
                      </span>
                      <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">
                        -{formatBpKorean(calcActualFeeBp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">
                        최종 실수령액
                      </span>
                      <span className="text-base font-black font-mono text-blue-600 dark:text-cyan-400">
                        {formatBpKorean(calcNetProceedsBp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <ArrowLeftRight className="w-3.5 h-3.5" /> ② 목표 수령액 역산 계산기
                  </span>

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
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      목표 실수령액: {formatBpKorean(calcDesiredNetBp)}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        적용 실효 수수료율
                      </span>
                      <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold">
                        {(calcEffectiveFeeRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        예상 수수료 차감액
                      </span>
                      <span className="font-mono text-rose-500 dark:text-rose-400">
                        -{formatBpKorean(Math.max(0, calcRequiredListPriceBp - calcDesiredNetBp))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">
                        최소 등록해야 할 매도가
                      </span>
                      <span className="text-base font-black font-mono text-blue-600 dark:text-cyan-400">
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
          <div className="space-y-6">
            {/* 1. 상단 통합 빠른 검색 허브 (선수 탐색 / 구단주 매치 분석 즉시 연동) */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-cyan-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
                    <span>FC 온라인 통합 데이터 분석 허브</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEngineGuide((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B]/80 dark:hover:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
                    <span>ⓘ 분석 기준 안내</span>
                    {showEngineGuide ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    선수 체감 · 스쿼드 메이커 ·{" "}
                    <span className="text-blue-600 dark:text-cyan-400">
                      이적시장 & 매치 분석
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    선수 이름을 검색하여 +8강 실전 체감·특성·경쟁 카드를 조회하거나, 구단주 닉네임으로 공식경기 전적을 즉시 분석하세요.
                  </p>
                </div>

                {showEngineGuide && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                    <p>
                      • <strong className="text-slate-900 dark:text-slate-200">체감 3단계 엄격 판독:</strong> 건장 체형·신장 186cm↑·체중 80kg↑ 선수는 선회 반경 기준에 따라 최대 <code className="text-cyan-400">보통 체감</code>까지만 부여하며, 8강 체감 5대 평균 128↑ & 민·밸 124↑ 충족 시에만 <code className="text-emerald-400">좋은 체감</code>을 부여합니다.
                    </p>
                    <p>
                      • <strong className="text-slate-900 dark:text-slate-200">공식 특성 & 실제 팀컬러 정화:</strong> 추론/가상 특성을 배제하고 FC 온라인 공식 일반 특성 및 신규 특성 17종, 실제 국가/클럽 엠블럼만 정확히 매핑합니다.
                    </p>
                  </div>
                )}

                {/* 검색 모드 탭 + 통합 검색창 */}
                <div className="space-y-3">
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSearchMode("player");
                        setQuickResults([]);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        quickSearchMode === "player"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>선수 빠른 검색 (선수 탐색)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSearchMode("owner");
                        setQuickResults([]);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        quickSearchMode === "owner"
                          ? "bg-cyan-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>구단주 닉네임 검색 (매치 분석)</span>
                    </button>
                  </div>

                  <form
                    onSubmit={handleQuickSearch}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        placeholder={
                          quickSearchMode === "player"
                            ? "선수 이름 입력 (예: 손흥민, 호나우두, 굴리트, 로드리, 벨링엄)..."
                            : "FC 온라인 구단주 닉네임 입력 (공식경기 전적 및 스쿼드 분석 직행)..."
                        }
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={quickSearching}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                    >
                      {quickSearching ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>
                        {quickSearchMode === "player" ? "선수 검색" : "매치 분석 이동"}
                      </span>
                    </button>
                    {quickSearchMode === "player" && quickSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => handleJumpToPlayerSearch(quickSearch)}
                        className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <span>선수 탐색 직행</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>

                  {/* 빠른 추천 검색어 태그 */}
                  {quickSearchMode === "player" && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-slate-400 mr-1">
                        인기 검색:
                      </span>
                      {[
                        "손흥민",
                        "호나우두",
                        "굴리트",
                        "로드리",
                        "벨링엄",
                        "박지성",
                        "김민재",
                        "차범근",
                      ].map((kw) => (
                        <button
                          key={kw}
                          type="button"
                          onClick={() => handleJumpToPlayerSearch(kw)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-[#1E293B]/70 dark:hover:bg-blue-500/20 border border-slate-200 dark:border-slate-700/80 dark:hover:border-blue-500/40 text-xs font-semibold text-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 선수 빠른 검색 드롭다운 결과 */}
                  {quickResults.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span>
                          검색 결과 ({quickResults.length}건) — 클릭 시 선수 탐색 상세 이동
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleJumpToPlayerSearch(quickSearch)}
                            className="text-blue-500 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                          >
                            전체 결과 보기 →
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickResults([])}
                            className="text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quickResults.map((c) => (
                          <div
                            key={c.spid}
                            onClick={() => handleInspectInPlayerLab(c.spid, c.name)}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#111827] hover:bg-blue-50/50 dark:hover:bg-[#1E293B]/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerAvatar
                                spid={c.spid}
                                pid={c.pid}
                                thumbUrl={c.thumb_url}
                                name={c.name}
                                size={36}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <SeasonBadge
                                    seasonImg={c.season_img}
                                    seasonCode={c.season_code}
                                  />
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {c.name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {c.primary_position} · OVR {c.ovr} · 급여 {c.salary}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. 6대 핵심 분석 도구 빠른 이동 허브 (Quick Navigation Hub) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    핵심 분석 도구 바로가기
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    원하는 분석 모듈을 선택하면 해당 워크스페이스로 즉시 이동합니다.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                  급여 {systemRules.salaryCap} 캡 · 기본 +8강(적응도 0) 기준
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {QUICK_HUB_CARDS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group rounded-2xl bg-white dark:bg-[#111827] hover:bg-slate-50/80 dark:hover:bg-[#1E293B]/80 border border-slate-200 dark:border-slate-800 ${item.accentBorder} p-5 flex flex-col justify-between gap-4 transition-all cursor-pointer shadow-xs`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.badgeClass}`}
                        >
                          {item.subtitle}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {item.icon}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                          {item.emojiTitle}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                        {item.highlights.map((hl) => (
                          <div
                            key={hl}
                            className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"
                          >
                            <span className="w-1 h-1 rounded-full bg-blue-500 dark:bg-cyan-400 shrink-0" />
                            <span className="truncate">{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-blue-600 dark:text-cyan-400">
                      <span>분석실 열기</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
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
            initialNickname={targetMatchNickname}
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
                <Bookmark className="w-5 h-5 text-cyan-400" />
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
                    className="text-xs text-blue-600 dark:text-cyan-400 font-semibold cursor-pointer"
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
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {sq.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-cyan-300 text-[10px] font-bold">
                              {sq.formation}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
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
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                          >
                            불러오기
                          </button>
                          <button
                            onClick={() => handleDeleteSavedSquad(sq.id)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
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
                    className="text-xs text-blue-600 dark:text-cyan-400 font-semibold cursor-pointer"
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
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
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
                            <div className="text-[11px] text-slate-400">
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
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] py-5 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">
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
