# FClab — FC 온라인 통합 데이터 분석 플랫폼 구현 계획서

FClab은 넥슨 FC 온라인 공식 Open API와 공식 데이터센터(웹 크롤링/스크래핑 파이프라인)를 결합하여 선수 탐색, 스쿼드 최적화, 카드 가성비 효율 계산, 플레이 스타일 프로파일링, 실시간 구단주 전적 분석을 하나로 연동하는 풀스택 데이터 분석 플랫폼입니다.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Phase 1 사전 인터뷰를 통해 확정된 4대 핵심 아키텍처 및 데이터 정책입니다.**

- **확정 결정 1 (데이터 보완 전략 — 공식 API + 크롤링 수집 결합)**: 넥슨 공식 Open API에서 제공하는 메타데이터(`spid`, `seasonid`, `spposition`, `matchtype`, `division`) 및 실시간 유저 전적/거래 데이터에 더해, 공식 API가 제공하지 않는 **선수 카드별 세부 능력치(속력, 골 결정력 등 30여 개 스탯), 급여(FP), 보유 특성(Traits), 실시간 이적시장 강화 단계별 시세**는 넥슨 FC 온라인 공식 데이터센터(`fconline.nexon.com/datacenter`) 크롤링 수집 파이프라인 및 로컬 SQLite 캐시 DB를 통해 확보합니다.
- **확정 결정 2 (초기 MVP 범위 — 5대 연구소 전체 연동 통합 MVP)**: 단일 기능에 그치지 않고, **홈 통합 대시보드 + 5대 연구소(Player Lab, Squad Lab, Card Efficiency Lab, Player Profile Lab, Match Lab) + 저장소/설정**이 모두 유기적으로 데이터를 주고받는 통합 MVP를 구축합니다.
- **확정 결정 3 (기술 스택 — Next.js 프런트엔드 + Python FastAPI 백엔드 분리 아키텍처)**: UI 및 프런트엔드 인터랙션은 **Next.js (TypeScript, Tailwind CSS)**가 담당하고, 넥슨 Open API 통신, 크롤러 수집기(`BeautifulSoup4`/`httpx`), SQLite 데이터베이스 관리, 가중치 기반 효율/유형/스쿼드/전적 분석 알고리즘은 **Python FastAPI + Pydantic** 백엔드 서버가 전담하며 Next.js API 프록시를 통해 연동합니다.
- **확정 결정 4 (전적 분석실 정책 — 실제 넥슨 Open API 키 기반 실시간 조회)**: 가짜 목업 전적을 배제하고 실제 `x-nxopen-api-key` 기반의 실시간 구단주 닉네임(`ouid`) 조회 및 매치 상세(`match-detail`) 분석만을 수행하며, API 키 미설정 또는 호출 제한 시 명확한 상태 안내와 설정 연동을 제공합니다.

---

## 1. Overview & Core Concept

- **What It Does**: 구단주가 선수를 검색하고(Player Lab), 포지션 핵심 스탯과 BP 시세 대비 효율을 계산하며(Card Efficiency Lab), 능력치 기반 플레이 스타일 적합도를 판별하고(Player Profile Lab), 축구장 전술판 위에서 급여(최대 270 FP 등)와 팀컬러·예산을 고려해 스쿼드를 시뮬레이션한 뒤(Squad Lab), 실제 공식경기 전적 데이터를 기반으로 전술 및 선수 교체를 처방받는(Match Lab) 순환형 분석 워크스페이스입니다.
- **Target Audience / Persona**: 감이나 단순 OVR(종합 능력치)에만 의존하지 않고, 포지션별 실질 코어 스탯 가성비와 자신의 실제 인게임 매치 통계(슈팅 성공률, 패스 성공률, 점유율, 실점 패턴)를 근거로 구단 가치를 최적화하려는 FC 온라인 구단주.
- **Key Value**: **"데이터 수집(API+크롤링) → 정량 평가(가중치 모델) → 스쿼드 편성 → 실전 검증(전적 분석) → 약점 보완 추천"**으로 이어지는 끊김 없는 의사결정 파이프라인을 제공합니다.

---

## 2. 요구사항 분류 및 넥슨 Open API 데이터 검증

### 2.1 넥슨 Open API 공식 문서 및 AI 에이전트 가이드 조사 결과

