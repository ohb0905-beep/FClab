import json
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional
from database import get_connection, get_setting, now_iso

NEXON_BASE_URL = "https://open.api.nexon.com"
USER_AGENT = "FClab-Analytics/1.0"


class NexonAPIError(Exception):
    def __init__(self, status_code: int, error_code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message


def resolve_api_key(override_key: Optional[str] = None) -> str:
    if override_key and override_key.strip():
        return override_key.strip()
    return get_setting("NEXON_OPEN_API_KEY", "").strip()


def nexon_get(path: str, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> Any:
    key = resolve_api_key(api_key)
    if not key:
        raise NexonAPIError(
            401,
            "MISSING_API_KEY",
            "넥슨 Open API 키(x-nxopen-api-key)가 설정되지 않았습니다. 우측 상단 [API & 크롤러 설정]에서 발급받은 API 키를 등록해 주세요.",
        )

    url = f"{NEXON_BASE_URL}{path}"
    if params:
        query_str = urllib.parse.urlencode(params)
        url = f"{url}?{query_str}"

    req = urllib.request.Request(
        url,
        headers={
            "x-nxopen-api-key": key,
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
            err_json = json.loads(body)
            err_info = err_json.get("error", {})
            err_code = err_info.get("name", f"HTTP_{e.code}")
            err_msg = err_info.get("message", str(e))
        except Exception:
            err_code = f"HTTP_{e.code}"
            err_msg = body or str(e)

        friendly_map = {
            "OPENAPI00001": "넥슨 서버 내부 오류가 발생했습니다.",
            "OPENAPI00002": "해당 게임에 대한 권한이 없는 API 키입니다.",
            "OPENAPI00003": "유효하지 않은 식별자(ouid 또는 matchId)입니다.",
            "OPENAPI00004": "존재하지 않는 구단주 닉네임이거나 파라미터가 누락되었습니다.",
            "OPENAPI00005": "유효하지 않은 넥슨 Open API 키입니다. 키 값을 다시 확인해 주세요.",
            "OPENAPI00006": "잘못된 API 경로 요청입니다.",
            "OPENAPI00007": "API 호출 한도(Rate Limit)를 초과했습니다. 잠시 후 다시 시도해 주세요.",
            "OPENAPI00009": "데이터 준비 중입니다. 잠시 후 다시 시도해 주세요.",
        }
        msg = friendly_map.get(err_code, f"넥슨 API 오류 ({err_code}): {err_msg}")
        raise NexonAPIError(e.code, err_code, msg)
    except Exception as e:
        raise NexonAPIError(500, "NETWORK_ERROR", f"넥슨 Open API 통신 중 오류가 발생했습니다: {str(e)}")


def get_user_ouid(nickname: str, api_key: Optional[str] = None) -> str:
    res = nexon_get("/fconline/v1/id", {"nickname": nickname.strip()}, api_key=api_key)
    ouid = res.get("ouid")
    if not ouid:
        raise NexonAPIError(404, "USER_NOT_FOUND", f"'{nickname}' 구단주를 찾을 수 없습니다.")
    return ouid


def get_user_profile(nickname: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    ouid = get_user_ouid(nickname, api_key=api_key)
    basic = nexon_get("/fconline/v1/user/basic", {"ouid": ouid}, api_key=api_key)
    max_div = nexon_get("/fconline/v1/user/maxdivision", {"ouid": ouid}, api_key=api_key)

    conn = get_connection()
    div_rows = conn.execute("SELECT * FROM meta_divisions").fetchall()
    mt_rows = conn.execute("SELECT * FROM meta_matchtypes").fetchall()
    conn.close()

    div_map = {r["division_id"]: r["division_name"] for r in div_rows}
    mt_map = {r["matchtype"]: r["desc"] for r in mt_rows}

    enriched_divisions = []
    if isinstance(max_div, list):
        for item in max_div:
            mt_code = item.get("matchType")
            div_code = item.get("division")
            enriched_divisions.append(
                {
                    "matchType": mt_code,
                    "matchTypeName": mt_map.get(mt_code, f"매치타입 {mt_code}"),
                    "division": div_code,
                    "divisionName": div_map.get(div_code, f"등급 {div_code}"),
                    "achievementDate": item.get("achievementDate", ""),
                }
            )

    return {
        "ouid": ouid,
        "nickname": basic.get("nickname", nickname),
        "level": basic.get("level", 1),
        "maxDivisions": enriched_divisions,
        "fetchedAt": now_iso(),
    }


def get_match_detail_cached(match_id: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute(
        "SELECT payload_json FROM match_cache WHERE match_id = ?", (match_id,)
    ).fetchone()
    conn.close()

    if row:
        try:
            return json.loads(row["payload_json"])
        except Exception:
            pass

    try:
        detail = nexon_get("/fconline/v1/match-detail", {"matchid": match_id}, api_key=api_key)
        conn2 = get_connection()
        with conn2:
            conn2.execute(
                """
                INSERT OR REPLACE INTO match_cache (match_id, payload_json, cached_at)
                VALUES (?, ?, ?)
                """,
                (match_id, json.dumps(detail, ensure_ascii=False), now_iso()),
            )
        conn2.close()
        return detail
    except Exception:
        return None


def get_user_matches_with_details(
    ouid: str,
    matchtype: int = 50,
    limit: int = 15,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    match_ids = nexon_get(
        "/fconline/v1/user/match",
        {"ouid": ouid, "matchtype": matchtype, "offset": 0, "limit": min(limit, 30)},
        api_key=api_key,
    )
    if not isinstance(match_ids, list) or not match_ids:
        return []

    target_ids = match_ids[: min(limit, 25)]
    details: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(get_match_detail_cached, mid, api_key) for mid in target_ids]
        for f in futures:
            res = f.result()
            if res and isinstance(res, dict) and "matchInfo" in res:
                details.append(res)

    return details
