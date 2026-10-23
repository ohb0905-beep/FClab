import math
import json
from typing import Dict, Any, List, Optional
from database import get_connection, row_to_card_dict, now_iso
from crawler import ENHANCEMENT_BONUS, format_bp_korean, crawl_player_ability

# 포지션별 핵심 능력치 가중치 정의 (합계 = 1.0)
POSITION_WEIGHTS: Dict[str, Dict[str, float]] = {
    "ST": {
        "골 결정력": 0.20,
        "위치 선정": 0.16,
        "속력": 0.14,
        "가속력": 0.13,
        "슛 파워": 0.12,
        "드리블": 0.08,
        "몸싸움": 0.09,
        "침착성": 0.08,
    },
    "CF": {
        "골 결정력": 0.16,
        "중거리 슛": 0.14,
        "속력": 0.13,
        "가속력": 0.13,
        "짧은 패스": 0.11,
        "드리블": 0.11,
        "위치 선정": 0.12,
        "민첩성": 0.10,
    },
    "LW": {
        "속력": 0.19,
        "가속력": 0.19,
        "드리블": 0.15,
        "민첩성": 0.13,
        "크로스": 0.12,
        "골 결정력": 0.11,
        "커브": 0.11,
    },
    "RW": {
        "속력": 0.19,
        "가속력": 0.19,
        "드리블": 0.15,
        "민첩성": 0.13,
        "크로스": 0.12,
        "골 결정력": 0.11,
        "커브": 0.11,
    },
    "LM": {
        "속력": 0.18,
        "가속력": 0.18,
        "크로스": 0.15,
        "드리블": 0.14,
        "스태미너": 0.13,
        "짧은 패스": 0.11,
        "민첩성": 0.11,
    },
    "RM": {
        "속력": 0.18,
        "가속력": 0.18,
        "크로스": 0.15,
        "드리블": 0.14,
        "스태미너": 0.13,
        "짧은 패스": 0.11,
        "민첩성": 0.11,
    },
    "CAM": {
        "짧은 패스": 0.17,
        "시야": 0.16,
        "중거리 슛": 0.15,
        "볼 컨트롤": 0.13,
        "드리블": 0.13,
        "민첩성": 0.13,
        "슛 파워": 0.13,
    },
    "CM": {
        "짧은 패스": 0.18,
        "긴 패스": 0.15,
        "시야": 0.14,
        "스태미너": 0.15,
        "볼 컨트롤": 0.13,
        "중거리 슛": 0.13,
        "가로채기": 0.12,
    },
    "CDM": {
        "가로채기": 0.18,
        "태클": 0.17,
        "대인 수비": 0.15,
        "몸싸움": 0.14,
        "짧은 패스": 0.13,
        "긴 패스": 0.11,
        "스태미너": 0.12,
    },
    "CB": {
        "대인 수비": 0.19,
        "태클": 0.18,
        "가로채기": 0.16,
        "몸싸움": 0.17,
        "속력": 0.14,
        "헤더": 0.08,
        "점프": 0.08,
    },
    "LB": {
        "속력": 0.19,
        "가속력": 0.17,
        "태클": 0.15,
        "가로채기": 0.15,
        "스태미너": 0.14,
        "크로스": 0.10,
        "대인 수비": 0.10,
    },
    "RB": {
        "속력": 0.19,
        "가속력": 0.17,
        "태클": 0.15,
        "가로채기": 0.15,
        "스태미너": 0.14,
        "크로스": 0.10,
        "대인 수비": 0.10,
    },
    "LWB": {
        "속력": 0.19,
        "가속력": 0.17,
        "스태미너": 0.15,
        "크로스": 0.14,
        "태클": 0.13,
        "가로채기": 0.12,
        "드리블": 0.10,
    },
    "RWB": {
        "속력": 0.19,
        "가속력": 0.17,
        "스태미너": 0.15,
        "크로스": 0.14,
        "태클": 0.13,
        "가로채기": 0.12,
        "드리블": 0.10,
    },
    "GK": {
        "GK 다이빙": 0.24,
        "GK 반응속도": 0.24,
        "GK 핸들링": 0.20,
        "GK 위치 선정": 0.20,
        "GK 킥": 0.12,
    },
}

