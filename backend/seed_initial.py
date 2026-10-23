import json
from concurrent.futures import ThreadPoolExecutor
from database import init_db, get_connection, now_iso
from crawler import sync_nexon_metadata, crawl_player_list, crawl_player_ability

INITIAL_META_PLAYERS = [
    "손흥민",
    "차범근",
    "박지성",
    "김민재",
    "이강인",
    "벨링엄",
    "발베르데",
    "굴리트",
    "반데이크",
    "테오 에르난데스",
    "하키미",
    "쿠르투아",
    "호나우두",
]


def ensure_initial_data() -> dict:
    init_db()
    meta_res = sync_nexon_metadata(force=False)

    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) as c FROM player_cards").fetchone()["c"]
    conn.close()

    if count >= 30:
        return {"status": "ready", "cached_cards": count, "meta": meta_res}

    # Crawl initial meta players in parallel from FC Online Datacenter
    crawled_cards = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(crawl_player_list, name, 12): name for name in INITIAL_META_PLAYERS}
        for f in futures:
            try:
                res = f.result()
                if res:
                    crawled_cards.extend(res)
            except Exception:
                pass

    # Pick top 2 cards per player to crawl full 34 detailed stats immediately
    conn = get_connection()
    top_spids = []
    for name in INITIAL_META_PLAYERS:
        rows = conn.execute(
            "SELECT spid FROM player_cards WHERE name LIKE ? ORDER BY ovr DESC LIMIT 2",
            (f"%{name}%",),
        ).fetchall()
        for r in rows:
            top_spids.append(r["spid"])
    conn.close()

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(crawl_player_ability, top_spids[:26]))

    # Create a default saved squad using real crawled spids if none exists
    conn = get_connection()
    squad_count = conn.execute("SELECT COUNT(*) as c FROM saved_squads").fetchone()["c"]
    if squad_count == 0:
        def find_card_for(name_kw: str, fallback_pos: str) -> int:
            r = conn.execute(
                "SELECT spid FROM player_cards WHERE name LIKE ? AND has_full_ability = 1 ORDER BY ovr DESC LIMIT 1",
                (f"%{name_kw}%",),
            ).fetchone()
            if r:
                return r["spid"]
            r2 = conn.execute(
                "SELECT spid FROM player_cards WHERE primary_position = ? ORDER BY ovr DESC LIMIT 1",
                (fallback_pos,),
            ).fetchone()
            return r2["spid"] if r2 else 0

        default_slots = [
            {"slot_id": "ST", "slot_position": "ST", "spid": find_card_for("호나우두", "ST"), "grade": 5},
            {"slot_id": "LW", "slot_position": "LW", "spid": find_card_for("손흥민", "LW"), "grade": 5},
            {"slot_id": "RW", "slot_position": "RW", "spid": find_card_for("차범근", "RW"), "grade": 5},
            {"slot_id": "CAM", "slot_position": "CAM", "spid": find_card_for("벨링엄", "CAM"), "grade": 5},
            {"slot_id": "CDM1", "slot_position": "CDM", "spid": find_card_for("굴리트", "CDM"), "grade": 5},
            {"slot_id": "CDM2", "slot_position": "CDM", "spid": find_card_for("박지성", "CM"), "grade": 5},
            {"slot_id": "LB", "slot_position": "LB", "spid": find_card_for("테오", "LB"), "grade": 5},
            {"slot_id": "CB1", "slot_position": "CB", "spid": find_card_for("김민재", "CB"), "grade": 5},
            {"slot_id": "CB2", "slot_position": "CB", "spid": find_card_for("반데이크", "CB"), "grade": 5},
            {"slot_id": "RB", "slot_position": "RB", "spid": find_card_for("하키미", "RB"), "grade": 5},
            {"slot_id": "GK", "slot_position": "GK", "spid": find_card_for("쿠르투아", "GK"), "grade": 5},
        ]
        ts = now_iso()
        with conn:
            conn.execute(
                """
                INSERT INTO saved_squads (
                    id, name, formation, budget_bp, salary_cap,
                    team_color_name, team_color_bonus, slots_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "default-meta-4231",
                    "FClab 추천 메타 스쿼드 (4-2-3-1)",
                    "4-2-3-1",
                    50_000_000_000,
                    270,
                    "단일/강화 케미 (+3)",
                    3,
                    json.dumps(default_slots, ensure_ascii=False),
                    ts,
                    ts,
                ),
            )
    total_after = conn.execute("SELECT COUNT(*) as c FROM player_cards").fetchone()["c"]
    conn.close()
    return {"status": "seeded", "cached_cards": total_after, "meta": meta_res}


if __name__ == "__main__":
    res = ensure_initial_data()
    print(json.dumps(res, ensure_ascii=False))
