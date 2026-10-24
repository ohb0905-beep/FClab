export type LabTab =
  | "home"
  | "player"
  | "squad"
  | "efficiency"
  | "profile"
  | "match"
  | "saved"
  | "architecture";

export interface SystemRules {
  salaryCap: number;
  maxEnhanceLevel: number;
  enhanceOvrBoosts: number[];
  lastSyncedAt: string;
  syncSource: "crawler" | "match_heuristics" | "initial";
}

export const DEFAULT_ENHANCE_OVR_BOOSTS: number[] = [
  0, 3, 4, 5, 7, 9, 11, 15, 19, 23, 27, 31, 35,
];

export const DEFAULT_SYSTEM_RULES: SystemRules = {
  salaryCap: 310,
  maxEnhanceLevel: 13,
  enhanceOvrBoosts: [...DEFAULT_ENHANCE_OVR_BOOSTS],
  lastSyncedAt: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
  syncSource: "initial",
};

export function expandEnhanceOvrBoosts(
  maxLevel: number,
  baseBoosts: number[] = DEFAULT_ENHANCE_OVR_BOOSTS
): number[] {
  const targetLen = Math.max(1, Math.min(20, maxLevel));
  const result = [...baseBoosts];
  while (result.length < targetLen) {
    const lastBoost = result[result.length - 1] ?? 35;
    result.push(lastBoost + 4);
  }
  return result.slice(0, Math.max(result.length, targetLen));
}

export function getEnhanceOvrBoost(
  grade: number,
  boosts: number[] = DEFAULT_ENHANCE_OVR_BOOSTS
): number {
  const safeGrade = Math.max(1, Math.floor(grade || 1));
  const idx = safeGrade - 1;
  if (idx < boosts.length) {
    return boosts[idx] ?? 0;
  }
  const lastKnown = boosts[boosts.length - 1] ?? 35;
  const extraLevels = idx - (boosts.length - 1);
  return lastKnown + extraLevels * 4;
}

export function getEnhanceBadgeStyle(grade: number): {
  label: string;
  tierName: string;
  className: string;
} {
  if (grade >= 11) {
    return {
      label: `+${grade}강`,
      tierName: "초월 고강",
      className:
        "bg-gradient-to-r from-fuchsia-500/25 via-cyan-400/25 to-emerald-400/25 text-cyan-200 border-cyan-400/60 font-bold shadow-sm",
    };
  }
  if (grade >= 8) {
    return {
      label: `+${grade}강`,
      tierName: "금카",
      className:
        "bg-amber-500/25 text-amber-300 border-amber-400/60 font-bold",
    };
  }
  if (grade >= 5) {
    return {
      label: `+${grade}강`,
      tierName: "은카",
      className:
        "bg-slate-300/20 text-slate-100 border-slate-300/50 font-semibold",
    };
  }
  if (grade >= 2) {
    return {
      label: `+${grade}강`,
      tierName: "동카",
      className:
        "bg-orange-700/25 text-orange-300 border-orange-600/50 font-medium",
    };
  }
  return {
    label: "+1강",
    tierName: "기본",
    className: "bg-slate-800/90 text-slate-400 border-slate-700",
  };
}

export interface PositionOvrItem {
  pos: string;
  ovr: number;
}

export interface TraitItem {
  icon: string;
  name: string;
}

export interface TeamColorItem {
  id: string;
  type: string;
  name: string;
}

export interface PriceGradeInfo {
  bp: number;
  text: string;
}

export interface PlayerCard {
  spid: number;
  pid: number;
  name: string;
  season_id: number;
  season_code: string;
  season_name: string;
  season_img: string;
  thumb_url: string;
  primary_position: string;
  positions: PositionOvrItem[];
  ovr: number;
  salary: number;
  foot: string;
  skill_moves: string;
  height: number;
  weight: number;
  body_type: string;
  birth: string;
  team: string;
  nation: string;
  traits: TraitItem[];
  team_colors: TeamColorItem[];
  position_ovrs: Record<string, number>;
  stats: Record<string, number>;
  prices: Record<string, PriceGradeInfo>;
  bp_1: number;
  bp_5: number;
  bp_8: number;
  rating_score: number;
  rating_count: number;
  has_full_ability: boolean;
  crawled_at: string;
}

