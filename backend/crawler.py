import re
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
from database import (
    get_connection,
    now_iso,
    upsert_player_card,
    row_to_card_dict,
    get_system_rules,
    update_system_rules,
    DEFAULT_ENHANCE_OVR_BOOSTS,
)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

ENHANCEMENT_BONUS = {
    idx + 1: boost for idx, boost in enumerate(DEFAULT_ENHANCE_OVR_BOOSTS)
}


def format_bp_korean(bp: int) -> str:
    if bp <= 0:
        return "-"
    eok = bp // 100_000_000
    man = (bp % 100_000_000) // 10_000
    rest = bp % 10_000
    parts = []
    if eok > 0:
        parts.append(f"{eok:,}억")
    if man > 0:
        parts.append(f"{man:,}만")
    if not parts and rest > 0:
        parts.append(f"{rest:,}")
    return " ".join(parts)


def sync_nexon_metadata(force: bool = False) -> Dict[str, Any]:
    conn = get_connection()
    season_count = conn.execute("SELECT COUNT(*) as c FROM meta_seasons").fetchone()["c"]
    if season_count > 0 and not force:
        pos_count = conn.execute("SELECT COUNT(*) as c FROM meta_positions").fetchone()["c"]
        div_count = conn.execute("SELECT COUNT(*) as c FROM meta_divisions").fetchone()["c"]
        conn.close()
        return {
            "status": "cached",
            "seasons": season_count,
            "positions": pos_count,
            "divisions": div_count,
        }

    ts = now_iso()
    results = {"seasons": 0, "positions": 0, "divisions": 0, "matchtypes": 0}

    try:
        # 1. seasonid.json
        req = urllib.request.Request(
            "https://open.api.nexon.com/static/fconline/meta/seasonid.json",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            seasons = json.loads(resp.read().decode("utf-8"))
            with conn:
                for s in seasons:
                    sid = int(s["seasonId"])
                    cname = str(s.get("className", ""))
                    simg = str(s.get("seasonImg", ""))
                    m_code = re.search(r"/([^/]+)\.png$", simg)
                    scode = m_code.group(1).upper() if m_code else cname.split("(")[0].strip()
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO meta_seasons (season_id, class_name, season_code, season_img, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (sid, cname, scode, simg, ts),
                    )
            results["seasons"] = len(seasons)

        # 2. spposition.json
        req_pos = urllib.request.Request(
            "https://open.api.nexon.com/static/fconline/meta/spposition.json",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req_pos, timeout=10) as resp:
            positions = json.loads(resp.read().decode("utf-8"))
            with conn:
                for p in positions:
                    conn.execute(
                        "INSERT OR REPLACE INTO meta_positions (spposition, desc) VALUES (?, ?)",
                        (int(p["spposition"]), str(p["desc"])),
                    )
            results["positions"] = len(positions)

        # 3. division.json
        req_div = urllib.request.Request(
            "https://open.api.nexon.com/static/fconline/meta/division.json",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req_div, timeout=10) as resp:
            divisions = json.loads(resp.read().decode("utf-8"))
            with conn:
                for d in divisions:
                    conn.execute(
                        "INSERT OR REPLACE INTO meta_divisions (division_id, division_name) VALUES (?, ?)",
                        (int(d["divisionId"]), str(d["divisionName"])),
                    )
            results["divisions"] = len(divisions)

        # 4. matchtype.json
        req_mt = urllib.request.Request(
            "https://open.api.nexon.com/static/fconline/meta/matchtype.json",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req_mt, timeout=10) as resp:
            mtypes = json.loads(resp.read().decode("utf-8"))
            with conn:
                for mt in mtypes:
                    conn.execute(
                        "INSERT OR REPLACE INTO meta_matchtypes (matchtype, desc) VALUES (?, ?)",
                        (int(mt["matchtype"]), str(mt["desc"])),
                    )
            results["matchtypes"] = len(mtypes)

    except Exception as e:
        conn.close()
        return {"status": "error", "message": str(e), **results}

    conn.close()
    return {"status": "synced", "updated_at": ts, **results}


def get_season_lookup() -> Dict[int, Dict[str, str]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM meta_seasons").fetchall()
    conn.close()
    return {
        row["season_id"]: {
            "class_name": row["class_name"],
            "season_code": row["season_code"],
            "season_img": row["season_img"],
        }
        for row in rows
    }


def crawl_player_list(player_name: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Crawls FC Online Official Datacenter (/datacenter/PlayerList) for a given player name.
    Extracts all season cards, positions, OVR, salary (FP), foot, and enhancement grade 1..13 BP prices.
    """
    player_name = player_name.strip()
    if not player_name:
        return []

    seasons_map = get_season_lookup()
    data = urllib.parse.urlencode({"strPlayerName": player_name}).encode("utf-8")
    req = urllib.request.Request(
        "https://fconline.nexon.com/datacenter/PlayerList",
        data=data,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return []

    blocks = re.split(r'<div id="area_playerunit_(\d+)">', html)
    if len(blocks) < 3:
        return []

    ts = now_iso()
    results: List[Dict[str, Any]] = []

    for i in range(1, len(blocks), 2):
        spid_str = blocks[i]
        block = blocks[i + 1]
        spid = int(spid_str)
        season_id = spid // 1000000
        pid = spid % 1000000

        m_name = re.search(r'<div class="name">(.*?)</div>', block)
        name = m_name.group(1).strip() if m_name else player_name

        m_thumb = re.search(r'<div class="thumb"><img src="([^"]+)"', block)
        thumb_url = (
            m_thumb.group(1).strip()
            if m_thumb
            else f"https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p{spid}.png"
        )

        m_simg = re.search(r'<div class="season"><img src="([^"]+)"', block)
        season_img = m_simg.group(1).strip() if m_simg else ""
        m_scode = re.search(r"/([^/]+)\.png", season_img)
        season_code = m_scode.group(1) if m_scode else str(season_id)

        s_meta = seasons_map.get(season_id, {})
        season_name = s_meta.get("class_name", season_code)
        if not season_img and s_meta.get("season_img"):
            season_img = s_meta["season_img"]

        # Positions and OVR
        positions = []
        for pm in re.finditer(
            r'<span class="position[^"]*">\s*<span class="txt">([^<]+)</span>\s*<span class="skillData_\d+">(\d+)</span>',
            block,
        ):
            positions.append({"pos": pm.group(1).strip(), "ovr": int(pm.group(2))})

        primary_position = positions[0]["pos"] if positions else "ST"
        ovr = positions[0]["ovr"] if positions else 100

        m_foot = re.search(r'<div class="foot">(.*?)</div>', block, re.S)
        foot = re.sub(r"<[^>]+>", "", m_foot.group(1)).strip() if m_foot else "L4 - R5"
        foot = re.sub(r"\s+", " ", foot)

        m_pay = re.search(r'<span class="pay">(\d+)</span>', block)
        salary = int(m_pay.group(1)) if m_pay else 20

        # Prices for grades 1..13
        prices: Dict[str, Dict[str, Any]] = {}
        for gm in re.finditer(
            r'<span class="span_bp(\d+)"[^>]*alt="([^"]*)"[^>]*>(.*?)</span>',
            block,
            re.S,
        ):
            grade_num = int(gm.group(1))
            if grade_num == 0:
                continue
            raw_alt = gm.group(2).replace(",", "").strip()
            bp_val = int(raw_alt) if raw_alt.isdigit() else 0
            txt_val = gm.group(3).strip()
            prices[str(grade_num)] = {"bp": bp_val, "text": txt_val}

        bp_1 = prices.get("1", {}).get("bp", 0)
        bp_5 = prices.get("5", {}).get("bp", 0)
        bp_8 = prices.get("8", {}).get("bp", 0)

        m_score = re.search(
            r'<div class="td td_ar_score"><span>\s*([0-9.]+)\s*<em>\((\d+)\)</em>',
            block,
        )
        rating_score = float(m_score.group(1)) if m_score else 0.0
        rating_count = int(m_score.group(2)) if m_score else 0

        card_dict = {
            "spid": spid,
            "pid": pid,
            "name": name,
            "season_id": season_id,
            "season_code": season_code,
            "season_name": season_name,
            "season_img": season_img,
            "thumb_url": thumb_url,
            "primary_position": primary_position,
            "positions": positions,
            "ovr": ovr,
            "salary": salary,
            "foot": foot,
            "prices": prices,
            "bp_1": bp_1,
            "bp_5": bp_5,
            "bp_8": bp_8,
            "rating_score": rating_score,
            "rating_count": rating_count,
            "has_full_ability": False,
            "crawled_at": ts,
        }
        upsert_player_card(card_dict)
        results.append(card_dict)
        if len(results) >= limit:
            break

    # Reload from DB so any previously crawled full ability stats are included
    conn = get_connection()
    spid_list = [r["spid"] for r in results]
    placeholders = ",".join(["?"] * len(spid_list))
    rows = conn.execute(
        f"SELECT * FROM player_cards WHERE spid IN ({placeholders}) ORDER BY ovr DESC, bp_1 DESC",
        spid_list,
    ).fetchall()
    conn.close()
    return [row_to_card_dict(r) for r in rows]


def crawl_player_ability(spid: int, force: bool = False) -> Optional[Dict[str, Any]]:
    """
    Crawls FC Online Official Datacenter (/datacenter/PlayerAbility) for a specific spid.
    Extracts all 34 detailed stats (at 1강 base), 16 positional OVRs, traits, team colors, height, weight, body type, skill moves, club, and nation.
    """
    conn = get_connection()
    existing = conn.execute(
        "SELECT * FROM player_cards WHERE spid = ?", (spid,)
    ).fetchone()
    conn.close()

    if existing and existing["has_full_ability"] and not force:
        card = row_to_card_dict(existing)
        if card.get("stats") and len(card["stats"]) >= 25:
            return card

    seasons_map = get_season_lookup()
    season_id = spid // 1000000
    pid = spid % 1000000

    payload = urllib.parse.urlencode(
        {
            "spid": spid,
            "n1Strong": 1,
            "n1Grow": 0,
            "n4TeamColorId": 0,
            "n4TeamColorLv": 0,
            "n4TeamColorId_Enhance": 0,
            "n4TeamColorLv_Enhance": 0,
            "n4TeamColorId_Feature": 0,
            "n1Change": 0,
            "strPlayerImg": "",
            "rd": 0.42,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://fconline.nexon.com/datacenter/PlayerAbility",
        data=payload,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return row_to_card_dict(existing) if existing else None

    if len(html) < 500:
        return row_to_card_dict(existing) if existing else None

    clean_html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.S)

    m_name = re.search(r'<div class="name">([^<]+)</div>', clean_html)
    name = m_name.group(1).strip() if m_name else (existing["name"] if existing else f"선수 #{spid}")

    m_pay = re.search(r'<div class="pay_side">(\d+)</div>', clean_html)
    salary = int(m_pay.group(1)) if m_pay else (existing["salary"] if existing else 20)

    m_simg = re.search(r'<div class="season">\s*<img src="([^"]+)"', clean_html)
    season_img = m_simg.group(1).strip() if m_simg else ""
    m_scode = re.search(r"/([^/]+)\.png", season_img)
    season_code = m_scode.group(1) if m_scode else str(season_id)
    s_meta = seasons_map.get(season_id, {})
    season_name = s_meta.get("class_name", season_code)

    m_thumb = re.search(r'<div class="playerCardThumb">.*?<img src="([^"]+)"', clean_html, re.S)
    thumb_url = (
        m_thumb.group(1).strip()
        if m_thumb
        else f"https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p{spid}.png"
    )

    # Preferred positions & OVR
    positions = []
    info_ab_match = re.search(r'<div class="info_line info_ab">(.*?)</div>', clean_html, re.S)
    if info_ab_match:
        for pm in re.finditer(
            r'<span class="txt">([^<]+)</span>\s*<span class="[^"]*value">\s*(\d+)\s*</span>',
            info_ab_match.group(1),
            re.S,
        ):
            positions.append({"pos": pm.group(1).strip(), "ovr": int(pm.group(2))})

    primary_position = positions[0]["pos"] if positions else (existing["primary_position"] if existing else "ST")
    ovr = positions[0]["ovr"] if positions else (existing["ovr"] if existing else 100)

    # Physical & Etc info
    m_birth = re.search(r'<span class="etc birth">([^<]+)</span>', clean_html)
    birth = m_birth.group(1).strip() if m_birth else ""

    m_height = re.search(r'<span class="etc height">(\d+)cm</span>', clean_html)
    height = int(m_height.group(1)) if m_height else 180

    m_weight = re.search(r'<span class="etc weight">(\d+)kg</span>', clean_html)
    weight = int(m_weight.group(1)) if m_weight else 75

    m_body = re.search(r'<span class="etc physical">([^<]+)</span>', clean_html)
    body_type = m_body.group(1).strip() if m_body else "보통"

    m_skill = re.search(r'<span class="etc skill">(.*?)</span>\s*<span class="etc foot">', clean_html, re.S)
    skill_moves = re.sub(r"<[^>]+>|\s+", "", m_skill.group(1)) if m_skill else "★★★★☆☆"

    m_foot = re.search(r'<span class="etc foot">(.*?)</span>', clean_html, re.S)
    foot = re.sub(r"<[^>]+>", "", m_foot.group(1)).strip() if m_foot else "L4 – R5"
    foot = re.sub(r"\s+", " ", foot)

    # Team & Nation
    m_team = re.search(r'<div class="etc team">.*?<span class="txt">([^<]+)</span>', clean_html, re.S)
    team = m_team.group(1).strip() if m_team else ""

    m_nation = re.search(r'<div class="etc nation">.*?<span class="txt">([^<]+)</span>', clean_html, re.S)
    nation = m_nation.group(1).strip() if m_nation else ""

    # Traits
    traits: List[Dict[str, str]] = []
    skill_wrap = re.search(r'<div class="skill_wrap">(.*?)</div>\s*<div class="en_selector_wrap">', clean_html, re.S)
    if skill_wrap:
        for tm in re.finditer(r'<img src="([^"]+)"[^>]*>.*?<span class="desc">([^<]+)</span>', skill_wrap.group(1), re.S):
            traits.append({"icon": tm.group(1).strip(), "name": tm.group(2).strip()})

    # Team Colors (Affiliation & Relation)
    team_colors: List[Dict[str, str]] = []
    for tc_type, cls_prefix in [("소속", "tdefault"), ("관계", "tspecial")]:
        for tcm in re.finditer(rf'<a class="selector_item {cls_prefix}(\d+)"[^>]*>([^<]+)</a>', clean_html):
            tc_id = tcm.group(1)
            tc_name = tcm.group(2).strip()
            if tc_id != "0" and tc_name not in ("소속 팀컬러", "관계 팀컬러", "강화 팀컬러"):
                team_colors.append({"id": tc_id, "type": tc_type, "name": tc_name})

    # 16 Positional OVRs
    position_ovrs: Dict[str, int] = {}
    ovr_set = re.search(r'<div class="ovr_set">(.*?)</div>\s*</div>\s*<div>\s*<div class="content_middle">', clean_html, re.S)
    if ovr_set:
        for pom in re.finditer(r'<div class="position ([a-z]+) value">(\d+)</div>', ovr_set.group(1)):
            position_ovrs[pom.group(1).upper()] = int(pom.group(2))

    # 34 Detailed Ability Stats
    stats: Dict[str, int] = {}
    for sm in re.finditer(
        r'<li class="ab"[^>]*>\s*<div class="txt">([^<]+)</div>\s*<div class="value[^"]*">\s*(\d+)',
        clean_html,
        re.S,
    ):
        stat_name = sm.group(1).strip()
        stat_val = int(sm.group(2))
        stats[stat_name] = stat_val

    # Ensure prices exist; if not, fetch via crawl_player_list or PlayerPriceGraph
    prices = {}
    bp_1, bp_5, bp_8 = 0, 0, 0
    rating_score, rating_count = 0.0, 0

    if existing:
        existing_dict = row_to_card_dict(existing)
        prices = existing_dict.get("prices", {})
        bp_1 = existing_dict.get("bp_1", 0)
        bp_5 = existing_dict.get("bp_5", 0)
        bp_8 = existing_dict.get("bp_8", 0)
        rating_score = existing_dict.get("rating_score", 0.0)
        rating_count = existing_dict.get("rating_count", 0)

    if not prices or bp_1 == 0:
        ph = crawl_price_history(spid, 1)
        if ph and ph.get("current_bp", 0) > 0:
            bp_1 = ph["current_bp"]
            prices["1"] = {"bp": bp_1, "text": format_bp_korean(bp_1)}

    card_data = {
        "spid": spid,
        "pid": pid,
        "name": name,
        "season_id": season_id,
        "season_code": season_code,
        "season_name": season_name,
        "season_img": season_img,
        "thumb_url": thumb_url,
        "primary_position": primary_position,
        "positions": positions,
        "ovr": ovr,
        "salary": salary,
        "foot": foot,
        "skill_moves": skill_moves,
        "height": height,
        "weight": weight,
        "body_type": body_type,
        "birth": birth,
        "team": team,
        "nation": nation,
        "traits": traits,
        "team_colors": team_colors,
        "position_ovrs": position_ovrs,
        "stats": stats,
        "prices": prices,
        "bp_1": bp_1,
        "bp_5": bp_5,
        "bp_8": bp_8,
        "rating_score": rating_score,
        "rating_count": rating_count,
        "has_full_ability": True,
        "crawled_at": now_iso(),
    }
    upsert_player_card(card_data)
    return card_data


def crawl_price_history(spid: int, grade: int = 1) -> Dict[str, Any]:
    """
    Crawls FC Online Official Datacenter (/datacenter/PlayerPriceGraph) for daily BP price history.
    """
    conn = get_connection()
    cached = conn.execute(
        "SELECT * FROM price_history_cache WHERE spid = ? AND grade = ?",
        (spid, grade),
    ).fetchone()
    if cached:
        conn.close()
        try:
            data = json.loads(cached["history_json"])
            data["crawled_at"] = cached["crawled_at"]
            return data
        except Exception:
            pass
    else:
        conn.close()

    payload = urllib.parse.urlencode(
        {"spid": spid, "n1strong": grade, "rd": 0.37}
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://fconline.nexon.com/datacenter/PlayerPriceGraph",
        data=payload,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return {"spid": spid, "grade": grade, "points": [], "current_bp": 0, "error": str(e)}

    m_curr = re.search(
        r'<span>현재가</span>\s*<strong[^>]*alt="([^"]*)"[^>]*>(.*?)</strong>',
        html,
        re.S,
    )
    current_bp = 0
    current_text = "-"
    if m_curr:
        raw_alt = m_curr.group(1).replace(",", "").strip()
        if raw_alt.isdigit():
            current_bp = int(raw_alt)
        current_text = m_curr.group(2).strip()

    m_time = re.search(r'"time"\s*:\s*\[(.*?)\]', html, re.S)
    m_val = re.search(r'"value"\s*:\s*\[(.*?)\]', html, re.S)

    times = re.findall(r'"([^"]+)"', m_time.group(1)) if m_time else []
    vals = [int(v) for v in re.findall(r'"(\d+)"', m_val.group(1))] if m_val else []

    if not current_bp and vals:
        current_bp = vals[-1]
        current_text = format_bp_korean(current_bp)

    points = []
    # Return last 30 points for clean chart display
    paired = list(zip(times, vals))[-30:]
    for dt_label, bp_val in paired:
        points.append(
            {
                "date": dt_label,
                "bp": bp_val,
                "formatted": format_bp_korean(bp_val),
            }
        )

    ts = now_iso()
    result = {
        "spid": spid,
        "grade": grade,
        "current_bp": current_bp,
        "current_text": current_text,
        "max_30d_bp": max([p["bp"] for p in points], default=current_bp),
        "min_30d_bp": min([p["bp"] for p in points], default=current_bp),
        "points": points,
        "crawled_at": ts,
    }

    conn2 = get_connection()
    with conn2:
        conn2.execute(
            """
            INSERT OR REPLACE INTO price_history_cache (spid, grade, history_json, crawled_at)
            VALUES (?, ?, ?, ?)
            """,
            (spid, grade, json.dumps(result, ensure_ascii=False), ts),
        )
    conn2.close()
    return result


def sync_game_rules_from_web() -> Dict[str, Any]:
    """
    Crawls FC Online Official SquadMaker & Datacenter pages to detect current salaryCap and maxEnhanceLevel.
    """
    current_rules = get_system_rules()
    detected_salary_cap = current_rules["salaryCap"]
    detected_max_enhance = current_rules["maxEnhanceLevel"]

    try:
        req = urllib.request.Request(
            "https://fconline.nexon.com/datacenter/squadmaker",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Parse salary cap from squadmaker (e.g. / 310, maxPay, pay_limit, etc.)
        salary_candidates: List[int] = []
        for pattern in [
            r'/\s*(2[789][05]|3[0-9][05])\b',
            r'max[_-]?pay["\'\s:=]+(2[789][05]|3[0-9][05])\b',
            r'급여[^0-9]{0,20}(2[789][05]|3[0-9][05])\b',
            r'<span[^>]*class="[^"]*pay[^"]*"[^>]*>\s*(2[789][05]|3[0-9][05])\s*</span>',
        ]:
            for m in re.finditer(pattern, html, re.I):
                val = int(m.group(1))
                if 270 <= val <= 400 and val % 5 == 0:
                    salary_candidates.append(val)

        if salary_candidates:
            detected_salary_cap = max(detected_salary_cap, max(salary_candidates))

        # Parse max enhancement level from <option> or span_bp tags
        enhance_candidates: List[int] = []
        for m in re.finditer(r'<option[^>]*value=["\']?(\d{1,2})["\']?[^>]*>\s*\+?\1(?:강)?\s*</option>', html):
            lvl = int(m.group(1))
            if 10 <= lvl <= 20:
                enhance_candidates.append(lvl)
        for m in re.finditer(r'span_bp(\d{1,2})', html):
            lvl = int(m.group(1))
            if 10 <= lvl <= 20:
                enhance_candidates.append(lvl)

        if enhance_candidates:
            detected_max_enhance = max(detected_max_enhance, max(enhance_candidates))
    except Exception:
        pass

    return update_system_rules(
        {
            "salaryCap": detected_salary_cap,
            "maxEnhanceLevel": detected_max_enhance,
            "lastSyncedAt": now_iso(),
            "syncSource": "crawler",
        }
    )


def ensure_player_salary_and_meta(spid: int) -> Optional[Dict[str, Any]]:
    """
    On-demand crawler that ensures a player's salary, OVR, and position are cached in DB.
    Checks local DB first, then fetches DataCenter/PlayerInfo?spid={spid}&n1Strong=1 or PlayerAbility.
    """
    conn = get_connection()
    existing = conn.execute(
        "SELECT * FROM player_cards WHERE spid = ?", (spid,)
    ).fetchone()
    conn.close()

    if existing and int(existing["salary"] or 0) > 0:
        return row_to_card_dict(existing)

    # Try PlayerInfo?spid={spid}&n1Strong=1 first, then fallback to crawl_player_ability
    try:
        url = f"https://fconline.nexon.com/DataCenter/PlayerInfo?spid={spid}&n1Strong=1"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        m_pay = re.search(r'<div class="pay_side">\s*(\d+)\s*</div>|<span class="pay">\s*(\d+)\s*</span>', html)
        m_name = re.search(r'<div class="name">\s*([^<]+)\s*</div>', html)
        m_pos = re.search(r'<span class="txt">\s*([A-Z]{2,3})\s*</span>\s*<span class="[^"]*value">\s*(\d+)\s*</span>', html)

        if m_pay:
            salary_val = int(m_pay.group(1) or m_pay.group(2))
            name_val = m_name.group(1).strip() if m_name else f"선수 #{spid % 1000000}"
            pos_val = m_pos.group(1).strip() if m_pos else "ST"
            ovr_val = int(m_pos.group(2)) if m_pos else 105
            season_id = spid // 1000000
            pid = spid % 1000000
            seasons_map = get_season_lookup()
            s_meta = seasons_map.get(season_id, {})

            card_data = {
                "spid": spid,
                "pid": pid,
                "name": name_val,
                "season_id": season_id,
                "season_code": s_meta.get("season_code", str(season_id)),
                "season_name": s_meta.get("class_name", str(season_id)),
                "season_img": s_meta.get("season_img", ""),
                "thumb_url": f"https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p{spid}.png",
                "primary_position": pos_val,
                "positions": [{"pos": pos_val, "ovr": ovr_val}],
                "ovr": ovr_val,
                "salary": salary_val,
                "foot": "L4 - R5",
                "has_full_ability": False,
                "crawled_at": now_iso(),
            }
            upsert_player_card(card_data)
            return card_data
    except Exception:
        pass

    return crawl_player_ability(spid)

