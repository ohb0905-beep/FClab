import os
import json
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fclab.db")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db() -> None:
    conn = get_connection()
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS meta_seasons (
                season_id INTEGER PRIMARY KEY,
                class_name TEXT NOT NULL,
                season_code TEXT NOT NULL,
                season_img TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meta_positions (
                spposition INTEGER PRIMARY KEY,
                desc TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meta_divisions (
                division_id INTEGER PRIMARY KEY,
                division_name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meta_matchtypes (
                matchtype INTEGER PRIMARY KEY,
                desc TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS player_cards (
                spid INTEGER PRIMARY KEY,
                pid INTEGER NOT NULL,
                name TEXT NOT NULL,
                season_id INTEGER NOT NULL,
                season_code TEXT NOT NULL,
                season_name TEXT NOT NULL,
                season_img TEXT NOT NULL,
                thumb_url TEXT NOT NULL,
                primary_position TEXT NOT NULL,
                positions_json TEXT NOT NULL,
                ovr INTEGER NOT NULL,
                salary INTEGER NOT NULL,
                foot TEXT NOT NULL,
                skill_moves TEXT DEFAULT '',
                height INTEGER DEFAULT 180,
                weight INTEGER DEFAULT 75,
                body_type TEXT DEFAULT '보통',
                birth TEXT DEFAULT '',
                team TEXT DEFAULT '',
                nation TEXT DEFAULT '',
                traits_json TEXT DEFAULT '[]',
                team_colors_json TEXT DEFAULT '[]',
                position_ovrs_json TEXT DEFAULT '{}',
                stats_json TEXT DEFAULT '{}',
                prices_json TEXT DEFAULT '{}',
                bp_1 INTEGER DEFAULT 0,
                bp_5 INTEGER DEFAULT 0,
                bp_8 INTEGER DEFAULT 0,
                rating_score REAL DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                has_full_ability INTEGER DEFAULT 0,
                crawled_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_player_cards_name ON player_cards(name);
            CREATE INDEX IF NOT EXISTS idx_player_cards_pid ON player_cards(pid);
            CREATE INDEX IF NOT EXISTS idx_player_cards_pos ON player_cards(primary_position);
            CREATE INDEX IF NOT EXISTS idx_player_cards_ovr ON player_cards(ovr DESC);

            CREATE TABLE IF NOT EXISTS price_history_cache (
                spid INTEGER NOT NULL,
                grade INTEGER NOT NULL,
                history_json TEXT NOT NULL,
                crawled_at TEXT NOT NULL,
                PRIMARY KEY (spid, grade)
            );

            CREATE TABLE IF NOT EXISTS saved_squads (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                formation TEXT NOT NULL,
                budget_bp INTEGER NOT NULL,
                salary_cap INTEGER NOT NULL,
                team_color_name TEXT DEFAULT '',
                team_color_bonus INTEGER DEFAULT 0,
                slots_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS match_cache (
                match_id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                cached_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
    conn.close()


def row_to_card_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for json_field, target_field, default_val in [
        ("positions_json", "positions", []),
        ("traits_json", "traits", []),
        ("team_colors_json", "team_colors", []),
        ("position_ovrs_json", "position_ovrs", {}),
        ("stats_json", "stats", {}),
        ("prices_json", "prices", {}),
    ]:
        raw = d.pop(json_field, None)
        try:
            d[target_field] = json.loads(raw) if raw else default_val
        except Exception:
            d[target_field] = default_val
    d["has_full_ability"] = bool(d.get("has_full_ability", 0))
    return d


def upsert_player_card(card: Dict[str, Any]) -> None:
    conn = get_connection()
    existing = conn.execute(
        "SELECT * FROM player_cards WHERE spid = ?", (card["spid"],)
    ).fetchone()

    if existing and not card.get("has_full_ability") and existing["has_full_ability"]:
        # Preserve already crawled detailed ability stats while updating live prices
        for keep_key in [
            "skill_moves",
            "height",
            "weight",
            "body_type",
            "birth",
            "team",
            "nation",
            "traits_json",
            "team_colors_json",
            "position_ovrs_json",
            "stats_json",
            "has_full_ability",
        ]:
            card[keep_key] = existing[keep_key]

    with conn:
        conn.execute(
            """
            INSERT INTO player_cards (
                spid, pid, name, season_id, season_code, season_name, season_img,
                thumb_url, primary_position, positions_json, ovr, salary, foot,
                skill_moves, height, weight, body_type, birth, team, nation,
                traits_json, team_colors_json, position_ovrs_json, stats_json,
                prices_json, bp_1, bp_5, bp_8, rating_score, rating_count,
                has_full_ability, crawled_at
            ) VALUES (
                :spid, :pid, :name, :season_id, :season_code, :season_name, :season_img,
                :thumb_url, :primary_position, :positions_json, :ovr, :salary, :foot,
                :skill_moves, :height, :weight, :body_type, :birth, :team, :nation,
                :traits_json, :team_colors_json, :position_ovrs_json, :stats_json,
                :prices_json, :bp_1, :bp_5, :bp_8, :rating_score, :rating_count,
                :has_full_ability, :crawled_at
            )
            ON CONFLICT(spid) DO UPDATE SET
                name = excluded.name,
                season_code = excluded.season_code,
                season_name = excluded.season_name,
                season_img = excluded.season_img,
                thumb_url = excluded.thumb_url,
                primary_position = excluded.primary_position,
                positions_json = excluded.positions_json,
                ovr = excluded.ovr,
                salary = excluded.salary,
                foot = excluded.foot,
                skill_moves = excluded.skill_moves,
                height = excluded.height,
                weight = excluded.weight,
                body_type = excluded.body_type,
                birth = excluded.birth,
                team = excluded.team,
                nation = excluded.nation,
                traits_json = excluded.traits_json,
                team_colors_json = excluded.team_colors_json,
                position_ovrs_json = excluded.position_ovrs_json,
                stats_json = excluded.stats_json,
                prices_json = excluded.prices_json,
                bp_1 = excluded.bp_1,
                bp_5 = excluded.bp_5,
                bp_8 = excluded.bp_8,
                rating_score = excluded.rating_score,
                rating_count = excluded.rating_count,
                has_full_ability = excluded.has_full_ability,
                crawled_at = excluded.crawled_at
            """,
            {
                "spid": int(card["spid"]),
                "pid": int(card.get("pid", int(card["spid"]) % 1000000)),
                "name": str(card.get("name", "")),
                "season_id": int(card.get("season_id", int(card["spid"]) // 1000000)),
                "season_code": str(card.get("season_code", "")),
                "season_name": str(card.get("season_name", "")),
                "season_img": str(card.get("season_img", "")),
                "thumb_url": str(card.get("thumb_url", "")),
                "primary_position": str(card.get("primary_position", "ST")),
                "positions_json": card.get("positions_json")
                if isinstance(card.get("positions_json"), str)
                else json.dumps(card.get("positions", []), ensure_ascii=False),
                "ovr": int(card.get("ovr", 100)),
                "salary": int(card.get("salary", 20)),
                "foot": str(card.get("foot", "L4 - R5")),
                "skill_moves": str(card.get("skill_moves", "★★★★☆☆")),
                "height": int(card.get("height", 180)),
                "weight": int(card.get("weight", 75)),
                "body_type": str(card.get("body_type", "보통")),
                "birth": str(card.get("birth", "")),
                "team": str(card.get("team", "")),
                "nation": str(card.get("nation", "")),
                "traits_json": card.get("traits_json")
                if isinstance(card.get("traits_json"), str)
                else json.dumps(card.get("traits", []), ensure_ascii=False),
                "team_colors_json": card.get("team_colors_json")
                if isinstance(card.get("team_colors_json"), str)
                else json.dumps(card.get("team_colors", []), ensure_ascii=False),
                "position_ovrs_json": card.get("position_ovrs_json")
                if isinstance(card.get("position_ovrs_json"), str)
                else json.dumps(card.get("position_ovrs", {}), ensure_ascii=False),
                "stats_json": card.get("stats_json")
                if isinstance(card.get("stats_json"), str)
                else json.dumps(card.get("stats", {}), ensure_ascii=False),
                "prices_json": card.get("prices_json")
                if isinstance(card.get("prices_json"), str)
                else json.dumps(card.get("prices", {}), ensure_ascii=False),
                "bp_1": int(card.get("bp_1", 0)),
                "bp_5": int(card.get("bp_5", 0)),
                "bp_8": int(card.get("bp_8", 0)),
                "rating_score": float(card.get("rating_score", 0.0)),
                "rating_count": int(card.get("rating_count", 0)),
                "has_full_ability": 1 if card.get("has_full_ability") else 0,
                "crawled_at": card.get("crawled_at") or now_iso(),
            },
        )
    conn.close()


def get_setting(key: str, default: str = "") -> str:
    conn = get_connection()
    row = conn.execute(
        "SELECT value FROM app_settings WHERE key = ?", (key,)
    ).fetchone()
    conn.close()
    if row and row["value"]:
        return row["value"]
    return os.environ.get(key, default)


def set_setting(key: str, value: str) -> None:
    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, value.strip(), now_iso()),
        )
    conn.close()