export interface StatBreakdownItem {
  stat: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface GradeCurvePoint {
  grade: number;
  ovr: number;
  core_score: number;
  bp: number;
  bp_text: string;
  efficiency_index: number;
}

export interface CardEfficiencyResult {
  spid: number;
  name: string;
  season_code: string;
  season_name: string;
  season_img: string;
  thumb_url: string;
  target_position: string;
  primary_position: string;
  grade: number;
  team_color_bonus: number;
  base_ovr: number;
  effective_ovr: number;
  salary: number;
  foot: string;
  bp: number;
  bp_text: string;
  core_score: number;
  ovr_to_core_gap: number;
  efficiency_index: number;
  score_per_log_bp: number;
  tier: string;
  six_face: Record<string, number>;
  stat_breakdown: StatBreakdownItem[];
  grade_curve: GradeCurvePoint[];
  best_sweetspot_grade: GradeCurvePoint | null;
  traits: TraitItem[];
  crawled_at: string;
}

export interface ArchetypeFitItem {
  id: string;
  group: string;
  position_group?: string;
  applicable_positions?: string[];
  name: string;
  desc: string;
  raw_score: number;
  fit_percent: number;
  role_score: number;
  specialization_score: number;
  is_complete_type?: boolean;
  judgment_reason?: string;
  modifier_notes?: string[];
  key_stats: { stat: string; value: number; weight: number }[];
}

export interface CompleteEvaluationCriterion {
  id: string;
  label: string;
  passed: boolean;
  score_text: string;
  detail: string;
}

export interface CompleteEvaluationResult {
  is_complete: boolean;
  overall_complete_score: number;
  summary_reason: string;
  passed_count: number;
  total_criteria: number;
  pillars: { name: string; score: number; threshold: number; passed: boolean }[];
  criteria: CompleteEvaluationCriterion[];
}

export interface ProfilePhysicalFootAnalysis {
  data_available: boolean;
  height_cm: number;
  weight_kg: number;
  body_type: string;
  foot_raw: string;
  weak_foot: number;
  strong_foot: number;
  is_two_footed: boolean;
  applied_factors: string[];
  excluded_factors: string[];
}

export interface PlayerProfileResult {
  spid: number;
  name: string;
  season_code: string;
  primary_position: string;
  analyzed_position: string;
  position_group_label: string;
  available_positions: string[];
  grade: number;
  team_color_bonus: number;
  effective_ovr: number;
  height: number;
  weight: number;
  body_type: string;
  foot: string;
  skill_moves: string;
  traits: TraitItem[];
  primary_archetype: ArchetypeFitItem | null;
  secondary_archetype: ArchetypeFitItem | null;
  secondary_Null_reason?: string;
  position_archetypes: ArchetypeFitItem[];
  all_archetypes: ArchetypeFitItem[];
  complete_evaluation: CompleteEvaluationResult;
  physical_foot_analysis: ProfilePhysicalFootAnalysis;
  judgment_summary: string;
  role_nuance_note: string;
  strengths: { stat: string; value: number }[];
  weaknesses: { stat: string; value: number }[];
  six_face: Record<string, number>;
  methodology_note: string;
  analyzed_at: string;
}

export interface PriceHistoryData {
  spid: number;
  grade: number;
  current_bp: number;
  current_text: string;
  max_30d_bp: number;
  min_30d_bp: number;
  points: { date: string; bp: number; formatted: string }[];
  crawled_at: string;
}

export interface SquadSlot {
  slot_id: string;
  slot_position: string;
  spid: number;
  grade: number;
  x?: number;
  y?: number;
}

export interface SavedSquad {
  id: string;
  name: string;
  formation: string;
  budget_bp: number;
  salary_cap: number;
  team_color_name: string;
  team_color_bonus: number;
  slots: SquadSlot[];
  created_at: string;
  updated_at: string;
}

export interface SquadReplacementRecommendation {
  target_slot: string;
  slot_position: string;
  replace_out: string;
  spid: number;
  name: string;
  season_code: string;
  season_img: string;
  thumb_url: string;
  grade: number;
  salary: number;
  salary_diff: number;
  ovr: number;
  core_score: number;
  core_gain: number;
  bp: number;
  bp_text: string;
  efficiency_index: number;
}

export interface SquadAnalysisResult {
  formation: string;
  player_count: number;
  total_salary: number;
  salary_cap: number;
  salary_valid: boolean;
  total_bp: number;
  total_bp_text: string;
  budget_bp: number;
  remaining_bp: number;
  remaining_bp_text: string;
  sector_scores: {
    attack: number;
    midfield: number;
    defense: number;
    overall: number;
  };
  team_radar: Record<string, number>;
  detected_synergies: { name: string; count: number; bonus: string }[];
  weaknesses: {
    slot_position: string;
    current_player: string;
    core_score: number;
    reason: string;
  }[];
  role_warnings: string[];
  recommendations: SquadReplacementRecommendation[];
  placed_evaluations: {
    slot_id: string;
    slot_position: string;
    spid: number;
    pid: number;
    name: string;
    season_code: string;
    thumb_url: string;
    grade: number;
    salary: number;
    ovr: number;
    core_score: number;
    efficiency_index: number;
    bp: number;
    bp_text: string;
    primary_archetype: string;
  }[];
  systemRules?: SystemRules;
  analyzed_at: string;
}

export interface MatchAnalysisResponse {
  user: {
    ouid: string;
    nickname: string;
    level: number;
    maxDivisions: {
      matchType: number;
      matchTypeName: string;
      division: number;
      divisionName: string;
      achievementDate: string;
    }[];
    fetchedAt: string;
  };
  analysis: {
    ouid: string;
    nickname: string;
    metrics: {
      totalMatches: number;
      wins: number;
      draws: number;
      losses: number;
      winRate: number;
      avgGoalsFor: number;
      avgGoalsAgainst: number;
      goalDiff: number;
      avgPossession: number;
      shotAccuracy: number;
      outBoxShotRatio: number;
      passAccuracy: number;
      throughPassAccuracy: number;
      tackleAccuracy: number;
      recentSequence: string[];
    };
    matches: {
      matchId: string;
      matchDate: string;
      result: string;
      opponent: string;
      score: string;
      goalsFor: number;
      goalsAgainst: number;
      possession: number;
      shots: number;
      effectiveShots: number;
      passRate: number;
      controller: string;
      starterTotalSalary?: number;
    }[];
    topPlayers: {
      spid: number;
      name: string;
      season_code: string;
      thumb_url: string;
      grade: number;
      position: string;
      salary?: number;
      appearances: number;
      goals: number;
      assists: number;
      avgRating: number;
    }[];
    latestStartingXI: {
      spid: number;
      name: string;
      season_code: string;
      position: string;
      grade: number;
      salary?: number;
      rating: number;
    }[];
    diagnostics: {
      category: string;
      severity: "high" | "medium" | "positive";
      observed_fact: string;
      possible_cause: string;
      recommended_action: string;
    }[];
    heuristicsUpdate?: {
      updated: boolean;
      detectedMaxGrade: number;
      detectedMaxStarterSalary: number;
      appliedSalaryCap: number;
      appliedMaxEnhanceLevel: number;
    };
    methodologyNote: string;
    analyzedAt: string;
  };
  systemRules?: SystemRules;
}

// Legacy compatibility map derived from DEFAULT_ENHANCE_OVR_BOOSTS
export const ENHANCEMENT_BONUS_MAP: Record<number, number> =
  DEFAULT_ENHANCE_OVR_BOOSTS.reduce((acc, boost, index) => {
    acc[index + 1] = boost;
    return acc;
  }, {} as Record<number, number>);

export function formatBpKorean(bp: number): string {
  if (!bp || bp <= 0) return "-";
  const eok = Math.floor(bp / 100_000_000);
  const man = Math.floor((bp % 100_000_000) / 10_000);
  const rest = bp % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`);
  if (man > 0) parts.push(`${man.toLocaleString()}만`);
  if (parts.length === 0 && rest > 0) parts.push(`${rest.toLocaleString()}`);
  return parts.join(" ");
}

export function getStatColorClass(val: number): string {
  if (val >= 140) return "text-fuchsia-300 font-bold";
  if (val >= 130) return "text-amber-300 font-semibold";
  if (val >= 120) return "text-rose-400 font-semibold";
  if (val >= 110) return "text-emerald-400 font-semibold";
  if (val >= 100) return "text-sky-400 font-medium";
  if (val >= 90) return "text-slate-200";
  return "text-slate-500";
}

export function getPositionToneClass(pos: string): string {
  const p = pos.toUpperCase();
  if (["ST", "CF", "LW", "RW", "LF", "RF"].includes(p)) {
    return "text-rose-400";
  }
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(p)) {
    return "text-emerald-400";
  }
  if (["CB", "LB", "RB", "LWB", "RWB", "SW"].includes(p)) {
    return "text-sky-400";
  }
  return "text-amber-400";
}
