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
        "bg-gradient-to-r from-fuchsia-500/20 via-cyan-500/20 to-emerald-500/20 text-cyan-700 dark:text-cyan-200 border-cyan-500/50 font-bold shadow-sm",
    };
  }
  if (grade >= 8) {
    return {
      label: `+${grade}강`,
      tierName: "금카",
      className:
        "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 font-bold",
    };
  }
  if (grade >= 5) {
    return {
      label: `+${grade}강`,
      tierName: "은카",
      className:
        "bg-slate-400/20 text-slate-700 dark:text-slate-100 border-slate-400/50 font-semibold",
    };
  }
  if (grade >= 2) {
    return {
      label: `+${grade}강`,
      tierName: "동카",
      className:
        "bg-orange-700/20 text-orange-700 dark:text-orange-300 border-orange-600/50 font-medium",
    };
  }
  return {
    label: "+1강",
    tierName: "기본",
    className: "bg-slate-200 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700",
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
  feelMetrics?: PlayerFeelMetrics;
  rankerPickRate?: number;
  metaTier?: string;
  oneLineSummary?: string;
  recommendedGrade?: number;
  sharedTeamColor?: string;
  sharedTeamColors?: string[];
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
  core_stat_count?: number;
  ovr_to_core_gap: number;
  efficiency_index: number;
  score_per_log_bp: number;
  tier: string;
  six_face: Record<string, number>;
  stat_breakdown: StatBreakdownItem[];
  grade_curve: GradeCurvePoint[];
  best_sweetspot_grade: GradeCurvePoint | null;
  traits: TraitItem[];
  feelMetrics?: PlayerFeelMetrics;
  priceBracketId?: string;
  priceBracketLabel?: string;
  userPickRate?: number;
  oneLineSummary?: string;
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
  feelMetrics?: PlayerFeelMetrics;
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
  avg_ovr?: number;
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
    season_img?: string;
    thumb_url: string;
    grade: number;
    salary: number;
    ovr: number;
    core_score: number;
    efficiency_index: number;
    bp: number;
    bp_text: string;
    primary_archetype: string;
    feelScore?: number;
    positionSalaryEfficiency?: number;
    statTrapBadge?: StatTrapBadgeType;
    foot?: string;
    traits?: TraitItem[];
    new_traits?: string[];
    team_colors?: TeamColorItem[];
  }[];
  purchaseAudit?: SquadPurchaseAudit;
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

export type MarketDataBasis =
  | "observed"
  | "official_public"
  | "statistical_estimate"
  | "model_forecast"
  | "on_hold_insufficient_data";

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

export type DynamicFlagshipCategory =
  | "최상위 메타픽"
  | "팀컬러별 대장"
  | "가성비 대장"
  | "신규 시즌 수혜 후보"
  | "경쟁력 하락 후보"
  | "데이터 부족으로 판별 보류";

export type GradeTierZone =
  | "CORE_GOLD_8_11"
  | "SEPARATED_ULTRA_12_13"
  | "SUB_SILVER_1_7";

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
  grade_tier_zone?: GradeTierZone;
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
  new_traits?: string[];
  legacy_traits?: string[];
  team_colors?: string[];
  multi_sector_tags?: string[];
  timeseries_observation_count?: number;
  transaction_volume_provided?: boolean;
  points: MarketNormalizedPoint[];
}

