"use client";

import React, { useState } from "react";
import {
  GradeCurvePoint,
  MarketOverviewHeatmapCell,
  MarketOverviewIndex,
  formatBpKorean,
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
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const pid = explicitPid || (spid % 1000000);
  const primarySrc =
    src ||
    thumbUrl ||
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`;
  const secondarySrc = `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`;

  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  if (stage === 2) {
    return (
      <div
        style={sizeStyle}
        className={`${className} flex items-center justify-center bg-slate-800/80 text-slate-300 font-semibold text-xs rounded-md select-none shrink-0 border border-slate-700/60`}
        title={name}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={stage === 0 ? primarySrc : secondarySrc}
      alt={name}
      style={sizeStyle}
      referrerPolicy="no-referrer"
      onError={() => setStage((prev) => (prev === 0 ? 1 : 2))}
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
  if (!seasonImg || failed) {
    return (
      <span className="font-mono text-[11px] font-semibold text-amber-300 tracking-tight">
        {seasonCode}
      </span>
    );
  }
  return (
    <img
      src={seasonImg}
      alt={seasonCode}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} w-auto object-contain inline-block shrink-0`}
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
 * FClab 마켓 종합 지수 카드 (상승/보합/하락 종목 비중 바 포함)
 */
export function MarketOverviewIndexCard({
  overviewIndex,
}: {
  overviewIndex: MarketOverviewIndex;
}) {
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
  const isPositive7d = (overviewIndex.changePct7d || 0) >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
            FCLAB COMPOSITE INDEX
          </span>
          <h3 className="text-base font-bold text-white mt-1.5">
            FClab 마켓 종합 지수 (+8~+11강 주류 기준)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            초기 기준점(100.0) 대비 주류 금카 시장의 동일가중 가격 흐름과 상승·하락 확산도를 실시간 집계합니다.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
            {overviewIndex.currentIndex.toFixed(2)}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1 text-xs font-mono">
            <span
              className={
                isPositive1d
                  ? "text-rose-400 font-bold"
                  : "text-sky-400 font-bold"
              }
            >
              1일 {isPositive1d ? "+" : ""}
              {overviewIndex.changePct1d.toFixed(2)}%
            </span>
            {overviewIndex.changePct7d !== undefined && (
              <span
                className={
                  isPositive7d ? "text-rose-300" : "text-sky-300"
                }
              >
                · 7일 {isPositive7d ? "+" : ""}
                {overviewIndex.changePct7d.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Advance / Flat / Decline Breadth Bar */}
      <div className="space-y-2 bg-slate-950/80 border border-slate-800 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-300">
            시장 등락 종목 비중 (총 {totalCount}종)
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-rose-400 font-semibold">
              ▲ 상승 {overviewIndex.advancingCount}종 ({advPct}%)
            </span>
            <span className="text-slate-400">
              ▬ 보합 {overviewIndex.flatCount}종 ({flatPct}%)
            </span>
            <span className="text-sky-400 font-semibold">
              ▼ 하락 {overviewIndex.decliningCount}종 ({decPct}%)
            </span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-800 flex overflow-hidden">
          <div
            className="bg-rose-500 h-full transition-all"
            style={{ width: `${advPct}%` }}
            title={`상승 ${advPct}%`}
          />
          <div
            className="bg-slate-500 h-full transition-all"
            style={{ width: `${flatPct}%` }}
            title={`보합 ${flatPct}%`}
          />
          <div
            className="bg-sky-500 h-full transition-all"
            style={{ width: `${decPct}%` }}
            title={`하락 ${decPct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>
            {advPct >= 50
              ? "🔥 매수세 확산 우위 (주류 금카 단기 반등·상승장)"
              : decPct >= 50
                ? "❄️ 매도·조정 우위 (수수료 쿠폰·패키지 물량 소화 구간)"
                : "⚖️ 시즌·특성별 순환매 및 수급 균형 장세"}
          </span>
          {overviewIndex.updatedAt && (
            <span className="font-mono text-[10px] text-slate-500">
              갱신: {overviewIndex.updatedAt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 시즌/강화별 등락 히트맵 (Treemap 스타일 그리드, -5% 파란색 ~ +5% 빨간색 컬러 그라데이션)
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
      <div className="bg-slate-900/80 border border-slate-800 p-5 text-xs text-slate-400">
        시즌/강화별 히트맵 표본이 없습니다.
      </div>
    );
  }

  // -5% (파란색/하락) ~ 0% (슬레이트 중립) ~ +5% (빨간색/상승) 컬러 매핑
  const getHeatmapCellTone = (changePct: number) => {
    if (changePct >= 4.0) {
      return "bg-rose-600/35 border-rose-400/70 text-rose-100";
    }
    if (changePct >= 2.0) {
      return "bg-rose-500/25 border-rose-500/50 text-rose-200";
    }
    if (changePct >= 0.5) {
      return "bg-rose-500/15 border-rose-500/30 text-rose-200";
    }
    if (changePct <= -4.0) {
      return "bg-sky-600/35 border-sky-400/70 text-sky-100";
    }
    if (changePct <= -2.0) {
      return "bg-sky-500/25 border-sky-500/50 text-sky-200";
    }
    if (changePct <= -0.5) {
      return "bg-sky-500/15 border-sky-500/30 text-sky-200";
    }
    return "bg-slate-800/70 border-slate-700 text-slate-200";
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white">
            시즌 · 강화단계별 시가총액 & 등락률 히트맵 (Treemap Grid)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            시가총액(평균가×표본수) 순 상위 시즌·강화 섹터의 7일 등락률을 색상 농도(-5% 파랑 ~ +5% 빨강)로 시각화합니다.
          </p>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
          <span className="px-1.5 py-0.5 bg-sky-600/35 border border-sky-400/60 text-sky-200">
            -5%↓ 급락
          </span>
          <span className="px-1.5 py-0.5 bg-sky-500/15 border border-sky-500/30 text-sky-300">
            -2%
          </span>
          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300">
            0% 보합
          </span>
          <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-300">
            +2%
          </span>
          <span className="px-1.5 py-0.5 bg-rose-600/35 border border-rose-400/60 text-rose-200">
            +5%↑ 급등
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
              className={`p-3 border text-left transition hover:brightness-110 flex flex-col justify-between ${toneClass} ${
                isLargeTile ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-bold text-xs text-white">
                  [{cell.seasonCode}] +{cell.grade}강
                </span>
                {cell.signalTag && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-950/70 border border-white/10 truncate">
                    {cell.signalTag}
                  </span>
                )}
              </div>

              <div className="my-2">
                <div className="text-base font-mono font-bold tabular-nums">
                  {cell.changePct7d >= 0 ? "+" : ""}
                  {cell.changePct7d.toFixed(2)}%
                </div>
                <div className="text-[10px] font-mono opacity-80">
                  1일 {cell.changePct1d >= 0 ? "+" : ""}
                  {cell.changePct1d.toFixed(2)}% · 표본 {cell.sampleCount}종
                </div>
              </div>

              <div className="text-[11px] font-mono text-amber-300 font-semibold border-t border-white/10 pt-1.5 truncate">
                평균 {formatBpKorean(cell.avgBp)} BP
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
