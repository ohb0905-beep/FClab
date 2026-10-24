"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Scale,
  ArrowRight,
  Compass,
  Info,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  PlayerCard,
  PlayerProfileResult,
  ArchetypeFitItem,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  getEnhanceOvrBoost,
  getEnhanceBadgeStyle,
  getPositionToneClass,
  getStatColorClass,
} from "@/lib/fclab-types";
import {
  PlayerAvatar,
  SeasonBadge,
  HexRadarChart,
} from "./VisualCharts";

interface PlayerProfileLabViewProps {
  initialSpid?: number | null;
  initialCompareSpid?: number | null;
  rules?: SystemRules;
  onInspectInPlayerLab: (spid: number) => void;
  onSendToEfficiencyLab: (name: string, position: string) => void;
}

const ALL_ANALYSIS_POSITIONS = [
  "ST",
  "CF",
  "LW",
  "RW",
  "LM",
  "RM",
  "CAM",
  "CM",
  "CDM",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "GK",
];

export default function PlayerProfileLabView({
  initialSpid,
  initialCompareSpid,
  rules = DEFAULT_SYSTEM_RULES,
  onInspectInPlayerLab,
  onSendToEfficiencyLab,
}: PlayerProfileLabViewProps) {
  const maxEnhanceLevel = rules.maxEnhanceLevel || 13;
  const [searchQuery, setSearchQuery] = useState("손흥민");
  const [searchResults, setSearchResults] = useState<PlayerCard[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedSpid, setSelectedSpid] = useState<number>(
    initialSpid || 280200104
  );
  const [compareSpid, setCompareSpid] = useState<number | null>(
    initialCompareSpid || null
  );
  const [grade, setGrade] = useState<number>(5);
  const [teamColorBonus, setTeamColorBonus] = useState<number>(3);
  const [targetPosition, setTargetPosition] = useState<string>("");
  const [showOtherPositions, setShowOtherPositions] = useState<boolean>(false);
  const [showCriteriaDetail, setShowCriteriaDetail] = useState<boolean>(true);

  const [profileData, setProfileData] = useState<{
    card: PlayerCard;
    profile: PlayerProfileResult;
    compareProfile: PlayerProfileResult | null;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedArchetype, setSelectedArchetype] =
    useState<ArchetypeFitItem | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      if (initialSpid) {
        setSelectedSpid(initialSpid);
        setTargetPosition("");
      }
      if (initialCompareSpid !== undefined) {
        setCompareSpid(initialCompareSpid);
      }
    });
    return () => {
      active = false;
    };
  }, [initialSpid, initialCompareSpid]);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("sort", "ovr_desc");
      const res = await fetch(`/api/fclab/v1/players/search?${params.toString()}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.items)) {
        setSearchResults(json.items);
      }
    } catch {
      // ignore transient error
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) runSearch(searchQuery);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfileAnalysis = useCallback(
    async (
      spid: number,
      g: number,
      tc: number,
      compSpid: number | null,
      posOverride: string
    ) => {
      if (!spid) return;
      setLoadingProfile(true);
      try {
        const params = new URLSearchParams({
          spid: String(spid),
          grade: String(g),
          team_color: String(tc),
        });
        if (compSpid) {
          params.set("compare_spid", String(compSpid));
        }
        if (posOverride) {
          params.set("pos", posOverride);
        }
        const res = await fetch(
          `/api/fclab/v1/profile/analyze?${params.toString()}`
        );
        const json = await res.json();
        if (json.ok && json.profile) {
          setProfileData({
            card: json.card,
            profile: json.profile,
            compareProfile: json.compare_profile || null,
          });
          setSelectedArchetype(
            json.profile.primary_archetype ||
              json.profile.position_archetypes?.[0] ||
              null
          );
        }
      } catch {
        // ignore error
      } finally {
        setLoadingProfile(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadProfileAnalysis(
          selectedSpid,
          grade,
          teamColorBonus,
          compareSpid,
          targetPosition
        );
      }
    });
    return () => {
      active = false;
    };
  }, [
    selectedSpid,
    grade,
    teamColorBonus,
    compareSpid,
    targetPosition,
    loadProfileAnalysis,
  ]);

  const profile = profileData?.profile;
  const card = profileData?.card;
  const compareProfile = profileData?.compareProfile;

  const positionArchetypes =
    profile?.position_archetypes && profile.position_archetypes.length > 0
      ? profile.position_archetypes
      : (profile?.all_archetypes || []).slice(0, 4);

  const crossPositionArchetypes = (profile?.all_archetypes || []).filter(
    (item) => !positionArchetypes.some((pa) => pa.id === item.id)
  );

  const completeEval = profile?.complete_evaluation;
  const physFoot = profile?.physical_foot_analysis;

  return (
    <div className="space-y-6">
      {/* Header & Search Controls */}
      <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              PLAYER PROFILE LAB · POSITION-SPECIFIC ARCHETYPE &amp; COMPLETE GATE
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              포지션별 선수 유형 특화도 &amp; 완성형 5대 기준 정밀 분석
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              단순 OVR 비례 점수를 배제하고 <strong className="text-slate-200">역할 수행 능력(절대 수준)</strong>과{" "}
              <strong className="text-emerald-300">유형 특화도(상대적 플레이 성향)</strong>를 분리 산출하며,{" "}
              <strong className="text-amber-300">완성형</strong>은 5대 엄격 기준을 모두 통과한 경우에만 부여합니다.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(searchQuery);
            }}
            className="flex flex-wrap items-center gap-2.5"
          >
            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="선수명 검색 (예: 홀란, 굴리트, 호날두)"
                className="w-full bg-[#0B0F17] border border-slate-700/80 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                강화
              </span>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-semibold text-emerald-400 outline-none"
              >
                {Array.from({ length: maxEnhanceLevel }, (_, idx) => idx + 1).map(
                  (g) => (
                    <option key={g} value={g} className="bg-[#0B0F17]">
                      +{g}강 (+
                      {getEnhanceOvrBoost(g, rules.enhanceOvrBoosts)})
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                팀컬러
              </span>
              <select
                value={teamColorBonus}
                onChange={(e) => setTeamColorBonus(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-semibold text-sky-400 outline-none"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tc) => (
                  <option key={tc} value={tc} className="bg-[#0B0F17]">
                    +{tc}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {searching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              선수 검색
            </button>
          </form>
        </div>

        {/* Horizontal Quick Candidate Picker */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">
              검색 결과 ({searchResults.length}장) — 클릭하여 분석 대상 지정 / 우측 저울 아이콘으로 비교 선수 지정
            </span>
            {compareSpid && (
              <button
                type="button"
                onClick={() => setCompareSpid(null)}
                className="text-xs text-amber-400 hover:underline whitespace-nowrap shrink-0"
              >
                비교 선수 해제
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
            {searchResults.slice(0, 14).map((item) => {
              const isMain = item.spid === selectedSpid;
              const isComp = item.spid === compareSpid;
              return (
                <div
                  key={item.spid}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors shrink-0 ${
                    isMain
                      ? "bg-emerald-500/15 border-emerald-500/60"
                      : isComp
                      ? "bg-amber-500/15 border-amber-500/60"
                      : "bg-[#0B0F17]/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpid(item.spid);
                      setTargetPosition("");
                    }}
                    className="flex items-center gap-2 text-left"
                  >
                    <PlayerAvatar
                      spid={item.spid}
                      pid={item.pid}
                      name={item.name}
                      thumbUrl={item.thumb_url}
                      size={32}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <SeasonBadge
                          seasonCode={item.season_code}
                          seasonImg={item.season_img}
                        />
                        <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                        <span className={getPositionToneClass(item.primary_position)}>
                          {item.primary_position}
                        </span>{" "}
                        · OVR {item.ovr} · 급여 {item.salary}
                      </div>
                    </div>
                  </button>
                  {!isMain && (
                    <button
                      type="button"
                      onClick={() =>
                        setCompareSpid(isComp ? null : item.spid)
                      }
                      title="비교 대상으로 설정"
                      className={`p-1.5 rounded border text-xs transition-colors whitespace-nowrap shrink-0 ${
                        isComp
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-semibold"
                          : "border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loadingProfile && !profile ? (
        <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-12 text-center">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-300">
            포지션별 역할 수행 능력, 상대적 유형 특화도, 완성형 5대 기준을 정밀 검증 중입니다...
          </p>
        </div>
      ) : profile && card ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Core Identity, Primary/Secondary/Complete Verdict, Radar, Physical/Foot Transparency */}
          <div className="lg:col-span-5 space-y-5">
            {/* Player Summary & Core Verdict Card */}
            <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <PlayerAvatar
                    spid={card.spid}
                    pid={card.pid}
                    name={card.name}
                    thumbUrl={card.thumb_url}
                    size={64}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeasonBadge
                        seasonCode={card.season_code}
                        seasonImg={card.season_img}
                      />
                      <span
                        className={`text-sm font-mono font-bold ${getPositionToneClass(
                          profile.analyzed_position || card.primary_position
                        )}`}
                      >
                        {profile.analyzed_position || card.primary_position}
                      </span>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded border ${
                          getEnhanceBadgeStyle(profile.grade).className
                        }`}
                      >
                        +{profile.grade}강
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        실효 OVR {profile.effective_ovr}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      {card.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                      {profile.height}cm · {profile.weight}kg · {profile.body_type} · 양발/주발({profile.foot}) · 개인기 {profile.skill_moves}
                    </p>
                  </div>
                </div>
              </div>

              {/* Analyzed Position Switcher */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>분석 포지션 기준:</span>
                  <span className="font-semibold text-emerald-400">
                    {profile.position_group_label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {(profile.available_positions || [card.primary_position]).map(
                    (pos) => {
                      const active =
                        (targetPosition || card.primary_position) === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTargetPosition(pos)}
                          className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                            active
                              ? "bg-emerald-500 text-slate-950 font-bold"
                              : "bg-[#0B0F17] text-slate-400 border border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {pos}
                        </button>
                      );
                    }
                  )}
                  <select
                    value={targetPosition || card.primary_position}
                    onChange={(e) => setTargetPosition(e.target.value)}
                    className="bg-[#0B0F17] border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-300 outline-none"
                    title="다른 포지션 기준으로 유형 테스트"
                  >
                    {ALL_ANALYSIS_POSITIONS.map((p) => (
                      <option key={p} value={p} className="bg-[#0B0F17]">
                        {p} 기준
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Complete Status Banner */}
              {completeEval && (
                <div
                  className={`mt-4 p-3 rounded-lg border flex items-start gap-2.5 ${
                    completeEval.is_complete
                      ? "bg-amber-500/15 border-amber-400/50 text-amber-200"
                      : "bg-[#0B0F17]/90 border-slate-800 text-slate-300"
                  }`}
                >
                  {completeEval.is_complete ? (
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs leading-relaxed">
                    <div className="flex items-center gap-2 font-bold">
                      <span
                        className={
                          completeEval.is_complete
                            ? "text-amber-300"
                            : "text-slate-200"
                        }
                      >
                        완성형 판정:{" "}
                        {completeEval.is_complete
                          ? "완성형 선정 (5/5 기준 통과)"
                          : `일반 특화 유형 (${completeEval.passed_count}/5 기준 충족)`}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      {completeEval.summary_reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Primary & Secondary Archetype Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {profile.primary_archetype && (
                  <div
                    className={`bg-[#0B0F17] border rounded-lg p-3.5 ${
                      profile.primary_archetype.is_complete_type
                        ? "border-amber-400/60"
                        : "border-emerald-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                          profile.primary_archetype.is_complete_type
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        주 유형 (Primary)
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-emerald-400">
                        특화 {profile.primary_archetype.specialization_score}% · 수행{" "}
                        {profile.primary_archetype.role_score}점
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      {profile.primary_archetype.name}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {profile.primary_archetype.desc}
                    </p>
                  </div>
                )}

                {profile.secondary_archetype ? (
                  <div className="bg-[#0B0F17] border border-sky-500/40 rounded-lg p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-sky-400">
                        {profile.primary_archetype?.is_complete_type
                          ? "핵심 세부 성향"
                          : "보조 유형 (Secondary)"}
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-sky-400">
                        특화 {profile.secondary_archetype.specialization_score}% · 수행{" "}
                        {profile.secondary_archetype.role_score}점
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      {profile.secondary_archetype.name}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {profile.secondary_archetype.desc}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#0B0F17]/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                        보조 유형 (Secondary)
                      </span>
                      <div className="text-sm font-semibold text-slate-300 mt-1">
                        단일 특화 성향 (보조 유형 미부여)
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {profile.secondary_Null_reason ||
                          "주 유형 성향이 뚜렷하게 집중되어 있어 보조 유형을 억지로 부여하지 않았습니다."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Judgment Summary */}
              {profile.judgment_summary && (
                <div className="mt-3 p-3 rounded-lg bg-[#0B0F17]/80 border border-slate-800/90 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-emerald-400 mr-1.5">
                    [종합 판정 근거]
                  </span>
                  {profile.judgment_summary}
                </div>
              )}

              {/* Cross-Lab Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/70">
                <button
                  type="button"
                  onClick={() => onInspectInPlayerLab(card.spid)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  선수 연구소 상세 스탯
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSendToEfficiencyLab(
                      card.name,
                      profile.analyzed_position || card.primary_position
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  시즌별 가성비 비교
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Physical, Body Type & Two-Footedness Reflection Card */}
            {physFoot && (
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200">
                    신체 조건 · 체형 · 양발 반영 명세
                  </h4>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      physFoot.is_two_footed
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {physFoot.is_two_footed
                      ? `양발잡이 (${physFoot.foot_raw})`
                      : `주발/약발 (${physFoot.foot_raw})`}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-emerald-400 font-medium">
                    반영된 보조 요소
                  </div>
                  {physFoot.applied_factors.map((f, i) => (
                    <div
                      key={i}
                      className="bg-[#0B0F17] border border-slate-800/80 rounded px-2.5 py-1.5 text-slate-300"
                    >
                      · {f}
                    </div>
                  ))}
                </div>

                {physFoot.excluded_factors.length > 0 && (
                  <div className="space-y-1 text-xs pt-1">
                    <div className="text-slate-400 font-medium">
                      제외/비적용 항목 안내
                    </div>
                    {physFoot.excluded_factors.map((ex, i) => (
                      <div key={i} className="text-slate-500">
                        · {ex}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6-Axis Radar Comparison */}
            <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-200">
                  6대 핵심 능력치 밸런스 레이더
                </h4>
                {compareProfile && (
                  <span className="text-xs font-mono text-amber-400">
                    비교: {compareProfile.name} ({compareProfile.season_code})
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                <HexRadarChart
                  primary={profile.six_face}
                  secondary={compareProfile?.six_face}
                  primaryLabel={`${profile.name} (${profile.season_code})`}
                  secondaryLabel={
                    compareProfile
                      ? `${compareProfile.name} (${compareProfile.season_code})`
                      : undefined
                  }
                  size={240}
                />
              </div>
            </div>

            {/* Top 5 Strengths & Weaknesses */}
            <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-3">
                실효 세부 능력치 상위 강점 vs 보완 필요 지표
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-mono text-emerald-400 block mb-2">
                    TOP 5 핵심 강점 스탯
                  </span>
                  <div className="space-y-1.5">
                    {profile.strengths.map((st) => (
                      <div
                        key={st.stat}
                        className="flex items-center justify-between bg-[#0B0F17] px-2.5 py-1.5 rounded border border-slate-800/80 text-xs"
                      >
                        <span className="text-slate-300">{st.stat}</span>
                        <span
                          className={`font-mono tabular-nums ${getStatColorClass(
                            st.value
                          )}`}
                        >
                          {st.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-rose-400 block mb-2">
                    상대적 약점 스탯
                  </span>
                  <div className="space-y-1.5">
                    {profile.weaknesses.map((wk) => (
                      <div
                        key={wk.stat}
                        className="flex items-center justify-between bg-[#0B0F17] px-2.5 py-1.5 rounded border border-slate-800/80 text-xs"
                      >
                        <span className="text-slate-400">{wk.stat}</span>
                        <span
                          className={`font-mono tabular-nums ${getStatColorClass(
                            wk.value
                          )}`}
                        >
                          {wk.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Position Archetypes Dual-Score Breakdown & Strict 5-Criteria Complete Gate */}
          <div className="lg:col-span-7 space-y-5">
            {/* Position-Specific Archetype Comparison */}
            <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <div className="pb-4 border-b border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    {profile.position_group_label} 유형별 정밀 판정
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    역할 수행 능력(절대 수준) vs 유형 특화도(OVR 독립 성향)
                  </span>
                </div>
                {profile.role_nuance_note && (
                  <p className="text-xs text-sky-300/90 mt-1.5 bg-sky-500/10 border border-sky-500/20 rounded px-2.5 py-1.5">
                    {profile.role_nuance_note}
                  </p>
                )}
              </div>

              {/* Position Archetype Cards */}
              <div className="space-y-3 mt-4">
                {positionArchetypes.map((arch, idx) => {
                  const isSelected = selectedArchetype?.id === arch.id;
                  const compArch = compareProfile?.all_archetypes.find(
                    (a) => a.id === arch.id
                  );
                  const roleScore = arch.role_score ?? arch.fit_percent;
                  const specScore = arch.specialization_score ?? arch.fit_percent;

                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedArchetype(arch)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[#1A2540] border-emerald-500/60"
                          : "bg-[#0B0F17]/90 border-slate-800/90 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">
                            #{idx + 1}
                          </span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                              arch.is_complete_type
                                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                : "bg-slate-800 text-slate-200"
                            }`}
                          >
                            {arch.is_complete_type ? "완성형 검증" : "포지션 주력 유형"}
                          </span>
                          <span className="text-base font-bold text-slate-100">
                            {arch.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                          {compArch && (
                            <span className="text-amber-400">
                              비교선수 특화 {compArch.specialization_score ?? compArch.fit_percent}%
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            유형 특화도 {specScore}%
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                            역할 수행 {roleScore}점
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mt-1.5">
                        {arch.desc}
                      </p>

                      {/* Dual Progress Bars: Specialization vs Role Capability */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>유형 특화도 (OVR 독립 내재 성향)</span>
                            <span className="font-mono font-semibold text-emerald-400">
                              {specScore}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                arch.is_complete_type
                                  ? completeEval?.is_complete
                                    ? "bg-amber-400"
                                    : "bg-slate-600"
                                  : specScore >= 85
                                  ? "bg-emerald-500"
                                  : specScore >= 73
                                  ? "bg-teal-400"
                                  : "bg-slate-600"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(10, specScore))}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>역할 수행 능력 (실효 스탯·체격 반영)</span>
                            <span className="font-mono font-semibold text-sky-400">
                              {roleScore}점
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                roleScore >= 88
                                  ? "bg-sky-400"
                                  : roleScore >= 75
                                  ? "bg-indigo-400"
                                  : "bg-slate-600"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(10, roleScore))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {arch.judgment_reason && (
                        <div className="mt-2.5 text-[11px] text-slate-300 bg-[#131B2E]/90 px-2.5 py-1.5 rounded border border-slate-800/80">
                          {arch.judgment_reason}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Archetype Key Stat Evidence */}
            {selectedArchetype && (
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-emerald-400">
                      선택된 유형 산출 근거 스탯
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-0.5">
                      {selectedArchetype.name} — 핵심 가중치 기여 능력치
                    </h4>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs text-slate-400">
                      특화도 / 역할 수행력
                    </div>
                    <div className="text-sm font-bold text-emerald-400">
                      {selectedArchetype.specialization_score ??
                        selectedArchetype.fit_percent}
                      % /{" "}
                      <span className="text-sky-400">
                        {selectedArchetype.role_score ??
                          selectedArchetype.fit_percent}
                        점
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4">
                  {selectedArchetype.key_stats.map((ks) => (
                    <div
                      key={ks.stat}
                      className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate">
                          {ks.stat}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {(ks.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className={`text-lg font-mono font-bold tabular-nums mt-1 ${getStatColorClass(
                          ks.value
                        )}`}
                      >
                        {ks.value}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedArchetype.modifier_notes &&
                  selectedArchetype.modifier_notes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedArchetype.modifier_notes.map((note, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Strict 5-Criteria Complete Evaluation Gate */}
            {completeEval && (
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div>
                    <span className="text-xs font-mono text-amber-400 uppercase">
                      STRICT 5-CRITERIA COMPLETE PLAYER GATE
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-0.5">
                      완성형(Complete) 5대 필수 요건 엄격 검증표
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCriteriaDetail((v) => !v)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showCriteriaDetail ? (
                      <>
                        접기 <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        상세 보기 <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Core Pillars Mini Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
                  {completeEval.pillars.map((pil) => (
                    <div
                      key={pil.name}
                      className={`p-2.5 rounded-lg border text-xs ${
                        pil.passed
                          ? "bg-[#0B0F17] border-emerald-500/30"
                          : "bg-rose-950/20 border-rose-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-medium">
                          {pil.name}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            pil.passed ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {pil.score}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        완성형 하한선: ≥{pil.threshold}{" "}
                        {pil.passed ? "(통과)" : "(미달)"}
                      </div>
                    </div>
                  ))}
                </div>

                {showCriteriaDetail && (
                  <div className="space-y-2.5 mt-4 pt-3 border-t border-slate-800/80">
                    {completeEval.criteria.map((crit) => (
                      <div
                        key={crit.id}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                          crit.passed
                            ? "bg-[#0B0F17]/90 border-slate-800"
                            : "bg-rose-950/15 border-rose-500/30"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {crit.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-200">
                              {crit.label}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {crit.detail}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-mono whitespace-nowrap px-2 py-0.5 rounded ${
                            crit.passed
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {crit.score_text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>{profile.methodology_note}</span>
                </div>
              </div>
            )}

            {/* Expandable Cross-Position Compatibility Archetypes */}
            {crossPositionArchetypes.length > 0 && (
              <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setShowOtherPositions((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-200">
                      타 포지션 전환 시 호환 유형 참고 ({crossPositionArchetypes.length}종)
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      주 포지션 외 다른 포지션에 기용했을 때의 역할 수행 능력과 성향입니다.
                    </p>
                  </div>
                  {showOtherPositions ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showOtherPositions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
                    {crossPositionArchetypes.map((arch) => (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setSelectedArchetype(arch)}
                        className="text-left p-3 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {arch.name}
                          </span>
                          <span className="font-mono text-slate-400">
                            특화 {arch.specialization_score}% · 수행 {arch.role_score}점
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {arch.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
