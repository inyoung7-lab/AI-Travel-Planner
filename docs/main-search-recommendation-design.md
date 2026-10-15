# 메인 검색·추천 DB 전달 설계

## 목적과 준비 상태

이 문서는 메인페이지 검색과 최근 검색 추천의 DB 전달 설계다. TourAPI 검색과 서버 JSON 검색 이력 저장, 브라우저 단위 최근 30일 후보 순위 조정은 구현되어 API에 연결됐다. 실제 회원 인증·Oracle 저장/조회와 실제 인기 통계는 연결/검증되지 않았다. 아래 SQL은 Oracle에서 실행하지 않았다.

공통 `PLACE`와 `MEMBER`의 실제 DDL, PK 컬럼 및 자료형은 확인되지 않았다. 해당 테이블을 새로 만들거나 변경하는 설계는 포함하지 않는다. 확정되지 않은 공유 테이블 FK도 생성 SQL에서 제외했다.

## 신규 객체 결정 사항과 보류 사항

독립 생성 SQL에 포함한 신규 객체는 검색 로그, 검색 결과 연결, 일별 지표 뷰다. 이 핵심 구조는 공통 `PLACE`·`MEMBER`의 세부 정의를 가정하지 않는다. 관광 원천 데이터 카탈로그인 `TRAVEL_PLACE_DATA`와 테마 테이블은 공통 `PLACE`와 중복될 수 있어 별도 유지 여부가 미확정이며, 핵심 생성 SQL에서 제외했다. 아래 `TRAVEL_PLACE_DATA` 데이터 사전은 팀 논의를 위한 후보안이며 확정 생성 SQL이 아니다.

외부 장소 키는 UUID가 아니라 `(SOURCE_CODE, SOURCE_PLACE_ID)` 복합키다. 상세페이지로 전달할 공통 장소 ID와 이 복합키의 매핑은 미정이다. 팀이 `PLACE`와 상세페이지 ID 계약을 확인한 후 별도 연결 SQL을 작성한다.

## 테이블별 데이터 사전

### `TRAVEL_PLACE_DATA` — 외부 관광·숙소 검색 원천 (후보안, 생성 보류)

| 컬럼 | Oracle 자료형 | NULL 허용 | 기본값 | 키·제약 / 용도 |
|---|---|---:|---|---|
| `SOURCE_CODE` | `VARCHAR2(40)` | 아니요 | 없음 | PK 1/2, 원천 공급자 코드 |
| `SOURCE_PLACE_ID` | `VARCHAR2(120)` | 아니요 | 없음 | PK 2/2, 공급자 원천 장소 ID |
| `PLACE_KIND` | `VARCHAR2(20)` | 아니요 | 없음 | CHECK: `ATTRACTION`, `LODGING` |
| `PLACE_TYPE_CODE` | `VARCHAR2(50)` | 아니요 | 없음 | 내부 유형 매핑 코드(예: 펜션) |
| `PLACE_NAME` | `VARCHAR2(200)` | 아니요 | 없음 | 장소명 |
| `REGION_CODE` | `VARCHAR2(30)` | 예 | 없음 | 검색용 지역 코드 |
| `REGION_NAME` | `VARCHAR2(100)` | 예 | 없음 | 지역 표시명 |
| `ADDRESS` | `VARCHAR2(500)` | 예 | 없음 | 주소 |
| `CATEGORY_NAME` | `VARCHAR2(100)` | 예 | 없음 | 원천 분류명 |
| `DESCRIPTION` | `VARCHAR2(2000)` | 예 | 없음 | 설명 |
| `IMAGE_URL` | `VARCHAR2(1000)` | 예 | 없음 | 원천 이미지 URL |
| `DETAIL_URL` | `VARCHAR2(1000)` | 예 | 없음 | 원천 상세 URL |
| `SOURCE_UPDATED_AT` | `TIMESTAMP WITH TIME ZONE` | 예 | 없음 | 원천 갱신 시각 |
| `SYNCED_AT` | `TIMESTAMP WITH TIME ZONE` | 아니요 | `SYSTIMESTAMP` | 수집·동기화 시각 |
| `IS_ACTIVE` | `CHAR(1)` | 아니요 | `'Y'` | CHECK: `Y` 또는 `N` |

후보 PK는 `(SOURCE_CODE, SOURCE_PLACE_ID)`다. 별도 카탈로그를 선택한다면 `REGION_CODE, PLACE_KIND, PLACE_TYPE_CODE, IS_ACTIVE` 검색 인덱스를 검토한다. 이 테이블은 `01_main_search_create.sql`에 포함되지 않는다. 컬럼 길이와 코드 매핑도 외부 원천 스키마 확인 후 확정한다.

