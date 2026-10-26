"use client";

import React, { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Check,
  Sparkles,
  Flag,
  Trophy,
  Award,
  X,
} from "lucide-react";
import {
  PlayerCard,
  OFFICIAL_NEW_TRAIT_NAMES_17,
  OFFICIAL_GENERAL_TRAIT_NAMES,
  getTeamColorLogoUrl,
  getEnhanceOvrBoost,
  getEnhanceBadgeStyle,
  DEFAULT_ENHANCE_OVR_BOOSTS,
  getOfficialSeasonImgUrl,
  getOfficialTraitIconUrl,
  OFFICIAL_NEXON_SEASONS,
  OFFICIAL_DATACENTER_TEAM_COLORS,
  PlayerFilterState,
  DEFAULT_PLAYER_FILTER_STATE,
  FILTER_POSITIONS,
  FILTER_BODY_TYPES,
  countActiveDetailFilters,
  hasActiveDetailFilters,
  matchesPlayerFilter,
  appendFilterParamsToUrl,
} from "@/lib/fclab-types";
import { SeasonBadge } from "./VisualCharts";

export {
  type PlayerFilterState,
  DEFAULT_PLAYER_FILTER_STATE,
  FILTER_POSITIONS,
  FILTER_BODY_TYPES,
  countActiveDetailFilters,
  hasActiveDetailFilters,
  matchesPlayerFilter,
  appendFilterParamsToUrl,
};

export interface OfficialSeasonOption {
  seasonId: number;
  code: string;
  label: string;
  fullName: string;
  seasonImg: string;
  tier?: "META" | "CLASSIC";
}

export const OFFICIAL_SEASON_OPTIONS: OfficialSeasonOption[] =
  OFFICIAL_NEXON_SEASONS.map((s) => ({
    seasonId: s.seasonId,
    code: s.code,
    label: s.label,
    fullName: s.fullName,
    seasonImg: s.seasonImg || getOfficialSeasonImgUrl(s.code),
    tier: s.tier,
  }));

function OfficialTraitFilterIcon({ traitName }: { traitName: string }) {
  const [imgErr, setImgErr] = useState(false);
  const iconUrl = getOfficialTraitIconUrl(traitName);

  if (iconUrl && !imgErr) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={traitName}
        referrerPolicy="no-referrer"
        onError={() => setImgErr(true)}
        className="w-4 h-4 object-contain shrink-0 rounded-xs bg-slate-950/60 p-0.5"
      />
    );
  }
  return <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
}

function TeamColorChipButton({
  id,
  name,
  type,
  img,
  effects,
  selected,
  onToggle,
}: {
  id: string;
  name: string;
  type: "국가대표" | "소속 클럽" | "특성";
  img?: string;
  effects?: string[];
  selected: boolean;
  onToggle: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const logoUrl = img || getTeamColorLogoUrl(name, type, id);
  const effectsText = effects && effects.length > 0 ? effects.join(" · ") : "";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={effectsText ? `${name} (${effectsText})` : name}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        selected
          ? "bg-blue-600/25 border-blue-400 text-white shadow-xs"
          : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
      }`}
    >
      {logoUrl && !imgErr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
          className="w-4 h-4 object-contain rounded-xs shrink-0"
        />
      ) : type === "국가대표" ? (
        <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : type === "특성" ? (
        <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      ) : (
        <Trophy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      )}
      <span>{name}</span>
      {effects && effects.length > 0 && (
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          ({effects.slice(0, 2).join(", ")})
        </span>
      )}
      {selected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
    </button>
  );
}

export function PlayerSearchFilterToggleButton({
  isOpen,
  onToggle,
  filter,
}: {
  isOpen: boolean;
  onToggle: () => void;
  filter: PlayerFilterState;
}) {
  const activeCount = countActiveDetailFilters(filter);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
        isOpen || activeCount > 0
          ? "bg-blue-600/20 border-blue-500/70 text-blue-200 hover:bg-blue-600/30"
          : "bg-[#0B1120] border-slate-700/80 text-slate-200 hover:border-slate-600 hover:bg-slate-800/60"
      }`}
    >
      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
      <span>상세 필터</span>
      {activeCount > 0 && (
        <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-mono text-[10px] font-bold">
          {activeCount}
        </span>
      )}
      {isOpen ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  );
}

