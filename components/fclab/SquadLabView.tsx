"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Save,
  FolderOpen,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  X,
  RotateCcw,
  Move,
  ArrowLeftRight,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  PlayerCard,
  SquadSlot,
  SavedSquad,
  SquadAnalysisResult,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  getEnhanceBadgeStyle,
  getEnhanceOvrBoost,
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
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 57 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-2-2-2": [
    { slot_id: "ST", slot_position: "ST", x: 37, y: 15 },
    { slot_id: "CF", slot_position: "CF", x: 63, y: 15 },
    { slot_id: "CAM1", slot_position: "CAM", x: 22, y: 34 },
    { slot_id: "CAM2", slot_position: "CAM", x: 78, y: 34 },
    { slot_id: "CDM1", slot_position: "CDM", x: 36, y: 54 },
    { slot_id: "CDM2", slot_position: "CDM", x: 64, y: 54 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-3-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 20 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 14 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 20 },
    { slot_id: "CM1", slot_position: "CM", x: 30, y: 44 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 54 },
    { slot_id: "CM2", slot_position: "CM", x: 70, y: 44 },
    { slot_id: "LB", slot_position: "LB", x: 15, y: 74 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 76 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 76 },
    { slot_id: "RB", slot_position: "RB", x: 85, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
};

const ALL_POSITIONS = [
  "ST",
  "CF",
  "LW",
  "RW",
  "CAM",
  "CM",
  "CDM",
  "LM",
  "RM",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "GK",
];

/**
 * 피치 내 (x, y) 좌표에 따라 자연스러운 전술 포지션명을 추론합니다.
 * GK 슬롯은 고유 역할 특성상 GK를 유지합니다.
 */
function inferPositionFromPitchCoords(
  x: number,
  y: number,
  currentSlotId: string,
  fallbackPos: string
): string {
  if (currentSlotId === "GK" || fallbackPos === "GK" || y >= 84) {
    return "GK";
  }
  // 공격 진영 (상단 y <= 29)
  if (y <= 29) {
    if (x < 30) return "LW";
    if (x > 70) return "RW";
    if (y <= 18) return "ST";
    return "CF";
  }
  // 2선 및 미드필더 진영 (29 < y <= 62)
  if (y <= 62) {
    if (x < 28) return y <= 36 ? "LW" : "LM";
    if (x > 72) return y <= 36 ? "RW" : "RM";
    if (y <= 38) return "CAM";
    if (y <= 49) return "CM";
    return "CDM";
  }
  // 수비 진영 (62 < y < 84)
  if (x < 28) return y <= 68 ? "LWB" : "LB";
  if (x > 72) return y <= 68 ? "RWB" : "RB";
  return "CB";
}

interface UnassignedPlayerItem {
  spid: number;
  pid: number;
  name: string;
  season_code: string;
  thumb_url: string;
  grade: number;
  salary: number;
  ovr: number;
  fromSlotId: string;
  fromPosition: string;
}

interface PreviousSquadSnapshot {
  formation: string;
  slots: SquadSlot[];
  unassigned: UnassignedPlayerItem[];
}

interface SquadLabViewProps {
  rules?: SystemRules;
  savedSquads: SavedSquad[];
  externalSlots?: SquadSlot[] | null;
  onRefreshSquads: () => void;
  onInspectPlayerInLab: (spid: number) => void;
}

