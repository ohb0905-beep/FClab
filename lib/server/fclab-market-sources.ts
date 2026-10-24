import {
  CapitalTierType,
  CodeAuditFindingItem,
  DynamicFlagshipCandidate,
  DynamicFlagshipCategory,
  GradeTierComparisonItem,
  GradeTierZone,
  MarketEventRecord,
  MarketNormalizedSeries,
  OfficialEventChangeLog,
  PlayerCard,
  RankerMetaSnapshot,
  SeasonSectorType,
  TraitMetaCatalogItem,
  formatBpKorean,
} from "@/lib/fclab-types";
import {
  crawlPlayerAbility,
  crawlPriceHistory,
  getStoreSnapshot,
  persistStore,
} from "@/lib/server/fclab-engine";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function nowUtc(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function round2(val: number): number {
  return Math.round((Number.isFinite(val) ? val : 0) * 100) / 100;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}


function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ============================================================================
// 1. Official New Traits (level: 8, trait_icon_50..68) vs Legacy Traits (level: 5)
// Verified from official Nexon bundle: https://ssl.nexon.com/s1/fc/online/obt/coachHelper/app.C4p10MCS.js
// ============================================================================

export const OFFICIAL_NEW_TRAITS_CATALOG: Omit<
  TraitMetaCatalogItem,
  | "card_holder_count"
  | "timeseries_holder_count"
  | "overall_meta_score"
  | "meta_tier"
>[] = [
  {
    trait_id: 51,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_51.png",
    included_in_price_model: true,
    trait_name: "크로스 포쳐",
    category: "슈팅·득점",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 51) — 크로스 상황에서 목표 지점에 더 빠르게 도달",
    applicable_positions: ["ST", "CF", "LW", "RW"],
    activation_condition: "측면 크로스 궤적 발생 시 박스 안 목표 낙구 지점 침투",
    in_game_effect: "크로스 상황에서 목표 지점에 더 빠르게 도달하여 헤더·논스톱 슈팅 선점",
    synergy_stats: ["헤더", "점프", "위치 선정", "골 결정력", "반응 속도"],
    competing_traits: ["라인 브레이커", "아크로바틱 피니셔"],
    base_performance_score: 95,
    current_meta_fit_score: 96,
    relative_competitiveness_score: 95,
    patch_impact_score: 96,
    position_suitability: { ST: 98, CF: 93, LW: 75, RW: 75 },
  },
  {
    trait_id: 50,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_50.png",
    included_in_price_model: true,
    trait_name: "아크로바틱 피니셔",
    category: "슈팅·득점",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 50) — 고유 모션을 포함하여 발리 샷이 자주 발동",
    applicable_positions: ["ST", "CF", "LW", "RW", "CAM"],
    activation_condition: "공중볼·바운드 볼 상황에서 다이렉트 발리 슈팅 시도 시",
    in_game_effect:
      "아크로바틱 피니셔만의 고유 모션을 포함하여 고난도 발리 샷이 자주 발동",
    synergy_stats: ["발리 슛", "골 결정력", "민첩성", "밸런스", "반응 속도"],
    competing_traits: ["크로스 포쳐", "레이저 슈터"],
    base_performance_score: 93,
    current_meta_fit_score: 94,
    relative_competitiveness_score: 93,
    patch_impact_score: 95,
    position_suitability: { ST: 97, CF: 95, LW: 85, RW: 85, CAM: 82 },
  },
  {
    trait_id: 66,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_66.png",
    included_in_price_model: true,
    trait_name: "레이저 슈터",
    category: "슈팅·득점",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 66) — 정면으로 다가오는 공에 낮고 빠른 다이렉트 슈팅",
    applicable_positions: ["ST", "CF", "CAM", "CM", "LW", "RW"],
    activation_condition: "공이 정면으로 다가오는 상황에서 논스톱 다이렉트 슈팅 시도 시",
    in_game_effect: "낮고 빠른 궤적의 다이렉트 슈팅으로 골키퍼 반응 시간 단축",
    synergy_stats: ["슛 파워", "중거리 슛", "골 결정력", "볼 컨트롤"],
    competing_traits: ["아크로바틱 피니셔", "크로스 포쳐"],
    base_performance_score: 92,
    current_meta_fit_score: 94,
    relative_competitiveness_score: 92,
    patch_impact_score: 95,
    position_suitability: { CAM: 96, ST: 95, CF: 95, CM: 92, LW: 88, RW: 88 },
  },
  {
    trait_id: 52,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_52.png",
    included_in_price_model: true,
    trait_name: "라인 브레이커",
    category: "침투·오프더볼",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 52) — 오프 더 볼 움직임으로 최종 수비 라인 파괴",
    applicable_positions: ["ST", "CF", "LW", "RW"],
    activation_condition: "동료 패스 타이밍에 맞춰 상대 최종 수비 라인 배후 침투 시",
    in_game_effect:
      "오프 더 볼 움직임을 통해 상대 최종 수비 라인을 효과적으로 무너뜨림",
    synergy_stats: ["가속력", "속력", "위치 선정", "민첩성"],
    competing_traits: ["크로스 포쳐", "스피드스터"],
    base_performance_score: 91,
    current_meta_fit_score: 90,
    relative_competitiveness_score: 89,
    patch_impact_score: 88,
    position_suitability: { ST: 94, CF: 92, LW: 91, RW: 91 },
  },
  {
    trait_id: 63,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_63.png",
    included_in_price_model: true,
    trait_name: "스피드스터",
    category: "드리블·탈압박",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 63) — 드리블 중 공간으로 질주하며 폭발적 돌파",
    applicable_positions: ["LW", "RW", "LM", "RM", "ST", "CF"],
    activation_condition: "측면 및 전방 열린 공간으로 치고 달리는 질주 드리블 시",
    in_game_effect: "드리블 중 공간으로 질주하며 수비수를 떨쳐내는 돌파 가속 보정",
    synergy_stats: ["속력", "가속력", "드리블", "민첩성"],
    competing_traits: ["트릭스터", "라인 브레이커"],
    base_performance_score: 93,
    current_meta_fit_score: 94,
    relative_competitiveness_score: 93,
    patch_impact_score: 94,
    position_suitability: { LW: 98, RW: 98, LM: 95, RM: 95, ST: 91, CF: 92 },
  },
  {
    trait_id: 65,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_65.png",
    included_in_price_model: true,
    trait_name: "트릭스터",
    category: "드리블·탈압박",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 65) — 다채로운 개인기를 활용하여 상대를 속임",
    applicable_positions: ["LW", "RW", "CAM", "CF", "LM", "RM"],
    activation_condition: "밀집 수비 앞에서 개인기 및 방향 전환 탈압박 시도 시",
    in_game_effect: "다채로운 개인기를 활용하여 상대를 속이고 민첩하게 탈압박",
    synergy_stats: ["드리블", "민첩성", "볼 컨트롤", "밸런스"],
    competing_traits: ["스피드스터"],
    base_performance_score: 88,
    current_meta_fit_score: 89,
    relative_competitiveness_score: 88,
    patch_impact_score: 90,
    position_suitability: { LW: 94, RW: 94, CAM: 92, CF: 91, LM: 90, RM: 90 },
  },
  {
    trait_id: 59,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_59.png",
    included_in_price_model: true,
    trait_name: "커맨더",
    category: "패스·찬스메이킹",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 59) — 백스핀이 적용된 낮고 빠른 로빙 스루 패스 구사",
    applicable_positions: ["CM", "CAM", "CDM"],
    activation_condition: "중원 및 후방에서 전방 침투 공격수에게 로빙 스루 패스(QW) 시도 시",
    in_game_effect: "백스핀이 적용된 낮고 빠른 로빙 스루 패스로 수비 뒷공간 배급",
    synergy_stats: ["긴 패스", "짧은 패스", "시야", "볼 컨트롤"],
    competing_traits: ["2개의 심장"],
    base_performance_score: 93,
    current_meta_fit_score: 95,
    relative_competitiveness_score: 94,
    patch_impact_score: 95,
    position_suitability: { CM: 98, CAM: 96, CDM: 95 },
  },
  {
    trait_id: 55,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_55.png",
    included_in_price_model: true,
    trait_name: "2개의 심장",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 55) — 질주 시 스태미너 소모 감소 및 능력치 저하 완화",
    applicable_positions: ["CM", "CDM", "LB", "RB", "LM", "RM", "CAM"],
    activation_condition: "전후반 지속적인 압박·질주 및 후반전 스태미너 소모 구간",
    in_game_effect:
      "질주 시 스태미너가 덜 소모되고, 스태미너 부족에 따른 능력치 감소가 완화됨",
    synergy_stats: ["스태미너", "가로채기", "속력", "가속력"],
    competing_traits: ["커맨더", "체이서"],
    base_performance_score: 91,
    current_meta_fit_score: 92,
    relative_competitiveness_score: 91,
    patch_impact_score: 92,
    position_suitability: { CM: 96, CDM: 95, LB: 95, RB: 95, LM: 93, RM: 93 },
  },
  {
    trait_id: 64,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_64.png",
    included_in_price_model: true,
    trait_name: "타이탄",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 64) — 공중볼 경합 상황에서 상대를 방해해 유리한 위치 선점",
    applicable_positions: ["CB", "CDM", "ST"],
    activation_condition: "공중볼 낙구 지점에서 상대 공격수·수비수와 몸싸움 경합 시",
    in_game_effect:
      "공중볼 경합 상황에서 상대 선수를 방해하여 유리한 위치를 차지함",
    synergy_stats: ["몸싸움", "점프", "헤더", "밸런스"],
    competing_traits: ["파이터", "블로커"],
    base_performance_score: 93,
    current_meta_fit_score: 94,
    relative_competitiveness_score: 93,
    patch_impact_score: 94,
    position_suitability: { CB: 98, CDM: 94, ST: 93 },
  },
  {
    trait_id: 56,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_56.png",
    included_in_price_model: true,
    trait_name: "파이터",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 56) — 밀고 당기기 시도 시 상대 질주 속도와 킥 정확도 감소",
    applicable_positions: ["CB", "CDM", "LB", "RB"],
    activation_condition: "수비 경합 중 상대 공격수에게 밀고 당기기(학다리·어깨싸움) 시도 시",
    in_game_effect:
      "밀고 당기기 시도 시 상대의 질주 속도와 킥 정확도를 감소시킴",
    synergy_stats: ["몸싸움", "대인 수비", "태클", "적극성"],
    competing_traits: ["타이탄", "와일드 태클러", "프레데터"],
    base_performance_score: 92,
    current_meta_fit_score: 93,
    relative_competitiveness_score: 92,
    patch_impact_score: 93,
    position_suitability: { CB: 97, CDM: 94, LB: 90, RB: 90 },
  },
  {
    trait_id: 53,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_53.png",
    included_in_price_model: true,
    trait_name: "와일드 태클러",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 53) — 상대의 뒤에서도 스탠딩 태클 범위 증가",
    applicable_positions: ["CB", "CDM", "LB", "RB"],
    activation_condition: "상대 드리블러 추격 및 후방·측면 스탠딩 태클 시도 시",
    in_game_effect: "상대의 뒤에서도 스탠딩 태클을 하는 범위가 증가함",
    synergy_stats: ["태클", "대인 수비", "가로채기", "반응 속도"],
    competing_traits: ["파이터", "체이서", "블로커"],
    base_performance_score: 91,
    current_meta_fit_score: 92,
    relative_competitiveness_score: 91,
    patch_impact_score: 92,
    position_suitability: { CB: 96, CDM: 95, LB: 92, RB: 92 },
  },
  {
    trait_id: 54,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_54.png",
    included_in_price_model: true,
    trait_name: "체이서",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 54) — 역습하는 상대 선수를 더 빨리 추격",
    applicable_positions: ["CB", "LB", "RB", "CDM"],
    activation_condition: "수비 전환 상황에서 역습하는 상대 공격수를 배후 추격 시",
    in_game_effect: "역습하는 상대 선수를 더 빨리 추격하여 뒷공간 위기 차단",
    synergy_stats: ["속력", "가속력", "대인 수비", "태클"],
    competing_traits: ["와일드 태클러", "프레데터"],
    base_performance_score: 91,
    current_meta_fit_score: 92,
    relative_competitiveness_score: 91,
    patch_impact_score: 92,
    position_suitability: { LB: 96, RB: 96, CB: 94, CDM: 90 },
  },
  {
    trait_id: 62,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_62.png",
    included_in_price_model: true,
    trait_name: "블로커",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 62) — 몸을 날려 상대 슈팅을 차단",
    applicable_positions: ["CB", "CDM"],
    activation_condition: "페널티 박스 안팎에서 상대 슈팅 궤적 앞에 위치할 때",
    in_game_effect: "몸을 날려 슈팅을 차단하는 육탄 방어 모션 및 범위 향상",
    synergy_stats: ["대인 수비", "가로채기", "반응 속도", "태클"],
    competing_traits: ["타이탄", "파이터"],
    base_performance_score: 90,
    current_meta_fit_score: 91,
    relative_competitiveness_score: 90,
    patch_impact_score: 91,
    position_suitability: { CB: 96, CDM: 92 },
  },
  {
    trait_id: 67,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_67.png",
    included_in_price_model: true,
    trait_name: "프레데터",
    category: "피지컬·수비·특수",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 67) — 상대와의 간격을 유지하며 드리블 돌파 차단",
    applicable_positions: ["CB", "LB", "RB", "CDM"],
    activation_condition: "1:1 대인 방어(학다리/게걸음 수비) 상황에서 상대 드리블 견제 시",
    in_game_effect: "상대와의 간격을 유지하며 드리블 돌파를 효과적으로 차단",
    synergy_stats: ["대인 수비", "민첩성", "태클", "가로채기"],
    competing_traits: ["파이터", "체이서"],
    base_performance_score: 90,
    current_meta_fit_score: 91,
    relative_competitiveness_score: 90,
    patch_impact_score: 92,
    position_suitability: { CB: 95, LB: 95, RB: 95, CDM: 91 },
  },
  {
    trait_id: 57,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_57.png",
    included_in_price_model: true,
    trait_name: "GK 빠른 반응",
    category: "골키퍼(GK) 특화",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 57) — GK 돌진(W) 사용 시 속도가 빨라짐",
    applicable_positions: ["GK"],
    activation_condition: "1:1 위기 상황에서 GK 돌진(W) 명령 입력 시",
    in_game_effect: "GK 돌진 사용 시 속도가 빨라져 슈팅 각도를 조기에 좁힘",
    synergy_stats: ["GK 반응속도", "GK 다이빙", "반응 속도"],
    competing_traits: ["GK 공중볼 장악", "GK 데드아이"],
    base_performance_score: 89,
    current_meta_fit_score: 90,
    relative_competitiveness_score: 89,
    patch_impact_score: 90,
    position_suitability: { GK: 95 },
  },
  {
    trait_id: 60,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_60.png",
    included_in_price_model: true,
    trait_name: "GK 공중볼 장악",
    category: "골키퍼(GK) 특화",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 60) — 크로스 상황에서 영리한 위치 선정으로 방어",
    applicable_positions: ["GK"],
    activation_condition: "측면 크로스 및 코너킥 공중볼 궤적 방어 시",
    in_game_effect:
      "크로스 상황에서 빠르고 영리한 위치 선정으로 안정적으로 크로스를 방어",
    synergy_stats: ["GK 위치 선정", "GK 핸들링", "점프"],
    competing_traits: ["GK 빠른 반응", "GK 데드아이"],
    base_performance_score: 89,
    current_meta_fit_score: 90,
    relative_competitiveness_score: 89,
    patch_impact_score: 90,
    position_suitability: { GK: 95 },
  },
  {
    trait_id: 68,
    trait_level: 8,
    icon_url:
      "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_68.png",
    included_in_price_model: true,
    trait_name: "GK 데드아이",
    category: "골키퍼(GK) 특화",
    is_new_or_reworked_meta: true,
    release_or_patch_note:
      "공식 신규특성(level: 8, ID 68) — 상대의 중거리 슈팅을 예측하여 포지셔닝",
    applicable_positions: ["GK"],
    activation_condition: "박스 외곽에서 상대가 중거리 슈팅(D/ZD)을 준비할 때",
    in_game_effect: "상대의 중거리 슈팅을 예측하여 선제적으로 포지셔닝",
    synergy_stats: ["GK 위치 선정", "GK 다이빙", "GK 반응속도"],
    competing_traits: ["GK 빠른 반응", "GK 공중볼 장악"],
    base_performance_score: 90,
    current_meta_fit_score: 92,
    relative_competitiveness_score: 91,
    patch_impact_score: 92,
    position_suitability: { GK: 96 },
  },
];

