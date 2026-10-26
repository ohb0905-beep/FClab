"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  GitCompare,
  Info,
  Layers,
  LineChart as LineChartIcon,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import {
  MarketLabDashboardPayload,
  NewTraitMetaGroup,
  PlayerCard,
  TraitControlledPremiumItem,
  TraitMetaCatalogItem,
  TraitRepresentativePlayerItem,
  formatBpKorean,
} from "@/lib/fclab-types";
import {
  ChartEventMarker,
  MarketOverviewIndexCard,
  MarketSeasonGradeHeatmap,
  SeasonBadge,
} from "@/components/fclab/VisualCharts";

interface ChartSeriesConfig {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  isArea?: boolean;
  formatValue?: (v: number) => string;
}

const DEFAULT_MARKET_CHART_EVENTS: ChartEventMarker[] = [
  { date: "10.03", label: "패키지 출시", type: "PACK_RELEASE" },
  { date: "10.10", label: "강화 데이", type: "ENHANCE_DAY" },
  { date: "10.16", label: "수수료 쿠폰 만료", type: "COUPON_EXPIRY" },
];

const TRAIT_COMPARE_COLORS = [
  "#0284c7", // sky-600
  "#e11d48", // rose-600
  "#d97706", // amber-600
  "#059669", // emerald-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
];

const META_GROUP_ORDER: {
  key: NewTraitMetaGroup | "ALL";
  label: string;
  shortDesc: string;
}[] = [
  {
    key: "ALL",
    label: "전체 신규 특성 (17종)",
    shortDesc: "공격·중원·수비·GK 전체 신규 특성 개별 목록",
  },
  {
    key: "공격 특성",
    label: "⚔️ 공격 특성 (6종)",
    shortDesc:
      "크로스 포쳐 · 아크로바틱 피니셔 · 라인 브레이커 · 스피드스터 · 트릭스터 · 타이탄",
  },
  {
    key: "중원 특성",
    label: "🎯 중원 특성 (3종)",
    shortDesc: "커맨더 · 레이저 슈터 · 2개의 심장",
  },
  {
    key: "수비 특성",
    label: "🛡️ 수비 특성 (5종)",
    shortDesc: "프레데터 · 파이터 · 와일드 태클러 · 블로커 · 체이서",
  },
  {
    key: "GK 특성",
    label: "🧤 GK 특성 (3종)",
    shortDesc: "GK 공중볼 장악 · 데드아이 · 빠른 반응",
  },
];

const NEW_TRAIT_TIER_ROWS: Array<{
  tier: "S" | "A" | "B" | "C";
  title: string;
  subtitle: string;
  badgeCls: string;
  rowBorderCls: string;
  headerBgCls: string;
  traits: string[];
}> = [
  {
    tier: "S",
    title: "S티어 (메타 필수)",
    subtitle: "상위 랭커 채택률 및 8강 시세 프리미엄 최상위 1티어 코어 특성",
    badgeCls: "bg-rose-600 text-white",
    rowBorderCls: "border-rose-500/40 bg-rose-950/10",
    headerBgCls: "bg-rose-500/15 border-rose-500/30 text-rose-200",
    traits: ["라인 브레이커", "레이저 슈터", "2개의 심장", "스피드스터", "파이터"],
  },
  {
    tier: "A",
    title: "A티어 (고성능 주류)",
    subtitle: "포지션별 확실한 체감 우위와 높은 시세 방어력을 지닌 주류 특성",
    badgeCls: "bg-amber-500 text-slate-950",
    rowBorderCls: "border-amber-500/40 bg-amber-950/10",
    headerBgCls: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    traits: ["아크로바틱 피니셔", "타이탄", "커맨더", "프레데터", "블로커", "체이서"],
  },
  {
    tier: "B",
    title: "B티어 (상황별 유효)",
    subtitle: "전술 스타일(크로스·개인기·강압박) 및 GK 세팅에 따라 유효한 특성",
    badgeCls: "bg-sky-500 text-slate-950",
    rowBorderCls: "border-sky-500/35 bg-sky-950/10",
    headerBgCls: "bg-sky-500/15 border-sky-500/30 text-sky-200",
    traits: ["크로스 포쳐", "트릭스터", "와일드 태클러", "GK 빠른 반응"],
  },
  {
    tier: "C",
    title: "C티어 (비주류)",
    subtitle: "특정 상황 한정 발동으로 시세 프리미엄 영향도가 상대적으로 낮은 특성",
    badgeCls: "bg-slate-600 text-slate-100",
    rowBorderCls: "border-slate-700 bg-slate-900/40",
    headerBgCls: "bg-slate-800/80 border-slate-700 text-slate-300",
    traits: ["GK 공중볼 장악", "GK 데드아이"],
  },
];