# 17종 세부 플레이 스타일 아키타입 정의
ARCHETYPES: List[Dict[str, Any]] = [
    {
        "id": "line_breaker_st",
        "group": "FW",
        "name": "침투형 스트라이커 (Line Breaker)",
        "desc": "높은 속력·가속력과 오프더볼 위치 선정을 바탕으로 수비 뒷공간을 허무는 침투 특화 공격수",
        "weights": {"속력": 0.24, "가속력": 0.24, "위치 선정": 0.20, "골 결정력": 0.16, "반응 속도": 0.08, "민첩성": 0.08},
    },
    {
        "id": "target_man_st",
        "group": "FW",
        "name": "타겟터 / 포스트 플레이어 (Target Man)",
        "desc": "압도적인 몸싸움과 헤더, 점프력을 활용해 전방에서 볼을 키핑하고 제공권을 장악하는 정통 스트라이커",
        "weights": {"몸싸움": 0.26, "헤더": 0.22, "점프": 0.16, "골 결정력": 0.16, "슛 파워": 0.12, "볼 컨트롤": 0.08},
    },
    {
        "id": "technical_crack_fw",
        "group": "FW",
        "name": "크랙 / 드리블형 공격수 (Technical Crack)",
        "desc": "민첩한 방향 전환과 정교한 볼 터치, 감아차기 능력으로 밀집 수비를 단독 돌파하는 크랙형 공격수",
        "weights": {"드리블": 0.24, "민첩성": 0.20, "볼 컨트롤": 0.16, "가속력": 0.16, "커브": 0.12, "밸런스": 0.12},
    },
    {
        "id": "linkup_false9_fw",
        "group": "FW",
        "name": "연계형 포워드 / 펄스 나인 (Link-up Forward)",
        "desc": "2선과 유기적인 짧은 패스 연계 및 중거리 슈팅 능력을 겸비해 공격 활로를 여는 전술형 포워드",
        "weights": {"짧은 패스": 0.22, "시야": 0.20, "중거리 슛": 0.18, "볼 컨트롤": 0.16, "골 결정력": 0.12, "침착성": 0.12},
    },
    {
        "id": "poacher_st",
        "group": "FW",
        "name": "박스 포처 (Penalty Box Poacher)",
        "desc": "페널티 박스 안 반 박자 빠른 반응 속도와 위치 선정, 발리/원터치 골 결정력이 극대화된 결정력 특화 공격수",
        "weights": {"골 결정력": 0.28, "위치 선정": 0.24, "반응 속도": 0.18, "발리슛": 0.12, "슛 파워": 0.10, "침착성": 0.08},
    },
    {
        "id": "complete_forward",
        "group": "FW",
        "name": "육각형 만능 공격수 (Complete Forward)",
        "desc": "스피드, 골 결정력, 중거리 슛, 연계, 피지컬까지 약점 없이 모든 공격 전술을 소화하는 올라운더",
        "weights": {"속력": 0.16, "골 결정력": 0.18, "슛 파워": 0.16, "중거리 슛": 0.14, "몸싸움": 0.14, "드리블": 0.12, "짧은 패스": 0.10},
    },
    {
        "id": "deep_lying_playmaker",
        "group": "MF",
        "name": "딥라잉 플레이메이커 (Deep-Lying Playmaker)",
        "desc": "정교한 롱패스와 넓은 시야, 침착한 탈압박으로 후방에서 전방으로 한 번에 볼을 배급하는 사령관",
        "weights": {"긴 패스": 0.26, "짧은 패스": 0.24, "시야": 0.22, "볼 컨트롤": 0.14, "침착성": 0.14},
    },
    {
        "id": "box_to_box_cm",
        "group": "MF",
        "name": "박스 투 박스 엔진 (Box-to-Box Midfielder)",
        "desc": "왕성한 스태미너와 공수 밸런스, 강력한 중거리 슛을 바탕으로 경기장 전역을 장악하는 중원 엔진",
        "weights": {"스태미너": 0.22, "중거리 슛": 0.18, "슛 파워": 0.14, "짧은 패스": 0.16, "가로채기": 0.15, "몸싸움": 0.15},
    },
    {
        "id": "holding_destroyer_cdm",
        "group": "MF",
        "name": "수비형 홀딩 / 볼 위닝 미드필더 (Anchor CDM)",
        "desc": "포백 보호에 특화된 가로채기·태클·몸싸움 능력으로 상대 2선 공격을 원천 차단하는 중원 방파제",
        "weights": {"가로채기": 0.24, "태클": 0.22, "대인 수비": 0.20, "몸싸움": 0.18, "적극성": 0.16},
    },
    {
        "id": "ball_carrying_mezzala",
        "group": "MF",
        "name": "볼 운반형 메짤라 (Ball-Carrying Mezzala)",
        "desc": "빠른 가속력과 드리블, 민첩성으로 중원에서 직접 볼을 운반해 하프스페이스를 타격하는 공격형 미드필더",
        "weights": {"드리블": 0.24, "가속력": 0.20, "민첩성": 0.18, "볼 컨트롤": 0.16, "짧은 패스": 0.12, "크로스": 0.10},
    },
    {
        "id": "shadow_striker_cam",
        "group": "MF",
        "name": "세컨드 스트라이커형 공미 (Shadow Striker CAM)",
        "desc": "2선에서 날카로운 중거리 포와 박스 침투로 직접 득점을 생산하는 공격 가담 특화 미드필더",
        "weights": {"중거리 슛": 0.24, "슛 파워": 0.20, "위치 선정": 0.18, "골 결정력": 0.16, "짧은 패스": 0.12, "커브": 0.10},
    },
    {
        "id": "stopper_cb",
        "group": "DF",
        "name": "파이터형 대인 방어 센터백 (Stopper CB)",
        "desc": "강력한 몸싸움과 적극성, 스탠딩 태클로 상대 공격수를 강하게 압박해 볼을 탈취하는 파이터형 수비수",
        "weights": {"몸싸움": 0.26, "적극성": 0.20, "태클": 0.22, "대인 수비": 0.20, "헤더": 0.12},
    },
    {
        "id": "cover_sweeper_cb",
        "group": "DF",
        "name": "스위퍼 / 커버형 센터백 (Cover CB)",
        "desc": "뛰어난 속력·가속력과 가로채기 지능으로 수비 라인 뒷공간 침투를 빠르게 커버하는 기동형 센터백",
        "weights": {"속력": 0.24, "가속력": 0.20, "가로채기": 0.22, "대인 수비": 0.18, "반응 속도": 0.16},
    },
    {
        "id": "ball_playing_cb",
        "group": "DF",
        "name": "빌드업형 센터백 (Ball-Playing CB)",
        "desc": "안정적인 수비력에 더해 정확한 롱패스와 볼 컨트롤로 후방 빌드업의 기점이 되는 현대적 센터백",
        "weights": {"긴 패스": 0.22, "짧은 패스": 0.20, "볼 컨트롤": 0.16, "침착성": 0.14, "대인 수비": 0.14, "가로채기": 0.14},
    },
    {
        "id": "overlapping_wingback",
        "group": "DF",
        "name": "공격 가담형 오버래핑 윙백 (Attacking Wingback)",
        "desc": "폭발적인 측면 스피드와 날카로운 크로스, 지치지 않는 체력으로 측면 공격을 주도하는 윙백",
        "weights": {"속력": 0.22, "가속력": 0.20, "크로스": 0.22, "스태미너": 0.18, "커브": 0.10, "드리블": 0.08},
    },
    {
        "id": "defensive_fullback",
        "group": "DF",
        "name": "수비 안정형 밸런스 풀백 (Defensive Fullback)",
        "desc": "상대 윙어의 돌파를 봉쇄하는 대인 수비와 태클, 빠른 복귀 속도를 갖춘 수비 지향 풀백",
        "weights": {"태클": 0.22, "대인 수비": 0.22, "속력": 0.20, "가로채기": 0.18, "몸싸움": 0.18},
    },
    {
        "id": "sweeper_keeper_gk",
        "group": "GK",
        "name": "스위퍼 골키퍼 (Sweeper Keeper)",
        "desc": "동물적인 반사신경과 다이빙 선방 능력, 정확한 킥 배급력을 겸비한 수문장",
        "weights": {"GK 다이빙": 0.26, "GK 반응속도": 0.26, "GK 핸들링": 0.20, "GK 위치 선정": 0.18, "GK 킥": 0.10},
    },
]