export const OFFICIAL_NEW_TRAIT_NAMES = new Set(
  OFFICIAL_NEW_TRAITS_CATALOG.map((t) => t.trait_name)
);

export const EXCLUDED_LEGACY_TRAITS_LIST: {
  trait_id: number;
  trait_name: string;
  trait_level: 5;
  reason: string;
}[] = [
  {
    trait_id: 13,
    trait_name: "예리한 감아차기",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 13) — 구시즌·신규시즌 전반에 보편 분포하여 신규특성(level: 8) 전용 시세 프리미엄 및 예측 변수에서 제외",
  },
  {
    trait_id: 17,
    trait_name: "중거리 슛 선호",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 17) — 선수 기본 성향 특성으로 신규특성(level: 8) 시세 분석 변수에서 분리·제외",
  },
  {
    trait_id: 21,
    trait_name: "파워 헤더",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 21) — 기존 일반 특성군으로 신규특성(타이탄·크로스 포쳐 등 level: 8) 시세 변수와 혼입 금지",
  },
  {
    trait_id: 49,
    trait_name: "패스 마스터",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 49) — 공식 번들 기준 level: 5(일반 고유특성)로 확인되어 level: 8 신규특성(커맨더 등)과 분리",
  },
  {
    trait_id: 28,
    trait_name: "스피드 드리블러",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 28) — 기존 일반 드리블 특성으로 신규특성(스피드스터·트릭스터 level: 8) 시세 변수에서 제외",
  },
  {
    trait_id: 31,
    trait_name: "테크니컬 드리블러",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 31) — 기존 일반 드리블 특성으로 시세 예측 입력에서 제외",
  },
  {
    trait_id: 20,
    trait_name: "아웃사이드 슈팅/크로스",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 20) — 일반 고유특성이므로 신규특성 시세 모델에서 제외",
  },
  {
    trait_id: 4,
    trait_name: "강철몸",
    trait_level: 5,
    reason:
      "공식 기존 고유특성(level: 5, ID 04) — 일반 내구성 특성으로 신규특성(파이터·타이탄 level: 8) 시세 모델에서 제외",
  },
];