### `TRAVEL_PLACE_THEME` — 장소별 검색 테마 (카탈로그 결정 후 검토)

| 컬럼 | Oracle 자료형 | NULL 허용 | 기본값 | 키·제약 / 용도 |
|---|---|---:|---|---|
| `SOURCE_CODE` | `VARCHAR2(40)` | 아니요 | 없음 | PK 1/3, FK 일부 |
| `SOURCE_PLACE_ID` | `VARCHAR2(120)` | 아니요 | 없음 | PK 2/3, FK 일부 |
| `THEME_CODE` | `VARCHAR2(50)` | 아니요 | 없음 | PK 3/3, 테마 코드 |

후보 PK는 세 컬럼 전체다. 별도 카탈로그를 선택한다면 `(SOURCE_CODE, SOURCE_PLACE_ID)`가 `TRAVEL_PLACE_DATA`를 참조하게 한다. 이 후보 테이블도 현재 독립 생성 SQL에는 없다.

### `TRAVEL_SEARCH_LOG` — 검색 요청과 집계 값

| 컬럼 | Oracle 자료형 | NULL 허용 | 기본값 | 키·제약 / 용도 |
|---|---|---:|---|---|
| `SEARCH_ID` | `NUMBER` identity | 아니요 | 자동 생성 | PK |
| `ACTOR_KEY` | `VARCHAR2(128)` | 예 | 없음 | 서버 인증 주체 키. 비로그인은 NULL |
| `QUERY_TEXT` | `VARCHAR2(1000)` | 아니요 | 없음 | 입력 검색어 |
| `CONDITIONS_JSON` | `CLOB` | 아니요 | 없음 | 파싱한 지역·유형·테마 조건 JSON |
| `MATCHED_COUNT` | `NUMBER(10)` | 아니요 | `0` | 현재 필수 조건을 모두 만족한 전체 후보 수 |
| `RETURNED_COUNT` | `NUMBER(10)` | 아니요 | `0` | 정렬·limit 후 이번 API 응답 목록의 건수 |
| `SEARCHED_AT` | `TIMESTAMP WITH TIME ZONE` | 아니요 | `SYSTIMESTAMP` | 검색 시각 |

`SEARCH_ID`가 PK다. 두 count는 음수가 아닌 정수여야 하고 `RETURNED_COUNT <= MATCHED_COUNT`다. 실제 브라우저 화면 노출 건수로 간주하지 않는다. `CONDITIONS_JSON`의 JSON 문법은 서버에서 항상 검증한다. Oracle 12.1.0.2 이상에서는 `IS JSON` CHECK를 선택적으로 적용할 수 있으며, 생성 SQL에 주석으로 남겼다.

`ACTOR_KEY`는 인증 미들웨어가 검증한 서버 세션/토큰 주체에서만 만든다. 요청 본문 `userId`와 브라우저 저장 값은 신뢰하지 않는다.

### `TRAVEL_SEARCH_PLACE` — 반환 결과와 검색 연결

| 컬럼 | Oracle 자료형 | NULL 허용 | 기본값 | 키·제약 / 용도 |
|---|---|---:|---|---|
| `SEARCH_ID` | `NUMBER` | 아니요 | 없음 | PK 일부, `TRAVEL_SEARCH_LOG` FK |
| `SOURCE_CODE` | `VARCHAR2(40)` | 아니요 | 없음 | PK 일부, 장소 원천 FK 일부 |
| `SOURCE_PLACE_ID` | `VARCHAR2(120)` | 아니요 | 없음 | PK 일부, 장소 원천 FK 일부 |
| `RESULT_POSITION` | `NUMBER(6)` | 아니요 | 없음 | 검색별 양의 정수 순번 |
| `RANK_SCORE` | `NUMBER(12,6)` | 예 | 없음 | 검색 당시 순위 점수(선택) |
| `CLICKED_AT` | `TIMESTAMP WITH TIME ZONE` | 예 | 없음 | 해당 검색 결과의 최초 실제 상세페이지 열기 시각 |

PK는 `(SEARCH_ID, SOURCE_CODE, SOURCE_PLACE_ID)`이며, `(SEARCH_ID, RESULT_POSITION)` UNIQUE로 같은 검색 내 순번 중복을 막는다. `RESULT_POSITION`은 양의 정수다. `SEARCH_ID`는 검색 로그 FK이며 부모 삭제 시 연쇄 삭제한다. 이 핵심 SQL은 미확정 장소 카탈로그나 공통 `PLACE`를 참조하지 않는다. 장소 ID 유효성 및 장소 FK는 카탈로그 방식과 팀 ID 계약이 결정된 뒤 별도 설계한다.