def get_stat_with_bonus(
    base_stats: Dict[str, int],
    stat_name: str,
    grade: int = 1,
    team_color_bonus: int = 0,
    fallback_ovr: int = 105,
) -> int:
    raw = base_stats.get(stat_name)
    if raw is None:
        raw = max(70, fallback_ovr - 5)
    enh_add = ENHANCEMENT_BONUS.get(max(1, min(13, grade)), 0)
    return int(raw) + enh_add + int(team_color_bonus)


def compute_six_face_summary(
    card: Dict[str, Any], grade: int = 1, team_color_bonus: int = 0
) -> Dict[str, int]:
    stats = card.get("stats", {})
    ovr = card.get("ovr", 105)

    def avg_of(keys: List[str]) -> int:
        vals = [get_stat_with_bonus(stats, k, grade, team_color_bonus, ovr) for k in keys]
        return round(sum(vals) / len(vals)) if vals else ovr

    if card.get("primary_position") == "GK":
        return {
            "속력/가속": get_stat_with_bonus(stats, "GK 반응속도", grade, team_color_bonus, ovr),
            "슈팅/다이빙": get_stat_with_bonus(stats, "GK 다이빙", grade, team_color_bonus, ovr),
            "패스/킥": get_stat_with_bonus(stats, "GK 킥", grade, team_color_bonus, ovr),
            "드리블/핸들링": get_stat_with_bonus(stats, "GK 핸들링", grade, team_color_bonus, ovr),
            "수비/위치": get_stat_with_bonus(stats, "GK 위치 선정", grade, team_color_bonus, ovr),
            "피지컬/반응": avg_of(["반응 속도", "점프"]),
        }

    return {
        "속력": avg_of(["속력", "가속력"]),
        "슈팅": avg_of(["골 결정력", "슛 파워", "중거리 슛", "위치 선정"]),
        "패스": avg_of(["짧은 패스", "시야", "크로스", "긴 패스"]),
        "드리블": avg_of(["드리블", "볼 컨트롤", "민첩성", "밸런스"]),
        "수비": avg_of(["대인 수비", "태클", "가로채기", "슬라이딩 태클"]),
        "피지컬": avg_of(["몸싸움", "스태미너", "점프", "적극성"]),
    }