- **공식 개발자 센터**: `https://openapi.nexon.com/ko/`
- **AI 에이전트 가이드**: `https://openapi.nexon.com/ko/guide/ai-agent.md`
- **API 기본 호스트**: `https://open.api.nexon.com`
- **인증 방식**: 동적 데이터 API 호출 시 HTTP Header에 `x-nxopen-api-key: {API_KEY}` 필수 포함 (`/static/fconline/meta/*` 정적 메타데이터와 CDN 이미지 리소스는 인증 헤더 불필요)
- **데이터 갱신 및 의무 사항**:
  - 매시 정각(1시간 주기)에 최대 2시간 전 게임 데이터가 반영됨.
  - 모든 엔드포인트는 `GET` 메서드만 지원하며, 호출 제한(Rate Limit) 준수 및 에러(`OPENAPI00001`~`OPENAPI00007`) 핸들링 필수.
  - 메타데이터 및 캐시된 데이터는 최소 30일 주기로 최신화 동기화 필수.

| 구분 | 엔드포인트 / 리소스 경로 | 주요 반환 필드 및 설명 | 인증 필요 |
| :--- | :--- | :--- | :--- |
| **메타데이터** | `GET /static/fconline/meta/spid.json` | 선수 고유 식별자(`id`: 9자리 정수 `seasonId * 1,000,000 + pid`) 및 선수명(`name`) | 불필요 |
| **메타데이터** | `GET /static/fconline/meta/seasonid.json` | 시즌/클래스 ID(`seasonId`), 클래스명(`className`), 시즌 배지 이미지(`seasonImg`) | 불필요 |
| **메타데이터** | `GET /static/fconline/meta/spposition.json` | 포지션 코드(`spposition`: 0 GK ~ 28 SUB) 및 포지션 명칭(`desc`) | 불필요 |
| **메타데이터** | `GET /static/fconline/meta/matchtype.json` | 경기 종류 코드(`matchtype`: 50 공식경기, 40 친선경기 등) 및 설명(`desc`) | 불필요 |
| **메타데이터** | `GET /static/fconline/meta/division.json` | 공식경기 등급 식별자(`divisionId`) 및 티어 명칭(`divisionName`: 슈퍼챔피언스 등) | 불필요 |
| **이미지 CDN** | `GET https://fo4.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p{spid}.png` | 선수 액션샷 이미지 (미존재 시 일반 프로필 `/players/p{pid}.png` 폴백) | 불필요 |
| **계정 조회** | `GET /fconline/v1/id?nickname={name}` | 구단주 닉네임 기반 고유 계정 식별자(`ouid`) 반환 | `x-nxopen-api-key` |
| **구단주 정보** | `GET /fconline/v1/user/basic?ouid={ouid}` | 구단주 닉네임, 레벨(`level`) 조회 | `x-nxopen-api-key` |
| **최고 등급** | `GET /fconline/v1/user/maxdivision?ouid={ouid}` | 매치 종류별 역대 최고 달성 등급(`division`) 및 달성 일자(`achievementDate`) | `x-nxopen-api-key` |
| **매치 목록** | `GET /fconline/v1/user/match?ouid={ouid}&matchtype={type}&offset={o}&limit={l}` | 해당 구단주의 경기 고유 식별자(`matchId`) 배열 반환 | `x-nxopen-api-key` |
| **매치 상세** | `GET /fconline/v1/match-detail?matchid={id}` | 경기 일시, 양 팀 구단주 정보, 점유율·파울·오프사이드, 슈팅 상세(`shoot`, `shootDetail`), 패스(`pass`), 수비(`defence`), 출전 선수 18명 각각의 `spId`, `spPosition`, `spGrade`(강화단계), 선수별 경기 평점(`spRating`) 및 개인 기록 | `x-nxopen-api-key` |
| **거래 내역** | `GET /fconline/v1/user/trade?tradetype={buy\|sell}` | 구단주의 이적시장 구매/판매 완료 내역(`spid`, `grade`, `value` BP, 거래 시각) | `x-nxopen-api-key` |

### 2.2 기능별 데이터 출처 및 구현 방식 3단 분류