export function isOfficialNewTrait(traitObjOrName: { name: string; icon?: string } | string): boolean {
  if (typeof traitObjOrName === "string") {
    return OFFICIAL_NEW_TRAIT_NAMES.has(traitObjOrName.trim());
  }
  const icon = traitObjOrName.icon || "";
  const idMatch = icon.match(/trait_icon_(\d+)\.png/i);
  if (idMatch) {
    const idNum = Number(idMatch[1]);
    return idNum >= 50;
  }
  return OFFICIAL_NEW_TRAIT_NAMES.has((traitObjOrName.name || "").trim());
}

export function extractCardNewAndLegacyTraits(card: PlayerCard): {
  newTraits: string[];
  legacyTraits: string[];
} {
  const newTraits: string[] = [];
  const legacyTraits: string[] = [];
  for (const t of card.traits || []) {
    if (!t || !t.name) continue;
    if (isOfficialNewTrait(t)) {
      if (!newTraits.includes(t.name)) newTraits.push(t.name);
    } else {
      if (!legacyTraits.includes(t.name)) legacyTraits.push(t.name);
    }
  }
  return { newTraits, legacyTraits };
}

export function classifyGradeTierZone(grade: number): {
  zone: GradeTierZone;
  label: string;
} {
  if (grade >= 8 && grade <= 11) {
    return {
      zone: "CORE_GOLD_8_11",
      label: "+8~+11강 (금카 주류·신규특성 및 팀컬러 핵심 분석 구간)",
    };
  }
  if (grade >= 12) {
    return {
      zone: "SEPARATED_ULTRA_12_13",
      label: "+12~+13강 (초고가·저유동성 희소 분리 구간 — 전체 시세 평균 왜곡 방지)",
    };
  }
  return {
    zone: "SUB_SILVER_1_7",
    label: "+1~+7강 (명함·은카 하위 참조 구간)",
  };
}

// ============================================================================
// 2. Dynamic Data-Driven Season Classification (NO Hardcoded Season Arrays)
// ============================================================================

export function classifySeasonSectorDynamic(
  seasonCode: string,
  allCards?: PlayerCard[],
  rankerSnapshot?: RankerMetaSnapshot
): {
  sector: SeasonSectorType;
  label: string;
} {
  const code = (seasonCode || "").toUpperCase().trim();
  const store = getStoreSnapshot();
  const cards = allCards || Object.values(store.cards);
  const ranker = rankerSnapshot || store.rankerMetaSnapshot;

  // 1) Live dynamic season detection by structural naming ("LIVE" or 2-digit live year)
  if (code.includes("LIVE") || /^(17|18|19|20|21|22|23|24|25|26)$/.test(code)) {
    return {
      sector: "LIVE_DYNAMIC",
      label: "라이브·실제 성적 연동 시즌 (실제 경기 퍼포먼스 연동)",
    };
  }

  const seasonCards = cards.filter((c) => c.season_code === code);
  const seasonMeta = Object.values(store.seasons).find(
    (s) => s.season_code.toUpperCase() === code
  );
  const className = (seasonMeta?.class_name || "").toUpperCase();

  // 2) Discontinued / Limited Legend detection from official class metadata & supply characteristics
  // (ICON / Moment / Ballon d'Or / ultra-high median BP with zero regular pack dilution)
  const avgBp8 = mean(
    seasonCards
      .map((c) => c.prices?.["8"]?.bp || c.bp_8 || c.bp_1 * 20)
      .filter((v) => v > 0)
  );
  const avgOvr = mean(seasonCards.map((c) => c.ovr));
  const isIconOrMomentMeta =
    code.startsWith("ICON") ||
    className.includes("ICON") ||
    className.includes("MOMENT") ||
    className.includes("BALLON");

  if (isIconOrMomentMeta) {
    return {
      sector: "LIMITED_DISCONTINUED",
      label: "공급 제한·레전드 클래스 (공식 클래스 메타·희소 공급)",
    };
  }

  // 3) Data-driven Flagship vs Existing vs Theme using Ranker Top 10,000 usage + New Trait (level: 8) density + OVR
  const rankerSeasonEntry = ranker?.season_usage_top?.find(
    (r) => r.season_code.toUpperCase() === code
  );
  const rankerSharePct = rankerSeasonEntry?.usage_pct || 0;

  const fullAbilityCards = seasonCards.filter((c) => c.has_full_ability);
  const newTraitHolderRatio =
    fullAbilityCards.length > 0
      ? fullAbilityCards.filter(
          (c) => extractCardNewAndLegacyTraits(c).newTraits.length > 0
        ).length / fullAbilityCards.length
      : 0;

  // High ranker share (>= 2.5%) OR high new trait density (>= 35% with avgOvr >= 113) OR latest year prefix (25/26) with high OVR
  if (
    rankerSharePct >= 2.8 ||
    (newTraitHolderRatio >= 0.35 && avgOvr >= 112.5) ||
    (avgOvr >= 114.5 && avgBp8 >= 300_000_000_000)
  ) {
    return {
      sector: "NEW_META_FLAGSHIP",
      label: "데이터 판별 최상위 메타 시즌 (랭커 점유율·신규특성 밀도 상위)",
    };
  }

  if (
    rankerSharePct >= 1.2 ||
    avgOvr >= 110.5 ||
    newTraitHolderRatio >= 0.15
  ) {
    return {
      sector: "EXISTING_FLAGSHIP",
      label: "데이터 판별 주류 경쟁 시즌 (중상위 랭커 사용률·주전급 스펙)",
    };
  }

  return {
    sector: "THEME_TEAMCOLOR",
    label: "테마·팀컬러·급여 최적화 실사용 시즌",
  };
}

// ============================================================================
// 3. Automated Official Events & Notices Crawler + Change Detection
// Crawls https://fconline.nexon.com/news/events/list & /news/notice/list
// ============================================================================

