export type LabTab =
  | "home"
  | "player"
  | "squad"
  | "efficiency"
  | "profile"
  | "market"
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

// ============================================================================
// Market Analysis, Price Prediction, Backtesting & Trait Meta Types
// ============================================================================

export type MarketDataBasis = "observed" | "statistical_estimate" | "model_forecast";

export type SeasonSectorType =
  | "LIMITED_DISCONTINUED"
  | "NEW_META_FLAGSHIP"
  | "EXISTING_FLAGSHIP"
  | "THEME_TEAMCOLOR"
  | "LIVE_DYNAMIC";

export type CapitalTierType =
  | "ULTRA_HIGH"
  | "HIGH_CAPITAL_FLAGSHIP"
  | "MID_TIER"
  | "LOW_BUDGET_PRACTICAL"
  | "ENHANCEMENT_FODDER";

export interface MarketUnitConversionRecord {
  key: string;
  spid: number;
  player_name: string;
  season_code: string;
  grade: number;
  raw_latest_value: number;
  verified_card_bp: number;
  applied_scale_factor: number;
  conversion_reason: string;
  quality_status: "verified_direct" | "unit_rescaled" | "stale_or_sparse";
  confidence: number;
}

export interface MarketNormalizedPoint {
  date: string;
  raw_bp: number;
  normalized_bp: number;
  formatted_bp: string;
  return_1d_pct: number;
}

export interface MarketNormalizedSeries {
  key: string;
  spid: number;
  pid: number;
  name: string;
  season_code: string;
  season_name: string;
  season_img: string;
  thumb_url: string;
  primary_position: string;
  ovr: number;
  salary: number;
  grade: number;
  season_sector: SeasonSectorType;
  season_sector_label: string;
  capital_tier: CapitalTierType;
  capital_tier_label: string;
  current_bp: number;
  current_bp_text: string;
  return_1d_pct: number;
  return_7d_pct: number;
  return_14d_pct: number;
  return_30d_pct: number;
  volatility_30d_pct: number;
  max_drawdown_30d_pct: number;
  z_score_30d: number;
  relative_strength_7d: number;
  unit_scale_factor: number;
  quality_status: "verified_direct" | "unit_rescaled" | "stale_or_sparse";
  confidence: number;
  observed_at: string;
  collected_at: string;
  source: string;
  raw_data_reference: string;
  traits: string[];
  points: MarketNormalizedPoint[];
}

export interface MarketSectorSummary {
  sector_id: string;
  axis: "season" | "capital_tier" | "grade" | "season_code";
  code: string;
  name: string;
  description: string;
  sample_card_count: number;
  timeseries_sample_count: number;
  coverage_ratio: number;
  confidence_level: "high" | "medium" | "low";
  avg_bp: number;
  avg_bp_text: string;
  median_bp: number;
  median_bp_text: string;
  return_1d_pct: number;
  return_7d_pct: number;
  return_14d_pct: number;
  return_30d_pct: number;
  advance_ratio: number;
  decline_ratio: number;
  flat_ratio: number;
  volatility_pct: number;
  surge_ratio: number;
  plunge_ratio: number;
  relative_strength_vs_market: number;
  supply_event_exposure: "낮음 (공급 제한)" | "보통" | "높음 (패키지·이벤트 노출)";
  replacement_risk: "낮음" | "보통" | "높음 (상위 시즌 대체 위험)";
  fear_greed_score: number;
  fear_greed_band: string;
  top_movers: {
    spid: number;
    name: string;
    season_code: string;
    grade: number;
    current_bp: number;
    current_bp_text: string;
    return_7d_pct: number;
  }[];
  index_curve_30d: { date: string; index_value: number }[];
}

export interface MarketFearGreedComponent {
  id: string;
  name: string;
  weight: number;
  raw_value_text: string;
  normalized_score: number;
  signal: "공포" | "중립" | "과열";
  description: string;
  basis: MarketDataBasis;
}

