"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Save,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  X,
  RotateCcw,
  ArrowLeftRight,
  ArrowUpDown,
  Users,
  Flag,
  Trophy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wallet,
  Search,
} from "lucide-react";
import {
  PlayerCard,
  SquadSlot,
  SavedSquad,
  SquadAnalysisResult,
  SystemRules,
  DEFAULT_SYSTEM_RULES,
  OFFICIAL_NEW_TRAIT_NAMES_17,
  getOfficialTraitIconUrl,
  PlayerFilterState,
  DEFAULT_PLAYER_FILTER_STATE,
  appendFilterParamsToUrl,
  matchesPlayerFilter,
  getEnhanceBadgeStyle,
  getEnhanceOvrBoost,
  formatBpKorean,
  getPositionToneClass,
  getTeamColorLogoUrl,
} from "@/lib/fclab-types";
import { PlayerAvatar, SeasonBadge, HexRadarChart } from "./VisualCharts";
import PlayerSearchFilter, {
  PlayerSearchFilterToggleButton,
} from "./PlayerSearchFilter";

export type FormationCategory = "4백" | "3백" | "5백";

export const FORMATION_CATEGORIES: Record<FormationCategory, string[]> = {
  "4백": [
    "4-2-3-1",
    "4-2-2-2",
    "4-1-2-3",
    "4-2-1-3",
    "4-4-2",
    "4-1-4-1",
    "4-3-3",
    "4-4-1-1",
    "4-1-2-1-2 (다이아)",
    "4-1-2-1-2 (넓게)",
    "4-3-2-1",
    "4-3-1-2",
    "4-2-4",
  ],
  "3백": ["3-4-3", "3-5-2", "3-4-1-2", "3-4-2-1", "3-2-3-2", "3-1-4-2"],
  "5백": ["5-2-3", "5-3-2", "5-2-1-2", "5-4-1", "5-1-2-2"],
};

export const ALL_FORMATIONS_LIST: string[] = [
  ...FORMATION_CATEGORIES["4백"],
  ...FORMATION_CATEGORIES["3백"],
  ...FORMATION_CATEGORIES["5백"],
];

export const FORMATION_LAYOUTS: Record<
  string,
  { slot_id: string; slot_position: string; x: number; y: number }[]