| 연구소 / 모듈 | 공식 API 데이터만으로 구현 가능한 기능 | 크롤링 수집 및 사용자 입력이 필요한 기능 | 자체 분석 알고리즘(Python 엔진)이 필요한 기능 |
| :--- | :--- | :--- | :--- |
| **1. Player Lab**<br>(선수 연구소) | • 선수명 검색 (`spid.json`)<br>• 시즌/클래스 필터링 (`seasonid.json`)<br>• 선수 액션샷/일반 이미지 표시<br>• 유저 거래 내역 상의 거래가 조회 | • **웹 크롤링 수집**: 선수 카드별 OVR, 급여(FP), 주발/약발, 개인기, 신체조건, 34개 세부 능력치(속력, 가속력, 골 결정력 등), 고유 특성(Traits), 강화 단계별(1~10강) 실시간 이적시장 기준가(BP)<br>• **사용자 입력**: 팀컬러 단계(+1~+9) 및 적응도 설정 | • 포지션별 6대 핵심 능력치 요약 산출<br>• 강화 단계(+1~+10) 및 팀컬러 적용 시 실시간 스탯 상승분 시뮬레이션<br>• 동일 시즌/타 시즌 카드 간 스탯 델타(차이) 비교 |
| **2. Squad Lab**<br>(스쿼드 빌더) | • 포지션 메타데이터 매핑 (`spposition.json`)<br>• 최근 실제 경기에서 사용한 선발/후보 18인 스쿼드 자동 불러오기 (`match-detail` 연동) | • **웹 크롤링 데이터 연동**: 배치된 선수별 급여(FP), 세부 능력치, 강화 단계별 BP 시세, 소속 클럽/국적(팀컬러 판별용)<br>• **사용자 입력**: 포메이션 선택(4-2-3-1, 4-1-2-1-2 등), 보유 예산(BP), 스쿼드 저장/불러오기 | • 공격/중원/수비/골키퍼 영역별 밸런스 점수 산출<br>• 급여 한도(예: 270 FP) 및 총 구단 가치(BP) 계산<br>• 포지션별 약점 진단 및 선수 간 역할 중복 감지<br>• 잔여 예산 내 포지션별 최적 대체 선수 추천 |
| **3. Card Efficiency Lab**<br>(카드 효율 분석) | • 동일 선수의 시즌별 `spid` 클러스터링 (`pid = spid % 1,000,000` 규칙 활용) | • **웹 크롤링 데이터 연동**: 동일 선수 모든 시즌 카드의 세부 능력치 및 강화 단계별 이적시장 시세(BP)<br>• **사용자 입력**: 포지션별 능력치 가중치 커스터마이징, 목표 예산 범위 | • **포지션별 가중합 코어 점수(Position Core Score)** 산출<br>• **가격 대비 효율 지수(BP Efficiency Score)** 정규화 및 로그 스케일 보정 계산<br>• 강화 단계별 가성비 변곡점 탐색 및 예산 내 추천 순위 도출 |
| **4. Player Profile Lab**<br>(선수 유형 분석) | • 선수 기본 메타 정보 및 시즌 구분 | • **웹 크롤링 데이터 연동**: 선수의 34개 세부 능력치, 신체 조건(신장, 체중, 체형), 참여도(공/수), 고유 특성 | • **아키타입(Archetype) 적합도 엔진**: 침투형/타겟터/연계형/플레이메이커/박스투박스/볼운반형/파이터형/커버형 등 16개 세부 유형별 가중치 행렬 연산 및 적합도 백분율(%)·근거 도출 |
| **5. Match Lab**<br>(전적 분석실) | • 구단주 `ouid` 및 최고 티어 조회<br>• 최근 N경기(10/20/30경기) 승·무·패, 득실점, 점유율, 슈팅(박스 안/밖, 중거리, 헤딩), 패스(짧은/긴/스루패스 성공률), 태클/블록 통계 수집 | • **사용자 입력**: 분석 대상 닉네임, 조회 경기 수, 공식경기/친선경기 필터, (선택) 자신의 주력 전술 메모 | • 연승/연패 패턴 및 시간대별 득실점 추이 분석<br>• 출전 선수별 평균 평점(`spRating`), 득점 기여도, 포지션별 실전 퍼포먼스 집계<br>• **[관찰된 사실 → 가능한 원인 → 추천 행동]** 3단계 구조화 처방 및 Squad Lab/Card Efficiency Lab 연동 추천 |

---

## 3. User Experience & Visual Design

### 3.1 Visual Identity & Theme (SaaS & Sports Analytics Discipline)