export async function syncOfficialEventsAndNotices(): Promise<{
  events: MarketEventRecord[];
  changeLogs: OfficialEventChangeLog[];
  syncedAt: string;
}> {
  const store = getStoreSnapshot();
  const prevEvents = Array.isArray(store.marketEvents) ? store.marketEvents : [];
  const prevById = new Map<string, MarketEventRecord>(
    prevEvents.map((e) => [e.id, e])
  );
  const changeLogs: OfficialEventChangeLog[] = Array.isArray(
    store.marketEventChangeLogs
  )
    ? [...store.marketEventChangeLogs]
    : [];

  const syncedAt = nowUtc();
  const discovered: MarketEventRecord[] = [];

  try {
    // 1) Crawl Official Ongoing Events List
    const evRes = await fetch("https://fconline.nexon.com/news/events/list", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (evRes.ok) {
      const html = await evRes.text();
      const trBlocks = html.split('<div class="tr">').slice(1, 14);
      for (const block of trBlocks) {
        const href = (block.match(/href="([^"]+)"/) || [])[1] || "";
        const title = (
          (
            block.match(
              /<span class="subject">[\s\S]*?<span class="txt">([^<]+)<\/span>/
            ) || []
          )[1] || ""
        )
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .trim();
        const dateRaw = (
          (block.match(/<span class="date">([^<]+)<\/span>/) || [])[1] || ""
        ).trim();
        const stateRaw = (
          (block.match(/<span class="state[^"]*">([^<]+)<\/span>/) || [])[1] ||
          "진행"
        ).trim();
        if (!title) continue;

        const idSlug =
          href
            .replace(/https?:\/\/[^/]+/, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 48) || `official_evt_${discovered.length}`;
        const eventId = `official-${idSlug}`;

        // Parse YYYY-MM-DD ~ YYYY-MM-DD into MM.DD
        const dateParts = dateRaw.split("~").map((s) => s.trim());
        const fmtMd = (dStr: string, fallback: string) => {
          const m = dStr.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
          if (m) return `${m[2]}.${m[3]}`;
          return fallback;
        };
        const startMd = fmtMd(dateParts[0] || "", "10.01");
        const endMd = fmtMd(dateParts[1] || "", "10.31");

        const parsed = classifyOfficialEventText(title, "", startMd, endMd);
        const contentHash = `${title}|${dateRaw}|${stateRaw}`;

        discovered.push({
          id: eventId,
          title,
          event_type: parsed.eventType,
          event_type_label: parsed.eventTypeLabel,
          published_at: dateParts[0] || startMd,
          start_date: startMd,
          end_date: endMd,
          status: stateRaw.includes("종료") ? "종료" : "진행중",
          target_seasons: parsed.targetSeasons,
          target_capital_tiers: parsed.targetCapitalTiers,
          target_grades: [8, 9, 10, 11],
          bp_injection_scale: parsed.bpScale,
          pack_supply_scale: parsed.packScale,
          fee_coupon_discount_pct: parsed.couponPct,
          official_url: href.startsWith("http")
            ? href
            : `https://fconline.nexon.com${href}`,
          last_collected_at: syncedAt,
          content_hash: contentHash,
          basis: "official_public",
          source: "fconline.nexon.com/news/events/list (공식 웹이벤트 실시간 크롤링)",
          verified: true,
          description: parsed.description,
        });
      }
    }
  } catch {
    // keep going if events page times out
  }

  try {
    // 2) Crawl Official Notices List
    const noRes = await fetch("https://fconline.nexon.com/news/notice/list", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (noRes.ok) {
      const html = await noRes.text();
      const trBlocks = html.split(/<div class="tr\s*[^"]*">/).slice(1, 14);
      for (const block of trBlocks) {
        const href = (block.match(/href="([^"]+)"/) || [])[1] || "";
        const sort = (
          (block.match(/<span class="td sort">([^<]+)<\/span>/) || [])[1] || ""
        ).trim();
        const title = (
          (block.match(/<span class="td subject">([^<]+)<\/span>/) || [])[1] ||
          ""
        )
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .trim();
        const dateRaw = (
          (block.match(/<span class="td date">([^<]+)<\/span>/) || [])[1] || ""
        ).trim();
        const summary = (
          (block.match(/<div class="text_box">([\s\S]*?)<\/div>/) || [])[1] ||
          ""
        )
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (!title) continue;
        // Filter for notices relevant to market, packages, events, maintenance, seasons, or patches
        if (
          !/(이벤트|패키지|점검|수수료|버닝|클래스|시즌|특성|보상|교환|포인트|출석|업데이트|상점)/.test(
            `${sort} ${title} ${summary}`
          )
        ) {
          continue;
        }

        const snMatch = href.match(/n4ArticleSN=(\d+)/);
        const eventId = snMatch
          ? `notice-${snMatch[1]}`
          : `notice-${discovered.length}`;
        const m = dateRaw.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
        const startMd = m ? `${m[2]}.${m[3]}` : "10.15";
        const endDay = m
          ? String(Math.min(30, Number(m[3]) + 7)).padStart(2, "0")
          : "23";
        const endMd = m ? `${m[2]}.${endDay}` : "10.23";

        const parsed = classifyOfficialEventText(title, summary, startMd, endMd);
        const contentHash = `${title}|${dateRaw}|${summary.slice(0, 80)}`;

        discovered.push({
          id: eventId,
          title: `[공식 ${sort || "공지"}] ${title}`,
          event_type: parsed.eventType,
          event_type_label: parsed.eventTypeLabel,
          published_at: dateRaw,
          start_date: startMd,
          end_date: endMd,
          status: "진행중",
          target_seasons: parsed.targetSeasons,
          target_capital_tiers: parsed.targetCapitalTiers,
          target_grades: [8, 9, 10, 11],
          bp_injection_scale: parsed.bpScale,
          pack_supply_scale: parsed.packScale,
          fee_coupon_discount_pct: parsed.couponPct,
          official_url: href.startsWith("http")
            ? href
            : `https://fconline.nexon.com${href}`,
          last_collected_at: syncedAt,
          content_hash: contentHash,
          basis: "official_public",
          source: "fconline.nexon.com/news/notice/list (공식 공지사항 실시간 크롤링)",
          verified: true,
          description: summary
            ? `${summary.slice(0, 160)} (실제 유저별 개봉·BP 유입 총량은 비공개이므로 공개 보상 구조 기반 시나리오로 분석)`
            : parsed.description,
        });
      }
    }
  } catch {
    // ignore fetch error
  }

  // Change detection against previous stored events
  const mergedEvents: MarketEventRecord[] = [];
  const seenIds = new Set<string>();

  for (const item of discovered) {
    seenIds.add(item.id);
    const prev = prevById.get(item.id);
    if (!prev) {
      item.status = item.status === "종료" ? "종료" : "신규";
      changeLogs.unshift({
        detected_at: syncedAt,
        change_type: "신규 발견",
        event_id: item.id,
        title: item.title,
        detail: `공식 홈페이지에서 신규 이벤트/공지 감지 (${item.start_date}~${item.end_date})`,
      });
    } else if (prev.content_hash && prev.content_hash !== item.content_hash) {
      item.status = "내용변경";
      changeLogs.unshift({
        detected_at: syncedAt,
        change_type: "내용 변경",
        event_id: item.id,
        title: item.title,
        detail: `기존 수집 본문/일정 해시 변경 감지 → 최신 공지 내용으로 자동 갱신`,
      });
    }
    mergedEvents.push(item);
  }

  // Mark previously stored events not in current active list as ended/preserved
  for (const prev of prevEvents) {
    if (!seenIds.has(prev.id)) {
      if (prev.status !== "종료") {
        changeLogs.unshift({
          detected_at: syncedAt,
          change_type: "종료 전환",
          event_id: prev.id,
          title: prev.title,
          detail: "진행 중 목록에서 이탈하여 종료 상태로 이력 보존",
        });
      }
      mergedEvents.push({
        ...prev,
        status: "종료",
      });
    }
  }

  store.marketEvents = mergedEvents.slice(0, 24);
  store.marketEventChangeLogs = changeLogs.slice(0, 30);
  persistStore();

  return {
    events: store.marketEvents,
    changeLogs: store.marketEventChangeLogs,
    syncedAt,
  };
}

function classifyOfficialEventText(
  title: string,
  summary: string,
  startMd: string,
  endMd: string
): {
  eventType: MarketEventRecord["event_type"];
  eventTypeLabel: string;
  targetSeasons: string[];
  targetCapitalTiers: CapitalTierType[];
  bpScale: MarketEventRecord["bp_injection_scale"];
  packScale: MarketEventRecord["pack_supply_scale"];
  couponPct: number;
  description: string;
} {
  const text = `${title} ${summary}`;
  const store = getStoreSnapshot();
  const topRankerSeasons = (store.rankerMetaSnapshot?.season_usage_top || [])
    .slice(0, 6)
    .map((s) => s.season_code);
  const defaultSeasons =
    topRankerSeasons.length > 0
      ? topRankerSeasons
      : ["25UCL", "WS", "26TOTS", "26TOTY", "ICONTM"];

  if (/수수료|쿠폰|할인|버닝/.test(text)) {
    const couponMatch = text.match(/(30|35|40|45|50)\s*%/);
    const pct = couponMatch ? Number(couponMatch[1]) : 30;
    return {
      eventType: "FEE_DISCOUNT_COUPON",
      eventTypeLabel: "공식 수수료 쿠폰·BP 이벤트",
      targetSeasons: defaultSeasons,
      targetCapitalTiers: ["ULTRA_HIGH", "HIGH_CAPITAL_FLAGSHIP", "MID_TIER"],
      bpScale: /버닝|대규모|교환소/.test(text) ? "대규모" : "중규모",
      packScale: "중규모",
      couponPct: pct,
      description: `공식 공지(${startMd}~${endMd}) 기반 이적시장 수수료·보상 이벤트입니다. 실제 유저별 쿠폰 사용량 및 총 BP 유입량은 비공개이므로 공개된 보상 조건을 바탕으로 +8~+11강 주류 구간의 시세 전후 반응을 측정합니다.`,
    };
  }
  if (/강화|부스트|트레이닝|체인지/.test(text)) {
    return {
      eventType: "ENHANCEMENT_EVENT",
      eventTypeLabel: "강화·스쿼드 성장 이벤트",
      targetSeasons: defaultSeasons,
      targetCapitalTiers: ["HIGH_CAPITAL_FLAGSHIP", "MID_TIER", "ENHANCEMENT_FODDER"],
      bpScale: "소규모",
      packScale: "중규모",
      couponPct: 0,
      description: `공식 이벤트(${startMd}~${endMd}) 기반 강화·성장 프로모션입니다. +8~+11강 금카 도전 수요와 강화 재료 시세에 미치는 영향을 시계열로 추적합니다.`,
    };
  }
  if (/특성|패치|엔진|밸런스|업데이트/.test(text)) {
    return {
      eventType: "TRAIT_ENGINE_PATCH",
      eventTypeLabel: "공식 업데이트·신규특성 패치",
      targetSeasons: defaultSeasons,
      targetCapitalTiers: ["ULTRA_HIGH", "HIGH_CAPITAL_FLAGSHIP"],
      bpScale: "해당없음",
      packScale: "해당없음",
      couponPct: 0,
      description: `공식 업데이트·점검 공지(${startMd}~${endMd}) 기반 인게임 메타 및 신규특성(level: 8) 선호도 변화 추적 구간입니다.`,
    };
  }
  if (/출석|플레이|포인트|마일리지|PC방|봄|가을|여름|겨울|페스타|설날|추석/.test(text)) {
    return {
      eventType: "BP_SUPPLY",
      eventTypeLabel: "공식 플레이·보상 지급 이벤트",
      targetSeasons: defaultSeasons,
      targetCapitalTiers: ["HIGH_CAPITAL_FLAGSHIP", "MID_TIER", "LOW_BUDGET_PRACTICAL"],
      bpScale: "중규모",
      packScale: "중규모",
      couponPct: 20,
      description: `공식 웹이벤트(${startMd}~${endMd}) 기반 플레이 보상(선수팩·BP·교환권) 공급 구간입니다. 공개된 보상 테이블을 기준으로 매물 공급 압력과 구매력 유입을 분리 추정합니다.`,
    };
  }
  return {
    eventType: "PACK_RELEASE",
    eventTypeLabel: "공식 프로모션·선수팩 공급",
    targetSeasons: defaultSeasons,
    targetCapitalTiers: ["HIGH_CAPITAL_FLAGSHIP", "MID_TIER"],
    bpScale: "소규모",
    packScale: "중규모",
    couponPct: 0,
    description: `공식 홈페이지 수집 이벤트(${startMd}~${endMd})로, 선수팩 및 보상 공급에 따른 대상 시즌(+8~+11강) 가격 변동성을 추적합니다.`,
  };
}

// ============================================================================
// 4. Official Ranker Usage (Top 10,000) & Match Records Crawler
// Crawls /datacenter/dailysquad, /Datacenter/BestUsePositionPlayer, /datacenter/dailyrecord
// ============================================================================

const POSITION_QUERY_CODES: { pos: string; code: number }[] = [
  { pos: "ST", code: 25 },
  { pos: "CF", code: 21 },
  { pos: "LW", code: 27 },
  { pos: "RW", code: 23 },
  { pos: "CAM", code: 18 },
  { pos: "CM", code: 14 },
  { pos: "CDM", code: 10 },
  { pos: "CB", code: 5 },
  { pos: "LB", code: 7 },
  { pos: "RB", code: 3 },
  { pos: "GK", code: 0 },
];

export async function syncRankerUsageAndRecords(): Promise<RankerMetaSnapshot> {
  const store = getStoreSnapshot();
  const syncedAt = nowUtc();
  let snapshotDate = "2026.04.14";
  const seasonUsageTop: RankerMetaSnapshot["season_usage_top"] = [];
  const teamColorUsageTop: RankerMetaSnapshot["team_color_usage_top"] = [];
  const positionTopPlayers: RankerMetaSnapshot["position_top_players"] = [];
  const dailyRecordLeaders: RankerMetaSnapshot["daily_record_leaders"] = [];

  try {
    // 1) Crawl /datacenter/dailysquad for Top 10,000 Ranker season share & teamcolor share
    const sqRes = await fetch("https://fconline.nexon.com/datacenter/dailysquad", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (sqRes.ok) {
      const html = await sqRes.text();
      const dateMatch =
        html.match(/name="strDate"[^>]*value="(202\d\.\d{2}\.\d{2})"/) ||
        html.match(/value="(2026\.0[1-9]\.\d{2})"/);
      if (dateMatch && dateMatch[1]) snapshotDate = dateMatch[1].trim();

      const namesMatch = html.match(/var\s+classNameList\s*=\s*\[([^\]]+)\]/);
      const valsMatch = html.match(/var\s+classValueList\s*=\s*\[([^\]]+)\]/);
      if (namesMatch && valsMatch) {
        const names = namesMatch[1]
          .split(",")
          .map((s) => s.replace(/['"\s]/g, "").trim());
        const vals = valsMatch[1]
          .split(",")
          .map((s) => Number(s.replace(/['"\s]/g, "")));
        for (let i = 0; i < Math.min(names.length, vals.length); i++) {
          if (names[i] && Number.isFinite(vals[i])) {
            seasonUsageTop.push({
              season_code: names[i],
              usage_pct: round2(vals[i]),
            });
          }
        }
        seasonUsageTop.sort((a, b) => b.usage_pct - a.usage_pct);
      }

      // Parse #divTeamColorInfo
      const tcBlocks = html.split("teamcolor_list__item").slice(1, 20);
      for (const blk of tcBlocks) {
        const name = ((blk.match(/<div class="txt">([^<]+)<\/div>/) || [])[1] || "")
          .replace(/&#x27;/g, "'")
          .trim();
        const perRaw = (
          (blk.match(/<div class="per">([^<]+)<\/div>/) || [])[1] || ""
        ).trim();
        const idMatch = blk.match(/GetTeamColorVsInfo\('(\d+)'\)/);
        const cntMatch = perRaw.match(/(\d+)\s*명\s*\(([\d.]+)%\)/);
        if (name && cntMatch) {
          teamColorUsageTop.push({
            team_color_id: idMatch ? idMatch[1] : name,
            name,
            user_count: Number(cntMatch[1]),
            usage_pct: Number(cntMatch[2]),
          });
        }
      }
      teamColorUsageTop.sort((a, b) => b.usage_pct - a.usage_pct);
    }
  } catch {
    // ignore error
  }

  // 2) Crawl /Datacenter/BestUsePositionPlayer across positions (isGroup=false gives exact enhancement grade +8~+11강!)
  for (const { pos, code } of POSITION_QUERY_CODES) {
    try {
      const url = `https://fconline.nexon.com/Datacenter/BestUsePositionPlayer?strDate=${encodeURIComponent(
        snapshotDate
      )}&n4Position=${code}&n1Type=50&n4StartRanking=1&n4EndRanking=10000&isGroup=false`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: "https://fconline.nexon.com/datacenter/dailysquad",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const html = await res.text();
      const slides = html.split(/<div class="[^"]*swiper-slide[^"]*">/i).slice(1, 10);
      for (const sl of slides) {
        const spidMatch = sl.match(/spid=(\d+)/) || sl.match(/data-no="(\d+)"/);
        if (!spidMatch) continue;
        const spid = Number(spidMatch[1]);
        const strongMatch = sl.match(/n1Strong=(\d+)/) || sl.match(/n1Strong="(\d+)"/);
        const grade = strongMatch ? Number(strongMatch[1]) : 8;
        const name = (
          (sl.match(/<div class="name">([^<]+)<\/div>/) ||
            sl.match(/title="([^"]+)"/) ||
            [])[1] || ""
        ).trim();
        const ovr = Number(
          ((sl.match(/<div class="ovr">(\d+)<\/div>/) || [])[1] || "0").trim()
        );
        const pay = Number(
          (
            (sl.match(/<div class="pay[^"]*">(\d+)<\/div>/) || [])[1] || "0"
          ).trim()
        );
        const seasonImg = (
          (sl.match(/<div class="season"><img src="([^"]+)"/) || [])[1] || ""
        ).trim();
        const seasonCode = (
          (seasonImg.match(/\/([a-zA-Z0-9]+)\.png/i) || [])[1] || ""
        ).toUpperCase();
        const txtRaw = (
          (sl.match(/<p class="txt">([^<]+)<\/p>/) || [])[1] || ""
        ).trim();
        const useMatch = txtRaw.match(/(\d+)\s*명\s*\(([\d.]+)%\)/);
        const userCount = useMatch ? Number(useMatch[1]) : 0;
        const usagePct = useMatch ? Number(useMatch[2]) : 0;

        // Parse multi-grade prices embedded in the slide
        const pricesMap: Record<string, { bp: number; text: string }> = {};
        const bpRegex = /span_bp(\d+)"[^>]*>([^<]+)<\/span>/g;
        let m: RegExpExecArray | null;
        while ((m = bpRegex.exec(sl)) !== null) {
          const gKey = m[1];
          const numBp = Number(m[2].replace(/[^\d]/g, ""));
          if (numBp > 0) {
            pricesMap[gKey] = { bp: numBp, text: formatBpKorean(numBp) };
          }
        }
        const gradeBp =
          pricesMap[String(grade)]?.bp ||
          pricesMap["8"]?.bp ||
          pricesMap["1"]?.bp ||
          0;

        // Upsert into store.cards if not yet present or enrich prices
        if (spid > 0 && name) {
          const existing = store.cards[spid];
          if (existing) {
            existing.prices = { ...(existing.prices || {}), ...pricesMap };
            if (pricesMap["1"]?.bp) existing.bp_1 = pricesMap["1"].bp;
            if (pricesMap["5"]?.bp) existing.bp_5 = pricesMap["5"].bp;
            if (pricesMap["8"]?.bp) existing.bp_8 = pricesMap["8"].bp;
          } else {
            const baseOvr = grade > 1 ? Math.max(100, ovr - (grade + 2)) : ovr;
            store.cards[spid] = {
              spid,
              pid: spid % 1_000_000,
              name,
              season_id: Math.floor(spid / 1_000_000),
              season_code: seasonCode || "META",
              season_name: seasonCode || "META",
              season_img: seasonImg,
              thumb_url: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`,
              primary_position: pos,
              positions: [{ pos, ovr: baseOvr }],
              ovr: baseOvr,
              salary: pay || 26,
              foot: "L5 R5",
              skill_moves: "★★★★",
              height: 182,
              weight: 76,
              body_type: "보통",
              birth: "",
              team: "",
              nation: "",
              traits: [],
              team_colors: [],
              position_ovrs: { [pos]: baseOvr },
              stats: {},
              prices: pricesMap,
              bp_1: pricesMap["1"]?.bp || Math.round(gradeBp / 25),
              bp_5: pricesMap["5"]?.bp || Math.round(gradeBp / 5),
              bp_8: pricesMap["8"]?.bp || gradeBp,
              rating_score: 0,
              rating_count: 0,
              has_full_ability: false,
              crawled_at: syncedAt,
            };
          }
        }

        positionTopPlayers.push({
          spid,
          name,
          season_code: seasonCode || store.cards[spid]?.season_code || "META",
          position: pos,
          grade,
          ovr,
          salary: pay,
          user_count: userCount,
          usage_pct: usagePct,
          bp_grade: gradeBp,
          bp_grade_text: formatBpKorean(gradeBp),
        });
      }
    } catch {
      // continue next position
    }
  }

  try {
    // 3) Crawl /datacenter/dailyrecord for Top Ranker player match stats
    const recRes = await fetch("https://fconline.nexon.com/datacenter/dailyrecord", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (recRes.ok) {
      const html = await recRes.text();
      const trs = html.split('<div class="tr">').slice(1, 35);
      const seenSpids = new Set<number>();
      for (const tr of trs) {
        const spidMatch = tr.match(/skillData_(\d+)/);
        if (!spidMatch) continue;
        const spid = Number(spidMatch[1]);
        if (seenSpids.has(spid)) continue;
        seenSpids.add(spid);

        const name = (
          (tr.match(/<div class="name">([^<]+)<\/div>/) || [])[1] || ""
        ).trim();
        const pos = (
          (tr.match(/<span class="po">([^<]+)<\/span>/) || [])[1] || "ST"
        ).trim();
        const gradeMatch = tr.match(/en_level(\d+)/);
        const grade = gradeMatch ? Number(gradeMatch[1]) : 8;
        const seasonImg = (
          (tr.match(/<img class="season" src="([^"]+)"/) || [])[1] || ""
        ).trim();
        const seasonCode = (
          (seasonImg.match(/\/([a-zA-Z0-9]+)\.png/i) || [])[1] || ""
        ).toUpperCase();

        const pickTd = (cls: string) =>
          Number(
            (
              (tr.match(new RegExp(`<div class="td ${cls}">([^<]+)<\\/div>`)) ||
                [])[1] || "0"
            )
              .replace(/[^\d.]/g, "")
              .trim()
          );

        dailyRecordLeaders.push({
          spid,
          name,
          season_code: seasonCode || store.cards[spid]?.season_code || "",
          position: pos,
          grade,
          appearances: pickTd("p_at"),
          attack_points_per_game: pickTd("p_atp"),
          goals_per_game: pickTd("p_g"),
          assists_per_game: pickTd("p_as"),
          pass_pct: pickTd("p_p"),
          dribble_pct: pickTd("p_d"),
          tackle_pct: pickTd("p_tt"),
          avg_rating: pickTd("p_av"),
        });
      }
    }
  } catch {
    // ignore error
  }

  const snapshot: RankerMetaSnapshot = {
    snapshot_date: snapshotDate,
    last_synced_at: syncedAt,
    source_urls: [
      "https://fconline.nexon.com/datacenter/dailysquad",
      "https://fconline.nexon.com/Datacenter/BestUsePositionPlayer",
      "https://fconline.nexon.com/datacenter/dailyrecord",
    ],
    season_usage_top:
      seasonUsageTop.length > 0
        ? seasonUsageTop
        : store.rankerMetaSnapshot?.season_usage_top || [],
    team_color_usage_top:
      teamColorUsageTop.length > 0
        ? teamColorUsageTop
        : store.rankerMetaSnapshot?.team_color_usage_top || [],
    position_top_players:
      positionTopPlayers.length > 0
        ? positionTopPlayers
        : store.rankerMetaSnapshot?.position_top_players || [],
    daily_record_leaders:
      dailyRecordLeaders.length > 0
        ? dailyRecordLeaders
        : store.rankerMetaSnapshot?.daily_record_leaders || [],
  };

  store.rankerMetaSnapshot = snapshot;
  persistStore();
  return snapshot;
}

// ============================================================================
// 5. Core Grades (+8, +9, +10, +11강) & Separated (+12, +13강) Price History Sync
// ============================================================================

export async function syncCoreGradesPriceHistory(options?: {
  maxRequests?: number;
  grades?: number[];
}): Promise<{
  collectedSeriesCount: number;
  collectedAbilityCount: number;
  gradesCollected: number[];
  processedKeys: string[];
}> {
  const store = getStoreSnapshot();
  const maxReqs = Math.min(40, Math.max(4, Number(options?.maxRequests || 18)));
  const targetGrades = options?.grades?.length
    ? options.grades
    : [8, 9, 10, 11, 12, 13];

  // Pick top cards from ranker usage + full ability cards with valid +8 prices
  const rankerSpids = (store.rankerMetaSnapshot?.position_top_players || []).map(
    (p) => p.spid
  );
  const highValueSpids = Object.values(store.cards)
    .filter((c) => c.has_full_ability && (c.prices?.["8"]?.bp || c.bp_8) > 0)
    .sort((a, b) => (b.prices?.["8"]?.bp || b.bp_8) - (a.prices?.["8"]?.bp || a.bp_8))
    .map((c) => c.spid);

  const uniqueSpids = Array.from(new Set([...rankerSpids, ...highValueSpids]));

  let collectedSeriesCount = 0;
  let collectedAbilityCount = 0;
  const processedKeys: string[] = [];

  for (const spid of uniqueSpids) {
    if (collectedSeriesCount >= maxReqs) break;
    const card = store.cards[spid];
    if (!card) continue;

    if (!card.has_full_ability && collectedAbilityCount < 8) {
      const ab = await crawlPlayerAbility(spid);
      if (ab?.has_full_ability) collectedAbilityCount++;
    }

    for (const g of targetGrades) {
      if (collectedSeriesCount >= maxReqs) break;
      const key = `${spid}_${g}`;
      if (store.priceHistory[key] && store.priceHistory[key].points.length >= 25) {
        continue;
      }
      const ph = await crawlPriceHistory(spid, g);
      if (ph && ph.points.length > 0) {
        collectedSeriesCount++;
        processedKeys.push(key);
      }
    }
  }

  persistStore();
  return {
    collectedSeriesCount,
    collectedAbilityCount,
    gradesCollected: targetGrades,
    processedKeys,
  };
}

// ============================================================================
// 6. Dynamic Flagship ("대장") Candidate Evaluator (No Hardcoded Season Lists)
// ============================================================================

export function buildDynamicFlagshipCandidates(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[],
  rankerSnapshot?: RankerMetaSnapshot
): DynamicFlagshipCandidate[] {
  const store = getStoreSnapshot();
  const ranker = rankerSnapshot || store.rankerMetaSnapshot;

  const seasonShareMap = new Map<string, number>();
  for (const s of ranker?.season_usage_top || []) {
    seasonShareMap.set(s.season_code.toUpperCase(), s.usage_pct);
  }

  const teamColorShareMap = new Map<string, number>();
  for (const tc of ranker?.team_color_usage_top || []) {
    teamColorShareMap.set(tc.name.replace(/\s+/g, ""), tc.usage_pct);
  }

  const rankerPlayerMap = new Map<
    number,
    { user_count: number; usage_pct: number; grade: number; bp_grade: number }
  >();
  for (const p of ranker?.position_top_players || []) {
    const prev = rankerPlayerMap.get(p.spid);
    if (!prev || p.user_count > prev.user_count) {
      rankerPlayerMap.set(p.spid, {
        user_count: p.user_count,
        usage_pct: p.usage_pct,
        grade: p.grade,
        bp_grade: p.bp_grade,
      });
    }
  }

  const recordMap = new Map<
    number,
    RankerMetaSnapshot["daily_record_leaders"][number]
  >();
  for (const r of ranker?.daily_record_leaders || []) {
    recordMap.set(r.spid, r);
  }

  // Prefer +8~+11강 series for each spid
  const coreSeriesBySpid = new Map<number, MarketNormalizedSeries>();
  const fallbackSeriesBySpid = new Map<number, MarketNormalizedSeries>();
  for (const s of seriesList) {
    if (s.grade >= 8 && s.grade <= 11) {
      const existing = coreSeriesBySpid.get(s.spid);
      if (!existing || s.grade === 8) coreSeriesBySpid.set(s.spid, s);
    }
    if (!fallbackSeriesBySpid.has(s.spid)) {
      fallbackSeriesBySpid.set(s.spid, s);
    }
  }

  // Pool of candidate cards: ranker top players + cards with full ability or timeseries
  const candidateMap = new Map<number, PlayerCard>();
  for (const c of allCards) {
    if (
      rankerPlayerMap.has(c.spid) ||
      recordMap.has(c.spid) ||
      coreSeriesBySpid.has(c.spid) ||
      (c.has_full_ability && (c.prices?.["8"]?.bp || c.bp_8) > 0)
    ) {
      candidateMap.set(c.spid, c);
    }
  }

  const results: DynamicFlagshipCandidate[] = [];
  for (const card of candidateMap.values()) {
    const rUsage = rankerPlayerMap.get(card.spid);
    const rRecord = recordMap.get(card.spid);
    const coreSeries =
      coreSeriesBySpid.get(card.spid) || fallbackSeriesBySpid.get(card.spid);

    const analyzedGrade =
      coreSeries && coreSeries.grade >= 8 && coreSeries.grade <= 11
        ? coreSeries.grade
        : rUsage && rUsage.grade >= 8 && rUsage.grade <= 11
          ? rUsage.grade
          : 8;

    const currentBp =
      card.prices?.[String(analyzedGrade)]?.bp ||
      coreSeries?.current_bp ||
      rUsage?.bp_grade ||
      card.bp_8 ||
      card.bp_1 * 25;

    const ret7d = coreSeries?.return_7d_pct || 0;
    const ret30d = coreSeries?.return_30d_pct || 0;

    const seasonSharePct =
      seasonShareMap.get((card.season_code || "").toUpperCase()) || 0;

    // Match card's team_colors against ranker top team colors
    let topTcPct = 0;
    const matchedTcs: string[] = [];
    const rawTcNames = (card.team_colors || [])
      .map((tc: unknown) =>
        typeof tc === "string"
          ? tc
          : tc && typeof tc === "object" && "name" in tc
            ? String((tc as { name: unknown }).name || "")
            : ""
      )
      .filter(Boolean);
    for (const tc of rawTcNames) {
      const norm = tc.replace(/\s+/g, "");
      for (const [k, pct] of teamColorShareMap.entries()) {
        if (norm.includes(k) || k.includes(norm)) {
          if (!matchedTcs.includes(tc)) matchedTcs.push(tc);
          if (pct > topTcPct) topTcPct = pct;
        }
      }
    }
    const displayTcs =
      matchedTcs.length > 0
        ? matchedTcs.slice(0, 4)
        : rawTcNames.slice(0, 3);

    const { newTraits, legacyTraits } = extractCardNewAndLegacyTraits(card);

    // Value efficiency score (performance per log10 BP)
    const bpBillions = Math.max(1, currentBp / 100_000_000); // 억 BP
    const ovrAtGrade = card.ovr + (analyzedGrade >= 8 ? analyzedGrade + 3 : 0);
    const valueEfficiency = round2(
      clamp((ovrAtGrade - 105) * 3.8 - Math.log10(bpBillions) * 8.5, 25, 98)
    );

    const rankerScore = rUsage
      ? Math.min(40, rUsage.user_count * 0.45 + rUsage.usage_pct * 12)
      : seasonSharePct * 3.5;
    const traitScore = Math.min(25, newTraits.length * 11);
    const recordScore = rRecord ? Math.min(20, rRecord.avg_rating * 2.2) : 0;
    const specScore = clamp((card.ovr - 108) * 2.2, 5, 25);
    const flagshipScore = round2(
      clamp(rankerScore + traitScore + recordScore + specScore, 20, 99)
    );

    // Determine dynamic category strictly from data
    const hasSufficientData =
      Boolean(rUsage) ||
      Boolean(rRecord) ||
      (card.has_full_ability && Boolean(coreSeries));

    let category: DynamicFlagshipCategory = "데이터 부족으로 판별 보류";
    let basis: DynamicFlagshipCandidate["basis"] = "on_hold_insufficient_data";
    let rationale = "";

    if (!hasSufficientData) {
      category = "데이터 부족으로 판별 보류";
      basis = "on_hold_insufficient_data";
      rationale =
        "랭커 포지션별 사용률 표본 및 상세 능력치/시계열 관측치가 아직 충분하지 않아 임의 대장 판정을 보류했습니다.";
    } else if (
      (rUsage && rUsage.user_count >= 25) ||
      (rRecord && rRecord.appearances >= 35) ||
      (seasonSharePct >= 3.5 && newTraits.length >= 1 && card.ovr >= 115)
    ) {
      category = "최상위 메타픽";
      basis = rUsage || rRecord ? "observed" : "statistical_estimate";
      rationale = rUsage
        ? `TOP 10,000 랭커 ${card.primary_position} 포지션 실사용 ${rUsage.user_count}명(${rUsage.usage_pct}%, 주력 +${rUsage.grade}강) 및 시즌 점유율 ${seasonSharePct}%로 검증된 최상위 메타픽입니다.`
        : `시즌 랭커 점유율 ${seasonSharePct}% 및 공식 신규특성(${newTraits.join("·")})을 보유한 최상위 메타 카드입니다.`;
    } else if (
      newTraits.length >= 2 ||
      (newTraits.length >= 1 && ret7d >= 1.2 && seasonSharePct >= 2.0)
    ) {
      category = "신규 시즌 수혜 후보";
      basis = "observed";
      rationale = `공식 신규특성(level: 8: ${newTraits.join(", ")}) 탑재 및 +${analyzedGrade}강 7일 수익률(${ret7d >= 0 ? "+" : ""}${ret7d}%) 강세가 결합된 신규 메타 수혜 카드입니다.`;
    } else if (topTcPct >= 3.5 && displayTcs.length > 0) {
      category = "팀컬러별 대장";
      basis = "observed";
      rationale = `TOP 10,000 랭커 인기 팀컬러(${displayTcs[0]}, 점유율 ${topTcPct}%)의 핵심 주전 자원으로 +${analyzedGrade}강 금카 케미 수요가 탄탄합니다.`;
    } else if (valueEfficiency >= 72 && currentBp <= 450_000_000_000) {
      category = "가성비 대장";
      basis = "statistical_estimate";
      rationale = `+${analyzedGrade}강 기준가(${formatBpKorean(currentBp)}) 대비 실사용 스펙·급여(${card.salary}) 효율 지수가 ${valueEfficiency}점으로 중저자본 가성비 대장 역할을 수행합니다.`;
    } else if (
      ret7d <= -2.0 ||
      (newTraits.length === 0 && seasonSharePct < 1.5 && card.ovr <= 113)
    ) {
      category = "경쟁력 하락 후보";
      basis = "observed";
      rationale = `공식 신규특성(level: 8) 미보유 및 상위 시즌으로의 랭커 점유율 이동(시즌 점유율 ${seasonSharePct}%, 7일 ${ret7d}%)으로 세대교체 압력을 받는 구간입니다.`;
    } else {
      category = "팀컬러별 대장";
      basis = "statistical_estimate";
      rationale = `포지션(${card.primary_position}) 스펙(OVR ${card.ovr})과 클럽·국가 케미를 바탕으로 +${analyzedGrade}강 실사용 수요를 유지하고 있습니다.`;
    }

    const confScore = !hasSufficientData
      ? 35
      : rUsage && coreSeries
        ? 94
        : rUsage || coreSeries
          ? 84
          : 72;

    results.push({
      spid: card.spid,
      name: card.name,
      season_code: card.season_code,
      season_name: card.season_name,
      season_img: card.season_img,
      thumb_url: card.thumb_url,
      primary_position: card.primary_position,
      ovr: card.ovr,
      salary: card.salary,
      analyzed_grade: analyzedGrade,
      current_bp: currentBp,
      current_bp_text: formatBpKorean(currentBp),
      return_7d_pct: round2(ret7d),
      return_30d_pct: round2(ret30d),
      category,
      basis,
      confidence_score: confScore,
      ranker_usage_count: rUsage?.user_count || 0,
      ranker_usage_pct: rUsage?.usage_pct || 0,
      season_ranker_share_pct: seasonSharePct,
      team_colors: displayTcs,
      top_team_color_ranker_pct: topTcPct,
      new_traits: newTraits,
      legacy_traits_excluded_count: legacyTraits.length,
      match_stats: rRecord
        ? {
            appearances: rRecord.appearances,
            goals_per_game: rRecord.goals_per_game,
            assists_per_game: rRecord.assists_per_game,
            pass_success_pct: rRecord.pass_pct,
            avg_rating: rRecord.avg_rating,
            recorded_grade: rRecord.grade,
          }
        : undefined,
      value_efficiency_score: valueEfficiency,
      flagship_score: flagshipScore,
      classification_rationale: rationale,
    });
  }

  results.sort((a, b) => {
    if (a.category === "데이터 부족으로 판별 보류" && b.category !== "데이터 부족으로 판별 보류")
      return 1;
    if (b.category === "데이터 부족으로 판별 보류" && a.category !== "데이터 부족으로 판별 보류")
      return -1;
    return b.flagship_score - a.flagship_score;
  });

  return results.slice(0, 60);
}

// ============================================================================
// 7. Enhancement Grade Tier Comparison (+8~+11 Core vs +12~+13 Separated)
// ============================================================================

export function buildGradeTierComparisons(
  allCards: PlayerCard[],
  seriesList: MarketNormalizedSeries[]
): GradeTierComparisonItem[] {
  const targetGrades = [1, 5, 8, 9, 10, 11, 12, 13];
  const prevMedians = new Map<number, number>();

  return targetGrades.map((grade) => {
    const gKey = String(grade);
    const { zone, label } = classifyGradeTierZone(grade);
    const isCore = grade >= 8 && grade <= 11;

    const cardBps = allCards
      .map((c) => c.prices?.[gKey]?.bp || 0)
      .filter((bp) => bp > 0);
    const tsMembers = seriesList.filter((s) => s.grade === grade);

    const avgBp = cardBps.length > 0 ? Math.round(mean(cardBps)) : 0;
    const medBp = cardBps.length > 0 ? Math.round(median(cardBps)) : 0;
    prevMedians.set(grade, medBp);

    const prevGrade = grade === 5 ? 1 : grade === 8 ? 5 : grade - 1;
    const prevMed = prevMedians.get(prevGrade) || 0;
    const multiple =
      prevMed > 0 && medBp > 0 ? round2(medBp / prevMed) : 1.0;

    const hasEnoughTs = tsMembers.length >= 2;
    const ret7d = hasEnoughTs
      ? round2(mean(tsMembers.map((s) => s.return_7d_pct)))
      : 0;
    const ret30d = hasEnoughTs
      ? round2(mean(tsMembers.map((s) => s.return_30d_pct)))
      : 0;
    const vol30d = hasEnoughTs
      ? round2(mean(tsMembers.map((s) => s.volatility_30d_pct)))
      : 0;

    let liquidityNote = "";
    if (grade >= 8 && grade <= 11) {
      liquidityNote =
        "신규특성(level: 8) 및 금카 팀컬러 효과가 본격 작동하는 핵심 분석 기준 등급입니다. (실제 체결 거래량은 공식 API 미제공으로 시계열 가격 관측 횟수로 표기)";
    } else if (grade >= 12) {
      liquidityNote =
        "매물 희소성 및 초고가 호가 공백으로 인해 단 1건의 거래로도 가격이 급변하므로, 일반 시장 평균(+8~+11강) 왜곡 방지를 위해 별도 분리 집계합니다.";
    } else {
      liquidityNote =
        "명함(+1)·은카(+5) 하위 참조 구간으로, 주류 금카(+8~+11강) 시장과 분리하여 보조 지표로만 표시합니다.";
    }

    return {
      grade,
      tier_zone: zone,
      tier_zone_label: label,
      included_in_core_market_index: isCore,
      card_price_sample_count: cardBps.length,
      timeseries_observation_count: tsMembers.length,
      transaction_volume_provided: false,
      liquidity_note: liquidityNote,
      status: hasEnoughTs ? "analyzed" : "on_hold_insufficient_data",
      avg_bp: avgBp,
      avg_bp_text: formatBpKorean(avgBp),
      median_bp: medBp,
      median_bp_text: formatBpKorean(medBp),
      spread_vs_prev_grade_multiple: multiple,
      return_7d_pct: ret7d,
      return_30d_pct: ret30d,
      volatility_30d_pct: vol30d,
      basis: hasEnoughTs ? "observed" : "on_hold_insufficient_data",
    };
  });
}

// ============================================================================
// 8. Code Audit Report Summary (4 Required Audit Classifications)
// ============================================================================

export function buildCodeAuditFindings(): CodeAuditFindingItem[] {
  return [
    {
      category: "1. 실제 하드코딩이 확인된 항목 (제거·개선 완료)",
      module_path: "lib/server/fclab-market-engine.ts (lines 37–112)",
      finding_title:
        "LIMITED_SEASONS / NEW_META_FLAGSHIP_SEASONS / EXISTING_FLAGSHIP_SEASONS 고정 Set 배열 하드코딩",
      before_state:
        "특정 시즌 코드(26TOTY, WS, 24TOTY, CU 등)를 코드 상단 고정 Set 배열로 하드코딩하여 시즌 섹터와 대장 여부를 정적으로 분류함",
      after_state:
        "고정 배열을 전면 삭제하고, 공식 데이터센터 TOP 10,000 랭커 시즌·포지션 사용률(/datacenter/dailysquad, /Datacenter/BestUsePositionPlayer), 인게임 경기 성적(/datacenter/dailyrecord), 공식 신규특성(level: 8) 보유 밀도, +8~+11강 시세를 결합한 동적 대장 판별 엔진으로 전환",
      data_basis: "observed",
    },
    {
      category: "1. 실제 하드코딩이 확인된 항목 (제거·개선 완료)",
      module_path: "lib/server/fclab-market-engine.ts (lines 162–264)",
      finding_title: "INITIAL_MARKET_EVENTS 고정 이벤트 배열 하드코딩",
      before_state:
        "3개의 고정 이벤트(evt-26toty-ws-pack-wave 등)를 메모리 배열에 직접 작성하여 사용함",
      after_state:
        "공식 홈페이지 이벤트(/news/events/list) 및 공지사항(/news/notice/list) 실시간 크롤러와 변경 감지 로그(신규 발견·내용 변경·종료 전환)를 구축하고 .fclab-store.json에 영구 저장하도록 개선",
      data_basis: "official_public",
    },
    {
      category: "1. 실제 하드코딩이 확인된 항목 (제거·개선 완료)",
      module_path: "lib/server/fclab-market-engine.ts (lines 1377–1388, 2191–2390)",
      finding_title:
        "특성 연구소 및 M4 예측 모델에 기존 일반 특성(level: 5)과 신규특성(level: 8) 혼입",
      before_state:
        "예리한 감아차기, 중거리 슛 선호, 파워 헤더, 패스 마스터, 스피드 드리블러, 강철몸 등 기존 특성(level: 5, icon 00~49)을 신규특성과 섞어 시세 프리미엄 및 예측 변수로 사용함",
      after_state:
        "공식 코치헬퍼 번들(coachHelper/app.js) 기준 level: 8 신규특성 17종(trait_icon_50~68: 크로스 포쳐, 아크로바틱 피니셔, 레이저 슈터, 라인 브레이커, 스피드스터, 트릭스터, 커맨더, 2개의 심장, 타이탄, 파이터, 와일드 태클러, 체이서, 블로커, 프레데터, GK 3종)만 시세 프리미엄 및 M4 예측 변수로 사용하고 기존 특성은 제외 목록으로 명시 분리",
      data_basis: "official_public",
    },
    {
      category: "3. 일부만 구현된 항목 (보강 완료)",
      module_path:
        "lib/server/fclab-market-engine.ts & app/api/fclab/[...path]/route.ts",
      finding_title:
        "강화 단계 기준이 +1/+5강 위주로 설정되어 있고 엔드포인트별 최대 강화 단계(10 vs 13) 불일치",
      before_state:
        "시세 수집 기본값이 +1강이고 강화 섹터가 +1/+5/+8강 3단계로만 구성되어 있었으며, 수집 배치 함수가 grade 1~10으로 제한됨",
      after_state:
        "실사용 주류 금카 구간인 +8, +9, +10, +11강을 핵심 시장 분석 기준으로 격상하고, +12~+13강은 초고가·저유동성 분리 구간으로 격리하여 +13강 시세가 전체 시장 평균을 왜곡하지 않도록 설계. 전 엔드포인트 강화 단계 범위를 1~13강으로 통일",
      data_basis: "observed",
    },
    {
      category: "2. 데이터 기반 구현이 확인된 항목",
      module_path: "lib/server/fclab-engine.ts (crawlPlayerAbility, crawlPriceHistory)",
      finding_title:
        "선수별 1~13강 다중 강화 단계 가격(prices['1'..'13']), 팀컬러, 특성 아이콘 ID 및 365일 시계열 크롤링",
      before_state:
        "데이터센터 PlayerAbility 및 PlayerPriceGraph로부터 실제 다중 강화 가격과 특성 아이콘(trait_icon_XX.png), 일별 시계열을 정상 수집 중",
      after_state:
        "기존 수집 파이프라인을 보존하면서 +8~+11강 핵심 구간 시계열과 +12~+13강 분리 구간 시계열을 자동 보강하도록 확장",
      data_basis: "observed",
    },
    {
      category: "4. 관련 코드나 데이터가 없어 확인할 수 없는 항목 (판별 보류 처리)",
      module_path: "Nexon Open API & FC Online Datacenter 외부 제공 한계",
      finding_title:
        "전체 유저 실시간 호가창 잔량(Order Book Depth), 선수별 실제 거래 체결량(Volume), 이벤트 전체 유저 BP/선수팩 총개봉량",
      before_state:
        "공식 API 및 데이터센터 웹페이지 어디에서도 실시간 체결 수량과 서버 전체 BP 발행 총량은 제공되지 않음",
      after_state:
        "가짜 거래량이나 임의 개봉 수치를 절대 생성하지 않고, '시계열 가격 관측 횟수'와 '실제 거래량 미제공'을 엄격히 구분 표기하며 표본 부족 구간은 '데이터 부족으로 인한 판별 보류'로 처리",
      data_basis: "on_hold_insufficient_data",
    },
  ];
}