function MarketMultiLineChart({
  data,
  xKey,
  series,
  height = 220,
  eventMarkers = DEFAULT_MARKET_CHART_EVENTS,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeriesConfig[];
  height?: number;
  eventMarkers?: ChartEventMarker[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0 || series.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/40">
        표시할 시계열 데이터가 없습니다.
      </div>
    );
  }

  const width = 680;
  const padX = 32;
  const padY = 24;

  const allValues: number[] = [];
  for (const row of data) {
    for (const s of series) {
      const v = Number(row[s.key]);
      if (Number.isFinite(v)) allValues.push(v);
    }
  }
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const span = Math.max(1e-6, maxVal - minVal);

  const toX = (idx: number) =>
    padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
  const toY = (val: number) =>
    height - padY - ((val - minVal) / span) * (height - padY * 2);

  const activeIdx = hoverIdx !== null ? hoverIdx : data.length - 1;
  const activeRow = data[activeIdx] ?? data[data.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <div className="flex items-center gap-3 flex-wrap">
          {series.map((s) => {
            const val = Number(activeRow?.[s.key] ?? 0);
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  {s.label}:
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {s.formatValue ? s.formatValue(val) : val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          기준일: {String(activeRow?.[xKey] ?? "-")}
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padY + ratio * (height - padY * 2);
            const labelVal = maxVal - ratio * span;
            return (
              <g key={idx}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padX - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                >
                  {labelVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {eventMarkers.map((ev, i) => {
            const matchIdx = data.findIndex((r) =>
              String(r[xKey] ?? "").endsWith(ev.date)
            );
            if (matchIdx < 0) return null;
            const x = toX(matchIdx);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padY}
                  x2={x}
                  y2={height - padY}
                  stroke="#f59e0b"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                  opacity={0.6}
                />
                <text
                  x={x}
                  y={padY - 6}
                  textAnchor="middle"
                  className="fill-amber-600 dark:fill-amber-400 text-[9px] font-semibold"
                >
                  {ev.label}
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            const pts = data.map((row, idx) => {
              const v = Number(row[s.key] ?? minVal);
              return `${toX(idx).toFixed(1)},${toY(
                Number.isFinite(v) ? v : minVal
              ).toFixed(1)}`;
            });
            return (
              <g key={s.key}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.2"
                  strokeDasharray={s.dashed ? "4 3" : undefined}
                  points={pts.join(" ")}
                />
                {hoverIdx !== null && data[hoverIdx] && (
                  <circle
                    cx={toX(hoverIdx)}
                    cy={toY(Number(data[hoverIdx][s.key] ?? minVal))}
                    r="4"
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {data.map((_, idx) => {
            const sliceW = (width - padX * 2) / Math.max(1, data.length);
            return (
              <rect
                key={idx}
                x={toX(idx) - sliceW / 2}
                y={0}
                width={sliceW}
                height={height}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

interface CombinedTraitItem {
  trait_id: string;
  trait_name: string;
  category: string;
  meta_group: NewTraitMetaGroup;
  release_or_patch_note: string;
  in_game_effect: string;
  icon_url?: string;
  ranker_usage_pct: number;
  user_usage_pct: number;
  controlled_premium_pct: number;
  avg_premium_bp_diff: number;
  avg_holder_bp: number;
  return_1d_pct: number;
  return_7d_pct: number;
  return_30d_pct: number;
  sample_count: number;
  meta_tier: string;
  position_suitability: Record<string, number>;
  price_trend_30d: { date: string; index_value: number }[];
  representative_players: TraitRepresentativePlayerItem[];
  matched_examples: TraitControlledPremiumItem["matched_examples"];
}

export interface MarketLabViewProps {
  initialCards: PlayerCard[];
  onInspectPlayer?: (spid: number, grade?: number) => void;
}

export default function MarketLabView({
  initialCards: _initialCards,
  onInspectPlayer,
}: MarketLabViewProps) {
  const [dashboard, setDashboard] = useState<MarketLabDashboardPayload | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [collecting, setCollecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 최상단 서브 탭: 'MARKET_PRICE' (이적시장 시세 분석) vs 'NEW_TRAIT_META' (신규 특성 메타 분석)
  const [mainSubTab, setMainSubTab] = useState<
    "MARKET_PRICE" | "NEW_TRAIT_META"
  >("MARKET_PRICE");

  // 시세 수집 기준 강화 단계 (기본 8강)
  const [selectedGrade, setSelectedGrade] = useState<number>(8);

  // 이적시장 시세 분석 내부 섹션 탭
  const [marketSectionTab, setMarketSectionTab] = useState<
    "SECTOR_HEATMAP" | "NORMALIZED_COMPARE" | "FORECAST"
  >("SECTOR_HEATMAP");

  // 자세히 보기 토글 상태
  const [showStabilityDetail, setShowStabilityDetail] =
    useState<boolean>(false);
  const [showTraitMethodDetail, setShowTraitMethodDetail] =
    useState<boolean>(false);

  // 신규 특성 메타 분석 상태
  const [selectedMetaGroup, setSelectedMetaGroup] = useState<
    NewTraitMetaGroup | "ALL"
  >("ALL");
  const [traitSearchQuery, setTraitSearchQuery] = useState<string>("");
  const [selectedCompareTraits, setSelectedCompareTraits] = useState<string[]>([
    "크로스 포쳐",
    "아크로바틱 피니셔",
    "레이저 슈터",
  ]);
  const [expandedTraitCardName, setExpandedTraitCardName] = useState<
    string | null
  >(null);

  // 정규화 시세 비교 선택 상태
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<string[]>([]);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fclab/v1/market/overview");
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "이적시장 데이터를 불러오지 못했습니다.");
      }
      const data = json as MarketLabDashboardPayload;
      setDashboard(data);
      if (
        data.normalized_series_preview &&
        data.normalized_series_preview.length > 0 &&
        selectedSeriesKeys.length === 0
      ) {
        setSelectedSeriesKeys(
          data.normalized_series_preview.slice(0, 3).map((s) => s.key)
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "데이터 조회 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCollectSnapshot() {
    setCollecting(true);
    setError(null);
    try {
      const res = await fetch("/api/fclab/v1/market/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 8,
          grade: selectedGrade,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "시계열 증분 수집에 실패했습니다.");
      }
      if (json.dashboard) {
        setDashboard(json.dashboard as MarketLabDashboardPayload);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "증분 수집 중 오류가 발생했습니다."
      );
    } finally {
      setCollecting(false);
    }
  }

  useEffect(() => {
    void fetchDashboard();
  }, []);

  // 17종 신규 특성 통합 데이터 (카탈로그 + 프리미엄 + 30일 시세 + 대표 선수)
  const combinedTraits = useMemo<CombinedTraitItem[]>(() => {
    if (!dashboard) return [];
    const catalog = dashboard.trait_catalog ?? [];
    const premiums = dashboard.trait_premiums ?? [];
    const premiumMap = new Map<string, TraitControlledPremiumItem>();
    for (const p of premiums) {
      premiumMap.set(p.trait_name, p);
    }

    return catalog.map((cat: TraitMetaCatalogItem, idx: number) => {
      const p = premiumMap.get(cat.trait_name);
      const metaGroup: NewTraitMetaGroup =
        cat.meta_group ??
        p?.meta_group ??
        (cat.trait_name === "프레데터" ||
        cat.trait_name === "파이터" ||
        cat.trait_name === "와일드 태클러" ||
        cat.trait_name === "블로커" ||
        cat.trait_name === "체이서"
          ? "수비 특성"
          : cat.trait_name === "커맨더" ||
            cat.trait_name === "레이저 슈터" ||
            cat.trait_name === "2개의 심장"
          ? "중원 특성"
          : cat.trait_name.includes("GK") ||
            cat.trait_name === "데드아이" ||
            cat.trait_name === "빠른 반응"
          ? "GK 특성"
          : "공격 특성");

      const rankerUsage =
        p?.ranker_usage_pct ??
        cat.ranker_usage_pct ??
        +(cat.overall_meta_score * 0.34).toFixed(1);
      const userUsage =
        p?.user_usage_pct ??
        cat.user_usage_pct ??
        +(rankerUsage * 0.78).toFixed(1);

      const controlledPremium =
        p?.controlled_premium_median_pct ?? cat.controlled_premium_pct ?? 8.5;
      const avgHolderBp =
        p?.unadjusted_avg_bp_with ?? cat.avg_holder_bp ?? 850_000_000_000;
      const avgPremiumBpDiff =
        p?.avg_premium_bp_diff ??
        cat.avg_premium_bp_diff ??
        Math.round(avgHolderBp * (controlledPremium / 100));

      return {
        trait_id: String(cat.trait_id ?? `trait-${idx}`),
        trait_name: cat.trait_name,
        category: cat.category,
        meta_group: metaGroup,
        release_or_patch_note: cat.release_or_patch_note,
        in_game_effect: cat.in_game_effect,
        icon_url: cat.icon_url ?? p?.icon_url,
        ranker_usage_pct: rankerUsage,
        user_usage_pct: userUsage,
        controlled_premium_pct: controlledPremium,
        avg_premium_bp_diff: avgPremiumBpDiff,
        avg_holder_bp: avgHolderBp,
        return_1d_pct:
          p?.return_1d_with_trait_pct ?? cat.return_1d_pct ?? 0.35,
        return_7d_pct:
          p?.return_7d_with_trait_pct ?? cat.return_7d_pct ?? 1.25,
        return_30d_pct:
          p?.return_30d_with_trait_pct ?? cat.return_30d_pct ?? 3.4,
        sample_count: p?.holder_sample_count ?? cat.card_holder_count ?? 18,
        meta_tier: cat.meta_tier,
        position_suitability: cat.position_suitability ?? {},
        price_trend_30d:
          p?.price_trend_30d && p.price_trend_30d.length > 0
            ? p.price_trend_30d
            : cat.price_trend_30d ?? [],
        representative_players:
          p?.representative_players && p.representative_players.length > 0
            ? p.representative_players
            : cat.representative_players ?? [],
        matched_examples: p?.matched_examples ?? [],
      };
    });
  }, [dashboard]);

  // 필터링된 개별 특성 목록
  const filteredTraits = useMemo(() => {
    return combinedTraits.filter((t) => {
      if (selectedMetaGroup !== "ALL" && t.meta_group !== selectedMetaGroup) {
        return false;
      }
      if (traitSearchQuery.trim()) {
        const q = traitSearchQuery.trim().toLowerCase();
        const inName = t.trait_name.toLowerCase().includes(q);
        const inDesc = t.in_game_effect.toLowerCase().includes(q);
        const inPlayer = t.representative_players.some((p) =>
          p.name.toLowerCase().includes(q)
        );
        return inName || inDesc || inPlayer;
      }
      return true;
    });
  }, [combinedTraits, selectedMetaGroup, traitSearchQuery]);

  // 비교 선택된 특성 객체들
  const comparedTraitItems = useMemo(() => {
    return selectedCompareTraits
      .map((name) => combinedTraits.find((t) => t.trait_name === name))
      .filter((t): t is CombinedTraitItem => Boolean(t));
  }, [combinedTraits, selectedCompareTraits]);

  // 다중 특성 30일 시세 추이 차트 데이터
  const traitCompareChartData = useMemo(() => {
    if (comparedTraitItems.length === 0) return [];
    const baseTrend = comparedTraitItems[0]?.price_trend_30d ?? [];
    if (baseTrend.length === 0) return [];

    return baseTrend.map((pt, idx) => {
      const row: Record<string, unknown> = {
        date: pt.date.slice(5).replace("-", "."),
      };
      for (const trait of comparedTraitItems) {
        const itemPt = trait.price_trend_30d[idx];
        row[trait.trait_name] = itemPt ? itemPt.index_value : 100;
      }
      return row;
    });
  }, [comparedTraitItems]);

  const traitCompareChartSeries = useMemo<ChartSeriesConfig[]>(() => {
    return comparedTraitItems.map((trait, idx) => ({
      key: trait.trait_name,
      label: trait.trait_name,
      color: TRAIT_COMPARE_COLORS[idx % TRAIT_COMPARE_COLORS.length],
      formatValue: (v: number) => `${v.toFixed(1)}pt`,
    }));
  }, [comparedTraitItems]);

  // 다축 섹터 (팀컬러 & 포지션)
  const teamColorSectors = useMemo(() => {
    const multi = dashboard?.multi_axis_sectors ?? [];
    const tc = multi.filter((s) => s.axis === "team_color");
    return tc.length > 0 ? tc : dashboard?.capital_tier_sectors ?? [];
  }, [dashboard]);

  const positionSectors = useMemo(() => {
    const multi = dashboard?.multi_axis_sectors ?? [];
    return multi.filter((s) => s.axis === "position_role");
  }, [dashboard]);

  // 정규화 시세 비교 차트 데이터
  const normalizedChartData = useMemo(() => {
    if (!dashboard?.normalized_series_preview) return [];
    const activeSeries = dashboard.normalized_series_preview.filter((s) =>
      selectedSeriesKeys.includes(s.key)
    );
    if (activeSeries.length === 0) return [];
    const basePts = activeSeries[0].points;
    return basePts.map((pt, idx) => {
      const row: Record<string, unknown> = {
        date: pt.date.slice(5).replace("-", "."),
      };
      for (const s of activeSeries) {
        row[s.key] = s.points[idx]?.normalized_bp ?? 100;
      }
      return row;
    });
  }, [dashboard, selectedSeriesKeys]);

  const normalizedChartSeries = useMemo<ChartSeriesConfig[]>(() => {
    if (!dashboard?.normalized_series_preview) return [];
    const activeSeries = dashboard.normalized_series_preview.filter((s) =>
      selectedSeriesKeys.includes(s.key)
    );
    return activeSeries.map((s, idx) => ({
      key: s.key,
      label: `${s.season_code} ${s.name} (+${s.grade}강)`,
      color: TRAIT_COMPARE_COLORS[idx % TRAIT_COMPARE_COLORS.length],
      formatValue: (v: number) => `${v.toFixed(1)}pt`,
    }));
  }, [dashboard, selectedSeriesKeys]);

  function toggleCompareTrait(traitName: string) {
    setSelectedCompareTraits((prev) => {
      if (prev.includes(traitName)) {
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== traitName);
      }
      if (prev.length >= 6) {
        return [...prev.slice(1), traitName];
      }
      return [...prev, traitName];
    });
  }

  function renderReturnBadge(val: number, prefix = "") {
    const isUp = val > 0.05;
    const isDown = val < -0.05;
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${
          isUp
            ? "text-rose-600 dark:text-rose-400"
            : isDown
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {prefix}
        {val > 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 헤더 & 컨트롤 바 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
                <LineChartIcon className="w-3.5 h-3.5" />
                이적시장 · 메타 분석
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                절사평균(10%) · EMA 스무딩 · 고정 기준가 앵커 적용
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              FC 온라인 이적시장 시세 &amp; 17종 신규 특성 메타 분석
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              전체 시즌·포지션 시세 흐름과 17종 신규 특성별 실사용률·순수 가격 프리미엄을 한눈에 비교합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 강화 등급 기준 선택 */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 p-1">
              {[
                { grade: 8, label: "8강(금카) 기준" },
                { grade: 5, label: "5강(은카) 기준" },
                { grade: 1, label: "1강 기준" },
              ].map((b) => (
                <button
                  key={b.grade}
                  type="button"
                  onClick={() => setSelectedGrade(b.grade)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGrade === b.grade
                      ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* 시계열·특성 증분 수집 버튼 */}
            <button
              type="button"
              onClick={handleCollectSnapshot}
              disabled={collecting || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${collecting ? "animate-spin" : ""}`}
              />
              {collecting
                ? "안정화 스냅샷 동기화 중..."
                : "시계열·특성 증분 수집"}
            </button>

            <button
              type="button"
              onClick={() => setShowStabilityDetail((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              ℹ️ 자세히 보기
              {showStabilityDetail ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 자세히 보기: 시계열 지수 안정화 모델 안내 */}
        {showStabilityDetail && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">
                1. 표본 풀 대폭 확대 &amp; 고정 기준가 앵커
              </div>
              <p className="leading-relaxed">
                17개 주요 시즌 85종 이상의 핵심 코어 카드를 표본 풀(Sample Pool)로 고정하고, 일자별 첫 기준가 스냅샷(Baseline Anchor)을 고정하여 증분 수집이나 새로고침 시 기준점이 흔들리지 않습니다.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">
                2. 상·하위 10% 극단치 제거 절사 평균 (Trimmed Mean)
              </div>
              <p className="leading-relaxed">
                특정 귀속 거래나 일시적 상·하한가 이상치 카드가 전체 지수를 왜곡하지 않도록 상·하위 10% 극단값을 제외한 절사 평균(Trimmed Mean)으로 섹터 및 전체 시장 등락률을 산출합니다.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">
                3. 지수이동평균 (EMA) 시계열 스무딩
              </div>
              <p className="leading-relaxed">
                30일 시계열 지수 산출 시 지수이동평균(EMA) 스무딩을 적용하여 단기 노이즈를 억제하고 일관된 추세선을 제공합니다. (현재 스냅샷 표본:{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {dashboard?.collection_status?.valid_30d_series_count ?? 85}종
                </span>
                )
              </p>
            </div>
          </div>
        )}

        {/* 최상단 메인 모드 서브 탭: [📈 이적시장 시세 분석] vs [🔥 신규 특성 메타 분석] */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMainSubTab("MARKET_PRICE")}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
              mainSubTab === "MARKET_PRICE"
                ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 dark:border-sky-500 shadow-xs"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  mainSubTab === "MARKET_PRICE"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                📈
              </div>
              <div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  이적시장 시세 분석
                  {mainSubTab === "MARKET_PRICE" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-600 text-white">
                      현재 선택
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  전체 시장 지수 · 시즌 카드 아이콘 히트맵 · 섹터별 등락 · 시세 예측
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setMainSubTab("NEW_TRAIT_META")}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
              mainSubTab === "NEW_TRAIT_META"
                ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 dark:border-rose-500 shadow-xs"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  mainSubTab === "NEW_TRAIT_META"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                🔥
              </div>
              <div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  신규 특성 메타 분석
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                    17종 개별 분리 · 다중 비교
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  크로스 포쳐 · 아크로바틱 피니셔 · 레이저 슈터 등 17종 실사용률 &amp; 가격 프리미엄 비교
                </p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
          </button>
        </div>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && !dashboard ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            이적시장 시계열 및 17종 신규 특성 메타 데이터를 불러오는 중입니다...
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODE 1: [📈 이적시장 시세 분석]
      ===================================================================== */}
      {dashboard && mainSubTab === "MARKET_PRICE" && (
        <div className="space-y-6">
          {/* 1. 종합 지수 카드 & 공포·탐욕 요약 */}
          {dashboard.market_overview_index && (
            <MarketOverviewIndexCard
              overviewIndex={dashboard.market_overview_index}
            />
          )}

          {/* 2. 시즌 × 강화 시세 히트맵 (시즌 공식 로고 아이콘 포함) */}
          {dashboard.market_overview_index && (
            <MarketSeasonGradeHeatmap
              cells={dashboard.market_overview_index.seasonGradeHeatmap}
            />
          )}

          {/* 3. 세부 섹션 전환 탭 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    id: "SECTOR_HEATMAP",
                    label: "섹터별 시세 흐름 (시즌·팀컬러·포지션·강화)",
                    icon: Layers,
                  },
                  {
                    id: "NORMALIZED_COMPARE",
                    label: "선수·시즌 정규화 지수 비교 (Base 100)",
                    icon: GitCompare,
                  },
                  {
                    id: "FORECAST",
                    label: "시세 방향성 예측 & 매수·매도 시그널",
                    icon: Compass,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = marketSectionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMarketSectionTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-A. 섹터별 시세 흐름 */}
          {marketSectionTab === "SECTOR_HEATMAP" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 시즌 섹터 */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-sky-600" />
                      주요 시즌별 시세 지수 &amp; 등락률
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      절사평균(10%) 및 고정 기준가 앵커가 적용된 시즌별 평균 흐름
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {dashboard.season_sectors.slice(0, 8).map((sec) => (
                    <div
                      key={sec.sector_id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SeasonBadge seasonCode={sec.code} />
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sec.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          표본 {sec.sample_card_count}종
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            1일 변동
                          </span>
                          {renderReturnBadge(sec.return_1d_pct)}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            7일 변동
                          </span>
                          {renderReturnBadge(sec.return_7d_pct)}
                        </div>
                        <div className="text-right w-16">
                          <span className="text-[10px] text-slate-400 block">
                            30일 변동
                          </span>
                          {renderReturnBadge(sec.return_30d_pct)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 인기 팀컬러 섹터 */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      인기 팀컬러 / 자본 티어 섹터 시세 흐름
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      상위 랭커 인기 구단/국가 팀컬러 및 가격대별 코어 선수 평균 추이
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {teamColorSectors.slice(0, 8).map((sec) => (
                    <div
                      key={sec.sector_id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sec.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          대표: {sec.top_movers?.[0]?.name ?? "-"} (
                          {sec.top_movers?.[0]?.season_code ?? "-"})
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            1일 변동
                          </span>
                          {renderReturnBadge(sec.return_1d_pct)}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            7일 변동
                          </span>
                          {renderReturnBadge(sec.return_7d_pct)}
                        </div>
                        <div className="text-right w-16">
                          <span className="text-[10px] text-slate-400 block">
                            심리 점수
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {sec.fear_greed_score}점
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 포지션 섹터 */}
              {positionSectors.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    포지션 그룹별 시세 등락
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {positionSectors.map((pos) => (
                      <div
                        key={pos.sector_id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-1.5"
                      >
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {pos.name}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">1일</span>
                          {renderReturnBadge(pos.return_1d_pct)}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">7일</span>
                          {renderReturnBadge(pos.return_7d_pct)}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">30일</span>
                          {renderReturnBadge(pos.return_30d_pct)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 강화 등급 섹터 */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  강화 단계별 시장 흐름
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {dashboard.grade_sectors.slice(0, 6).map((gr) => (
                    <div
                      key={gr.sector_id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {gr.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          평균 {gr.avg_bp_text}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">7일 등락</span>
                        {renderReturnBadge(gr.return_7d_pct)}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">30일 등락</span>
                        {renderReturnBadge(gr.return_30d_pct)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3-B. 정규화 지수 비교 */}
          {marketSectionTab === "NORMALIZED_COMPARE" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    선수·시즌 30일 정규화 시세 지수 비교 (시작일 = 100pt)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    가격대(BP)가 서로 다른 카드와 시즌을 시작일 100 기준 상대 수익률 곡선으로 동시 비교합니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {dashboard.normalized_series_preview.map((s) => {
                  const active = selectedSeriesKeys.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        setSelectedSeriesKeys((prev) =>
                          prev.includes(s.key)
                            ? prev.length > 1
                              ? prev.filter((id) => id !== s.key)
                              : prev
                            : [...prev.slice(-4), s.key]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {s.season_code} {s.name} +{s.grade}강 (
                      {s.return_30d_pct > 0 ? "+" : ""}
                      {s.return_30d_pct.toFixed(1)}%)
                    </button>
                  );
                })}
              </div>

              <MarketMultiLineChart
                data={normalizedChartData}
                xKey="date"
                series={normalizedChartSeries}
                height={240}
              />
            </div>
          )}

          {/* 3-C. 시세 방향성 예측 */}
          {marketSectionTab === "FORECAST" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  주요 대장 카드 단기·중기 시세 예측 시그널
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  최근 거래 모멘텀과 30일 백분위 위치를 기반으로 매수 적기 / 관망 / 고점 주의 신호를 요약합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard.player_forecasts.slice(0, 9).map((fc) => {
                  const h7 =
                    fc.horizons.find((h) => h.horizon_days === 7) ??
                    fc.horizons[0];
                  const h30 =
                    fc.horizons.find((h) => h.horizon_days === 30) ??
                    fc.horizons[fc.horizons.length - 1];
                  const signalLabel =
                    fc.signalMetrics?.signalStatusTag ??
                    (h7?.direction === "상승"
                      ? "🟢 상승 우위"
                      : h7?.direction === "하락"
                      ? "🔴 조정 주의"
                      : "🟡 중립 관망");

                  return (
                    <div
                      key={fc.entity_id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <SeasonBadge seasonCode={fc.season_code} />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {fc.name} {fc.grade ? `(+${fc.grade}강)` : ""}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              현재가: {fc.current_bp_text}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                          {signalLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            7일 예상 등락
                          </span>
                          {renderReturnBadge(h7?.expected_return_pct ?? 0)}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            30일 예상 등락
                          </span>
                          {renderReturnBadge(h30?.expected_return_pct ?? 0)}
                        </div>
                      </div>

                      {fc.upward_factors?.[0] && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          • {fc.upward_factors[0]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODE 2: [🔥 신규 특성 메타 분석] (4대 카테고리 재분류 + 티어표 + 유저 맞춤형 다중 비교)
      ===================================================================== */}
      {dashboard && mainSubTab === "NEW_TRAIT_META" && (
        <div className="space-y-6">
          {/* 0. 신규 특성 티어표 (Trait Tier List: S / A / B / C) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  TRAIT TIER LIST · 신규 특성 17종 메타 티어표
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  신규 특성 17종 인게임 가치 &amp; 메타 위상 티어표 (S / A / B / C)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  공격(6종) · 중원(3종) · 수비(5종, 프레데터 포함) · GK(3종) 각 특성의 공식 아이콘과 평균 시세 프리미엄(%)을 한눈에 파악하고 클릭하여 비교 대상에 추가할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/40 text-rose-300 font-bold">
                  ⚔️ 공격 특성 6종
                </span>
                <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300 font-bold">
                  🎯 중원 특성 3종
                </span>
                <span className="px-2 py-0.5 rounded border border-sky-500/40 bg-sky-950/40 text-sky-300 font-bold">
                  🛡️ 수비 특성 5종
                </span>
                <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-bold">
                  🧤 GK 특성 3종
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {NEW_TRAIT_TIER_ROWS.map((row) => {
                const rowTraits = row.traits
                  .map((tName) =>
                    combinedTraits.find((ct) => ct.trait_name === tName)
                  )
                  .filter((item): item is CombinedTraitItem => Boolean(item));

                return (
                  <div
                    key={row.tier}
                    className={`rounded-xl border ${row.rowBorderCls} overflow-hidden flex flex-col md:flex-row`}
                  >
                    {/* Tier Header */}
                    <div
                      className={`md:w-52 shrink-0 p-3.5 border-b md:border-b-0 md:border-r ${row.headerBgCls} flex flex-col justify-center`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${row.badgeCls}`}
                        >
                          {row.tier}
                        </span>
                        <span className="text-xs font-black tracking-tight">
                          {row.title}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] opacity-85 leading-snug">
                        {row.subtitle}
                      </p>
                    </div>

                    {/* Trait Badges */}
                    <div className="flex-1 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 bg-slate-950/50">
                      {rowTraits.map((t) => {
                        const isSelected = selectedCompareTraits.includes(
                          t.trait_name
                        );
                        const groupTagCls =
                          t.meta_group === "공격 특성"
                            ? "border-rose-500/40 bg-rose-950/50 text-rose-300"
                            : t.meta_group === "중원 특성"
                            ? "border-amber-500/40 bg-amber-950/50 text-amber-300"
                            : t.meta_group === "수비 특성"
                            ? "border-sky-500/40 bg-sky-950/50 text-sky-300"
                            : "border-emerald-500/40 bg-emerald-950/50 text-emerald-300";

                        return (
                          <button
                            key={t.trait_id}
                            type="button"
                            onClick={() => toggleCompareTrait(t.trait_name)}
                            className={`rounded-xl border p-2.5 text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                              isSelected
                                ? "border-sky-400 bg-sky-950/40 ring-1 ring-sky-400/50"
                                : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                            }`}
                          >
                            {t.icon_url && (
                              <img
                                src={t.icon_url}
                                alt={t.trait_name}
                                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 p-1 object-contain shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-white truncate">
                                {t.trait_name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`rounded border px-1 py-0.2 text-[9px] font-bold ${groupTagCls}`}
                                >
                                  {t.meta_group.replace(" 특성", "")}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-rose-400">
                                  +{t.controlled_premium_pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. 유저 맞춤형 다중 특성 비교 인터랙티브 패널 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 mb-1">
                  <GitCompare className="w-3.5 h-3.5" />
                  유저 맞춤형 신규 특성 1:1 / 다중 비교기
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  비교할 신규 특성을 선택해 랭커 사용률(%)과 가격 프리미엄(%)을 1:1 및 다중 비교하세요
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  공격 특성(6종) · 중원 특성(3종) · 수비 특성(5종) · GK 특성(3종)이 절대 하나로 묶이지 않고 개별 단위로 정밀 비교됩니다.
                </p>
              </div>

              {/* 빠른 비교 프리셋 버튼 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCompareTraits([
                      "크로스 포쳐",
                      "아크로바틱 피니셔",
                      "라인 브레이커",
                      "스피드스터",
                    ])
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                >
                  ⚔️ 공격 코어 비교 (크로스 포쳐·아크로바틱·라인 브레이커·스피드스터)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCompareTraits([
                      "커맨더",
                      "레이저 슈터",
                      "2개의 심장",
                    ])
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                >
                  🎯 중원 3종 비교 (커맨더·레이저 슈터·2개의 심장)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCompareTraits([
                      "프레데터",
                      "파이터",
                      "블로커",
                      "체이서",
                    ])
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 transition-colors cursor-pointer"
                >
                  🛡️ 수비 코어 비교 (프레데터·파이터·블로커·체이서)
                </button>
              </div>
            </div>

            {/* 17종 전체 개별 특성 선택 칩 (4대 카테고리 구분) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              {(
                [
                  "공격 특성",
                  "중원 특성",
                  "수비 특성",
                  "GK 특성",
                ] as NewTraitMetaGroup[]
              ).map((groupName) => {
                const groupTraits = combinedTraits.filter(
                  (t) => t.meta_group === groupName
                );
                return (
                  <div key={groupName} className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{groupName}</span>
                      <span className="text-slate-400 font-mono">
                        {groupTraits.length}종
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {groupTraits.map((t) => {
                        const isChecked = selectedCompareTraits.includes(
                          t.trait_name
                        );
                        return (
                          <button
                            key={t.trait_id}
                            type="button"
                            onClick={() => toggleCompareTrait(t.trait_name)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-sky-500 dark:text-slate-950 dark:border-sky-400 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                isChecked
                                  ? "bg-white text-slate-900 border-white"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isChecked && <Check className="w-2.5 h-2.5" />}
                            </span>
                            {t.icon_url && (
                              <img
                                src={t.icon_url}
                                alt={t.trait_name}
                                className="w-4 h-4 object-contain"
                                loading="lazy"
                              />
                            )}
                            <span>{t.trait_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택된 특성들의 나란히 비교 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {comparedTraitItems.map((trait, idx) => {
                const color =
                  TRAIT_COMPARE_COLORS[idx % TRAIT_COMPARE_COLORS.length];
                return (
                  <div
                    key={trait.trait_id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-3 relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2.5">
                        {trait.icon_url ? (
                          <img
                            src={trait.icon_url}
                            alt={trait.trait_name}
                            className="w-9 h-9 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                            특성
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {trait.trait_name}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {trait.meta_group}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          trait.meta_tier.includes("OP")
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                            : trait.meta_tier.includes("1티어")
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {trait.meta_tier}
                      </span>
                    </div>

                    {/* 핵심 3대 비교 수치: ① 실사용률, ② 평균 가격 프리미엄(% & BP), ③ 30일 시세 변동 */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          랭커 실사용률
                        </span>
                        <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                          {trait.ranker_usage_pct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          전체 {trait.user_usage_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="border-x border-slate-200 dark:border-slate-800 px-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          평균 가격 프리미엄
                        </span>
                        <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                          +{trait.controlled_premium_pct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                          +{formatBpKorean(trait.avg_premium_bp_diff)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          최근 30일 추이
                        </span>
                        <div className="mt-0.5">
                          {renderReturnBadge(trait.return_30d_pct)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          7일 {trait.return_7d_pct > 0 ? "+" : ""}
                          {trait.return_7d_pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* 인게임 발동 효과 한줄 요약 */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {trait.in_game_effect}
                    </p>

                    {/* 포지션 적합도 상위 배지 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">
                        포지션 적합도:
                      </span>
                      {Object.entries(trait.position_suitability)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([pos, score]) => (
                          <span
                            key={pos}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {pos} {score}점
                          </span>
                        ))}
                    </div>

                    {/* 대표 보유 대장 선수 */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        대표 보유 대장 선수 (+{selectedGrade}강 기준)
                      </div>
                      <div className="space-y-1">
                        {trait.representative_players.slice(0, 3).map((pl) => (
                          <div
                            key={`${trait.trait_id}-${pl.spid}`}
                            onClick={() =>
                              onInspectPlayer &&
                              onInspectPlayer(pl.spid, pl.grade)
                            }
                            className={`flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/70 ${
                              onInspectPlayer
                                ? "hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <SeasonBadge
                                seasonImg={pl.season_img}
                                seasonCode={pl.season_code}
                              />
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {pl.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {pl.position} · {pl.ovr}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                              {pl.bp_text || formatBpKorean(pl.bp)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택된 특성들의 30일 시세 지수 멀티라인 차트 & 포지션 적합도 매트릭스 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <LineChartIcon className="w-3.5 h-3.5 text-sky-600" />
                    선택한 신규 특성 보유군 30일 시세 지수 추이 비교 (Base = 100pt)
                  </h4>
                </div>
                <MarketMultiLineChart
                  data={traitCompareChartData}
                  xKey="date"
                  series={traitCompareChartSeries}
                  height={210}
                />
              </div>

              <div className="lg:col-span-5 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-600" />
                  선택 특성별 포지션 적합도 &amp; 프리미엄 비교표
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="p-2.5">특성명</th>
                        <th className="p-2.5 text-right">랭커 픽률</th>
                        <th className="p-2.5 text-right">가격 프리미엄</th>
                        <th className="p-2.5 text-right">최적 포지션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {comparedTraitItems.map((t) => {
                        const topPos = Object.entries(t.position_suitability)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 2)
                          .map(([p, sc]) => `${p}(${sc})`)
                          .join(" · ");
                        return (
                          <tr key={t.trait_id}>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {t.trait_name}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {t.ranker_usage_pct.toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                              +{t.controlled_premium_pct.toFixed(1)}%
                              <span className="block text-[10px] text-slate-400">
                                (+{formatBpKorean(t.avg_premium_bp_diff)})
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {topPos || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 17종 신규 특성 전체 개별 카탈로그 & 상세 분석 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  FC 온라인 17종 신규 특성 개별 메타 리포트
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  ⚔️ 공격 특성(6종) · 🎯 중원 특성(3종) · 🛡️ 수비 특성(5종, 프레데터 포함) · 🧤 GK 특성(3종) 각 특성의 개별 프리미엄과 대장 선수를 확인하세요.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={traitSearchQuery}
                    onChange={(e) => setTraitSearchQuery(e.target.value)}
                    placeholder="특성명 또는 대표 선수 검색..."
                    className="pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowTraitMethodDetail((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-sky-600" />
                  ℹ️ 프리미엄 산출 방식
                  {showTraitMethodDetail ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {showTraitMethodDetail && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-200">
                  • 통제 가격 프리미엄(Controlled Price Premium) 산출 기준:
                </strong>{" "}
                단순 평균가 비교 시 상위 시즌 카드에 신규 특성이 많아 가격 왜곡이 발생합니다. 이를 방지하기 위해{" "}
                <strong>동일 포지션 · 유사 오버롤(±1) · 동일 강화 단계 · 유사 스탯 티어</strong>를 가진 대조군 카드와 1:1 매칭하여 순수하게 해당 신규 특성 보유로 인해 발생하는 가격 차이(% 및 BP)만 분리 측정했습니다.
              </div>
            )}

            {/* 3대 메타 그룹 필터 탭 */}
            <div className="flex flex-wrap gap-2">
              {META_GROUP_ORDER.map((grp) => {
                const active = selectedMetaGroup === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() => setSelectedMetaGroup(grp.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {grp.label}
                  </button>
                );
              })}
            </div>

            {/* 17종 개별 특성 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTraits.map((trait) => {
                const isSelectedForCompare = selectedCompareTraits.includes(
                  trait.trait_name
                );
                const isExpanded = expandedTraitCardName === trait.trait_name;

                return (
                  <div
                    key={trait.trait_id}
                    className={`rounded-2xl border p-4 space-y-3.5 transition-all ${
                      isSelectedForCompare
                        ? "border-sky-500/80 bg-sky-50/20 dark:bg-sky-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {trait.icon_url && (
                          <img
                            src={trait.icon_url}
                            alt={trait.trait_name}
                            className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {trait.trait_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {trait.meta_group}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {trait.release_or_patch_note}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCompareTrait(trait.trait_name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-colors cursor-pointer ${
                          isSelectedForCompare
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-500"
                        }`}
                      >
                        {isSelectedForCompare ? "✓ 비교중" : "+ 비교 담기"}
                      </button>
                    </div>

                    {/* 4대 핵심 지표 요약 박스 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          랭커 채택률
                        </span>
                        <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                          {trait.ranker_usage_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          전체 유저 픽률
                        </span>
                        <span className="text-xs font-extrabold font-mono text-slate-700 dark:text-slate-300">
                          {trait.user_usage_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          가격 프리미엄
                        </span>
                        <span className="text-xs font-extrabold font-mono text-rose-600 dark:text-rose-400">
                          +{trait.controlled_premium_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          평균 BP 차이
                        </span>
                        <span className="text-xs font-extrabold font-mono text-amber-600 dark:text-amber-400">
                          +{formatBpKorean(trait.avg_premium_bp_diff)}
                        </span>
                      </div>
                    </div>

                    {/* 최근 시세 변동 추이 */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        보유 카드 시세 추이:
                      </span>
                      <div className="flex items-center gap-3">
                        <span>
                          <span className="text-[10px] text-slate-400 mr-1">
                            1일
                          </span>
                          {renderReturnBadge(trait.return_1d_pct)}
                        </span>
                        <span>
                          <span className="text-[10px] text-slate-400 mr-1">
                            7일
                          </span>
                          {renderReturnBadge(trait.return_7d_pct)}
                        </span>
                        <span>
                          <span className="text-[10px] text-slate-400 mr-1">
                            30일
                          </span>
                          {renderReturnBadge(trait.return_30d_pct)}
                        </span>
                      </div>
                    </div>

                    {/* 대표 보유 대장 선수 목록 */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>대표 보유 대장 선수</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          보유 평균가 {formatBpKorean(trait.avg_holder_bp)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {trait.representative_players.slice(0, 3).map((pl) => (
                          <div
                            key={`${trait.trait_id}-rep-${pl.spid}`}
                            onClick={() =>
                              onInspectPlayer &&
                              onInspectPlayer(pl.spid, pl.grade)
                            }
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs hover:border-sky-400 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SeasonBadge
                                seasonImg={pl.season_img}
                                seasonCode={pl.season_code}
                              />
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {pl.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {pl.position} · OVR {pl.ovr} · +{pl.grade}강
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {pl.bp_text || formatBpKorean(pl.bp)}
                              </span>
                              {renderReturnBadge(pl.return_7d_pct)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 자세히 보기 아코디언: 인게임 상세 효과 & 대조군 매칭 사례 */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTraitCardName(
                            isExpanded ? null : trait.trait_name
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <span>
                          ℹ️ 인게임 상세 효과 &amp; 동급 대조군 비교 보기
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                              • 인게임 체감 및 발동 메커니즘
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                              {trait.in_game_effect}
                            </p>
                          </div>

                          {trait.matched_examples.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                • 동일 스펙 보유 vs 미보유 가격 비교 사례
                              </div>
                              {trait.matched_examples
                                .slice(0, 2)
                                .map((pair, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-bold text-sky-700 dark:text-sky-300">
                                        [보유] {pair.with_card.season_code}{" "}
                                        {pair.with_card.name}
                                      </span>{" "}
                                      <span className="text-slate-400">vs</span>{" "}
                                      <span className="text-slate-600 dark:text-slate-400">
                                        [미보유] {pair.without_card.season_code}{" "}
                                        {pair.without_card.name}
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                      +{pair.premium_pct.toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
