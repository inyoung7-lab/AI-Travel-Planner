# 여행, 한걸음

**AI 기반 국내 여행지 추천 및 여행 일정 계획 서비스**

개발 기간 **약 2주** · 팀 **5명**

**[공개 서비스 바로가기](https://ai-travel-planner-pi-indol.vercel.app)**

### 프로젝트 자료

| 구분 | 문서 |
| --- | --- |
| 기획·발표 | [프로젝트 기획서](deliverables/final-project-20261025/01_프로젝트_기획서.pdf) · [발표 자료 PPT](deliverables/final-project-20261025/04_프로젝트_기획발표.pptx) |
| 기능·설계 | [기능요구명세서·아키텍처](deliverables/final-project-20261025/02_기능요구명세서_아키텍처.pdf) · [데이터베이스 설계서](deliverables/final-project-20261025/05_데이터베이스_설계서.pdf) · [전체 ERD·데이터 사전](database/ERD.md) |
| 테스트·피드백 | [테스트 보고서](deliverables/final-project-20261025/03_테스트_보고서.pdf) · [개발 피드백](docs/ai-persona-evaluation.md) · [실사용자 테스트 설문](https://docs.google.com/forms/d/e/1FAIpQLSdBIxyHjKKSEAg4tCzuaX4YtL1xFYKwa6yl2z0swgPtI3XMsg/viewform?usp=publish-editor) |
| 기능 화면 | [화면별 기능 가이드 · 전체 캡처와 사용 방법](docs/feature-screens.md) |

여행지를 찾는 순간부터 날짜별 계획, 저장, 여행 후 리뷰까지 연결하는 서비스입니다. 실제 관광정보를 바탕으로 AI 일정 초안을 만들거나, 원하는 장소를 직접 골라 나만의 일정을 작성할 수 있습니다. 지역 체험을 탐색하는 여행자와 체험을 기획·운영하는 호스트를 위한 기능도 제공합니다.

> 현재 실행 구조입니다. 전체 서비스의 인증과 데이터 저장은 **Supabase Auth·PostgreSQL**을 사용합니다. 로컬이음과 여행 일정·커뮤니티는 같은 Supabase 프로젝트에서 각 테이블·권한 경계를 유지합니다.

## 1. 문제 정의와 목표

관광지·음식점·숙소를 따로 찾고, 기간과 이동 수단에 맞춰 방문 순서를 정하는 데에는 많은 선택이 필요합니다. 도 단위로 추천한 장소가 서로 먼 도시에 흩어지거나, 추천받은 계획을 수정·저장하기 어려운 문제도 있습니다.

이 서비스는 **실제 장소를 탐색하고, 가까운 권역의 일정 초안을 만든 뒤 사용자가 직접 조정하는 흐름**을 제공합니다.

| 사용자 문제 | 해결 방식 |
| --- | --- |
| 어디로 갈지 정하기 어려움 | 지역·키워드 검색, 사진과 상세 정보, 최근 검색 기반 추천 |
| 일정 초안을 만들기 어려움 | 기간·지역·예산·인원·이동 수단·스타일을 반영한 AI 생성 |
| 서로 먼 도시를 오가는 코스 | 세부 지역과 좌표를 이용한 가까운 권역의 후보 선별 |
| AI 결과를 원하는 대로 바꾸고 싶음 | 장소 추가·삭제, 방문 시간·순서 편집, 직접 일정 작성 |
| 관심 장소와 여행 기록이 흩어짐 | 계정별 찜·일정 저장, 지난 일정 전체 보기와 장소별 리뷰 |
| 지역 체험 기획을 구체화하기 어려움 | 기존 체험·지역 지식·가치 평가·비용 계산을 활용한 호스트 Agent |

준비 시간 단축과 만족도 향상은 서비스 목표입니다. 실제 사용자 조사로 측정하지 않은 성과 수치를 기재하지 않습니다.

## 2. 팀 구성

| 팀원 | 담당 영역 |
| --- | --- |
| 강하연 | 로컬 체험 |
| 최인영 | 사진 및 추천 |
| 황재훈 | AI 여행 일정 |
| 김수민 | 커뮤니티 |
| 이충훈 | 로그인 및 데이터베이스 설계 |

각 영역을 공통 인증, 장소 식별자, 일정 저장 구조와 연결했습니다. 약 2주 동안 기능 개발과 데이터·인증 통합, 관광정보 수집, AI 일정 개선 및 회귀 검증을 진행했습니다. 개인별 작업 시간·커밋 비율과 날짜별 수행 내역은 별도 산정하지 않았습니다.

## 3. 주요 기능

### 여행지 탐색과 추천

- 한국관광공사에서 수집해 Supabase에 저장한 관광정보를 검색합니다.
- 여행지 목록은 지역·이름·주소 필터와 서버 페이지 조회를 사용하며 한 페이지에 24곳을 표시합니다.
- DB 장소 ID와 TourAPI 콘텐츠 ID를 구분하고, 사진·출처·상세 정보·주변 장소를 연결합니다.
- 최근 30일의 브라우저별 검색 조건을 이용해 후보에 점수를 부여하고 추천 이유를 표시합니다. 로그인 계정의 장기 대화 메모리와는 다릅니다.
- 메인 인기 여행지와 추이 그래프는 **전체 로그인 회원의 사이트 활동**을 집계합니다. 개인 검색 이력이나 관광공사의 인기도 통계가 아닙니다.
- 장소별 상세 그래프에서 최근 7일과 이전 7일의 검색 결과 포함 횟수·상세 조회 횟수를 비교합니다. 기록 없는 날은 0이며, 동일 회원·장소의 상세 조회는 30분 단위로 중복을 줄입니다.

### AI 여행 일정

- 국내 17개 시도 또는 전국, 세부 지역, 기간, 인원, 예산, 이동 수단, 여행 스타일을 입력합니다.
- 새 일정은 한국 시간 기준 오늘 이후 출발, 1~5일로 제한합니다. 인원은 1~10명, 스타일은 최대 4개입니다.
- 저장된 관광지·문화시설·음식점·숙박 후보를 같은 시·군·구와 가까운 권역으로 좁혀 모델에 전달합니다.
- 이동 수단에 따라 직선 반경 15km(자차), 8km(대중교통), 4km(도보·택시)를 적용합니다.
- 지원하는 예보 날짜에는 날씨를 참고하고, 개최 기간이 여행 날짜와 겹치는 행사만 후보로 사용합니다. 예보가 없거나 조회에 실패한 상태도 표시합니다.
- 생성 결과는 날짜별 타임라인·사진·추천 이유·위치 지도와 함께 표시하며 장소 추가·삭제, 방문 시간·순서를 편집할 수 있습니다.
- 실제 도로 이동시간, 영업 여부, 가격·예약 가능 여부는 검증한 결과가 아닙니다. 계절 키워드는 실제 개화·단풍 절정이나 제철 판매 여부의 확인을 의미하지 않습니다.

### 직접 만드는 일정과 나의 여행

- AI 없이 빈 일정을 만들고 여행지 찾기에서 원하는 일차에 장소를 담습니다.
- 날짜별 장소·시간·순서를 편집하고 Supabase에 저장합니다. 같은 일차의 장소 중복을 막고 저장 버전 충돌을 안내합니다.
- AI 일정과 직접 일정은 공통 저장 구조로 관리합니다. 로그인한 계정으로 저장한 일정을 다시 불러올 수 있습니다.
- 예전 브라우저 저장 일정은 성공적으로 계정에 이전한 뒤 로컬 백업을 제거합니다.
- 찜은 회원별 DB에 저장하며 여행지 목록·상세·나의 여행에서 연결됩니다.
- 종료일이 지난 일정을 여행 단위로 묶어 전체 날짜의 코스를 다시 보고, 각 장소에 리뷰를 작성합니다. 실제 방문 인증을 의미하지는 않습니다.
- 화면이 계속 늘어나지 않도록 일정 목록은 3개, 찜 목록은 6개 단위로 페이지를 나눕니다.

### 커뮤니티

- 여행 후기·질문·이야기, 댓글, 좋아요, 본인 글 삭제를 제공합니다.
- 리뷰에 장소와 별점을 연결하고 장소별 후기·사진을 확인합니다.
- Supabase 인증과 RLS로 작성자와 데이터 소유권을 확인합니다.

### 로컬 체험과 호스트 운영

로컬이음은 여행자가 지역 체험을 찾고, 호스트가 체험과 운영 회차를 관리하는 영역입니다. 공통 React 앱의 `/local-eum`에서 실행되며 Supabase에 저장된 정보를 사용합니다. 사용 방법은 [로컬이음 안내](docs/local-eum/README.md)를 참고합니다.

- **여행자:** 지역·관심 분야별 체험을 찾고 소개, 상세 일정, 운영 날짜, 참가비, 정원, 집결 장소와 지도를 확인합니다. 로그인 또는 비회원으로 참가 신청할 수 있습니다.
- **호스트:** 한 프로필로 여러 체험과 회차를 운영합니다. 소개·일정·날짜·참가비·정원·장소를 수정하고 여행자 화면을 미리 보며, 본인 체험의 신청자를 확인합니다.
- **계정과 권한:** 팀 공통 Supabase Auth 계정을 사용합니다. 일반 회원의 호스트 프로필 신청은 비공개 승인 대기로 시작하고, 승인된 HOST가 본인 데이터를 관리합니다. ADMIN 권한과 승인 상태는 사용자가 직접 부여하지 못합니다.
- **제공 범위:** 한국어·영어·일본어 화면과 실제 진행 가능 언어를 구분합니다. 참가 신청과 결제 안내는 시연 범위이며 실제 결제·예약 확정은 제공하지 않습니다.

| 로컬 체험 목록 | 호스트 운영센터 · 공개 데모 |
| --- | --- |
| ![로컬 체험 목록](docs/screenshots/local-eum-catalog-20261107.png) | ![호스트 운영센터 공개 데모](docs/screenshots/local-eum-host-demo-20261107.png) |

2026-11-07 개발 환경에서 촬영했습니다. 호스트 화면은 가상 데이터를 사용하는 읽기 전용 데모입니다.

## 4. AI 활용 방식과 기술적 의사결정

### 여행 일정: 검색 증강 생성 워크플로우

```mermaid
flowchart LR
    I[여행 조건] --> V[날짜와 입력 검증]
    V --> D[Supabase 후보 검색]
    D --> F[세부 지역과 이동 반경 선별]
    F --> C[날씨와 날짜별 행사 보강]
    C --> L[LLM 일정 생성]
    L --> H[후보 ID와 일수·날짜·권역 검증]
    H --> U[표시·사용자 편집·계정 저장]
```

[`server/itinerary.js`](server/itinerary.js)와 [`server/itineraryContext.js`](server/itineraryContext.js)가 처리합니다. Codyssey의 OpenAI 호환 Chat Completions API를 사용하며 기본 모델은 `gpt-5-mini`입니다. 모델은 제공된 후보 ID만 선택하도록 요청하고, 서버는 실제 장소 정보와 다시 결합합니다.

실제 DB에서 검색한 정보를 생성의 근거로 전달하는 RAG 구조입니다. SQL 검색과 규칙 기반 선별을 사용하며 임베딩·벡터 DB는 사용하지 않습니다. 후보의 외부 설명은 지시문으로 취급하지 않도록 프롬프트를 구성합니다.

### 호스트 AI Agent: 체험 기획·진단

호스트는 기존 체험이나 새 아이디어를 분석하고, 개선 대안과 운영 초안을 받습니다. [`local-eum-agent`](supabase/functions/local-eum-agent)는 로그인 JWT, HOST 승인과 체험 소유권을 확인한 뒤 실행됩니다. 기본 모델은 Codyssey의 `gpt-5.4-mini`입니다.

| 도구 | 역할 |
| --- | --- |
| 유사 체험 검색 | 공개된 기존 체험 조회 |
| 지역 지식 검색(RAG) | 출처가 있는 자료를 찾아 분석 근거로 제공 |
| 체험 가치 평가 | 모델이 제안한 평가 근거를 바탕으로 서버에서 점수 계산 |
| 운영비 계산 | 회차 참가비·인원과 가정 비용으로 매출·비용 계산 |

모델이 이전 결과를 보고 다음 도구·입력 또는 종료를 JSON으로 선택하며, 서버가 허용 도구와 입력을 검증해 실행합니다. 검색은 생략·재검색할 수 있고, 가치 평가·비용 계산은 보고서 작성 전에 완료합니다. 인용은 실제 검색된 출처로 제한하며, 결과는 HOST가 검토하고 저장해야 DB에 반영됩니다.

도구 선택 방식과 실행 제한은 [Agent 도구 실행 구조](docs/local-eum/agent-tool-selection-20261107.md)를 참고합니다.

### 설계 결정과 검증 계약

| 설계 결정 | 적용 이유 | 검증 경계 |
| --- | --- | --- |
| SQL 조건 검색과 규칙 기반 RAG | 지역·유형·공개 여부 등 정확한 조건과 좌표를 이용할 수 있음 | 의미 유사도나 임베딩 검색의 품질을 측정한 구조는 아님 |
| 모델에 허용 후보 ID 전달 | 생성 문장을 장소 기준 데이터와 분리 | 서버가 실제 후보와 재결합하고 유효 일차·권역을 검사 |
| 수집 작업과 화면 조회 분리 | 페이지 이동 때 외부 전체 목록을 다시 수집하지 않음 | 누락 상세·주변·행사·날씨의 외부 호출은 별도 |
| AI·직접 일정의 JSONB 공통 모델 | 날짜별 코스를 같은 나의 여행 흐름에서 관리 | 수동 편집은 버전 검사, AI 저장·열기는 소유권 RPC로 구분 |
| 제한형 호스트 Agent | 모델이 허용 도구 중 다음 행동을 선택하고 서버가 검증·실행 | 임의 도구·직접 DB 수정은 불가, 평가와 비용 계산은 필수 |

일정 후보는 권역 선별 후 관광지·문화시설 최대 30곳, 음식점 12곳, 숙박 8곳, 행사 8곳으로 제한합니다. 자동 권역은 계절·스타일 키워드와 후보 밀도, 인근 행사 점수를 활용합니다. 이는 실제 이동 비용을 최소화한 최적 경로 해법이 아닙니다.

요구사항은 제출 명세의 `FR-01`~`FR-33`, `NFR-01`~`NFR-07`로 식별합니다. 정상 흐름뿐 아니라 인증 실패, 후보 부족, 예보 실패, 생성 형식 오류, 수동 편집 충돌과 수집 중단의 기대 동작을 정의했습니다. 성능 SLA·만족도·시간 절감은 측정 없이 확정 수치로 제시하지 않습니다.

## 5. 시스템 아키텍처와 데이터

**파란 실선은 요청, 반대 방향 주황 점선은 응답**입니다. 공개 조회는 공개 RLS 정책을, 회원 데이터는 사용자 JWT와 RLS를 적용합니다.

![시스템 아키텍처: 파란 실선은 요청, 주황 점선은 응답](docs/local-eum/system-architecture-20261107.png)

서비스 묶음 안의 항목은 각기 별도 서비스입니다. 관광정보 수집은 화면 요청과 별도로 실행하며 서버 전용 키로 DB에 적재합니다.

| 영역 | 주요 저장 구조 |
| --- | --- |
| 인증·프로필 | Supabase Auth, `travel_profiles` |
| 장소·상세 | `comm_place`, `comm_place_tour_detail` |
| 계정 일정·찜 | `travel_itineraries`, `mytrip_plan`, `mytrip_place`, `mytrip_wish` |
| 커뮤니티 | `comm_post`, `comm_post_place`, `comm_post_image`, 댓글·좋아요 테이블 |
| 검색·활동 | `travel_search_log`, `travel_site_activity` |
| 관광 원본·동기화 | `travel_tour_source`, `travel_tour_sync_state` |
| 로컬 체험 | 기존 `lc_*` 호스트·체험·회차·신청 테이블 |

테이블·외래키·접근 정책은 [전체 ERD와 데이터 사전](database/ERD.md)에 정리했습니다. 스키마 건수는 데이터와 마이그레이션 적용 시점에 따라 달라집니다.

![전체 데이터베이스 관계도](database/design/erd-overview.png)

전체 그림은 [SVG로 확대](database/design/erd-overview.svg)할 수 있습니다. [영역별 ERD와 전체 데이터 사전](database/ERD.md)에 모든 열·타입·NULL·PK·FK·UNIQUE·CHECK를 정리했습니다. **실선은 실제 FK**이며 `content_id`·`ext_key`·활동 JSON의 코드 매핑과 구분합니다.

날짜별 일정은 Supabase의 JSONB 데이터로 저장합니다. 계정별 일정·찜 등 회원 전용 기능은 사용자 인증과 소유권 정책을 적용하며, 서버 전용 키는 서버 환경에서 관리합니다.

### 관광정보 수집과 변경 갱신

- 최초 전체 페이지를 수집하고 `contentid`별 수정일·원본 해시·공개 상태를 저장합니다.
- 이후 변경 조회와 해시 비교로 달라진 행만 갱신합니다. 비공개 원본은 보존하되 새 목록·검색·추천 후보에서 제외합니다.
- 페이지 데이터와 다음 페이지 커서를 같은 트랜잭션으로 저장해 중단 후 재개합니다. 호출 한도 오류 시 반복 재시도하지 않고 종료합니다.
- 목록·검색·일정 후보는 저장된 DB를 읽습니다. 아직 없는 상세나 원천 변경으로 오래된 상세는 추가 조회 후 저장하며, 주변·행사·날씨는 외부 조회가 남아 있습니다.

```powershell
npm run check:tourism
npm run sync:tourism
```

현재 예약 동기화는 로컬 Codex 실행 환경에 의존합니다. 공개 운영에서는 서버 스케줄러를 별도로 설정해야 합니다. [Supabase 전환·동기화 안내](docs/supabase-migration.md)의 최신 운영 절과 [마이그레이션](supabase/migrations)을 참고합니다.

## 6. 기술 스택

| 구분 | 기술 | 선택 이유 |
| --- | --- | --- |
| 화면 | React 19, React Router 7 | 검색·일정·기록·체험 화면을 컴포넌트와 경로로 분리 |
| 빌드 | Vite 8 | 개발 서버, API 프록시, 정적 산출물 생성 |
| API | Node.js, Express 5 | 외부 키 보관, 검색·AI 검증과 데이터 연결 |
| 인증·DB | Supabase Auth, PostgreSQL, RLS | 공통 계정과 관계형 데이터·소유권 관리 |
| 호스트 Agent | Supabase Edge Functions | 인증된 호스트 요청과 도구 실행을 서버에서 처리 |
| 관광·날씨 | TourAPI, Open-Meteo | 실제 장소와 날짜별 보조 정보 활용 |
| 지도 | OpenStreetMap, Kakao Maps | 일정 위치와 체험 집결 장소 표시 |
| 검증 | Node test runner, PGlite, Oxlint | 로직·로컬 PostgreSQL 권한·코드 검사 |

정확한 설치 버전은 [`package-lock.json`](package-lock.json)을 기준으로 합니다.

## 7. 개발 환경과 실행

### 환경 준비

Node.js는 설치된 Vite 8의 지원 범위를 충족해야 합니다. 의존성을 설치하고, 환경 파일이 없을 때만 예시를 복사합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
```

이미 `.env.local`이 있으면 복사 명령을 생략하고 기존 설정을 유지합니다.

| 환경 변수 | 용도 |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | 브라우저의 Supabase 프로젝트와 공개 키 |
| `SUPABASE_SECRET_KEY` | 서버 전용 관리·검색 이력·활동·관광정보 동기화 키 |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | 선택적인 서버 설정, 없으면 대응하는 VITE 설정 사용 |
| `TRAVEL_SEARCH_DATA_SOURCE` | 기본 `database`, 직접 외부 검색 `tourapi`, 시연용 `example` |
| `TRAVEL_SEARCH_HISTORY_STORE` | 기본 `supabase`, 저장 끄기 `disabled` |
| `TOUR_API_SERVICE_KEY` | 공공데이터포털의 일반 디코딩 인증키 |
| `TOUR_API_BASE_URL`, `TOUR_API_MOBILE_APP` | 관광 API 주소와 앱 식별 설정 |
| `CODYSSEY_OPENAI_KEY` | 서버의 일정 생성용 키 |
| `CODYSSEY_BASE_URL`, `CODYSSEY_MODEL` | 선택적인 일정 AI 주소·모델 설정 |
| `TRAVEL_BROWSER_COOKIE_SECRET` | 운영 환경에서 필수인 고정 브라우저 쿠키 서명 비밀값 |
| `WEB_ORIGIN` | 허용할 웹 주소, 기본 `http://localhost:5173` |
| `VITE_KAKAO_MAP_JAVASCRIPT_KEY` | 선택적인 지도 키, 제공자에 허용 사이트 등록 필요 |

실제 키는 커밋하지 않습니다. 서버 Secret key와 모델 키에 `VITE_` 접두사를 붙이지 않습니다. 호스트 Agent의 키·허용 origin·배포 설정은 Express와 별도이며 [운영 안내](docs/local-eum/ai-agent-runbook.md)를 따릅니다.

새 Supabase 환경은 필요한 로컬 체험 스키마와 [`supabase/migrations`](supabase/migrations)의 전환 마이그레이션을 확인해 준비합니다. 이미 적용한 환경에 초기 SQL을 무조건 다시 실행하지 않습니다. 호스트 Agent에는 프로젝트·역할 검증이 있으므로 키 변경만으로 다른 환경 준비가 끝나지는 않습니다.

### 로컬 실행

한 터미널에서 화면과 API를 함께 실행합니다. API가 준비된 뒤 화면 서버를 시작하며, 종료하면 함께 실행한 서버도 종료합니다.

```powershell
npm run dev
```

화면과 API를 따로 실행하려면 두 터미널에서 아래 명령을 각각 사용합니다.

```powershell
npm run server
npm run dev:web
```

웹은 `http://localhost:5173`, API는 `http://localhost:3000`입니다. 개발 중 `/api`는 Vite 프록시를 통해 Express에 연결됩니다. 환경 설정을 바꾼 뒤에는 해당 서버를 재시작합니다.

## 8. 주요 화면과 API

| 화면 | 경로 |
| --- | --- |
| 메인·검색 | `/`, `/search` |
| 여행지 목록·상세 | `/places`, `/places/:id`, `/places/tourapi/:id` |
| 장소별 활동 추이 | `/trending/:id` |
| AI 일정 | `/ai-itinerary` |
| 직접 일정 생성·편집 | `/mytrip/new`, `/mytrip/edit/:id` |
| 나의 여행 | `/mytrip` |
| 회원 | `/login`, `/signup` |
| 커뮤니티 | `/community`, `/community/write`, `/community/places/:id/reviews` |
| 로컬 체험 | `/local-eum`, `/local-eum/experiences/:experienceId` |
| 호스트 운영 | `/local-eum/host/profile`, `/local-eum/host/sessions/:sessionId/edit` |

| API | 처리 |
| --- | --- |
| `POST /api/search` | 검색·추천 순위·조건부 검색 이력 및 회원 활동 기록 |
| `GET /api/recommendations` | 최근 검색 조건 기반 추천 |
| `GET /api/places` | 저장된 관광지 페이지·검색·지역 필터 |
| `GET /api/places/:id`, `/api/places/tourapi/:id` | 장소 상세 |
| `GET /api/places/nearby` | 좌표 기반 주변 장소 |
| `GET /api/itineraries/status`, `/api/itineraries/districts` | AI 설정 상태·세부 지역 |
| `POST /api/itineraries/generate` | 후보 선별·AI 생성·검증 |
| `GET /api/mytrip/overview` | 계정별 일정·찜·지난 여행 |
| `GET`, `PUT /api/mytrip/wishes` | 찜 조회·저장·취소 |
| `GET /api/activity`, `/api/activity/place/:id` | 회원 전체 활동 추이·장소별 비교 |
| `POST /api/activity/view` | 인증된 회원의 상세 조회 기록 |
| `/api/community/*` | 글·댓글·좋아요·장소 검색·후기 |

로그인·회원가입 화면은 Supabase Auth SDK를 사용합니다. 직접 일정 편집과 AI 일정 저장 일부도 인증·RLS를 적용한 Supabase SDK/RPC 경로를 사용합니다. 상세 구현은 [`src/lib`](src/lib)과 [`server`](server)를 참고합니다.

## 9. 검증과 개선

```powershell
npm run test:travel
npm run test:supabase
node --test server/repositories/placeDetailRepository.test.js server/asyncTtlCache.test.js
node --test supabase/functions/local-eum-agent/*.test.mjs
npm run lint
npm run build
```

자동 검사는 검색·저장·권한·Agent 도구 실행 로직을 확인합니다. Agent 검사에는 모의 모델을 사용하며, 실제 사용자 설문과 구분합니다. 상세 결과는 상단의 테스트 보고서와 [평가 보완 기록](docs/evaluation-followup-20261107.md)을 참고합니다.

### 개발 중 피드백 반영

| 요청·문제 | 개선 |
| --- | --- |
| AI 일정과 찜이 나의 여행에 연결되지 않음 | 계정별 Supabase 저장·목록·다시 열기 통합 |
| 먼 도시를 오가는 추천 | 시·군·구와 이동 반경을 적용한 후보 선별 |
| 과거 날짜로 새 일정 생성 가능 | 화면 최소 날짜와 서버 검증 |
| 지난 여행이 장소별로 반복 표시됨 | 여행 단위 카드와 전체 일정 상세 |
| AI 없이 직접 계획하고 싶음 | 빈 일정 생성과 일차별 장소 담기·편집 |
| 일정과 찜이 많으면 화면이 계속 늘어남 | 목록 페이지 분할 |
| 헤더 인증 표시와 별도 호스트 로그인 혼선 | 공통 인증·계정 이름·로그아웃 표시 |

이는 개발 과정에서 수집한 개선 의견입니다. 외부 사용자 5명 이상의 검증 결과를 의미하지 않습니다.

## 10. 배포

Vercel은 Vite 정적 웹과 Express API Function을 제공합니다. `api/index.js`가 `server/app.js`를 내보내고, `/api/*` 요청은 API로, 화면 경로는 React 앱으로 전달합니다. 인증·DB·이미지는 Supabase를 사용하고 HOST Agent는 Supabase Edge Function에서 실행합니다.

환경변수, Auth URL, 허용 도메인과 배포 설정은 [배포 안내](docs/vercel-deployment.md)를 참고합니다.

## 11. 실제 화면과 현재 제공 범위

![AI 일정 생성 실행 화면](docs/screenshots/03-ai-itinerary-top.jpg)

![나의 여행 실행 화면](docs/screenshots/05-mytrip.jpg)

위 화면은 개발 환경에서 테스트 계정으로 촬영했습니다. [전체 화면 가이드](docs/feature-screens.md)에서 탐색·직접 작성·리뷰·체험의 입력과 결과를 확인할 수 있습니다.

- 커뮤니티의 기존 사진과 샘플 사진은 표시하지만 **리뷰 작성 화면의 새 사진 업로드는 준비 중**입니다.
- 체험의 카드 이미지는 AI 생성 시연 이미지이며 실제 현장 사진이 아닙니다.
- 날씨·행사 정보는 참고용이며 실제 이동시간과 시설 운영 여부는 방문 전 확인해야 합니다.
- AI 일정 생성 API의 인증·호출 제한과 응답시간 개선은 후속 과제입니다.
- 외부 사용자 5명 이상의 테스트는 아직 진행하지 않았습니다. 실제 응답과 수집 시각을 확보한 뒤 보고서·발표자료에 반영합니다.