interface PlayerSearchFilterPanelProps {
  isOpen: boolean;
  filter: PlayerFilterState;
  onChange: (next: PlayerFilterState) => void;
  onApply: (nextFilter?: PlayerFilterState) => void;
  onReset?: () => void;
  maxEnhanceLevel?: number;
}

export default function PlayerSearchFilter({
  isOpen,
  filter,
  onChange,
  onApply,
  onReset,
  maxEnhanceLevel = 13,
}: PlayerSearchFilterPanelProps) {
  const [teamColorTab, setTeamColorTab] = useState<
    "ALL" | "국가" | "소속 클럽" | "특성 팀컬러"
  >("ALL");
  const [teamColorSearch, setTeamColorSearch] = useState("");
  const [seasonSearch, setSeasonSearch] = useState("");
  const [showAllSeasons, setShowAllSeasons] = useState(true);
  const [traitTab, setTraitTab] = useState<"신규 특성(17종)" | "일반 특성">(
    "신규 특성(17종)"
  );

  const filteredSeasonList = useMemo(() => {
    const q = seasonSearch.trim().toLowerCase();
    return OFFICIAL_SEASON_OPTIONS.filter((s) => {
      if (!showAllSeasons && s.tier !== "META" && !filter.seasons.includes(s.code)) {
        return false;
      }
      if (!q) return true;
      return (
        s.code.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q)
      );
    });
  }, [seasonSearch, showAllSeasons, filter.seasons]);

  const allTeamColorCatalog = useMemo(() => {
    return OFFICIAL_DATACENTER_TEAM_COLORS.map((tc) => {
      const tab: "국가" | "소속 클럽" | "특성 팀컬러" =
        tc.category === "nation"
          ? "국가"
          : tc.category === "feature"
          ? "특성 팀컬러"
          : "소속 클럽";
      const type: "국가대표" | "소속 클럽" | "특성" =
        tc.category === "nation"
          ? "국가대표"
          : tc.category === "feature"
          ? "특성"
          : "소속 클럽";
      return {
        id: tc.id,
        name: tc.name,
        tab,
        type,
        img: tc.img,
        effects: tc.effects,
      };
    });
  }, []);

  const tcCounts = useMemo(() => {
    let club = 0;
    let nation = 0;
    let feature = 0;
    for (const tc of allTeamColorCatalog) {
      if (tc.tab === "국가") nation++;
      else if (tc.tab === "특성 팀컬러") feature++;
      else club++;
    }
    return {
      all: allTeamColorCatalog.length,
      club,
      nation,
      feature,
    };
  }, [allTeamColorCatalog]);

  const filteredTeamColorList = useMemo(() => {
    const q = teamColorSearch.trim().toLowerCase();
    const matched = allTeamColorCatalog.filter((tc) => {
      if (teamColorTab !== "ALL" && tc.tab !== teamColorTab) return false;
      if (!q) return true;
      return (
        tc.name.toLowerCase().includes(q) ||
        tc.effects.some((ef) => ef.toLowerCase().includes(q))
      );
    });
    // 검색어 미입력 시에도 브라우저 렌더링 성능을 유지하면서 선택 항목 우선 + 공식 목록 표시
    return q ? matched : matched.slice(0, 160);
  }, [allTeamColorCatalog, teamColorTab, teamColorSearch]);

  if (!isOpen) return null;

  const toggleArrayItem = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const handleReset = () => {
    const resetState: PlayerFilterState = {
      ...DEFAULT_PLAYER_FILTER_STATE,
    };
    onChange(resetState);
    if (onReset) onReset();
  };

  const enhanceLevels = Array.from(
    { length: Math.min(13, Math.max(1, maxEnhanceLevel)) },
    (_, i) => i + 1
  );

  return (
    <div className="mt-3 pt-4 border-t border-slate-800/90 bg-[#0B1120]/90 rounded-xl p-4 space-y-5 text-xs">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-slate-100">
            FC 온라인 데이터센터 공식 상세 검색 필터
          </span>
          <span className="text-[11px] text-slate-400">
            (공식 {OFFICIAL_SEASON_OPTIONS.length}개 시즌 · 공식 {tcCounts.all}개 팀컬러 · 급여/OVR · 강화/포지션 · 주발/약발 · 피지컬 · 고유 특성)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            초기화 (8강 / 적응도 0)
          </button>
          <button
            type="button"
            onClick={() => onApply(filter)}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            조건 적용 검색
          </button>
        </div>
      </div>

      {/* 1. 포지션 & 강화 단계 (기본 8강, 적응도 0) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">포지션 선택</span>
            <span className="font-mono text-[11px] text-blue-400">
              {filter.position === "ALL" ? "전체 포지션" : filter.position}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange({ ...filter, position: pos })}
                className={`px-2.5 py-1 rounded-md border font-mono text-xs transition-colors ${
                  filter.position === pos
                    ? "bg-blue-600 border-blue-500 text-white font-bold"
                    : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {pos === "ALL" ? "전체" : pos}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              강화 단계 (1강 ~ 13강 · 기본 8강) &amp; 적응도
            </span>
            <span className="font-mono text-[11px] text-amber-300 font-semibold">
              +{filter.grade}강 / 적응도 +{filter.adaptBonus}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {enhanceLevels.map((g) => {
              const bStyle = getEnhanceBadgeStyle(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange({ ...filter, grade: g })}
                  className={`px-2 py-1 rounded border font-mono text-[11px] transition-colors ${
                    filter.grade === g
                      ? bStyle.className
                      : "bg-[#0B1120] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  +{g}강
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 시즌 선택 (공식 데이터센터 전체 153개 시즌 아이콘 배지 + 검색) */}
      <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              시즌 선택 (공식 데이터센터 전체 {OFFICIAL_SEASON_OPTIONS.length}개 시즌 · 26TOTS 포함 · 다중 선택)
            </span>
            {filter.seasons.length > 0 && (
              <span className="text-[11px] text-blue-400 font-mono">
                {filter.seasons.length}개 시즌 선택됨
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={seasonSearch}
                onChange={(e) => setSeasonSearch(e.target.value)}
                placeholder="시즌 검색 (예: 26TOTS, 26TOTY, ICON, WS, BLD...)"
                className="w-56 pl-7 pr-6 py-1 rounded-md bg-[#0B1120] border border-slate-800 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {seasonSearch && (
                <button
                  type="button"
                  onClick={() => setSeasonSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAllSeasons((prev) => !prev)}
              className="px-2.5 py-1 rounded-md bg-[#0B1120] border border-slate-800 text-[11px] text-slate-300 hover:text-white"
            >
              {showAllSeasons ? "주요 메타 시즌만 보기" : `전체 시즌 보기 (${OFFICIAL_SEASON_OPTIONS.length})`}
            </button>
            {filter.seasons.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filter, seasons: [] })}
                className="text-[11px] text-blue-400 hover:underline font-semibold"
              >
                시즌 선택 해제
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredSeasonList.map((s) => {
            const isSelected = filter.seasons.includes(s.code);
            return (
              <button
                key={`${s.seasonId}_${s.code}`}
                type="button"
                title={s.fullName}
                onClick={() =>
                  onChange({
                    ...filter,
                    seasons: toggleArrayItem(filter.seasons, s.code),
                  })
                }
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-blue-600/25 border-blue-400 text-white shadow-xs"
                    : "bg-[#0B1120] border-slate-800/90 text-slate-300 hover:border-slate-700"
                }`}
              >
                <SeasonBadge
                  seasonImg={s.seasonImg}
                  seasonCode={s.code}
                  className="h-4"
                />
                <span className="font-mono text-[11px] font-semibold truncate">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 팀컬러 선택 (데이터센터 공식 801개 팀컬러: 소속 클럽 / 국가 / 특성 팀컬러) */}
      <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200">
              공식 팀컬러 검색 및 선택 ({tcCounts.all}개)
            </span>
            <div className="flex items-center gap-1 bg-[#0B1120] p-0.5 rounded-lg border border-slate-800">
              {(
                [
                  { id: "ALL", label: `전체 (${tcCounts.all})` },
                  { id: "소속 클럽", label: `소속 클럽 (${tcCounts.club})` },
                  { id: "국가", label: `국가 (${tcCounts.nation})` },
                  { id: "특성 팀컬러", label: `특성 팀컬러 (${tcCounts.feature})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTeamColorTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    teamColorTab === tab.id
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teamColorSearch}
                onChange={(e) => setTeamColorSearch(e.target.value)}
                placeholder="공식 팀컬러 검색 (예: 19-20 레알 마드리드, 2021 독일, 대한민국...)"
                className="w-72 pl-8 pr-7 py-1.5 rounded-lg bg-[#0B1120] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {teamColorSearch && (
                <button
                  type="button"
                  onClick={() => setTeamColorSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {filter.teamColors.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filter, teamColors: [] })}
                className="text-[11px] text-blue-400 hover:underline font-semibold"
              >
                선택 해제 ({filter.teamColors.length})
              </button>
            )}
          </div>
        </div>

        {/* 선택된 팀컬러 칩 표시 */}
        {filter.teamColors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-blue-950/25 border border-blue-500/30 px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-blue-300 mr-1">
              선택된 공식 팀컬러:
            </span>
            {filter.teamColors.map((tcName) => (
              <button
                key={tcName}
                type="button"
                onClick={() =>
                  onChange({
                    ...filter,
                    teamColors: toggleArrayItem(filter.teamColors, tcName),
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/30 border border-blue-400/60 text-[11px] font-semibold text-white hover:bg-blue-600/50"
              >
                <span>{tcName}</span>
                <X className="w-3 h-3 text-blue-200" />
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-48 overflow-y-auto pr-1">
          {filteredTeamColorList.map((tc) => (
            <TeamColorChipButton
              key={`${tc.id}_${tc.name}`}
              id={tc.id}
              name={tc.name}
              type={tc.type}
              img={tc.img}
              effects={tc.effects}
              selected={filter.teamColors.includes(tc.name)}
              onToggle={() =>
                onChange({
                  ...filter,
                  teamColors: toggleArrayItem(filter.teamColors, tc.name),
                })
              }
            />
          ))}
          {filteredTeamColorList.length === 0 && (
            <div className="text-xs text-slate-400 py-2">
              검색어 &ldquo;{teamColorSearch}&rdquo;에 해당하는 공식 팀컬러가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 4. 급여 / 오버롤(OVR) / 주발·약발 / 피지컬 범위 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 급여 & OVR */}
        <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
          <div className="font-semibold text-slate-200">
            급여(Salary) &amp; 오버롤(OVR)
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                급여 범위 (예: 5 ~ 30)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={filter.salaryMin}
                  onChange={(e) =>
                    onChange({ ...filter, salaryMin: e.target.value })
                  }
                  placeholder="최소 (5)"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500">~</span>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={filter.salaryMax}
                  onChange={(e) =>
                    onChange({ ...filter, salaryMax: e.target.value })
                  }
                  placeholder="최대 (30)"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                오버롤(OVR) 범위 (예: 110 ~ 150)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={70}
                  max={180}
                  value={filter.ovrMin}
                  onChange={(e) =>
                    onChange({ ...filter, ovrMin: e.target.value })
                  }
                  placeholder="최소 (110)"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500">~</span>
                <input
                  type="number"
                  min={70}
                  max={180}
                  value={filter.ovrMax}
                  onChange={(e) =>
                    onChange({ ...filter, ovrMax: e.target.value })
                  }
                  placeholder="최대 (150)"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 주발 / 약발 */}
        <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
          <div className="font-semibold text-slate-200">주발 / 약발</div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                주발 선택
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: "ALL", label: "전체" },
                    { id: "RIGHT", label: "오른발" },
                    { id: "LEFT", label: "왼발" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...filter, preferredFoot: item.id })
                    }
                    className={`py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      filter.preferredFoot === item.id
                        ? "bg-blue-600 border-blue-500 text-white font-semibold"
                        : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                약발 수치
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: "ALL", label: "전체" },
                    { id: "3", label: "3 이하" },
                    { id: "4", label: "4" },
                    { id: "5", label: "5(양발)" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange({ ...filter, weakFoot: item.id })}
                    className={`py-1.5 rounded-md border text-[11px] font-medium transition-colors ${
                      filter.weakFoot === item.id
                        ? "bg-blue-600 border-blue-500 text-white font-semibold"
                        : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 피지컬: 키 / 몸무게 */}
        <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
          <div className="font-semibold text-slate-200">
            신장(cm) &amp; 몸무게(kg)
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                키 (cm 최소 ~ 최대)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={150}
                  max={215}
                  value={filter.heightMin}
                  onChange={(e) =>
                    onChange({ ...filter, heightMin: e.target.value })
                  }
                  placeholder="165"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500">~</span>
                <input
                  type="number"
                  min={150}
                  max={215}
                  value={filter.heightMax}
                  onChange={(e) =>
                    onChange({ ...filter, heightMax: e.target.value })
                  }
                  placeholder="205"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                몸무게 (kg 최소 ~ 최대)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={50}
                  max={120}
                  value={filter.weightMin}
                  onChange={(e) =>
                    onChange({ ...filter, weightMin: e.target.value })
                  }
                  placeholder="60"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500">~</span>
                <input
                  type="number"
                  min={50}
                  max={120}
                  value={filter.weightMax}
                  onChange={(e) =>
                    onChange({ ...filter, weightMax: e.target.value })
                  }
                  placeholder="100"
                  className="w-full px-2.5 py-1.5 bg-[#0B1120] border border-slate-800 rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 체형 선택 */}
        <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">체형 선택</span>
            {filter.bodyTypes.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filter, bodyTypes: [] })}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                해제
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_BODY_TYPES.map((bt) => {
              const selected = filter.bodyTypes.includes(bt);
              return (
                <button
                  key={bt}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filter,
                      bodyTypes: toggleArrayItem(filter.bodyTypes, bt),
                    })
                  }
                  className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    selected
                      ? "bg-blue-600 border-blue-500 text-white font-semibold"
                      : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {bt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. 고유 특성 선택 (신규 특성 17종 & 일반 특성 아이콘 배지) */}
      <div className="bg-[#111827]/90 border border-slate-800/90 rounded-lg p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">고유 특성 필터</span>
            <div className="flex items-center gap-1 bg-[#0B1120] p-0.5 rounded-lg border border-slate-800">
              {(["신규 특성(17종)", "일반 특성"] as const).map((tTab) => (
                <button
                  key={tTab}
                  type="button"
                  onClick={() => setTraitTab(tTab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    traitTab === tTab
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tTab}
                </button>
              ))}
            </div>
          </div>
          {filter.traits.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...filter, traits: [] })}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              선택된 특성({filter.traits.length}) 모두 해제
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {(traitTab === "신규 특성(17종)"
            ? OFFICIAL_NEW_TRAIT_NAMES_17
            : OFFICIAL_GENERAL_TRAIT_NAMES
          ).map((trName) => {
            const selected = filter.traits.includes(trName);
            return (
              <button
                key={trName}
                type="button"
                onClick={() =>
                  onChange({
                    ...filter,
                    traits: toggleArrayItem(filter.traits, trName),
                  })
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "bg-blue-600/25 border-blue-400 text-white shadow-xs"
                    : "bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <OfficialTraitFilterIcon traitName={trName} />
                <span>{trName}</span>
                {selected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
