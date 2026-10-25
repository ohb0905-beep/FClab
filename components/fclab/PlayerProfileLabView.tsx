"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlayerCard,
  PlayerProfileResult,
  ArchetypeFitItem,
  SimilarAlternativePlayerItem,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  FeelGradeLabelType,
  getEnhanceOvrBoost,
  getEnhanceBadgeStyle,
  formatBpKorean,
} from "@/lib/fclab-types";
import {
  HexRadarChart,
  PlayerAvatar,
  SeasonBadge,
} from "./VisualCharts";
import {
  UserCheck,
  Compass,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Feather,
  Search,
  RefreshCw,
  Info,
  Users,
} from "lucide-react";

interface PlayerProfileLabViewProps {
  rules?: SystemRules;
  systemRules?: SystemRules;
  initialCards?: PlayerCard[];
  initialSpid?: number | null;
  initialCompareSpid?: number | null;
  onInspectPlayer?: (spid: number) => void;
  onInspectInPlayerLab?: (spid: number) => void;
  onSendToEfficiencyLab?: (playerName: string, position: string) => void;
}

const POS_LINE_STYLES: Record<
  string,
  { badge: string; text: string; bar: string }
> = {
  FW: {
    badge:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  MF: {
    badge:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  DF: {
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  GK: {
    badge:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
};

const QUICK_POPULAR_KEYWORDS = [
  { label: "로드리 (수비형 MF 검증)", query: "로드리" },
  { label: "굴리트 (육각형 MF 검증)", query: "굴리트" },
  { label: "벨링엄 (중앙 MF 검증)", query: "벨링엄" },
  { label: "외데고르 (공격형 MF 검증)", query: "외데고르" },
  { label: "손흥민 (좋은 체감 검증)", query: "손흥민" },
  { label: "음바페", query: "음바페" },
  { label: "호날두", query: "호날두" },
];

function getPosLine(pos: string): "FW" | "MF" | "DF" | "GK" {
  const p = (pos || "").toUpperCase();
  if (["ST", "CF", "LW", "RW"].includes(p)) return "FW";
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(p)) return "MF";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(p)) return "DF";
  return "GK";
}

function getFeelBadgeInfo(
  feelGradeLabel?: FeelGradeLabelType,
  fallbackLabel?: string
): {
  label: FeelGradeLabelType;
  style: string;
  dotColor: string;
  desc: string;
} {
  const resolved: FeelGradeLabelType =
    feelGradeLabel ||
    (fallbackLabel === "좋은 체감" || fallbackLabel === "CHEAT_KEY"
      ? "좋은 체감"
      : fallbackLabel === "무거운 체감" || fallbackLabel === "STAT_TRAP"
      ? "무거운 체감"
      : "보통 체감");

  if (resolved === "좋은 체감") {
    return {
      label: "좋은 체감",
      style:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35",
      dotColor: "bg-emerald-500",
      desc: "체형(비건장)·피지컬(<186cm·<80kg) 통과 + 8강 5대 체감 평균 128 이상 & 민·밸 124 이상",
    };
  }
  if (resolved === "보통 체감") {
    return {
      label: "보통 체감",
      style:
        "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35",
      dotColor: "bg-sky-500",
      desc: "준수한 방향 전환 반응성 (신장 186cm↑·몸무게 80kg↑·건장 체형은 최대 보통 체감 제한)",
    };
  }
  return {
    label: "무거운 체감",
    style:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35",
    dotColor: "bg-rose-500",
    desc: "역동작 및 선회 반경이 큰 피지컬/체형 또는 체감 스탯 하위 구간",
  };
}

function computeCardQuickFeelLabel(
  c: PlayerCard,
  boost8: number
): FeelGradeLabelType {
  if (c.feelMetrics?.feelGradeLabel) {
    return c.feelMetrics.feelGradeLabel;
  }
  const isExcluded =
    (c.body_type || "").includes("건장") || c.height >= 186 || c.weight >= 80;
  const agi8 = (c.stats?.["민첩성"] || 80) + boost8;
  const bal8 = (c.stats?.["밸런스"] || 80) + boost8;
  const drb8 = (c.stats?.["드리블"] || 80) + boost8;
  const bc8 = (c.stats?.["볼 컨트롤"] || 80) + boost8;
  const rea8 = (c.stats?.["반응 속도"] || 80) + boost8;
  const avg8 =
    agi8 * 0.28 + bal8 * 0.22 + drb8 * 0.22 + bc8 * 0.16 + rea8 * 0.12;
  if (!isExcluded && avg8 >= 128 && agi8 >= 124 && bal8 >= 124) {
    return "좋은 체감";
  }
  if (avg8 >= 115 && !(c.height >= 190 && c.weight >= 84 && avg8 < 123)) {
    return "보통 체감";
  }
  return "무거운 체감";
}

export default function PlayerProfileLabView({
  rules,
  systemRules: systemRulesProp,
  initialCards = [],
  initialSpid,
  initialCompareSpid,
  onInspectPlayer,
  onInspectInPlayerLab,
  onSendToEfficiencyLab,
}: PlayerProfileLabViewProps) {
  const systemRules = systemRulesProp || rules || DEFAULT_SYSTEM_RULES;
  const handleInspect = onInspectPlayer || onInspectInPlayerLab;

  const [cardsPool, setCardsPool] = useState<PlayerCard[]>(initialCards);
  // 요구사항 1: 강화 단계 기본값 8강, 적응도 기본값 0, 초기 진입 시 검색 선수 비워둠
  const [selectedSpid, setSelectedSpid] = useState<number>(initialSpid || 0);
  const [compareSpid, setCompareSpid] = useState<number>(
    initialCompareSpid || 0
  );
  const [grade, setGrade] = useState<number>(8);
  const [teamColorBonus, setTeamColorBonus] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<string>("");

  // 초기 검색창 비워둠
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchingCards, setSearchingCards] = useState<boolean>(false);
  const [feelFilter, setFeelFilter] = useState<
    "ALL" | "좋은 체감" | "보통 체감" | "무거운 체감"
  >("ALL");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryCard, setPrimaryCard] = useState<PlayerCard | null>(null);
  const [primaryProfile, setPrimaryProfile] =
    useState<PlayerProfileResult | null>(null);

  const [compareCard, setCompareCard] = useState<PlayerCard | null>(null);
  const [compareProfile, setCompareProfile] =
    useState<PlayerProfileResult | null>(null);

  // 접기/펴기 토글 상태
  const [showFeelDetail, setShowFeelDetail] = useState<boolean>(false);
  const [showArchetypeDetail, setShowArchetypeDetail] = useState<boolean>(false);

  // 초기 카드 풀 로드 (자동 선수 선택은 하지 않음)
  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      setCardsPool((prev) => {
        const map = new Map<number, PlayerCard>();
        for (const c of prev) map.set(c.spid, c);
        for (const c of initialCards) map.set(c.spid, c);
        return Array.from(map.values());
      });
      return;
    }
    let mounted = true;
    fetch("/api/fclab/v1/players/search?q=")
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data.ok && Array.isArray(data.cards)) {
          setCardsPool((prev) => {
            const map = new Map<number, PlayerCard>();
            for (const c of prev) map.set(c.spid, c);
            for (const c of data.cards) map.set(c.spid, c);
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [initialCards]);

  // 외부에서 initialSpid가 전달된 경우에만 선택
  useEffect(() => {
    if (initialSpid && initialSpid > 0) {
      setSelectedSpid(initialSpid);
    }
  }, [initialSpid]);

  useEffect(() => {
    if (initialCompareSpid && initialCompareSpid > 0) {
      setCompareSpid(initialCompareSpid);
    }
  }, [initialCompareSpid]);

  // 선수 키워드 검색 핸들러
  const handleSearchPlayers = useCallback(
    async (overrideKeyword?: string) => {
      const q = (
        overrideKeyword !== undefined ? overrideKeyword : searchQuery
      ).trim();
      if (!q) return;
      setSearchingCards(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/fclab/v1/players/search?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.cards) && data.cards.length > 0) {
          setCardsPool((prev) => {
            const map = new Map<number, PlayerCard>();
            for (const c of data.cards) map.set(c.spid, c);
            for (const c of prev) {
              if (!map.has(c.spid)) map.set(c.spid, c);
            }
            return Array.from(map.values());
          });
          setSelectedSpid(data.cards[0].spid);
          setTargetPosition("");
        } else {
          setError(`'${q}' 검색 결과가 없습니다. 다른 선수명을 입력해보세요.`);
        }
      } catch (err: any) {
        setError(err.message || "선수 검색 중 오류가 발생했습니다.");
      } finally {
        setSearchingCards(false);
      }
    },
    [searchQuery]
  );

  // 프로필 분석 API 호출
  const fetchProfileAnalysis = useCallback(async () => {
    if (!selectedSpid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        spid: String(selectedSpid),
        grade: String(grade),
        team_color: String(teamColorBonus),
      });
      if (compareSpid > 0 && compareSpid !== selectedSpid) {
        params.set("compare_spid", String(compareSpid));
      }
      if (targetPosition) {
        params.set("pos", targetPosition);
      }

      const res = await fetch(
        `/api/fclab/v1/profile/analyze?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "선수 유형 분석에 실패했습니다.");
      }

      setPrimaryCard(data.card || null);
      setPrimaryProfile(data.profile || null);
      setCompareCard(data.compareCard || null);
      setCompareProfile(data.compareProfile || null);
    } catch (err: any) {
      setError(err.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedSpid, compareSpid, grade, teamColorBonus, targetPosition]);

  useEffect(() => {
    if (selectedSpid > 0) {
      fetchProfileAnalysis();
    }
  }, [fetchProfileAnalysis, selectedSpid]);

  // 드롭다운에 표시할 카드 목록 필터링
  const filteredCardsPool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cardsPool.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.season_code.toLowerCase().includes(q) ||
        c.primary_position.toLowerCase().includes(q)
      );
    });
  }, [cardsPool, searchQuery]);

  const topArchetype: ArchetypeFitItem | null =
    primaryProfile?.primary_archetype ||
    primaryProfile?.position_archetypes?.[0] ||
    null;

  const feelMetrics =
    primaryProfile?.feelMetrics || primaryCard?.feelMetrics || null;

  const feelBadge = getFeelBadgeInfo(
    feelMetrics?.feelGradeLabel,
    feelMetrics?.statTrapLabel || feelMetrics?.statTrapBadge
  );

  // 미드필더(CAM/CM/CDM) 여부 확인
  const isCentralMidfielder = useMemo(() => {
    const pos = (
      targetPosition ||
      primaryProfile?.analyzed_position ||
      primaryCard?.primary_position ||
      ""
    ).toUpperCase();
    return ["CAM", "CM", "CDM"].includes(pos);
  }, [targetPosition, primaryProfile, primaryCard]);

  const boost8 = getEnhanceOvrBoost(8, systemRules.enhanceOvrBoosts);
  const currentGradeBadge = getEnhanceBadgeStyle(grade);

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 바 */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                실사용 체감 3단계 & 미드필더 4분류 정밀 진단
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25">
                기본 +8강 · 적응도 0 기준
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
              체형·선회반경 기반 3단계 체감 판정 & 포지션별 유형 분류
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              건장·186cm↑·80kg↑ 피지컬 필터와 8강 5대 체감 컷오프(평균 128·민밸 124)를 적용해 실제 인게임 체감과 선수 유형을 정확히 판별합니다.
            </p>
          </div>

          {/* 우측 강화 단계 & 적응도(팀컬러) 설정 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 강화 단계 (기본 8강) */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                강화 단계
              </span>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="bg-transparent text-xs font-extrabold text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer"
              >
                {Array.from(
                  { length: systemRules.maxEnhanceLevel },
                  (_, i) => i + 1
                ).map((g) => (
                  <option
                    key={g}
                    value={g}
                    className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-200"
                  >
                    +{g}강 (+{getEnhanceOvrBoost(g, systemRules.enhanceOvrBoosts)}{" "}
                    OVR)
                  </option>
                ))}
              </select>
            </div>

            {/* 적응도 / 팀컬러 보너스 (기본 0) */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                적응도/팀컬러
              </span>
              <select
                value={teamColorBonus}
                onChange={(e) => setTeamColorBonus(Number(e.target.value))}
                className="bg-transparent text-xs font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tc) => (
                  <option
                    key={tc}
                    value={tc}
                    className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-200"
                  >
                    {tc === 0 ? "0 (적응도 없음 · 순수 스탯)" : `+${tc} 보너스`}
                  </option>
                ))}
              </select>
            </div>

            {/* 포지션 기준 오버라이드 */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                기준 포지션
              </span>
              <select
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option
                  value=""
                  className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-200"
                >
                  주포지션 자동 ({primaryCard?.primary_position || "기본"})
                </option>
                {[
                  "ST",
                  "CF",
                  "LW",
                  "RW",
                  "CAM",
                  "CM",
                  "CDM",
                  "LM",
                  "RM",
                  "CB",
                  "LB",
                  "RB",
                  "GK",
                ].map((pos) => (
                  <option
                    key={pos}
                    value={pos}
                    className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-200"
                  >
                    {pos} 기준 평가
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 선수 실시간 검색 + 메인/비교 선수 선택 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
          {/* 선수 검색창 (초기 비워둠) */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              선수 검색 (이름 · 시즌 입력)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchPlayers();
                }}
                placeholder="예: 로드리, 굴리트, 손흥민, 벨링엄..."
                className="flex-1 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                type="button"
                onClick={() => handleSearchPlayers()}
                disabled={searchingCards}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {searchingCards ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                검색
              </button>
            </div>
          </div>

          {/* 분석 대상 메인 선수 */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              분석 대상 선수 선택 ({filteredCardsPool.length}장)
            </label>
            <select
              value={selectedSpid}
              onChange={(e) => {
                setSelectedSpid(Number(e.target.value));
                setTargetPosition("");
              }}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/60"
            >
              <option value={0}>-- 분석할 선수를 선택하거나 검색하세요 --</option>
              {filteredCardsPool.map((c) => (
                <option key={c.spid} value={c.spid}>
                  [{c.season_code}] {c.name} ({c.primary_position} · 기본 OVR{" "}
                  {c.ovr} · 급여 {c.salary})
                </option>
              ))}
            </select>
          </div>

          {/* 1:1 비교 선수 선택 */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                1:1 비교 대상 카드 (선택사항)
              </span>
              {compareSpid > 0 && (
                <button
                  type="button"
                  onClick={() => setCompareSpid(0)}
                  className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  비교 해제
                </button>
              )}
            </label>
            <select
              value={compareSpid}
              onChange={(e) => setCompareSpid(Number(e.target.value))}
              disabled={!selectedSpid}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500/60 disabled:opacity-50"
            >
              <option value={0}>-- 비교 선수 없음 (단독 정밀 진단) --</option>
              {cardsPool
                .filter((c) => c.spid !== selectedSpid)
                .map((c) => (
                  <option key={c.spid} value={c.spid}>
                    [{c.season_code}] {c.name} ({c.primary_position} · 기본 OVR{" "}
                    {c.ovr} · 급여 {c.salary})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 빠른 검증용 추천 선수 칩 */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            빠른 선수 불러오기:
          </span>
          {QUICK_POPULAR_KEYWORDS.map((item) => (
            <button
              key={item.query}
              type="button"
              onClick={() => {
                setSearchQuery(item.query);
                handleSearchPlayers(item.query);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-500/15 text-slate-700 hover:text-indigo-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/70 transition cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-600 dark:text-rose-300 flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 초기 빈 상태 (선수 미선택 시) */}
      {selectedSpid === 0 && !loading && (
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
            <Compass className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            분석할 선수를 검색하거나 선택해주세요
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-1.5 leading-relaxed">
            초기 설정은 <strong>+8강 · 적응도 0</strong> 기준입니다. 상단 검색창에서{" "}
            <strong>로드리, 굴리트, 손흥민, 벨링엄</strong> 등을 검색하거나 아래 카드를 클릭해 즉시 체감 등급과 포지션 유형을 확인하세요.
          </p>

          {/* 체감 등급 필터 & 빠른 카드 그리드 */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {(["ALL", "좋은 체감", "보통 체감", "무거운 체감"] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeelFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    feelFilter === f
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                  }`}
                >
                  {f === "ALL" ? "전체 선수 보기" : f}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 text-left">
            {cardsPool
              .filter((c) => {
                if (feelFilter === "ALL") return true;
                return computeCardQuickFeelLabel(c, boost8) === feelFilter;
              })
              .slice(0, 8)
              .map((c) => {
                const label = computeCardQuickFeelLabel(c, boost8);
                const bInfo = getFeelBadgeInfo(label);

                return (
                  <button
                    key={c.spid}
                    type="button"
                    onClick={() => setSelectedSpid(c.spid)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar
                        spid={c.spid}
                        pid={c.pid}
                        thumbUrl={c.thumb_url}
                        name={c.name}
                        size={38}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <SeasonBadge
                            seasonImg={c.season_img}
                            seasonCode={c.season_code}
                          />
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition">
                            {c.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {c.primary_position} · {c.height}cm/{c.weight}kg (
                          {c.body_type})
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${bInfo.style}`}
                    >
                      {bInfo.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
          선수의 8강 기준 체감 컷오프, 체형·선회반경 페널티, 미드필더 4분류 적합도를 정밀 계산하고 있습니다...
        </div>
      )}

      {/* 메인 분석 결과 */}
      {!loading && primaryCard && primaryProfile && (
        <>
          {/* 1. 핵심 요약 배너: 체감 3단계 배지 + 1순위 선수 유형 + 완성형 판정 */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* 좌측: 선수 기본 프로필 + 3단계 체감 배지 */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative">
                  <PlayerAvatar
                    spid={primaryCard.spid}
                    pid={primaryCard.pid}
                    thumbUrl={primaryCard.thumb_url}
                    name={primaryCard.name}
                    size={68}
                    className="rounded-2xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 p-1"
                  />
                  <span
                    className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[10px] border ${currentGradeBadge.className}`}
                  >
                    {currentGradeBadge.label}
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-600 text-white">
                      {primaryProfile.analyzed_position}
                    </span>
                    <SeasonBadge
                      seasonImg={primaryCard.season_img}
                      seasonCode={primaryCard.season_code}
                      className="h-5"
                    />
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {primaryCard.name}
                    </h3>
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      OVR {primaryProfile.effective_ovr}
                    </span>
                    {/* 3단계 체감 배지 (좋은 체감 / 보통 체감 / 무거운 체감) */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${feelBadge.style}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${feelBadge.dotColor}`}
                      />
                      {feelBadge.label}
                    </span>
                    {/* 1순위 유형 배지 */}
                    {topArchetype && (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35">
                        1순위 유형: {topArchetype.name} ({topArchetype.fit_percent}
                        %)
                      </span>
                    )}
                  </div>

                  {/* 신체 조건 & 양발 & 팀컬러 요약 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span>
                      신체:{" "}
                      <strong className="text-slate-900 dark:text-slate-200">
                        {primaryCard.height}cm · {primaryCard.weight}kg ·{" "}
                        {primaryCard.body_type}
                      </strong>
                    </span>
                    <span>
                      양발:{" "}
                      <strong className="text-slate-900 dark:text-slate-200">
                        {primaryCard.foot}
                      </strong>
                    </span>
                    <span>
                      급여:{" "}
                      <strong className="text-slate-900 dark:text-slate-200">
                        {primaryCard.salary}
                      </strong>
                    </span>
                    {primaryCard.team_colors &&
                      primaryCard.team_colors.length > 0 && (
                        <span>
                          팀컬러:{" "}
                          <strong className="text-indigo-600 dark:text-indigo-300">
                            {primaryCard.team_colors
                              .map((tc) => tc.name)
                              .join(" · ")}
                          </strong>
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* 우측: 핵심 지표 3종 카드 */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    인게임 체감 지수
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {feelMetrics?.feelScore ?? 0}
                    <span className="text-xs font-bold text-slate-400 ml-0.5">
                      점
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {feelBadge.label}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    1순위 유형 적합도
                  </div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {topArchetype?.fit_percent ?? 0}
                    <span className="text-xs font-bold text-slate-400 ml-0.5">
                      %
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate max-w-[115px] mx-auto">
                    {topArchetype?.name || "-"}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    완성형(육각형) 판정
                  </div>
                  <div
                    className={`text-sm font-black mt-1.5 ${
                      primaryProfile.complete_evaluation.is_complete
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {primaryProfile.complete_evaluation.is_complete
                      ? "완성형(육각형) 충족"
                      : "특화형 선수"}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {primaryProfile.complete_evaluation.passed_count}/
                    {primaryProfile.complete_evaluation.total_criteria} 기준 통과
                  </div>
                </div>
              </div>
            </div>

            {/* 한줄 핵심 요약 */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                💡{" "}
                <strong className="text-slate-900 dark:text-white">
                  한줄 진단:
                </strong>{" "}
                {feelMetrics?.feelVerdictReason ||
                  primaryProfile.judgment_summary}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {onSendToEfficiencyLab && (
                  <button
                    type="button"
                    onClick={() =>
                      onSendToEfficiencyLab(
                        primaryCard.name,
                        primaryProfile.analyzed_position
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                  >
                    시즌·강화 효율 비교 →
                  </button>
                )}
                {handleInspect && (
                  <button
                    type="button"
                    onClick={() => handleInspect(primaryCard.spid)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    선수 탐색에서 시세·특성 보기 →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. 체감 3단계 판정 상세 & 미드필더 4분류 / 유형 순위 (2열 그리드) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 좌측 6칸: 체감 3단계 분류 검증 카드 */}
            {feelMetrics && (
              <div className="lg:col-span-6 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Feather className="w-3.5 h-3.5" />
                        인게임 체감 3단계 판정 (좋은 체감 / 보통 체감 / 무거운 체감)
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                        체형·피지컬 필터 & 8강 5대 체감 컷오프 검증
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${feelBadge.style}`}
                    >
                      {feelBadge.label}
                    </span>
                  </div>

                  {/* 좋은 체감 2대 필수 관문 통과 여부 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* 관문 1: 체형 및 피지컬 필터 */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        !feelMetrics.isPhysicalExcludedFromGoodFeel
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-amber-500/5 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ① 체형·피지컬 필터
                        </span>
                        {!feelMetrics.isPhysicalExcludedFromGoodFeel ? (
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 통과
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> 좋은 체감 제외
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1.5">
                        {primaryCard.body_type} · {primaryCard.height}cm ·{" "}
                        {primaryCard.weight}kg
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        기준: 비건장 체형 & 신장 186cm 미만 & 몸무게 80kg 미만
                      </p>
                    </div>

                    {/* 관문 2: 8강(적응도 0) 5대 체감 스탯 컷오프 */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        (feelMetrics.feel5Avg8 ?? 0) >= 128 &&
                        (feelMetrics.agility8 ?? 0) >= 124 &&
                        (feelMetrics.balance8 ?? 0) >= 124
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ② 8강 체감 스탯 컷오프
                        </span>
                        {(feelMetrics.feel5Avg8 ?? 0) >= 128 &&
                        (feelMetrics.agility8 ?? 0) >= 124 &&
                        (feelMetrics.balance8 ?? 0) >= 124 ? (
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 통과
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> 기준 미달
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1.5">
                        5대 평균{" "}
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                          {feelMetrics.feel5Avg8 ?? "-"}
                        </span>{" "}
                        (민첩 {feelMetrics.agility8 ?? "-"} · 밸런스{" "}
                        {feelMetrics.balance8 ?? "-"})
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        기준: 8강 평균 128↑ & 민첩성 124↑ & 밸런스 124↑
                      </p>
                    </div>
                  </div>

                  {/* 체감 세부 지표 3가지 바 */}
                  <div className="space-y-3 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          체감 부드러움 & 방향 전환 반응성
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {feelMetrics.radarFive.smoothness}점
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(15, feelMetrics.radarFive.smoothness))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          순간 가속 & 치달 탄력
                        </span>
                        <span className="text-sky-600 dark:text-sky-400">
                          {feelMetrics.radarFive.burst}점
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(15, feelMetrics.radarFive.burst))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          경합 버티기 (피지컬 유지력)
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {feelMetrics.radarFive.physicalHold}점
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(15, feelMetrics.radarFive.physicalHold))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 자세히 보기 토글 */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowFeelDetail((prev) => !prev)}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    체감 판정 기준 자세히 보기
                    {showFeelDetail ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showFeelDetail && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                      <p>
                        • <strong>좋은 체감:</strong> 체형이 마름/고유이거나 경량 보통(신장 186cm 미만 & 몸무게 80kg 미만)이면서, 8강 기준 5대 체감 스탯(민첩성·밸런스·드리블·볼컨트롤·반응속도) 가중 평균이 <strong>128 이상</strong>이고 민첩성·밸런스가 모두 <strong>124 이상</strong>일 때만 부여됩니다.
                      </p>
                      <p>
                        • <strong>보통 체감:</strong> 건장 체형이거나 186cm 이상/80kg 이상인 선수는 스탯이 아무리 높아도 인게임 선회 반경 한계로 인해 최대 <strong>보통 체감</strong>까지만 부여됩니다.
                      </p>
                      <p>
                        • <strong>무거운 체감:</strong> 장신·중량 피지컬에 민첩/밸런스가 낮아 방향 전환 시 역동작이 체감되는 유형입니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 우측 6칸: 포지션 그룹별 선수 유형 진단 (미드필더 4분류 강조) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {isCentralMidfielder
                        ? "중앙 미드필더 4대 유형 정밀 분류 (CAM · CM · CDM)"
                        : `${primaryProfile.position_group_label} 유형 적합도 순위`}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {isCentralMidfielder
                        ? "공격형 / 중앙 / 수비형 / 육각형 미드필더 판정"
                        : "주포지션·수비/피지컬·체감 기반 유형 판정"}
                    </h3>
                  </div>
                  {topArchetype && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      1위: {topArchetype.name}
                    </span>
                  )}
                </div>

                {/* 유형 순위 리스트 */}
                <div className="space-y-2.5">
                  {primaryProfile.position_archetypes.map((arch, idx) => {
                    const isTop = idx === 0;
                    const cmpArch = compareProfile?.position_archetypes?.find(
                      (a) => a.id === arch.id
                    );
                    return (
                      <div
                        key={arch.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isTop
                            ? "bg-indigo-500/10 border-indigo-500/40 dark:bg-indigo-500/15"
                            : "bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                isTop
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {arch.name}
                                </span>
                                {arch.is_complete_type && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    민·밸 124↑ 필수
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {arch.desc}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                              {arch.fit_percent}%
                            </div>
                            {cmpArch && (
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                비교: {cmpArch.fit_percent}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 적합도 게이지 바 */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isTop
                                ? "bg-indigo-500"
                                : "bg-slate-400 dark:bg-slate-600"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(15, arch.fit_percent))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 미드필더 4분류 & 완성형 기준 자세히 보기 토글 */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchetypeDetail((prev) => !prev)}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  유형 판별 및 완성형(민·밸 124↑) 기준 자세히 보기
                  {showArchetypeDetail ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showArchetypeDetail && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    • <strong>수비형 미드필더 (CDM 특화):</strong> 주포지션(CDM) 가중치 + 수비 핵심 스탯(가로채기·태클·대인수비·몸싸움) + 피지컬(신장·체중)을 종합 반영합니다. 로드리처럼 패스/중거리 스탯이 높아도 수비·피지컬 비중이 높고 체감이 묵직한 홀딩 MF는 공격형 미드필더로 오분류되지 않고 <strong>수비형 미드필더</strong>로 정확히 판정됩니다.
                  </p>
                  <p>
                    • <strong>육각형 미드필더 / 완성형 판정:</strong> 공·수·패스·피지컬·스태미너 기준 통과뿐만 아니라 <strong>8강 기준 민첩성 ≥ 124 & 밸런스 ≥ 124</strong>를 동시에 충족해야 진정한 완성형(육각형)으로 인정됩니다.
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {primaryProfile.complete_evaluation.criteria.map((c) => (
                      <div
                        key={c.id}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                          c.passed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        <span className="font-bold truncate">{c.label}</span>
                        <span className="font-extrabold ml-1 shrink-0">
                          {c.score_text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. 동일 팀컬러 & 동일 포지션 가성비 대체재 TOP 3 */}
          {feelMetrics && (
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    스쿼드 즉시 투입 가능한 가성비 대체재 추천
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    동일 팀컬러 & 동일 포지션({primaryProfile.analyzed_position}) 가성비 대체재 TOP 3
                  </h3>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  기준 팀컬러:{" "}
                  <strong className="text-indigo-600 dark:text-indigo-300">
                    {primaryCard.team_colors?.map((tc) => tc.name).join(" · ") ||
                      `${primaryCard.team} · ${primaryCard.nation}`}
                  </strong>
                </div>
              </div>

              {feelMetrics.similarAlternatives &&
              feelMetrics.similarAlternatives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {feelMetrics.similarAlternatives.map(
                    (alt: SimilarAlternativePlayerItem, idx: number) => {
                      const altFeel = getFeelBadgeInfo(alt.feelBadgeLabel);
                      const simPct =
                        alt.similarity <= 1
                          ? Math.round(alt.similarity * 100)
                          : Math.round(alt.similarity);
                      const savingPct = Math.round(
                        Math.abs(alt.priceDiffRatio) * 100
                      );

                      return (
                        <div
                          key={alt.spid}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                                  대체 추천 #{idx + 1}
                                </span>
                                {alt.sharedTeamColor && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    {alt.sharedTeamColor}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {alt.position || primaryProfile.analyzed_position}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                                유사도 {simPct}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PlayerAvatar
                                  spid={alt.spid}
                                  thumbUrl={alt.thumbUrl}
                                  name={alt.name}
                                  size={40}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <SeasonBadge
                                      seasonImg={alt.seasonImg}
                                      seasonCode={alt.season}
                                    />
                                    <span className="text-base font-black text-slate-900 dark:text-white truncate">
                                      {alt.name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    체감 지수 {alt.feelScore}점 · +{alt.grade || 8}강
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${altFeel.style}`}
                              >
                                {altFeel.label}
                              </span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">
                                  예상 시세:
                                </span>{" "}
                                <strong className="text-slate-900 dark:text-white">
                                  {alt.bpText ||
                                    (alt.bp ? formatBpKorean(alt.bp) : "-")}
                                </strong>
                              </div>
                              <span
                                className={`font-extrabold ${
                                  alt.priceDiffRatio < 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {alt.priceDiffRatio < 0
                                  ? `약 ${savingPct}% BP 절감`
                                  : "동급 시세 경쟁자"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setCompareSpid(alt.spid)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition cursor-pointer"
                            >
                              1:1 비교하기
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedSpid(alt.spid)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                            >
                              이 카드 분석
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  현재 풀에서 동일 팀컬러 및 동일 포지션 조건을 만족하는 대체재 후보가 없습니다.
                </div>
              )}
            </div>
          )}

          {/* 4. 6축 밸런스 레이더 차트 & 핵심 강점/약점 요약 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 6축 레이더 차트 */}
            <div className="lg:col-span-6 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    6축 능력치 밸런스
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {primaryCard.name}{" "}
                    {compareCard ? `vs ${compareCard.name}` : "역량 분포"}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  기준 포지션: {primaryProfile.analyzed_position}
                </span>
              </div>

              <div className="flex justify-center py-2">
                <HexRadarChart
                  primaryData={primaryProfile.six_face}
                  compareData={compareProfile?.six_face || null}
                  primaryLabel={`[${primaryCard.season_code}] ${primaryCard.name} (+${grade})`}
                  compareLabel={
                    compareCard
                      ? `[${compareCard.season_code}] ${compareCard.name} (+${grade})`
                      : undefined
                  }
                  size={250}
                />
              </div>
            </div>

            {/* 핵심 강점 스탯 TOP 5 & 보완 스탯 */}
            <div className="lg:col-span-6 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      포지션 핵심 강점 & 피지컬 적용 요인
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                      실사용 핵심 강점 스탯 & 체형 보정
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">
                      주요 강점 스탯 TOP 5
                    </div>
                    <div className="space-y-1.5">
                      {primaryProfile.strengths.slice(0, 5).map((st) => (
                        <div
                          key={st.stat}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {st.stat}
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {st.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mb-2">
                      체형·피지컬·양발 반영 내역
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {primaryProfile.physical_foot_analysis.applied_factors
                        .slice(0, 4)
                        .map((fac, i) => (
                          <div key={i} className="leading-snug">
                            • {fac}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                {primaryProfile.role_nuance_note}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
