"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  FolderOpen,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  PlayerCard,
  SquadSlot,
  SavedSquad,
  SquadAnalysisResult,
  formatBpKorean,
  getPositionToneClass,
} from "@/lib/fclab-types";
import { PlayerAvatar, SeasonBadge, HexRadarChart } from "./VisualCharts";

export const FORMATION_LAYOUTS: Record<
  string,
  { slot_id: string; slot_position: string; x: number; y: number }[]
> = {
  "4-2-3-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 14 },
    { slot_id: "LW", slot_position: "LW", x: 18, y: 28 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 31 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 28 },
    { slot_id: "CDM1", slot_position: "CDM", x: 35, y: 52 },
    { slot_id: "CDM2", slot_position: "CDM", x: 65, y: 52 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-1-2-1-2": [
    { slot_id: "ST", slot_position: "ST", x: 37, y: 15 },
    { slot_id: "CF", slot_position: "CF", x: 63, y: 15 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 31 },
    { slot_id: "LM", slot_position: "LM", x: 20, y: 46 },
    { slot_id: "RM", slot_position: "RM", x: 80, y: 46 },
    { slot_id: "CDM1", slot_position: "CDM", x: 50, y: 58 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-2-2-2": [
    { slot_id: "ST", slot_position: "ST", x: 37, y: 15 },
    { slot_id: "CF", slot_position: "CF", x: 63, y: 15 },
    { slot_id: "LW", slot_position: "CAM", x: 22, y: 34 },
    { slot_id: "RW", slot_position: "CAM", x: 78, y: 34 },
    { slot_id: "CDM1", slot_position: "CDM", x: 36, y: 54 },
    { slot_id: "CDM2", slot_position: "CDM", x: 64, y: 54 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-3-3": [
    { slot_id: "LW", slot_position: "LW", x: 20, y: 18 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 14 },
    { slot_id: "RW", slot_position: "RW", x: 80, y: 18 },
    { slot_id: "CM1", slot_position: "CM", x: 30, y: 42 },
    { slot_id: "CDM1", slot_position: "CDM", x: 50, y: 52 },
    { slot_id: "CM2", slot_position: "CM", x: 70, y: 42 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
};

interface SquadLabViewProps {
  savedSquads: SavedSquad[];
  externalSlots?: SquadSlot[] | null;
  onRefreshSquads: () => void;
  onInspectPlayerInLab: (spid: number) => void;
}

export default function SquadLabView({
  savedSquads,
  externalSlots,
  onRefreshSquads,
  onInspectPlayerInLab,
}: SquadLabViewProps) {
  const [squadId, setSquadId] = useState<string>("default-meta-4231");
  const [squadName, setSquadName] = useState<string>(
    "FClab 추천 메타 스쿼드 (4-2-3-1)"
  );
  const [formation, setFormation] = useState<string>("4-2-3-1");
  const [budgetBp, setBudgetBp] = useState<number>(50_000_000_000);
  const [salaryCap, setSalaryCap] = useState<number>(270);
  const [teamColorBonus, setTeamColorBonus] = useState<number>(3);
  const [slots, setSlots] = useState<SquadSlot[]>([]);

  const [analysis, setAnalysis] = useState<SquadAnalysisResult | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // Slot picker modal state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [pickerCards, setPickerCards] = useState<PlayerCard[]>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);

  // Initialize from savedSquads or externalSlots
  useEffect(() => {
    if (externalSlots && externalSlots.length > 0) {
      setSlots(externalSlots);
      setSquadId(`squad-${Date.now()}`);
      setSquadName("전적 분석실 연동 스쿼드");
      return;
    }
    if (slots.length === 0 && savedSquads.length > 0) {
      const first = savedSquads[0];
      setSquadId(first.id);
      setSquadName(first.name);
      setFormation(first.formation || "4-2-3-1");
      setBudgetBp(first.budget_bp || 50_000_000_000);
      setSalaryCap(first.salary_cap || 270);
      setTeamColorBonus(first.team_color_bonus ?? 3);
      setSlots(first.slots || []);
    }
  }, [savedSquads, externalSlots, slots.length]);

  const evaluateCurrentSquad = useCallback(
    async (
      currentSlots: SquadSlot[],
      fmt: string,
      bBp: number,
      sCap: number,
      tcBonus: number
    ) => {
      if (currentSlots.length === 0) return;
      setEvaluating(true);
      try {
        const res = await fetch("/api/fclab/v1/squads/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slots: currentSlots,
            formation: fmt,
            budget_bp: bBp,
            salary_cap: sCap,
            team_color_bonus: tcBonus,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAnalysis(data);
        }
      } catch {
        // ignore
      } finally {
        setEvaluating(false);
      }
    },
    []
  );

  useEffect(() => {
    evaluateCurrentSquad(slots, formation, budgetBp, salaryCap, teamColorBonus);
  }, [slots, formation, budgetBp, salaryCap, teamColorBonus, evaluateCurrentSquad]);

  const handleChangeFormation = (newFmt: string) => {
    const layout = FORMATION_LAYOUTS[newFmt] || FORMATION_LAYOUTS["4-2-3-1"];
    setFormation(newFmt);
    const updatedSlots = layout.map((l, idx) => {
      const existingById = slots.find((s) => s.slot_id === l.slot_id);
      const existingByIdx = slots[idx];
      return {
        slot_id: l.slot_id,
        slot_position: l.slot_position,
        spid: existingById?.spid || existingByIdx?.spid || 0,
        grade: existingById?.grade || existingByIdx?.grade || 5,
      };
    });
    setSlots(updatedSlots);
  };

  const handleSaveSquad = async () => {
    setSaveMessage("저장 중...");
    try {
      const res = await fetch("/api/fclab/v1/squads/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: squadId,
          name: squadName,
          formation,
          budget_bp: budgetBp,
          salary_cap: salaryCap,
          team_color_name: `팀컬러 +${teamColorBonus}`,
          team_color_bonus: teamColorBonus,
          slots,
        }),
      });
      if (res.ok) {
        setSaveMessage("스쿼드가 저장되었습니다.");
        onRefreshSquads();
        setTimeout(() => setSaveMessage(""), 2500);
      }
    } catch {
      setSaveMessage("저장 실패");
    }
  };

  const openSlotPicker = async (slotId: string, pos: string) => {
    setEditingSlotId(slotId);
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        q: pickerSearch,
        position: pos,
        sort: "ovr_desc",
      });
      const res = await fetch(`/api/fclab/v1/players/search?${params.toString()}`);
      const data = await res.json();
      setPickerCards(data.cards || []);
    } catch {
      setPickerCards([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const searchInPicker = async (e: React.FormEvent) => {
    e.preventDefault();
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        q: pickerSearch,
        position: "ALL",
        sort: "ovr_desc",
        crawl: "1",
      });
      const res = await fetch(`/api/fclab/v1/players/search?${params.toString()}`);
      const data = await res.json();
      setPickerCards(data.cards || []);
    } catch {
      // ignore
    } finally {
      setPickerLoading(false);
    }
  };

  const assignCardToSlot = (slotId: string, spid: number, grade = 5) => {
    setSlots((prev) =>
      prev.map((s) => (s.slot_id === slotId ? { ...s, spid, grade } : s))
    );
    setEditingSlotId(null);
  };

  const updateSlotGrade = (slotId: string, newGrade: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.slot_id === slotId ? { ...s, grade: newGrade } : s))
    );
  };

  const layoutCoords =
    FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];
  const evalMap = new Map(
    (analysis?.placed_evaluations || []).map((p) => [p.slot_id, p])
  );

  return (
    <div className="space-y-6">
      {/* Top Squad Configuration Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-slate-800">
              {Object.keys(FORMATION_LAYOUTS).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleChangeFormation(fmt)}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    formation === fmt
                      ? "bg-emerald-600 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">보유 예산:</span>
              <select
                value={budgetBp}
                onChange={(e) => setBudgetBp(Number(e.target.value))}
                className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-emerald-400"
              >
                <option value={5_000_000_000}>50억 BP</option>
                <option value={20_000_000_000}>200억 BP</option>
                <option value={50_000_000_000}>500억 BP</option>
                <option value={100_000_000_000}>1,000억 BP</option>
                <option value={500_000_000_000}>5,000억 BP</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">팀컬러:</span>
              <select
                value={teamColorBonus}
                onChange={(e) => setTeamColorBonus(Number(e.target.value))}
                className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-sky-400"
              >
                <option value={0}>미적용 (+0)</option>
                <option value={2}>단일/강화 기본 (+2)</option>
                <option value={3}>현역/단일 풀케미 (+3)</option>
                <option value={5}>고강+은카 케미 (+5)</option>
                <option value={7}>금카/최상위 케미 (+7)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {savedSquads.length > 0 && (
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-slate-400" />
                <select
                  value={squadId}
                  onChange={(e) => {
                    const target = savedSquads.find(
                      (s) => s.id === e.target.value
                    );
                    if (target) {
                      setSquadId(target.id);
                      setSquadName(target.name);
                      setFormation(target.formation);
                      setBudgetBp(target.budget_bp);
                      setSalaryCap(target.salary_cap);
                      setTeamColorBonus(target.team_color_bonus);
                      setSlots(target.slots);
                    }
                  }}
                  className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {savedSquads.map((sq) => (
                    <option key={sq.id} value={sq.id}>
                      {sq.name} ({sq.formation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveSquad}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              스쿼드 저장
            </button>
            {saveMessage && (
              <span className="text-xs text-emerald-400 font-medium">
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        {/* Squad Summary KPI Bar */}
        {analysis && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800">
            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">총 급여 (Salary FP)</div>
              <div
                className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${
                  analysis.salary_valid ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {analysis.total_salary} / {analysis.salary_cap} FP
              </div>
              <div className="text-[11px] text-slate-500">
                {analysis.salary_valid
                  ? `여유 급여 ${analysis.salary_cap - analysis.total_salary} FP`
                  : `${analysis.total_salary - analysis.salary_cap} FP 초과`}
              </div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">총 구단 가치 (BP)</div>
              <div className="text-lg font-mono font-bold text-slate-100 tabular-nums mt-0.5 truncate">
                {analysis.total_bp_text} BP
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate">
                잔여 예산: {analysis.remaining_bp_text}
              </div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">공격진 코어 점수</div>
              <div className="text-lg font-mono font-bold text-rose-400 tabular-nums mt-0.5">
                {analysis.sector_scores.attack}점
              </div>
              <div className="text-[11px] text-slate-500">ST · LW · RW 평균</div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">중원 장악 코어 점수</div>
              <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                {analysis.sector_scores.midfield}점
              </div>
              <div className="text-[11px] text-slate-500">CAM · CM · CDM 평균</div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">수비 안정 코어 점수</div>
              <div className="text-lg font-mono font-bold text-sky-400 tabular-nums mt-0.5">
                {analysis.sector_scores.defense}점
              </div>
              <div className="text-[11px] text-slate-500">CB · LB · RB 평균</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Split: Left Interactive Tactical Pitch (7 cols) / Right Squad Diagnostics & Recommendations (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tactical Pitch */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                01. 전술 포메이션 보드 ({formation})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                포지션 카드를 클릭해 선수를 교체하거나 강화 단계(+1~+8)를 변경하면 즉시 전력 분석이 갱신됩니다.
              </p>
            </div>
            {evaluating && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                실시간 밸런스 계산 중
              </span>
            )}
          </div>

          {/* Football Pitch SVG + Positioned Player Nodes */}
          <div className="relative w-full h-[640px] bg-[#0B1914] border border-emerald-900/60 rounded-xl overflow-hidden select-none">
            {/* Pitch Markings */}
            <svg
              viewBox="0 0 600 760"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
              preserveAspectRatio="none"
            >
              <rect
                x="20"
                y="20"
                width="560"
                height="720"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="20"
                y1="380"
                x2="580"
                y2="380"
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <circle
                cx="300"
                cy="380"
                r="70"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <rect
                x="150"
                y="20"
                width="300"
                height="110"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <rect
                x="150"
                y="630"
                width="300"
                height="110"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
              />
            </svg>

            {layoutCoords.map((coord) => {
              const slotObj = slots.find((s) => s.slot_id === coord.slot_id);
              const placed = evalMap.get(coord.slot_id);
              const currentGrade = slotObj?.grade || 5;

              return (
                <div
                  key={coord.slot_id}
                  style={{
                    left: `${coord.x}%`,
                    top: `${coord.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute z-10 w-28 sm:w-32"
                >
                  {placed ? (
                    <div className="bg-[#111827]/95 border border-slate-700/90 hover:border-emerald-500 rounded-lg p-2 shadow-lg transition-colors">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span
                          className={`font-bold ${getPositionToneClass(
                            coord.slot_position
                          )}`}
                        >
                          {coord.slot_position} · {placed.ovr}
                        </span>
                        <select
                          value={currentGrade}
                          onChange={(e) =>
                            updateSlotGrade(
                              coord.slot_id,
                              Number(e.target.value)
                            )
                          }
                          className="bg-slate-800 text-amber-300 rounded px-1 py-0.2 text-[10px] font-mono focus:outline-none"
                        >
                          {[1, 3, 5, 6, 7, 8].map((g) => (
                            <option key={g} value={g}>
                              +{g}강
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        onClick={() =>
                          openSlotPicker(coord.slot_id, coord.slot_position)
                        }
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlayerAvatar
                          src={placed.thumb_url}
                          spid={placed.spid}
                          name={placed.name}
                          className="w-9 h-9"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-slate-100 truncate">
                            {placed.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                            {placed.season_code} · 급여 {placed.salary}
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono tabular-nums">
                        <span className="text-emerald-400">
                          코어 {placed.core_score}
                        </span>
                        <button
                          type="button"
                          onClick={() => onInspectPlayerInLab(placed.spid)}
                          className="text-slate-400 hover:text-slate-100 underline"
                        >
                          상세
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openSlotPicker(coord.slot_id, coord.slot_position)
                      }
                      className="w-full py-3 px-2 bg-[#111827]/90 border border-dashed border-slate-700 hover:border-emerald-500 rounded-lg text-center space-y-1 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mx-auto text-emerald-400" />
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {coord.slot_position} 배치
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Diagnostics & Replacement Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Team Balance Radar & Synergies */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">
              02. 스쿼드 6각형 밸런스 및 활성 팀컬러
            </h3>
            {analysis && (
              <>
                <HexRadarChart
                  primaryData={analysis.team_radar}
                  primaryLabel={`${formation} 선발 11인 평균`}
                  size={220}
                />

                {analysis.detected_synergies.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">
                      감지된 소속/국가 팀컬러 조합:
                    </div>
                    {analysis.detected_synergies.slice(0, 4).map((syn) => (
                      <div
                        key={syn.name}
                        className="flex items-center justify-between text-xs bg-[#0B0F17] px-3 py-2 rounded-lg border border-slate-800/80"
                      >
                        <span className="font-semibold text-slate-200">
                          {syn.name} ({syn.count}명)
                        </span>
                        <span className="font-mono text-emerald-400">
                          {syn.bonus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Weaknesses & Role Overlap Warnings */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              03. 포지션 약점 및 역할 중복 진단
            </h3>
            {analysis?.role_warnings && analysis.role_warnings.length > 0 && (
              <div className="space-y-2">
                {analysis.role_warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-200 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {(analysis?.weaknesses || []).map((wk, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-400">
                      보강 우선순위 #{idx + 1}: {wk.slot_position} ({wk.current_player})
                    </span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      코어 {wk.core_score}점
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{wk.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Budget-Constrained Smart Replacement Recommendations */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                04. 예산 및 급여 맞춤형 교체 추천
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                단순 OVR이 아닌 해당 포지션의 핵심 능력치 상승폭과 잔여 예산을 고려한 추천 카드입니다.
              </p>
            </div>

            <div className="space-y-2.5">
              {(analysis?.recommendations || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 border border-slate-800 rounded-lg">
                  현재 예산 및 급여 범위 내에서 모든 포지션이 최적 상태입니다.
                </div>
              ) : (
                analysis?.recommendations.map((rec) => (
                  <div
                    key={`${rec.target_slot}-${rec.spid}`}
                    className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar
                        src={rec.thumb_url}
                        spid={rec.spid}
                        name={rec.name}
                        className="w-11 h-11"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-400 truncate">
                          {rec.slot_position} 교체 ({rec.replace_out} →)
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <SeasonBadge
                            seasonImg={rec.season_img}
                            seasonCode={rec.season_code}
                          />
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {rec.name} (+{rec.grade}강)
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                          코어 {rec.core_score}점 (
                          <span className="text-emerald-400">
                            +{rec.core_gain}
                          </span>
                          ) · 급여 {rec.salary} · {rec.bp_text} BP
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        assignCardToSlot(rec.target_slot, rec.spid, rec.grade)
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      즉시 교체
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slot Player Picker Modal */}
      {editingSlotId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                포지션({editingSlotId}) 선수 검색 및 배치
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlotId(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                닫기
              </button>
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={searchInPicker} className="flex gap-2">
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="배치할 선수 이름 입력 (예: 손흥민, 굴리트, 김민재, 말디니...)"
                  className="flex-1 px-3 py-2 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs text-slate-100"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  검색·크롤링
                </button>
              </form>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-lg bg-[#0B0F17]">
                {pickerLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    선수를 불러오는 중입니다...
                  </div>
                ) : pickerCards.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  pickerCards.map((c) => (
                    <div
                      key={c.spid}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          src={c.thumb_url}
                          spid={c.spid}
                          name={c.name}
                          className="w-10 h-10"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <SeasonBadge
                              seasonImg={c.season_img}
                              seasonCode={c.season_code}
                            />
                            <span className="text-xs font-semibold text-slate-100">
                              {c.name}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {c.primary_position} · OVR {c.ovr} · 급여 {c.salary} · 1강{" "}
                            {c.prices?.["1"]?.text || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {[1, 5, 8].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() =>
                              assignCardToSlot(editingSlotId, c.spid, g)
                            }
                            className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-mono rounded transition-colors"
                          >
                            +{g}강 배치
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
