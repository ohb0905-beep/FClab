"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GradeCurvePoint,
  MarketOverviewHeatmapCell,
  MarketOverviewIndex,
  formatBpKorean,
  getOfficialSeasonImgUrl,
} from "@/lib/fclab-types";

export function PlayerAvatar({
  src,
  thumbUrl,
  spid,
  pid: explicitPid,
  name,
  size,
  className = "w-14 h-14",
}: {
  src?: string;
  thumbUrl?: string;
  spid: number;
  pid?: number;
  name: string;
  size?: number;
  className?: string;
}) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const pid = explicitPid || (spid % 1000000);

  useEffect(() => {
    setStage(0);
  }, [spid, src, thumbUrl]);

  const primarySrc =
    src ||
    thumbUrl ||
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`;
  const secondarySrc = `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`;
  const tertiarySrc = `https://fo4.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`;

  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  if (stage === 3) {
    return (
      <div
        style={sizeStyle}
        className={`${className} flex items-center justify-center bg-[#1E293B] text-slate-200 font-semibold text-xs rounded-md select-none shrink-0 border border-slate-700/80`}
        title={name}
      >
        {(name || "FC").slice(0, 2)}
      </div>
    );
  }

  const activeSrc =
    stage === 0 ? primarySrc : stage === 1 ? secondarySrc : tertiarySrc;

  return (
    <img
      src={activeSrc}
      alt={name}
      style={sizeStyle}
      referrerPolicy="no-referrer"
      onError={() =>
        setStage((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 3))
      }
      className={`${className} object-contain shrink-0`}
    />
  );
}