- **Aesthetic Direction**: 현대적인 프로 축구 데이터 분석 플랫폼(Opta, Wyscout, FotMob 프로페셔널 콘솔 감성)을 지향하는 고밀도 다크 슬레이트 워크스페이스입니다. 불필요한 장식용 네온 효과, 가짜 시스템 로그 티커, 캡슐형 배지 남발을 배제하고 정교한 타이포그래피와 직관적인 데이터 시각화에 집중합니다.
- **Color Palette (60-30-10 Rule)**:
  - **60% Dominant Neutral Canvas**: Deep Slate (`#0B0F17` 배경) 및 서브 캔버스 (`#111827`)
  - **30% Structural Surfaces**: 카드 및 테이블 컨테이너 (`#161F30`), 미세 헤어라인 보더 (`1px solid #1E293B`), 보조 텍스트 (`#94A3B8`)
  - **10% Accent & Semantic Budget**:
    - Primary Action / Pitch Emerald: `#10B981` (핵심 CTA, 포지션 적합도 상위, 승리/긍정 지표)
    - Tactical Blue: `#3B82F6` (데이터 비교 기준선, 중원/패스 지표)
    - Warning Amber: `#F59E0B` (급여 초과 경고, 가성비 주의 구간, 무승부)
    - Alert Crimson: `#EF4444` (수비 취약 포지션, 연패 경고, API 에러)
- **Typography & Tabular Discipline (2+1 Font Rule)**:
  - **Display / Headers**: `Outfit` (선명하고 스포티한 지오메트릭 산세리프, 선수명·OVR·연구소 헤더)
  - **Body / UI**: `Plus Jakarta Sans` 및 한글 가독성 최적 폴백 (12px~15px 고밀도 데이터 테이블 및 분석 리포트 본문)
  - **Data & Telemetry**: `JetBrains Mono` (`font-variant-numeric: tabular-nums` 필수 적용 — OVR, 세부 능력치, BP 시세, 급여, 승률, 평점 등 모든 숫자의 수직 정렬 보장)
- **Layout & Navigation Architecture**:
  - **Top Bar Contract**: 좌측 단일 브랜드 워드마크(`FClab`) — 중앙 5대 연구소 빠른 전환 링크(`Player Lab`, `Squad Lab`, `Efficiency Lab`, `Profile Lab`, `Match Lab`) — 우측 단일 핵심 액션(`API & 크롤러 설정`).
  - **Workspace Canvas**: 좌측 고정 사이드바(`250px`, 연구소 네비게이션 및 즐겨찾기 스쿼드/선수 빠른 접근) + 우측 메인 뷰포트(`1440px` 기준 풀 와이드 고밀도 그리드, 단일 Elevation 원칙 준수).

### 3.2 핵심 사용자 흐름 (End-to-End Integrated Flow)

1. **데이터 동기화 및 검색 (Home & Player Lab)**:
   - 홈 대시보드 또는 Player Lab에서 선수명(예: 손흥민, 호날두, 굴리트, 벨링엄 등)을 검색하면 Python 백엔드가 넥슨 `spid.json` 메타데이터와 크롤러 캐시 DB를 결합해 시즌별 카드 목록을 반환합니다.
   - 카드 선택 시 만약 로컬 DB에 세부 스탯이나 최신 BP 시세가 없으면 백엔드 크롤러가 실시간으로 FC 온라인 데이터센터에서 스탯과 강화별 시세를 수집·정규화하여 조회 시각(Timestamp)과 함께 화면에 표시합니다.
2. **가성비 및 플레이 스타일 심층 검증 (Card Efficiency Lab & Player Profile Lab)**:
   - 선수 상세 페이지에서 **"시즌/강화 가성비 비교"**를 클릭하면 즉시 `Card Efficiency Lab`으로 해당 선수의 모든 시즌 카드가 로드되어, 포지션 핵심 스탯 점수 대비 BP 시세 효율 순위와 레이더/산점도 차트를 보여줍니다.
   - **"플레이 스타일 분석"** 탭 또는 `Player Profile Lab`에서는 해당 선수의 능력치 분포를 분석해 `침투형 공격수 (94% 적합)`, `연계형 포워드 (81% 적합)` 등 다중 아키타입 적합도와 산출 근거를 제시합니다.
