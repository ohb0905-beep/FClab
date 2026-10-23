"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  FlaskConical,
  Users,
  TrendingUp,
  Compass,
  Activity,
  Bookmark,
  Layers,
  Home,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Trash2,
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
  getPositionToneClass,
} from "@/lib/fclab-types";
import { PlayerAvatar, SeasonBadge } from "@/components/fclab/VisualCharts";
import PlayerLabView from "@/components/fclab/PlayerLabView";
import SquadLabView from "@/components/fclab/SquadLabView";
import CardEfficiencyLabView from "@/components/fclab/CardEfficiencyLabView";
import PlayerProfileLabView from "@/components/fclab/PlayerProfileLabView";
import MatchLabView from "@/components/fclab/MatchLabView";

interface DashboardState {
  metaCount: number;
  cachedPlayerCount: number;
  popularCards: PlayerCard[];
  topEfficiencyCards: CardEfficiencyResult[];
  savedSquads: SavedSquad[];
  nexonKeyConfigured: boolean;
  nexonKeyPreview: string;
  positionWeights: Record<string, Record<string, number>>;
}

const NAV_ITEMS: {
  id: LabTab;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "home", label: "통합 대시보드", sub: "Overview", icon: Home },
  { id: "player", label: "선수 연구소", sub: "Player Lab", icon: FlaskConical },
  { id: "squad", label: "스쿼드 빌더", sub: "Squad Lab", icon: Users },
  {
    id: "efficiency",
    label: "카드 효율 분석",
    sub: "Efficiency Lab",
    icon: TrendingUp,
  },
  {
    id: "profile",
    label: "선수 유형 분석",
    sub: "Profile Lab",
    icon: Compass,
  },
  { id: "match", label: "전적 분석실", sub: "Match Lab", icon: Activity },
  { id: "saved", label: "저장 보관함", sub: "Saved Items", icon: Bookmark },
  {
    id: "architecture",
    label: "시스템 명세",
    sub: "Architecture",
    icon: Layers,
  },
];

