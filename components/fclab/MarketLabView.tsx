"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Compass,
  Database,
  DollarSign,
  Filter,
  Flame,
  Gauge,
  GitCompare,
  Info,
  Layers,
  LineChart as LineChartIcon,
  PlusCircle,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  MarketDataBasis,
  MarketEntityForecast,
  MarketLabDashboardPayload,
  MarketNormalizedSeries,
  PlayerCard,
  formatBpKorean,
} from "@/lib/fclab-types";

interface ChartSeriesConfig {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  isArea?: boolean;
  formatValue?: (v: number) => string;
}

function MarketMultiLineChart({
  data,
  xKey,
  series,
  height = 220,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeriesConfig[];
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0 || series.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-slate-800">
        표시할 시계열 데이터가 없습니다.
      </div>
    );
  }

  const width = 680;
  const padX = 28;
  const padY = 22;

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

  const getCoord = (idx: number, val: number) => {
    const x =
      padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
    const y =
      height - padY - ((val - minVal) / span) * (height - padY * 2);
    return { x, y };
  };

  const activeIdx =
    hoverIdx !== null && data[hoverIdx] ? hoverIdx : data.length - 1;
  const activeRow = data[activeIdx] || data[data.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950/90 border border-slate-800/80 px-3 py-1.5">
        <span className="font-mono text-slate-400">
          기준일: <strong className="text-white">{String(activeRow[xKey] || "")}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => {
            const rawVal = Number(activeRow[s.key] || 0);
            const textVal = s.formatValue
              ? s.formatValue(rawVal)
              : rawVal.toLocaleString();
            return (
              <span key={s.key} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className="w-2.5 h-2.5 inline-block"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-400">{s.label}:</span>
                <strong className="text-slate-100">{textVal}</strong>
              </span>
            );
          })}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full bg-slate-950/70 border border-slate-800/90 select-none"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0.2, 0.5, 0.8].map((lvl) => {
          const y = padY + (height - padY * 2) * lvl;
          return (
            <line
              key={lvl}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="#1e293b"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {series.map((s) => {
          const pts = data.map((row, idx) =>
            getCoord(idx, Number(row[s.key] || 0))
          );
          const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
          const areaPoly = `${pts[0].x},${height - padY} ${poly} ${
            pts[pts.length - 1].x
          },${height - padY}`;
          return (
            <g key={s.key}>
              {s.isArea && (
                <polygon
                  points={areaPoly}
                  fill={s.color}
                  fillOpacity={0.14}
                />
              )}
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? "1.75" : "2.25"}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                points={poly}
              />
              {pts[activeIdx] && (
                <circle
                  cx={pts[activeIdx].x}
                  cy={pts[activeIdx].y}
                  r="4"
                  fill={s.color}
                  stroke="#0b0f17"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}

        {data.map((_, idx) => {
          const x =
            padX + (idx / Math.max(1, data.length - 1)) * (width - padX * 2);
          return (
            <rect
              key={idx}
              x={x - width / data.length / 2}
              y={0}
              width={width / data.length}
              height={height}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(idx)}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface MarketLabViewProps {
  initialCards: PlayerCard[];
  onInspectPlayer?: (spid: number, grade?: number) => void;
}

type MarketSubTab =
  | "overview"
  | "sectors"
  | "forecast_backtest"
  | "events_supply"
  | "trait_meta"
  | "operations";

function BasisBadge({ basis }: { basis: MarketDataBasis }) {
  if (basis === "observed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <Database className="w-3 h-3" />
        관측 데이터 (Observed)
      </span>
    );
  }
  if (basis === "statistical_estimate") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        <Scale className="w-3 h-3" />
        통계적 통제 추정 (Controlled Estimate)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
      <Compass className="w-3 h-3" />
      모델 예측 (Model Forecast)
    </span>
  );
}

function ReturnBadge({ val, suffix = "%" }: { val: number; suffix?: string }) {
  const num = Number(val || 0);
  if (num > 0.15) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-emerald-400">
        <ArrowUpRight className="w-3.5 h-3.5" />+{num.toFixed(2)}
        {suffix}
      </span>
    );
  }
  if (num < -0.15) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-rose-400">
        <ArrowDownRight className="w-3.5 h-3.5" />
        {num.toFixed(2)}
        {suffix}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-slate-400">
      0.00{suffix}
    </span>
  );
}

export default function MarketLabView({
  initialCards,
  onInspectPlayer,
}: MarketLabViewProps) {
  const [subTab, setSubTab] = useState<MarketSubTab>("overview");
  const [dashboard, setDashboard] = useState<MarketLabDashboardPayload | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Sector axis state
  const [sectorAxis, setSectorAxis] = useState<
    "season" | "capital_tier" | "grade"
  >("season");

  // Forecast & Player Inspector state
  const [selectedForecastEntityId, setSelectedForecastEntityId] =
    useState<string>("");
  const [selectedTraceSpid, setSelectedTraceSpid] = useState<number>(0);
  const [playerQuery, setPlayerQuery] = useState<string>("");
  const [loadingPlayerForecast, setLoadingPlayerForecast] =
    useState<boolean>(false);
  const [customPlayerForecast, setCustomPlayerForecast] =
    useState<MarketEntityForecast | null>(null);
  const [customPlayerSeries, setCustomPlayerSeries] =
    useState<MarketNormalizedSeries | null>(null);

  // Fee coupon interactive simulator state
  const [simSalePriceEok, setSimSalePriceEok] = useState<number>(5000); // 5,000억 BP
  const [simHasTopClass, setSimHasTopClass] = useState<boolean>(true);
  const [simHasPcRoom, setSimHasPcRoom] = useState<boolean>(true);
  const [simCouponPct, setSimCouponPct] = useState<number>(30);

  // Trait filter state
  const [selectedSubstitutionCaseId, setSelectedSubstitutionCaseId] =
    useState<string>("sub-aerial-box-vs-linebreaker");
  const [selectedTraitForDetail, setSelectedTraitForDetail] =
    useState<string>("크로스 포쳐");

  // Operations & Event Registration state
  const [collectingBatch, setCollectingBatch] = useState<boolean>(false);
  const [batchMessage, setBatchMessage] = useState<string>("");
  const [newEvtTitle, setNewEvtTitle] = useState<string>("");
  const [newEvtType, setNewEvtType] = useState<
    "PACK_RELEASE" | "FEE_DISCOUNT_COUPON" | "BP_SUPPLY" | "TRAIT_ENGINE_PATCH"
  >("PACK_RELEASE");
  const [newEvtStart, setNewEvtStart] = useState<string>("10.15");
  const [newEvtEnd, setNewEvtEnd] = useState<string>("10.22");
  const [newEvtSeasons, setNewEvtSeasons] = useState<string>("26TOTY,WS,UC");
  const [newEvtCouponPct, setNewEvtCouponPct] = useState<number>(30);

  async function fetchMarketOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fclab/v1/market/overview");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "이적시장 분석 데이터를 불러오지 못했습니다."
        );
      }
      setDashboard(data);
      if (
        data.player_forecasts?.length > 0 &&
        !selectedForecastEntityId
      ) {
        setSelectedForecastEntityId(data.player_forecasts[0].entity_id);
      }
      if (
        data.backtest_report?.sample_traces?.length > 0 &&
        !selectedTraceSpid
      ) {
        setSelectedTraceSpid(data.backtest_report.sample_traces[0].spid);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "시장 분석 엔진 로드 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fclab/v1/market/overview");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(
            data.error || "이적시장 분석 데이터를 불러오지 못했습니다."
          );
        } else {
          setDashboard(data);
          if (data.player_forecasts?.length > 0) {
            setSelectedForecastEntityId(data.player_forecasts[0].entity_id);
          }
          if (data.backtest_report?.sample_traces?.length > 0) {
            setSelectedTraceSpid(data.backtest_report.sample_traces[0].spid);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "시장 분석 엔진 로드 중 오류가 발생했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInspectCustomPlayer(spid: number, grade = 1) {
    setLoadingPlayerForecast(true);
    try {
      const res = await fetch(
        `/api/fclab/v1/market/player?spid=${spid}&grade=${grade}`
      );
      const data = await res.json();
      if (data.ok) {
        if (data.dashboard) setDashboard(data.dashboard);
        if (data.forecast) {
          setCustomPlayerForecast(data.forecast);
          setSelectedForecastEntityId(data.forecast.entity_id);
        }
        if (data.series) {
          setCustomPlayerSeries(data.series);
        }
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingPlayerForecast(false);
    }
  }

  async function handleRunIncrementalBatch() {
    setCollectingBatch(true);
    setBatchMessage("");
    try {
      const res = await fetch("/api/fclab/v1/market/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5, grade: 1 }),
      });
      const data = await res.json();
      if (data.ok && data.dashboard) {
        setDashboard(data.dashboard);
        setBatchMessage(
          `증분 수집 완료: 신규 시계열 ${data.batchResult.collectedSeriesCount}건, 상세 능력치·특성 ${data.batchResult.collectedAbilityCount}건 갱신됨 (${data.batchResult.completedAt})`
        );
      }
    } catch (err) {
      setBatchMessage(
        `배치 수집 오류: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setCollectingBatch(false);
    }
  }

  async function handleRegisterEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvtTitle.trim()) return;
    try {
      const res = await fetch("/api/fclab/v1/market/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvtTitle.trim(),
          event_type: newEvtType,
          start_date: newEvtStart,
          end_date: newEvtEnd,
          target_seasons: newEvtSeasons
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
          fee_coupon_discount_pct: newEvtCouponPct,
        }),
      });
      const data = await res.json();
      if (data.ok && data.dashboard) {
        setDashboard(data.dashboard);
        setNewEvtTitle("");
      }
    } catch {
      // ignore
    }
  }

  const activeForecast = useMemo(() => {
    if (!dashboard) return null;
    if (
      customPlayerForecast &&
      customPlayerForecast.entity_id === selectedForecastEntityId
    ) {
      return customPlayerForecast;
    }
    return (
      dashboard.player_forecasts.find(
        (f) => f.entity_id === selectedForecastEntityId
      ) ||
      dashboard.player_forecasts[0] ||
      null
    );
  }, [dashboard, selectedForecastEntityId, customPlayerForecast]);

  const activeSeriesForForecast = useMemo(() => {
    if (!dashboard || !activeForecast) return null;
    if (
      customPlayerSeries &&
      customPlayerSeries.key === activeForecast.entity_id
    ) {
      return customPlayerSeries;
    }
    return (
      dashboard.normalized_series_preview.find(
        (s) => s.key === activeForecast.entity_id
      ) || null
    );
  }, [dashboard, activeForecast, customPlayerSeries]);

  const activeBacktestTrace = useMemo(() => {
    if (!dashboard) return null;
    return (
      dashboard.backtest_report.sample_traces.find(
        (t) => t.spid === selectedTraceSpid
      ) ||
      dashboard.backtest_report.sample_traces[0] ||
      null
    );
  }, [dashboard, selectedTraceSpid]);

  const activeSubstitutionCase = useMemo(() => {
    if (!dashboard) return null;
    return (
      dashboard.trait_substitutions.find(
        (c) => c.case_id === selectedSubstitutionCaseId
      ) ||
      dashboard.trait_substitutions[0] ||
      null
    );
  }, [dashboard, selectedSubstitutionCaseId]);

  const activeTraitPremium = useMemo(() => {
    if (!dashboard) return null;
    return (
      dashboard.trait_premiums.find(
        (p) => p.trait_name === selectedTraitForDetail
      ) ||
      dashboard.trait_premiums[0] ||
      null
    );
  }, [dashboard, selectedTraitForDetail]);

  const filteredCatalogSearch = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return initialCards.slice(0, 8);
    return initialCards
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.season_code.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [initialCards, playerQuery]);

  // Fee simulator calculation
  const feeSimResult = useMemo(() => {
    const saleBp = Math.max(1, simSalePriceEok) * 100_000_000;
    const baseTaxRate = 0.4; // 40% base market fee
    const discountRate = Math.min(
      0.95,
      (simHasTopClass ? 0.2 : 0) +
        (simHasPcRoom ? 0.3 : 0) +
        Math.max(0, Math.min(50, simCouponPct)) / 100
    );
    const effectiveTaxRate = baseTaxRate * (1 - discountRate);
    const taxBp = Math.round(saleBp * effectiveTaxRate);
    const netProceedsBp = saleBp - taxBp;
    const noCouponDiscount = (simHasTopClass ? 0.2 : 0) + (simHasPcRoom ? 0.3 : 0);
    const noCouponNetBp = Math.round(
      saleBp * (1 - baseTaxRate * (1 - noCouponDiscount))
    );
    const couponSavedBp = netProceedsBp - noCouponNetBp;
    return {
      saleBp,
      effectiveTaxPct: +(effectiveTaxRate * 100).toFixed(1),
      taxBp,
      netProceedsBp,
      couponSavedBp,
      breakevenRebuyBp: netProceedsBp,
      breakevenDropPct: +(effectiveTaxRate * 100).toFixed(1),
    };
  }, [simSalePriceEok, simHasTopClass, simHasPcRoom, simCouponPct]);

  if (loading && !dashboard) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 p-10 text-center space-y-3">
        <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
        <div className="text-base font-semibold text-slate-100">
          FC 온라인 이적시장 시계열·섹터·특성 메타 계량 엔진 가동 중...
        </div>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          30일 시계열 단위 정규화, 다축 섹터 지수, 시장 과열·공포 지수(0~100), 4단계 롤링 백테스트, 교란변수 통제 특성 프리미엄을 계산하고 있습니다.
        </p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-rose-950/30 border border-rose-500/40 p-6 text-rose-200 space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          이적시장 분석 엔진 오류
        </div>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchMarketOverview}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const fg = dashboard.fear_greed;
  const fgColor =
    fg.overall_score >= 60
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : fg.overall_score < 40
        ? "text-sky-400 border-sky-500/40 bg-sky-500/10"
        : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";

  return (
    <div className="space-y-6">
      {/* Top Header & KPI Strip */}
      <div className="bg-slate-900/90 border border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                QUANT MARKET & TRAIT META ENGINE
              </span>
              <BasisBadge basis="observed" />
              <BasisBadge basis="statistical_estimate" />
              <BasisBadge basis="model_forecast" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              FC 온라인 이적시장 계량 분석 · 시세 예측 · 특성 메타 연구소
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              실제 관측된 선수별 30일 시계열({dashboard.collection_status.valid_30d_series_count}종)과 상세 카드 스펙·특성 DB({dashboard.collection_status.cards_with_full_ability}종)를 기반으로 섹터 흐름, 과열·공포 지수, 4단계 백테스트 예측, 신규 특성 통제 프리미엄을 분석합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={fetchMarketOverview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              시장 지표 재계산
            </button>
            <button
              onClick={handleRunIncrementalBatch}
              disabled={collectingBatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 text-xs font-bold transition"
            >
              <Database className="w-3.5 h-3.5" />
              {collectingBatch ? "실시간 수집 중..." : "시계열·특성 증분 수집"}
            </button>
          </div>
        </div>

        {/* 5 Core KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-5">
          <div className="bg-slate-950/70 border border-slate-800/90 p-4">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>FClab 시장 종합 지수 (30d=100)</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">
                {dashboard.market_index_current.toFixed(2)}
              </span>
              <ReturnBadge val={dashboard.market_return_1d_pct} />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              30일 누적 수익률:{" "}
              <span className="text-slate-300 font-mono">
                {dashboard.market_return_30d_pct >= 0 ? "+" : ""}
                {dashboard.market_return_30d_pct}%
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 p-4">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>최근 7일 시장 평균 등락률</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">
                {dashboard.market_return_7d_pct >= 0 ? "+" : ""}
                {dashboard.market_return_7d_pct.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              일간 평균 변동성:{" "}
              <span className="text-slate-300 font-mono">
                ±{dashboard.market_volatility_30d_pct}%
              </span>
            </div>
          </div>

          <div className={`border p-4 ${fgColor}`}>
            <div className="text-[11px] flex items-center justify-between opacity-90">
              <span>시장 과열·공포 지수 (0~100)</span>
              <Gauge className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold">
                {fg.overall_score}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-950/60 border border-current/30">
                {fg.band}
              </span>
            </div>
            <div className="mt-1 text-[11px] opacity-80 truncate">
              {fg.band_range_label}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 p-4">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>시점 일치 백테스트 (7일 MAPE)</span>
              <Target className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">
                {dashboard.backtest_report.models_7d[3]?.mape_pct.toFixed(2)}%
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                방향 적중{" "}
                {dashboard.backtest_report.models_7d[3]?.directional_accuracy_pct.toFixed(
                  1
                )}
                %
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              검증 윈도우:{" "}
              <span className="text-slate-300 font-mono">
                {dashboard.backtest_report.total_rolling_windows.toLocaleString()}회
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 p-4">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>추적 카탈로그 & 특성 DB</span>
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">
                {dashboard.collection_status.total_catalog_cards}종
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (시계열 {dashboard.collection_status.timeseries_stored_count}종)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              상세 특성 분석 카드:{" "}
              <span className="text-slate-300 font-mono">
                {dashboard.collection_status.cards_with_full_ability}종
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation bar */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/80 border border-slate-800 p-1.5">
        {[
          {
            id: "overview" as const,
            label: "1. 시장 종합 & 공포·과열 지수",
            icon: Gauge,
          },
          {
            id: "sectors" as const,
            label: "2. 다축 섹터 분석 (시즌·자본·강화)",
            icon: Layers,
          },
          {
            id: "forecast_backtest" as const,
            label: "3. 시세 예측 & 4단계 백테스트 검증",
            icon: LineChartIcon,
          },
          {
            id: "events_supply" as const,
            label: "4. 이벤트·공급 시나리오 & 수수료 쿠폰",
            icon: Calendar,
          },
          {
            id: "trait_meta" as const,
            label: "5. 신규특성·특성 메타 & 통제 프리미엄",
            icon: Award,
          },
          {
            id: "operations" as const,
            label: "6. 수집 운영·단위 정규화·투명성",
            icon: Database,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: MARKET OVERVIEW & FEAR / GREED INDEX
      ===================================================================== */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* Commentary & Unobservable Disclosure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    이적시장 국면 진단 및 30일 시장 지수 · 심리지수 추이
                  </h3>
                </div>
                <BasisBadge basis="observed" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800 p-3.5">
                {fg.summary_comment}
              </p>

              <div className="pt-2">
                <MarketMultiLineChart
                  data={
                    fg.history_30d as unknown as Record<string, unknown>[]
                  }
                  xKey="date"
                  height={230}
                  series={[
                    {
                      key: "market_index",
                      label: "FClab 30일 동일가중 시장지수 (Base=100)",
                      color: "#10b981",
                      isArea: true,
                      formatValue: (v) => v.toFixed(2),
                    },
                    {
                      key: "score",
                      label: "시장 과열·공포 지수 (0~100)",
                      color: "#f59e0b",
                      formatValue: (v) => `${v.toFixed(0)}점`,
                    },
                  ]}
                />
              </div>
            </div>

            {/* 5-Band Gauge & Unobservable Notice */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    시장 과열·공포 5단계 구간 기준
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    현재 {fg.overall_score}점
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      range: "80 ~ 100",
                      name: "극단적 과열",
                      desc: "단기 급등 쏠림·추격 매수 과열 (차익실현 주의)",
                      active: fg.overall_score >= 80,
                      color: "border-rose-500/50 bg-rose-500/10 text-rose-300",
                    },
                    {
                      range: "60 ~ 79",
                      name: "과열",
                      desc: "상승 종목 우위 및 매수 모멘텀 확산",
                      active: fg.overall_score >= 60 && fg.overall_score < 80,
                      color:
                        "border-amber-500/50 bg-amber-500/10 text-amber-300",
                    },
                    {
                      range: "40 ~ 59",
                      name: "중립",
                      desc: "수급 균형 및 시즌·특성별 차별화 장세",
                      active: fg.overall_score >= 40 && fg.overall_score < 60,
                      color:
                        "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
                    },
                    {
                      range: "20 ~ 39",
                      name: "공포",
                      desc: "매물 출회 우위·단기 가격 조정 구간",
                      active: fg.overall_score >= 20 && fg.overall_score < 40,
                      color: "border-sky-500/50 bg-sky-500/10 text-sky-300",
                    },
                    {
                      range: "0 ~ 19",
                      name: "극단적 공포",
                      desc: "패키지 폭탄·패닉셀 투매 (저점 분할매수 기회)",
                      active: fg.overall_score < 20,
                      color:
                        "border-indigo-500/50 bg-indigo-500/10 text-indigo-300",
                    },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className={`p-2.5 border flex items-center justify-between ${
                        b.active
                          ? `${b.color} font-bold`
                          : "border-slate-800 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div>
                        <span className="font-mono mr-2">{b.range}</span>
                        <span>{b.name}</span>
                        <div className="text-[11px] opacity-80 font-normal mt-0.5">
                          {b.desc}
                        </div>
                      </div>
                      {b.active && (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-950 border border-current">
                          현재 위치
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/90 border border-amber-500/30 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  비공개 데이터(거래량·호가 잔량) 미사용 원칙 명시
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {fg.unobservable_Exclusion_note}
                </p>
              </div>
            </div>
          </div>

          {/* 5 Components Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                과열·공포 지수 5대 산출 구성 요소 (실제 관측치 및 가중치)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                표본 커버리지: 시계열 {fg.sample_series_count}종 / 전체 카탈로그{" "}
                {fg.total_catalog_count}종 ({fg.data_coverage_pct}%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {fg.components.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>가중치 {(comp.weight * 100).toFixed(0)}%</span>
                      <span
                        className={`px-1.5 py-0.5 font-semibold ${
                          comp.signal === "과열"
                            ? "bg-amber-500/15 text-amber-300"
                            : comp.signal === "공포"
                              ? "bg-sky-500/15 text-sky-300"
                              : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {comp.signal}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-1">
                      {comp.name}
                    </div>
                    <div className="text-xl font-mono font-bold text-white mt-2">
                      {comp.normalized_score}
                      <span className="text-xs text-slate-500 font-normal">
                        {" "}
                        / 100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 mt-1.5 overflow-hidden">
                      <div
                        className={`h-full ${
                          comp.normalized_score >= 60
                            ? "bg-amber-400"
                            : comp.normalized_score < 40
                              ? "bg-sky-400"
                              : "bg-emerald-400"
                        }`}
                        style={{ width: `${comp.normalized_score}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-mono text-emerald-300">
                      {comp.raw_value_text}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {comp.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sector & Capital Tier Fear/Greed Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                시즌 섹터별 체감 심리지수 및 7일 수익률 비교
              </h3>
              <div className="space-y-2.5">
                {fg.by_season_sector.map((item) => (
                  <div
                    key={item.sector_id}
                    className="bg-slate-950/70 border border-slate-800 p-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        시계열 표본 {item.sample_count}종
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">7일 등락</div>
                        <ReturnBadge val={item.return_7d_pct} />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs font-mono font-bold text-white">
                          {item.score}점 ({item.band})
                        </div>
                        <div className="w-20 h-1.5 bg-slate-800 mt-1">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                자본·가격대 구간별 체감 심리지수 및 7일 수익률 비교
              </h3>
              <div className="space-y-2.5">
                {fg.by_capital_tier.map((item) => (
                  <div
                    key={item.sector_id}
                    className="bg-slate-950/70 border border-slate-800 p-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        시계열 표본 {item.sample_count}종
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">7일 등락</div>
                        <ReturnBadge val={item.return_7d_pct} />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs font-mono font-bold text-white">
                          {item.score}점 ({item.band})
                        </div>
                        <div className="w-20 h-1.5 bg-slate-800 mt-1">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: MULTI-AXIS SECTOR ANALYSIS
      ===================================================================== */}
      {subTab === "sectors" && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  다축 섹터 분석 (시즌 공급구조 · 자본 구간 · 강화 단계)
                </h3>
                <BasisBadge basis="observed" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                동일한 선수 카드라도 시즌 공급 제한 여부, 가격대(자본 구간), 강화 단계에 따라 시장 충격 반응이 다르게 나타납니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 self-start">
              {[
                { id: "season" as const, label: "시즌·공급구조 축" },
                { id: "capital_tier" as const, label: "자본·가격대 축" },
                { id: "grade" as const, label: "강화 단계 축" },
              ].map((ax) => (
                <button
                  key={ax.id}
                  onClick={() => setSectorAxis(ax.id)}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    sectorAxis === ax.id
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {ax.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(sectorAxis === "season"
              ? dashboard.season_sectors
              : sectorAxis === "capital_tier"
                ? dashboard.capital_tier_sectors
                : dashboard.grade_sectors
            ).map((sec) => (
              <div
                key={sec.sector_id}
                className="bg-slate-900/85 border border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {sec.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                          sec.confidence_level === "high"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : sec.confidence_level === "medium"
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        표본 신뢰도:{" "}
                        {sec.confidence_level === "high"
                          ? "높음"
                          : sec.confidence_level === "medium"
                            ? "보통"
                            : "표본 제한"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {sec.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-slate-400">섹터 평균가</div>
                    <div className="text-sm font-mono font-bold text-amber-300">
                      {sec.avg_bp_text} BP
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      중앙값 {sec.median_bp_text}
                    </div>
                  </div>
                </div>

                {/* Period returns & relative strength */}
                <div className="grid grid-cols-5 gap-2 bg-slate-950/80 border border-slate-800/80 p-3 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">1일 수익률</div>
                    <div className="text-xs mt-0.5">
                      <ReturnBadge val={sec.return_1d_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">7일 수익률</div>
                    <div className="text-xs mt-0.5">
                      <ReturnBadge val={sec.return_7d_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">14일 수익률</div>
                    <div className="text-xs mt-0.5">
                      <ReturnBadge val={sec.return_14d_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">30일 수익률</div>
                    <div className="text-xs mt-0.5">
                      <ReturnBadge val={sec.return_30d_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">
                      시장 대비 상대강도
                    </div>
                    <div className="text-xs mt-0.5">
                      <ReturnBadge
                        val={sec.relative_strength_vs_market}
                        suffix="%p"
                      />
                    </div>
                  </div>
                </div>

                {/* Advance / Decline Breadth Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      등락 확산도: 상승 {sec.advance_ratio}% · 보합{" "}
                      {sec.flat_ratio}% · 하락 {sec.decline_ratio}%
                    </span>
                    <span className="font-mono">
                      급등(+7%↑) {sec.surge_ratio}% / 급락(-7%↓){" "}
                      {sec.plunge_ratio}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${sec.advance_ratio}%` }}
                    />
                    <div
                      className="bg-slate-500 h-full"
                      style={{ width: `${sec.flat_ratio}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${sec.decline_ratio}%` }}
                    />
                  </div>
                </div>

                {/* Risk & Exposure Metadata */}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-950/60 border border-slate-800 p-2">
                    <span className="text-slate-500 block">공급 이벤트 노출</span>
                    <span className="text-slate-200 font-semibold">
                      {sec.supply_event_exposure}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-2">
                    <span className="text-slate-500 block">신규 시즌 대체 위험</span>
                    <span className="text-slate-200 font-semibold">
                      {sec.replacement_risk}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-2">
                    <span className="text-slate-500 block">카탈로그 / 시계열 표본</span>
                    <span className="text-slate-200 font-mono font-semibold">
                      {sec.sample_card_count}종 / {sec.timeseries_sample_count}종
                    </span>
                  </div>
                </div>

                {/* Top Movers in Sector */}
                {sec.top_movers.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-400 mb-2">
                      섹터 내 주요 변동 카드 (7일 기준)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sec.top_movers.map((m) => (
                        <div
                          key={`${m.spid}_${m.grade}`}
                          onClick={() =>
                            onInspectPlayer && onInspectPlayer(m.spid, m.grade)
                          }
                          className="bg-slate-950/90 border border-slate-800/90 hover:border-emerald-500/40 p-2 flex items-center justify-between cursor-pointer transition"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate">
                              [{m.season_code}] {m.name} +{m.grade}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {m.current_bp_text} BP
                            </div>
                          </div>
                          <ReturnBadge val={m.return_7d_pct} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: PRICE PREDICTION & 4-STAGE BACKTESTING
      ===================================================================== */}
      {subTab === "forecast_backtest" && (
        <div className="space-y-6">
          {/* Player Forecast Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Selector & On-Demand Search */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  선수별 1일·7일·30일 예측 대상 선택
                </h3>
                <BasisBadge basis="model_forecast" />
              </div>

              {/* Search any card from catalog */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    placeholder="선수명 또는 시즌 검색 (예: 호날두, 굴리트, 26TOTY)"
                    className="w-full bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {playerQuery.trim() && (
                  <div className="bg-slate-950 border border-slate-800 max-h-44 overflow-y-auto divide-y divide-slate-800/80">
                    {filteredCatalogSearch.map((c) => (
                      <button
                        key={c.spid}
                        onClick={() => {
                          setPlayerQuery("");
                          handleInspectCustomPlayer(c.spid, 1);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-900 flex items-center justify-between"
                      >
                        <span>
                          <span className="font-mono text-emerald-400 mr-1.5">
                            [{c.season_code}]
                          </span>
                          <span className="font-semibold text-slate-100">
                            {c.name}
                          </span>{" "}
                          <span className="text-slate-400">
                            ({c.primary_position} · OVR {c.ovr})
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-amber-300">
                          {formatBpKorean(c.bp_1)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-semibold pt-1">
                시계열 구축 완료 주요 선수 목록 ({dashboard.player_forecasts.length}종)
              </div>
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {dashboard.player_forecasts.map((f) => {
                  const isSelected =
                    activeForecast?.entity_id === f.entity_id;
                  const h7 = f.horizons.find((h) => h.horizon_days === 7);
                  return (
                    <button
                      key={f.entity_id}
                      onClick={() => setSelectedForecastEntityId(f.entity_id)}
                      className={`w-full p-2.5 text-left border transition flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                          : "bg-slate-950/70 border-slate-800/90 text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          [{f.season_code}] {f.name} +{f.grade}강
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          현재가: {f.current_bp_text} BP
                        </div>
                      </div>
                      {h7 && (
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-slate-400">
                            7일 기대수익
                          </div>
                          <ReturnBadge val={h7.expected_return_pct} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Forecast Detail Panel */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 space-y-5">
              {loadingPlayerForecast ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  선수 실시간 시계열 및 4단계 예측 모델을 계산 중입니다...
                </div>
              ) : activeForecast ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-emerald-300">
                          {activeForecast.season_code}
                        </span>
                        <h3 className="text-lg font-bold text-white">
                          {activeForecast.name} (+{activeForecast.grade}강)
                        </h3>
                        <span className="text-xs text-slate-400">
                          {activeForecast.primary_position}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {activeForecast.season_sector_label} ·{" "}
                        {activeForecast.capital_tier_label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">
                        현재 검증 기준가
                      </div>
                      <div className="text-xl font-mono font-bold text-amber-300">
                        {activeForecast.current_bp_text} BP
                      </div>
                    </div>
                  </div>

                  {/* Horizon Cards (1d, 7d, 30d) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeForecast.horizons.map((h) => (
                      <div
                        key={h.horizon_days}
                        className="bg-slate-950/90 border border-slate-800 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">
                            {h.horizon_days}일 예측 ({h.direction})
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono ${
                              h.status === "available"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            신뢰도 {h.confidence_score}점
                          </span>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-400">
                            기대 예측 가격 (앙상블)
                          </div>
                          <div className="text-base font-mono font-bold text-white mt-0.5">
                            {h.expected_bp_text} BP
                          </div>
                          <div className="mt-0.5">
                            <ReturnBadge val={h.expected_return_pct} />
                          </div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800/80 p-2.5 text-[11px] space-y-1">
                          <div className="text-slate-400">
                            80% 예측 가격 범위 (변동성 반영)
                          </div>
                          <div className="font-mono text-slate-200">
                            하단: {h.lower_bound_bp_text}
                          </div>
                          <div className="font-mono text-slate-200">
                            상단: {h.upper_bound_bp_text}
                          </div>
                        </div>

                        {/* Probability bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span className="text-emerald-400">
                              상승 {h.up_probability_pct}%
                            </span>
                            <span>보합 {h.flat_probability_pct}%</span>
                            <span className="text-rose-400">
                              하락 {h.down_probability_pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 flex overflow-hidden">
                            <div
                              className="bg-emerald-500"
                              style={{ width: `${h.up_probability_pct}%` }}
                            />
                            <div
                              className="bg-slate-500"
                              style={{ width: `${h.flat_probability_pct}%` }}
                            />
                            <div
                              className="bg-rose-500"
                              style={{ width: `${h.down_probability_pct}%` }}
                            />
                          </div>
                        </div>

                        {h.horizon_days === 30 && (
                          <p className="text-[10px] text-amber-300/90 leading-snug">
                            * 데이터센터 기본 30일 관측창 한계로 인해 30일 장기 예측은 시나리오 밴드 참고용(낮은 신뢰도)으로만 제공됩니다.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 4-Stage Model Comparison for 7-Day Horizon */}
                  {activeForecast.horizons[1] && (
                    <div className="bg-slate-950/70 border border-slate-800 p-4 space-y-2.5">
                      <div className="text-xs font-bold text-white">
                        7일 예측에 대한 4단계 모델별 분해 (Stepwise Model Decomposition)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        {activeForecast.horizons[1].model_predictions.map(
                          (mp) => (
                            <div
                              key={mp.model_id}
                              className="bg-slate-900/90 border border-slate-800 p-2.5"
                            >
                              <div className="text-[11px] font-semibold text-slate-300">
                                {mp.model_name}
                              </div>
                              <div className="text-xs font-mono font-bold text-white mt-1">
                                {formatBpKorean(mp.predicted_bp)} BP
                              </div>
                              <div className="text-[11px] mt-0.5 flex items-center justify-between">
                                <ReturnBadge val={mp.predicted_return_pct} />
                                <span className="text-[10px] text-slate-500 font-mono">
                                  가중치 {(mp.weight * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upward / Downward / Risk Factors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 space-y-1.5">
                      <div className="font-bold text-emerald-300 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        주요 상승·지지 요인
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                        {activeForecast.upward_factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/30 p-3 space-y-1.5">
                      <div className="font-bold text-rose-300 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        주요 하락·조정 요인
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                        {activeForecast.downward_factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-950/20 border border-amber-500/30 p-3 space-y-1.5">
                      <div className="font-bold text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        변동성 및 리스크 진단
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                        {activeForecast.risk_factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Normalized 30d Price History Chart for this card */}
                  {activeSeriesForForecast && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-200">
                          최근 30일 정규화 시세 추이 ({activeSeriesForForecast.name})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          단위 변환 계수: x
                          {activeSeriesForForecast.unit_scale_factor.toLocaleString()}{" "}
                          ({activeSeriesForForecast.quality_status})
                        </span>
                      </div>
                      <div className="w-full">
                        <MarketMultiLineChart
                          data={
                            activeSeriesForForecast.points as unknown as Record<
                              string,
                              unknown
                            >[]
                          }
                          xKey="date"
                          height={185}
                          series={[
                            {
                              key: "normalized_bp",
                              label: "정규화 시세",
                              color: "#10b981",
                              isArea: true,
                              formatValue: (v) => `${formatBpKorean(v)} BP`,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* 4-Stage Point-in-Time Backtesting Verification Report */}
          <div className="bg-slate-900/85 border border-slate-800 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    과거 데이터 기반 4단계 모델 예측 정확도 검증 (Point-in-Time Rolling Backtest)
                  </h3>
                  <BasisBadge basis="statistical_estimate" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.backtest_report.methodology_summary}
                </p>
              </div>
              <div className="text-right font-mono text-xs text-slate-300 shrink-0">
                <div>
                  검증 시계열:{" "}
                  <span className="text-emerald-400 font-bold">
                    {dashboard.backtest_report.total_series_evaluated}종
                  </span>
                </div>
                <div>
                  총 롤링 검증 횟수:{" "}
                  <span className="text-amber-300 font-bold">
                    {dashboard.backtest_report.total_rolling_windows.toLocaleString()}
                    회
                  </span>
                </div>
              </div>
            </div>

            {/* Model Comparison Tables (1-Day & 7-Day) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  title: "단기 1일(t+1) 예측 백테스트 성과 비교",
                  rows: dashboard.backtest_report.models_1d,
                },
                {
                  title: "중기 7일(t+7) 예측 백테스트 성과 비교",
                  rows: dashboard.backtest_report.models_7d,
                },
              ].map((tbl) => (
                <div
                  key={tbl.title}
                  className="bg-slate-950/80 border border-slate-800 p-4 space-y-3"
                >
                  <div className="text-xs font-bold text-white">
                    {tbl.title}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                          <th className="py-2 pr-2">모델 단계</th>
                          <th className="py-2 px-2 text-right">MAPE (오차율)</th>
                          <th className="py-2 px-2 text-right">RMSE</th>
                          <th className="py-2 px-2 text-right">방향 적중률</th>
                          <th className="py-2 pl-2 text-right">기준선 대비 개선</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {tbl.rows.map((m) => (
                          <tr key={m.model_id} className="hover:bg-slate-900/60">
                            <td className="py-2.5 pr-2">
                              <div className="font-semibold text-slate-200">
                                {m.model_name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {m.description}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                              {m.mape_pct.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                              {m.rmse_pct.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-emerald-400 font-semibold">
                              {m.directional_accuracy_pct.toFixed(1)}%
                            </td>
                            <td className="py-2.5 pl-2 text-right font-mono">
                              {m.model_id === "M1_NAIVE" ? (
                                <span className="text-slate-500">기준선(Baseline)</span>
                              ) : m.beats_baseline_mape ? (
                                <span className="text-emerald-400 font-bold">
                                  오차 -{m.improvement_vs_baseline_pct.toFixed(1)}% 감소
                                </span>
                              ) : (
                                <span className="text-amber-400">
                                  {m.improvement_vs_baseline_pct.toFixed(1)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Sector & Event Window Backtest Breakdown + Actual vs Predicted Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-4">
                <div className="text-xs font-bold text-white">
                  섹터별 · 이벤트 구간별 7일 예측 오차율(MAPE) 비교
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-1.5">시즌 섹터 구분</th>
                        <th className="py-1.5 text-right">M1(기준선)</th>
                        <th className="py-1.5 text-right">M4(통합모델)</th>
                        <th className="py-1.5 text-right">최우수 모델</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dashboard.backtest_report.by_season_sector_7d.map(
                        (row) => (
                          <tr key={row.sector_name}>
                            <td className="py-2 text-slate-200 font-medium">
                              {row.sector_name}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-400">
                              {row.m1_mape_pct.toFixed(2)}%
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-emerald-400">
                              {row.m4_mape_pct.toFixed(2)}%
                            </td>
                            <td className="py-2 text-right text-[11px] text-cyan-300">
                              {row.best_model_name}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300 mb-2">
                    이벤트·변동성 구간(10.01~10.16) vs 일반 평시 구간 비교
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {dashboard.backtest_report.event_vs_normal_period.map(
                      (p) => (
                        <div
                          key={p.period_type}
                          className="bg-slate-900 border border-slate-800 p-3"
                        >
                          <div className="text-xs font-bold text-slate-200">
                            {p.period_type}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            M1 오차:{" "}
                            <span className="font-mono text-slate-200">
                              {p.m1_mape_pct}%
                            </span>{" "}
                            → M4 오차:{" "}
                            <span className="font-mono text-emerald-400 font-bold">
                              {p.m4_mape_pct}%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            방향 적중률:{" "}
                            <span className="font-mono text-amber-300">
                              {p.m4_directional_accuracy_pct}%
                            </span>{" "}
                            (검증 {p.window_count}건)
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Actual vs Predicted Trace Chart */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white">
                    실제 가격 vs 4단계 통합 모델(M4) 워크포워드 예측 궤적
                  </div>
                  <select
                    value={selectedTraceSpid}
                    onChange={(e) =>
                      setSelectedTraceSpid(Number(e.target.value))
                    }
                    className="bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs text-slate-200"
                  >
                    {dashboard.backtest_report.sample_traces.map((t) => (
                      <option key={t.spid} value={t.spid}>
                        [{t.season_code}] {t.name} +{t.grade}강
                      </option>
                    ))}
                  </select>
                </div>

                {activeBacktestTrace && (
                  <div className="w-full">
                    <MarketMultiLineChart
                      data={
                        activeBacktestTrace.points as unknown as Record<
                          string,
                          unknown
                        >[]
                      }
                      xKey="date"
                      height={220}
                      series={[
                        {
                          key: "actual_bp",
                          label: "실제 관측 가격 (Actual)",
                          color: "#10b981",
                          formatValue: (v) => `${formatBpKorean(v)} BP`,
                        },
                        {
                          key: "m4_pred_bp",
                          label: "M4 통합 모델 예측 (Predicted)",
                          color: "#f59e0b",
                          dashed: true,
                          formatValue: (v) => `${formatBpKorean(v)} BP`,
                        },
                        {
                          key: "m1_pred_bp",
                          label: "M1 단순 기준선",
                          color: "#64748b",
                          dashed: true,
                          formatValue: (v) => `${formatBpKorean(v)} BP`,
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: EVENT IMPACT, SUPPLY SCENARIOS & FEE COUPON SIMULATOR
      ===================================================================== */}
      {subTab === "events_supply" && (
        <div className="space-y-6">
          {/* Event DID Impact Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  이벤트·프로모션 전후 시세 영향 및 대조군 이중차분(DID) 분석
                </h3>
                <p className="text-xs text-slate-400">
                  단순 전후 비교의 오류를 줄이기 위해 이벤트 직접 노출 섹터(Affected)와 비노출 대조군(Control)의 동일 기간 수익률 차이를 비교합니다.
                </p>
              </div>
              <BasisBadge basis="statistical_estimate" />
            </div>

            {dashboard.event_impacts.map((imp) => (
              <div
                key={imp.event.id}
                className="bg-slate-900/85 border border-slate-800 p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {imp.event.event_type_label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        기간: {imp.event.start_date} ~ {imp.event.end_date}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        출처: {imp.event.source}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {imp.event.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300">
                      BP 공급: {imp.event.bp_injection_scale}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300">
                      선수팩 공급: {imp.event.pack_supply_scale}
                    </span>
                    {imp.event.fee_coupon_discount_pct > 0 && (
                      <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        수수료 쿠폰 {imp.event.fee_coupon_discount_pct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Pre / During / Post / Control / DID Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-950/80 border border-slate-800 p-3.5 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">
                      이벤트 직전 (Pre)
                    </div>
                    <div className="mt-1">
                      <ReturnBadge val={imp.pre_event_return_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">
                      이벤트 기간 (대상군)
                    </div>
                    <div className="mt-1">
                      <ReturnBadge val={imp.during_event_return_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">
                      동일 기간 비대상 (대조군)
                    </div>
                    <div className="mt-1">
                      <ReturnBadge val={imp.control_during_return_pct} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-amber-300 font-semibold">
                      대조군 대비 순효과 (DID)
                    </div>
                    <div className="mt-1">
                      <ReturnBadge val={imp.did_net_effect_pct} suffix="%p" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">
                      이벤트 종료 후 (Post)
                    </div>
                    <div className="mt-1">
                      <ReturnBadge val={imp.post_event_return_pct} />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/50 border border-slate-800/80 p-3">
                  <strong className="text-emerald-400 mr-1.5">
                    [경제 메커니즘 판정]
                  </strong>
                  {imp.mechanism_diagnosis}
                </p>

                {/* 3-Stage Supply Scenario Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {imp.supply_scenarios.map((sc) => (
                    <div
                      key={sc.scenario}
                      className="bg-slate-950/70 border border-slate-800 p-3 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-200 flex items-center justify-between">
                        <span>공급 추정: {sc.scenario}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          공급지수 {sc.estimated_pack_influx_index}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>BP 유입 인플레이션 압력:</span>
                        <span className="font-mono text-emerald-400">
                          +{sc.estimated_bp_inflation_effect_pct}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>선수팩 매물 희석 압력:</span>
                        <span className="font-mono text-rose-400">
                          {sc.estimated_supply_dilution_effect_pct}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold pt-1 border-t border-slate-800">
                        <span className="text-slate-300">순 기대 시세 영향:</span>
                        <ReturnBadge val={sc.net_expected_price_impact_pct} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Fee Discount Coupon & Net Proceeds Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/85 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    이적시장 수수료 할인 쿠폰 · 손익분기 재매수 시뮬레이터
                  </h3>
                </div>
                <BasisBadge basis="observed" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">
                    매도 예정 카드 가격 (단위: 억 BP)
                  </label>
                  <input
                    type="number"
                    value={simSalePriceEok}
                    onChange={(e) =>
                      setSimSalePriceEok(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                  />
                  <div className="text-[11px] text-amber-300 font-mono mt-1">
                    = {formatBpKorean(feeSimResult.saleBp)} BP
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    수수료 할인 쿠폰 적용률 (%)
                  </label>
                  <select
                    value={simCouponPct}
                    onChange={(e) => setSimCouponPct(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                  >
                    <option value={0}>쿠폰 미적용 (0%)</option>
                    <option value={15}>15% 수수료 할인 쿠폰</option>
                    <option value={20}>20% 수수료 할인 쿠폰</option>
                    <option value={30}>30% 수수료 할인 쿠폰</option>
                    <option value={40}>40% 수수료 할인 쿠폰</option>
                    <option value={50}>50% 수수료 할인 쿠폰</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simHasTopClass}
                    onChange={(e) => setSimHasTopClass(e.target.checked)}
                  />
                  TOP Class 보유 (기본 수수료 20% 감면)
                </label>
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simHasPcRoom}
                    onChange={(e) => setSimHasPcRoom(e.target.checked)}
                  />
                  프리미엄 PC방 혜택 (기본 수수료 30% 감면)
                </label>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">실효 거래 수수료율:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {feeSimResult.effectiveTaxPct}% (기본 40% 대비 감면)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">수수료 차감 후 실수령액:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatBpKorean(feeSimResult.netProceedsBp)} BP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">쿠폰으로 절약한 BP:</span>
                  <span className="font-mono text-cyan-300">
                    +{formatBpKorean(feeSimResult.couponSavedBp)} BP
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-semibold">
                    동일 카드 재매수 시 손익분기 하락폭:
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    -{feeSimResult.breakevenDropPct}% 이하 하락 시 이득
                  </span>
                </div>
              </div>
            </div>

            {/* Event Registration Form */}
            <form
              onSubmit={handleRegisterEvent}
              className="bg-slate-900/85 border border-slate-800 p-5 space-y-3.5"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  신규 프로모션 · 패치 이벤트 수동 등록 및 즉시 영향 분석
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                공식 홈페이지 공지나 신규 패키지·버닝 이벤트를 등록하면 즉시 시계열 대조군(DID) 분석에 반영됩니다.
              </p>
              <div className="space-y-2.5 text-xs">
                <input
                  type="text"
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                  placeholder="이벤트 제목 (예: 주말 스페셜 버닝 & 40% 수수료 쿠폰 지급)"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newEvtType}
                    onChange={(e) =>
                      setNewEvtType(
                        e.target.value as
                          | "PACK_RELEASE"
                          | "FEE_DISCOUNT_COUPON"
                          | "BP_SUPPLY"
                          | "TRAIT_ENGINE_PATCH"
                      )
                    }
                    className="bg-slate-950 border border-slate-700 px-2.5 py-2 text-white"
                  >
                    <option value="PACK_RELEASE">선수팩·패키지 공급</option>
                    <option value="FEE_DISCOUNT_COUPON">수수료 할인 쿠폰</option>
                    <option value="BP_SUPPLY">BP 버닝·대량 지급</option>
                    <option value="TRAIT_ENGINE_PATCH">특성·인게임 패치</option>
                  </select>
                  <input
                    type="text"
                    value={newEvtStart}
                    onChange={(e) => setNewEvtStart(e.target.value)}
                    placeholder="시작일 (예: 10.12)"
                    className="bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                  <input
                    type="text"
                    value={newEvtEnd}
                    onChange={(e) => setNewEvtEnd(e.target.value)}
                    placeholder="종료일 (예: 10.18)"
                    className="bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newEvtSeasons}
                    onChange={(e) => setNewEvtSeasons(e.target.value)}
                    placeholder="대상 시즌 코드 (쉼표 구분: 26TOTY,WS)"
                    className="bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                  <input
                    type="number"
                    value={newEvtCouponPct}
                    onChange={(e) => setNewEvtCouponPct(Number(e.target.value))}
                    placeholder="쿠폰 할인율 (%)"
                    className="bg-slate-950 border border-slate-700 px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition"
                >
                  이벤트 등록 및 대조군(DID) 영향 재산출
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: NEW TRAIT & PLAYER TRAIT META ANALYSIS
      ===================================================================== */}
      {subTab === "trait_meta" && (
        <div className="space-y-6">
          {/* Section A: Competing Trait Substitution Empirical Testing */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    경쟁 특성 대체 효과 실증 검증 (예: 아크로바틱 피니셔·크로스 포쳐 vs 라인 브레이커)
                  </h3>
                  <BasisBadge basis="statistical_estimate" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  특정 선수 이름을 하드코딩하지 않고, 실제 보유 특성·포지션·동일 시즌 등급 매칭 표본과 30일 시계열 수익률을 비교해 가설이 지지되는지 검증합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dashboard.trait_substitutions.map((c, idx) => (
                  <button
                    key={c.case_id}
                    onClick={() => setSelectedSubstitutionCaseId(c.case_id)}
                    className={`px-3 py-1.5 text-xs font-semibold border transition ${
                      activeSubstitutionCase?.case_id === c.case_id
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                    }`}
                  >
                    실증 가설 {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {activeSubstitutionCase && (
              <div className="space-y-5">
                <div className="bg-slate-950/90 border border-slate-800 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white">
                      {activeSubstitutionCase.title}
                    </h4>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold border ${
                        activeSubstitutionCase.empirical_verdict.includes(
                          "가설 지지"
                        )
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          : activeSubstitutionCase.empirical_verdict.includes(
                                "부분 지지"
                              )
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      실증 판정: {activeSubstitutionCase.empirical_verdict}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeSubstitutionCase.hypothesis}
                  </p>
                  <p className="text-xs text-emerald-300 pt-1 font-medium">
                    → {activeSubstitutionCase.verdict_explanation}
                  </p>
                </div>

                {/* Comparison Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">
                      신규·부상 특성군 ({activeSubstitutionCase.rising_traits.join("·")})
                    </div>
                    <div className="text-sm font-mono font-bold text-white mt-1">
                      7일 평균{" "}
                      <ReturnBadge
                        val={activeSubstitutionCase.rising_avg_return_7d_pct}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      표본 {activeSubstitutionCase.rising_group_sample_count}종 / 30일{" "}
                      {activeSubstitutionCase.rising_avg_return_30d_pct}%
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">
                      기존 단독 특성군 ({activeSubstitutionCase.incumbent_trait})
                    </div>
                    <div className="text-sm font-mono font-bold text-white mt-1">
                      7일 평균{" "}
                      <ReturnBadge
                        val={activeSubstitutionCase.incumbent_avg_return_7d_pct}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      표본 {activeSubstitutionCase.incumbent_group_sample_count}종 / 30일{" "}
                      {activeSubstitutionCase.incumbent_avg_return_30d_pct}%
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">
                      부상 특성 통제 프리미엄
                    </div>
                    <div className="text-base font-mono font-bold text-emerald-400 mt-1">
                      {activeSubstitutionCase.controlled_rising_premium_pct >= 0
                        ? "+"
                        : ""}
                      {activeSubstitutionCase.controlled_rising_premium_pct}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      동일 포지션·시즌·OVR 매칭
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">
                      기존 특성 통제 프리미엄
                    </div>
                    <div className="text-base font-mono font-bold text-cyan-300 mt-1">
                      {activeSubstitutionCase.controlled_incumbent_premium_pct >=
                      0
                        ? "+"
                        : ""}
                      {activeSubstitutionCase.controlled_incumbent_premium_pct}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      동일 포지션·시즌·OVR 매칭
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">
                      전체 시장 벤치마크 (7일)
                    </div>
                    <div className="text-sm font-mono font-bold text-white mt-1">
                      <ReturnBadge
                        val={
                          activeSubstitutionCase.market_benchmark_return_7d_pct
                        }
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      대상 포지션:{" "}
                      {activeSubstitutionCase.target_positions.join("·")}
                    </div>
                  </div>
                </div>

                {/* 30-Day Comparative Trajectory + Representative Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-950/80 border border-slate-800 p-4">
                    <div className="text-xs font-bold text-white mb-2">
                      30일 상대 지수 궤적 비교 (초기 시점 = 100)
                    </div>
                    <div className="w-full">
                      <MarketMultiLineChart
                        data={
                          activeSubstitutionCase.comparative_curve_30d as unknown as Record<
                            string,
                            unknown
                          >[]
                        }
                        xKey="date"
                        height={215}
                        series={[
                          {
                            key: "rising_index",
                            label: `신규·부상 (${activeSubstitutionCase.rising_traits.join("·")})`,
                            color: "#10b981",
                            formatValue: (v) => v.toFixed(1),
                          },
                          {
                            key: "incumbent_index",
                            label: `기존 경쟁 (${activeSubstitutionCase.incumbent_trait})`,
                            color: "#f59e0b",
                            formatValue: (v) => v.toFixed(1),
                          },
                          {
                            key: "market_index",
                            label: "시장 전체 평균",
                            color: "#64748b",
                            dashed: true,
                            formatValue: (v) => v.toFixed(1),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-2.5">
                    <div className="text-xs font-bold text-white">
                      실제 데이터셋 내 대표 비교 카드 표본 (하드코딩 없음)
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeSubstitutionCase.representative_cards.map((rc) => (
                        <div
                          key={`${rc.spid}_${rc.group}`}
                          onClick={() =>
                            onInspectPlayer && onInspectPlayer(rc.spid, 1)
                          }
                          className="bg-slate-900/90 border border-slate-800 p-2.5 flex items-center justify-between cursor-pointer hover:border-emerald-500/40"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-semibold ${
                                  rc.group === "신규·부상 특성군"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-amber-500/15 text-amber-300"
                                }`}
                              >
                                {rc.group}
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                [{rc.season_code}] {rc.name} ({rc.position} · OVR{" "}
                                {rc.ovr})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              보유 특성: {rc.key_traits.join(", ")}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-xs font-mono font-bold text-amber-300">
                              {rc.current_bp_text}
                            </div>
                            <ReturnBadge val={rc.return_7d_pct} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Controlled Trait Premium vs Simple Unadjusted Difference */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/85 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    특성별 단순 가격 차이 vs 교란변수 통제 프리미엄 (Controlled Trait Premium)
                  </h3>
                  <p className="text-xs text-slate-400">
                    고급 특성이 비싼 시즌에 집중되는 착시를 제거하기 위해 동일 포지션군 · 동일 시즌 섹터 · OVR ±2 이내 매칭 쌍(Matched Pairs)으로 순수 특성 프리미엄을 분리합니다.
                  </p>
                </div>
                <BasisBadge basis="statistical_estimate" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 pr-2">특성명 (티어)</th>
                      <th className="py-2 px-2 text-right">보유/매칭 표본</th>
                      <th className="py-2 px-2 text-right">
                        단순 평균 차이 (보정 전)
                      </th>
                      <th className="py-2 px-2 text-right">
                        통제 프리미엄 (중앙값)
                      </th>
                      <th className="py-2 px-2 text-right">7일 초과수익률</th>
                      <th className="py-2 pl-2 text-right">신뢰도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {dashboard.trait_premiums.map((tp) => (
                      <tr
                        key={tp.trait_name}
                        onClick={() => setSelectedTraitForDetail(tp.trait_name)}
                        className={`cursor-pointer transition ${
                          selectedTraitForDetail === tp.trait_name
                            ? "bg-emerald-500/10"
                            : "hover:bg-slate-950/60"
                        }`}
                      >
                        <td className="py-2.5 pr-2">
                          <div className="font-bold text-white">
                            {tp.trait_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tp.meta_tier} · {tp.category}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                          {tp.holder_sample_count}종 / {tp.matched_pair_count}쌍
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {tp.unadjusted_diff_pct >= 0 ? "+" : ""}
                          {tp.unadjusted_diff_pct}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400">
                          {tp.controlled_premium_median_pct >= 0 ? "+" : ""}
                          {tp.controlled_premium_median_pct}%
                          <div className="text-[10px] font-normal text-slate-500">
                            IQR [{tp.controlled_premium_iqr_low_pct}% ~{" "}
                            {tp.controlled_premium_iqr_high_pct}%]
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <ReturnBadge
                            val={tp.excess_return_7d_pct}
                            suffix="%p"
                          />
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold ${
                              tp.confidence_level === "높음"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : tp.confidence_level === "보통"
                                  ? "bg-cyan-500/15 text-cyan-300"
                                  : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {tp.confidence_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: Matched Pair Examples for Selected Trait */}
            <div className="bg-slate-900/85 border border-slate-800 p-5 space-y-4">
              {activeTraitPremium && (
                <>
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      선택 특성 통제 비교 상세
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      [{activeTraitPremium.trait_name}] 유사 조건 매칭 사례
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeTraitPremium.interpretation}
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 text-[11px] text-slate-300 space-y-1">
                    <div className="font-semibold text-amber-300">
                      통제된 교란 요인 (Confounders Controlled)
                    </div>
                    <div>{activeTraitPremium.confounder_control_summary}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-200">
                      실제 매칭된 보유 vs 미보유 카드 비교 쌍
                    </div>
                    {activeTraitPremium.matched_examples.length === 0 ? (
                      <div className="text-xs text-slate-500 p-4 bg-slate-950 border border-slate-800">
                        동일 시즌 섹터 및 OVR ±2 조건을 동시에 만족하는 매칭 쌍 표본이 부족합니다.
                      </div>
                    ) : (
                      activeTraitPremium.matched_examples.map((ex, i) => (
                        <div
                          key={i}
                          className="bg-slate-950/90 border border-slate-800 p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-[11px] font-mono text-slate-400">
                              매칭 사례 #{i + 1} (OVR 차이 {ex.ovr_gap})
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              가격 차이: {ex.premium_pct >= 0 ? "+" : ""}
                              {ex.premium_pct}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 mr-1.5">
                                보유
                              </span>
                              <span className="font-semibold text-white">
                                [{ex.with_card.season_code}] {ex.with_card.name}
                              </span>{" "}
                              <span className="text-slate-400">
                                ({ex.with_card.position} · {ex.with_card.ovr})
                              </span>
                            </div>
                            <span className="font-mono text-amber-300">
                              {ex.with_card.bp_1_text}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 mr-1.5">
                                미보유
                              </span>
                              <span className="font-semibold text-slate-300">
                                [{ex.without_card.season_code}]{" "}
                                {ex.without_card.name}
                              </span>{" "}
                              <span className="text-slate-500">
                                ({ex.without_card.position} ·{" "}
                                {ex.without_card.ovr})
                              </span>
                            </div>
                            <span className="font-mono text-slate-400">
                              {ex.without_card.bp_1_text}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section C: Trait-Lacking Season Discount Analysis & Patch History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/85 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    시즌별 핵심 메타 특성 보유율 및 특성 부재 가치 할인(Discount) 분석
                  </h3>
                  <p className="text-xs text-slate-400">
                    인기 신규 특성(크로스 포쳐·아크로바틱 피니셔·패스 마스터 등)이 없는 시즌이 동일 OVR 기대가 대비 할인을 받는지, 아니면 단종 희소성·양발로 방어하는지 판별합니다.
                  </p>
                </div>
                <BasisBadge basis="statistical_estimate" />
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 pr-2">시즌</th>
                      <th className="py-2 px-2 text-right">평균 OVR / 기준가</th>
                      <th className="py-2 px-2 text-right">
                        핵심특성 보유율 (평균 개수)
                      </th>
                      <th className="py-2 px-2 text-right">
                        동일 OVR 대비 프리미엄/할인
                      </th>
                      <th className="py-2 pl-2">미보유 주요 특성 및 방어 요인</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {dashboard.trait_season_discounts.slice(0, 14).map((sd) => (
                      <tr key={sd.season_code} className="hover:bg-slate-950/60">
                        <td className="py-2.5 pr-2">
                          <div className="font-mono font-bold text-emerald-300">
                            {sd.season_code}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            표본 {sd.evaluated_card_count}종
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          <div className="text-white font-semibold">
                            OVR {sd.avg_ovr}
                          </div>
                          <div className="text-amber-300 text-[11px]">
                            {sd.avg_bp_1_text}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          <div className="text-slate-200 font-semibold">
                            {sd.core_meta_trait_coverage_pct}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            평균 {sd.avg_trait_count}개
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          <ReturnBadge val={sd.trait_deficit_discount_pct} />
                        </td>
                        <td className="py-2.5 pl-2 text-[11px] text-slate-300 max-w-xs">
                          <div className="text-slate-400">
                            {sd.missing_key_traits.length > 0
                              ? `미보유: ${sd.missing_key_traits.slice(0, 3).join(", ")}`
                              : "주요 메타 특성 전방위 보유"}
                          </div>
                          <div className="text-emerald-300/90 text-[10px] mt-0.5">
                            보완: {sd.compensating_factors.join(" · ")}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trait Patch History */}
            <div className="bg-slate-900/85 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  특성 패치 및 메타 변화 이력
                </h3>
                <BasisBadge basis="observed" />
              </div>
              <div className="space-y-3">
                {dashboard.trait_patches.map((tp) => (
                  <div
                    key={tp.id}
                    className="bg-slate-950/90 border border-slate-800 p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                        {tp.change_type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {tp.patch_date}
                      </span>
                    </div>
                    <div className="font-bold text-white">{tp.title}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {tp.summary}
                    </p>
                    <div className="text-[11px] text-emerald-300 bg-slate-900 p-2 border border-slate-800">
                      <strong>시장 반응:</strong> {tp.observed_market_reaction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 6: COLLECTION OPERATIONS, UNIT AUDIT & TRANSPARENCY
      ===================================================================== */}
      {subTab === "operations" && (
        <div className="space-y-6">
          <div className="bg-slate-900/85 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  데이터 수집 아키텍처 · 시계열 단위 정규화 이력 · 비공개 지표 투명성 고지
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.collection_status.environment_mode}
                </p>
              </div>
              <button
                onClick={handleRunIncrementalBatch}
                disabled={collectingBatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs shrink-0"
              >
                {collectingBatch
                  ? "증분 배치 실행 중..."
                  : "수동 증분 수집 배치 실행 (5종)"}
              </button>
            </div>

            {batchMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono">
                {batchMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-1.5">
                <div className="font-bold text-slate-200">
                  요청 제한(Rate Limit) 및 차단 방지 정책
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {dashboard.collection_status.rate_limit_policy}
                </p>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-1.5">
                <div className="font-bold text-slate-200">
                  시계열 누적 및 중복 방지 정책
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {dashboard.collection_status.deduplication_policy}
                </p>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-4 space-y-1.5">
                <div className="font-bold text-amber-300">
                  비공개·관측 불가 데이터 처리 원칙
                </div>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                  {dashboard.collection_status.unobservable_metrics_disclosure.map(
                    (item, idx) => (
                      <li key={idx}>{item}</li>
                    )
                  )}
                </ul>
              </div>
            </div>

            {/* Unit Conversion Audit Table */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  데이터센터 시계열 그래프 원본값(Raw) vs 검증 기준가(Verified BP) 단위 정규화 감사 로그
                </h4>
                <span className="text-xs font-mono text-slate-400">
                  직접 일치 {dashboard.collection_status.direct_verified_series_count}종 / 스케일 보정{" "}
                  {dashboard.collection_status.unit_rescaled_series_count}종
                </span>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 pr-2">시계열 키 (선수)</th>
                      <th className="py-2 px-2 text-right">
                        그래프 원본 최신값 (Raw)
                      </th>
                      <th className="py-2 px-2 text-right">
                        검증된 카드 기준가 (Verified)
                      </th>
                      <th className="py-2 px-2 text-right">적용 스케일 배수</th>
                      <th className="py-2 pl-2">단위 변환 사유 및 품질 상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {dashboard.collection_status.unit_conversion_samples.map(
                      (rec) => (
                        <tr key={rec.key} className="hover:bg-slate-950/60">
                          <td className="py-2 pr-2 font-mono text-slate-200">
                            [{rec.season_code}] {rec.player_name} +{rec.grade}강
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-400">
                            {rec.raw_latest_value.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-amber-300 font-semibold">
                            {formatBpKorean(rec.verified_card_bp)} BP
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-400">
                            x{rec.applied_scale_factor.toLocaleString()}
                          </td>
                          <td className="py-2 pl-2 text-[11px] text-slate-400">
                            {rec.conversion_reason}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