export interface MarketFearGreedIndex {
  overall_score: number;
  band: "극단적 공포" | "공포" | "중립" | "과열" | "극단적 과열";
  band_range_label: string;
  summary_comment: string;
  calculated_at: string;
  sample_series_count: number;
  total_catalog_count: number;
  data_coverage_pct: number;
  unobservable_Exclusion_note: string;
  components: MarketFearGreedComponent[];
  history_30d: {
    date: string;
    score: number;
    band: string;
    market_index: number;
  }[];
  by_season_sector: {
    sector_id: string;
    name: string;
    score: number;
    band: string;
    return_7d_pct: number;
    sample_count: number;
  }[];
  by_capital_tier: {
    sector_id: string;
    name: string;
    score: number;
    band: string;
    return_7d_pct: number;
    sample_count: number;
  }[];
}

export interface MarketEventRecord {
  id: string;
  title: string;
  event_type:
    | "BP_SUPPLY"
    | "PACK_RELEASE"
    | "FEE_DISCOUNT_COUPON"
    | "NEW_SEASON_DROP"
    | "ENHANCEMENT_EVENT"
    | "TRAIT_ENGINE_PATCH";
  event_type_label: string;
  start_date: string; // e.g., "10.01"
  end_date: string; // e.g., "10.14"
  target_seasons: string[];
  target_capital_tiers: CapitalTierType[];
  target_grades: number[];
  bp_injection_scale: "소규모" | "중규모" | "대규모" | "해당없음";
  pack_supply_scale: "소규모" | "중규모" | "대규모" | "해당없음";
  fee_coupon_discount_pct: number;
  source: string;
  verified: boolean;
  description: string;
}

export interface MarketEventImpactReport {
  event: MarketEventRecord;
  affected_sector_name: string;
  control_sector_name: string;
  affected_sample_count: number;
  control_sample_count: number;
  pre_event_return_pct: number;
  during_event_return_pct: number;
  post_event_return_pct: number;
  control_during_return_pct: number;
  did_net_effect_pct: number; // Difference-in-Differences (Affected vs Control)
  volatility_change_pct: number;
  duration_days_estimated: number;
  mechanism_diagnosis: string;
  supply_scenarios: {
    scenario: "보수적 (Conservative)" | "기준 (Base)" | "공격적 (Aggressive)";
    estimated_pack_influx_index: number;
    estimated_bp_inflation_effect_pct: number;
    estimated_supply_dilution_effect_pct: number;
    net_expected_price_impact_pct: number;
  }[];
  fee_coupon_simulation?: {
    base_tax_rate_pct: number;
    top_pc_discount_pct: number;
    coupon_discount_pct: number;
    effective_fee_rate_pct: number;
    breakeven_rebuy_drop_pct: number;
    sell_pressure_assessment: string;
  };
}

export interface MarketHorizonForecast {
  horizon_days: 1 | 7 | 30;
  horizon_label: string;
  status: "available" | "low_confidence" | "insufficient_data";
  direction: "상승" | "보합" | "하락";
  up_probability_pct: number;
  flat_probability_pct: number;
  down_probability_pct: number;
  expected_return_pct: number;
  expected_bp: number;
  expected_bp_text: string;
  lower_bound_bp: number;
  lower_bound_bp_text: string;
  upper_bound_bp: number;
  upper_bound_bp_text: string;
  volatility_regime: "안정" | "보통" | "고변동 주의";
  confidence_score: number;
  model_predictions: {
    model_id: "M1_NAIVE" | "M2_STATISTICAL" | "M3_SECTOR" | "M4_EVENT_TRAIT";
    model_name: string;
    predicted_bp: number;
    predicted_return_pct: number;
    weight: number;
  }[];
}

export interface MarketEntityForecast {
  entity_type: "player" | "sector";
  entity_id: string;
  spid?: number;
  grade?: number;
  name: string;
  season_code: string;
  primary_position?: string;
  current_bp: number;
  current_bp_text: string;
  season_sector_label: string;
  capital_tier_label: string;
  horizons: MarketHorizonForecast[];
  upward_factors: string[];
  downward_factors: string[];
  risk_factors: string[];
  basis: MarketDataBasis;
}