검색 로그와 반환 결과 연결은 한 트랜잭션으로 저장하고 결과 행 수를 `RETURNED_COUNT`와 일치시킨다. `CLICKED_AT`은 최초 1회만 기록한다. 상세페이지가 준비 중이라는 안내를 클릭한 것은 실제 상세 조회가 아니므로 기록하지 않는다.

### `V_TRAVEL_DAILY_INTEREST` — 앱 내부 검색 지표 뷰

| 컬럼 | 자료형(표현식 기준) | 의미 |
|---|---|---|
| `ACTIVITY_DAY` | `DATE` | Asia/Seoul 기준 활동 날짜 |
| `SOURCE_CODE` | `VARCHAR2(40)` | 원천 코드 |
| `SOURCE_PLACE_ID` | `VARCHAR2(120)` | 원천 장소 ID |
| `RESULT_RETURN_COUNT` | `NUMBER` | 검색 결과 목록에 반환된 횟수. `SEARCHED_AT` 날짜에 합산 |
| `DETAIL_CLICK_COUNT` | `NUMBER` | 실제 상세페이지 최초 열기 횟수. `CLICKED_AT` 날짜에 합산 |

두 지표는 각각의 날짜를 기준으로 별도 집계한 뒤 합친다. 따라서 검색 반환일과 상세 클릭일이 다르면 각 날짜에 따로 반영된다. 한 검색-장소 연결은 PK상 한 행뿐이므로 `COUNT(*)`만 사용하며 동일 의미의 `COUNT(DISTINCT SEARCH_ID)`는 중복 계산하지 않는다. 이 지표는 앱 내부 API 기록이며 실제 화면 노출 수나 전국 관광 인기 통계가 아니다.

상승률 비교는 Asia/Seoul 기준 최근 완료된 7일과 그 직전 완료된 7일을 비교하고 오늘의 미완료 날짜는 제외한다. 직전 합계가 0이고 최근 합계가 양수이면 수치 대신 “신규 관측(비교 기준 0)”, 두 기간 모두 0이면 “활동 없음”으로 표시한다. 직전 합계가 양수일 때만 `(최근 7일 - 직전 7일) / 직전 7일 × 100`을 계산한다.

## 검색 API 및 추천 동작

요청은 `POST /api/search`와 `{ "query": "경남 바다 펜션", "limit": 8 }` 형태다. 응답에는 `matchedCount`, `returnedCount`, 제한값, `personalized`, `items`, 실제 저장 결과를 나타내는 `history.saved`가 포함된다. `matchedCount`는 지역·유형·테마 등 필수 조건을 모두 적용한 조회 범위의 건수이고, `returnedCount`는 실제 응답 `items` 건수다. TourAPI 원천 조회가 페이지 제한에 걸려 전체 일치 수가 확정되지 않으면 저장을 건너뛴다.

검색은 현재 요청의 지역·유형·테마를 먼저 엄격히 필터링한다. 인증된 사용자의 최근 30일 검색 이력이 있으면 해당 후보 안에서만 선호 신호로 순위를 조정한다. 비로그인 또는 검색 기록이 없는 사용자는 중립적인 일반 목록을 받으며 `personalized: false`다. 이 목록을 개인 맞춤 결과라고 설명하지 않는다. 별도 취향 테이블은 우선 만들지 않고 검색 이력에서 파생한다.

Oracle 검색 이력 저장 코드는 `TRAVEL_SEARCH_LOG`와 `TRAVEL_SEARCH_PLACE`를 단일 트랜잭션으로 기록한다. 개발 기본값은 별도 서버 JSON 저장소이며, 브라우저 쿠키 식별자로 최근 30일 지역·유형·테마 빈도를 계산해 필수 조건 통과 후보만 재정렬한다. 현재 검색은 추천 계산 후 저장한다. 이 브라우저 기준은 회원 인증이 아니며 요청 본문 ID를 사용하지 않는다. Oracle 모드에는 브라우저 키를 쓰거나 개인화를 연결하지 않는다. LLM에는 향후 필수 필터와 후보 개수 제한을 통과한 후보만 전달한다.

## Oracle 버전, 실행 순서 및 검증 범위

