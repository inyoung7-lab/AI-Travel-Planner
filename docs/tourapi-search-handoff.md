# 메인 검색·TourAPI·검색 이력 전달 안내

## 구현 상태

| 영역 | 상태 | 확인된 범위 |
|---|---|---|
| TourAPI 검색 | 구현 완료 | `example`/`tourapi` 저장소 선택, 서버 환경변수 사용, 지역·분류·키워드 요청, 결과 정규화, 필터·페이지 제한·오류 처리. 실제 TourAPI 호출 여부는 별도 실행 환경의 키와 한도에 따름. |
| 검색 이력 코드 | 구현 완료 | `TRAVEL_SEARCH_LOG`와 `TRAVEL_SEARCH_PLACE`를 한 트랜잭션으로 저장. 검색 실패는 저장하지 않고, 미설정·저장 실패는 검색 성공과 구분해 응답. |
| 최근 30일 추천 계산 | 구현 완료 | 최근 30×24시간 검색 조건 빈도를 계산하고 현재 조건을 통과한 후보의 순위에만 반영. 주입형 저장소로 모의 이력 테스트 완료. |
| 로그인 인증 연결 | 대기 | 로그인 성공 응답은 있지만 검증 가능한 서버 세션·서명 토큰·인증 미들웨어가 없음. `/api/search` 개인화 연결 금지 상태이며 계속 `personalized: false`를 반환해야 함. |
| Oracle 저장·조회 검증 | 대기 | SQL 및 저장소 코드는 있으나 실제 Oracle 접속·DDL 적용·INSERT/SELECT 검증은 하지 않음. |
| LLM 추천 | 미구현 | 현재 검색 필수 조건 필터와 후보 수 제한을 통과한 후보만 전달하는 후속 단계. |

메인페이지의 맞춤 여행지 카드와 인기 여행지 상세 그래프는 화면 확인용 예시 데이터다. 실제 개인화 추천, 전국 관광 인기 통계, 실제 관심도 집계로 설명하지 않는다. TourAPI 검색 결과는 검색 API 응답 데이터이며 이 예시 카드/그래프의 실제 통계 근거가 아니다.

## 로그인 담당자 연결 지점과 ACTOR_KEY

현재 로그인은 `server/login.js`에서 자격을 확인하고 사용자 정보를 응답하지만, 후속 요청에서 재검증할 수 있는 서버 인증 주체를 발급하지 않는다. 브라우저 `localStorage` 값이나 요청 본문의 `userId`를 인증으로 취급하지 않는다.

인증 담당자는 검증 가능한 세션 또는 서명 토큰 미들웨어를 만들고, 로그인 검증 후속 요청에서만 서버 측 `req.auth`에 주체를 설정해야 한다. 검색 연결 위치는 `server/server.js`의 `/api/search` 라우트와 `server/search.js`의 `createSearchHandler`다. 이 지점에서 인증 미들웨어가 만든 주체만 actor resolver에 전달하고, resolver가 결정한 키로 `recommendForVerifiedActor` 및 `historyRepository.listRecentConditions`를 호출한다. 미들웨어/저장소 주입이 연결되기 전에는 이력을 조회하지 않는다.

SQL의 `ACTOR_KEY`는 `VARCHAR2(128)` nullable이다. 애플리케이션 계약은 공백이 아닌 최대 128자의 안정적인 서버 인증 주체 식별 키로 제한한다. 실제 형식(예: MEMBER PK를 그대로 쓸지, 별도 opaque subject를 쓸지)과 매핑은 미확정이다. `MEMBER`의 PK 이름·자료형·제약을 확인하지 않았으므로 추측하거나 FK를 만들지 않는다. 로그인 담당자와 DB 담당자는 실제 `MEMBER` DDL, 인증 주체의 안정성/재발급 정책, 탈퇴·계정 통합 정책을 합의한 뒤 동일 매핑을 저장과 조회에 적용해야 한다. 익명 기록은 `ACTOR_KEY=NULL`로 남고 개인화 조회 SQL에서 제외한다.