export interface MarketModelBacktestMetric {
  model_id: "M1_NAIVE" | "M2_STATISTICAL" | "M3_SECTOR" | "M4_EVENT_TRAIT";
  model_name: string;
  description: string;
  horizon_days: 1 | 7;
  evaluated_cases: number;
  mae_bp: number;
  mape_pct: number;
  rmse_pct: number;
  directional_accuracy_pct: number;
  interval_coverage_pct: number;
  beats_baseline_mape: boolean;
  improvement_vs_baseline_pct: number;
}

export interface MarketBacktestReport {
  methodology_summary: string;
  leakage_prevention_note: string;
  total_series_evaluated: number;
  total_rolling_windows: number;
  models_1d: MarketModelBacktestMetric[];
  models_7d: MarketModelBacktestMetric[];
  by_season_sector_7d: {
    sector_name: string;
    sample_count: number;
    m1_mape_pct: number;
    m2_mape_pct: number;
    m3_mape_pct: number;
    m4_mape_pct: number;
    best_model_name: string;
    directional_accuracy_pct: number;
  }[];
  by_capital_tier_7d: {
    tier_name: string;
    sample_count: number;
    m1_mape_pct: number;
    m4_mape_pct: number;
    directional_accuracy_pct: number;
  }[];
  event_vs_normal_period: {
    period_type: "이벤트·변동성 구간" | "일반 평시 구간";
    window_count: number;
    m1_mape_pct: number;
    m4_mape_pct: number;
    m4_directional_accuracy_pct: number;
  }[];
  sample_traces: {
    spid: number;
    name: string;
    season_code: string;
    grade: number;
    points: {
      date: string;
      actual_bp: number;
      m1_pred_bp: number;
      m2_pred_bp: number;
      m3_pred_bp: number;
      m4_pred_bp: number;
      lower_band_bp: number;
      upper_band_bp: number;
    }[];
  }[];
}

export interface TraitMetaCatalogItem {
  trait_name: string;
  category: "슈팅·득점" | "침투·오프더볼" | "드리블·탈압박" | "패스·찬스메이킹" | "피지컬·수비·특수";
  is_new_or_reworked_meta: boolean;
  release_or_patch_note: string;
  applicable_positions: string[];
  activation_condition: string;
  in_game_effect: string;
  synergy_stats: string[];
  competing_traits: string[];
  card_holder_count: number;
  timeseries_holder_count: number;
  base_performance_score: number;
  current_meta_fit_score: number;
  relative_competitiveness_score: number;
  patch_impact_score: number;
  overall_meta_score: number;
  meta_tier: "OP (핵심 메타)" | "1티어 (주류 선호)" | "2티어 (상황별 유효)" | "3티어 (보조·비주류)";
  position_suitability: Record<string, number>;
}

export interface TraitControlledPremiumItem {
  trait_name: string;
  category: string;
  meta_tier: string;
  holder_sample_count: number;
  matched_pair_count: number;
  unadjusted_avg_bp_with: number;
  unadjusted_avg_bp_without: number;
  unadjusted_diff_pct: number;
  controlled_premium_median_pct: number;
  controlled_premium_iqr_low_pct: number;
  controlled_premium_iqr_high_pct: number;
  return_7d_with_trait_pct: number;
  return_7d_without_trait_pct: number;
  excess_return_7d_pct: number;
  confounder_control_summary: string;
  confidence_level: "높음" | "보통" | "표본 부족 주의";
  interpretation: string;
  matched_examples: {
    with_card: {
      spid: number;
      name: string;
      season_code: string;
      position: string;
      ovr: number;
      bp_1: number;
      bp_1_text: string;
      traits: string[];
    };
    without_card: {
      spid: number;
      name: string;
      season_code: string;
      position: string;
      ovr: number;
      bp_1: number;
      bp_1_text: string;
      traits: string[];
    };
    ovr_gap: number;
    premium_pct: number;
  }[];
}

