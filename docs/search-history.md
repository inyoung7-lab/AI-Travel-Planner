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