- 최소 버전은 Oracle Database 12c Release 1 (12.1)이다. `GENERATED ALWAYS AS IDENTITY` 사용을 기준으로 한다. [Oracle 12.1 신규 기능 안내](https://docs.oracle.com/database/121/NEWFT/chapter12101.htm)
- `CONDITIONS_JSON IS JSON`은 Oracle Database 12.1.0.2 이상에서만 선택 적용한다. 해당 버전 미만에서는 SQL 제약을 제외하고 서버에서 JSON 문법·스키마를 검증한다. [Oracle SQL/JSON 조건 버전 안내](https://docs.oracle.com/database/121/SQLRF/E41329-25.pdf)
- `01_main_search_create.sql` 실행 순서: `TRAVEL_SEARCH_LOG`, 검색 로그 인덱스, `TRAVEL_SEARCH_PLACE`, 결과 참조 인덱스, `V_TRAVEL_DAILY_INTEREST` 순서다. 파일 안의 객체 순서대로 실행한다.
- 의존성 점검 결과, `01_main_search_create.sql`에는 `TRAVEL_PLACE_DATA`·`TRAVEL_PLACE_THEME` 생성문이 없다. 두 객체를 참조하는 FK도 없다. 유일한 FK는 `TRAVEL_SEARCH_PLACE.SEARCH_ID`에서 같은 파일의 `TRAVEL_SEARCH_LOG.SEARCH_ID`를 참조한다.
- 장소 원천 카탈로그 및 테마 DDL은 `PLACE` 중복 검토와 팀의 별도 카탈로그 유지 결정 후 작성한다.
- 실행 전에 Oracle 버전, 검색어 보존 정책 및 검색 API 트랜잭션 기준을 팀에서 승인해야 한다.
- `02_shared_link_pending.sql`은 보류 파일이며 실행 가능한 SQL을 포함하지 않는다. 별도 카탈로그를 선택하면 최종 DDL 확정 후 `TRAVEL_PLACE_DATA`와 PK를 먼저 만들고, 다음으로 `TRAVEL_PLACE_THEME`를 생성한다. 독립 검색 객체는 `01_main_search_create.sql` 순서대로 만들 수 있다. 카탈로그 FK는 두 쪽의 실제 컬럼명·자료형과 모델 선택이 확인된 뒤 별도 검토 SQL로 추가한다. `PLACE` 통합안을 택하면 별도 카탈로그 절차를 적용하지 않는다.
- 이전 파일명 `main_search_recommendation_draft.sql`은 실행 SQL이 없는 구버전 안내 파일로 바꿨다. 현재 생성 SQL과 함께 실행하지 않는다.
- 현재 및 구버전 SQL 모두 실제 Oracle에서 실행하지 않았다. 구문, 권한, 버전 호환성에 대한 Oracle 실행 검증은 하지 않았다.

## 미확정 공유 테이블 연결: 팀 확인 후 별도 적용

`PLACE` 또는 `MEMBER` 컬럼, PK, ID 자료형을 가정하지 않는다. [`02_shared_link_pending.sql`](../server/sql/02_shared_link_pending.sql)은 연결을 위한 확인 항목만 담으며 `CREATE`·`ALTER` 등 실행 가능한 DDL을 포함하지 않는다. DB 담당 팀원과 아래를 확정한 뒤 구체적인 FK/매핑 SQL을 별도 작성한다.

1. `PLACE`의 실제 PK 컬럼명, Oracle 자료형, 상세페이지 라우트가 받는 ID.
2. `TRAVEL_PLACE_DATA`를 `PLACE`로 통합할지 원천 검색 카탈로그로 별도 유지할지.
3. 외부 원천 ID의 범위와 `(SOURCE_CODE, SOURCE_PLACE_ID)`에서 공통 장소 ID로 가는 매핑 방식 및 중복 처리 규칙.
4. `MEMBER`의 실제 PK·자료형과 인증 성공 후 서버가 신뢰할 수 있는 사용자 키.
5. 검색어 동의, 보존 기간, 삭제 정책과 비로그인 기록 보존 여부.

## 전달 파일

- `server/sql/01_main_search_create.sql`: `PLACE`·`MEMBER`와 독립적인 신규 검색 기능 객체 생성 SQL.
- `server/sql/02_shared_link_pending.sql`: `PLACE`·`MEMBER` 연결에 필요한 미확정 체크리스트. SQL 실행 파일이 아니다.
- `server/sql/main_search_recommendation_draft.sql`: 중복 실행 방지를 위한 구버전 안내 파일. 실행하지 않는다.
- `docs/main-search-recommendation-design.md`: 설계 근거, 데이터 사전, 집계·추천 기준 및 실행 안내.