export interface TraitCompetingSubstitutionCase {
  case_id: string;
  title: string;
  hypothesis: string;
  rising_traits: string[];
  incumbent_trait: string;
  target_positions: string[];
  rising_group_sample_count: number;
  incumbent_group_sample_count: number;
  dual_holder_sample_count: number;
  rising_avg_return_7d_pct: number;
  rising_avg_return_30d_pct: number;
  incumbent_avg_return_7d_pct: number;
  incumbent_avg_return_30d_pct: number;
  market_benchmark_return_7d_pct: number;
  controlled_rising_premium_pct: number;
  controlled_incumbent_premium_pct: number;
  relative_spread_shift_pct: number;
  empirical_verdict: "가설 지지 (대체·상대 강세 확인)" | "부분 지지 (보완재·공존 우세)" | "표본 제한적 (추적 관찰 필요)";
  verdict_explanation: string;
  comparative_curve_30d: {
    date: string;
    rising_index: number;
    incumbent_index: number;
    market_index: number;
  }[];
  representative_cards: {
    group: "신규·부상 특성군" | "기존 경쟁 특성군" | "복합 보유군";
    spid: number;
    name: string;
    season_code: string;
    position: string;
    ovr: number;
    current_bp: number;
    current_bp_text: string;
    return_7d_pct: number;
    return_30d_pct: number;
    key_traits: string[];
  }[];
}

export interface TraitSeasonDiscountItem {
  season_code: string;
  season_name: string;
  season_sector_label: string;
  evaluated_card_count: number;
  avg_trait_count: number;
  core_meta_trait_coverage_pct: number;
  missing_key_traits: string[];
  avg_ovr: number;
  avg_bp_1: number;
  avg_bp_1_text: string;
  expected_bp_for_ovr_and_stats: number;
  trait_deficit_discount_pct: number;
  return_7d_pct: number;
  compensating_factors: string[];
  diagnosis: string;
}

export interface TraitPatchHistoryItem {
  id: string;
  patch_date: string;
  title: string;
  target_traits: string[];
  change_type: "신규 추가" | "발동 조건 완화·상향" | "성능 하향·조정" | "체감 메타 변화";
  summary: string;
  observed_market_reaction: string;
  verified_source: string;
}

export interface MarketCollectionStatus {
  environment_mode: string;
  total_catalog_cards: number;
  cards_with_full_ability: number;
  cards_with_multi_grade_prices: number;
  timeseries_stored_count: number;
  valid_30d_series_count: number;
  unit_rescaled_series_count: number;
  direct_verified_series_count: number;
  last_crawled_at: string;
  rate_limit_policy: string;
  deduplication_policy: string;
  unobservable_metrics_disclosure: string[];
  unit_conversion_samples: MarketUnitConversionRecord[];
}

export interface MarketLabDashboardPayload {
  generated_at: string;
  market_index_current: number;
  market_return_1d_pct: number;
  market_return_7d_pct: number;
  market_return_30d_pct: number;
  market_volatility_30d_pct: number;
  fear_greed: MarketFearGreedIndex;
  season_sectors: MarketSectorSummary[];
  capital_tier_sectors: MarketSectorSummary[];
  grade_sectors: MarketSectorSummary[];
  events: MarketEventRecord[];
  event_impacts: MarketEventImpactReport[];
  player_forecasts: MarketEntityForecast[];
  sector_forecasts: MarketEntityForecast[];
  backtest_report: MarketBacktestReport;
  trait_catalog: TraitMetaCatalogItem[];
  trait_premiums: TraitControlledPremiumItem[];
  trait_substitutions: TraitCompetingSubstitutionCase[];
  trait_season_discounts: TraitSeasonDiscountItem[];
  trait_patches: TraitPatchHistoryItem[];
  collection_status: MarketCollectionStatus;
  normalized_series_preview: MarketNormalizedSeries[];
}

