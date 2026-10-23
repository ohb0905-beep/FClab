"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Sliders,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import {
  CardEfficiencyResult,
  getPositionToneClass,
} from "@/lib/fclab-types";
import {
  PlayerAvatar,
  SeasonBadge,
  HexRadarChart,
  GradeEfficiencyBarChart,
} from "./VisualCharts";

interface CardEfficiencyLabViewProps {
  initialPlayerName?: string;
  initialPosition?: string;
  positionWeightsMap: Record<string, Record<string, number>>;
  onInspectInPlayerLab: (spid: number) => void;
}

export default function CardEfficiencyLabView({
  initialPlayerName = "손흥민",
  initialPosition = "LW",
  positionWeightsMap,
  onInspectInPlayerLab,
}: CardEfficiencyLabViewProps) {
  const [query, setQuery] = useState(initialPlayerName);
  const [position, setPosition] = useState(initialPosition || "LW");
  const [grade, setGrade] = useState(5);
  const [teamColor, setTeamColor] = useState(3);
  const [maxBp, setMaxBp] = useState(0);

  const [customWeights, setCustomWeights] = useState<Record<string, number>>(
    positionWeightsMap[initialPosition || "LW"] || {}
  );
  const [showWeightEditor, setShowWeightEditor] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CardEfficiencyResult[]>([]);
  const [selectedSpid, setSelectedSpid] = useState<number | null>(null);
  const [compareSpid, setCompareSpid] = useState<number | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string>("");

  useEffect(() => {
    if (initialPlayerName) setQuery(initialPlayerName);
    if (initialPosition) {
      setPosition(initialPosition);
      if (positionWeightsMap[initialPosition]) {
        setCustomWeights({ ...positionWeightsMap[initialPosition] });
      }
    }
  }, [initialPlayerName, initialPosition, positionWeightsMap]);

  const handlePositionChange = (newPos: string) => {
    setPosition(newPos);
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
      weightsObj?: Record<string, number>
    ) => {
      setLoading(true);
      try {
        const res = await fetch("/api/fclab/v1/efficiency/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: qStr,
            position: posStr,
            grade: gNum,
            team_color: tcNum,
            max_bp: maxBpVal,
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
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    runEfficiencyAnalysis(
      query,
      position,
      grade,
      teamColor,
      maxBp,
      customWeights
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, grade, teamColor, maxBp]);

  const primaryCard =
    results.find((r) => r.spid === selectedSpid) || results[0] || null;
  const compareCard =
    results.find((r) => r.spid === compareSpid) || null;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              Card Efficiency Lab — 포지션 핵심 스탯 가중치 기반 가성비 연구소
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              단순 OVR이 아닌 포지션별 실질 중요 능력치 가중합 점수와 이적시장 시세를 비교해 최적의 시즌·강화 카드를 도출합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWeightEditor((v) => !v)}
              className="px-3 py-1.5 bg-[#0B0F17] border border-slate-800 hover:border-emerald-500 text-xs text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              포지션 가중치 커스터마이징
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
              customWeights
            );
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2"
        >
          <div className="lg:col-span-2 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="선수 이름 입력 (비워두면 해당 포지션 전체 비교)"
              className="flex-1 px-3 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              효율 분석
            </button>
          </div>

          <div>
            <select
              value={position}
              onChange={(e) => handlePositionChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs text-slate-200"
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
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            >
              {[1, 3, 5, 6, 7, 8].map((g) => (
                <option key={g} value={g}>
                  비교 강화 단계: +{g}강
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={maxBp}
              onChange={(e) => setMaxBp(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
            >
              <option value={0}>예산 제한 없음 (전체)</option>
              <option value={50_000_000}>5,000만 BP 이하</option>
              <option value={500_000_000}>5억 BP 이하</option>
              <option value={5_000_000_000}>50억 BP 이하</option>
              <option value={50_000_000_000}>500억 BP 이하</option>
            </select>
          </div>
        </form>

        {/* Custom Weights Editor Drawer */}
        {showWeightEditor && (
          <div className="p-4 bg-[#0B0F17] border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                {position} 포지션 핵심 스탯 가중치 설정 (슬라이더 조절 후 재계산)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const def = positionWeightsMap[position] || {};
                    setCustomWeights({ ...def });
                    runEfficiencyAnalysis(
                      query,
                      position,
                      grade,
                      teamColor,
                      maxBp,
                      def
                    );
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값 복원
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runEfficiencyAnalysis(
                      query,
                      position,
                      grade,
                      teamColor,
                      maxBp,
                      customWeights
                    )
                  }
                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded"
                >
                  가중치 적용 재분석
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(customWeights).map(([sName, wVal]) => (
                <div key={sName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{sName}</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round(wVal * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.40"
                    step="0.02"
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
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              01. 카드별 코어 능력치 및 가성비 효율 순위 (+{grade}강 기준)
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              조회: {analyzedAt.slice(0, 16)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-[#0B0F17]/60">
                  <th className="py-2.5 px-3 font-medium">순위</th>
                  <th className="py-2.5 px-3 font-medium">시즌 · 선수명</th>
                  <th className="py-2.5 px-3 font-medium text-right">적용 OVR</th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    {position} 코어 점수
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">+{grade}강 시세</th>
                  <th className="py-2.5 px-3 font-medium text-right">효율 지수</th>
                  <th className="py-2.5 px-3 font-medium text-right">비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {results.map((r, idx) => {
                  const isPrimary = r.spid === primaryCard?.spid;
                  const isCompare = r.spid === compareCard?.spid;
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
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-300 tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar
                            src={r.thumb_url}
                            spid={r.spid}
                            name={r.name}
                            className="w-8 h-8"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <SeasonBadge
                                seasonImg={r.season_img}
                                seasonCode={r.season_code}
                              />
                              <span className="font-semibold text-slate-100">
                                {r.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              <span className={getPositionToneClass(r.primary_position)}>
                                {r.primary_position}
                              </span>{" "}
                              · 급여 {r.salary} · {r.tier.split(" ")[0]}등급
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {r.effective_ovr}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-300">
                        {r.core_score}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {r.bp_text}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-400">
                        {r.efficiency_index}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareSpid(r.spid);
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium ${
                            isCompare
                              ? "bg-sky-600 text-white"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {isCompare ? "비교중" : "비교대상"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detailed Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {primaryCard && (
            <>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-400 font-medium">
                      최적 효율 추천 카드 분석
                    </div>
                    <h3 className="text-base font-bold text-slate-100 mt-0.5">
                      {primaryCard.season_code} {primaryCard.name} (+{grade}강)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectInPlayerLab(primaryCard.spid)}
                    className="text-xs text-slate-300 hover:text-emerald-400 flex items-center gap-1"
                  >
                    선수 상세 이동
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

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-200">
                    {position} 포지션 핵심 스탯 가중합 기여도 상세
                  </div>
                  {primaryCard.stat_breakdown.map((item) => {
                    const compItem = compareCard?.stat_breakdown.find(
                      (c) => c.stat === item.stat
                    );
                    const delta = compItem ? item.value - compItem.value : null;
                    return (
                      <div
                        key={item.stat}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-400">
                          {item.stat}{" "}
                          <span className="text-slate-500 font-mono">
                            (가중치 {item.weight}%)
                          </span>
                        </span>
                        <div className="font-mono tabular-nums flex items-center gap-2">
                          <span className="text-slate-100 font-semibold">
                            {item.value}
                          </span>
                          {delta !== null && delta !== 0 && (
                            <span
                              className={
                                delta > 0 ? "text-emerald-400" : "text-rose-400"
                              }
                            >
                              ({delta > 0 ? `+${delta}` : delta})
                            </span>
                          )}
                          <span className="text-slate-500">
                            기여 {item.contribution}점
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">
                    강화 단계별 가성비 변곡점 (1강 ~ 8강)
                  </div>
                  <GradeEfficiencyBarChart
                    curve={primaryCard.grade_curve}
                    activeGrade={grade}
                    onSelectGrade={(g) => setGrade(g)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
