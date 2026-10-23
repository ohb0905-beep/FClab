"use client";

import React, { useState } from "react";
import { GradeCurvePoint } from "@/lib/fclab-types";

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
}: {
  primaryData?: Record<string, number>;
  primary?: Record<string, number>;
  compareData?: Record<string, number> | null;
  secondary?: Record<string, number> | null;
  primaryLabel?: string;
  compareLabel?: string;
  secondaryLabel?: string;
  size?: number;
}) {
  const resolvedPrimary = primaryData || primary || {};
  const resolvedCompare = compareData ?? secondary ?? null;
  const resolvedCompareLabel = compareLabel || secondaryLabel;

  const keys = Object.keys(resolvedPrimary);
  if (keys.length < 3) return null;

  const center = size / 2;
  const radius = size * 0.35;
  const minVal = 50;
  const maxVal = 140;

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

export function PriceTrendChart({
  points,
}: {
  points: { date: string; bp: number; formatted: string }[];
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
  const height = 150;
  const padX = 24;
  const padY = 20;

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
      <div className="flex items-center justify-between text-xs text-slate-400">
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

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 bg-[#0E1420] border border-slate-800/80 rounded-lg"
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