3. **스쿼드 시뮬레이션 및 약점 보완 (Squad Lab)**:
   - 축구장 전술판 위에 11명의 선수를 배치하면 실시간으로 **총 급여(예: 258 / 270 FP)**, **총 구단 가치(BP)**, **팀컬러 효과**, **공격/중원/수비 밸런스**가 계산됩니다.
   - 특정 포지션의 핵심 능력치가 부족하거나 예산 대비 효율이 떨어지는 카드를 자동 감지하여, 보유 예산 내에서 즉시 교체 가능한 고효율 카드를 추천하고 교체 전후 팀 전력 변화를 비교합니다.
4. **실전 경기 기록 분석 및 스쿼드 피드백 (Match Lab)**:
   - 구단주 닉네임을 입력하면 넥슨 Open API에서 최근 공식경기 상세 데이터를 수집해 승률 추이, 득실점 패턴, 슈팅 구역/성공률, 패스 성공률, 출전 선수별 평점(`spRating`)을 분석합니다.
   - **"실전 사용 스쿼드를 Squad Lab으로 가져오기"** 버튼을 통해 실제 경기에서 뛴 11명의 선수(`spId`, `spGrade`)를 한 번의 클릭으로 스쿼드 빌더에 로드하고, 경기 기록상 평점이 낮거나 실점 원인이 된 포지션의 보강 선수를 추천받습니다.

---

## 4. Technical Architecture & Data Strategy

### 4.1 System Architecture & Component Diagram