export default function FClabAppPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("home");
  const [quickSearch, setQuickSearch] = useState("");

  // Cross-Lab navigation state
  const [targetPlayerSpid, setTargetPlayerSpid] = useState<number | null>(
    280200104
  );
  const [targetPlayerQuery, setTargetPlayerQuery] = useState<string>("손흥민");
  const [targetEfficiencyName, setTargetEfficiencyName] =
    useState<string>("손흥민");
  const [targetEfficiencyPos, setTargetEfficiencyPos] = useState<string>("LW");
  const [targetProfileSpid, setTargetProfileSpid] = useState<number | null>(
    280200104
  );
  const [targetProfileCompareSpid, setTargetProfileCompareSpid] = useState<
    number | null
  >(null);
  const [importedSquadSlots, setImportedSquadSlots] = useState<
    SquadSlot[] | null
  >(null);

  // Bookmarked players stored in localStorage
  const [bookmarkedCards, setBookmarkedCards] = useState<PlayerCard[]>([]);

  // Dynamic Game Rules (Self-Updating Architecture: Crawler + Match Heuristics)
  const [rules, setRules] = useState<SystemRules>(DEFAULT_SYSTEM_RULES);
  const [syncingRules, setSyncingRules] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Dashboard payload from Node.js server engine
  const [dashboard, setDashboard] = useState<DashboardState>({
    metaCount: 0,
    cachedPlayerCount: 0,
    popularCards: [],
    topEfficiencyCards: [],
    savedSquads: [],
    nexonKeyConfigured: false,
    nexonKeyPreview: "미설정",
    positionWeights: {},
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/fclab/rules");
      const json = await res.json();
      if (json.ok && json.rules) {
        setRules(json.rules);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  const handleSyncRulesFromWeb = async () => {
    setSyncingRules(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/fclab/rules/sync", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.rules) {
        setRules(json.rules);
        setSyncMessage(
          `동기화 완료 (급여 ${json.rules.salaryCap} · 최대 +${json.rules.maxEnhanceLevel}강)`
        );
      }
    } catch {
      setSyncMessage("동기화 중 일시적 오류가 발생했습니다.");
    } finally {
      setSyncingRules(false);
    }
  };

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/fclab/v1/dashboard");
      const json = await res.json();
      if (json.ok) {
        setDashboard({
          metaCount: json.meta_spid_count || 0,
          cachedPlayerCount: json.cached_player_count || 0,
          popularCards: json.popular_cards || [],
          topEfficiencyCards: json.top_efficiency_cards || [],
          savedSquads: json.saved_squads || [],
          nexonKeyConfigured: Boolean(json.nexon_key_configured),
          nexonKeyPreview: json.nexon_key_preview || "미설정",
          positionWeights: json.position_weights || {},
        });
        if (json.system_rules) {
          setRules(json.system_rules);
        }
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchDashboard();
    try {
      const saved = localStorage.getItem("fclab_bookmarks_v1");
      if (saved) {
        setBookmarkedCards(JSON.parse(saved));
      }
    } catch {
      // ignore storage error
    }
  }, [fetchRules, fetchDashboard]);

  const handleToggleBookmark = (card: PlayerCard) => {
    setBookmarkedCards((prev) => {
      const exists = prev.some((c) => c.spid === card.spid);
      const next = exists
        ? prev.filter((c) => c.spid !== card.spid)
        : [card, ...prev];
      try {
        localStorage.setItem("fclab_bookmarks_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Cross-Lab routing helpers
  const openPlayerInPlayerLab = (spid: number) => {
    setTargetPlayerSpid(spid);
    setActiveTab("player");
  };

  const openPlayerInEfficiencyLab = (name: string, position: string) => {
    setTargetEfficiencyName(name);
    setTargetEfficiencyPos(position || "ST");
    setActiveTab("efficiency");
  };

  const openPlayerInProfileLab = (spid: number, compareSpid?: number) => {
    setTargetProfileSpid(spid);
    setTargetProfileCompareSpid(compareSpid || null);
    setActiveTab("profile");
  };

  const handleAddCardToSquad = (card: PlayerCard, grade: number) => {
    const currentSquad = dashboard.savedSquads[0];
    const baseSlots = currentSquad?.slots ? [...currentSquad.slots] : [];
    const matchingIdx = baseSlots.findIndex(
      (s) => s.slot_position === card.primary_position
    );
    if (matchingIdx >= 0) {
      baseSlots[matchingIdx] = {
        ...baseSlots[matchingIdx],
        spid: card.spid,
        grade,
      };
    } else if (baseSlots.length > 0) {
      baseSlots[0] = {
        ...baseSlots[0],
        spid: card.spid,
        grade,
      };
    }
    setImportedSquadSlots(baseSlots);
    setActiveTab("squad");
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setTargetPlayerQuery(quickSearch.trim());
    setTargetPlayerSpid(null);
    setActiveTab("player");
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Bar Contract (3 Distinct Zones: Brand | Quick Search | Server Connection Badge) */}
      <header className="h-16 bg-[#0E1422]/95 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Identity */}
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-3 text-left shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-100">
                FClab
              </span>
              <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                v1.0 MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              FC 온라인 통합 데이터 분석 &amp; 스쿼드 최적화 플랫폼
            </p>
          </div>
        </button>

        {/* Zone 2: Quick Player Search */}
        <form
          onSubmit={handleQuickSearchSubmit}
          className="flex-1 max-w-md hidden md:flex items-center relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="실시간 선수 검색 (예: 손흥민, 호날두, 굴리트, 벨링엄)..."
            className="w-full bg-[#0B0F17] border border-slate-800 focus:border-emerald-500 rounded-lg pl-9 pr-16 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-emerald-300 whitespace-nowrap shrink-0"
          >
            검색
          </button>
        </form>

        {/* Zone 3: Server Engine & Self-Updating Rules Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums">
            <span className="text-slate-400">인게임 룰:</span>
            <span className="text-emerald-400 font-semibold">
              급여 {rules.salaryCap} FP
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-amber-300 font-semibold">
              최대 +{rules.maxEnhanceLevel}강
            </span>
            <button
              type="button"
              onClick={handleSyncRulesFromWeb}
              disabled={syncingRules}
              title="공식 스쿼드메이커/데이터센터 기준 최신 급여 상한선 및 최대 강화 단계 동기화"
              className="ml-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3 h-3 ${syncingRules ? "animate-spin" : ""}`}
              />
              최신 메타 동기화
            </button>
          </div>

          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">메타:</span>
            <span className="text-slate-200 font-semibold">
              {dashboard.metaCount > 0
                ? `${dashboard.metaCount.toLocaleString()}명`
                : "동기화 중"}
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">캐시:</span>
            <span className="text-emerald-400 font-semibold">
              {dashboard.cachedPlayerCount}장
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("match")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboard.nexonKeyConfigured
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/15 border-amber-500/40 text-amber-300"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {dashboard.nexonKeyConfigured
              ? "Nexon Open API 연결됨"
              : "Nexon API 키 미설정"}
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Navigation Rail */}
        <aside className="lg:w-60 bg-[#0E1422] border-b lg:border-b-0 lg:border-r border-slate-800/80 shrink-0">
          <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg text-left transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 hidden lg:block">
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  {item.id === "saved" &&
                    bookmarkedCards.length + dashboard.savedSquads.length >
                      0 && (
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {bookmarkedCards.length + dashboard.savedSquads.length}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          {/* Data Source Transparency Box (Desktop Sidebar Footer) */}
          <div className="hidden lg:block p-3.5 m-3 rounded-xl bg-[#0B0F17] border border-slate-800/90 space-y-2.5 text-xs">
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              DATA PIPELINE STATUS
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">공식 정적 메타 API</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 정상
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">데이터센터 실시간 크롤러</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 정상
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">개인 매치 Open API</span>
                <span
                  className={`font-mono text-[11px] flex items-center gap-1 ${
                    dashboard.nexonKeyConfigured
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {dashboard.nexonKeyConfigured ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> 연결됨
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> 키 필요
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Active View Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Hero & Server Connection Transparency Banner */}
              <div className="bg-gradient-to-br from-[#131B2E] via-[#111827] to-[#0E1726] border border-slate-800/90 rounded-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                      FC ONLINE INTEGRATED ANALYTICS PLATFORM
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
                      FClab — 실시간 선수 데이터·시세·스쿼드·전적 통합 연구소
                    </h1>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      단순 선수 검색을 넘어, 서버 측 Node.js 엔진이 넥슨 공식 정적 메타데이터와 FC 온라인 공식 데이터센터 실시간 크롤링(34개 세부 스탯 및 365일 시세)을 결합하여 가격 대비 실효 성능과 전술 적합도를 정밀 분석합니다.
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("player")}
                        className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        선수 연구소 시작하기
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("squad")}
                        className="px-4 py-2.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        {rules.salaryCap}급여 스쿼드 빌더
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("efficiency")}
                        className="px-4 py-2.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        시즌/강화 가성비 비교
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncRulesFromWeb}
                        disabled={syncingRules}
                        className="px-3.5 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            syncingRules ? "animate-spin" : ""
                          }`}
                        />
                        최신 메타 동기화 (급여 {rules.salaryCap} · +{rules.maxEnhanceLevel}강)
                      </button>
                    </div>
                    {syncMessage && (
                      <p className="text-xs font-mono text-emerald-400 pt-1">
                        {syncMessage}
                      </p>
                    )}
                  </div>

                  {/* Server Architecture & Connection Status Card */}
                  <div className="lg:col-span-5 bg-[#0B0F17]/90 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                        SELF-UPDATING ENGINE &amp; RULES STATUS
                      </span>
                      <button
                        type="button"
                        onClick={fetchDashboard}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            loadingDashboard ? "animate-spin" : ""
                          }`}
                        />
                        새로고침
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2 p-2 rounded bg-[#131B2E]/70">
                        <div>
                          <div className="font-semibold text-slate-200">
                            1. 무인 자율 동기화 인게임 규칙 (SystemRules)
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            웹 크롤러 + 공식경기 선발 11명 매치 휴리스틱스 자동 갱신
                          </div>
                        </div>
                        <span className="font-mono text-emerald-400 font-semibold whitespace-nowrap">
                          {rules.salaryCap} FP / +{rules.maxEnhanceLevel}강 ({rules.syncSource})
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2 p-2 rounded bg-[#131B2E]/70">
                        <div>
                          <div className="font-semibold text-slate-200">
                            2. FC 온라인 데이터센터 실시간 크롤러
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            34개 세부 능력치 + 미등록 선수 급여(Salary) 온디맨드 수집
                          </div>
                        </div>
                        <span className="font-mono text-emerald-400 font-semibold whitespace-nowrap">
                          활성 ({dashboard.cachedPlayerCount}장 캐시)
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2 p-2 rounded bg-[#131B2E]/70">
                        <div>
                          <div className="font-semibold text-slate-200">
                            3. 구단주 전적 조회 (NEXON_OPEN_API_KEY)
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            서버 환경변수 비밀 설정 (프런트엔드 키 노출 차단)
                          </div>
                        </div>
                        <span
                          className={`font-mono font-semibold whitespace-nowrap ${
                            dashboard.nexonKeyConfigured
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {dashboard.nexonKeyConfigured
                            ? `연결됨 (${dashboard.nexonKeyPreview})`
                            : "연결 설정 필요"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Core Labs Shortcut Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {
                    id: "player" as LabTab,
                    title: "1. Player Lab",
                    sub: "선수 연구소",
                    desc: `실시간 34개 세부 스탯, 강화(+1~+${rules.maxEnhanceLevel})·팀컬러 시뮬레이터, 30일 시세 추이`,
                    metric: `${dashboard.cachedPlayerCount}장 실시간 분석 준비`,
                  },
                  {
                    id: "squad" as LabTab,
                    title: "2. Squad Lab",
                    sub: "스쿼드 빌더",
                    desc: `${rules.salaryCap} 급여 캡 검증, 총 BP 예산 관리, 포지션 약점 진단 및 대체 선수 추천`,
                    metric: `${dashboard.savedSquads.length}개 저장 스쿼드`,
                  },
                  {
                    id: "efficiency" as LabTab,
                    title: "3. Efficiency Lab",
                    sub: "카드 효율 분석",
                    desc: "포지션 가중치 기반 실성능(Core Score) 및 1억 BP당 가성비 지수 산출",
                    metric: "커스텀 가중치 지원",
                  },
                  {
                    id: "profile" as LabTab,
                    title: "4. Profile Lab",
                    sub: "선수 유형 분석",
                    desc: "17개 전술 아키타입 다중 적합도(%) 산출 및 라이벌 카드 스타일 대조",
                    metric: "17종 전술 롤 모델",
                  },
                  {
                    id: "match" as LabTab,
                    title: "5. Match Lab",
                    sub: "전적 분석실",
                    desc: "넥슨 Open API 실경기 텔레메트리 수집 및 매치 휴리스틱스 룰 자동 역추적",
                    metric: dashboard.nexonKeyConfigured
                      ? "실시간 조회 가능"
                      : "서버 API 키 등록 필요",
                  },
                ].map((lab) => (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => setActiveTab(lab.id)}
                    className="bg-[#131B2E] hover:bg-[#18223A] border border-slate-800/90 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400">
                          {lab.title}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <h3 className="text-base font-bold text-slate-100 mt-1">
                        {lab.sub}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {lab.desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
                      {lab.metric}
                    </div>
                  </button>
                ))}
              </div>

              {/* Popular Crawled Cards & Top Efficiency Picks */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Popular Meta Cards */}
                <div className="lg:col-span-7 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-emerald-400">
                        LIVE DATACENTER CARDS
                      </span>
                      <h3 className="text-base font-bold text-slate-100">
                        실시간 크롤링 주요 메타 선수 카드
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("player")}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      전체 선수 검색
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dashboard.popularCards.slice(0, 6).map((card) => (
                      <div
                        key={card.spid}
                        className="bg-[#0B0F17] border border-slate-800/80 hover:border-slate-700 rounded-lg p-3 flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => openPlayerInPlayerLab(card.spid)}
                          className="flex items-center gap-3 text-left min-w-0"
                        >
                          <PlayerAvatar
                            spid={card.spid}
                            pid={card.pid}
                            name={card.name}
                            thumbUrl={card.thumb_url}
                            size={44}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <SeasonBadge
                                seasonCode={card.season_code}
                                seasonImg={card.season_img}
                              />
                              <span className="text-sm font-bold text-slate-100 truncate">
                                {card.name}
                              </span>
                            </div>
                            <div className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                              <span
                                className={getPositionToneClass(
                                  card.primary_position
                                )}
                              >
                                {card.primary_position}
                              </span>{" "}
                              · OVR {card.ovr} · 급여 {card.salary}
                            </div>
                          </div>
                        </button>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-amber-300 tabular-nums">
                            {formatBpKorean(card.bp_1)}
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                openPlayerInEfficiencyLab(
                                  card.name,
                                  card.primary_position
                                )
                              }
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
                            >
                              효율
                            </button>
                            <button
                              type="button"
                              onClick={() => openPlayerInProfileLab(card.spid)}
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 whitespace-nowrap"
                            >
                              유형
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Efficiency Cards */}
                <div className="lg:col-span-5 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-sky-400">
                        CARD EFFICIENCY TOP PICKS (+5강 기준)
                      </span>
                      <h3 className="text-base font-bold text-slate-100">
                        실성능 가성비 상위 카드
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("efficiency")}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      가중치 설정
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {dashboard.topEfficiencyCards.slice(0, 5).map((eff) => (
                      <button
                        key={eff.spid}
                        type="button"
                        onClick={() => openPlayerInPlayerLab(eff.spid)}
                        className="w-full bg-[#0B0F17] border border-slate-800/80 hover:border-sky-500/40 rounded-lg p-3 flex items-center justify-between text-left transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar
                            spid={eff.spid}
                            name={eff.name}
                            thumbUrl={eff.thumb_url}
                            size={36}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <SeasonBadge
                                seasonCode={eff.season_code}
                                seasonImg={eff.season_img}
                              />
                              <span className="text-xs font-bold text-slate-100">
                                {eff.name}
                              </span>
                              <span className="text-[11px] font-mono text-emerald-400">
                                +{eff.grade}강
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {eff.primary_position} · 실성능 {eff.core_score} ·{" "}
                              {eff.bp_text}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Tier {eff.tier} · {eff.efficiency_index}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "player" && (
            <PlayerLabView
              initialSpid={targetPlayerSpid}
              initialQuery={targetPlayerQuery}
              rules={rules}
              bookmarkedSpids={bookmarkedCards.map((c) => c.spid)}
              onToggleBookmark={handleToggleBookmark}
              onSendToEfficiencyLab={openPlayerInEfficiencyLab}
              onSendToProfileLab={openPlayerInProfileLab}
              onAddToSquadSlot={handleAddCardToSquad}
            />
          )}

          {activeTab === "squad" && (
            <SquadLabView
              savedSquads={dashboard.savedSquads}
              externalSlots={importedSquadSlots}
              rules={rules}
              onRefreshSquads={fetchDashboard}
              onInspectPlayerInLab={openPlayerInPlayerLab}
            />
          )}

          {activeTab === "efficiency" && (
            <CardEfficiencyLabView
              initialPlayerName={targetEfficiencyName}
              initialPosition={targetEfficiencyPos}
              positionWeightsMap={dashboard.positionWeights}
              rules={rules}
              onInspectInPlayerLab={openPlayerInPlayerLab}
            />
          )}

          {activeTab === "profile" && (
            <PlayerProfileLabView
              initialSpid={targetProfileSpid}
              initialCompareSpid={targetProfileCompareSpid}
              rules={rules}
              onInspectInPlayerLab={openPlayerInPlayerLab}
              onSendToEfficiencyLab={openPlayerInEfficiencyLab}
            />
          )}

          {activeTab === "match" && (
            <MatchLabView
              nexonKeyConfigured={dashboard.nexonKeyConfigured}
              nexonKeyPreview={dashboard.nexonKeyPreview}
              rules={rules}
              onRulesUpdated={setRules}
              onImportStartingXIToSquadLab={(slots) => {
                setImportedSquadSlots(slots);
                setActiveTab("squad");
              }}
              onInspectPlayerInLab={openPlayerInPlayerLab}
            />
          )}

          {activeTab === "saved" && (
            <div className="space-y-6">
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
                <h2 className="text-xl font-bold text-slate-100">
                  저장된 스쿼드 및 관심 선수 보관함
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  스쿼드 빌더에서 저장한 스쿼드와 선수 연구소에서 북마크한 선수 카드를 한곳에서 관리하고 즉시 각 연구소로 불러올 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Saved Squads */}
                <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-100">
                      저장된 스쿼드 ({dashboard.savedSquads.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("squad")}
                      className="text-xs text-emerald-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      스쿼드 빌더 열기
                    </button>
                  </div>

                  <div className="space-y-3">
                    {dashboard.savedSquads.map((sq) => (
                      <div
                        key={sq.id}
                        className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                              {sq.formation}
                            </span>
                            <h4 className="text-sm font-bold text-slate-100">
                              {sq.name}
                            </h4>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">
                            예산 {formatBpKorean(sq.budget_bp)} · 급여 상한{" "}
                            {sq.salary_cap} · 배치 선수 {sq.slots.length}명
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImportedSquadSlots(sq.slots);
                            setActiveTab("squad");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
                        >
                          불러오기
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bookmarked Players */}
                <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-base font-bold text-slate-100">
                    관심 선수 북마크 ({bookmarkedCards.length})
                  </h3>

                  {bookmarkedCards.length === 0 ? (
                    <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-8 text-center text-xs text-slate-400">
                      선수 연구소(Player Lab)에서 북마크 아이콘을 눌러 관심 선수를 추가해 보세요.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {bookmarkedCards.map((card) => (
                        <div
                          key={card.spid}
                          className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => openPlayerInPlayerLab(card.spid)}
                            className="flex items-center gap-3 text-left"
                          >
                            <PlayerAvatar
                              spid={card.spid}
                              pid={card.pid}
                              name={card.name}
                              thumbUrl={card.thumb_url}
                              size={40}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <SeasonBadge
                                  seasonCode={card.season_code}
                                  seasonImg={card.season_img}
                                />
                                <span className="text-sm font-bold text-slate-100">
                                  {card.name}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-slate-400 mt-0.5">
                                {card.primary_position} · OVR {card.ovr} ·{" "}
                                {formatBpKorean(card.bp_1)}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPlayerInProfileLab(card.spid)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 whitespace-nowrap shrink-0"
                            >
                              유형 분석
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleBookmark(card)}
                              className="p-1.5 rounded bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                              title="북마크 해제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-6 space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  SYSTEM ARCHITECTURE &amp; TRANSPARENCY SPECIFICATION
                </span>
                <h2 className="text-xl font-bold text-slate-100">
                  FClab 서버 측 데이터 파이프라인 및 단계별 구현 명세
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  별도의 외부 Python 서버 URL을 요구하지 않고, Google AI Studio가 지원하는 서버 측 Node.js 환경(Next.js Route Handlers + Server Analytics Engine)에서 모든 외부 API 호출, 실시간 데이터센터 크롤링, 캐시 및 분석 연산을 통합 처리합니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-mono text-emerald-400">
                      LAYER 1 · FRONTEND CLIENT
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      Next.js App Router UI (/components/fclab/*)
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      5대 연구소(Player, Squad, Efficiency, Profile, Match) 상호 연동 인터페이스. 외부 API 키를 클라이언트에 절대 노출하지 않으며 내부{" "}
                      <code className="font-mono text-slate-300">
                        /api/fclab/v1/*
                      </code>{" "}
                      라우트만 호출합니다.
                    </p>
                  </div>

                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-mono text-sky-400">
                      LAYER 2 · SERVER-SIDE ANALYTICS ENGINE
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      Node.js 분석 엔진 (/lib/server/fclab-engine.ts)
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      포지션별 가중치 기반 실성능(Core Score), 로그 스케일 가성비 지수, 17종 전술 아키타입 적합도, 동적 급여 상한({rules.salaryCap} FP) 및 최대 강화(+{rules.maxEnhanceLevel}강) 자율 동기화·약점 보강 추천 알고리즘을 서버에서 수행합니다.
                    </p>
                  </div>

                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-mono text-amber-400">
                      LAYER 3 · EXTERNAL DATA &amp; SECRETS
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      넥슨 Open API &amp; 공식 데이터센터 크롤러
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      정적 메타데이터 및 데이터센터 시세/능력치는 서버에서 실시간 수집하며, 개인 매치 기록은 서버 환경변수{" "}
                      <code className="font-mono text-emerald-300">
                        process.env.NEXON_OPEN_API_KEY
                      </code>
                      를 통해 인증합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
