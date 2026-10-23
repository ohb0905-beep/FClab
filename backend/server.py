import os
import sys
import json
import uuid
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import (
    init_db,
    get_connection,
    row_to_card_dict,
    get_setting,
    set_setting,
    now_iso,
)
from crawler import (
    sync_nexon_metadata,
    crawl_player_list,
    crawl_player_ability,
    crawl_price_history,
)
from nexon_api import (
    NexonAPIError,
    resolve_api_key,
    get_user_profile,
    get_user_matches_with_details,
)
from analytics import (
    POSITION_WEIGHTS,
    ARCHETYPES,
    evaluate_card_efficiency,
    analyze_player_profile,
    analyze_squad,
    analyze_matches,
)
from seed_initial import ensure_initial_data


def handle_api_request(
    method: str,
    path: str,
    query: Dict[str, str],
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Any:
    """
    Core router for FClab Python Backend.
    Returns (status_code, response_dict).
    """
    body = body or {}
    headers = headers or {}
    header_api_key = headers.get("x-nxopen-api-key", "") or query.get("apiKey", "")

    try:
        # 1. Health & Dashboard Overview
        if path == "/api/v1/dashboard" and method == "GET":
            conn = get_connection()
            total_cards = conn.execute("SELECT COUNT(*) as c FROM player_cards").fetchone()["c"]
            full_cards = conn.execute(
                "SELECT COUNT(*) as c FROM player_cards WHERE has_full_ability = 1"
            ).fetchone()["c"]
            season_count = conn.execute("SELECT COUNT(*) as c FROM meta_seasons").fetchone()["c"]

            top_rows = conn.execute(
                "SELECT * FROM player_cards WHERE has_full_ability = 1 ORDER BY ovr DESC, bp_1 DESC LIMIT 8"
            ).fetchall()
            top_cards = [row_to_card_dict(r) for r in top_rows]

            # Evaluate efficiency on full-ability cards to surface top value picks
            all_full_rows = conn.execute(
                "SELECT * FROM player_cards WHERE has_full_ability = 1 AND bp_1 > 0 LIMIT 24"
            ).fetchall()
            eff_picks = []
            for r in all_full_rows:
                c = row_to_card_dict(r)
                ev = evaluate_card_efficiency(c, c["primary_position"], grade=5, team_color_bonus=3)
                eff_picks.append(ev)
            eff_picks.sort(key=lambda x: x["efficiency_index"], reverse=True)

            squad_rows = conn.execute(
                "SELECT * FROM saved_squads ORDER BY updated_at DESC"
            ).fetchall()
            saved_squads = []
            for sr in squad_rows:
                sd = dict(sr)
                sd["slots"] = json.loads(sd.pop("slots_json", "[]"))
                saved_squads.append(sd)

            seasons_rows = conn.execute(
                "SELECT DISTINCT season_code, season_name, season_img FROM player_cards ORDER BY season_id DESC"
            ).fetchall()
            available_seasons = [dict(r) for r in seasons_rows]
            conn.close()

            active_key = resolve_api_key(header_api_key)
            return 200, {
                "status": "ok",
                "stats": {
                    "totalCards": total_cards,
                    "detailedCards": full_cards,
                    "seasonsCount": season_count,
                    "hasNexonApiKey": bool(active_key),
                    "serverTime": now_iso(),
                },
                "topCards": top_cards,
                "efficiencyPicks": eff_picks[:6],
                "savedSquads": saved_squads,
                "availableSeasons": available_seasons,
                "positionWeights": POSITION_WEIGHTS,
                "archetypes": ARCHETYPES,
            }

        # 2. Player Lab — Search & Filter
        if path == "/api/v1/players/search" and method == "GET":
            q = query.get("q", "").strip()
            pos = query.get("position", "").strip().upper()
            season = query.get("season", "").strip()
            sort_by = query.get("sort", "ovr_desc")
            force_crawl = query.get("crawl", "0") == "1"

            conn = get_connection()
            if q:
                existing_count = conn.execute(
                    "SELECT COUNT(*) as c FROM player_cards WHERE name LIKE ?",
                    (f"%{q}%",),
                ).fetchone()["c"]
                if existing_count < 3 or force_crawl:
                    conn.close()
                    crawl_player_list(q, limit=40)
                    conn = get_connection()

            sql = "SELECT * FROM player_cards WHERE 1=1"
            params = []
            if q:
                sql += " AND name LIKE ?"
                params.append(f"%{q}%")
            if pos and pos != "ALL":
                sql += " AND (primary_position = ? OR positions_json LIKE ?)"
                params.extend([pos, f'%"{pos}"%'])
            if season and season != "ALL":
                sql += " AND season_code = ?"
                params.append(season)

            if sort_by == "bp_desc":
                sql += " ORDER BY bp_1 DESC, ovr DESC"
            elif sort_by == "bp_asc":
                sql += " ORDER BY CASE WHEN bp_1 > 0 THEN bp_1 ELSE 999999999999999 END ASC, ovr DESC"
            elif sort_by == "salary_asc":
                sql += " ORDER BY salary ASC, ovr DESC"
            elif sort_by == "rating_desc":
                sql += " ORDER BY rating_score DESC, rating_count DESC"
            else:
                sql += " ORDER BY ovr DESC, bp_1 DESC"

            sql += " LIMIT 60"
            rows = conn.execute(sql, params).fetchall()
            conn.close()
            cards = [row_to_card_dict(r) for r in rows]
            return 200, {
                "cards": cards,
                "count": len(cards),
                "query": q,
                "fetchedAt": now_iso(),
            }

        # 3. Player Lab — Detailed Card View + Comparison + Price History
        if path == "/api/v1/players/detail" and method == "GET":
            spid = int(query.get("spid", "0"))
            grade = int(query.get("grade", "1"))
            team_color = int(query.get("team_color", "0"))
            target_pos = query.get("pos", "").strip().upper()

            if spid <= 0:
                return 400, {"error": "유효한 선수 식별자(spid)가 필요합니다."}

            card = crawl_player_ability(spid, force=query.get("refresh") == "1")
            if not card:
                return 404, {"error": f"선수 카드({spid}) 정보를 불러올 수 없습니다."}

            pos_to_use = target_pos or card.get("primary_position", "ST")
            efficiency = evaluate_card_efficiency(
                card,
                target_position=pos_to_use,
                grade=grade,
                team_color_bonus=team_color,
            )
            profile = analyze_player_profile(card, grade=grade, team_color_bonus=team_color)
            price_history = crawl_price_history(spid, grade=min(max(1, grade), 8))

            conn = get_connection()
            same_pid_rows = conn.execute(
                "SELECT * FROM player_cards WHERE pid = ? AND spid != ? ORDER BY ovr DESC LIMIT 12",
                (card["pid"], spid),
            ).fetchall()
            competitor_rows = conn.execute(
                """
                SELECT * FROM player_cards
                WHERE primary_position = ? AND pid != ? AND has_full_ability = 1
                ORDER BY ABS(ovr - ?) ASC, bp_1 DESC
                LIMIT 6
                """,
                (card["primary_position"], card["pid"], card["ovr"]),
            ).fetchall()
            conn.close()

            return 200, {
                "card": card,
                "efficiency": efficiency,
                "profile": profile,
                "priceHistory": price_history,
                "otherSeasons": [row_to_card_dict(r) for r in same_pid_rows],
                "competitors": [row_to_card_dict(r) for r in competitor_rows],
                "fetchedAt": now_iso(),
            }

        # 4. Card Efficiency Lab — Multi-card & Custom Weight Evaluation
        if path == "/api/v1/efficiency/analyze" and method == "POST":
            player_query = str(body.get("query", "")).strip()
            target_pos = str(body.get("position", "ST")).strip().upper()
            grade = int(body.get("grade", 5))
            team_color = int(body.get("team_color", 3))
            max_bp = int(body.get("max_bp", 0))
            custom_weights = body.get("custom_weights")

            conn = get_connection()
            if player_query:
                cnt = conn.execute(
                    "SELECT COUNT(*) as c FROM player_cards WHERE name LIKE ?",
                    (f"%{player_query}%",),
                ).fetchone()["c"]
                if cnt < 3:
                    conn.close()
                    crawl_player_list(player_query, limit=30)
                    conn = get_connection()

                rows = conn.execute(
                    "SELECT * FROM player_cards WHERE name LIKE ? ORDER BY ovr DESC LIMIT 15",
                    (f"%{player_query}%",),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT * FROM player_cards
                    WHERE primary_position = ? OR positions_json LIKE ?
                    ORDER BY ovr DESC LIMIT 20
                    """,
                    (target_pos, f'%"{target_pos}"%'),
                ).fetchall()
            conn.close()

            # Ensure top 8 candidates have full ability crawled
            evaluations = []
            for idx, r in enumerate(rows):
                c = row_to_card_dict(r)
                if idx < 8 and not c.get("has_full_ability"):
                    crawled = crawl_player_ability(c["spid"])
                    if crawled:
                        c = crawled
                ev = evaluate_card_efficiency(
                    c,
                    target_position=target_pos,
                    grade=grade,
                    team_color_bonus=team_color,
                    custom_weights=custom_weights,
                )
                if max_bp > 0 and ev["bp"] > max_bp:
                    continue
                evaluations.append(ev)

            evaluations.sort(key=lambda x: (x["efficiency_index"], x["core_score"]), reverse=True)
            used_weights = custom_weights or POSITION_WEIGHTS.get(target_pos, POSITION_WEIGHTS["ST"])
            return 200, {
                "position": target_pos,
                "grade": grade,
                "teamColorBonus": team_color,
                "weightsUsed": used_weights,
                "results": evaluations,
                "recommendedTop": evaluations[0] if evaluations else None,
                "analyzedAt": now_iso(),
            }

        # 5. Player Profile Lab — Archetype Suitability & Head-to-Head Comparison
        if path == "/api/v1/profile/analyze" and method == "POST":
            spid = int(body.get("spid", 0))
            compare_spid = int(body.get("compare_spid", 0) or 0)
            grade = int(body.get("grade", 5))
            team_color = int(body.get("team_color", 3))

            card = crawl_player_ability(spid)
            if not card:
                return 404, {"error": "분석할 선수 카드를 찾을 수 없습니다."}

            primary_profile = analyze_player_profile(card, grade=grade, team_color_bonus=team_color)
            compare_profile = None
            compare_card = None
            if compare_spid > 0 and compare_spid != spid:
                compare_card = crawl_player_ability(compare_spid)
                if compare_card:
                    compare_profile = analyze_player_profile(
                        compare_card, grade=grade, team_color_bonus=team_color
                    )

            return 200, {
                "card": card,
                "profile": primary_profile,
                "compareCard": compare_card,
                "compareProfile": compare_profile,
                "analyzedAt": now_iso(),
            }

        # 6. Squad Lab — Evaluate, Save, Load, Delete
        if path == "/api/v1/squads" and method == "GET":
            conn = get_connection()
            rows = conn.execute("SELECT * FROM saved_squads ORDER BY updated_at DESC").fetchall()
            conn.close()
            squads = []
            for r in rows:
                d = dict(r)
                d["slots"] = json.loads(d.pop("slots_json", "[]"))
                squads.append(d)
            return 200, {"squads": squads}

        if path == "/api/v1/squads/evaluate" and method == "POST":
            slots = body.get("slots", [])
            formation = str(body.get("formation", "4-2-3-1"))
            budget_bp = int(body.get("budget_bp", 50_000_000_000))
            salary_cap = int(body.get("salary_cap", 270))
            team_color_bonus = int(body.get("team_color_bonus", 3))

            analysis = analyze_squad(
                slots=slots,
                formation=formation,
                budget_bp=budget_bp,
                salary_cap=salary_cap,
                team_color_bonus=team_color_bonus,
            )
            return 200, analysis

        if path == "/api/v1/squads/save" and method == "POST":
            squad_id = str(body.get("id") or f"squad-{uuid.uuid4().hex[:8]}")
            name = str(body.get("name", "나의 커스텀 스쿼드")).strip() or "나의 커스텀 스쿼드"
            formation = str(body.get("formation", "4-2-3-1"))
            budget_bp = int(body.get("budget_bp", 50_000_000_000))
            salary_cap = int(body.get("salary_cap", 270))
            tc_name = str(body.get("team_color_name", "커스텀 팀컬러"))
            tc_bonus = int(body.get("team_color_bonus", 3))
            slots = body.get("slots", [])
            ts = now_iso()

            conn = get_connection()
            with conn:
                conn.execute(
                    """
                    INSERT INTO saved_squads (
                        id, name, formation, budget_bp, salary_cap,
                        team_color_name, team_color_bonus, slots_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        formation = excluded.formation,
                        budget_bp = excluded.budget_bp,
                        salary_cap = excluded.salary_cap,
                        team_color_name = excluded.team_color_name,
                        team_color_bonus = excluded.team_color_bonus,
                        slots_json = excluded.slots_json,
                        updated_at = excluded.updated_at
                    """,
                    (
                        squad_id,
                        name,
                        formation,
                        budget_bp,
                        salary_cap,
                        tc_name,
                        tc_bonus,
                        json.dumps(slots, ensure_ascii=False),
                        ts,
                        ts,
                    ),
                )
            conn.close()
            return 200, {"status": "saved", "id": squad_id, "updatedAt": ts}

        if path == "/api/v1/squads/delete" and method == "POST":
            squad_id = str(body.get("id", ""))
            conn = get_connection()
            with conn:
                conn.execute("DELETE FROM saved_squads WHERE id = ?", (squad_id,))
            conn.close()
            return 200, {"status": "deleted", "id": squad_id}

        # 7. Match Lab — Live Nexon Open API Match Analysis
        if path == "/api/v1/match/analyze" and method == "GET":
            nickname = query.get("nickname", "").strip()
            matchtype = int(query.get("matchtype", "50"))
            limit = int(query.get("limit", "15"))

            if not nickname:
                return 400, {"error": "조회할 구단주 닉네임을 입력해 주세요."}

            user_profile = get_user_profile(nickname, api_key=header_api_key)
            ouid = user_profile["ouid"]
            match_details = get_user_matches_with_details(
                ouid=ouid,
                matchtype=matchtype,
                limit=limit,
                api_key=header_api_key,
            )

            # Crawl ability for any starting XI player not yet in our SQLite DB
            conn = get_connection()
            if match_details:
                first_match = match_details[0]
                for minfo in first_match.get("matchInfo", []):
                    if minfo.get("ouid") == ouid:
                        for p in minfo.get("player", [])[:18]:
                            spid = int(p.get("spId", 0) or 0)
                            if spid > 0:
                                row = conn.execute(
                                    "SELECT spid FROM player_cards WHERE spid = ?", (spid,)
                                ).fetchone()
                                if not row:
                                    crawl_player_ability(spid)
            conn.close()

            analysis = analyze_matches(ouid=ouid, nickname=user_profile["nickname"], match_details=match_details)
            return 200, {
                "user": user_profile,
                "analysis": analysis,
            }

        # 8. Settings & On-Demand Crawler Trigger
        if path == "/api/v1/settings" and method == "GET":
            key = resolve_api_key(header_api_key)
            masked = f"{key[:8]}...{key[-6:]}" if len(key) > 16 else ("설정됨" if key else "")
            conn = get_connection()
            c_cards = conn.execute("SELECT COUNT(*) as c FROM player_cards").fetchone()["c"]
            c_full = conn.execute(
                "SELECT COUNT(*) as c FROM player_cards WHERE has_full_ability = 1"
            ).fetchone()["c"]
            c_seasons = conn.execute("SELECT COUNT(*) as c FROM meta_seasons").fetchone()["c"]
            conn.close()
            return 200, {
                "hasApiKey": bool(key),
                "maskedApiKey": masked,
                "dbStats": {
                    "totalCards": c_cards,
                    "fullAbilityCards": c_full,
                    "seasons": c_seasons,
                },
            }

        if path == "/api/v1/settings" and method == "POST":
            action = body.get("action", "save_key")
            if action == "save_key":
                api_key = str(body.get("nexonApiKey", "")).strip()
                set_setting("NEXON_OPEN_API_KEY", api_key)
                return 200, {
                    "status": "saved",
                    "hasApiKey": bool(api_key),
                    "message": "넥슨 Open API 키가 백엔드 보안 저장소에 저장되었습니다.",
                }
            elif action == "crawl_players":
                names_raw = str(body.get("playerNames", "")).strip()
                names = [n.strip() for n in names_raw.split(",") if n.strip()]
                crawled_total = 0
                for name in names[:5]:
                    cards = crawl_player_list(name, limit=25)
                    crawled_total += len(cards)
                    for c in cards[:3]:
                        crawl_player_ability(c["spid"])
                return 200, {
                    "status": "crawled",
                    "crawledCount": crawled_total,
                    "message": f"{len(names[:5])}명의 선수 카드 및 세부 스탯·시세 크롤링이 완료되었습니다.",
                }
            elif action == "sync_meta":
                res = sync_nexon_metadata(force=True)
                return 200, res

        return 404, {"error": f"알 수 없는 백엔드 엔드포인트: {method} {path}"}

    except NexonAPIError as ne:
        return ne.status_code, {
            "error": ne.message,
            "errorCode": ne.error_code,
        }
    except Exception as e:
        return 500, {"error": f"백엔드 처리 오류: {str(e)}"}


TupleResponse = Any


class FClabHTTPRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass

    def _send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-nxopen-api-key")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:
        self._send_json(200, {"status": "ok"})

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        query = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        headers = {k.lower(): v for k, v in self.headers.items()}
        status, resp = handle_api_request("GET", parsed.path, query, None, headers)
        self._send_json(status, resp)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        query = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        headers = {k.lower(): v for k, v in self.headers.items()}
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = {}
        if length > 0:
            raw_body = self.rfile.read(length).decode("utf-8", errors="ignore")
            try:
                body = json.loads(raw_body)
            except Exception:
                body = {}
        status, resp = handle_api_request("POST", parsed.path, query, body, headers)
        self._send_json(status, resp)


if __name__ == "__main__":
    print("[FClab Python Backend] Initializing database and syncing Nexon metadata + live Datacenter seed...")
    ensure_initial_data()
    port = int(os.environ.get("PYTHON_PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), FClabHTTPRequestHandler)
    print(f"[FClab Python Backend] Listening on http://127.0.0.1:{port}")
    server.serve_forever()
