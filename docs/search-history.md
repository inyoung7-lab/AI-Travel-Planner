# 검색 이력 저장 연결

## 저장 구조

구현은 `server/sql/01_main_search_create.sql`의 두 테이블을 사용합니다.

- `TRAVEL_SEARCH_LOG`: 검색어, 파싱한 조건 JSON, 일치·반환 건수와 `SEARCHED_AT` 기본값(`SYSTIMESTAMP`). `ACTOR_KEY`는 현재 서버에서 검증된 사용자 주체가 없으므로 `NULL`로 저장합니다.
- `TRAVEL_SEARCH_PLACE`: 각 반환 결과의 원천 `SOURCE_CODE`, `SOURCE_PLACE_ID`, 1부터 시작하는 `RESULT_POSITION`.

검색 이력 저장소는 한 연결에서 로그 INSERT와 결과 `executeMany`를 수행하고 `commit` 한 번으로 확정합니다. 어느 INSERT든 실패하면 `rollback`하며, 결과 수가 API 반환 수와 다르면 저장 전에 거부합니다. `CLICKED_AT`은 수정하지 않습니다. 검색 카드의 준비 중 안내는 실제 상세페이지 열기가 아니며, 현재 상세 열기 이벤트 연결도 없습니다.

원천 ID가 있는 실제 데이터 검색 결과만 저장합니다. 예시 데이터는 검색 이력으로 남기지 않습니다. 원천 페이지 제한 때문에 전체 일치 건수를 확정할 수 없는 검색도 현재 SQL에 완전성 컬럼이 없으므로 저장하지 않습니다. TourAPI 검색은 DB 미설정 또는 기록 저장 실패 때 계속 응답하며, 응답의 `history.saved`는 실제 저장이 성공한 경우에만 `true`입니다. 저장 실패는 정상 검색 결과를 실패로 바꾸지 않습니다. 실패한 공급자 검색은 저장 로직까지 도달하지 않습니다. 정상적인 0건 검색은 성공한 검색으로 저장할 수 있습니다.

## 인증 연결 상태

현재 `server/login.js`는 로그인 성공 사용자 정보를 응답하지만 서버 세션, 서명된 토큰 또는 인증 쿠키를 발급하지 않습니다. `src/pages/Login.jsx`는 사용자 정보를 `localStorage`에 기록하며, 이는 서버가 검증할 수 있는 인증 주체가 아닙니다. 검색 요청 본문과 브라우저 저장값의 `userId`는 검색 이력의 `ACTOR_KEY`로 사용하지 않습니다. 따라서 현재 저장은 인증 사용자별이 아닌 `ACTOR_KEY=NULL`의 익명 기록이며, 개인별 이력 조회나 개인화 API는 연결하지 않았습니다.

팀 인증 구현 후에는 서버 인증 미들웨어가 검증된 주체를 `req.auth` 같은 서버 전용 요청 문맥에 넣고, 검색 핸들러에 주입한 actor resolver만 그 주체를 읽도록 연결해야 합니다. 실제 `MEMBER` PK와 인증 주체 간 매핑이 확인된 뒤 `ACTOR_KEY`의 의미/FK 여부를 결정합니다. 브라우저에서 보낸 `userId`를 대체 입력으로 사용하지 않습니다.

## 설정 및 검증 범위

검색 이력 저장소는 `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`이 모두 설정된 경우에만 만들어집니다. Wallet 위치·비밀번호 값은 여기서 검사하거나 출력하지 않습니다. 설정이 없으면 검색 응답에 `history: { saved: false, reason: "not_configured" }`를 반환합니다. 설정이 있어도 스키마 미적용, 권한 부족 등 저장 실패 시 `saved:false`이며 민감한 드라이버 오류는 응답에 노출하지 않습니다.

`server/recommendations/recentSearchRecommendations.js`에는 최근 30×24시간 조건 빈도 계산, 현재 조건을 통과한 후보의 순위 조정 및 이력 공급자 주입 인터페이스가 있다. Oracle 조회는 요청된 비NULL `ACTOR_KEY`와 `searched_at` 경계(시작 시각 포함, 현재 시각 포함)를 모두 바인드해 개인별 행만 읽는다. SQL에서도 `actor_key IS NOT NULL`을 명시한다. 익명 행을 제외하고 지역·유형·테마 빈도만 순위에 더하며, 현재 검색의 필수 조건은 그대로 유지한다.

