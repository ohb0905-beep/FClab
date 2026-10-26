"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Sliders,
  RotateCcw,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  CardEfficiencyResult,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  getEnhanceOvrBoost,
  getPositionToneClass,
} from "@/lib/fclab-types";
import {
  PlayerAvatar,
  SeasonBadge,
  HexRadarChart,
  GradeEfficiencyBarChart,
} from "./VisualCharts";
import PlayerSearchFilter, {
  PlayerFilterState,
  DEFAULT_PLAYER_FILTER_STATE,
  PlayerSearchFilterToggleButton,
  hasActiveDetailFilters,
} from "./PlayerSearchFilter";

interface CardEfficiencyLabViewProps {
  rules?: SystemRules;
  initialPlayerName?: string;
  initialPosition?: string;
  positionWeightsMap: Record<string, Record<string, number>>;
  onInspectInPlayerLab: (spid: number) => void;
}

export default function CardEfficiencyLabView({
  rules = DEFAULT_SYSTEM_RULES,
  initialPlayerName = "",
  initialPosition = "ST",
  positionWeightsMap,
  onInspectInPlayerLab,
}: CardEfficiencyLabViewProps) {
  const [query, setQuery] = useState(initialPlayerName);
  const [position, setPosition] = useState(initialPosition || "ST");
  // 기본 강화 단계: +8강(8카), 기본 적응도/팀컬러: 0
  const [grade, setGrade] = useState(8);
  const [teamColor, setTeamColor] = useState(0);
  const [maxBp, setMaxBp] = useState(0);

  const [filterOpen, setFilterOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState<PlayerFilterState>({
    ...DEFAULT_PLAYER_FILTER_STATE,
    position: initialPosition || "ALL",
  });
  const [hasSearched, setHasSearched] = useState(Boolean(initialPlayerName));

  const [customWeights, setCustomWeights] = useState<Record<string, number>>(
    positionWeightsMap[initialPosition || "ST"] || {}
  );
  const [isCustomWeightActive, setIsCustomWeightActive] = useState(false);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CardEfficiencyResult[]>([]);
  const [trapBadgeFilter, setTrapBadgeFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<
    "efficiency" | "core" | "feel" | "salary_eff" | "ranker"
  >("efficiency");
  const [selectedSpid, setSelectedSpid] = useState<number | null>(null);
  const [compareSpid, setCompareSpid] = useState<number | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string>("");

  const dynamicEnhanceLevels = Array.from(
    { length: Math.max(1, rules.maxEnhanceLevel) },
    (_, i) => i + 1
  );

  const handlePositionChange = (newPos: string) => {
    setPosition(newPos);
    setDetailFilter((prev) => ({ ...prev, position: newPos }));
    setIsCustomWeightActive(false);
    if (positionWeightsMap[newPos]) {
      setCustomWeights({ ...positionWeightsMap[newPos] });
    }
  };

  const runEfficiencyAnalysis = useCallback(
    async (
      qStr: string,
      posStr: string,
      gNum: number,
      tcNum: number,
      maxBpVal: number,
      weightsObj?: Record<string, number>,
      activeFilter?: PlayerFilterState
    ) => {
      const fState = activeFilter || detailFilter;
      const cleanQ = qStr.trim();
      if (!cleanQ && !hasActiveDetailFilters(fState) && maxBpVal === 0) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      try {
        const res = await fetch("/api/fclab/v1/efficiency/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: cleanQ,
            position: posStr,
            grade: gNum,
            team_color: tcNum,
            max_bp: maxBpVal,
            filter: fState,
            custom_weights:
              weightsObj && Object.keys(weightsObj).length > 0
                ? weightsObj
                : undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const list: CardEfficiencyResult[] = data.results || [];
          setResults(list);
          setAnalyzedAt(data.analyzedAt || "");
          if (list.length > 0) {
            setSelectedSpid(list[0].spid);
            setCompareSpid(list[1]?.spid || null);
          } else {
            setSelectedSpid(null);
            setCompareSpid(null);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [detailFilter]
  );

  useEffect(() => {
    if (initialPlayerName && initialPlayerName.trim()) {
      const targetPos = initialPosition || "ST";
      setQuery(initialPlayerName);
      setPosition(targetPos);
      if (positionWeightsMap[targetPos]) {
        setCustomWeights({ ...positionWeightsMap[targetPos] });
        setIsCustomWeightActive(false);
      }
      const nextF = {
        ...detailFilter,
        position: targetPos,
      };
      setDetailFilter(nextF);
      runEfficiencyAnalysis(
        initialPlayerName,
        targetPos,
        grade,
        teamColor,
        maxBp,
        undefined,
        nextF
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlayerName, initialPosition]);

  useEffect(() => {
    if (hasSearched) {
      runEfficiencyAnalysis(
        query,
        position,
        grade,
        teamColor,
        maxBp,
        isCustomWeightActive ? customWeights : undefined,
        detailFilter
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, grade, teamColor, maxBp]);

  const filteredAndSortedResults = React.useMemo(() => {
    let list = [...results];
    if (trapBadgeFilter !== "ALL") {
      list = list.filter(
        (r) => r.feelMetrics?.statTrapBadge === trapBadgeFilter
      );
    }
    if (sortMode === "feel") {
      list.sort(
        (a, b) =>
          (b.feelMetrics?.feelScore || 0) - (a.feelMetrics?.feelScore || 0) ||
          b.efficiency_index - a.efficiency_index
      );
    } else if (sortMode === "salary_eff") {
      list.sort(
        (a, b) =>
          (b.feelMetrics?.positionSalaryEfficiency || 0) -
            (a.feelMetrics?.positionSalaryEfficiency || 0) ||
          b.efficiency_index - a.efficiency_index
      );
    } else if (sortMode === "ranker") {
      list.sort(
        (a, b) =>
          (b.feelMetrics?.rankerPickRate || 0) -
            (a.feelMetrics?.rankerPickRate || 0) ||
          b.efficiency_index - a.efficiency_index
      );
    } else if (sortMode === "core") {
      list.sort(
        (a, b) =>
          b.core_score - a.core_score || b.efficiency_index - a.efficiency_index
      );
    } else {
      list.sort(
        (a, b) =>
          b.efficiency_index - a.efficiency_index || b.core_score - a.core_score
      );
    }
    return list;
  }, [results, trapBadgeFilter, sortMode]);

  const primaryCard =
    filteredAndSortedResults.find((r) => r.spid === selectedSpid) ||
    filteredAndSortedResults[0] ||
    results[0] ||
    null;
  const compareCard =
    results.find((r) => r.spid === compareSpid) || null;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100 font-display">
              카드 효율 분석 — 포지션 핵심 스탯 vs 표기 OVR 알짜배기 판독
            </h2>
            <p className="text-xs text-slate-400">
              표기 OVR 대비 해당 포지션의 핵심 스탯 평균값이 얼마나 높은지 분석하여 실질적인 인게임 알짜배기 카드를 찾아냅니다. (기본 +{grade}강 기준)
            </p>
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowFormulaInfo((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span>ℹ️ 자세히 보기 (효율 점수 산출 공식 및 포지션별 핵심 스탯 기준)</span>
                {showFormulaInfo ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showFormulaInfo && (
                <div className="mt-2 p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-emerald-300">
                    • 효율 점수(Efficiency) = (포지션별 핵심 스탯의 평균값 ÷ 선수 표기 OVR) × 100
                  </p>
                  <p className="text-slate-400">
                    프리킥, 페널티킥 등 해당 포지션 실전 성능과 무관한 스탯으로 인해 표기 OVR만 높게 뻥튀기된 카드를 걸러내고, 핵심 스탯이 표기 OVR 이상으로 압축된 진짜 알짜배기 카드를 판별합니다. (100점 이상일수록 핵심 스탯 평균이 표기 OVR보다 높은 고효율 카드)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
                    <div>• <strong className="text-slate-200">ST / CF (12개):</strong> 속력, 가속력, 골 결정력, 슛 파워, 중거리 슛, 민첩성, 밸런스, 드리블, 반응속도, 몸싸움, 헤더, 볼컨트롤</div>
                    <div>• <strong className="text-slate-200">LW / RW (13개):</strong> 속력, 가속력, 골 결정력, 슛 파워, 중거리 슛, 민첩성, 밸런스, 드리블, 반응속도, 몸싸움, 볼컨트롤, 크로스, 커브</div>
                    <div>• <strong className="text-slate-200">CAM (15개):</strong> ST/CF 12개 + 짧은 패스, 긴 패스, 시야</div>
                    <div>• <strong className="text-slate-200">CM (17개):</strong> CAM 15개 + 스태미너, 가로채기</div>
                    <div>• <strong className="text-slate-200">CDM (19개):</strong> CM 17개 + 태클, 대인수비</div>
                    <div>• <strong className="text-slate-200">CB (12개) / LB·RB (14개):</strong> 속력, 가속력, 민첩성, 밸런스, 드리블, 반응속도, 몸싸움, 헤더, 점프, 가로채기, 태클, 대인수비 (+ 풀백: 스태미너, 크로스)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowWeightEditor((v) => !v)}
              className="px-3 py-1.5 bg-[#0B0F17] border border-slate-800 hover:border-emerald-500 text-xs text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              핵심 스탯 비중 커스텀
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runEfficiencyAnalysis(
              query,
              position,
              grade,
              teamColor,
              maxBp,
              isCustomWeightActive ? customWeights : undefined,
              detailFilter
            );
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2"
        >
          <div className="lg:col-span-3 flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="선수 이름 입력 또는 [상세 필터 ▾] 조건 선택..."
              className="flex-1 min-w-[180px] px-3 py-2 bg-[#0B1120] border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              효율 분석
            </button>
            <PlayerSearchFilterToggleButton
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((v) => !v)}
              filter={detailFilter}
            />
          </div>

          <div>
            <select
              value={position}
              onChange={(e) => handlePositionChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B1120] border border-slate-800 rounded-lg text-xs text-slate-200"
            >
              {["ST", "CF", "LW", "RW", "CAM", "CM", "CDM", "CB", "LB", "RB", "GK"].map(
                (p) => (
                  <option key={p} value={p}>
                    평가 기준 포지션: {p}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <select
              value={grade}
              onChange={(e) => {
                const g = Number(e.target.value);
                setGrade(g);
                setDetailFilter((prev) => ({ ...prev, grade: g }));
              }}
              className="w-full px-3 py-2 bg-[#0B1120] border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            >
              {dynamicEnhanceLevels.map((g) => (
                <option key={g} value={g}>
                  강화 단계: +{g}강 (OVR +
                  {getEnhanceOvrBoost(g, rules.enhanceOvrBoosts)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={maxBp}
              onChange={(e) => setMaxBp(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#0B1120] border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            >
              <option value={0}>예산 제한 없음 (전체)</option>
              <option value={50_000_000}>5,000만 BP 이하</option>
              <option value={500_000_000}>5억 BP 이하</option>
              <option value={5_000_000_000}>50억 BP 이하</option>
              <option value={50_000_000_000}>500억 BP 이하</option>
            </select>
          </div>
        </form>

        <PlayerSearchFilter
          isOpen={filterOpen}
          filter={detailFilter}
          onChange={(next) => {
            setDetailFilter(next);
            if (next.grade !== grade) setGrade(next.grade);
            if (next.adaptBonus !== teamColor) setTeamColor(next.adaptBonus);
            if (next.position && next.position !== "ALL" && next.position !== position) {
              setPosition(next.position);
            }
          }}
          onApply={(applied) => {
            const target = applied || detailFilter;
            const nextGrade = target.grade || 8;
            const nextTc = target.adaptBonus || 0;
            const nextPos =
              target.position && target.position !== "ALL"
                ? target.position
                : position;
            setGrade(nextGrade);
            setTeamColor(nextTc);
            setPosition(nextPos);
            runEfficiencyAnalysis(
              query,
              nextPos,
              nextGrade,
              nextTc,
              maxBp,
              isCustomWeightActive ? customWeights : undefined,
              target
            );
          }}
          onReset={() => {
            setGrade(8);
            setTeamColor(0);
            setMaxBp(0);
            setResults([]);
            setSelectedSpid(null);
            setCompareSpid(null);
            setHasSearched(false);
          }}
          maxEnhanceLevel={rules.maxEnhanceLevel}
        />

        {/* Custom Weights Editor Drawer */}
        {showWeightEditor && (
          <div className="p-4 bg-[#0B0F17] border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                {position} 포지션 핵심 스탯 비중 설정 (기본: 모든 핵심 스탯 1/N 동일 평균)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const def = positionWeightsMap[position] || {};
                    setCustomWeights({ ...def });
                    setIsCustomWeightActive(false);
                    runEfficiencyAnalysis(
                      query,
                      position,
                      grade,
                      teamColor,
                      maxBp,
                      undefined
                    );
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  동일 평균 기본값 복원
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomWeightActive(true);
                    runEfficiencyAnalysis(
                      query,
                      position,
                      grade,
                      teamColor,
                      maxBp,
                      customWeights
                    );
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded"
                >
                  커스텀 비중 적용
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(customWeights).map(([sName, wVal]) => (
                <div key={sName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{sName}</span>
                    <span className="font-mono text-emerald-400">
                      {Number((wVal * 100).toFixed(1))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.30"
                    step="0.01"
                    value={wVal}
                    onChange={(e) =>
                      setCustomWeights((prev) => ({
                        ...prev,
                        [sName]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Comparison View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Ranked Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                01. {position} 포지션 핵심 스탯 vs 표기 OVR 효율 순위 (+{grade}강 기준)
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                조회: {analyzedAt.slice(0, 16)} · 표본 {filteredAndSortedResults.length}장
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={trapBadgeFilter}
                onChange={(e) => setTrapBadgeFilter(e.target.value)}
                className="px-2.5 py-1 bg-[#0B0F17] border border-slate-800 rounded text-xs text-slate-200"
              >
                <option value="ALL">체감 판독: 전체</option>
                <option value="CHEAT_KEY">💎 체감 괴물</option>
                <option value="NORMAL">일반 밸런스</option>
                <option value="STAT_TRAP">⚠️ 스탯 대비 둔중함</option>
              </select>

              <select
                value={sortMode}
                onChange={(e) =>
                  setSortMode(
                    e.target.value as
                      | "efficiency"
                      | "core"
                      | "feel"
                      | "salary_eff"
                      | "ranker"
                  )
                }
                className="px-2.5 py-1 bg-[#0B0F17] border border-slate-800 rounded text-xs text-slate-200"
              >
                <option value="efficiency">정렬: 핵심스탯 vs OVR 효율순</option>
                <option value="core">정렬: 포지션 핵심스탯 평균순</option>
                <option value="feel">정렬: 인게임 체감 지수순</option>
                <option value="salary_eff">정렬: 유효 급여 효율순</option>
                <option value="ranker">정렬: 상위 랭커 픽률(%)순</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/60">
                  <th className="py-2.5 px-2.5 font-medium">순위</th>
                  <th className="py-2.5 px-2.5 font-medium">시즌 · 선수명 · 체감판독</th>
                  <th className="py-2.5 px-2.5 font-medium text-right">
                    표기 OVR
                  </th>
                  <th className="py-2.5 px-2.5 font-medium text-right">
                    핵심스탯 평균
                  </th>
                  <th className="py-2.5 px-2.5 font-medium text-right">
                    인게임 체감
                  </th>
                  <th className="py-2.5 px-2.5 font-medium text-right">
                    +{grade}강 시세
                  </th>
                  <th className="py-2.5 px-2.5 font-medium text-right">
                    효율 점수
                  </th>
                  <th className="py-2.5 px-2.5 font-medium text-right">비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                      포지션별 핵심 스탯 평균 및 표기 OVR 대비 효율 점수를 계산하고 있습니다...
                    </td>
                  </tr>
                ) : filteredAndSortedResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center text-slate-400 space-y-1.5">
                      <Search className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                      <div className="text-slate-200 font-semibold">
                        {hasSearched
                          ? "조건에 일치하는 선수 카드가 없습니다."
                          : "분석할 선수 이름을 입력하거나 [상세 필터 ▾]에서 조건을 선택한 뒤 [효율 분석]을 눌러주세요."}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        기본 강화 +8강 · 적응도 0 기준으로 (포지션 핵심 스탯 평균 ÷ 선수 표기 OVR) × 100 효율 점수를 비교합니다.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedResults.map((r, idx) => {
                    const isPrimary = r.spid === primaryCard?.spid;
                    const isCompare = r.spid === compareCard?.spid;
                    const fm = r.feelMetrics;
                    const gap = r.ovr_to_core_gap;
                    return (
                      <tr
                      key={r.spid}
                      onClick={() => setSelectedSpid(r.spid)}
                      className={`cursor-pointer transition-colors ${
                        isPrimary
                          ? "bg-emerald-950/25"
                          : isCompare
                          ? "bg-sky-950/25"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-300 tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar
                            src={r.thumb_url}
                            spid={r.spid}
                            name={r.name}
                            className="w-8 h-8"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <SeasonBadge
                                seasonImg={r.season_img}
                                seasonCode={r.season_code}
                              />
                              <span className="font-semibold text-slate-100">
                                {r.name}
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
                                    : "일반"}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                              <span
                                className={getPositionToneClass(
                                  r.primary_position
                                )}
                              >
                                {r.primary_position}
                              </span>{" "}
                              · 급여 {r.salary} · {r.foot}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold tabular-nums text-slate-200">
                        {r.effective_ovr}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums text-sky-400">
                        <div>{r.core_score}</div>
                        <div
                          className={`text-[10px] ${
                            gap >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          ({gap >= 0 ? `+${gap}` : gap})
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold tabular-nums text-emerald-400">
                        {fm?.feelScore ?? "-"}점
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-300">
                        {r.bp_text}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            r.efficiency_index >= 100
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                              : r.efficiency_index >= 98
                              ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          {r.efficiency_index}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareSpid(
                              isCompare ? null : r.spid
                            );
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            isCompare
                              ? "bg-sky-600 text-white"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {isCompare ? "비교중" : "비교"}
                        </button>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detailed Breakdown & Grade Curve (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {!primaryCard ? (
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-10 text-center text-xs text-slate-400">
              좌측에서 선수를 검색하거나 상세 필터로 효율 분석을 실행하면, 선택된 카드의 6축 밸런스와 포지션별 핵심 스탯 평균 산출 내역이 표시됩니다.
            </div>
          ) : (
            <>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <SeasonBadge
                        seasonImg={primaryCard.season_img}
                        seasonCode={primaryCard.season_code}
                      />
                      <h3 className="text-sm font-bold text-slate-100">
                        {primaryCard.name} (+{primaryCard.grade}강)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {primaryCard.tier} · 효율 {primaryCard.efficiency_index}점 (핵심평균{" "}
                      {primaryCard.core_score} / 표기 OVR {primaryCard.effective_ovr})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectInPlayerLab(primaryCard.spid)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    선수 탐색
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <HexRadarChart
                  primaryData={primaryCard.six_face}
                  compareData={compareCard?.six_face || null}
                  primaryLabel={`${primaryCard.season_code} ${primaryCard.name}`}
                  compareLabel={
                    compareCard
                      ? `${compareCard.season_code} ${compareCard.name}`
                      : undefined
                  }
                  size={220}
                />

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">
                    강화 단계별 효율 곡선 (1~+{rules.maxEnhanceLevel}강)
                  </div>
                  <GradeEfficiencyBarChart
                    curve={primaryCard.grade_curve}
                    activeGrade={grade}
                    onSelectGrade={(g) => setGrade(g)}
                  />
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-100">
                    {position} 포지션 핵심 스탯 ({primaryCard.stat_breakdown.length}개) 평균 산출 내역
                  </h4>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    평균 {primaryCard.core_score}점
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {primaryCard.stat_breakdown.map((sb) => {
                    const diffFromOvr = sb.value - primaryCard.effective_ovr;
                    return (
                      <div
                        key={sb.stat}
                        className="flex items-center justify-between text-xs bg-[#0B0F17] px-3 py-2 rounded border border-slate-800/80"
                      >
                        <span className="text-slate-300">{sb.stat}</span>
                        <span className="font-mono tabular-nums font-semibold flex items-center gap-1">
                          <span className="text-emerald-400">{sb.value}</span>
                          <span
                            className={`text-[10px] ${
                              diffFromOvr >= 0
                                ? "text-sky-400"
                                : "text-slate-500"
                            }`}
                          >
                            ({diffFromOvr >= 0 ? `+${diffFromOvr}` : diffFromOvr})
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