export default function SquadLabView({
  rules = DEFAULT_SYSTEM_RULES,
  savedSquads,
  externalSlots,
  onRefreshSquads,
  onInspectPlayerInLab,
}: SquadLabViewProps) {
  const [squadId, setSquadId] = useState<string>("default-meta-4231");
  const [squadName, setSquadName] = useState<string>(
    "나만의 커스텀 스쿼드"
  );
  const [formation, setFormation] = useState<string>("4-2-3-1");
  const [budgetBp, setBudgetBp] = useState<number>(50_000_000_000);
  const [teamColorBonus, setTeamColorBonus] = useState<number>(3);
  const [slots, setSlots] = useState<SquadSlot[]>(() =>
    (FORMATION_LAYOUTS["4-2-3-1"] || []).map((l) => ({
      slot_id: l.slot_id,
      slot_position: l.slot_position,
      spid: 0,
      grade: 5,
      x: l.x,
      y: l.y,
    }))
  );

  // 포메이션 변경 또는 슬롯 해제로 인해 미배치된 선수 임시 보관함
  const [unassignedPlayers, setUnassignedPlayers] = useState<
    UnassignedPlayerItem[]
  >([]);
  const [previousSnapshot, setPreviousSnapshot] =
    useState<PreviousSquadSnapshot | null>(null);
  const [formationNotice, setFormationNotice] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<SquadAnalysisResult | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // 드래그를 통한 유기적 포지션 이동 상태
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    slotId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // 슬롯 선수 선택 모달(Picker) 상태
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotPos, setEditingSlotPos] = useState<string>("ST");
  const [pickerPosFilter, setPickerPosFilter] = useState<string>("ST");
  const [pickerSeasonFilter, setPickerSeasonFilter] = useState<string>("ALL");
  const [pickerSort, setPickerSort] = useState<string>("ovr_desc");
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [pickerCards, setPickerCards] = useState<PlayerCard[]>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerGrade, setPickerGrade] = useState<number>(5);

  // 이미 다른 슬롯에 배치된 선수 중복 배치 확인 상태
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    card: PlayerCard;
    grade: number;
    conflictSlotId: string;
    conflictPosition: string;
  } | null>(null);

  const dynamicEnhanceLevels = useMemo(
    () =>
      Array.from({ length: Math.max(1, rules.maxEnhanceLevel) }, (_, i) => i + 1),
    [rules.maxEnhanceLevel]
  );

  // 외부 연동 스쿼드(externalSlots) 전달 시에만 로드 (기본 상태는 빈 슬롯 Empty State 유지)
  useEffect(() => {
    if (externalSlots && externalSlots.length > 0) {
      const baseLayout =
        FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];
      const normalizedExternal = baseLayout.map((l, idx) => {
        const byId = externalSlots.find((s) => s.slot_id === l.slot_id);
        const byPos =
          !byId &&
          externalSlots.find(
            (s, sIdx) => s.slot_position === l.slot_position && sIdx === idx
          );
        const source = byId || byPos || externalSlots[idx];
        return {
          slot_id: l.slot_id,
          slot_position: l.slot_position,
          spid: source?.spid || 0,
          grade: source?.grade || 5,
          x: l.x,
          y: l.y,
        };
      });
      queueMicrotask(() => {
        setSlots(normalizedExternal);
        setSquadId(`squad-${Date.now()}`);
        setSquadName("전적 분석실 연동 스쿼드");
        setUnassignedPlayers([]);
      });
    }
  }, [externalSlots, formation]);

  // 스쿼드 평가 API 호출 (드래그 중에는 불필요한 반복 호출 방지)
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
        // ignore transient error
      } finally {
        setEvaluating(false);
      }
    },
    []
  );

  // 슬롯의 핵심 데이터(spid, grade, slot_position)가 바뀔 때만 서버 분석 호출 (단순 x,y 좌표 이동 중 과도한 호출 방지)
  const evaluationTriggerKey = useMemo(
    () =>
      slots
        .map((s) => `${s.slot_id}:${s.slot_position}:${s.spid}:${s.grade}`)
        .join("|"),
    [slots]
  );

  useEffect(() => {
    if (draggingSlotId) return;
    const timer = setTimeout(() => {
      evaluateCurrentSquad(
        slots,
        formation,
        budgetBp,
        rules.salaryCap,
        teamColorBonus
      );
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    evaluationTriggerKey,
    formation,
    budgetBp,
    rules.salaryCap,
    teamColorBonus,
    draggingSlotId,
    evaluateCurrentSquad,
  ]);

  const evalMap = useMemo(
    () =>
      new Map((analysis?.placed_evaluations || []).map((p) => [p.slot_id, p])),
    [analysis]
  );

  /**
   * [요구사항 3] 포메이션 변경 시 선수 보존 로직
   * - slot_id가 일치하는 경우에만 기존 선수를 자동으로 유지합니다.
   * - 일치하지 않는 포지션에 배열 인덱스로 임의 배치하지 않습니다.
   * - 포메이션 변경으로 배치가 해제되는 선수는 임시 보관함(unassignedPlayers)으로 안전하게 이동하고 안내합니다.
   * - 사용자가 원할 경우 즉시 이전 포메이션/스쿼드로 되돌릴 수 있도록 스냅샷을 보존합니다.
   */
  const handleChangeFormation = (newFmt: string) => {
    if (newFmt === formation) return;
    const targetLayout =
      FORMATION_LAYOUTS[newFmt] || FORMATION_LAYOUTS["4-2-3-1"];

    // 이전 상태 스냅샷 저장 (복구용)
    setPreviousSnapshot({
      formation,
      slots: slots.map((s) => ({ ...s })),
      unassigned: [...unassignedPlayers],
    });

    const targetSlotIds = new Set(targetLayout.map((l) => l.slot_id));
    const newlyUnassigned: UnassignedPlayerItem[] = [];

    // 기존 배치된 선수 중 새 포메이션에 동일한 slot_id가 없는 선수 추출
    for (const oldSlot of slots) {
      if (oldSlot.spid > 0 && !targetSlotIds.has(oldSlot.slot_id)) {
        const placedInfo = evalMap.get(oldSlot.slot_id);
        const alreadyInTray = unassignedPlayers.some(
          (u) => u.spid === oldSlot.spid
        );
        if (!alreadyInTray) {
          newlyUnassigned.push({
            spid: oldSlot.spid,
            pid: placedInfo?.pid || oldSlot.spid % 1000000,
            name: placedInfo?.name || `선수 #${oldSlot.spid}`,
            season_code:
              placedInfo?.season_code ||
              String(Math.floor(oldSlot.spid / 1000000)),
            thumb_url:
              placedInfo?.thumb_url ||
              `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${oldSlot.spid}.png`,
            grade: oldSlot.grade || 5,
            salary: placedInfo?.salary || 0,
            ovr: placedInfo?.ovr || 0,
            fromSlotId: oldSlot.slot_id,
            fromPosition: oldSlot.slot_position,
          });
        }
      }
    }

    // slot_id가 정확히 일치하는 슬롯만 기존 선수 유지, 나머지는 빈 슬롯(spid: 0)으로 구성
    const updatedSlots: SquadSlot[] = targetLayout.map((l) => {
      const existingById = slots.find(
        (s) => s.slot_id === l.slot_id && s.spid > 0
      );
      return {
        slot_id: l.slot_id,
        slot_position: l.slot_position,
        spid: existingById ? existingById.spid : 0,
        grade: existingById ? existingById.grade : 5,
        x: l.x,
        y: l.y,
      };
    });

    setFormation(newFmt);
    setSlots(updatedSlots);

    if (newlyUnassigned.length > 0) {
      setUnassignedPlayers((prev) => [...newlyUnassigned, ...prev]);
      const names = newlyUnassigned
        .map((u) => `${u.name}(기존 ${u.fromSlotId})`)
        .join(", ");
      setFormationNotice(
        `${formation} → ${newFmt} 변경 완료: 슬롯 ID가 일치하는 선수는 유지되었으며, 포지션이 변경된 ${newlyUnassigned.length}명(${names})은 임의 배치하지 않고 아래 [임시 보관함]에 안전하게 보관했습니다.`
      );
    } else {
      setFormationNotice(
        `${formation} → ${newFmt} 포메이션으로 변경되었습니다. 원치 않으시면 우측 버튼으로 이전 스쿼드를 복구할 수 있습니다.`
      );
    }
  };

  const handleRestorePreviousFormation = () => {
    if (!previousSnapshot) return;
    setFormation(previousSnapshot.formation);
    setSlots(previousSnapshot.slots);
    setUnassignedPlayers(previousSnapshot.unassigned);
    setPreviousSnapshot(null);
    setFormationNotice(null);
  };

  const handleResetPitchPositions = () => {
    const defaultLayout =
      FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];
    setSlots((prev) =>
      prev.map((s) => {
        const def = defaultLayout.find((l) => l.slot_id === s.slot_id);
        return def
          ? {
              ...s,
              slot_position: def.slot_position,
              x: def.x,
              y: def.y,
            }
          : s;
      })
    );
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
          salary_cap: rules.salaryCap,
          team_color_name: `팀컬러 +${teamColorBonus}`,
          team_color_bonus: teamColorBonus,
          slots,
        }),
      });
      if (res.ok) {
        setSaveMessage("스쿼드가 저장되었습니다.");
        onRefreshSquads();
        setTimeout(() => setSaveMessage(""), 2500);
      } else {
        setSaveMessage("저장 실패");
      }
    } catch {
      setSaveMessage("저장 실패");
    }
  };

  /**
   * [요구사항 1 & 2] 선수 선택 모달 검색 함수
   * - 현재 선택한 슬롯의 포지션 필터(pickerPosFilter)를 잃지 않고 그대로 유지해 검색합니다.
   * - 불필요한 반복 크롤링을 막기 위해 forceCrawl이 명시된 경우에만 crawl=1을 전송합니다.
   */
  const fetchPickerPlayers = useCallback(
    async (opts: {
      query: string;
      positionFilter: string;
      seasonFilter: string;
      sort: string;
      forceCrawl?: boolean;
    }) => {
      setPickerLoading(true);
      setPickerError(null);
      try {
        const params = new URLSearchParams({
          q: opts.query.trim(),
          position: opts.positionFilter || "ALL",
          season: opts.seasonFilter || "ALL",
          sort: opts.sort || "ovr_desc",
        });
        if (opts.forceCrawl && opts.query.trim()) {
          params.set("crawl", "1");
        }
        const res = await fetch(
          `/api/fclab/v1/players/search?${params.toString()}`
        );
        if (!res.ok) {
          throw new Error(`선수 검색 요청 실패 (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "선수 검색 중 오류가 발생했습니다.");
        }
        setPickerCards(data.cards || []);
      } catch (err) {
        setPickerError(
          err instanceof Error
            ? err.message
            : "선수 목록을 불러오는 중 오류가 발생했습니다."
        );
        setPickerCards([]);
      } finally {
        setPickerLoading(false);
      }
    },
    []
  );

  const openSlotPicker = async (slotId: string, pos: string) => {
    const existingSlot = slots.find((s) => s.slot_id === slotId);
    const initialGrade = existingSlot?.grade || 5;
    setEditingSlotId(slotId);
    setEditingSlotPos(pos);
    setPickerPosFilter(pos); // 현재 슬롯의 포지션을 검색창 기본 필터로 고정 유지
    setPickerGrade(initialGrade);
    setDuplicateConfirm(null);

    await fetchPickerPlayers({
      query: pickerSearch,
      positionFilter: pos,
      seasonFilter: pickerSeasonFilter,
      sort: pickerSort,
      forceCrawl: false,
    });
  };

  const searchInPicker = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateConfirm(null);
    // position=ALL로 덮어쓰지 않고 현재 설정된 pickerPosFilter(기본값: 선택한 슬롯 포지션)를 유지합니다.
    await fetchPickerPlayers({
      query: pickerSearch,
      positionFilter: pickerPosFilter,
      seasonFilter: pickerSeasonFilter,
      sort: pickerSort,
      forceCrawl: false,
    });
  };

  const handlePositionFilterChange = async (newPosFilter: string) => {
    setPickerPosFilter(newPosFilter);
    setDuplicateConfirm(null);
    await fetchPickerPlayers({
      query: pickerSearch,
      positionFilter: newPosFilter,
      seasonFilter: pickerSeasonFilter,
      sort: pickerSort,
      forceCrawl: false,
    });
  };

  const handleSeasonFilterChange = async (newSeasonFilter: string) => {
    setPickerSeasonFilter(newSeasonFilter);
    setDuplicateConfirm(null);
    await fetchPickerPlayers({
      query: pickerSearch,
      positionFilter: pickerPosFilter,
      seasonFilter: newSeasonFilter,
      sort: pickerSort,
      forceCrawl: false,
    });
  };

  const handleSortChange = async (newSort: string) => {
    setPickerSort(newSort);
    setDuplicateConfirm(null);
    await fetchPickerPlayers({
      query: pickerSearch,
      positionFilter: pickerPosFilter,
      seasonFilter: pickerSeasonFilter,
      sort: newSort,
      forceCrawl: false,
    });
  };

  // 슬롯 배치 해제 (Unassign)
  const unassignSlot = (slotId: string, moveToHolding = true) => {
    const target = slots.find((s) => s.slot_id === slotId);
    if (!target || !target.spid) return;

    if (moveToHolding) {
      const placedInfo = evalMap.get(slotId);
      setUnassignedPlayers((prev) => {
        if (prev.some((u) => u.spid === target.spid)) return prev;
        return [
          {
            spid: target.spid,
            pid: placedInfo?.pid || target.spid % 1000000,
            name: placedInfo?.name || `선수 #${target.spid}`,
            season_code:
              placedInfo?.season_code ||
              String(Math.floor(target.spid / 1000000)),
            thumb_url:
              placedInfo?.thumb_url ||
              `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${target.spid}.png`,
            grade: target.grade || 5,
            salary: placedInfo?.salary || 0,
            ovr: placedInfo?.ovr || 0,
            fromSlotId: target.slot_id,
            fromPosition: target.slot_position,
          },
          ...prev,
        ];
      });
    }

    setSlots((prev) =>
      prev.map((s) => (s.slot_id === slotId ? { ...s, spid: 0 } : s))
    );
  };

  // 다른 슬롯에 이미 배치된 선수인지 검사 (동일 spid 또는 동일 고유 선수 pid)
  const findDuplicateSlot = useCallback(
    (targetSlotId: string, candidateSpid: number, candidatePid?: number) => {
      const pidToCheck = candidatePid || candidateSpid % 1000000;
      return slots.find(
        (s) =>
          s.slot_id !== targetSlotId &&
          s.spid > 0 &&
          (s.spid === candidateSpid || s.spid % 1000000 === pidToCheck)
      );
    },
    [slots]
  );

  // 슬롯에 선수 배치 실행 (중복 시 맞교환/이동 처리 포함)
  const commitAssignCardToSlot = (
    slotId: string,
    spid: number,
    grade = 5,
    swapWithConflictSlotId?: string
  ) => {
    setSlots((prev) => {
      const currentTargetSlot = prev.find((s) => s.slot_id === slotId);
      return prev.map((s) => {
        if (s.slot_id === slotId) {
          return { ...s, spid, grade };
        }
        if (swapWithConflictSlotId && s.slot_id === swapWithConflictSlotId) {
          // 현재 슬롯에 있던 선수가 있으면 맞교환, 없으면 빈 슬롯으로 비움
          return {
            ...s,
            spid: currentTargetSlot?.spid || 0,
            grade: currentTargetSlot?.grade || 5,
          };
        }
        return s;
      });
    });
    // 임시 보관함에 있던 선수라면 보관함에서 제거
    setUnassignedPlayers((prev) =>
      prev.filter((u) => u.spid !== spid && u.pid !== spid % 1000000)
    );
    setDuplicateConfirm(null);
    setEditingSlotId(null);
  };

  // 사용자가 배치 버튼을 눌렀을 때 중복 여부 확인
  const handleSelectCardInPicker = (card: PlayerCard, grade: number) => {
    if (!editingSlotId) return;
    const conflict = findDuplicateSlot(editingSlotId, card.spid, card.pid);
    if (conflict) {
      setDuplicateConfirm({
        card,
        grade,
        conflictSlotId: conflict.slot_id,
        conflictPosition: conflict.slot_position,
      });
      return;
    }
    commitAssignCardToSlot(editingSlotId, card.spid, grade);
  };

  const updateSlotGrade = (slotId: string, newGrade: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.slot_id === slotId ? { ...s, grade: newGrade } : s))
    );
  };

  /**
   * [요구사항 2] 포지션 칸 드래그 이동 핸들러
   * - 피치 위에서 포지션 카드를 마우스/터치로 드래그하여 원하는 위치로 유기적으로 이동할 수 있습니다.
   * - 이동한 좌표(x, y)에 맞춰 전술 포지션(ST, LW, CAM, CM, CDM, CB 등)도 자동 반영됩니다.
   */
  const handleSlotPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    slotId: string
  ) => {
    // select, button 클릭 시에는 드래그 시작 방지
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === "select" || targetTag === "option" || targetTag === "button") {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      slotId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setDraggingSlotId(slotId);
  };

  const handlePitchPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !pitchRef.current) return;
    const { slotId, startX, startY } = dragStartRef.current;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx < 5 && dy < 5 && !dragStartRef.current.moved) {
      return;
    }
    dragStartRef.current.moved = true;

    const rect = pitchRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(9, Math.min(91, Math.round(relX * 10) / 10));
    const clampedY = Math.max(9, Math.min(92, Math.round(relY * 10) / 10));

    setSlots((prev) =>
      prev.map((s) => {
        if (s.slot_id !== slotId) return s;
        const inferredPos = inferPositionFromPitchCoords(
          clampedX,
          clampedY,
          s.slot_id,
          s.slot_position
        );
        return {
          ...s,
          x: clampedX,
          y: clampedY,
          slot_position: inferredPos,
        };
      })
    );
  };

  const handlePitchPointerUp = () => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setDraggingSlotId(null);
  };

  const defaultLayoutCoords =
    FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];

  const renderedSlots = useMemo(() => {
    return defaultLayoutCoords.map((def) => {
      const slotObj = slots.find((s) => s.slot_id === def.slot_id);
      return {
        slot_id: def.slot_id,
        slot_position: slotObj?.slot_position || def.slot_position,
        spid: slotObj?.spid || 0,
        grade: slotObj?.grade || 5,
        x: slotObj?.x ?? def.x,
        y: slotObj?.y ?? def.y,
      };
    });
  }, [defaultLayoutCoords, slots]);

  // 미배치 슬롯(빈 포지션) 목록
  const emptySlots = useMemo(
    () => renderedSlots.filter((s) => !s.spid || s.spid <= 0),
    [renderedSlots]
  );
  const placedCount = renderedSlots.length - emptySlots.length;

  // 급여 및 예산 초과 계산
  const activeSalaryCap = rules.salaryCap;
  const currentTotalSalary = analysis?.total_salary || 0;
  const salaryDiff = activeSalaryCap - currentTotalSalary;
  const isSalaryValid = salaryDiff >= 0;
  const salaryUsagePct = Math.min(
    100,
    Math.round((currentTotalSalary / Math.max(1, activeSalaryCap)) * 100)
  );

  const currentTotalBp = analysis?.total_bp || 0;
  const bpDiff = budgetBp - currentTotalBp;
  const isBudgetValid = bpDiff >= 0;
  const budgetUsagePct = Math.min(
    100,
    Math.round((currentTotalBp / Math.max(1, budgetBp)) * 100)
  );

  // 모달 내 사용 가능한 시즌 목록 및 선택 강화 단계 시세 반영 정렬
  const availablePickerSeasons = useMemo(() => {
    const set = new Set<string>();
    for (const c of pickerCards) {
      if (c.season_code) set.add(c.season_code);
    }
    return Array.from(set).sort();
  }, [pickerCards]);

  const sortedPickerCards = useMemo(() => {
    const list = [...pickerCards];
    const getCardBpForGrade = (c: PlayerCard, g: number) => {
      const gPrice = c.prices?.[String(g)]?.bp;
      if (gPrice && gPrice > 0) return gPrice;
      return c.bp_1 || 0;
    };
    const boost = getEnhanceOvrBoost(pickerGrade, rules.enhanceOvrBoosts);

    if (pickerSort === "bp_asc") {
      list.sort((a, b) => {
        const aBp = getCardBpForGrade(a, pickerGrade) || Number.MAX_SAFE_INTEGER;
        const bBp = getCardBpForGrade(b, pickerGrade) || Number.MAX_SAFE_INTEGER;
        return aBp - bBp || b.ovr - a.ovr;
      });
    } else if (pickerSort === "bp_desc") {
      list.sort(
        (a, b) =>
          getCardBpForGrade(b, pickerGrade) - getCardBpForGrade(a, pickerGrade) ||
          b.ovr - a.ovr
      );
    } else if (pickerSort === "salary_asc") {
      list.sort((a, b) => a.salary - b.salary || b.ovr - a.ovr);
    } else if (pickerSort === "salary_desc") {
      list.sort((a, b) => b.salary - a.salary || b.ovr - a.ovr);
    } else if (pickerSort === "ovr_asc") {
      list.sort((a, b) => a.ovr + boost - (b.ovr + boost));
    } else if (pickerSort === "season_desc") {
      list.sort(
        (a, b) =>
          b.season_code.localeCompare(a.season_code) || b.ovr - a.ovr
      );
    } else {
      list.sort((a, b) => b.ovr + boost - (a.ovr + boost));
    }
    return list;
  }, [pickerCards, pickerSort, pickerGrade, rules.enhanceOvrBoosts]);

  const currentlyPlacedInEditingSlot = editingSlotId
    ? evalMap.get(editingSlotId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* [요구사항 4] 상단 스쿼드 설정 패널 (포메이션, 예산, 급여, 팀컬러, 저장/불러오기 명확히 구분) */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              SQUAD LAB
            </span>
            <input
              type="text"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="스쿼드 이름을 입력하세요"
              className="px-3 py-1.5 bg-[#0B0F17] border border-slate-700/80 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 min-w-[220px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {savedSquads.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  불러오기:
                </span>
                <select
                  value={squadId}
                  onChange={(e) => {
                    const target = savedSquads.find(
                      (s) => s.id === e.target.value
                    );
                    if (target) {
                      const fmt = target.formation || "4-2-3-1";
                      const layout =
                        FORMATION_LAYOUTS[fmt] || FORMATION_LAYOUTS["4-2-3-1"];
                      setSquadId(target.id);
                      setSquadName(target.name);
                      setFormation(fmt);
                      setBudgetBp(target.budget_bp);
                      setTeamColorBonus(target.team_color_bonus);
                      const loadedSlots = layout.map((l) => {
                        const m = (target.slots || []).find(
                          (s) => s.slot_id === l.slot_id
                        );
                        return {
                          slot_id: l.slot_id,
                          slot_position: m?.slot_position || l.slot_position,
                          spid: m?.spid || 0,
                          grade: m?.grade || 5,
                          x: m?.x ?? l.x,
                          y: m?.y ?? l.y,
                        };
                      });
                      setSlots(loadedSlots);
                      setFormationNotice(null);
                    }
                  }}
                  className="bg-transparent text-xs text-slate-200 outline-none py-0.5"
                >
                  {savedSquads.map((sq) => (
                    <option
                      key={sq.id}
                      value={sq.id}
                      className="bg-[#0B0F17] text-slate-100"
                    >
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

        {/* 4대 핵심 설정 컨트롤 그리드: 1.포메이션 / 2.보유 예산 / 3.급여 한도 / 4.팀컬러 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* 1. 포메이션 설정 */}
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>1. 기본 포메이션 선택</span>
              <span className="font-mono text-emerald-400">{formation}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {Object.keys(FORMATION_LAYOUTS).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleChangeFormation(fmt)}
                  className={`py-1.5 text-[11px] font-mono rounded transition-colors ${
                    formation === fmt
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-[#111827] text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 보유 예산(BP) 설정 */}
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>2. 목표 보유 예산 (BP)</span>
              <span className="font-mono text-amber-300">
                {formatBpKorean(budgetBp)} BP
              </span>
            </div>
            <select
              value={budgetBp}
              onChange={(e) => setBudgetBp(Number(e.target.value))}
              className="w-full bg-[#111827] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value={5_000_000_000}>50억 BP (가성비 입문)</option>
              <option value={20_000_000_000}>200억 BP (실속형 스쿼드)</option>
              <option value={50_000_000_000}>500억 BP (주전급 표준)</option>
              <option value={100_000_000_000}>1,000억 BP (상위 랭커급)</option>
              <option value={500_000_000_000}>5,000억 BP (하이엔드)</option>
              <option value={1_000_000_000_000}>1조 BP (최상위 엔드)</option>
              <option value={5_000_000_000_000}>5조 BP (무제한급)</option>
            </select>
          </div>

          {/* 3. 급여 한도 및 선발 인원 현황 */}
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>3. 인게임 급여 상한 &amp; 배치 현황</span>
              <span
                className={`font-mono font-bold ${
                  placedCount === 11 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {placedCount} / 11명 배치
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono">
              <span className="text-slate-300">현재 급여 상한:</span>
              <span className="text-emerald-400 font-bold">
                {activeSalaryCap} FP (최대 +{rules.maxEnhanceLevel}강)
              </span>
            </div>
          </div>

          {/* 4. 팀컬러 보너스 설정 */}
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>4. 팀컬러 전체 능력치 보너스</span>
              <span className="font-mono text-sky-400">
                OVR +{teamColorBonus}
              </span>
            </div>
            <select
              value={teamColorBonus}
              onChange={(e) => setTeamColorBonus(Number(e.target.value))}
              className="w-full bg-[#111827] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-sky-300 outline-none focus:border-emerald-500"
            >
              <option value={0}>미적용 (+0)</option>
              <option value={2}>단일/강화 기본 단계 (+2)</option>
              <option value={3}>현역/단일 풀케미 (+3)</option>
              <option value={5}>고강 + 은카 케미 (+5)</option>
              <option value={7}>금카/최상위 케미 (+7)</option>
              <option value={9}>초월 풀케미 (+9)</option>
            </select>
          </div>
        </div>

        {/* 스쿼드 요약 KPI 바 (급여 및 예산 초과 금액 명확 표시) */}
        {analysis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* 급여 카드 */}
            <div
              className={`p-3 rounded-lg border ${
                isSalaryValid
                  ? "bg-[#0B0F17] border-slate-800/80"
                  : "bg-rose-950/25 border-rose-500/50"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>총 급여 (Salary FP)</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    isSalaryValid
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/20 text-rose-300 font-bold"
                  }`}
                >
                  {isSalaryValid ? "한도 이내" : "급여 초과"}
                </span>
              </div>
              <div
                className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${
                  isSalaryValid ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {currentTotalSalary} / {activeSalaryCap} FP
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  style={{ width: `${salaryUsagePct}%` }}
                  className={`h-full transition-all ${
                    isSalaryValid ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
              <div
                className={`text-[11px] font-mono mt-1 ${
                  isSalaryValid ? "text-slate-400" : "text-rose-300 font-semibold"
                }`}
              >
                {isSalaryValid
                  ? `여유 급여: ${salaryDiff} FP`
                  : `초과 급여: +${Math.abs(salaryDiff)} FP 초과`}
              </div>
            </div>

            {/* 예산 및 구단 가치 카드 */}
            <div
              className={`p-3 rounded-lg border ${
                isBudgetValid
                  ? "bg-[#0B0F17] border-slate-800/80"
                  : "bg-rose-950/25 border-rose-500/50"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>총 구단 가치 (BP)</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    isBudgetValid
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/20 text-rose-300 font-bold"
                  }`}
                >
                  {isBudgetValid ? "예산 이내" : "예산 초과"}
                </span>
              </div>
              <div
                className={`text-lg font-mono font-bold tabular-nums mt-0.5 truncate ${
                  isBudgetValid ? "text-slate-100" : "text-rose-400"
                }`}
              >
                {analysis.total_bp_text || "0"} BP
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  style={{ width: `${budgetUsagePct}%` }}
                  className={`h-full transition-all ${
                    isBudgetValid ? "bg-amber-400" : "bg-rose-500"
                  }`}
                />
              </div>
              <div
                className={`text-[11px] font-mono mt-1 truncate ${
                  isBudgetValid ? "text-slate-400" : "text-rose-300 font-semibold"
                }`}
              >
                {isBudgetValid
                  ? `잔여 예산: ${formatBpKorean(bpDiff)} BP`
                  : `초과 금액: +${formatBpKorean(Math.abs(bpDiff))} BP 초과`}
              </div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">공격진 코어 점수</div>
              <div className="text-lg font-mono font-bold text-rose-400 tabular-nums mt-0.5">
                {analysis.sector_scores.attack}점
              </div>
              <div className="text-[11px] text-slate-500">ST · CF · LW · RW</div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">중원 장악 코어 점수</div>
              <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                {analysis.sector_scores.midfield}점
              </div>
              <div className="text-[11px] text-slate-500">CAM · CM · CDM · LM/RM</div>
            </div>

            <div className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">수비 안정 코어 점수</div>
              <div className="text-lg font-mono font-bold text-sky-400 tabular-nums mt-0.5">
                {analysis.sector_scores.defense}점
              </div>
              <div className="text-[11px] text-slate-500">CB · LB · RB · WB</div>
            </div>
          </div>
        )}

        {/* [요구사항 4] 미배치 슬롯(빈 포지션) 및 포메이션 변경 복구 안내 바 */}
        {(emptySlots.length > 0 || formationNotice || previousSnapshot) && (
          <div className="pt-2 space-y-2">
            {emptySlots.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>
                      미배치 슬롯 ({emptySlots.length}자리):
                    </strong>{" "}
                    아래 포지션 버튼을 누르면 해당 포지션에 맞는 선수를 바로 검색·배치할 수 있습니다.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {emptySlots.map((es) => (
                    <button
                      key={es.slot_id}
                      type="button"
                      onClick={() => openSlotPicker(es.slot_id, es.slot_position)}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 text-xs font-mono font-semibold flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      {es.slot_id} ({es.slot_position}) 배치
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(formationNotice || previousSnapshot) && (
              <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-sky-200">
                <span>
                  {formationNotice ||
                    "포메이션이 변경되었습니다. 이전 스쿼드 구성을 복구할 수 있습니다."}
                </span>
                {previousSnapshot && (
                  <button
                    type="button"
                    onClick={handleRestorePreviousFormation}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    이전 포메이션({previousSnapshot.formation})으로 되돌리기
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* [요구사항 3] 포메이션 변경 / 배치 해제로 발생한 임시 보관함 (대기 선수 명단) */}
      {unassignedPlayers.length > 0 && (
        <div className="bg-[#111827] border border-emerald-500/40 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                임시 보관 선수 ({unassignedPlayers.length}명) — 포메이션 변경 / 배치 해제 대기 명단
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                포메이션 변경 시 슬롯 ID가 달라 배치가 해제된 선수들입니다. 원하는 빈 슬롯 버튼을 눌러 즉시 재배치할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUnassignedPlayers([])}
              className="text-xs text-slate-400 hover:text-slate-200 self-end sm:self-auto"
            >
              보관함 비우기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {unassignedPlayers.map((up) => (
              <div
                key={up.spid}
                className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar
                      src={up.thumb_url}
                      spid={up.spid}
                      name={up.name}
                      className="w-9 h-9"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <SeasonBadge seasonCode={up.season_code} />
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {up.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            getEnhanceBadgeStyle(up.grade).className
                          }`}
                        >
                          +{up.grade}강
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        기존 {up.fromSlotId}({up.fromPosition}) · 급여 {up.salary}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setUnassignedPlayers((prev) =>
                        prev.filter((item) => item.spid !== up.spid)
                      )
                    }
                    title="보관함에서 제거"
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {emptySlots.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 mr-1">
                      빈 슬롯에 즉시 배치:
                    </span>
                    {emptySlots.map((es) => (
                      <button
                        key={es.slot_id}
                        type="button"
                        onClick={() =>
                          commitAssignCardToSlot(es.slot_id, up.spid, up.grade)
                        }
                        className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 transition-colors"
                      >
                        → {es.slot_id}({es.slot_position})
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                    현재 모든 슬롯이 채워져 있습니다. 피치에서 교체할 슬롯을 클릭하세요.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 메인 좌우 분할: 좌측 전술 피치 보드 + 모바일/빠른 리스트 (7 cols) / 우측 스쿼드 진단 및 추천 (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측: 전술 피치 및 포지션 목록 */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  01. 전술 포메이션 보드 ({formation})
                  <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-emerald-300 flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    드래그로 포지션 이동 가능
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  포지션 칸을 드래그해 유기적으로 위치를 조절하거나, 클릭하여 선수 교체·강화(+1~+{rules.maxEnhanceLevel}강)·배치 해제를 수행하세요.
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {evaluating && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    분석 중
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetPitchPositions}
                  className="px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  위치 초기화
                </button>
              </div>
            </div>

            {/* 전술 피치 SVG + 드래그 가능한 선수 노드 */}
            <div
              ref={pitchRef}
              onPointerMove={handlePitchPointerMove}
              onPointerUp={handlePitchPointerUp}
              onPointerCancel={handlePitchPointerUp}
              className="relative w-full h-[580px] sm:h-[650px] bg-[#0B1914] border border-emerald-900/60 rounded-xl overflow-hidden select-none touch-none"
            >
              {/* 경기장 라인 SVG */}
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

              {renderedSlots.map((coord) => {
                const placed = evalMap.get(coord.slot_id);
                const hasPlayer = coord.spid > 0;
                const currentGrade = coord.grade || 5;
                const badgeStyle = getEnhanceBadgeStyle(currentGrade);
                const isDraggingThis = draggingSlotId === coord.slot_id;

                return (
                  <div
                    key={coord.slot_id}
                    onPointerDown={(e) =>
                      handleSlotPointerDown(e, coord.slot_id)
                    }
                    style={{
                      left: `${coord.x}%`,
                      top: `${coord.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`absolute w-28 sm:w-32 transition-shadow ${
                      isDraggingThis
                        ? "z-30 scale-105 ring-2 ring-emerald-400 cursor-grabbing shadow-2xl"
                        : "z-10 cursor-grab"
                    }`}
                  >
                    {hasPlayer ? (
                      <div className="bg-[#111827]/95 border border-slate-700/90 hover:border-emerald-500 rounded-lg p-2 shadow-lg transition-colors">
                        {/* 상단: 포지션·OVR / 강화 단계 선택 / 배치 해제(X) 버튼 */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono mb-1">
                          <span
                            className={`font-bold truncate ${getPositionToneClass(
                              coord.slot_position
                            )}`}
                          >
                            {coord.slot_position}
                            {placed ? `·${placed.ovr}` : ""}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={currentGrade}
                              onChange={(e) =>
                                updateSlotGrade(
                                  coord.slot_id,
                                  Number(e.target.value)
                                )
                              }
                              className={`rounded px-1 py-0.5 text-[10px] font-mono border focus:outline-none ${badgeStyle.className}`}
                            >
                              {dynamicEnhanceLevels.map((g) => (
                                <option
                                  key={g}
                                  value={g}
                                  className="bg-[#0B0F17] text-slate-100"
                                >
                                  +{g}강 (+
                                  {getEnhanceOvrBoost(g, rules.enhanceOvrBoosts)}
                                  )
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                unassignSlot(coord.slot_id, true);
                              }}
                              title="이 슬롯에서 선수 배치 해제"
                              className="p-0.5 rounded bg-slate-800 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 중단: 선수 아바타 & 이름 (클릭 시 선수 교체 모달 오픈) */}
                        <div
                          onClick={() => {
                            if (dragStartRef.current?.moved) return;
                            openSlotPicker(coord.slot_id, coord.slot_position);
                          }}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlayerAvatar
                            src={placed?.thumb_url}
                            spid={coord.spid}
                            name={placed?.name || `선수 #${coord.spid}`}
                            className="w-8 h-8 sm:w-9 sm:h-9"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-slate-100 truncate">
                              {placed?.name || "불러오는 중..."}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                              {placed
                                ? `${placed.season_code} · 급여 ${placed.salary}`
                                : `SPID ${coord.spid}`}
                            </div>
                          </div>
                        </div>

                        {/* 하단: 코어 점수 · 교체 · 상세 버튼 */}
                        <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono tabular-nums">
                          <span className="text-emerald-400">
                            {placed ? `코어 ${placed.core_score}` : "분석중"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openSlotPicker(
                                  coord.slot_id,
                                  coord.slot_position
                                )
                              }
                              className="text-emerald-300 hover:underline"
                            >
                              교체
                            </button>
                            <button
                              type="button"
                              onClick={() => onInspectPlayerInLab(coord.spid)}
                              className="text-slate-400 hover:text-slate-100 underline"
                            >
                              상세
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (dragStartRef.current?.moved) return;
                          openSlotPicker(coord.slot_id, coord.slot_position);
                        }}
                        className="w-full py-2.5 px-2 bg-[#111827]/90 border border-dashed border-amber-500/60 hover:border-emerald-400 rounded-lg text-center space-y-1 transition-colors shadow-md"
                      >
                        <UserPlus className="w-4 h-4 mx-auto text-amber-400" />
                        <div className="text-xs font-mono font-bold text-slate-200">
                          {coord.slot_position} 배치
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          클릭하여 검색
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* [요구사항 4] 모바일 및 빠른 편집용 11인 포지션 슬롯 리스트 */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  선발 11인 포지션 한눈에 관리 (모바일 &amp; 빠른 편집)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  작은 화면에서도 각 슬롯의 포지션 역할, 강화 단계, 선수 교체 및 배치 해제를 빠르게 조작할 수 있습니다.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {placedCount}/11 배치됨
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderedSlots.map((slot) => {
                const placed = evalMap.get(slot.slot_id);
                const hasPlayer = slot.spid > 0;
                const badgeStyle = getEnhanceBadgeStyle(slot.grade);

                return (
                  <div
                    key={slot.slot_id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                      hasPlayer
                        ? "bg-[#0B0F17] border-slate-800"
                        : "bg-amber-950/15 border-dashed border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <select
                        value={slot.slot_position}
                        onChange={(e) => {
                          const newPos = e.target.value;
                          setSlots((prev) =>
                            prev.map((s) =>
                              s.slot_id === slot.slot_id
                                ? { ...s, slot_position: newPos }
                                : s
                            )
                          );
                        }}
                        title="슬롯 포지션 역할 변경"
                        className={`bg-[#111827] border border-slate-800 rounded px-1.5 py-1 text-xs font-mono font-bold outline-none ${getPositionToneClass(
                          slot.slot_position
                        )}`}
                      >
                        {ALL_POSITIONS.map((p) => (
                          <option
                            key={p}
                            value={p}
                            className="bg-[#0B0F17] text-slate-100"
                          >
                            {p}
                          </option>
                        ))}
                      </select>

                      {hasPlayer ? (
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {placed && (
                              <SeasonBadge seasonCode={placed.season_code} />
                            )}
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {placed?.name || `선수 #${slot.spid}`}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums truncate">
                            {placed
                              ? `OVR ${placed.ovr} · 급여 ${placed.salary} · ${placed.bp_text} BP`
                              : "데이터 분석 중..."}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-300 font-medium">
                          미배치 슬롯 ({slot.slot_id})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPlayer && (
                        <select
                          value={slot.grade}
                          onChange={(e) =>
                            updateSlotGrade(
                              slot.slot_id,
                              Number(e.target.value)
                            )
                          }
                          className={`rounded px-1.5 py-0.5 text-[11px] font-mono border outline-none ${badgeStyle.className}`}
                        >
                          {dynamicEnhanceLevels.map((g) => (
                            <option
                              key={g}
                              value={g}
                              className="bg-[#0B0F17] text-slate-100"
                            >
                              +{g}강
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openSlotPicker(slot.slot_id, slot.slot_position)
                        }
                        className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-xs font-semibold whitespace-nowrap"
                      >
                        {hasPlayer ? "교체" : "선수 배치"}
                      </button>

                      {hasPlayer && (
                        <button
                          type="button"
                          onClick={() => unassignSlot(slot.slot_id, true)}
                          title="배치 해제"
                          className="p-1 rounded bg-slate-800 hover:bg-rose-500/25 text-slate-400 hover:text-rose-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측: 스쿼드 구매 점검 리포트, 밸런스, 약점 진단, 교체 추천 */}
        <div className="lg:col-span-5 space-y-6">
          {/* [신규 고도화] 🔍 이 스쿼드, 지금 사도 될까? (스쿼드 구매 시점 & 급여 진단 리포트) */}
          {analysis?.purchaseAudit && (
            <div className="bg-gradient-to-br from-[#131B2E] via-[#111827] to-[#0E1726] border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800/90">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                    SQUAD PURCHASE TIMING &amp; SALARY AUDIT
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-100 mt-0.5">
                    🔍 이 스쿼드, 지금 사도 될까? (스쿼드 구매 시점 &amp; 급여 진단 리포트)
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-slate-400">
                    매수 타이밍 종합 점수
                  </div>
                  <div className="text-lg font-mono font-extrabold text-emerald-400 tabular-nums">
                    {analysis.purchaseAudit.overallBuyTimingScore}
                    <span className="text-xs font-normal text-slate-400">
                      {" "}
                      / 100점
                    </span>
                  </div>
                </div>
              </div>

              {analysis.purchaseAudit.buyTimingSummaryLabel && (
                <div className="px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-between gap-2">
                  <span>{analysis.purchaseAudit.buyTimingSummaryLabel}</span>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    🟢{" "}
                    {
                      analysis.purchaseAudit.playerPricePercentiles.filter(
                        (p) => p.buyTimingVerdict === "저점 매수 적기"
                      ).length
                    }
                    명 · 🟡{" "}
                    {
                      analysis.purchaseAudit.playerPricePercentiles.filter(
                        (p) => p.buyTimingVerdict === "적정 구간"
                      ).length
                    }
                    명 · 🔴{" "}
                    {
                      analysis.purchaseAudit.playerPricePercentiles.filter(
                        (p) => p.buyTimingVerdict === "단기 고점 주의"
                      ).length
                    }
                    명
                  </span>
                </div>
              )}

              {/* 1) 총 스쿼드 가치(BP) 및 재판매 시 예상 수수료 손실액 비교 */}
              <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    1) 총 스쿼드 가치 &amp; 재판매 예상 수수료 손실 비교
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                    총 {formatBpKorean(analysis.purchaseAudit.totalBp)} BP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* PC방 + 탑클 기본 (수수료 20%) */}
                  <div className="p-2.5 rounded-lg bg-[#111827] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">
                        PC방 + 탑클 (수수료 20%)
                      </span>
                      <span className="font-mono text-rose-400 font-semibold">
                        -20% 차감
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-rose-300 tabular-nums">
                      손실: -
                      {formatBpKorean(
                        analysis.purchaseAudit.resaleLossPcTopBp ??
                          analysis.purchaseAudit.estimatedResaleLossBp
                      )}{" "}
                      BP
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      실수령:{" "}
                      {formatBpKorean(
                        Math.max(
                          0,
                          analysis.purchaseAudit.totalBp -
                            (analysis.purchaseAudit.resaleLossPcTopBp ??
                              analysis.purchaseAudit.estimatedResaleLossBp)
                        )
                      )}{" "}
                      BP
                    </div>
                  </div>

                  {/* PC방 + 탑클 + 40% 할인 쿠폰 적용 시 (수수료 4%) */}
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-semibold">
                        PC방+탑클+40% 쿠폰 (4%)
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        90% 할인
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                      손실: -
                      {formatBpKorean(
                        analysis.purchaseAudit.resaleLossWith40CouponBp ??
                          Math.round(analysis.purchaseAudit.totalBp * 0.04)
                      )}{" "}
                      BP
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400/90 tabular-nums">
                      쿠폰 적용 시 +
                      {formatBpKorean(
                        Math.max(
                          0,
                          (analysis.purchaseAudit.resaleLossPcTopBp ??
                            analysis.purchaseAudit.estimatedResaleLossBp) -
                            (analysis.purchaseAudit.resaleLossWith40CouponBp ??
                              Math.round(analysis.purchaseAudit.totalBp * 0.04))
                        )
                      )}{" "}
                      BP 절감
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                  <span>
                    · 30% 쿠폰 병행 시(수수료 8%): 손실 -
                    {formatBpKorean(
                      analysis.purchaseAudit.resaleLossWith30CouponBp ??
                        Math.round(analysis.purchaseAudit.totalBp * 0.08)
                    )}{" "}
                    BP
                  </span>
                  <span>
                    · 40% 쿠폰 단독(수수료 24%): 손실 -
                    {formatBpKorean(
                      analysis.purchaseAudit.resaleLossCouponOnly40Bp ??
                        Math.round(analysis.purchaseAudit.totalBp * 0.24)
                    )}{" "}
                    BP
                  </span>
                </div>
              </div>

              {/* 2) 선수별 30일 시세 위치 진단 (0~100% 백분위 바) */}
              <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    2) 선발 {analysis.purchaseAudit.playerPricePercentiles.length}명 30일 시세 위치 진단 (0~100%)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    0% 바닥권 · 100% 고점권
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {analysis.purchaseAudit.playerPricePercentiles.map((item) => {
                    const isLow = item.buyTimingVerdict === "저점 매수 적기";
                    const isHigh = item.buyTimingVerdict === "단기 고점 주의";
                    const barColorClass = isLow
                      ? "bg-emerald-500"
                      : isHigh
                      ? "bg-rose-500"
                      : "bg-amber-400";
                    const verdictBadgeText = isLow
                      ? "매수 적기 🟢"
                      : isHigh
                      ? "매수 주의 🔴"
                      : "중립 🟡";
                    const verdictTextClass = isLow
                      ? "text-emerald-400"
                      : isHigh
                      ? "text-rose-400"
                      : "text-amber-300";

                    return (
                      <div
                        key={`${item.slotId}-${item.spid}`}
                        className="p-2 rounded-lg bg-[#111827] border border-slate-800/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`font-mono font-bold text-[11px] shrink-0 ${getPositionToneClass(
                                item.slotPosition
                              )}`}
                            >
                              {item.slotPosition}
                            </span>
                            <SeasonBadge
                              seasonCode={item.seasonCode}
                              seasonImg={item.seasonImg}
                            />
                            <span className="font-semibold text-slate-100 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              +{item.grade}강
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                            <span className="text-slate-300">
                              {formatBpKorean(item.currentBp)}
                            </span>
                            <span className={`font-bold ${verdictTextClass}`}>
                              {verdictBadgeText} ({item.pricePercentile30d}%)
                            </span>
                          </div>
                        </div>

                        {/* 백분위 프로그레스 바 (0~100%) */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden relative">
                            <div
                              style={{
                                width: `${Math.max(
                                  4,
                                  Math.min(100, item.pricePercentile30d)
                                )}%`,
                              }}
                              className={`h-full rounded-full transition-all ${barColorClass}`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 tabular-nums">
                            <span>
                              30일 저점 {formatBpKorean(item.min30dBp)}
                            </span>
                            <span>
                              30일 고점 {formatBpKorean(item.max30dBp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3) 급여(Salary) 과투자 포지션 경고 및 대체재 제안 */}
              <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    3) 급여(Salary) 과투자 포지션 경고 &amp; 체감 유지 대체재 제안
                  </span>
                  <span className="text-[11px] font-mono text-amber-300">
                    {analysis.purchaseAudit.overinvestedPositions.length}건 감지
                  </span>
                </div>

                {analysis.purchaseAudit.overinvestedPositions.length === 0 ? (
                  <div className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-xs text-slate-400">
                    현재 스쿼드에 급여 과투자(풀백 25+ 등) 또는 스탯 대비 둔중한 포지션이 감지되지 않았습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.purchaseAudit.overinvestedPositions.map((warn) => (
                      <div
                        key={`${warn.slotId}-${warn.currentPlayer.spid}`}
                        className="p-3 rounded-lg bg-[#111827] border border-amber-500/40 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span
                                className={`font-mono font-bold ${getPositionToneClass(
                                  warn.slotPosition
                                )}`}
                              >
                                [{warn.slotPosition}]
                              </span>
                              <SeasonBadge
                                seasonCode={warn.currentPlayer.seasonCode}
                                seasonImg={warn.currentPlayer.seasonImg}
                              />
                              <span className="font-bold text-slate-100">
                                {warn.currentPlayer.name} (+
                                {warn.currentPlayer.grade}강)
                              </span>
                              <span className="text-[11px] font-mono text-amber-300">
                                급여 {warn.currentPlayer.salary} FP · 체감{" "}
                                {warn.currentPlayer.feelScore}점
                              </span>
                            </div>
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              {warn.warningReason}
                            </p>
                          </div>
                          {warn.savedSalary > 0 && (
                            <span className="text-[11px] font-mono font-bold text-emerald-400 whitespace-nowrap shrink-0">
                              최대 -{warn.savedSalary} FP 절감
                            </span>
                          )}
                        </div>

                        {/* 대체 추천 선수 리스트 + 스쿼드 즉시 교체 버튼 */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                          <div className="text-[11px] font-mono text-slate-400">
                            추천 가성비 대체 선수 (인게임 체감 지수 유지·개선):
                          </div>
                          {warn.recommendedAlternatives.map((alt) => {
                            const altGrade =
                              alt.grade || warn.currentPlayer.grade || 5;
                            const feelDiff =
                              alt.feelScore - warn.currentPlayer.feelScore;
                            return (
                              <div
                                key={`${warn.slotId}-alt-${alt.spid}`}
                                className="p-2 rounded bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <PlayerAvatar
                                    src={alt.thumbUrl}
                                    spid={alt.spid}
                                    name={alt.name}
                                    className="w-8 h-8 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <SeasonBadge
                                        seasonCode={alt.season}
                                        seasonImg={alt.seasonImg}
                                      />
                                      <span className="text-xs font-bold text-slate-100 truncate">
                                        {alt.name}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        +{altGrade}강
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-400 tabular-nums truncate">
                                      체감{" "}
                                      <span className="text-emerald-400 font-semibold">
                                        {alt.feelScore}점
                                      </span>
                                      {feelDiff >= 0
                                        ? ` (+${feelDiff})`
                                        : ` (${feelDiff})`}{" "}
                                      · 유사도 {alt.similarity}% ·{" "}
                                      {alt.bpText ||
                                        formatBpKorean(alt.bp || 0)}{" "}
                                      BP
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    commitAssignCardToSlot(
                                      warn.slotId,
                                      alt.spid,
                                      altGrade
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors"
                                >
                                  스쿼드 교체
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Balance Radar & Synergies */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">
              02. 스쿼드 6각형 밸런스 및 활성 팀컬러
            </h3>
            {analysis && (
              <>
                <HexRadarChart
                  primaryData={analysis.team_radar}
                  primaryLabel={`${formation} 선발 ${placedCount}인 평균`}
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

          {/* Weaknesses, Unassigned Slots & Over-Cap/Over-Budget Warnings */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              03. 예산·급여 초과 및 포지션 약점 진단
            </h3>

            {!isSalaryValid && (
              <div className="p-3 bg-rose-950/35 border border-rose-700/60 rounded-lg text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  선발 급여 합계({currentTotalSalary} FP)가 현재 인게임 급여 상한선({activeSalaryCap} FP)을{" "}
                  <strong>+{Math.abs(salaryDiff)} FP 초과</strong>했습니다. 고급여 포지션을 조정해 주세요.
                </span>
              </div>
            )}

            {!isBudgetValid && (
              <div className="p-3 bg-rose-950/35 border border-rose-700/60 rounded-lg text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  현재 스쿼드 총 구단 가치({analysis?.total_bp_text} BP)가 설정된 보유 예산({formatBpKorean(budgetBp)} BP)을{" "}
                  <strong>+{formatBpKorean(Math.abs(bpDiff))} BP 초과</strong>했습니다.
                </span>
              </div>
            )}

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
              {(analysis?.weaknesses || []).map((wk, idx) => {
                const matchingSlot = renderedSlots.find(
                  (s) => s.slot_position === wk.slot_position
                );
                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-400">
                        보강 우선순위 #{idx + 1}: {wk.slot_position} (
                        {wk.current_player})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300 tabular-nums">
                          코어 {wk.core_score}점
                        </span>
                        {matchingSlot && (
                          <button
                            type="button"
                            onClick={() =>
                              openSlotPicker(
                                matchingSlot.slot_id,
                                matchingSlot.slot_position
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300"
                          >
                            선수 검색
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{wk.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget-Constrained Smart Replacement Recommendations */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                04. 예산 및 급여({activeSalaryCap} FP) 맞춤형 교체 추천
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                단순 OVR이 아닌 해당 포지션의 핵심 능력치 상승폭과 잔여 예산·급여를 고려한 추천 카드입니다.
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
                        commitAssignCardToSlot(
                          rec.target_slot,
                          rec.spid,
                          rec.grade
                        )
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

      {/* [요구사항 1 & 2] 선수 검색 및 배치 모달 (Slot Player Picker Modal) */}
      {editingSlotId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* 모달 헤더: 현재 배치할 슬롯 & 포지션 고정 표시 + 강화 단계 선택 + 현재 선수 해제 */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0E1422]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#0B0F17] border border-slate-700 ${getPositionToneClass(
                    editingSlotPos
                  )}`}
                >
                  슬롯: {editingSlotId} ({editingSlotPos})
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  포지션 선수 검색 및 배치
                </h3>

                <div className="flex items-center gap-1.5 text-xs bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1">
                  <span className="text-slate-400">배치 강화:</span>
                  <select
                    value={pickerGrade}
                    onChange={(e) => setPickerGrade(Number(e.target.value))}
                    className={`rounded px-1.5 py-0.5 text-xs font-mono border outline-none ${
                      getEnhanceBadgeStyle(pickerGrade).className
                    }`}
                  >
                    {dynamicEnhanceLevels.map((g) => (
                      <option
                        key={g}
                        value={g}
                        className="bg-[#0B0F17] text-slate-100"
                      >
                        +{g}강 (+
                        {getEnhanceOvrBoost(g, rules.enhanceOvrBoosts)} ·{" "}
                        {getEnhanceBadgeStyle(g).tierName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentlyPlacedInEditingSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      unassignSlot(editingSlotId, true);
                      setEditingSlotId(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs text-rose-300 font-medium flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    현재 배치({currentlyPlacedInEditingSlot.name}) 해제
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateConfirm(null);
                    setEditingSlotId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 모달 검색 및 필터 컨트롤 영역 */}
            <div className="p-4 space-y-3 border-b border-slate-800/80 bg-[#111827]">
              {/* 이름 검색 바 */}
              <form
                onSubmit={searchInPicker}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder={`선수 이름 검색 (현재 포지션 필터: ${
                      pickerPosFilter === "ALL"
                        ? "전체 포지션"
                        : `${pickerPosFilter} 전용`
                    })`}
                    className="w-full pl-8 pr-8 py-2 bg-[#0B0F17] border border-slate-700/80 focus:border-emerald-500 rounded-lg text-xs text-slate-100 outline-none"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickerSearch("");
                        fetchPickerPlayers({
                          query: "",
                          positionFilter: pickerPosFilter,
                          seasonFilter: pickerSeasonFilter,
                          sort: pickerSort,
                          forceCrawl: false,
                        });
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="submit"
                    disabled={pickerLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    포지션 유지 검색
                  </button>
                  {pickerSearch.trim().length > 0 && (
                    <button
                      type="button"
                      disabled={pickerLoading}
                      onClick={() =>
                        fetchPickerPlayers({
                          query: pickerSearch,
                          positionFilter: pickerPosFilter,
                          seasonFilter: pickerSeasonFilter,
                          sort: pickerSort,
                          forceCrawl: true,
                        })
                      }
                      title="캐시에 없는 신규 선수를 공식 데이터센터에서 실시간 크롤링합니다"
                      className="px-3 py-2 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-medium rounded-lg flex items-center gap-1 whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          pickerLoading ? "animate-spin" : ""
                        }`}
                      />
                      신규 선수 크롤링
                    </button>
                  )}
                </div>
              </form>

              {/* 포지션 필터 / 시즌 필터 / 정렬 기준 바 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                {/* 포지션 필터 토글 (현재 슬롯 포지션 vs 전체 포지션 vs 개별 포지션) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3 text-emerald-400" />
                    포지션 필터:
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePositionFilterChange(editingSlotPos)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                      pickerPosFilter === editingSlotPos
                        ? "bg-emerald-600 text-white"
                        : "bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    현재 포지션만 ({editingSlotPos})
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePositionFilterChange("ALL")}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      pickerPosFilter === "ALL"
                        ? "bg-emerald-600 text-white font-semibold"
                        : "bg-[#0B0F17] text-slate-400 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    전체 포지션 (ALL)
                  </button>
                  <select
                    value={pickerPosFilter}
                    onChange={(e) => handlePositionFilterChange(e.target.value)}
                    className="bg-[#0B0F17] border border-slate-800 rounded-md px-2 py-1 text-xs font-mono text-slate-300 outline-none"
                  >
                    <option value={editingSlotPos}>
                      슬롯 기본 ({editingSlotPos})
                    </option>
                    <option value="ALL">전체 (ALL)</option>
                    {ALL_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} 포지션 가능 선수
                      </option>
                    ))}
                  </select>
                </div>

                {/* 시즌 필터 & 정렬 선택 */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pickerSeasonFilter}
                    onChange={(e) => handleSeasonFilterChange(e.target.value)}
                    className="bg-[#0B0F17] border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 outline-none"
                  >
                    <option value="ALL">전체 시즌</option>
                    {availablePickerSeasons.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc} 시즌
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-[#0B0F17] border border-slate-800 rounded-md px-2 py-1">
                    <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                    <select
                      value={pickerSort}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="bg-transparent text-xs font-mono text-emerald-300 outline-none"
                    >
                      <option value="ovr_desc" className="bg-[#0B0F17]">
                        OVR 높은순
                      </option>
                      <option value="ovr_asc" className="bg-[#0B0F17]">
                        OVR 낮은순
                      </option>
                      <option value="bp_asc" className="bg-[#0B0F17]">
                        가격(BP) 낮은순
                      </option>
                      <option value="bp_desc" className="bg-[#0B0F17]">
                        가격(BP) 높은순
                      </option>
                      <option value="salary_asc" className="bg-[#0B0F17]">
                        급여(FP) 낮은순
                      </option>
                      <option value="salary_desc" className="bg-[#0B0F17]">
                        급여(FP) 높은순
                      </option>
                      <option value="season_desc" className="bg-[#0B0F17]">
                        시즌 코드순
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* [요구사항 2] 이미 다른 슬롯에 배치된 선수 중복 배치 확인 배너 */}
              {duplicateConfirm && (
                <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-300">
                        중복 선수 배치 확인 ({duplicateConfirm.card.name})
                      </div>
                      <p className="mt-0.5 text-amber-200/90">
                        이 선수는 이미{" "}
                        <strong>
                          [{duplicateConfirm.conflictSlotId} (
                          {duplicateConfirm.conflictPosition})]
                        </strong>{" "}
                        슬롯에 배치되어 있습니다. 기존 슬롯과 위치를 맞교환(이동)하여 현재{" "}
                        <strong>[{editingSlotId}]</strong> 슬롯에 배치하시겠습니까?
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() =>
                        commitAssignCardToSlot(
                          editingSlotId,
                          duplicateConfirm.card.spid,
                          duplicateConfirm.grade,
                          duplicateConfirm.conflictSlotId
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      위치 이동 / 맞교환 배치
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateConfirm(null)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 검색 결과 리스트 (검색 중, 오류, 결과 없음 명확 구분) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 bg-[#0B0F17]">
              {pickerLoading ? (
                <div className="p-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <div className="text-xs font-medium text-slate-300">
                    조건에 맞는 선수 데이터를 조회하고 있습니다...
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    대상 포지션: {editingSlotId} ({pickerPosFilter})
                  </div>
                </div>
              ) : pickerError ? (
                <div className="p-10 text-center space-y-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                  <div className="text-xs font-semibold text-rose-300">
                    {pickerError}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      fetchPickerPlayers({
                        query: pickerSearch,
                        positionFilter: pickerPosFilter,
                        seasonFilter: pickerSeasonFilter,
                        sort: pickerSort,
                        forceCrawl: false,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                  >
                    다시 시도
                  </button>
                </div>
              ) : sortedPickerCards.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="text-sm font-semibold text-slate-300">
                    조건에 해당하는 선수 검색 결과가 없습니다.
                  </div>
                  <p className="text-xs text-slate-500">
                    현재 필터: 검색어 &ldquo;{pickerSearch || "없음"}&rdquo; · 포지션{" "}
                    <span className="font-mono text-emerald-400">
                      {pickerPosFilter}
                    </span>{" "}
                    · 시즌{" "}
                    <span className="font-mono text-slate-300">
                      {pickerSeasonFilter}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {pickerPosFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => handlePositionFilterChange("ALL")}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                      >
                        전체 포지션(ALL)으로 넓혀서 보기
                      </button>
                    )}
                    {pickerSearch.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchPickerPlayers({
                            query: pickerSearch,
                            positionFilter: pickerPosFilter,
                            seasonFilter: "ALL",
                            sort: pickerSort,
                            forceCrawl: true,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold"
                      >
                        &ldquo;{pickerSearch}&rdquo; 데이터센터 실시간 크롤링
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                sortedPickerCards.map((c) => {
                  const effOvr =
                    c.ovr +
                    getEnhanceOvrBoost(pickerGrade, rules.enhanceOvrBoosts);
                  const gradePriceObj = c.prices?.[String(pickerGrade)];
                  const priceLabel = gradePriceObj?.text
                    ? `+${pickerGrade}강 ${gradePriceObj.text} BP`
                    : c.prices?.["1"]?.text
                    ? `1강 ${c.prices["1"].text} BP`
                    : c.bp_1 > 0
                    ? `1강 ${formatBpKorean(c.bp_1)} BP`
                    : "시세 정보 없음";

                  const conflictSlot = findDuplicateSlot(
                    editingSlotId,
                    c.spid,
                    c.pid
                  );
                  const isAlreadyInThisSlot =
                    slots.find((s) => s.slot_id === editingSlotId)?.spid ===
                    c.spid;

                  return (
                    <div
                      key={c.spid}
                      className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isAlreadyInThisSlot
                          ? "bg-emerald-950/25"
                          : conflictSlot
                          ? "bg-amber-950/15 hover:bg-amber-950/25"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          src={c.thumb_url}
                          spid={c.spid}
                          name={c.name}
                          className="w-11 h-11 shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <SeasonBadge
                              seasonImg={c.season_img}
                              seasonCode={c.season_code}
                            />
                            <span className="text-xs font-bold text-slate-100">
                              {c.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                getEnhanceBadgeStyle(pickerGrade).className
                              }`}
                            >
                              +{pickerGrade}강
                            </span>
                            {isAlreadyInThisSlot && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                현재 슬롯 배치됨
                              </span>
                            )}
                            {conflictSlot && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                타 슬롯 [{conflictSlot.slot_id}] 배치 중
                              </span>
                            )}
                          </div>

                          {/* 시즌 · 강화 OVR · 급여 · 가격 한눈에 표시 */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono tabular-nums text-slate-300">
                            <span
                              className={`font-bold ${getPositionToneClass(
                                c.primary_position
                              )}`}
                            >
                              {c.primary_position}
                              {c.positions && c.positions.length > 1
                                ? ` (${c.positions
                                    .map((p) => p.pos)
                                    .join("/")})`
                                : ""}
                            </span>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">
                              OVR {effOvr}{" "}
                              <span className="text-slate-500 font-normal">
                                (기본 {c.ovr})
                              </span>
                            </span>
                            <span>·</span>
                            <span className="text-sky-300">
                              급여 {c.salary} FP
                            </span>
                            <span>·</span>
                            <span className="text-amber-300">{priceLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onInspectPlayerInLab(c.spid)}
                          className="px-2.5 py-1.5 rounded border border-slate-700 hover:border-slate-500 text-[11px] text-slate-300 whitespace-nowrap"
                        >
                          상세 스탯
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCardInPicker(c, pickerGrade)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            conflictSlot
                              ? "bg-amber-500/20 hover:bg-amber-500/35 border-amber-500/50 text-amber-200"
                              : getEnhanceBadgeStyle(pickerGrade).className
                          }`}
                        >
                          {conflictSlot
                            ? `위치 이동 (+${pickerGrade}강)`
                            : `+${pickerGrade}강 배치`}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