export interface MarketSectorSummary {
  sector_id: string;
  axis:
    | "season"
    | "capital_tier"
    | "grade"
    | "season_code"
    | "position_role"
    | "team_color"
    | "new_trait"
    | "ranker_meta";
  code: string;
  name: string;
  description: string;
  sample_card_count: number;
  timeseries_sample_count: number;
  coverage_ratio: number;
  confidence_level: "high" | "medium" | "low" | "on_hold_insufficient_data";
  basis?: MarketDataBasis;
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

export interface OfficialEventChangeLog {
  detected_at: string;
  change_type: "신규 발견" | "내용 변경" | "보상·패키지 갱신" | "종료 전환";
  event_id: string;
  title: string;
  detail: string;
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
  published_at?: string;
  start_date: string;
  end_date: string;
  status?: "신규" | "진행중" | "내용변경" | "종료";
  target_seasons: string[];
  target_capital_tiers: CapitalTierType[];
  target_grades: number[];
  bp_injection_scale: "소규모" | "중규모" | "대규모" | "해당없음";
  pack_supply_scale: "소규모" | "중규모" | "대규모" | "해당없음";
  fee_coupon_discount_pct: number;
  official_url?: string;
  last_collected_at?: string;
  content_hash?: string;
  basis?: MarketDataBasis;
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
  did_net_effect_pct: number;
  volatility_change_pct: number;
  duration_days_estimated: number;
  mechanism_diagnosis: string;
  public_reward_vs_estimate_note?: string;
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
  grade_tier_zone?: GradeTierZone;
  name: string;
  season_code: string;
  primary_position?: string;
  current_bp: number;
  current_bp_text: string;
  season_sector_label: string;
  capital_tier_label: string;
  dynamic_flagship_category?: DynamicFlagshipCategory;
  new_traits?: string[];
  horizons: MarketHorizonForecast[];
  upward_factors: string[];
  downward_factors: string[];
  risk_factors: string[];
  basis: MarketDataBasis;
  signalMetrics?: MarketSignalMetrics;
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
  new_trait_contribution?: {
    without_new_trait_mape_7d_pct: number;
    with_new_trait_mape_7d_pct: number;
    net_mape_reduction_pct: number;
    directional_gain_pct: number;
    legacy_trait_excluded_note: string;
  };
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

export type NewTraitMetaGroup =
  | "공격/슈팅 특성"
  | "드리블/스피드/활동량 특성"
  | "패스/수비/GK 특성";

export interface TraitRepresentativePlayerItem {
  spid: number;
  name: string;
  season_code: string;
  season_img?: string;
  thumb_url?: string;
  position: string;
  ovr: number;
  grade: number;
  bp: number;
  bp_text: string;
  return_7d_pct: number;
  ranker_pick_pct: number;
}

export interface TraitMetaCatalogItem {
  trait_id?: number;
  trait_level?: 8 | 5;
  icon_url?: string;
  included_in_price_model?: boolean;
  exclusion_reason?: string;
  trait_name: string;
  meta_group?: NewTraitMetaGroup;
  category:
    | "슈팅·득점"
    | "침투·오프더볼"
    | "드리블·탈압박"
    | "패스·찬스메이킹"
    | "피지컬·수비·특수"
    | "골키퍼(GK) 특화";
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
  meta_tier:
    | "OP (핵심 메타)"
    | "1티어 (주류 선호)"
    | "2티어 (상황별 유효)"
    | "3티어 (보조·비주류)";
  position_suitability: Record<string, number>;
  /** 상위 랭커 실사용률 (%) */
  ranker_usage_pct?: number;
  /** 전체 유저 실사용률 (%) */
  user_usage_pct?: number;
  /** 교란변수 통제 후 평균 가격 프리미엄 (%) */
  controlled_premium_pct?: number;
  /** 비보유 대조군 대비 평균 가격 프리미엄 차액 (BP) */
  avg_premium_bp_diff?: number;
  /** 특성 보유 카드 평균 +8강 시세 (BP) */
  avg_holder_bp?: number;
  /** 최근 1일 시세 등락률 (%) */
  return_1d_pct?: number;
  /** 최근 7일 시세 등락률 (%) */
  return_7d_pct?: number;
  /** 최근 30일 시세 등락률 (%) */
  return_30d_pct?: number;
  /** 개별 특성 보유군 30일 시세 지수 추이 (기준일=100) */
  price_trend_30d?: { date: string; index_value: number }[];
  /** 해당 특성을 보유한 대표 대장 선수 목록 */
  representative_players?: TraitRepresentativePlayerItem[];
}

export interface TraitControlledPremiumItem {
  trait_id?: number;
  trait_level?: 8;
  trait_name: string;
  meta_group?: NewTraitMetaGroup;
  icon_url?: string;
  category: string;
  meta_tier: string;
  analyzed_grade_range?: string;
  holder_sample_count: number;
  matched_pair_count: number;
  unadjusted_avg_bp_with: number;
  unadjusted_avg_bp_without: number;
  unadjusted_diff_pct: number;
  controlled_premium_median_pct: number;
  controlled_premium_iqr_low_pct: number;
  controlled_premium_iqr_high_pct: number;
  avg_premium_bp_diff?: number;
  ranker_usage_pct?: number;
  user_usage_pct?: number;
  return_1d_with_trait_pct?: number;
  return_7d_with_trait_pct: number;
  return_7d_without_trait_pct: number;
  return_30d_with_trait_pct?: number;
  excess_return_7d_pct: number;
  confounder_control_summary: string;
  legacy_traits_excluded_from_model?: boolean;
  confidence_level: "높음" | "보통" | "표본 부족 주의" | "표본 부족으로 판별 보류";
  basis?: MarketDataBasis;
  interpretation: string;
  price_trend_30d?: { date: string; index_value: number }[];
  representative_players?: TraitRepresentativePlayerItem[];
  matched_examples: {
    with_card: {
      spid: number;
      name: string;
      season_code: string;
      position: string;
      ovr: number;
      grade?: number;
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
      grade?: number;
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
  empirical_verdict:
    | "가설 지지 (대체·상대 강세 확인)"
    | "부분 지지 (보완재·공존 우세)"
    | "표본 제한적 (추적 관찰 필요)";
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
  change_type:
    | "신규 추가"
    | "발동 조건 완화·상향"
    | "성능 하향·조정"
    | "체감 메타 변화";
  summary: string;
  observed_market_reaction: string;
  verified_source: string;
}

export interface DynamicFlagshipCandidate {
  spid: number;
  name: string;
  season_code: string;
  season_name: string;
  season_img: string;
  thumb_url: string;
  primary_position: string;
  ovr: number;
  salary: number;
  analyzed_grade: number;
  current_bp: number;
  current_bp_text: string;
  return_7d_pct: number;
  return_30d_pct: number;
  category: DynamicFlagshipCategory;
  basis: MarketDataBasis;
  confidence_score: number;
  ranker_usage_count: number;
  ranker_usage_pct: number;
  season_ranker_share_pct: number;
  team_colors: string[];
  top_team_color_ranker_pct: number;
  new_traits: string[];
  legacy_traits_excluded_count: number;
  match_stats?: {
    appearances: number;
    goals_per_game: number;
    assists_per_game: number;
    pass_success_pct: number;
    avg_rating: number;
    recorded_grade: number;
  };
  value_efficiency_score: number;
  flagship_score: number;
  classification_rationale: string;
}

export interface GradeTierComparisonItem {
  grade: number;
  tier_zone: GradeTierZone;
  tier_zone_label: string;
  included_in_core_market_index: boolean;
  card_price_sample_count: number;
  timeseries_observation_count: number;
  transaction_volume_provided: false;
  liquidity_note: string;
  status: "analyzed" | "on_hold_insufficient_data";
  avg_bp: number;
  avg_bp_text: string;
  median_bp: number;
  median_bp_text: string;
  spread_vs_prev_grade_multiple: number;
  return_7d_pct: number;
  return_30d_pct: number;
  volatility_30d_pct: number;
  basis: MarketDataBasis;
}

export interface RankerMetaSnapshot {
  snapshot_date: string;
  last_synced_at: string;
  source_urls: string[];
  season_usage_top: {
    season_code: string;
    usage_pct: number;
  }[];
  team_color_usage_top: {
    team_color_id: string;
    name: string;
    user_count: number;
    usage_pct: number;
  }[];
  position_top_players: {
    spid: number;
    name: string;
    season_code: string;
    position: string;
    grade: number;
    ovr: number;
    salary: number;
    user_count: number;
    usage_pct: number;
    bp_grade: number;
    bp_grade_text: string;
  }[];
  daily_record_leaders: {
    spid: number;
    name: string;
    season_code: string;
    position: string;
    grade: number;
    appearances: number;
    attack_points_per_game: number;
    goals_per_game: number;
    assists_per_game: number;
    pass_pct: number;
    dribble_pct: number;
    tackle_pct: number;
    avg_rating: number;
  }[];
}

export interface CodeAuditFindingItem {
  category:
    | "1. 실제 하드코딩이 확인된 항목 (제거·개선 완료)"
    | "2. 데이터 기반 구현이 확인된 항목"
    | "3. 일부만 구현된 항목 (보강 완료)"
    | "4. 관련 코드나 데이터가 없어 확인할 수 없는 항목 (판별 보류 처리)";
  module_path: string;
  finding_title: string;
  before_state: string;
  after_state: string;
  data_basis: MarketDataBasis;
}

export interface MarketCollectionStatus {
  environment_mode: string;
  total_catalog_cards: number;
  cards_with_full_ability: number;
  cards_with_multi_grade_prices: number;
  timeseries_stored_count: number;
  core_grades_8_11_series_count?: number;
  separated_12_13_series_count?: number;
  valid_30d_series_count: number;
  unit_rescaled_series_count: number;
  direct_verified_series_count: number;
  official_events_count?: number;
  official_notices_count?: number;
  ranker_usage_players_count?: number;
  official_new_traits_count?: number;
  legacy_traits_excluded_count?: number;
  last_crawled_at: string;
  last_events_synced_at?: string;
  last_ranker_synced_at?: string;
  rate_limit_policy: string;
  deduplication_policy: string;
  unobservable_metrics_disclosure: string[];
  unit_conversion_samples: MarketUnitConversionRecord[];
}

export interface MarketLabDashboardPayload {
  generated_at: string;
  core_analysis_grades: number[];
  separated_high_grades: number[];
  market_index_current: number;
  market_return_1d_pct: number;
  market_return_7d_pct: number;
  market_return_30d_pct: number;
  market_volatility_30d_pct: number;
  fear_greed: MarketFearGreedIndex;
  season_sectors: MarketSectorSummary[];
  capital_tier_sectors: MarketSectorSummary[];
  grade_sectors: MarketSectorSummary[];
  multi_axis_sectors?: MarketSectorSummary[];
  grade_tier_comparisons?: GradeTierComparisonItem[];
  dynamic_flagship_candidates?: DynamicFlagshipCandidate[];
  ranker_meta_snapshot?: RankerMetaSnapshot;
  events: MarketEventRecord[];
  event_change_logs?: OfficialEventChangeLog[];
  event_impacts: MarketEventImpactReport[];
  player_forecasts: MarketEntityForecast[];
  sector_forecasts: MarketEntityForecast[];
  backtest_report: MarketBacktestReport;
  trait_catalog: TraitMetaCatalogItem[];
  legacy_traits_excluded?: {
    trait_id: number;
    trait_name: string;
    trait_level: 5;
    reason: string;
  }[];
  trait_premiums: TraitControlledPremiumItem[];
  trait_substitutions: TraitCompetingSubstitutionCase[];
  trait_season_discounts: TraitSeasonDiscountItem[];
  trait_patches: TraitPatchHistoryItem[];
  code_audit_findings?: CodeAuditFindingItem[];
  collection_status: MarketCollectionStatus;
  normalized_series_preview: MarketNormalizedSeries[];
  market_overview_index?: MarketOverviewIndex;
  market_signals?: MarketSignalMetrics[];
  default_fee_config?: MarketFeeConfig;
}

// ============================================================================
// FC Online Domain Advanced Schemas:
// 1. Player Feel & Real Performance Metrics (PlayerFeelMetrics)
// 2. Transfer Market Fee, BEP, Enhancement EV & Signal Quality (MarketFeeConfig, MarketSignalMetrics, MarketOverviewIndex)
// 3. Squad Purchase Audit & Timing Report (SquadPurchaseAudit)
// ============================================================================

export type StatTrapBadgeType = "CHEAT_KEY" | "NORMAL" | "STAT_TRAP";

export interface PlayerRadarFiveMetrics {
  /** 체감 부드러움 (0~100): 민첩성·밸런스·볼컨트롤·드리블 및 체형/신장 물리 보정 */
  smoothness: number;
  /** 초기 가속 (0~100): 가속력·반응속도·순간 스피드 시너지 */
  burst: number;
  /** 경합 버티기 (0~100): 몸싸움·밸런스·신장/몸무게 모멘텀 */
  physicalHold: number;
  /** 양발/결정력 (0~100): 골결정력·슛파워·약발 보정 및 슈팅 신규특성 */
  finishing: number;
  /** 급여 가성비 (0~100): 급여 대비 포지션 유효 코어 스탯 효율 */
  salaryValue: number;
}

export type FeelGradeLabelType = "좋은 체감" | "보통 체감" | "무거운 체감";

export interface SimilarAlternativePlayerItem {
  spid: number;
  name: string;
  season: string;
  seasonImg?: string;
  thumbUrl?: string;
  position?: string;
  grade?: number;
  bp?: number;
  bpText?: string;
  /** 공유하는 핵심 팀컬러(소속 클럽 또는 국가대표) */
  sharedTeamColor?: string;
  sharedTeamColors?: string[];
  /** 코사인 유사도 (0~1 또는 0~100 스케일 호환) */
  similarity: number;
  /** 기준 카드 대비 가격 차이 비율 (예: -0.62 -> 62% 저렴) */
  priceDiffRatio: number;
  /** 대체 선수의 인게임 체감 지수 (0~100) */
  feelScore: number;
  /** 대체 선수의 3단계 체감 배지 */
  feelBadgeLabel?: FeelGradeLabelType;
}

export interface PlayerFeelMetrics {
  /** 표기 스탯 점수 (0~100) */
  statScore: number;
  /** 인게임 체감 지수 (0~100: 반응속도-밸런스-민첩성 연쇄 및 체형/신장/몸무게 물리 페널티 반영) */
  feelScore: number;
  /** 뻥스탯 지수: 표기 OVR/스탯 대비 실제 체감·핵심 스탯 괴리도 (양수일수록 표기 대비 체감 우수, 음수일수록 스탯 함정) */
  statTrapIndex: number;
  /** 좋은 체감 ('CHEAT_KEY') | 보통 체감 ('NORMAL') | 무거운 체감 ('STAT_TRAP') */
  statTrapBadge: StatTrapBadgeType;
  /** 체감 배지 한글 라벨 (3단계: '좋은 체감' | '보통 체감' | '무거운 체감') */
  statTrapLabel?: "좋은 체감" | "보통 체감" | "무거운 체감" | "💎 체감 괴물" | "일반" | "⚠️ 스탯 대비 둔중함";
  /** 3단계 체감 등급 라벨 ('좋은 체감' | '보통 체감' | '무거운 체감') */
  feelGradeLabel?: FeelGradeLabelType;
  /** 8강(적응도 0) 기준 체감 5대 핵심 스탯(민첩성·밸런스·드리블·볼 컨트롤·반응 속도) 가중 평균 */
  feel5Avg8?: number;
  /** 8강(적응도 0) 기준 민첩성 스탯 */
  agility8?: number;
  /** 8강(적응도 0) 기준 밸런스 스탯 */
  balance8?: number;
  /** 체형/신장/몸무게 조건으로 인해 '좋은 체감'에서 원천 제외되었는지 여부 */
  isPhysicalExcludedFromGoodFeel?: boolean;
  /** 체감 3단계 판정 사유 요약 */
  feelVerdictReason?: string;
  /** 포지션 핵심 유효 스탯을 급여(Salary)로 나눈 실효 급여 효율 점수 */
  positionSalaryEfficiency: number;
  /** 실전 체감 5각형 데이터 */
  radarFive: PlayerRadarFiveMetrics;
  /** 자동 생성 플레이스타일 태그 배열 (예: ['#양발잡이', '#고유체형급체감', '#침투특화', '#중거리포', '#역동작주의']) */
  playstyleTags: string[];
  /** 동일 팀컬러 + 동일 포지션 기반 가성비 대체 선수 TOP 3 리스트 */
  similarAlternatives: SimilarAlternativePlayerItem[];
  /** 상위 랭커 포지션별 실사용 픽률(%) */
  rankerPickRate: number;
}

export type MarketCouponDiscountRate = 0 | 0.2 | 0.3 | 0.4;

export interface MarketFeeConfig {
  /** PC방 기본 수수료 할인 (30% = 0.30) 적용 여부 */
  hasPcRoom: boolean;
  /** TOP CLASS 수수료 할인 (20% = 0.20) 적용 여부 */
  hasTopClass: boolean;
  /** 수수료 할인 쿠폰 할인율 (0 | 0.2 | 0.3 | 0.4) */
  couponRate: MarketCouponDiscountRate;
}

export type EnhancementRecommendationType =
  | "BUY_COMPLETE"
  | "CRAFT_RECOMMENDED";

export interface EnhancementEvAnalysis {
  /** 분석 대상 강화 단계 (예: 8, 9, 10) */
  targetGrade?: number;
  /** 이적시장 완제품 현재 매수가 (BP) */
  marketPrice: number;
  /** N-1강 하위 단계 카드 가격 (BP) */
  prevGradePrice?: number;
  /** 동일 OVR 풀케미 재료 5장 합산 비용 (BP) */
  fodder5Cost?: number;
  /** 풀케미 기준 강화 성공 확률 (0~1, 예: 8강 0.25) */
  successProb?: number;
  /** 하위 강화 단계 카드 + 강화 재료 5장 비용을 성공 확률로 나눈 기대 제작 비용 (BP) */
  expectedCraftCost: number;
  /** 기대 절감액 또는 손실액 (marketPrice - expectedCraftCost) */
  costDiffBp?: number;
  /** 완제품 구매 추천 ('BUY_COMPLETE') vs 직접 강화 제작 추천 ('CRAFT_RECOMMENDED') */
  recommendation: EnhancementRecommendationType;
  /** 한글 판정 라벨 ('완제품 매수 유리' | '직접 강화 유리 (기댓값 양수)') */
  verdictLabel?: "완제품 매수 유리" | "직접 강화 유리 (기댓값 양수)";
  /** 고강 귀속 위험 여부 (호가 공백·거래 절벽·고점 정체·매물 적체 위험) */
  isLiquidityTrap: boolean;
  /** 귀속 및 강화 기댓값 진단 코멘트 */
  liquidityTrapReason?: string;
}

export type MarketSignalStatusTag =
  | "🔥 급등 초입"
  | "💎 수요 유입"
  | "📈 상승 지속"
  | "⚠️ 고점/귀속 주의";

export interface MarketSignalMetrics {
  spid?: number;
  name?: string;
  seasonCode?: string;
  grade?: number;
  currentBp?: number;
  targetSellBp?: number;
  feeConfig: MarketFeeConfig;
  /** 실효 수수료율: 0.40 * (1 - Math.min(1.0, totalDiscountRate)) */
  effectiveFeeRate: number;
  /** 수수료 반영 손익분기 매도가 (BEP = Math.ceil(buyPrice / (1 - effectiveFeeRate))) */
  breakEvenPrice: number;
  /** 목표 매도가(또는 7일 기대 예측가) 매도 시 수수료 차감 후 순수익 (BP) */
  netProfitBp: number;
  /** 순수익률 (%) */
  netProfitRatePct?: number;
  /** 수수료 차감 후 순수익이 음수인지 여부 ('수수료 손실 주의') */
  isFeeLossWarning?: boolean;
  /** 강화 제작 기댓값 분석 */
  enhancementEv: EnhancementEvAnalysis;
  /** 신호 품질 점수 (0~100점) */
  signalQualityScore: number;
  /** 신호 상태 태그 */
  signalStatusTag: MarketSignalStatusTag;
}

export interface MarketOverviewHeatmapCell {
  seasonCode: string;
  seasonName: string;
  seasonImg?: string;
  grade: number;
  avgBp: number;
  changePct1d: number;
  changePct7d: number;
  sampleCount: number;
  signalTag?: MarketSignalStatusTag;
}

export interface MarketOverviewIndex {
  /** FClab 마켓 종합 지수 (기준 = 100.0) */
  currentIndex: number;
  /** 전일 대비 등락률 (%) */
  changePct1d: number;
  /** 7일 대비 등락률 (%) */
  changePct7d?: number;
  /** 상승 종목 수 */
  advancingCount: number;
  /** 보합 종목 수 */
  flatCount: number;
  /** 하락 종목 수 */
  decliningCount: number;
  /** 시즌별·강화별 등락 히트맵 데이터 배열 */
  seasonGradeHeatmap: MarketOverviewHeatmapCell[];
  /** 산출 시각 */
  updatedAt?: string;
}

export interface SquadPlayerPricePercentileItem {
  slotId: string;
  slotPosition: string;
  spid: number;
  name: string;
  seasonCode: string;
  seasonImg?: string;
  thumbUrl?: string;
  grade: number;
  currentBp: number;
  min30dBp: number;
  max30dBp: number;
  /** 30일 시세 백분위 위치 (0 = 30일 최저가 바닥권, 100 = 30일 최고가 고점권) */
  pricePercentile30d: number;
  /** 선수별 매수 타이밍 판정 ('저점 매수 적기' | '적정 구간' | '단기 고점 주의') */
  buyTimingVerdict: "저점 매수 적기" | "적정 구간" | "단기 고점 주의";
}

export interface SquadOverinvestedPositionWarning {
  slotId: string;
  slotPosition: string;
  currentPlayer: {
    spid: number;
    name: string;
    seasonCode: string;
    seasonImg?: string;
    thumbUrl?: string;
    grade: number;
    salary: number;
    bp: number;
    feelScore: number;
    positionSalaryEfficiency: number;
    statTrapBadge?: StatTrapBadgeType;
  };
  warningReason: string;
  savedSalary: number;
  savedBp: number;
  recommendedAlternatives: SimilarAlternativePlayerItem[];
}

export interface SquadPurchaseAudit {
  /** 스쿼드 총 구단가치 (BP) */
  totalBp: number;
  /** 스쿼드 전체 재판매 시 예상 수수료 손실액 (BP, 기본 PC방+탑클 20% 기준) */
  estimatedResaleLossBp: number;
  /** PC방(30%)+탑클(20%) 기본 20% 실효 수수료 기준 재판매 손실액 (BP) */
  resaleLossPcTopBp?: number;
  /** PC방(30%)+탑클(20%)+30% 할인쿠폰(실효 수수료 8%) 적용 시 재판매 손실액 (BP) */
  resaleLossWith30CouponBp?: number;
  /** PC방(30%)+탑클(20%)+40% 할인쿠폰(실효 수수료 4%) 적용 시 재판매 손실액 (BP) */
  resaleLossWith40CouponBp?: number;
  /** 40% 할인쿠폰 단독(PC방/탑클 미적용, 실효 수수료 24%) 적용 시 재판매 손실액 (BP) */
  resaleLossCouponOnly40Bp?: number;
  /** 적용된 수수료 설정 */
  appliedFeeConfig: MarketFeeConfig;
  /** 실효 수수료율 */
  effectiveFeeRate: number;
  /** 스쿼드 전체 매수 타이밍 종합 점수 (0~100, 높을수록 저점·안전 매수 구간) */
  overallBuyTimingScore: number;
  /** 매수 타이밍 한줄 요약 라벨 */
  buyTimingSummaryLabel?: string;
  /** 선수별 30일 시세 백분위 위치 리스트 */
  playerPricePercentiles: SquadPlayerPricePercentileItem[];
  /** 급여 과투자 포지션 경고 및 가성비 대체 카드 추천 리스트 */
  overinvestedPositions: SquadOverinvestedPositionWarning[];
}