export function SeasonBadge({
  seasonImg,
  seasonCode,
  className = "h-4",
}: {
  seasonImg?: string;
  seasonCode: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = getOfficialSeasonImgUrl(seasonCode, seasonImg);
  if (!resolvedSrc || failed) {
    return (
      <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-300 tracking-tight px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
        {seasonCode}
      </span>
    );
  }
  return (
    <img
      src={resolvedSrc}
      alt={seasonCode}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} w-auto object-contain inline-block shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]`}
    />
  );
}

export function HexRadarChart({
  primaryData,
  primary,
  compareData,
  secondary,
  primaryLabel,
  compareLabel,
  secondaryLabel,
  size = 240,
  minVal = 50,
  maxVal = 140,
}: {
  primaryData?: Record<string, number>;
  primary?: Record<string, number>;
  compareData?: Record<string, number> | null;
  secondary?: Record<string, number> | null;
  primaryLabel?: string;
  compareLabel?: string;
  secondaryLabel?: string;
  size?: number;
  minVal?: number;
  maxVal?: number;
}) {
  const resolvedPrimary = primaryData || primary || {};
  const resolvedCompare = compareData ?? secondary ?? null;
  const resolvedCompareLabel = compareLabel || secondaryLabel;

  const keys = Object.keys(resolvedPrimary);
  if (keys.length < 3) return null;

  const center = size / 2;
  const radius = size * 0.35;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
    const norm = Math.max(0.1, Math.min(1.0, (value - minVal) / (maxVal - minVal)));
    const r = radius * norm;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
    const r = radius + 26;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const primaryPoints = keys
    .map((k, i) => {
      const pt = getPoint(i, resolvedPrimary[k] || 80);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  const comparePoints =
    resolvedCompare &&
    keys
      .map((k, i) => {
        const pt = getPoint(i, resolvedCompare[k] || 80);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {[0.25, 0.5, 0.75, 1.0].map((level) => {
          const pts = keys
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
              const r = radius * level;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            })
            .join(" ");
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#1E293B"
              strokeWidth="1"
            />
          );
        })}

        {keys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="#1E293B"
              strokeWidth="1"
            />
          );
        })}

        {comparePoints && (
          <polygon
            points={comparePoints}
            fill="rgba(59, 130, 246, 0.18)"
            stroke="#3B82F6"
            strokeWidth="2"
          />
        )}

        <polygon
          points={primaryPoints}
          fill="rgba(16, 185, 129, 0.22)"
          stroke="#10B981"
          strokeWidth="2"
        />

        {keys.map((k, i) => {
          const pt = getPoint(i, resolvedPrimary[k] || 80);
          const lbl = getLabelPoint(i);
          const pVal = resolvedPrimary[k] || 0;
          const cVal = resolvedCompare ? resolvedCompare[k] : null;
          return (
            <g key={k}>
              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#10B981" />
              <text
                x={lbl.x}
                y={lbl.y - 6}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] font-medium"
              >
                {k}
              </text>
              <text
                x={lbl.x}
                y={lbl.y + 8}
                textAnchor="middle"
                className="fill-slate-100 text-[11px] font-mono font-semibold"
              >
                {pVal}
                {cVal !== null && cVal !== undefined ? ` vs ${cVal}` : ""}
              </text>
            </g>
          );
        })}
      </svg>

      {(primaryLabel || resolvedCompareLabel) && (
        <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
          {primaryLabel && (
            <span className="text-emerald-400 font-medium">
              기준: {primaryLabel}
            </span>
          )}
          {resolvedCompareLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400 font-medium">
                비교: {resolvedCompareLabel}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface ChartEventMarker {
  date: string;
  label: string;
  type: "COUPON_EXPIRY" | "PACK_RELEASE" | "ENHANCE_DAY";
}

const DEFAULT_CHART_EVENT_MARKERS: ChartEventMarker[] = [
  { date: "10.03", label: "패키지 출시", type: "PACK_RELEASE" },
  { date: "10.10", label: "강화 데이", type: "ENHANCE_DAY" },
  { date: "10.16", label: "수수료 쿠폰 만료", type: "COUPON_EXPIRY" },
];

export function PriceTrendChart({
  points,
  eventMarkers = DEFAULT_CHART_EVENT_MARKERS,
}: {
  points: { date: string; bp: number; formatted: string }[];
  eventMarkers?: ChartEventMarker[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-500 border border-slate-800/80 rounded-lg">
        해당 강화 단계의 최근 30일 시세 그래프 데이터가 없습니다.
      </div>
    );
  }

  const width = 540;
  const height = 162;
  const padX = 24;
  const padY = 24;

  const values = points.map((p) => p.bp);
  const minBp = Math.min(...values);
  const maxBp = Math.max(...values);
  const span = Math.max(1, maxBp - minBp);

  const coords = points.map((p, idx) => {
    const x =
      padX +
      (idx / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((p.bp - minBp) / span) * (height - padY * 2);
    return { x, y, ...p };
  });

  // Match event markers to nearest point indices
  const resolvedMarkers = (eventMarkers || []).map((ev, mIdx) => {
    let idx = coords.findIndex((c) => c.date === ev.date);
    if (idx === -1 && coords.length >= 6) {
      const ratios = [0.22, 0.52, 0.78];
      idx = Math.min(
        coords.length - 2,
        Math.max(1, Math.floor(coords.length * (ratios[mIdx % ratios.length] || 0.5)))
      );
    }
    return idx >= 0 && coords[idx] ? { ...ev, idx, coord: coords[idx] } : null;
  }).filter((x): x is NonNullable<typeof x> => Boolean(x));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${coords[0].x},${height - padY} ${polyline} ${
    coords[coords.length - 1].x
  },${height - padY}`;

  const activePoint =
    hoverIdx !== null && coords[hoverIdx]
      ? coords[hoverIdx]
      : coords[coords.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          <span>선택 일자: {activePoint.date}</span>
          <span className="mx-2 text-slate-600">·</span>
          <span className="text-emerald-400 font-mono font-semibold tabular-nums">
            {activePoint.formatted} BP
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
          30일 최저 {points.reduce((a, b) => (a.bp < b.bp ? a : b)).formatted} / 최고{" "}
          {points.reduce((a, b) => (a.bp > b.bp ? a : b)).formatted}
        </div>
      </div>

      {/* Event Marker Legend Strip */}
      {resolvedMarkers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="text-slate-500 font-semibold">주요 시장 이벤트:</span>
          {resolvedMarkers.map((m, i) => {
            const badgeTone =
              m.type === "PACK_RELEASE"
                ? "bg-sky-500/15 text-sky-300 border-sky-500/40"
                : m.type === "ENHANCE_DAY"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/40";
            return (
              <span
                key={`${m.label}_${i}`}
                onMouseEnter={() => setHoverIdx(m.idx)}
                className={`px-1.5 py-0.5 border font-mono cursor-pointer transition ${badgeTone}`}
              >
                [{m.coord.date}] {m.label}
              </span>
            );
          })}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40 bg-[#0E1420] border border-slate-800/80 rounded-lg"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="bpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#bpAreaGrad)" />
        <polyline
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          points={polyline}
        />

        {/* Event Marker Vertical Lines & Badges */}
        {resolvedMarkers.map((m, i) => {
          const strokeColor =
            m.type === "PACK_RELEASE"
              ? "#38bdf8"
              : m.type === "ENHANCE_DAY"
                ? "#f59e0b"
                : "#f43f5e";
          return (
            <g key={`ev_${i}`}>
              <line
                x1={m.coord.x}
                y1={16}
                x2={m.coord.x}
                y2={height - padY}
                stroke={strokeColor}
                strokeDasharray="3 3"
                strokeWidth="1.2"
                opacity="0.8"
              />
              <circle
                cx={m.coord.x}
                cy={m.coord.y}
                r="3.5"
                fill={strokeColor}
                stroke="#0B0F17"
                strokeWidth="1.2"
              />
              <text
                x={m.coord.x}
                y={12}
                textAnchor="middle"
                fill={strokeColor}
                className="text-[9px] font-mono font-bold"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {coords.map((c, idx) => (
          <g key={idx}>
            <rect
              x={c.x - width / coords.length / 2}
              y={0}
              width={width / coords.length}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(idx)}
            />
            {(hoverIdx === idx || idx === coords.length - 1) && (
              <circle
                cx={c.x}
                cy={c.y}
                r="4"
                fill="#10B981"
                stroke="#0B0F17"
                strokeWidth="1.5"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function GradeEfficiencyBarChart({
  curve,
  activeGrade,
  onSelectGrade,
}: {
  curve: GradeCurvePoint[];
  activeGrade: number;
  onSelectGrade?: (grade: number) => void;
}) {
  if (!curve || curve.length === 0) return null;
  const maxEff = Math.max(...curve.map((c) => c.efficiency_index), 1);
  const bestGrade = curve.reduce((a, b) =>
    a.efficiency_index >= b.efficiency_index ? a : b
  ).grade;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {curve.map((pt) => {
          const pct = Math.max(15, Math.round((pt.efficiency_index / maxEff) * 100));
          const isBest = pt.grade === bestGrade;
          const isSelected = pt.grade === activeGrade;
          return (
            <button
              key={pt.grade}
              type="button"
              onClick={() => onSelectGrade && onSelectGrade(pt.grade)}
              className={`flex flex-col justify-between p-2.5 rounded-lg border text-left transition-colors ${
                isSelected
                  ? "bg-slate-800/90 border-emerald-500/80"
                  : "bg-[#111827] border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-slate-200">
                  +{pt.grade}강
                </span>
                {isBest && (
                  <span className="text-[10px] font-medium text-emerald-400">
                    추천
                  </span>
                )}
              </div>

              <div className="h-16 flex items-end my-2 bg-slate-900/70 rounded p-1">
                <div
                  style={{ height: `${pct}%` }}
                  className={`w-full rounded-sm transition-transform ${
                    isBest
                      ? "bg-emerald-500"
                      : isSelected
                      ? "bg-sky-400"
                      : "bg-slate-600"
                  }`}
                />
              </div>

              <div className="space-y-0.5">
                <div className="font-mono text-xs font-semibold text-slate-100 tabular-nums">
                  효율 {pt.efficiency_index}
                </div>
                <div className="font-mono text-[11px] text-slate-400 tabular-nums truncate">
                  {pt.bp_text}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FClab 전체 이적시장 시세 그래프 (최근 7일 / 30일 / 90일 시계열 라인/에어리어 차트) + 종합 지수 카드
 */
export function MarketOverviewIndexCard({
  overviewIndex,
}: {
  overviewIndex: MarketOverviewIndex;
}) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const totalCount = Math.max(
    1,
    overviewIndex.advancingCount +
      overviewIndex.flatCount +
      overviewIndex.decliningCount
  );
  const advPct = Math.round((overviewIndex.advancingCount / totalCount) * 100);
  const flatPct = Math.round((overviewIndex.flatCount / totalCount) * 100);
  const decPct = Math.max(0, 100 - advPct - flatPct);

  const isPositive1d = overviewIndex.changePct1d >= 0;
  const activePeriodChangePct =
    period === "7d"
      ? overviewIndex.changePct7d ?? 0
      : period === "90d"
      ? overviewIndex.changePct90d ?? overviewIndex.changePct7d ?? 0
      : overviewIndex.changePct30d ?? overviewIndex.changePct7d ?? 0;

  const isPositivePeriod = activePeriodChangePct >= 0;

  const series = useMemo(() => {
    if (period === "7d") return overviewIndex.trend7d ?? [];
    if (period === "90d") return overviewIndex.trend90d ?? [];
    return overviewIndex.trend30d ?? [];
  }, [overviewIndex, period]);

  const width = 860;
  const height = 240;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const { minVal, maxVal, coords, linePath, areaPath } = useMemo(() => {
    if (!series.length) {
      return { minVal: 95, maxVal: 105, coords: [], linePath: "", areaPath: "" };
    }
    const vals = series.map((p) => p.indexValue);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const pad = Math.max(0.45, (rawMax - rawMin) * 0.22);
    const lo = rawMin - pad;
    const hi = rawMax + pad;
    const span = Math.max(0.5, hi - lo);

    const pts = series.map((pt, idx) => {
      const x = padLeft + (idx / Math.max(1, series.length - 1)) * plotW;
      const y = padTop + (1 - (pt.indexValue - lo) / span) * plotH;
      return { x, y, pt };
    });

    const lPath = pts
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    const aPath =
      pts.length > 1
        ? `${lPath} L${pts[pts.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`
        : "";

    return {
      minVal: lo,
      maxVal: hi,
      coords: pts,
      linePath: lPath,
      areaPath: aPath,
    };
  }, [series, plotW, plotH]);

  const activePoint =
    hoverIdx !== null && coords[hoverIdx]
      ? coords[hoverIdx]
      : coords[coords.length - 1] ?? null;

  const strokeColor = isPositivePeriod ? "#f43f5e" : "#38bdf8";

  return (
    <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
      {/* Top Header & Period Selector */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded font-bold">
              MARKET INDEX TREND CHART
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 rounded">
              절사평균(10%) · EMA 평활 · 기준가 스냅샷 고정
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1.5">
            전체 이적시장 시세 그래프 (+8~+11강 코어 마켓 지수 추이)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            최근 7일 / 30일 / 90일 전체 시장 시세 흐름과 지수 등락을 한눈에 확인합니다 (기준 스냅샷 100.0pt)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
              {overviewIndex.currentIndex.toFixed(2)}
            </div>
            <div className="flex items-center justify-end gap-2 mt-0.5 text-xs font-mono">
              <span
                className={
                  isPositive1d
                    ? "text-rose-600 dark:text-rose-400 font-bold"
                    : "text-sky-600 dark:text-sky-400 font-bold"
                }
              >
                1일 {isPositive1d ? "+" : ""}
                {overviewIndex.changePct1d.toFixed(2)}%
              </span>
              <span
                className={
                  isPositivePeriod
                    ? "text-rose-500 dark:text-rose-300 font-bold"
                    : "text-sky-500 dark:text-sky-300 font-bold"
                }
              >
                · {period === "7d" ? "7일" : period === "30d" ? "30일" : "90일"}{" "}
                {isPositivePeriod ? "+" : ""}
                {activePeriodChangePct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* 최근 7일 / 30일 / 90일 토글 버튼 */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1">
            {(
              [
                {
                  id: "7d",
                  label: "최근 7일",
                  pct: overviewIndex.changePct7d ?? 0,
                },
                {
                  id: "30d",
                  label: "최근 30일",
                  pct:
                    overviewIndex.changePct30d ?? overviewIndex.changePct7d ?? 0,
                },
                {
                  id: "90d",
                  label: "최근 90일",
                  pct:
                    overviewIndex.changePct90d ?? overviewIndex.changePct7d ?? 0,
                },
              ] as const
            ).map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setPeriod(tab.id);
                    setHoverIdx(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      active
                        ? "text-sky-100"
                        : tab.pct >= 0
                        ? "text-rose-500 dark:text-rose-400"
                        : "text-sky-500 dark:text-sky-400"
                    }`}
                  >
                    {tab.pct >= 0 ? `+${tab.pct.toFixed(1)}%` : `${tab.pct.toFixed(1)}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Large Prominent Market Index Time-Series Line/Area Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080d1a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              {period === "7d"
                ? "최근 7일 전체 시장 지수 흐름"
                : period === "30d"
                ? "최근 30일 전체 시장 지수 흐름"
                : "최근 90일 전체 시장 지수 흐름"}
            </span>
            {activePoint && (
              <span className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 px-2.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                {activePoint.pt.date} · 지수{" "}
                <strong className="text-slate-950 dark:text-white">
                  {activePoint.pt.indexValue.toFixed(2)}pt
                </strong>{" "}
                ({activePoint.pt.returnPct >= 0 ? "+" : ""}
                {activePoint.pt.returnPct.toFixed(2)}%)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            기준가 스냅샷 앵커 = 100.00pt
          </span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 sm:h-64 select-none overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="fcMarketIndexAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.34" />
              <stop offset="75%" stopColor={strokeColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = padTop + r * plotH;
            const val = maxVal - r * (maxVal - minVal);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray={idx === 2 ? "none" : "3 3"}
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area & Line */}
          {areaPath && <path d={areaPath} fill="url(#fcMarketIndexAreaGrad)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-axis Date Labels */}
          {coords.map((c, idx) => {
            const step = Math.max(1, Math.floor(coords.length / 6));
            const showLabel =
              idx === 0 || idx === coords.length - 1 || idx % step === 0;
            return (
              <g key={c.pt.date}>
                {showLabel && (
                  <text
                    x={c.x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {c.pt.date.slice(5).replace("-", ".")}
                  </text>
                )}
              </g>
            );
          })}

          {/* Active Point Crosshair & Marker */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + plotH}
                stroke="#38bdf8"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={5.5}
                fill={strokeColor}
                stroke="#0f172a"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Invisible Hover Columns */}
          {coords.map((c, idx) => {
            const colW = plotW / Math.max(1, coords.length);
            return (
              <rect
                key={`hit-${c.pt.date}`}
                x={c.x - colW / 2}
                y={padTop}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Advance / Flat / Decline Breadth Bar */}
      <div className="space-y-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            시장 등락 종목 비중 (실사용 메타 표본 {totalCount}종)
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              ▲ 상승 {overviewIndex.advancingCount} ({advPct}%)
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              ▬ 보합 {overviewIndex.flatCount} ({flatPct}%)
            </span>
            <span className="text-sky-600 dark:text-sky-400 font-bold">
              ▼ 하락 {overviewIndex.decliningCount} ({decPct}%)
            </span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full flex overflow-hidden">
          <div
            className="bg-rose-500 h-full transition-all"
            style={{ width: `${advPct}%` }}
            title={`상승 ${advPct}%`}
          />
          <div
            className="bg-slate-400 dark:bg-slate-500 h-full transition-all"
            style={{ width: `${flatPct}%` }}
            title={`보합 ${flatPct}%`}
          />
          <div
            className="bg-sky-500 h-full transition-all"
            style={{ width: `${decPct}%` }}
            title={`하락 ${decPct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <span>
            {advPct >= 50
              ? "🔥 매수세 확산 우위 (주류 금카 단기 반등·상승장)"
              : decPct >= 50
                ? "❄️ 매도·조정 우위 (수수료 쿠폰·패키지 물량 소화 구간)"
                : "⚖️ 시즌·특성별 순환매 및 수급 균형 장세"}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 실사용 메타 시즌 히트맵 (Treemap 스타일 그리드, 구시즌 제외 · 공식 시즌 로고 아이콘 + 시즌명 + 평균 등락률)
 */
export function MarketSeasonGradeHeatmap({
  cells,
  onSelectCell,
}: {
  cells: MarketOverviewHeatmapCell[];
  onSelectCell?: (seasonCode: string, grade: number) => void;
}) {
  if (!cells || cells.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs text-slate-500 dark:text-slate-400">
        시즌/강화별 히트맵 표본이 없습니다.
      </div>
    );
  }

  // -5% (파란색/하락) ~ 0% (슬레이트 중립) ~ +5% (빨간색/상승) 컬러 매핑
  const getHeatmapCellTone = (changePct: number) => {
    if (changePct >= 3.5) {
      return "bg-rose-500/20 dark:bg-rose-600/35 border-rose-400 dark:border-rose-400/70 text-rose-950 dark:text-rose-100";
    }
    if (changePct >= 1.5) {
      return "bg-rose-500/12 dark:bg-rose-500/25 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200";
    }
    if (changePct >= 0.35) {
      return "bg-rose-500/8 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200";
    }
    if (changePct <= -3.5) {
      return "bg-sky-500/20 dark:bg-sky-600/35 border-sky-400 dark:border-sky-400/70 text-sky-950 dark:text-sky-100";
    }
    if (changePct <= -1.5) {
      return "bg-sky-500/12 dark:bg-sky-500/25 border-sky-300 dark:border-sky-500/50 text-sky-900 dark:text-sky-200";
    }
    if (changePct <= -0.35) {
      return "bg-sky-500/8 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-200";
    }
    return "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              실사용 핵심 메타 시즌 시세 히트맵 (Treemap)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              비주류 구시즌 제외 · 상위 랭커 실사용 {cells.length}개 메타 시즌
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            현재 랭커 및 유저 실사용률이 높은 핵심 메타 시즌의 공식 시즌 카드 로고 아이콘, 시즌명, 평균 등락률(%)을 표시합니다.
          </p>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 dark:bg-sky-600/35 border border-sky-400/60 text-sky-800 dark:text-sky-200 font-bold">
            -4%↓ 하락
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            0% 보합
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 dark:bg-rose-600/35 border border-rose-400/60 text-rose-800 dark:text-rose-200 font-bold">
            +4%↑ 상승
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {cells.map((cell, idx) => {
          const isLargeTile = idx < 2;
          const toneClass = getHeatmapCellTone(cell.changePct7d);
          return (
            <button
              key={`${cell.seasonCode}_${cell.grade}`}
              type="button"
              onClick={() =>
                onSelectCell && onSelectCell(cell.seasonCode, cell.grade)
              }
              className={`p-3 rounded-xl border text-left transition hover:brightness-105 cursor-pointer flex flex-col justify-between ${toneClass} ${
                isLargeTile ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {/* 공식 시즌 카드 아이콘 이미지 + 시즌명 */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <SeasonBadge
                    seasonImg={cell.seasonImg}
                    seasonCode={cell.seasonCode}
                    className="h-5"
                  />
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white truncate">
                    {cell.seasonName || cell.seasonCode}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-950/70 border border-slate-300/60 dark:border-white/10 text-slate-800 dark:text-slate-200 shrink-0">
                  +{cell.grade}강
                </span>
              </div>

              {/* 평균 등락률(%) */}
              <div className="my-2">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-mono font-black tabular-nums">
                    {cell.changePct7d >= 0 ? "+" : ""}
                    {cell.changePct7d.toFixed(2)}%
                  </span>
                  {cell.signalTag && (
                    <span className="text-[10px] font-bold opacity-90 truncate">
                      {cell.signalTag}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono opacity-80 mt-0.5">
                  1일 {cell.changePct1d >= 0 ? "+" : ""}
                  {cell.changePct1d.toFixed(2)}% · 코어 표본 {cell.sampleCount}종
                </div>
              </div>

              <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 font-bold border-t border-slate-300/50 dark:border-white/10 pt-1.5 truncate">
                평균 {formatBpKorean(cell.avgBp)} BP
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