Next.js 프런트엔드와 Python FastAPI 백엔드를 분리하되, 단일 실행 환경(포트 3000 웹 인터페이스 및 내부 백엔드 프로세스 연동)에서 매끄럽게 동작하도록 리버스 프록시 및 프로세스 매니저 구조로 설계합니다.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        FClab Frontend (Next.js 15 / React 19)                      │
│                                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │   Top Header &   │  │  Home Dashboard  │  │   Saved Squads & API Settings    │  │
│  │  Sidebar Nav     │  │  (통합 요약/검색) │  │   (로컬/DB 동기화 & API 키 관리)   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────────┬────────────────┘  │
│           │                     │                              │                   │
│  ┌────────▼─────────────────────▼──────────────────────────────▼────────────────┐  │
│  │                       5 Core Connected Laboratories                          │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐  │  │
│  │  │  Player Lab  │◄►  Squad Lab   │◄►Efficiency Lab│◄►Profile   │◄►Match   │  │  │
│  │  │ (선수 연구소) │ │(스쿼드 빌더) │ │(카드 효율분석)│ │Lab(유형) │ │Lab(전적)│  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ └────────┘  │  │
│  └──────────────────────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────────────────────┼──────────────────────────────────────────┘
                                          │ Next.js API Route Proxy (/api/py/*)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                     FClab Backend Engine (Python FastAPI + Pydantic)               │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        API Router Layer (/api/v1/*)                          │  │
│  │   /meta/*   │   /players/*   │   /efficiency/*   │   /squads/*   │  /match/* │  │
│  └──────┬──────────────┬──────────────────┬─────────────────┬──────────────┬────┘  │
│         │              │                  │                 │              │       │
│  ┌──────▼──────────────▼───────┐   ┌──────▼─────────────────▼──────────────▼────┐  │
│  │   Data Acquisition Layer    │   │          Analytics Engine Layer            │  │
│  │ • NexonOpenAPIClient        │   │ • PositionWeightEvaluator (가성비/효율)     │  │
│  │   (x-nxopen-api-key, Rate   │   │ • ArchetypeProfiler (16종 플레이 스타일)    │  │
│  │    Limit & Error Handler)   │   │ • SquadOptimizer (급여/팀컬러/약점 진단)     │  │
│  │ • FCDatacenterCrawler       │   │ • MatchDiagnosticsEngine (전적/처방 생성)   │  │
│  │   (스탯/급여/시세 실시간 수집)│   └──────────────────────┬─────────────────────┘  │
│  └──────┬──────────────┬───────┘                          │                        │
│         │              │                                  │                        │
│         │              ▼                                  ▼                        │
│         │     ┌───────────────────────────────────────────────────────────┐        │
│         │     │           SQLite Persistence & Cache DB (fclab.db)        │        │
│         │     │ • meta_spid, meta_season, meta_position, meta_division    │        │
│         │     │ • player_card_stats (크롤링 능력치, 급여, 신체정보, 특성)   │        │
│         │     │ • market_prices (강화 단계별 BP 시세 및 조회 시각)          │        │
│         │     │ • saved_squads (사용자 스쿼드 구성, 포메이션, 예산)         │        │
│         │     └───────────────────────────────────────────────────────────┘        │
└─────────┼──────────────────────────────────────────────────────────────────────────┘
          │ HTTPS (GET)
          ▼
┌───────────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     Nexon Open API (open.api.nexon.com)       │  │  FC Online Official Datacenter  │
│ • /static/fconline/meta/* (메타데이터 JSON)    │  │  (fconline.nexon.com/datacenter)│
│ • /fconline/v1/id, /user/*, /match-detail     │  │ • 선수 상세 스탯 및 강화별 시세   │
└───────────────────────────────────────────────┘  └─────────────────────────────────┘
```

### 4.2 핵심 분석 알고리즘 설계 (Python Analytics Layer)

1. **포지션별 핵심 능력치 점수 (Position Core Score)**:
   - 각 포지션($P$)별로 중요도가 높은 핵심 스탯 집합과 가중치($w_i$, $\sum w_i = 1.0$)를 정의합니다 (사용자가 UI에서 가중치 커스터마이징 가능).
   - $\text{CoreScore}(c, P) = \sum_{i \in S_P} w_{P, i} \times \text{Stat}_{c, i}(\text{grade}, \text{teamColor})$
2. **가격 대비 효율 지수 (BP Efficiency Index)**:
   - 단순 나눗셈($\text{Score} \div \text{Price}$)은 시세가 10억 BP인 카드와 1조 BP인 카드 비교 시 왜곡이 발생하므로, **동일 가격대 구간 내 백분위 점수**와 **로그 스케일 가격 보정 효율 지수**를 함께 제공합니다.
   - $\text{EfficiencyIndex} = \frac{(\text{CoreScore} - \text{BaselineScore})^2}{\log_{10}(\max(\text{Price}_{\text{BP}}, 10^7))}$
3. **선수 유형 적합도 프로파일러 (Player Archetype Profiler)**:
   - 공격수 6종(침투형, 타겟터, 드리블러, 연계형, 포처, 만능형), 미드필더 6종(플레이메이커, 박스투박스, 홀딩 CDM, 볼운반형, 패스마스터, 공격가담형), 수비수 5종(파이터형 CB, 커버형 CB, 빌드업 CB, 오버래핑 윙백, 수비형 풀백)의 가중치 매트릭스를 통해 각 유형별 적합도(0~100%)와 핵심 근거 스탯 Top 3를 산출합니다.
4. **전적 분석 3단 진단 모델 (Match Diagnostics)**:
   - API의 `match-detail` 데이터를 집계하여 **[관찰된 사실 (Observed Fact)] → [가능한 전술/스쿼드 원인 (Potential Cause)] → [추천 개선 행동 (Actionable Recommendation)]** 구조로 리포트를 생성합니다. (인과관계 단정 금지 및 API 미제공 인게임 조작 영역 명시 원칙 준수)

---

## 5. 기능별 구현 난이도, 기술적 위험 및 대응 전략

| 모듈 / 기능 | 난이도 | API 및 크롤링 의존성 | 주요 기술적 위험 (Technical Risks) | 완화 및 해결 전략 (Mitigation) |
| :--- | :---: | :--- | :--- | :--- |
| **Nexon Open API 연동 및 메타데이터 동기화** | 중 | 높음 (`spid.json` 약 5만+ 건) | `spid.json` 파일 크기가 크고 매번 호출 시 지연 발생; API 키 미입력 또는 Rate Limit(429) 오류 | 백엔드 기동 시 SQLite에 메타데이터 인덱싱 및 FTS(전문 검색)/캐싱 적용; 30일 주기 갱신 타임스탬프 관리 |
| **크롤링 파이프라인 (세부 스탯 & 시세)** | 상 | 높음 (`fconline.nexon.com` DOM 구조) | 외부 웹페이지 응답 지연, 네트워크 차단, 또는 미출시/특수 카드의 DOM 구조 차이 | 크롤링 결과를 SQLite `player_card_stats` 및 `market_prices`에 조회 시각과 함께 영구 캐싱 + 크롤링 실패 시 명확한 상태 안내 및 수동 스탯/시세 보정 인터페이스 제공 |
| **Player Lab (선수 검색/상세/비교)** | 중 | 중간 (메타데이터 + 크롤링 DB) | 강화 단계(+1~+10) 및 팀컬러(+1~+9) 조합에 따른 능력치 계산 복잡도 | FC 온라인 공식 강화 단계별 능력치 상승 테이블을 Python 백엔드 및 프런트엔드 유틸리티로 정확히 모델링 |
| **Card Efficiency Lab (가성비 분석)** | 중 | 중간 (동일 `pid` 카드 다중 비교) | 초고가 카드와 저가 카드의 단순 가성비 비교 시 저가 카드만 상위에 노출되는 왜곡 | 사용자 예산 범위 필터(최소~최대 BP) 우선 적용 + 로그 스케일 가성비 지수 및 가중치 슬라이더 제공 |
| **Squad Lab (전술판 & 추천)** | 상 | 중간 (11인 동시 연산) | 포지션 배치 변경 시 11명의 스탯·급여·시세·팀컬러·약점 분석이 지연 없이 즉시 갱신되어야 함 | 클라이언트 상태와 백엔드 스쿼드 평가 API를 결합하여 포메이션 변경/선수 교체 시 100ms 이내 실시간 리밸런싱 |
| **Player Profile Lab (유형 분석)** | 중 | 낮음 (수집된 34개 세부 스탯 기반) | 단일 유형 판정 시 복합적인 선수의 특성을 놓칠 위험 | 상위 3개 적합 유형의 적합도 점수(%)와 레이더 차트, 능력치 기반 추정치임을 명시하는 투명성 배너 적용 |
| **Match Lab (실시간 전적 분석)** | 상 | 매우 높음 (`x-nxopen-api-key` 필수) | 최근 20경기 상세 조회 시 `match-detail`을 20회 호출해야 하므로 API 호출 제한 및 응답 지연 발생 | Python `asyncio.gather` + 세마포어(동시 요청 제어) + SQLite 매치 상세 캐싱(동일 `matchId` 재조회 방지)으로 속도 10배 향상 |

---

## 6. 단계별 개발 로드맵 및 첫 번째 실행 작업 목록

사용자와의 사전 합의에 따라, 이번 빌드에서는 **전체 7단계 로드맵의 핵심 기능을 모두 연결한 통합 MVP**를 체계적인 순서로 구현하고 검증합니다.

1. **Step 1 — Python FastAPI 백엔드 & SQLite 데이터베이스 구축**:
   - SQLite 스키마(`meta_spid`, `meta_season`, `meta_position`, `player_card_stats`, `market_prices`, `saved_squads`, `match_cache`) 생성.
   - 넥슨 Open API 클라이언트(`NexonAPIClient`) 및 FC 온라인 공식 데이터센터 실시간 크롤러(`FCDatacenterCrawler`) 구현 (한국 주요 인기 선수 및 메타 시즌 카드 초기 시드 캐시 + 온디맨드 실시간 크롤링 지원).
2. **Step 2 — 5대 연구소 핵심 분석 엔진(Python) 구현**:
   - 포지션별 코어 스탯 가중합 및 가격 대비 효율 계산기(`CardEfficiencyEngine`).
   - 16종 플레이 스타일 아키타입 적합도 분석기(`PlayerProfileEngine`).
   - 스쿼드 급여/예산/밸런스 진단 및 대체 선수 추천기(`SquadAnalysisEngine`).
   - 실시간 `ouid` 전적 수집 및 3단(사실-원인-행동) 처방 생성기(`MatchAnalysisEngine`).
3. **Step 3 — Next.js API 브릿지 및 통합 프런트엔드 워크스페이스 구현**:
   - Next.js `/api/fclab/[...path]` 프록시 라우트 및 백엔드 데몬 자동 연동.
   - **Home Dashboard**, **Player Lab**, **Squad Lab**, **Card Efficiency Lab**, **Player Profile Lab**, **Match Lab**, **Saved & Settings** 화면 구현 및 연구소 간 원클릭 데이터 연동(선수 상세 → 효율 비교 / 스쿼드 투입 / 전적 스쿼드 불러오기).
4. **Step 4 — 빌드 검증 및 단계별 매뉴얼 제공**:
   - 백엔드·프런트엔드 통합 컴파일 및 동작 검증 후, 기획서 제2.2절 원칙에 맞춘 아키텍처 설명·실행/테스트 가이드·완료 조건 리포트 제공.