> = {
  // ==================== 4백 (13종) ====================
  "4-2-3-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 14 },
    { slot_id: "LW", slot_position: "LW", x: 18, y: 29 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 31 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 29 },
    { slot_id: "CDM1", slot_position: "CDM", x: 35, y: 52 },
    { slot_id: "CDM2", slot_position: "CDM", x: 65, y: 52 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-2-2-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "CF", x: 63, y: 14 },
    { slot_id: "CAM1", slot_position: "CAM", x: 21, y: 33 },
    { slot_id: "CAM2", slot_position: "CAM", x: 79, y: 33 },
    { slot_id: "CDM1", slot_position: "CDM", x: 36, y: 53 },
    { slot_id: "CDM2", slot_position: "CDM", x: 64, y: 53 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-1-2-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 18 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 18 },
    { slot_id: "CM1", slot_position: "CM", x: 32, y: 40 },
    { slot_id: "CM2", slot_position: "CM", x: 68, y: 40 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 55 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-2-1-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 18 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 18 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 33 },
    { slot_id: "CDM1", slot_position: "CDM", x: 35, y: 53 },
    { slot_id: "CDM2", slot_position: "CDM", x: 65, y: 53 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-1-4-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 36 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 38 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 38 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 36 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 56 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-4-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "LM", slot_position: "LM", x: 16, y: 42 },
    { slot_id: "CM1", slot_position: "CM", x: 39, y: 46 },
    { slot_id: "CM2", slot_position: "CM", x: 61, y: 46 },
    { slot_id: "RM", slot_position: "RM", x: 84, y: 42 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-4-1-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "CF", slot_position: "CF", x: 50, y: 27 },
    { slot_id: "LM", slot_position: "LM", x: 16, y: 44 },
    { slot_id: "CM1", slot_position: "CM", x: 39, y: 48 },
    { slot_id: "CM2", slot_position: "CM", x: 61, y: 48 },
    { slot_id: "RM", slot_position: "RM", x: 84, y: 44 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-3-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 19 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 19 },
    { slot_id: "CM1", slot_position: "CM", x: 28, y: 44 },
    { slot_id: "CM2", slot_position: "CM", x: 50, y: 49 },
    { slot_id: "CM3", slot_position: "CM", x: 72, y: 44 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-1-2-1-2 (다이아)": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "CF", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 30 },
    { slot_id: "CM1", slot_position: "CM", x: 29, y: 45 },
    { slot_id: "CM2", slot_position: "CM", x: 71, y: 45 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 57 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-1-2-1-2 (넓게)": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "CF", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 30 },
    { slot_id: "LM", slot_position: "LM", x: 17, y: 45 },
    { slot_id: "RM", slot_position: "RM", x: 83, y: 45 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 57 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-3-2-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "CF1", slot_position: "CF", x: 33, y: 27 },
    { slot_id: "CF2", slot_position: "CF", x: 67, y: 27 },
    { slot_id: "CM1", slot_position: "CM", x: 26, y: 48 },
    { slot_id: "CM2", slot_position: "CM", x: 50, y: 51 },
    { slot_id: "CM3", slot_position: "CM", x: 74, y: 48 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-3-1-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 29 },
    { slot_id: "CM1", slot_position: "CM", x: 27, y: 48 },
    { slot_id: "CM2", slot_position: "CM", x: 50, y: 53 },
    { slot_id: "CM3", slot_position: "CM", x: 73, y: 48 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "4-2-4": [
    { slot_id: "LW", slot_position: "LW", x: 16, y: 18 },
    { slot_id: "ST1", slot_position: "ST", x: 39, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 61, y: 14 },
    { slot_id: "RW", slot_position: "RW", x: 84, y: 18 },
    { slot_id: "CM1", slot_position: "CM", x: 37, y: 48 },
    { slot_id: "CM2", slot_position: "CM", x: 63, y: 48 },
    { slot_id: "LB", slot_position: "LB", x: 14, y: 73 },
    { slot_id: "CB1", slot_position: "CB", x: 38, y: 75 },
    { slot_id: "CB2", slot_position: "CB", x: 62, y: 75 },
    { slot_id: "RB", slot_position: "RB", x: 86, y: 73 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],

  // ==================== 3백 (6종) ====================
  "3-4-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 18 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 18 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 45 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 48 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 48 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 45 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "3-5-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 31 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 46 },
    { slot_id: "CDM1", slot_position: "CDM", x: 37, y: 53 },
    { slot_id: "CDM2", slot_position: "CDM", x: 63, y: 53 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 46 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "3-4-1-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 29 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 46 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 49 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 49 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 46 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "3-4-2-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "CF1", slot_position: "CF", x: 32, y: 27 },
    { slot_id: "CF2", slot_position: "CF", x: 68, y: 27 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 47 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 50 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 50 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 47 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "3-2-3-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "LM", slot_position: "LM", x: 17, y: 34 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 32 },
    { slot_id: "RM", slot_position: "RM", x: 83, y: 34 },
    { slot_id: "CDM1", slot_position: "CDM", x: 36, y: 54 },
    { slot_id: "CDM2", slot_position: "CDM", x: 64, y: 54 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "3-1-4-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 39 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 41 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 41 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 39 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 57 },
    { slot_id: "CB1", slot_position: "CB", x: 26, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 74, y: 74 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],

  // ==================== 5백 (5종) ====================
  "5-2-3": [
    { slot_id: "LW", slot_position: "LW", x: 18, y: 18 },
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "RW", slot_position: "RW", x: 82, y: 18 },
    { slot_id: "CM1", slot_position: "CM", x: 36, y: 46 },
    { slot_id: "CM2", slot_position: "CM", x: 64, y: 46 },
    { slot_id: "LWB", slot_position: "LWB", x: 12, y: 66 },
    { slot_id: "CB1", slot_position: "CB", x: 31, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 69, y: 74 },
    { slot_id: "RWB", slot_position: "RWB", x: 88, y: 66 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "5-3-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CM1", slot_position: "CM", x: 28, y: 44 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 50 },
    { slot_id: "CM2", slot_position: "CM", x: 72, y: 44 },
    { slot_id: "LWB", slot_position: "LWB", x: 12, y: 66 },
    { slot_id: "CB1", slot_position: "CB", x: 31, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 69, y: 74 },
    { slot_id: "RWB", slot_position: "RWB", x: 88, y: 66 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "5-2-1-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CAM", slot_position: "CAM", x: 50, y: 30 },
    { slot_id: "CM1", slot_position: "CM", x: 35, y: 49 },
    { slot_id: "CM2", slot_position: "CM", x: 65, y: 49 },
    { slot_id: "LWB", slot_position: "LWB", x: 12, y: 66 },
    { slot_id: "CB1", slot_position: "CB", x: 31, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 69, y: 74 },
    { slot_id: "RWB", slot_position: "RWB", x: 88, y: 66 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "5-4-1": [
    { slot_id: "ST", slot_position: "ST", x: 50, y: 13 },
    { slot_id: "LM", slot_position: "LM", x: 15, y: 41 },
    { slot_id: "CM1", slot_position: "CM", x: 38, y: 46 },
    { slot_id: "CM2", slot_position: "CM", x: 62, y: 46 },
    { slot_id: "RM", slot_position: "RM", x: 85, y: 41 },
    { slot_id: "LWB", slot_position: "LWB", x: 12, y: 66 },
    { slot_id: "CB1", slot_position: "CB", x: 31, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 69, y: 74 },
    { slot_id: "RWB", slot_position: "RWB", x: 88, y: 66 },
    { slot_id: "GK", slot_position: "GK", x: 50, y: 90 },
  ],
  "5-1-2-2": [
    { slot_id: "ST1", slot_position: "ST", x: 37, y: 14 },
    { slot_id: "ST2", slot_position: "ST", x: 63, y: 14 },
    { slot_id: "CM1", slot_position: "CM", x: 33, y: 38 },
    { slot_id: "CM2", slot_position: "CM", x: 67, y: 38 },
    { slot_id: "CDM", slot_position: "CDM", x: 50, y: 53 },
    { slot_id: "LWB", slot_position: "LWB", x: 12, y: 66 },
    { slot_id: "CB1", slot_position: "CB", x: 31, y: 74 },
    { slot_id: "CB2", slot_position: "CB", x: 50, y: 76 },
    { slot_id: "CB3", slot_position: "CB", x: 69, y: 74 },
    { slot_id: "RWB", slot_position: "RWB", x: 88, y: 66 },
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

const POSITION_COMPATIBILITY_ORDER: Record<string, string[]> = {
  ST: ["ST", "CF", "LW", "RW", "CAM"],
  CF: ["CF", "ST", "CAM", "LW", "RW"],
  LW: ["LW", "LM", "CF", "ST", "RW", "CAM"],
  RW: ["RW", "RM", "CF", "ST", "LW", "CAM"],
  CAM: ["CAM", "CF", "CM", "LM", "RM", "LW", "RW"],
  CM: ["CM", "CDM", "CAM", "LM", "RM"],
  CDM: ["CDM", "CM", "CB", "CAM"],
  LM: ["LM", "LW", "LWB", "CM", "CAM", "RM"],
  RM: ["RM", "RW", "RWB", "CM", "CAM", "LM"],
  LWB: ["LWB", "LB", "LM", "CB"],
  RWB: ["RWB", "RB", "RM", "CB"],
  LB: ["LB", "LWB", "CB", "RB"],
  RB: ["RB", "RWB", "CB", "LB"],
  CB: ["CB", "CDM", "LB", "RB", "LWB", "RWB"],
  GK: ["GK"],
};

// 공식 신규 특성 17종 아이콘 URL 매핑 (넥슨 공식 CDN)
const OFFICIAL_NEW_TRAIT_ICON_MAP: Record<string, string> = Object.fromEntries(
  OFFICIAL_NEW_TRAIT_NAMES_17.map((name) => [name, getOfficialTraitIconUrl(name)])
);

function getPosTextColor(pos: string): string {
  const p = (pos || "").toUpperCase();
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) return "text-rose-400";
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(p)) return "text-emerald-400";
  if (["CB", "LB", "RB", "LWB", "RWB", "SW"].includes(p)) return "text-sky-400";
  return "text-amber-400";
}

function getPosHeaderBarClass(pos: string): string {
  const p = (pos || "").toUpperCase();
  if (["ST", "CF", "LW", "RW"].includes(p)) {
    return "bg-gradient-to-r from-rose-600 to-rose-500 text-white";
  }
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(p)) {
    return "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white";
  }
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(p)) {
    return "bg-gradient-to-r from-sky-600 to-sky-500 text-white";
  }
  return "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950";
}

function getCardFrameClass(grade: number): string {
  if (grade >= 11) {
    return "from-[#2c194d] via-[#131d36] to-[#090d16] border-cyan-400/90 shadow-[0_0_16px_rgba(34,211,238,0.3)]";
  }
  if (grade >= 8) {
    return "from-[#382b12] via-[#1c1917] to-[#0c0a09] border-amber-400/90 shadow-[0_0_14px_rgba(251,191,36,0.28)]";
  }
  if (grade >= 5) {
    return "from-[#273244] via-[#141c2b] to-[#0b0f17] border-slate-300/80 shadow-lg";
  }
  return "from-[#1e2636] via-[#111827] to-[#090d16] border-slate-600/80 shadow-md";
}

function getGradeShieldClass(grade: number): string {
  if (grade >= 11) {
    return "bg-gradient-to-b from-fuchsia-400 via-cyan-300 to-emerald-300 text-slate-950 border-white font-black";
  }
  if (grade >= 8) {
    return "bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600 text-slate-950 border-amber-200 font-black";
  }
  if (grade >= 5) {
    return "bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-950 border-slate-100 font-black";
  }
  if (grade >= 2) {
    return "bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 border-amber-500 font-bold";
  }
  return "bg-slate-800 text-slate-300 border-slate-600 font-bold";
}

function TeamColorLogoBadge({
  name,
  count,
  bonus,
  compact = false,
}: {
  name: string;
  count?: number;
  bonus?: string;
  compact?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const cleanName = (name || "").trim();
  if (!cleanName || cleanName === "단일팀") return null;

  const resolvedLogo = getTeamColorLogoUrl(cleanName);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      }`}
    >
      {resolvedLogo && !imgErr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedLogo}
          alt={cleanName}
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
          className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} object-contain rounded-xs shrink-0`}
        />
      ) : (
        <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-mono font-extrabold leading-none bg-blue-600 text-white shrink-0">
          <Trophy className="w-2.5 h-2.5 mr-0.5 inline" />
          {cleanName.slice(0, 2)}
        </span>
      )}
      <span className="font-bold text-slate-800 dark:text-slate-100">
        {cleanName}
      </span>
      {count !== undefined && (
        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          {count}명{bonus ? ` (${bonus.replace("전체 능력치 ", "")})` : ""}
        </span>
      )}
    </span>
  );
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
}: SquadLabViewProps) {
  const [squadId, setSquadId] = useState<string>("custom-squad-maker");
  const [squadName, setSquadName] = useState<string>("나만의 커스텀 스쿼드");
  const [formationCategory, setFormationCategory] =
    useState<FormationCategory>("4백");
  const [formation, setFormation] = useState<string>("4-2-3-1");

  // [요구사항 2-2] 목표 보유 예산 자율 입력: 기본값은 '설정 안 함(비워둠)'
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetUnit, setBudgetUnit] = useState<number>(100_000_000); // 기본 단위: 억 BP
  const [teamColorBonus, setTeamColorBonus] = useState<number>(0);

  // 초기 빈 스쿼드 (기본 강화 등급 8강, spid 0)
  const [slots, setSlots] = useState<SquadSlot[]>(() =>
    (FORMATION_LAYOUTS["4-2-3-1"] || []).map((l) => ({
      slot_id: l.slot_id,
      slot_position: l.slot_position,
      spid: 0,
      grade: 8,
      x: l.x,
      y: l.y,
    }))
  );

  const [unassignedPlayers, setUnassignedPlayers] = useState<
    UnassignedPlayerItem[]
  >([]);
  const [previousSnapshot, setPreviousSnapshot] =
    useState<PreviousSquadSnapshot | null>(null);
  const [formationNotice, setFormationNotice] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<SquadAnalysisResult | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  const [showPurchaseAudit, setShowPurchaseAudit] = useState<boolean>(true);
  const [showTacticalRadar, setShowTacticalRadar] = useState<boolean>(false);

  // [요구사항 1-1] 드래그 앤 드롭(Drag & Drop) 슬롯 간 스위칭 상태
  const [dragSourceSlotId, setDragSourceSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  // [요구사항 1-2] 슬롯 클릭 시 선수 검색/교체 모달(상세 필터 포함) 상태
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotPos, setEditingSlotPos] = useState<string>("ST");
  const [modalQuery, setModalQuery] = useState<string>("");
  const [isModalFilterOpen, setIsModalFilterOpen] = useState<boolean>(false);
  const [modalFilterState, setModalFilterState] = useState<PlayerFilterState>({
    ...DEFAULT_PLAYER_FILTER_STATE,
    grade: 8,
    adaptBonus: 0,
  });
  const [pickerSort, setPickerSort] = useState<string>("ovr_desc");
  const [pickerCards, setPickerCards] = useState<PlayerCard[]>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    card: PlayerCard;
    grade: number;
    conflictSlotId: string;
    conflictPosition: string;
  } | null>(null);

  const dynamicEnhanceLevels = useMemo(
    () =>
      Array.from(
        { length: Math.max(13, rules.maxEnhanceLevel || 13) },
        (_, i) => i + 1
      ),
    [rules.maxEnhanceLevel]
  );

  // 선택형 목표 예산(BP) 계산 (빈칸이면 0 = 예산 미설정)
  const budgetBp = useMemo(() => {
    const num = Number(budgetInput);
    if (!budgetInput.trim() || !Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * budgetUnit);
  }, [budgetInput, budgetUnit]);

  // 외부 연동 스쿼드(externalSlots) 전달 시에만 로드
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
          grade: source?.grade || 8,
          x: l.x,
          y: l.y,
        };
      });
      queueMicrotask(() => {
        setSlots(normalizedExternal);
        setSquadId(`squad-${Date.now()}`);
        setSquadName("연동 스쿼드");
        setUnassignedPlayers([]);
      });
    }
  }, [externalSlots, formation]);

  // 표준 급여 상한선 270 고정
  const activeSalaryCap = 270;

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
            budget_bp: bBp > 0 ? bBp : 500_000_000_000,
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

  const evaluationTriggerKey = useMemo(
    () =>
      slots
        .map((s) => `${s.slot_id}:${s.slot_position}:${s.spid}:${s.grade}`)
        .join("|"),
    [slots]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      evaluateCurrentSquad(
        slots,
        formation,
        budgetBp,
        activeSalaryCap,
        teamColorBonus
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [
    evaluationTriggerKey,
    formation,
    budgetBp,
    activeSalaryCap,
    teamColorBonus,
    evaluateCurrentSquad,
    slots,
  ]);

  const evalMap = useMemo(
    () =>
      new Map((analysis?.placed_evaluations || []).map((p) => [p.slot_id, p])),
    [analysis]
  );

  /**
   * [요구사항 1-1] 두 슬롯 간 선수 즉시 위치 맞교환(Switching)
   * 빈 슬롯으로 드래그 시 해당 포지션으로 이동하며, 이미 선수가 있는 슬롯으로 드래그 시 두 선수가 서로 자리를 바꿉니다.
   */
  const handleSwapSlots = useCallback(
    (sourceSlotId: string, targetSlotId: string) => {
      if (!sourceSlotId || !targetSlotId || sourceSlotId === targetSlotId) {
        return;
      }
      setSlots((prev) => {
        const srcSlot = prev.find((s) => s.slot_id === sourceSlotId);
        const tgtSlot = prev.find((s) => s.slot_id === targetSlotId);
        if (!srcSlot || !tgtSlot) return prev;
        if (!srcSlot.spid && !tgtSlot.spid) return prev;

        return prev.map((s) => {
          if (s.slot_id === sourceSlotId) {
            return {
              ...s,
              spid: tgtSlot.spid || 0,
              grade: tgtSlot.spid ? tgtSlot.grade || 8 : 8,
            };
          }
          if (s.slot_id === targetSlotId) {
            return {
              ...s,
              spid: srcSlot.spid || 0,
              grade: srcSlot.spid ? srcSlot.grade || 8 : 8,
            };
          }
          return s;
        });
      });
    },
    []
  );

  /**
   * [요구사항 2-1] 포메이션 변경 시 기존 선수를 새 전술 포지션에 맞춰 자동 재배치
   */
  const handleChangeFormation = (newFmt: string) => {
    if (newFmt === formation) return;
    const targetLayout =
      FORMATION_LAYOUTS[newFmt] || FORMATION_LAYOUTS["4-2-3-1"];

    setPreviousSnapshot({
      formation,
      slots: slots.map((s) => ({ ...s })),
      unassigned: [...unassignedPlayers],
    });

    const activeOldSlots = slots.filter((s) => s.spid > 0);
    const usedOldSlotIds = new Set<string>();
    const assignedNewSlots = new Map<
      string,
      { spid: number; grade: number }
    >();

    // 1단계: 동일한 slot_id 매칭
    for (const newSlot of targetLayout) {
      const exactIdMatch = activeOldSlots.find(
        (old) =>
          !usedOldSlotIds.has(old.slot_id) && old.slot_id === newSlot.slot_id
      );
      if (exactIdMatch) {
        assignedNewSlots.set(newSlot.slot_id, {
          spid: exactIdMatch.spid,
          grade: exactIdMatch.grade || 8,
        });
        usedOldSlotIds.add(exactIdMatch.slot_id);
      }
    }

    // 2단계: 동일한 slot_position 매칭
    for (const newSlot of targetLayout) {
      if (assignedNewSlots.has(newSlot.slot_id)) continue;
      const exactPosMatch = activeOldSlots.find(
        (old) =>
          !usedOldSlotIds.has(old.slot_id) &&
          old.slot_position === newSlot.slot_position
      );
      if (exactPosMatch) {
        assignedNewSlots.set(newSlot.slot_id, {
          spid: exactPosMatch.spid,
          grade: exactPosMatch.grade || 8,
        });
        usedOldSlotIds.add(exactPosMatch.slot_id);
      }
    }

    // 3단계: 호환 포지션 우선순위 매칭
    for (const newSlot of targetLayout) {
      if (assignedNewSlots.has(newSlot.slot_id)) continue;
      const compatList =
        POSITION_COMPATIBILITY_ORDER[newSlot.slot_position] || [];
      let matchedOld: SquadSlot | undefined;
      for (const compatPos of compatList) {
        matchedOld = activeOldSlots.find(
          (old) =>
            !usedOldSlotIds.has(old.slot_id) && old.slot_position === compatPos
        );
        if (matchedOld) break;
      }
      if (matchedOld) {
        assignedNewSlots.set(newSlot.slot_id, {
          spid: matchedOld.spid,
          grade: matchedOld.grade || 8,
        });
        usedOldSlotIds.add(matchedOld.slot_id);
      }
    }

    // 4단계: 남은 선수 순서대로 배치
    for (const newSlot of targetLayout) {
      if (assignedNewSlots.has(newSlot.slot_id)) continue;
      const remainingOld = activeOldSlots.find(
        (old) => !usedOldSlotIds.has(old.slot_id)
      );
      if (remainingOld) {
        assignedNewSlots.set(newSlot.slot_id, {
          spid: remainingOld.spid,
          grade: remainingOld.grade || 8,
        });
        usedOldSlotIds.add(remainingOld.slot_id);
      }
    }

    const updatedSlots: SquadSlot[] = targetLayout.map((l) => {
      const assigned = assignedNewSlots.get(l.slot_id);
      return {
        slot_id: l.slot_id,
        slot_position: l.slot_position,
        spid: assigned ? assigned.spid : 0,
        grade: assigned ? assigned.grade : 8,
        x: l.x,
        y: l.y,
      };
    });

    for (const [cat, fmts] of Object.entries(FORMATION_CATEGORIES)) {
      if (fmts.includes(newFmt)) {
        setFormationCategory(cat as FormationCategory);
        break;
      }
    }

    setFormation(newFmt);
    setSlots(updatedSlots);
    setFormationNotice(
      `${formation} → ${newFmt} 포메이션으로 변경되었습니다. 등록된 선수들이 새 전술 포지션에 맞춰 자동 재배치되었습니다.`
    );
  };

  const handleRestorePreviousFormation = () => {
    if (!previousSnapshot) return;
    setFormation(previousSnapshot.formation);
    setSlots(previousSnapshot.slots);
    setUnassignedPlayers(previousSnapshot.unassigned);
    setPreviousSnapshot(null);
    setFormationNotice(null);
  };

  const handleClearAllSlots = () => {
    const defaultLayout =
      FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];
    setSlots(
      defaultLayout.map((l) => ({
        slot_id: l.slot_id,
        slot_position: l.slot_position,
        spid: 0,
        grade: 8,
        x: l.x,
        y: l.y,
      }))
    );
    setUnassignedPlayers([]);
    setFormationNotice(null);
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
          salary_cap: activeSalaryCap,
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
   * [요구사항 1-2] 상세 필터(PlayerSearchFilter)와 연동된 선수 검색 모달 데이터 조회
   */
  const executeModalSearch = useCallback(
    async (
      qText: string,
      fState: PlayerFilterState,
      forceCrawl = true
    ) => {
      setPickerLoading(true);
      setPickerError(null);
      try {
        const params = new URLSearchParams();
        if (qText.trim()) {
          params.set("q", qText.trim());
        }
        appendFilterParamsToUrl(params, fState);
        if (
          forceCrawl ||
          qText.trim() ||
          fState.seasons.length > 0 ||
          fState.teamColors.length > 0
        ) {
          params.set("crawl", "1");
        }
        const res = await fetch(
          `/api/fclab/v1/players/search?${params.toString()}`
        );
        if (!res.ok) {
          throw new Error(`선수 검색 요청 실패 (HTTP ${res.status})`);
        }
        const data = await res.json();
        const rawItems: PlayerCard[] = data.items || data.cards || [];
        const filtered = rawItems.filter((c) =>
          matchesPlayerFilter(c, fState, rules.enhanceOvrBoosts)
        );
        setPickerCards(filtered);
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
    [rules.enhanceOvrBoosts]
  );

  const openSlotPicker = async (slotId: string, pos: string) => {
    const existingSlot = slots.find((s) => s.slot_id === slotId);
    const initialGrade = existingSlot?.grade || 8;
    const nextFilter: PlayerFilterState = {
      ...DEFAULT_PLAYER_FILTER_STATE,
      position: pos,
      grade: initialGrade,
      adaptBonus: 0,
    };
    setEditingSlotId(slotId);
    setEditingSlotPos(pos);
    setModalQuery("");
    setModalFilterState(nextFilter);
    setDuplicateConfirm(null);

    await executeModalSearch("", nextFilter, false);
  };

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
            grade: target.grade || 8,
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

  const commitAssignCardToSlot = (
    slotId: string,
    spid: number,
    grade = 8,
    swapWithConflictSlotId?: string
  ) => {
    setSlots((prev) => {
      const currentTargetSlot = prev.find((s) => s.slot_id === slotId);
      return prev.map((s) => {
        if (s.slot_id === slotId) {
          return { ...s, spid, grade };
        }
        if (swapWithConflictSlotId && s.slot_id === swapWithConflictSlotId) {
          return {
            ...s,
            spid: currentTargetSlot?.spid || 0,
            grade: currentTargetSlot?.grade || 8,
          };
        }
        return s;
      });
    });
    setUnassignedPlayers((prev) =>
      prev.filter((u) => u.spid !== spid && u.pid !== spid % 1000000)
    );
    setDuplicateConfirm(null);
    setEditingSlotId(null);
  };

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

  const defaultLayoutCoords =
    FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-2-3-1"];

  const renderedSlots = useMemo(() => {
    return defaultLayoutCoords.map((def) => {
      const slotObj = slots.find((s) => s.slot_id === def.slot_id);
      return {
        slot_id: def.slot_id,
        slot_position: slotObj?.slot_position || def.slot_position,
        spid: slotObj?.spid || 0,
        grade: slotObj?.grade || 8,
        x: def.x,
        y: def.y,
      };
    });
  }, [defaultLayoutCoords, slots]);

  const emptySlots = useMemo(
    () => renderedSlots.filter((s) => !s.spid || s.spid <= 0),
    [renderedSlots]
  );
  const placedCount = renderedSlots.length - emptySlots.length;

  // 평균 오버롤(Avg OVR) 계산 ('코어 점수' 미표시)
  const averageOvr = useMemo(() => {
    if (analysis?.avg_ovr && analysis.avg_ovr > 0) {
      return analysis.avg_ovr;
    }
    const placedList = analysis?.placed_evaluations || [];
    if (placedList.length === 0) return 0;
    const sum = placedList.reduce((acc, p) => acc + (p.ovr || 0), 0);
    return Number((sum / placedList.length).toFixed(1));
  }, [analysis]);

  const lineAvgOvrs = useMemo(() => {
    const placedList = analysis?.placed_evaluations || [];
    const fw: number[] = [];
    const mf: number[] = [];
    const df: number[] = [];
    for (const p of placedList) {
      const pos = p.slot_position.toUpperCase();
      if (["ST", "CF", "LW", "RW"].includes(pos)) fw.push(p.ovr);
      else if (["CAM", "CM", "CDM", "LM", "RM"].includes(pos)) mf.push(p.ovr);
      else if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) df.push(p.ovr);
    }
    const calc = (arr: number[]) =>
      arr.length
        ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
        : 0;
    return {
      fw: calc(fw),
      mf: calc(mf),
      df: calc(df),
    };
  }, [analysis]);

  const currentTotalSalary = analysis?.total_salary || 0;
  const salaryDiff = activeSalaryCap - currentTotalSalary;
  const isSalaryValid = salaryDiff >= 0;
  const salaryUsagePct = Math.min(
    100,
    Math.round((currentTotalSalary / Math.max(1, activeSalaryCap)) * 100)
  );

  const currentTotalBp = analysis?.total_bp || 0;
  const hasBudgetTarget = budgetBp > 0;
  const bpDiff = hasBudgetTarget ? budgetBp - currentTotalBp : 0;
  const isBudgetValid = !hasBudgetTarget || bpDiff >= 0;

  const pickerGrade = modalFilterState.grade || 8;

  const sortedPickerCards = useMemo(() => {
    const list = [...pickerCards];
    const getCardBpForGrade = (c: PlayerCard, g: number) => {
      const gPrice = c.prices?.[String(g)]?.bp;
      if (gPrice && gPrice > 0) return gPrice;
      if (g === 8 && c.bp_8) return c.bp_8;
      if (g === 5 && c.bp_5) return c.bp_5;
      return c.bp_1 || 0;
    };
    const boost = getEnhanceOvrBoost(pickerGrade, rules.enhanceOvrBoosts);

    if (pickerSort === "bp_asc") {
      list.sort((a, b) => {
        const aBp =
          getCardBpForGrade(a, pickerGrade) || Number.MAX_SAFE_INTEGER;
        const bBp =
          getCardBpForGrade(b, pickerGrade) || Number.MAX_SAFE_INTEGER;
        return aBp - bBp || b.ovr - a.ovr;
      });
    } else if (pickerSort === "bp_desc") {
      list.sort(
        (a, b) =>
          getCardBpForGrade(b, pickerGrade) -
            getCardBpForGrade(a, pickerGrade) || b.ovr - a.ovr
      );
    } else if (pickerSort === "salary_asc") {
      list.sort((a, b) => a.salary - b.salary || b.ovr - a.ovr);
    } else if (pickerSort === "salary_desc") {
      list.sort((a, b) => b.salary - a.salary || b.ovr - a.ovr);
    } else if (pickerSort === "ovr_asc") {
      list.sort((a, b) => a.ovr + boost - (b.ovr + boost));
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
      {/* ==================== 상단 스쿼드 메이커 통합 헤더 & 4대 핵심 요약 지표 ==================== */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        {/* 타이틀 · 포메이션 드롭다운 · 저장/불러오기/초기화 바 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              FC ONLINE SQUAD MAKER
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <input
              type="text"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="스쿼드 이름을 입력하세요"
              className="px-3.5 py-1.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 min-w-[200px]"
            />

            {/* [요구사항 2-1] 전 포메이션 드롭다운 선택기 */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                포메이션:
              </span>
              <select
                value={formation}
                onChange={(e) => handleChangeFormation(e.target.value)}
                className="bg-transparent text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
              >
                <optgroup
                  label="4백 포메이션 (13종)"
                  className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100"
                >
                  {FORMATION_CATEGORIES["4백"].map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </optgroup>
                <optgroup
                  label="3백 포메이션 (6종)"
                  className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100"
                >
                  {FORMATION_CATEGORIES["3백"].map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </optgroup>
                <optgroup
                  label="5백 포메이션 (5종)"
                  className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100"
                >
                  {FORMATION_CATEGORIES["5백"].map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              선발{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {placedCount} / 11명
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {savedSquads.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
                      if (target.budget_bp && target.budget_bp > 0) {
                        setBudgetUnit(100_000_000);
                        setBudgetInput(
                          String(Math.round(target.budget_bp / 100_000_000))
                        );
                      } else {
                        setBudgetInput("");
                      }
                      setTeamColorBonus(target.team_color_bonus ?? 0);
                      const loadedSlots = layout.map((l) => {
                        const m = (target.slots || []).find(
                          (s) => s.slot_id === l.slot_id
                        );
                        return {
                          slot_id: l.slot_id,
                          slot_position: m?.slot_position || l.slot_position,
                          spid: m?.spid || 0,
                          grade: m?.grade || 8,
                          x: l.x,
                          y: l.y,
                        };
                      });
                      setSlots(loadedSlots);
                      setFormationNotice(null);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none py-0.5 cursor-pointer"
                >
                  <option value={squadId}>-- 저장된 스쿼드 선택 --</option>
                  {savedSquads.map((sq) => (
                    <option
                      key={sq.id}
                      value={sq.id}
                      className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100"
                    >
                      {sq.name} ({sq.formation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {placedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllSlots}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-500/15 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                전체 비우기
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveSquad}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              스쿼드 저장
            </button>
            {saveMessage && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        {/* [요구사항 2-3] 상단 4대 요약 지표: 1) 총 급여 (현재 급여 / 270) / 2) 평균 오버롤(Avg OVR) / 3) 총 스쿼드 가치(BP) / 4) 활성 팀컬러(구단/국가 로고 포함) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* 1. 총 급여 (현재 급여 / 270) */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              isSalaryValid
                ? "bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800"
                : "bg-rose-500/10 border-rose-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                총 급여 (현재 급여 / 270)
              </span>
              <span
                className={`text-[11px] font-bold ${
                  isSalaryValid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isSalaryValid
                  ? `여유 ${salaryDiff} FP`
                  : `+${Math.abs(salaryDiff)} 초과`}
              </span>
            </div>
            <div
              className={`text-2xl font-black font-mono tabular-nums mt-1.5 ${
                isSalaryValid
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {currentTotalSalary}{" "}
              <span className="text-sm font-bold text-slate-400">
                / {activeSalaryCap}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${salaryUsagePct}%` }}
                  className={`h-full transition-all ${
                    isSalaryValid ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 2. 평균 오버롤 (Avg OVR) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                평균 오버롤 (Avg OVR)
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                선발 {placedCount}명 기준
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                {averageOvr > 0 ? averageOvr : "-"}
              </span>
              <span className="text-xs font-bold text-slate-400">OVR</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>
                FW{" "}
                <strong className="text-rose-500">
                  {lineAvgOvrs.fw || "-"}
                </strong>
              </span>
              <span>
                MF{" "}
                <strong className="text-emerald-500">
                  {lineAvgOvrs.mf || "-"}
                </strong>
              </span>
              <span>
                DF{" "}
                <strong className="text-sky-500">
                  {lineAvgOvrs.df || "-"}
                </strong>
              </span>
            </div>
          </div>

          {/* 3. 총 스쿼드 가치(BP) & 목표 보유 예산 자율 입력 */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              isBudgetValid
                ? "bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800"
                : "bg-rose-500/10 border-rose-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-amber-500" />총 스쿼드 가치
                (BP)
              </span>
              {hasBudgetTarget ? (
                <span
                  className={`text-[11px] font-bold ${
                    isBudgetValid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isBudgetValid
                    ? `잔여 ${formatBpKorean(bpDiff)} BP`
                    : `+${formatBpKorean(Math.abs(bpDiff))} BP 초과`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  목표 예산: 설정 안 함
                </span>
              )}
            </div>

            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums mt-1.5 truncate">
              {currentTotalBp > 0 ? formatBpKorean(currentTotalBp) : "0"}{" "}
              <span className="text-xs font-bold text-slate-400">BP</span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="any"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="보유 예산 입력 (설정 안 함)"
                className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
              <select
                value={budgetUnit}
                onChange={(e) => setBudgetUnit(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shrink-0 cursor-pointer"
              >
                <option value={100_000_000}>억 BP</option>
                <option value={1_000_000_000_000}>조 BP</option>
              </select>
              {budgetInput && (
                <button
                  type="button"
                  onClick={() => setBudgetInput("")}
                  title="목표 예산 비우기"
                  className="p-1 text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. 활성 팀컬러 (구단/국가 로고 포함) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                활성 팀컬러 (구단/국가 로고)
              </span>
              <select
                value={teamColorBonus}
                onChange={(e) => setTeamColorBonus(Number(e.target.value))}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 outline-none cursor-pointer"
              >
                <option value={0}>적응도/팀컬러 +0</option>
                <option value={2}>팀컬러 +2</option>
                <option value={3}>현역/단일 +3</option>
                <option value={5}>은카 케미 +5</option>
                <option value={7}>금카 케미 +7</option>
                <option value={9}>초월 케미 +9</option>
              </select>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 min-h-[34px] items-center">
              {analysis?.detected_synergies &&
              analysis.detected_synergies.length > 0 ? (
                analysis.detected_synergies.slice(0, 4).map((syn) => (
                  <TeamColorLogoBadge
                    key={syn.name}
                    name={syn.name}
                    count={syn.count}
                    bonus={syn.bonus}
                  />
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  동일 클럽/국가 선수 3명 이상 배치 시 공식 구단·국기 로고가 활성화됩니다.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 빠른 포메이션 버튼 바 */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F17] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(["4백", "3백", "5백"] as FormationCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormationCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      formationCategory === cat
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {cat} ({FORMATION_CATEGORIES[cat].length})
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {FORMATION_CATEGORIES[formationCategory].map((fmt) => {
                  const isSelected = formation === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleChangeFormation(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-50 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {previousSnapshot && (
              <button
                type="button"
                onClick={handleRestorePreviousFormation}
                className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                이전({previousSnapshot.formation}) 되돌리기
              </button>
            )}
          </div>

          {formationNotice && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
              <span>{formationNotice}</span>
              <button
                type="button"
                onClick={() => setFormationNotice(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 메인 전술 보드(피치) & 우측 스쿼드 진단 리포트 ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측 (7 cols): 공식 스쿼드메이커 스타일 전술 피치 보드 + 11인 빠른 리스트 */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  전술 피치 보드 ({formation})
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    · <ArrowLeftRight className="w-3.5 h-3.5 inline" /> 드래그 앤 드롭 위치 스위칭 &amp; 클릭 선수 검색
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  슬롯을 다른 슬롯에 드래그하여 놓으면 두 선수의 위치가 즉시 맞교환되며, 슬롯 클릭 시 상세 필터가 포함된 선수 검색창이 열립니다.
                </p>
              </div>
              {evaluating && (
                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  스쿼드 분석 중
                </span>
              )}
            </div>

            {/* [요구사항 1] 공식 스쿼드메이커풍 피치 & 실제 선수 카드 UI + 드래그 앤 드롭 스위칭 */}
            <div className="relative w-full h-[680px] sm:h-[760px] rounded-2xl overflow-hidden select-none border-2 border-emerald-800/80 shadow-inner bg-gradient-to-b from-[#0d3b24] via-[#11462b] to-[#0a2e1c]">
              {/* 잔디 스트라이프 & 경기장 라인 SVG */}
              <svg
                viewBox="0 0 600 780"
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                  <rect
                    key={idx}
                    x="0"
                    y={idx * 78}
                    width="600"
                    height="39"
                    fill="rgba(255, 255, 255, 0.035)"
                  />
                ))}
                <rect
                  x="24"
                  y="20"
                  width="552"
                  height="740"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <line
                  x1="24"
                  y1="390"
                  x2="576"
                  y2="390"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <circle
                  cx="300"
                  cy="390"
                  r="68"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <circle cx="300" cy="390" r="4" fill="rgba(255,255,255,0.45)" />
                <rect
                  x="150"
                  y="20"
                  width="300"
                  height="115"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <rect
                  x="220"
                  y="20"
                  width="160"
                  height="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <rect
                  x="150"
                  y="645"
                  width="300"
                  height="115"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
                <rect
                  x="220"
                  y="715"
                  width="160"
                  height="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="2"
                />
              </svg>

              {renderedSlots.map((coord) => {
                const placed = evalMap.get(coord.slot_id);
                const hasPlayer = coord.spid > 0;
                const currentGrade = coord.grade || 8;
                const posHeaderClass = getPosHeaderBarClass(coord.slot_position);
                const posTextColor = getPosTextColor(coord.slot_position);
                const cardFrameClass = getCardFrameClass(currentGrade);
                const gradeShieldClass = getGradeShieldClass(currentGrade);

                const isBeingDragged = dragSourceSlotId === coord.slot_id;
                const isDragTarget =
                  dragOverSlotId === coord.slot_id &&
                  dragSourceSlotId !== null &&
                  dragSourceSlotId !== coord.slot_id;

                // 공식 신규 특성(17종) 추출 및 공식 아이콘 매핑
                const playerNewTraits: { name: string; icon: string }[] = (
                  placed?.new_traits && placed.new_traits.length > 0
                    ? placed.new_traits
                    : (placed?.traits || [])
                        .map((t) => t.name)
                        .filter((n) => Boolean(OFFICIAL_NEW_TRAIT_ICON_MAP[n]))
                ).map((ntName) => {
                  const fromCard = (placed?.traits || []).find(
                    (t) => t.name === ntName
                  );
                  return {
                    name: ntName,
                    icon:
                      fromCard?.icon ||
                      OFFICIAL_NEW_TRAIT_ICON_MAP[ntName] ||
                      "",
                  };
                });

                return (
                  <div
                    key={coord.slot_id}
                    draggable
                    onDragStart={(e) => {
                      setDragSourceSlotId(coord.slot_id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", coord.slot_id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSlotId !== coord.slot_id) {
                        setDragOverSlotId(coord.slot_id);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverSlotId(coord.slot_id);
                    }}
                    onDragLeave={() => {
                      if (dragOverSlotId === coord.slot_id) {
                        setDragOverSlotId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const srcId =
                        dragSourceSlotId ||
                        e.dataTransfer.getData("text/plain");
                      if (srcId && srcId !== coord.slot_id) {
                        handleSwapSlots(srcId, coord.slot_id);
                      }
                      setDragSourceSlotId(null);
                      setDragOverSlotId(null);
                    }}
                    onDragEnd={() => {
                      setDragSourceSlotId(null);
                      setDragOverSlotId(null);
                    }}
                    style={{
                      left: `${coord.x}%`,
                      top: `${coord.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`absolute transition-all ${
                      isBeingDragged
                        ? "z-30 opacity-60 scale-95 cursor-grabbing"
                        : isDragTarget
                        ? "z-30 scale-110 ring-4 ring-emerald-400 rounded-xl"
                        : "z-10 hover:z-25 cursor-grab"
                    }`}
                  >
                    {/* 드래그 타겟 오버레이 힌트 */}
                    {isDragTarget && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold whitespace-nowrap shadow-lg pointer-events-none">
                        {hasPlayer ? "⇄ 선수 스위칭" : "여기로 이동"}
                      </div>
                    )}

                    {hasPlayer ? (
                      <div className="relative flex flex-col items-center group">
                        {/* [요구사항 1-3] 호버/상단 미니 컨트롤 바: 강화 단계(1~13강) 즉시 변경 & 제거(✕) 버튼 (클릭 이벤트 충돌 방지) */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="mb-1 px-1.5 py-0.5 rounded-lg bg-slate-950/95 border border-slate-700 shadow-lg flex items-center gap-1 opacity-95 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <select
                            value={currentGrade}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateSlotGrade(
                                coord.slot_id,
                                Number(e.target.value)
                              );
                            }}
                            aria-label={`${coord.slot_position} 강화 단계 선택`}
                            className={`rounded px-1 py-0.2 text-[10px] font-mono border outline-none cursor-pointer ${gradeShieldClass}`}
                          >
                            {dynamicEnhanceLevels.map((g) => (
                              <option
                                key={g}
                                value={g}
                                className="bg-[#0B0F17] text-slate-100 font-bold"
                              >
                                +{g}강
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              unassignSlot(coord.slot_id, true);
                            }}
                            title="선수 제거"
                            className="w-4 h-4 rounded bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* 카드 본체 + 우측 신규 특성 아이콘 영역 */}
                        <div className="relative flex items-center">
                          {/* [요구사항 1-3] 실제 FC 온라인 선수 카드 디자인 */}
                          <div
                            onClick={() =>
                              openSlotPicker(coord.slot_id, coord.slot_position)
                            }
                            title="클릭하여 선수 교체 / 드래그하여 다른 슬롯과 위치 스위칭"
                            className={`w-[98px] sm:w-[110px] rounded-xl bg-gradient-to-b ${cardFrameClass} border-2 hover:border-emerald-400 overflow-hidden transition-all cursor-pointer select-none`}
                          >
                            {/* 카드 상단+중단: 좌측(OVR/포지션/시즌아이콘) + 우측(선수 액션/헤드샷 이미지 & 강화단계/급여) */}
                            <div className="relative h-[66px] sm:h-[72px] px-1.5 pt-1 flex justify-between">
                              {/* 좌측 스펙 컬럼 */}
                              <div className="z-10 flex flex-col items-start leading-none">
                                <span className="text-sm sm:text-base font-black font-mono text-white tracking-tighter drop-shadow">
                                  {placed ? placed.ovr : "..."}
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-extrabold tracking-tight mt-0.5 ${posTextColor}`}
                                >
                                  {coord.slot_position}
                                </span>
                                {placed && (
                                  <div className="mt-1">
                                    <SeasonBadge
                                      seasonCode={placed.season_code}
                                      seasonImg={placed.season_img}
                                      className="h-3.5"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* 중앙~우측 선수 액션/헤드샷 이미지 */}
                              <div className="absolute right-1 bottom-0 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none flex items-end justify-end">
                                <PlayerAvatar
                                  src={placed?.thumb_url}
                                  spid={coord.spid}
                                  name={placed?.name || `선수 #${coord.spid}`}
                                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                                />
                              </div>

                              {/* 우측 상단 강화 배지 (1~13강) */}
                              <div className="z-10 flex flex-col items-end justify-between pb-1">
                                <span
                                  className={`px-1 py-0.2 rounded text-[10px] font-mono leading-tight border shadow-xs ${gradeShieldClass}`}
                                >
                                  +{currentGrade}
                                </span>
                              </div>
                            </div>

                            {/* 카드 하단 네임플레이트: 시즌 아이콘 + 선수명 + 급여 */}
                            <div className="px-1.5 py-1 bg-slate-950/95 border-t border-white/15 flex items-center justify-between gap-1">
                              <span className="text-[11px] font-extrabold text-white truncate">
                                {placed?.name || "불러오는 중"}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono font-extrabold text-sky-300 shrink-0">
                                {placed ? placed.salary : "-"}
                              </span>
                            </div>
                          </div>

                          {/* [요구사항 1-3] 카드 우측 옆 보유 신규 특성 공식 아이콘 표시 */}
                          {playerNewTraits.length > 0 && (
                            <div className="absolute -right-7 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
                              {playerNewTraits.slice(0, 3).map((nt) => (
                                <div
                                  key={nt.name}
                                  title={`신규 특성: ${nt.name}`}
                                  className="w-6 h-6 rounded-full bg-slate-950/95 border border-amber-400/80 shadow-md flex items-center justify-center p-0.5"
                                >
                                  {nt.icon ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={nt.icon}
                                      alt={nt.name}
                                      referrerPolicy="no-referrer"
                                      className="w-4 h-4 object-contain"
                                    />
                                  ) : (
                                    <span className="text-[8px] font-bold text-amber-300">
                                      {nt.name.slice(0, 1)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* [요구사항 1-3] 카드 바로 하단 해당 강화 단계 현재 시세(예: 420억 BP) 표시 */}
                        <div
                          onClick={() =>
                            openSlotPicker(coord.slot_id, coord.slot_position)
                          }
                          className="mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-amber-500/45 shadow-md flex items-center gap-1 cursor-pointer"
                        >
                          <span className="text-[10px] font-mono font-extrabold text-amber-300 whitespace-nowrap">
                            {placed?.bp_text
                              ? `${placed.bp_text} BP`
                              : placed?.bp
                              ? `${formatBpKorean(placed.bp)} BP`
                              : "시세 조회중"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* 빈 포지션 슬롯 (클릭 시 해당 포지션 필터가 적용된 선수 검색 모달 오픈) */
                      <button
                        type="button"
                        onClick={() =>
                          openSlotPicker(coord.slot_id, coord.slot_position)
                        }
                        className="w-[92px] sm:w-[104px] rounded-xl bg-[#0B131E]/85 hover:bg-[#111C2D] border-2 border-dashed border-white/35 hover:border-emerald-400 p-2 text-center shadow-lg transition-all group cursor-pointer"
                      >
                        <div
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-extrabold mb-1 ${posHeaderClass}`}
                        >
                          {coord.slot_position}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-emerald-500/20 flex items-center justify-center mx-auto my-0.5 transition-colors">
                          <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-200 group-hover:text-emerald-300">
                          선수 추가
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 선발 11인 포지션 명단 빠른 편집 */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  선발 11인 명단 빠른 편집
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  강화 단계(1~13강) 조절, 선수 교체 및 제거를 한눈에 관리합니다.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {placedCount} / 11명 등록
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
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      hasPlayer
                        ? "bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800"
                        : "bg-slate-50/50 dark:bg-[#0B0F17]/50 border-dashed border-slate-300 dark:border-slate-800"
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
                        className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 text-xs font-mono font-bold outline-none cursor-pointer ${getPositionToneClass(
                          slot.slot_position
                        )}`}
                      >
                        {ALL_POSITIONS.map((p) => (
                          <option
                            key={p}
                            value={p}
                            className="bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100"
                          >
                            {p}
                          </option>
                        ))}
                      </select>

                      {hasPlayer ? (
                        <div
                          onClick={() =>
                            openSlotPicker(slot.slot_id, slot.slot_position)
                          }
                          className="min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            {placed && (
                              <SeasonBadge
                                seasonCode={placed.season_code}
                                seasonImg={placed.season_img}
                              />
                            )}
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {placed?.name || `선수 #${slot.spid}`}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums truncate">
                            {placed
                              ? `OVR ${placed.ovr} · 급여 ${placed.salary} · ${placed.bp_text} BP`
                              : "시세 불러오는 중..."}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openSlotPicker(slot.slot_id, slot.slot_position)
                          }
                          className="text-xs text-slate-400 hover:text-emerald-400 font-medium cursor-pointer"
                        >
                          빈 슬롯 ({slot.slot_position}) - 클릭하여 추가
                        </button>
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
                          className={`rounded px-1.5 py-0.5 text-[11px] font-mono border outline-none cursor-pointer ${badgeStyle.className}`}
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
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold whitespace-nowrap cursor-pointer"
                      >
                        {hasPlayer ? "교체" : "추가"}
                      </button>

                      {hasPlayer && (
                        <button
                          type="button"
                          onClick={() => unassignSlot(slot.slot_id, true)}
                          title="선수 제거"
                          className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 cursor-pointer"
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

        {/* 우측 (5 cols): 동일 팀컬러 엄격 제한 급여 절감 / 가성비 대체 카드 제안 & 스쿼드 구매 점검 리포트 */}
        <div className="lg:col-span-5 space-y-6">
          {/* 임시 보관함이 있을 때 표시 */}
          {unassignedPlayers.length > 0 && (
            <div className="bg-white dark:bg-[#111827] border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  임시 보관 선수 ({unassignedPlayers.length}명)
                </h3>
                <button
                  type="button"
                  onClick={() => setUnassignedPlayers([])}
                  className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  비우기
                </button>
              </div>
              <div className="space-y-2">
                {unassignedPlayers.map((up) => (
                  <div
                    key={up.spid}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PlayerAvatar
                        src={up.thumb_url}
                        spid={up.spid}
                        name={up.name}
                        className="w-8 h-8"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <SeasonBadge seasonCode={up.season_code} />
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {up.name} (+{up.grade}강)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          급여 {up.salary} FP
                        </div>
                      </div>
                    </div>
                    {emptySlots.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          commitAssignCardToSlot(
                            emptySlots[0].slot_id,
                            up.spid,
                            up.grade
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {emptySlots[0].slot_position} 배치
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 스쿼드 미등록 초기 상태 안내 */}
          {placedCount === 0 && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <UserPlus className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                피치 위 포지션 슬롯을 클릭해 선수를 추가해보세요
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                선수를 1명 이상 배치하면 <strong>총 급여(현재/270), 평균 OVR, 총 스쿼드 가치(BP), 활성 팀컬러 로고</strong>와 함께 <strong>동일 팀컬러 기반 급여 절감 / 가성비 대체 카드 제안</strong>이 실시간으로 표시됩니다.
              </p>
            </div>
          )}

          {/* [요구사항 3] 동일 팀컬러 엄격 제한 급여 절감 / 가성비 대체 카드 제안 */}
          {placedCount > 0 &&
            analysis?.purchaseAudit &&
            analysis.purchaseAudit.overinvestedPositions.length > 0 && (
              <div className="bg-white dark:bg-[#111827] border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    SAME TEAM COLOR ALTERNATIVES
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    급여 절감 / 가성비 대체 카드 제안 (동일 팀컬러 · 동포지션)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    현재 스쿼드에서 해당 선수가 받고 있는 실제 팀컬러(소속 클럽 또는 국가)와 동일한 팀컬러를 보유한 동포지션 선수만 엄격하게 추천합니다.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {analysis.purchaseAudit.overinvestedPositions.map((warn) => {
                    const activeTcs = (
                      warn.currentPlayer.activeTeamColors || []
                    ).filter((tc) => tc && tc !== "단일팀");

                    return (
                      <div
                        key={`${warn.slotId}-${warn.currentPlayer.spid}`}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-mono font-extrabold ${getPositionToneClass(
                                warn.slotPosition
                              )}`}
                            >
                              [{warn.slotPosition}]
                            </span>
                            <SeasonBadge
                              seasonCode={warn.currentPlayer.seasonCode}
                              seasonImg={warn.currentPlayer.seasonImg}
                            />
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {warn.currentPlayer.name} (+
                              {warn.currentPlayer.grade}강 · 급여{" "}
                              {warn.currentPlayer.salary})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {activeTcs.slice(0, 2).map((tcName) => (
                              <TeamColorLogoBadge
                                key={tcName}
                                name={tcName}
                                compact
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {warn.warningReason}
                        </p>

                        <div className="space-y-2 pt-1">
                          {warn.recommendedAlternatives.map((alt) => {
                            const altGrade =
                              alt.grade || warn.currentPlayer.grade || 8;
                            const sharedTcs = (
                              alt.sharedTeamColors &&
                              alt.sharedTeamColors.length > 0
                                ? alt.sharedTeamColors
                                : alt.sharedTeamColor
                                ? [alt.sharedTeamColor]
                                : activeTcs
                            ).filter((tc) => tc && tc !== "단일팀");
                            const salDiff =
                              alt.salary !== undefined
                                ? warn.currentPlayer.salary - alt.salary
                                : 0;

                            return (
                              <div
                                key={`${warn.slotId}-alt-${alt.spid}`}
                                className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <PlayerAvatar
                                    src={alt.thumbUrl}
                                    spid={alt.spid}
                                    name={alt.name}
                                    className="w-9 h-9 shrink-0"
                                  />
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <SeasonBadge
                                        seasonCode={alt.season}
                                        seasonImg={alt.seasonImg}
                                      />
                                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                        {alt.name} (+{altGrade}강)
                                      </span>
                                      {sharedTcs.slice(0, 2).map((tc) => (
                                        <TeamColorLogoBadge
                                          key={tc}
                                          name={tc}
                                          compact
                                        />
                                      ))}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                                      {alt.ovr ? (
                                        <span>OVR {alt.ovr}</span>
                                      ) : null}
                                      {alt.salary !== undefined ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          급여 {alt.salary}
                                          {salDiff > 0
                                            ? ` (-${salDiff} 절감)`
                                            : ""}
                                        </span>
                                      ) : null}
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        {alt.bpText ||
                                          formatBpKorean(alt.bp || 0)}{" "}
                                        BP
                                      </span>
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
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                                >
                                  즉시 교체
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 스쿼드 구매 시점 & 재판매 수수료 점검 리포트 */}
          {placedCount > 0 && analysis?.purchaseAudit && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    SQUAD PURCHASE &amp; FEE AUDIT
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    스쿼드 재판매 수수료 및 30일 시세 위치 점검
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPurchaseAudit((prev) => !prev)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {showPurchaseAudit ? "접기" : "펼치기"}
                  {showPurchaseAudit ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {analysis.purchaseAudit.buyTimingSummaryLabel}
                </span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  타이밍 {analysis.purchaseAudit.overallBuyTimingScore}점
                </span>
              </div>

              {showPurchaseAudit && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        재판매 시 예상 수수료 손실 비교
                      </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        총 {formatBpKorean(analysis.purchaseAudit.totalBp)} BP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          PC방 + 탑클 (수수료 20%)
                        </div>
                        <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          손실 -
                          {formatBpKorean(
                            analysis.purchaseAudit.resaleLossPcTopBp ??
                              analysis.purchaseAudit.estimatedResaleLossBp
                          )}{" "}
                          BP
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          PC방+탑클+40% 쿠폰 (수수료 4%)
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                          손실 -
                          {formatBpKorean(
                            analysis.purchaseAudit.resaleLossWith40CouponBp ??
                              Math.round(analysis.purchaseAudit.totalBp * 0.04)
                          )}{" "}
                          BP
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        선수별 최근 30일 시세 위치 (저점 / 고점)
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {analysis.purchaseAudit.playerPricePercentiles.map(
                        (item) => {
                          const isLow =
                            item.buyTimingVerdict === "저점 매수 적기";
                          const isHigh =
                            item.buyTimingVerdict === "단기 고점 주의";
                          const barColorClass = isLow
                            ? "bg-emerald-500"
                            : isHigh
                            ? "bg-rose-500"
                            : "bg-amber-400";
                          const verdictBadgeText = isLow
                            ? "매수 적기"
                            : isHigh
                            ? "고점 주의"
                            : "중립";
                          return (
                            <div
                              key={`${item.slotId}-${item.spid}`}
                              className="p-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`font-mono font-bold text-[11px] ${getPositionToneClass(
                                      item.slotPosition
                                    )}`}
                                  >
                                    {item.slotPosition}
                                  </span>
                                  <SeasonBadge
                                    seasonCode={item.seasonCode}
                                    seasonImg={item.seasonImg}
                                  />
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {item.name} (+{item.grade}강)
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                  {verdictBadgeText} ({item.pricePercentile30d}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  style={{
                                    width: `${Math.max(
                                      5,
                                      Math.min(100, item.pricePercentile30d)
                                    )}%`,
                                  }}
                                  className={`h-full rounded-full ${barColorClass}`}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 스쿼드 6각형 밸런스 */}
          {placedCount > 0 && analysis && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  스쿼드 6각형 능력치 밸런스
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTacticalRadar((prev) => !prev)}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  {showTacticalRadar ? "접기" : "자세히 보기"}
                  {showTacticalRadar ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {showTacticalRadar && (
                <div className="flex justify-center pt-2">
                  <HexRadarChart
                    primaryData={analysis.team_radar}
                    primaryLabel={`${formation} 선발 ${placedCount}인 평균`}
                    size={220}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== [요구사항 1-2] 슬롯 클릭 시 오픈되는 선수 검색/교체 모달 (공통 상세 필터 포함) ==================== */}
      {editingSlotId && (
        <div
          onClick={() => {
            setDuplicateConfirm(null);
            setEditingSlotId(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* 모달 헤더 */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0E1422]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 ${getPositionToneClass(
                    editingSlotPos
                  )}`}
                >
                  슬롯: {editingSlotId} ({editingSlotPos})
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {currentlyPlacedInEditingSlot
                    ? `${currentlyPlacedInEditingSlot.name} 선수 교체 / 변경`
                    : `${editingSlotPos} 포지션 선수 검색 및 추가`}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {currentlyPlacedInEditingSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      unassignSlot(editingSlotId, true);
                      setEditingSlotId(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs text-rose-600 dark:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    현재 배치({currentlyPlacedInEditingSlot.name}) 제거
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateConfirm(null);
                    setEditingSlotId(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 공통 상세 필터 컴포넌트 (PlayerSearchFilter) 연동 */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] max-h-[52vh] overflow-y-auto space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setDuplicateConfirm(null);
                  executeModalSearch(modalQuery, modalFilterState, true);
                }}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2"
              >
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modalQuery}
                    onChange={(e) => setModalQuery(e.target.value)}
                    placeholder={`[${editingSlotPos}] 배치할 선수 이름 검색 (예: 벨링엄, 손흥민, 호나우두, 굴리트...)`}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pickerLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  선수 검색
                </button>
                <PlayerSearchFilterToggleButton
                  isOpen={isModalFilterOpen}
                  onToggle={() => setIsModalFilterOpen((prev) => !prev)}
                  filter={modalFilterState}
                />
              </form>

              <PlayerSearchFilter
                isOpen={isModalFilterOpen}
                filter={modalFilterState}
                onChange={(nextState) => {
                  setModalFilterState(nextState);
                }}
                onApply={(nextState) => {
                  const targetFilter = nextState || modalFilterState;
                  setModalFilterState(targetFilter);
                  setDuplicateConfirm(null);
                  executeModalSearch(modalQuery, targetFilter, true);
                }}
                onReset={() => {
                  const resetState: PlayerFilterState = {
                    ...DEFAULT_PLAYER_FILTER_STATE,
                    position: editingSlotPos,
                    grade: 8,
                    adaptBonus: 0,
                  };
                  setModalFilterState(resetState);
                  setDuplicateConfirm(null);
                  executeModalSearch(modalQuery, resetState, false);
                }}
                maxEnhanceLevel={rules.maxEnhanceLevel || 13}
              />

              {/* 빠른 포지션 전환 & 정렬 바 */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...modalFilterState,
                        position: editingSlotPos,
                      };
                      setModalFilterState(next);
                      executeModalSearch(modalQuery, next, false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      modalFilterState.position === editingSlotPos
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {editingSlotPos} 포지션만
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...modalFilterState,
                        position: "ALL",
                      };
                      setModalFilterState(next);
                      executeModalSearch(modalQuery, next, false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      modalFilterState.position === "ALL"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    전체 포지션 (ALL)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-slate-500">배치 강화:</span>
                    <select
                      value={pickerGrade}
                      onChange={(e) =>
                        setModalFilterState((prev) => ({
                          ...prev,
                          grade: Number(e.target.value),
                        }))
                      }
                      className="bg-transparent text-xs font-mono font-bold text-amber-500 outline-none cursor-pointer"
                    >
                      {dynamicEnhanceLevels.map((g) => (
                        <option
                          key={g}
                          value={g}
                          className="bg-[#0B0F17] text-slate-100"
                        >
                          +{g}강 (+
                          {getEnhanceOvrBoost(g, rules.enhanceOvrBoosts)} OVR)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                    <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                    <select
                      value={pickerSort}
                      onChange={(e) => setPickerSort(e.target.value)}
                      className="bg-transparent text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300 outline-none cursor-pointer"
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
                    </select>
                  </div>
                </div>
              </div>

              {duplicateConfirm && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-700 dark:text-amber-300">
                        중복 선수 배치 확인 ({duplicateConfirm.card.name})
                      </div>
                      <p className="mt-0.5 text-slate-700 dark:text-amber-200/90">
                        이미 [{duplicateConfirm.conflictSlotId} (
                        {duplicateConfirm.conflictPosition})] 슬롯에 등록되어 있습니다. 두 슬롯의 위치를 맞교환하시겠습니까?
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      위치 맞교환
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateConfirm(null)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 검색 결과 리스트 */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80 bg-slate-50 dark:bg-[#0B0F17]">
              {pickerLoading ? (
                <div className="p-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    FC 온라인 데이터센터에서 선수 목록을 불러오고 있습니다...
                  </div>
                </div>
              ) : pickerError ? (
                <div className="p-10 text-center space-y-3">
                  <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
                  <div className="text-xs font-bold text-rose-500">
                    {pickerError}
                  </div>
                </div>
              ) : sortedPickerCards.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    조건에 해당하는 선수가 없습니다.
                  </div>
                  <p className="text-xs text-slate-500">
                    선수 이름을 입력하거나 상세 필터에서 시즌·팀컬러를 선택한 뒤 [선수 검색] 버튼을 눌러보세요.
                  </p>
                </div>
              ) : (
                sortedPickerCards.map((c) => {
                  const isAlreadyPlaced = slots.some((s) => s.spid === c.spid);
                  const isSamePersonInOtherSlot =
                    !isAlreadyPlaced &&
                    Boolean(findDuplicateSlot(editingSlotId, c.spid, c.pid));
                  const boost = getEnhanceOvrBoost(
                    pickerGrade,
                    rules.enhanceOvrBoosts
                  );
                  const displayOvr = c.ovr + boost;
                  const gradePriceObj = c.prices?.[String(pickerGrade)];
                  const displayBp =
                    gradePriceObj && gradePriceObj.bp > 0
                      ? gradePriceObj.bp
                      : pickerGrade === 8 && c.bp_8
                      ? c.bp_8
                      : c.bp_1 || 0;
                  const badgeStyle = getEnhanceBadgeStyle(pickerGrade);

                  return (
                    <div
                      key={c.spid}
                      onClick={() => handleSelectCardInPicker(c, pickerGrade)}
                      className="p-3 hover:bg-slate-100 dark:hover:bg-[#141D2E] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          src={c.thumb_url}
                          spid={c.spid}
                          name={c.name}
                          className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 p-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs font-mono font-bold ${getPositionToneClass(
                                c.primary_position
                              )}`}
                            >
                              {c.primary_position}
                            </span>
                            <SeasonBadge
                              seasonImg={c.season_img}
                              seasonCode={c.season_code}
                            />
                            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {c.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeStyle.className}`}
                            >
                              +{pickerGrade}강
                            </span>
                            {isAlreadyPlaced && (
                              <span className="text-[10px] font-bold text-emerald-500">
                                · 현재 배치중
                              </span>
                            )}
                            {isSamePersonInOtherSlot && (
                              <span className="text-[10px] font-bold text-amber-500">
                                · 타 슬롯 배치중(맞교환 가능)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex-wrap">
                            <span>
                              OVR{" "}
                              <strong className="text-slate-900 dark:text-white">
                                {displayOvr}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              급여{" "}
                              <strong className="text-sky-600 dark:text-sky-400">
                                {c.salary}
                              </strong>
                            </span>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {displayBp > 0
                                ? `${formatBpKorean(displayBp)} BP`
                                : "시세 조회 가능"}
                            </span>
                            {c.foot && (
                              <>
                                <span>·</span>
                                <span>양발/약발 {c.foot}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCardInPicker(c, pickerGrade);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          +{pickerGrade}강 배치
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