def evaluate_card_efficiency(
    card: Dict[str, Any],
    target_position: Optional[str] = None,
    grade: int = 1,
    team_color_bonus: int = 0,
    custom_weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    if not card.get("has_full_ability") or not card.get("stats"):
        crawled = crawl_player_ability(int(card["spid"]))
        if crawled:
            card = crawled

    pos = (target_position or card.get("primary_position") or "ST").upper()
    weights = custom_weights or POSITION_WEIGHTS.get(pos, POSITION_WEIGHTS["ST"])
    total_w = sum(weights.values()) or 1.0
    norm_weights = {k: v / total_w for k, v in weights.items()}

    stats = card.get("stats", {})
    base_ovr = int(card.get("ovr", 105))
    enh_bonus = ENHANCEMENT_BONUS.get(max(1, min(13, grade)), 0)
    effective_ovr = base_ovr + enh_bonus + int(team_color_bonus)

    weighted_sum = 0.0
    stat_breakdown = []
    for stat_name, weight in norm_weights.items():
        val = get_stat_with_bonus(stats, stat_name, grade, team_color_bonus, base_ovr)
        contrib = val * weight
        weighted_sum += contrib
        stat_breakdown.append(
            {
                "stat": stat_name,
                "value": val,
                "weight": round(weight * 100, 1),
                "contribution": round(contrib, 2),
            }
        )

    core_score = round(weighted_sum, 2)

    # Price for requested grade
    prices = card.get("prices", {})
    grade_price_obj = prices.get(str(grade)) or prices.get("1") or {"bp": 0, "text": "-"}
    bp_price = int(grade_price_obj.get("bp", 0))
    bp_text = grade_price_obj.get("text") or format_bp_korean(bp_price)

    # Efficiency Index calculation:
    # Combines exponential core performance above baseline (85) divided by log10(BP)
    # so both high-value meta cards and budget gems are fairly scored on a 0..100+ scale.
    perf_delta = max(10.0, core_score - 80.0)
    if bp_price > 0:
        log_price = max(3.0, math.log10(max(bp_price, 1000)))
        efficiency_index = round((perf_delta ** 1.55) / (log_price * 2.35), 1)
        score_per_unit_price = round((core_score / max(1.0, math.log10(bp_price + 10))), 2)
    else:
        efficiency_index = 0.0
        score_per_unit_price = 0.0

    if efficiency_index >= 88:
        tier = "S+ (초고효율 가성비)"
    elif efficiency_index >= 74:
        tier = "S (검증된 고효율)"
    elif efficiency_index >= 60:
        tier = "A (우수 밸런스)"
    elif efficiency_index >= 46:
        tier = "B (하이엔드/표준)"
    else:
        tier = "C (프리미엄/시세 높음)"

    # Calculate grade-by-grade efficiency curve (1강 ~ 8강)
    grade_curve = []
    for g in range(1, 9):
        g_price_obj = prices.get(str(g), {})
        g_bp = int(g_price_obj.get("bp", 0))
        if g_bp <= 0:
            continue
        g_add = ENHANCEMENT_BONUS[g] - enh_bonus
        g_core = round(core_score + g_add, 2)
        g_delta = max(10.0, g_core - 80.0)
        g_log = max(3.0, math.log10(max(g_bp, 1000)))
        g_eff = round((g_delta ** 1.55) / (g_log * 2.35), 1)
        grade_curve.append(
            {
                "grade": g,
                "ovr": base_ovr + ENHANCEMENT_BONUS[g] + int(team_color_bonus),
                "core_score": g_core,
                "bp": g_bp,
                "bp_text": g_price_obj.get("text") or format_bp_korean(g_bp),
                "efficiency_index": g_eff,
            }
        )

    best_grade = max(grade_curve, key=lambda x: x["efficiency_index"]) if grade_curve else None

    return {
        "spid": card["spid"],
        "name": card["name"],
        "season_code": card["season_code"],
        "season_name": card["season_name"],
        "season_img": card["season_img"],
        "thumb_url": card["thumb_url"],
        "target_position": pos,
        "primary_position": card["primary_position"],
        "grade": grade,
        "team_color_bonus": team_color_bonus,
        "base_ovr": base_ovr,
        "effective_ovr": effective_ovr,
        "salary": card["salary"],
        "foot": card["foot"],
        "bp": bp_price,
        "bp_text": bp_text,
        "core_score": core_score,
        "ovr_to_core_gap": round(core_score - effective_ovr, 2),
        "efficiency_index": efficiency_index,
        "score_per_log_bp": score_per_unit_price,
        "tier": tier,
        "six_face": compute_six_face_summary(card, grade, team_color_bonus),
        "stat_breakdown": sorted(stat_breakdown, key=lambda x: x["weight"], reverse=True),
        "grade_curve": grade_curve,
        "best_sweetspot_grade": best_grade,
        "traits": card.get("traits", []),
        "crawled_at": card.get("crawled_at", now_iso()),
    }


def analyze_player_profile(
    card: Dict[str, Any], grade: int = 1, team_color_bonus: int = 0
) -> Dict[str, Any]:
    if not card.get("has_full_ability") or not card.get("stats"):
        crawled = crawl_player_ability(int(card["spid"]))
        if crawled:
            card = crawled

    stats = card.get("stats", {})
    base_ovr = int(card.get("ovr", 105))
    pos = card.get("primary_position", "ST")

    # Determine primary position group while allowing cross-group visibility
    if pos in ("ST", "CF", "LW", "RW", "LF", "RF"):
        primary_group = "FW"
    elif pos in ("CAM", "CM", "CDM", "LM", "RM"):
        primary_group = "MF"
    elif pos == "GK":
        primary_group = "GK"
    else:
        primary_group = "DF"

    archetype_scores = []
    for arch in ARCHETYPES:
        if primary_group == "GK" and arch["group"] != "GK":
            continue
        if primary_group != "GK" and arch["group"] == "GK":
            continue

        weighted_val = 0.0
        top_contributors = []
        for s_name, w in arch["weights"].items():
            s_val = get_stat_with_bonus(stats, s_name, grade, team_color_bonus, base_ovr)
            weighted_val += s_val * w
            top_contributors.append({"stat": s_name, "value": s_val, "weight": w})

        # Physical/Trait bonus adjustments
        height = int(card.get("height", 180))
        if arch["id"] == "target_man_st" and height >= 187:
            weighted_val += 3.0
        elif arch["id"] == "technical_crack_fw" and "★" in card.get("skill_moves", ""):
            weighted_val += 1.5

        # Normalize to compatibility percentage (0..99%) relative to card's effective OVR
        eff_ovr = base_ovr + ENHANCEMENT_BONUS.get(grade, 0) + team_color_bonus
        relative_ratio = (weighted_val / max(80.0, eff_ovr)) * 90.0
        abs_bonus = max(0.0, (weighted_val - 105.0) * 0.35)
        group_bonus = 4.0 if arch["group"] == primary_group else -4.0
        fit_pct = min(99, max(35, round(relative_ratio + abs_bonus + group_bonus)))

        top_contributors.sort(key=lambda x: x["value"] * x["weight"], reverse=True)
        archetype_scores.append(
            {
                "id": arch["id"],
                "group": arch["group"],
                "name": arch["name"],
                "desc": arch["desc"],
                "raw_score": round(weighted_val, 1),
                "fit_percent": fit_pct,
                "key_stats": top_contributors[:4],
            }
        )

    archetype_scores.sort(key=lambda x: (x["fit_percent"], x["raw_score"]), reverse=True)
    primary_arch = archetype_scores[0] if archetype_scores else None
    secondary_arch = archetype_scores[1] if len(archetype_scores) > 1 else None

    # Strengths & Weaknesses analysis
    non_gk_stats = [
        (k, get_stat_with_bonus(stats, k, grade, team_color_bonus, base_ovr))
        for k in stats.keys()
        if not k.startswith("GK") or primary_group == "GK"
    ]
    non_gk_stats.sort(key=lambda x: x[1], reverse=True)
    strengths = [{"stat": k, "value": v} for k, v in non_gk_stats[:5]]
    weaknesses = [{"stat": k, "value": v} for k, v in non_gk_stats[-4:]]

    return {
        "spid": card["spid"],
        "name": card["name"],
        "season_code": card["season_code"],
        "primary_position": pos,
        "grade": grade,
        "team_color_bonus": team_color_bonus,
        "height": card.get("height", 180),
        "weight": card.get("weight", 75),
        "body_type": card.get("body_type", "보통"),
        "foot": card.get("foot", "L4 - R5"),
        "skill_moves": card.get("skill_moves", "★★★★☆☆"),
        "traits": card.get("traits", []),
        "primary_archetype": primary_arch,
        "secondary_archetype": secondary_arch,
        "all_archetypes": archetype_scores[:8],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "six_face": compute_six_face_summary(card, grade, team_color_bonus),
        "methodology_note": "본 결과는 실제 인게임 플레이 로그 확정 판정이 아닌, 수집된 34개 세부 능력치·신체조건·특성 가중치 행렬에 기반한 플레이 스타일 적합도 분석입니다.",
        "analyzed_at": now_iso(),
    }


def analyze_squad(
    slots: List[Dict[str, Any]],
    formation: str = "4-2-3-1",
    budget_bp: int = 50_000_000_000,
    salary_cap: int = 270,
    team_color_bonus: int = 0,
) -> Dict[str, Any]:
    """
    Evaluates an 11-player starting squad:
    - Total salary vs cap (default 270 FP)
    - Total BP value vs budget
    - Sector scores (Attack, Midfield, Defense, Speed, Passing, Physical)
    - Active team color synergies
    - Weakest position detection & role overlap checks
    - Budget-constrained replacement recommendations from SQLite
    """
    conn = get_connection()
    placed_evaluations = []
    total_salary = 0
    total_bp = 0
    team_counter: Dict[str, int] = {}
    nation_counter: Dict[str, int] = {}

    attack_scores = []
    midfield_scores = []
    defense_scores = []
    six_sums = {"속력": [], "슈팅": [], "패스": [], "드리블": [], "수비": [], "피지컬": []}

    for slot in slots:
        slot_pos = str(slot.get("slot_position", "ST")).upper()
        spid = slot.get("spid")
        grade = int(slot.get("grade", 5))
        if not spid:
            continue

        row = conn.execute("SELECT * FROM player_cards WHERE spid = ?", (int(spid),)).fetchone()
        if row:
            card = row_to_card_dict(row)
        else:
            card = crawl_player_ability(int(spid))
            if not card:
                continue

        eval_res = evaluate_card_efficiency(
            card,
            target_position=slot_pos,
            grade=grade,
            team_color_bonus=team_color_bonus,
        )
        total_salary += int(card.get("salary", 20))
        total_bp += int(eval_res["bp"])

        if card.get("team"):
            team_counter[card["team"]] = team_counter.get(card["team"], 0) + 1
        if card.get("nation"):
            nation_counter[card["nation"]] = nation_counter.get(card["nation"], 0) + 1
        for tc in card.get("team_colors", []):
            tc_name = tc.get("name", "")
            if tc_name:
                team_counter[tc_name] = team_counter.get(tc_name, 0) + 1

        core = eval_res["core_score"]
        if slot_pos in ("ST", "CF", "LW", "RW", "LF", "RF"):
            attack_scores.append(core)
        elif slot_pos in ("CAM", "CM", "CDM", "LM", "RM"):
            midfield_scores.append(core)
        elif slot_pos in ("CB", "LB", "RB", "LWB", "RWB", "SW"):
            defense_scores.append(core)

        sf = eval_res["six_face"]
        if slot_pos != "GK":
            for k in six_sums.keys():
                if k in sf:
                    six_sums[k].append(sf[k])

        placed_evaluations.append(
            {
                "slot_id": slot.get("slot_id", slot_pos),
                "slot_position": slot_pos,
                "spid": card["spid"],
                "pid": card["pid"],
                "name": card["name"],
                "season_code": card["season_code"],
                "thumb_url": card["thumb_url"],
                "grade": grade,
                "salary": card["salary"],
                "ovr": eval_res["effective_ovr"],
                "core_score": core,
                "efficiency_index": eval_res["efficiency_index"],
                "bp": eval_res["bp"],
                "bp_text": eval_res["bp_text"],
                "primary_archetype": analyze_player_profile(card, grade, team_color_bonus).get("primary_archetype", {}).get("name", ""),
            }
        )

    # Active Team Colors detection
    detected_synergies = []
    for tc_name, count in sorted(team_counter.items(), key=lambda x: x[1], reverse=True):
        if count >= 3:
            bonus_est = 3 if count >= 8 else (2 if count >= 5 else 1)
            detected_synergies.append({"name": tc_name, "count": count, "bonus": f"전체 능력치 +{bonus_est}"})

    avg_attack = round(sum(attack_scores) / len(attack_scores), 1) if attack_scores else 0.0
    avg_midfield = round(sum(midfield_scores) / len(midfield_scores), 1) if midfield_scores else 0.0
    avg_defense = round(sum(defense_scores) / len(defense_scores), 1) if defense_scores else 0.0

    team_radar = {
        k: round(sum(vals) / len(vals), 1) if vals else 0.0
        for k, vals in six_sums.items()
    }

    # Diagnose weaknesses and generate replacement recommendations
    weaknesses = []
    recommendations = []
    remaining_bp = max(0, budget_bp - total_bp)
    remaining_salary = salary_cap - total_salary

    if placed_evaluations:
        sorted_by_core = sorted(placed_evaluations, key=lambda x: x["core_score"])
        used_pids = {p["pid"] for p in placed_evaluations}

        for weak_slot in sorted_by_core[:3]:
            w_pos = weak_slot["slot_position"]
            w_core = weak_slot["core_score"]
            w_bp = weak_slot["bp"]
            w_sal = weak_slot["salary"]
            max_allowed_bp = w_bp + remaining_bp
            max_allowed_sal = w_sal + max(0, remaining_salary)

            weaknesses.append(
                {
                    "slot_position": w_pos,
                    "current_player": f"{weak_slot['season_code']} {weak_slot['name']} (+{weak_slot['grade']})",
                    "core_score": w_core,
                    "reason": f"{w_pos} 포지션 핵심 능력치 점수({w_core}점)가 팀 평균 대비 낮아 공수 밸런스 병목이 발생합니다.",
                }
            )

            # Find candidate upgrades in DB
            cand_rows = conn.execute(
                """
                SELECT * FROM player_cards
                WHERE (primary_position = ? OR positions_json LIKE ?)
                  AND salary <= ?
                ORDER BY ovr DESC
                LIMIT 25
                """,
                (w_pos, f'%"{w_pos}"%', max_allowed_sal + 3),
            ).fetchall()

            best_alts = []
            for cr in cand_rows:
                c_card = row_to_card_dict(cr)
                if c_card["pid"] in used_pids:
                    continue
                for test_grade in (5, 3, 1):
                    c_eval = evaluate_card_efficiency(
                        c_card,
                        target_position=w_pos,
                        grade=test_grade,
                        team_color_bonus=team_color_bonus,
                    )
                    if c_eval["core_score"] > w_core + 1.5 and (
                        max_allowed_bp <= 0 or c_eval["bp"] <= max_allowed_bp * 1.25
                    ):
                        best_alts.append(
                            {
                                "target_slot": weak_slot["slot_id"],
                                "slot_position": w_pos,
                                "replace_out": f"{weak_slot['season_code']} {weak_slot['name']} (+{weak_slot['grade']})",
                                "spid": c_card["spid"],
                                "name": c_card["name"],
                                "season_code": c_card["season_code"],
                                "season_img": c_card["season_img"],
                                "thumb_url": c_card["thumb_url"],
                                "grade": test_grade,
                                "salary": c_card["salary"],
                                "salary_diff": c_card["salary"] - w_sal,
                                "ovr": c_eval["effective_ovr"],
                                "core_score": c_eval["core_score"],
                                "core_gain": round(c_eval["core_score"] - w_core, 1),
                                "bp": c_eval["bp"],
                                "bp_text": c_eval["bp_text"],
                                "efficiency_index": c_eval["efficiency_index"],
                            }
                        )
                        break
            best_alts.sort(key=lambda x: (x["core_gain"], x["efficiency_index"]), reverse=True)
            recommendations.extend(best_alts[:2])

    conn.close()

    # Role overlap check
    role_warnings = []
    arch_counts: Dict[str, List[str]] = {}
    for p in placed_evaluations:
        arch = p.get("primary_archetype", "")
        if arch:
            arch_counts.setdefault(arch, []).append(f"{p['slot_position']} {p['name']}")
    for arch_name, p_list in arch_counts.items():
        if len(p_list) >= 3:
            role_warnings.append(
                f"'{arch_name}' 유형에 선수 {len(p_list)}명({', '.join(p_list)})이 편중되어 전술 다양성이 낮아질 수 있습니다."
            )

    if total_salary > salary_cap:
        role_warnings.insert(
            0,
            f"현재 총 급여({total_salary} FP)가 설정된 급여 한도({salary_cap} FP)를 {total_salary - salary_cap} FP 초과했습니다. 풀백 또는 골키퍼 급여 다이어트를 권장합니다.",
        )

    return {
        "formation": formation,
        "player_count": len(placed_evaluations),
        "total_salary": total_salary,
        "salary_cap": salary_cap,
        "salary_valid": total_salary <= salary_cap,
        "total_bp": total_bp,
        "total_bp_text": format_bp_korean(total_bp),
        "budget_bp": budget_bp,
        "remaining_bp": remaining_bp,
        "remaining_bp_text": format_bp_korean(remaining_bp),
        "sector_scores": {
            "attack": avg_attack,
            "midfield": avg_midfield,
            "defense": avg_defense,
            "overall": round(
                sum([x["core_score"] for x in placed_evaluations]) / len(placed_evaluations), 1
            )
            if placed_evaluations
            else 0.0,
        },
        "team_radar": team_radar,
        "detected_synergies": detected_synergies,
        "weaknesses": weaknesses,
        "role_warnings": role_warnings,
        "recommendations": recommendations[:5],
        "placed_evaluations": placed_evaluations,
        "analyzed_at": now_iso(),
    }


def analyze_matches(
    ouid: str,
    nickname: str,
    match_details: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Aggregates official Nexon Open API match-detail records and generates
    Observed Fact -> Possible Cause -> Recommended Action diagnostics.
    """
    conn = get_connection()
    pos_rows = conn.execute("SELECT * FROM meta_positions").fetchall()
    season_rows = conn.execute("SELECT * FROM meta_seasons").fetchall()
    pos_map = {r["spposition"]: r["desc"] for r in pos_rows}
    season_map = {r["season_id"]: r["season_code"] for r in season_rows}

    summary = {
        "total": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "possession_sum": 0,
        "shots_total": 0,
        "shots_effective": 0,
        "shots_in_penalty": 0,
        "shots_out_penalty": 0,
        "goals_in_penalty": 0,
        "goals_out_penalty": 0,
        "goals_heading": 0,
        "pass_try": 0,
        "pass_success": 0,
        "through_pass_try": 0,
        "through_pass_success": 0,
        "tackle_try": 0,
        "tackle_success": 0,
    }

    match_history_list = []
    player_perf: Dict[int, Dict[str, Any]] = {}
    latest_starting_xi: List[Dict[str, Any]] = []
    results_sequence: List[str] = []

    for idx, m in enumerate(match_details):
        minfo_list = m.get("matchInfo", [])
        my_info = None
        opp_info = None
        for info in minfo_list:
            if info.get("ouid") == ouid or info.get("nickname", "").lower() == nickname.lower():
                my_info = info
            else:
                opp_info = info

        if not my_info:
            continue

        detail = my_info.get("matchDetail", {})
        shoot = my_info.get("shoot", {})
        pass_stat = my_info.get("pass", {})
        defence = my_info.get("defence", {})

        res_str = detail.get("matchResult", "무")
        if res_str == "승":
            summary["wins"] += 1
            results_sequence.append("W")
        elif res_str == "패":
            summary["losses"] += 1
            results_sequence.append("L")
        else:
            summary["draws"] += 1
            results_sequence.append("D")

        summary["total"] += 1
        gf = int(shoot.get("goalTotalDisplay", shoot.get("goalTotal", 0)) or 0)
        ga = (
            int(
                opp_info.get("shoot", {}).get(
                    "goalTotalDisplay", opp_info.get("shoot", {}).get("goalTotal", 0)
                )
                or 0
            )
            if opp_info
            else 0
        )
        summary["goals_for"] += gf
        summary["goals_against"] += ga
        summary["possession_sum"] += int(detail.get("possession", 50) or 50)

        st_tot = int(shoot.get("shootTotal", 0) or 0)
        st_eff = int(shoot.get("effectiveShootTotal", 0) or 0)
        summary["shots_total"] += st_tot
        summary["shots_effective"] += st_eff
        summary["shots_in_penalty"] += int(shoot.get("shootInPenalty", 0) or 0)
        summary["shots_out_penalty"] += int(shoot.get("shootOutPenalty", 0) or 0)
        summary["goals_in_penalty"] += int(shoot.get("goalInPenalty", 0) or 0)
        summary["goals_out_penalty"] += int(shoot.get("goalOutPenalty", 0) or 0)
        summary["goals_heading"] += int(shoot.get("goalHeading", 0) or 0)

        p_try = int(pass_stat.get("passTry", 0) or 0)
        p_suc = int(pass_stat.get("passSuccess", 0) or 0)
        summary["pass_try"] += p_try
        summary["pass_success"] += p_suc
        summary["through_pass_try"] += int(pass_stat.get("throughPassTry", 0) or 0)
        summary["through_pass_success"] += int(pass_stat.get("throughPassSuccess", 0) or 0)

        t_try = int(defence.get("tackleTry", 0) or 0)
        t_suc = int(defence.get("tackleSuccess", 0) or 0)
        summary["tackle_try"] += t_try
        summary["tackle_success"] += t_suc

        match_history_list.append(
            {
                "matchId": m.get("matchId"),
                "matchDate": m.get("matchDate", ""),
                "result": res_str,
                "opponent": opp_info.get("nickname", "상대 구단주") if opp_info else "상대 구단주",
                "score": f"{gf} : {ga}",
                "goalsFor": gf,
                "goalsAgainst": ga,
                "possession": int(detail.get("possession", 50) or 50),
                "shots": st_tot,
                "effectiveShots": st_eff,
                "passRate": round((p_suc / p_try) * 100, 1) if p_try > 0 else 0.0,
                "controller": detail.get("controller", "keyboard"),
            }
        )

        # Aggregate player stats
        players = my_info.get("player", [])
        current_xi = []
        for p in players:
            spid = int(p.get("spId", 0) or 0)
            sp_pos = int(p.get("spPosition", 28) or 28)
            sp_grade = int(p.get("spGrade", 1) or 1)
            status = p.get("status", {})
            sp_rating = float(status.get("spRating", 0.0) or 0.0)
            if spid <= 0:
                continue

            pos_name = pos_map.get(sp_pos, "SUB")
            if idx == 0 and sp_pos != 28 and pos_name != "SUB":
                current_xi.append(
                    {
                        "spid": spid,
                        "position": pos_name,
                        "grade": sp_grade,
                        "rating": sp_rating,
                    }
                )

            if sp_rating <= 0:
                continue

            entry = player_perf.setdefault(
                spid,
                {
                    "spid": spid,
                    "season_code": season_map.get(spid // 1000000, str(spid // 1000000)),
                    "grade": sp_grade,
                    "position": pos_name,
                    "appearances": 0,
                    "goals": 0,
                    "assists": 0,
                    "rating_sum": 0.0,
                },
            )
            entry["appearances"] += 1
            entry["goals"] += int(status.get("goal", 0) or 0)
            entry["assists"] += int(status.get("assist", 0) or 0)
            entry["rating_sum"] += sp_rating
            if pos_name != "SUB":
                entry["position"] = pos_name

        if idx == 0 and current_xi:
            latest_starting_xi = current_xi

    # Enrich player names from DB
    all_spids = list(player_perf.keys()) + [x["spid"] for x in latest_starting_xi]
    name_lookup: Dict[int, Dict[str, Any]] = {}
    if all_spids:
        placeholders = ",".join(["?"] * len(all_spids))
        rows = conn.execute(
            f"SELECT spid, name, season_code, thumb_url, ovr, salary FROM player_cards WHERE spid IN ({placeholders})",
            all_spids,
        ).fetchall()
        for r in rows:
            name_lookup[r["spid"]] = dict(r)
    conn.close()

    top_players = []
    for spid, pdata in player_perf.items():
        info = name_lookup.get(spid, {})
        apps = max(1, pdata["appearances"])
        top_players.append(
            {
                "spid": spid,
                "name": info.get("name", f"선수 #{spid % 1000000}"),
                "season_code": info.get("season_code", pdata["season_code"]),
                "thumb_url": info.get(
                    "thumb_url",
                    f"https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p{spid}.png",
                ),
                "grade": pdata["grade"],
                "position": pdata["position"],
                "appearances": apps,
                "goals": pdata["goals"],
                "assists": pdata["assists"],
                "avgRating": round(pdata["rating_sum"] / apps, 2),
            }
        )
    top_players.sort(key=lambda x: (x["avgRating"], x["goals"] + x["assists"]), reverse=True)

    for xi in latest_starting_xi:
        info = name_lookup.get(xi["spid"], {})
        xi["name"] = info.get("name", f"선수 #{xi['spid'] % 1000000}")
        xi["season_code"] = info.get("season_code", season_map.get(xi["spid"] // 1000000, ""))

    tot = max(1, summary["total"])
    win_rate = round((summary["wins"] / tot) * 100, 1)
    avg_gf = round(summary["goals_for"] / tot, 2)
    avg_ga = round(summary["goals_against"] / tot, 2)
    avg_poss = round(summary["possession_sum"] / tot, 1)
    shot_acc = (
        round((summary["shots_effective"] / summary["shots_total"]) * 100, 1)
        if summary["shots_total"] > 0
        else 0.0
    )
    pass_acc = (
        round((summary["pass_success"] / summary["pass_try"]) * 100, 1)
        if summary["pass_try"] > 0
        else 0.0
    )
    through_acc = (
        round((summary["through_pass_success"] / summary["through_pass_try"]) * 100, 1)
        if summary["through_pass_try"] > 0
        else 0.0
    )
    tackle_acc = (
        round((summary["tackle_success"] / summary["tackle_try"]) * 100, 1)
        if summary["tackle_try"] > 0
        else 0.0
    )
    out_box_shot_ratio = (
        round((summary["shots_out_penalty"] / summary["shots_total"]) * 100, 1)
        if summary["shots_total"] > 0
        else 0.0
    )

    # Structured 3-Step Diagnostics (Observed Fact -> Possible Cause -> Recommended Action)
    diagnostics = []

    if avg_ga >= 2.0:
        diagnostics.append(
            {
                "category": "수비 안정성 경보",
                "severity": "high",
                "observed_fact": f"최근 {summary['total']}경기 평균 실점이 {avg_ga}골(태클 성공률 {tackle_acc}%)로 높게 나타났습니다.",
                "possible_cause": "수비형 미드필더(CDM)의 1차 저지선 커버 부족이거나, 풀백의 과도한 오버래핑 후 뒷공간 노출 가능성이 있습니다.",
                "recommended_action": "Squad Lab에서 CDM 및 CB 포지션의 '가로채기·속력·대인 수비' 코어 점수를 점검하고, '수비형 홀딩(Anchor)' 유형 선수 배치를 권장합니다.",
            }
        )
    else:
        diagnostics.append(
            {
                "category": "수비 밸런스 양호",
                "severity": "positive",
                "observed_fact": f"경기당 평균 실점 {avg_ga}골, 태클 성공률 {tackle_acc}%로 안정적인 수비 지표를 유지하고 있습니다.",
                "possible_cause": "수비 라인 간격 유지와 센터백/볼란치 조합이 현재 티어에서 효과적으로 작동하고 있습니다.",
                "recommended_action": "현재 수비진 구성을 유지하되, 잉여 예산을 공격진 강화 단계 상승에 집중하는 전략이 효율적입니다.",
            }
        )

    if out_box_shot_ratio >= 42.0:
        diagnostics.append(
            {
                "category": "중거리 슛 비중 편중",
                "severity": "medium",
                "observed_fact": f"전체 슈팅 중 페널티 박스 밖 중거리 슈팅 비중이 {out_box_shot_ratio}%에 달합니다 (유효슈팅 전환율 {shot_acc}%).",
                "possible_cause": "상대 밀집 수비 공략 시 박스 안 침투 패스보다 2선 중거리 슛에 의존하는 경향이 관찰됩니다.",
                "recommended_action": "CAM/CM 포지션에 '중거리 슛·슛 파워 115+' 및 '예리한 감아차기/파워 슛' 특성 보유 카드를 배치하거나, 침투형 ST를 활용해 박스 내부 슈팅 비중을 높여보세요.",
            }
        )
    elif avg_gf < 1.5:
        diagnostics.append(
            {
                "category": "득점 결정력 보강 필요",
                "severity": "high",
                "observed_fact": f"경기당 평균 득점이 {avg_gf}골(유효슈팅률 {shot_acc}%, 스루패스 성공률 {through_acc}%)로 다소 낮습니다.",
                "possible_cause": "최전방 공격수의 위치 선정/골 결정력 부족 또는 2선에서 찔러주는 스루패스 연결 정확도 저하가 원인일 수 있습니다.",
                "recommended_action": "Card Efficiency Lab에서 ST 포지션 골 결정력·위치 선정 가중치를 높여 고효율 스트라이커를 탐색해 보세요.",
            }
        )
    else:
        diagnostics.append(
            {
                "category": "공격 화력 우수",
                "severity": "positive",
                "observed_fact": f"경기당 평균 {avg_gf}득점, 유효슈팅 전환율 {shot_acc}%로 높은 결정력을 기록 중입니다.",
                "possible_cause": "박스 안팎의 슈팅 밸런스와 주전 공격진의 결정력이 효과적으로 발휘되고 있습니다.",
                "recommended_action": "평점 상위 공격수를 중심으로 팀컬러 단계를 높여 결정력을 극대화하세요.",
            }
        )

    return {
        "ouid": ouid,
        "nickname": nickname,
        "metrics": {
            "totalMatches": summary["total"],
            "wins": summary["wins"],
            "draws": summary["draws"],
            "losses": summary["losses"],
            "winRate": win_rate,
            "avgGoalsFor": avg_gf,
            "avgGoalsAgainst": avg_ga,
            "goalDiff": summary["goals_for"] - summary["goals_against"],
            "avgPossession": avg_poss,
            "shotAccuracy": shot_acc,
            "outBoxShotRatio": out_box_shot_ratio,
            "passAccuracy": pass_acc,
            "throughPassAccuracy": through_acc,
            "tackleAccuracy": tackle_acc,
            "recentSequence": results_sequence[:10],
        },
        "matches": match_history_list,
        "topPlayers": top_players[:12],
        "latestStartingXI": latest_starting_xi,
        "diagnostics": diagnostics,
        "methodologyNote": "관찰된 사실(공식 API 매치 기록)과 가능한 전술/스쿼드 원인, 추천 행동을 구분하여 제시합니다. 인게임 수동 조작 실수 등 API 미제공 영역은 단정하지 않습니다.",
        "analyzedAt": now_iso(),
    }