현재 서버에 검증된 인증 미들웨어가 없으므로 이 추천 함수와 Oracle 이력 조회는 실제 `/api/search`에 연결되지 않았다. 함수 동작은 사용자별 모의 이력으로만 테스트했고, 운영 요청에는 모의 이력을 넣지 않는다. 저장소의 정상 commit, 결과 INSERT 실패 시 rollback, 성공한 0건 검색 저장, 검색 실패/부분 건수/예시 데이터의 저장 건너뜀, 최근 30일 경계·사용자 분리·익명 제외·순위는 주입한 모의 연결/이력으로 테스트한다. 이 검증은 Oracle 연결이나 SQL 실행 검증이 아니다. SQL은 DB 담당자가 `01_main_search_create.sql`을 실행해 객체를 만들기 전에는 실제 조회할 수 없다. LLM은 범위에 포함되지 않는다.

## JSON browser-history implementation

`TRAVEL_SEARCH_HISTORY_STORE=json` (the default) uses `server/data/search-history.json`, outside `public` and excluded by `/server/data/` in `.gitignore`. Its version 1 structure is `{ "version": 1, "searches": [...] }`. Each row stores a random search ID, server-issued browser ID, query, parsed conditions, ISO 8601 search timestamp, matched and returned counts, and returned source/source-place IDs. Writes are serialized within the server process and use a temporary file followed by rename. Missing files are initialized; corrupt JSON or an unsupported/malformed structure raises an error and is never replaced with an empty file.

`/api/search` reads the browser's recent 30-day history before ranking and writes the current successful search after ranking. The current search cannot score itself. Ranking runs on all candidates that passed current mandatory filters before the response limit is applied. `/api/recommendations` uses the same flow for the home preference section. Empty history or a read failure returns ordinary ordering and reports `personalized: false`; the response separately reports whether the basis is `browser`. Example catalog cards remain labeled as examples and non-personalized. Trending cards and their interest graph remain example data.

The server issues an HttpOnly, SameSite=Lax signed `travel_browser_id` cookie. The identifier is a random opaque browser key and is not member authentication. The signing secret is generated under ignored `server/data/browser-cookie-secret`; deployments can configure `TRAVEL_BROWSER_COOKIE_SECRET` (at least 32 bytes) and must share it across API instances. Clearing the cookie or switching browsers starts a separate history. Request-body `userId` and `actorKey` are ignored.

`TRAVEL_SEARCH_HISTORY_STORE=oracle` selects the existing Oracle adapter, but browser IDs are never written to Oracle `ACTOR_KEY`. Member-scoped Oracle reads require server-verified authentication and a mapping confirmed against the actual `MEMBER` DDL. Oracle access and SQL execution were not performed. Temporary-directory tests cover JSON persistence, restart reads, browser separation, concurrent writes, corruption protection, and recommendation behavior.

LLM recommendation and actual popularity statistics remain future work.
## Browser-cookie key stability and manual flow check

For local development, if `TRAVEL_BROWSER_COOKIE_SECRET` is blank, the server creates `server/data/browser-cookie-secret` once using exclusive file creation and reuses that file at every restart. It does not generate a new key when the file already exists. Keep `server/data/` persistent and do not delete or replace this key; doing so invalidates existing signed cookies. In production, `TRAVEL_BROWSER_COOKIE_SECRET` is required and must be a stable random value of at least 32 bytes supplied through the server environment or secret manager. Every API instance must use the same value. The application never logs or returns the secret.

Manual browser check (requires a valid TourAPI server configuration; do not use the example catalog because it intentionally does not save example searches):

1. Set `TRAVEL_SEARCH_DATA_SOURCE=tourapi` and `TRAVEL_SEARCH_HISTORY_STORE=json` in the server environment, start the API with `npm run server`, and start Vite with `npm run dev`.
2. Open `http://localhost:5173/`. The home page calls `/api/recommendations`, which issues an HttpOnly `travel_browser_id` cookie. In browser developer tools, confirm that cookie exists; its value is not needed for the check.
3. Search for a query that returns places, for example `부산 바다`. The first search should normally report no prior personalization in the API response (`personalized: false`, browser basis) and, after a successful complete search, `history.saved: true`. Search results UI says the list is general when no earlier matching history exists.
4. Return to the home page. If a prior 30-day condition matches fields confirmed on fetched candidates, the home section says the list reflects recent search preferences and identifies the basis as this browser. Otherwise it shows the general-list message. This does not imply member login or national popularity.
5. Restart the API without clearing browser data or `server/data/browser-cookie-secret`, reload the same browser, and repeat. The cookie should remain valid and prior JSON history should still be used. A separate browser profile should receive a different cookie and start without the first browser's history.

The automated temporary-directory tests validate key reuse across loader invocations, cookie signature verification, JSON persistence after repository re-creation, separate browser histories, and recommendation fallback. They are mock/local tests, not an actual browser or TourAPI verification. No real browser check was performed for this change.