## DB 담당자 적용 순서 및 설정

1. 프로젝트 루트의 `.env.example`을 참고해 서버 전용 설정을 준비한다. TourAPI 검색에는 `TRAVEL_SEARCH_DATA_SOURCE=tourapi`, `TOUR_API_SERVICE_KEY`, `TOUR_API_MOBILE_APP`가 필요하다. 검색 이력 Oracle 저장에는 `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`이 추가로 필요하다. 키·비밀번호는 브라우저 변수나 저장소에 넣지 않는다. Wallet은 접속 구성이 요구할 때만 별도로 배치하고 Git 추적 대상에서 제외한다.
2. Oracle 버전과 권한, 스키마, 기존 객체 이름 충돌을 확인한다. `01_main_search_create.sql`의 목표 최소 버전은 Oracle 12.1이다. JSON CHECK 제약은 12.1.0.2 이상에서만 주석을 해제하고, 그 이전 버전은 서버에서 JSON을 검증한다.
3. `server/sql/01_main_search_create.sql`을 검토·적용한다. 파일 내 순서대로 `TRAVEL_SEARCH_LOG` → 인덱스 → `TRAVEL_SEARCH_PLACE` → 인덱스 → `V_TRAVEL_DAILY_INTEREST`가 생성된다. `TRAVEL_PLACE_DATA`, `TRAVEL_PLACE_THEME`, `PLACE`, `MEMBER`에는 의존하지 않는다.
4. `server/sql/02_shared_link_pending.sql`은 실행 SQL이 아닌 확인 목록이다. `PLACE`/`MEMBER` 실제 DDL 및 원천 카탈로그 통합 여부를 확정한 뒤 별도 연결 SQL을 작성한다. `main_search_recommendation_draft.sql`은 구버전 안내이며 실행 대상이 아니다.
5. `TRAVEL_PLACE_DATA`와 공통 `PLACE`가 중복인지, 원천 카탈로그를 따로 유지할지 팀이 결정하기 전에는 카탈로그 생성/FK를 추가하지 않는다.

## 적용 후 검증 절차

- **저장 확인:** 성공한 검색 하나와 성공한 0건 검색 하나가 각각 로그로 저장되는지, 로그의 `RETURNED_COUNT`와 결과 행 수·순번이 일치하는지 확인한다. 결과 행 삽입을 실패시킨 테스트 트랜잭션에서는 로그까지 롤백되는지 확인한다.
- **실패 분리:** TourAPI/DB 오류가 정상 0건으로 기록되지 않고, DB 미설정·저장 실패가 응답의 `history.saved` 상태로 구분되는지 확인한다.
- **조회/추천 확인:** 인증 담당자가 발급한 테스트 주체 A/B의 ACTOR_KEY로만 각각 조회되는지, NULL 주체가 조회에서 제외되는지 확인한다. 검색 시각 경계는 현재 시각 포함, 정확히 30일 전 포함, 그보다 오래된 기록 제외다. 현재 요청의 지역·유형·테마를 통과하지 않는 후보는 과거 취향이 강해도 제외하고, 통과 후보의 순위만 비교한다.
- **기록 검증:** 실제 상세페이지를 열지 않은 카드의 “상세페이지 준비 중” 안내는 클릭 통계에 기록하지 않는다. 성공 응답만 기록하고 개인정보가 포함된 검색어의 보존/삭제 정책도 운영 전 확정한다.

위 절차는 전달용 검증 계획이며, 이 문서를 준비하는 동안 Oracle 접속·DDL 실행·실제 저장/조회 검증을 수행하지 않았다. 코드를 대상으로 한 모의 테스트·빌드·린트 결과와 실제 DB 검증 결과를 구분한다.

## 비밀 정보 점검

`.env`와 `Wallet/`은 `.gitignore`에서 제외된다. 커밋 후보 및 추적 파일 목록에서는 `.env`, Wallet, 인증키·개인키 파일을 제외한다. `.env.example`에는 변수명만 있고 값은 비워 둔다.
