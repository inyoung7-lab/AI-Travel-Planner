# 로컬이음 체험 상세정보·공통 장소·지도 설계안

작성일: 2026-10-16 / 상태: 승인 대기. **원격 DB와 React 코드는 이번 단계에서 변경하지 않았다.**

대상은 `local-eum-dev` / 프로젝트 ID `rhkaxmqdkztpbljkunxb`다. 실행 직전에 Dashboard 이름과 URL ID를 다시 확인한다. 기존 `hykang` 작업, 5개 테이블, 역할, 등록 데이터, 회차 참가비를 보존한다. Oracle·팀 로그인·공통 헤더·다른 팀 화면은 변경 대상에 포함하지 않는다.

## 1. 지도 공급자 비교와 제안

**제안: 카카오 지도 SDK로 지도·마커·길찾기를 제공하고, 영구 저장할 주소·좌표는 공공 주소 API 또는 별도로 적법하게 확보한 실제 장소 자료에서 얻는다.** 지도 공급자와 저장 데이터 출처는 서로 다른 속성이다.

| 선택지 | 장점 | 필요한 구성 / 이번 목표와의 관계 |
| --- | --- | --- |
| 네이버 지도 + 네이버 지역 검색 | 지도 표시와 업체 검색 가능 | 지도 애플리케이션 외에 지역 검색 Client ID/Secret과 Supabase Edge Function이 필요. 지역 검색은 최대 5개 결과, 일 25,000회. 결과 영구 저장 허용 범위는 이번 조사에서 확정하지 못했으므로 허용된 것으로 가정하지 않음. |
| 카카오 지도 + Local 검색 결과 그대로 DB 저장 | 검색·주소·지도 라이브러리가 한 SDK에 있어 구현은 간단 | 공식 FAQ와 담당자 답변은 Local 검색/지오코딩 응답의 별도 저장을 제한함. 사용자의 선택·확인만으로 원본 또는 가공 주소·좌표를 저장하는 방식은 채택하지 않음. |
| **카카오 지도 + 공공 주소·좌표 데이터** | 지도·길찾기 구현이 간단하고, 공통 장소 DB를 공급자와 분리 가능 | 공공 도로명주소 검색·좌표 API 설정과 좌표 변환이 필요. 사용자가 실제 소유·운영 장소의 상호를 제공하고 공식 주소 결과를 확인하는 흐름을 사용. |

카카오 `services` 라이브러리로 상호 검색을 제공하는 경우 결과는 실시간 탐색용으로만 사용한다. Local API 응답 전체, 주소, 좌표, 상호를 DB·localStorage·로그에 저장하지 않는다. 상호는 호스트가 이미 보유한 실제 장소 자료에서 직접 등록하며, 검색 결과를 복사하거나 검색 결과를 보고 다시 입력하도록 유도하는 우회 동선은 만들지 않는다. 주소·좌표는 독립적인 공공 주소 결과를 선택해 저장한다. 실시간 검색 결과와 공공 주소 후보가 일치하지 않으면 자동 연결하지 않는다.

초기 구현은 **호스트의 장소명 입력 → 공공 주소/건물명 검색 → 주소 후보 선택 → 공공 좌표로 지도 확인 → 명시 확인·저장**이 기본 흐름이다. 지도 내 상호 검색은 장소 확인 보조 기능이며, 저장할 주소·좌표의 출처를 바꾸지 않는다. 건물명·도로명 검색과 상호 검색은 결과 범위가 다르다는 점을 화면에서 구분한다.

공공 주소 좌표는 건물 출입구 수준의 위치일 수 있으며 공방의 층·호 또는 집결 지점을 자동 보장하지 않는다. 상세 주소와 찾아오는 방법은 호스트가 사실에 근거해 입력한다. 임의 좌표, 임의 공방 활동, 다른 업체의 사진을 채우지 않는다.

## 2. 필요한 API 설정과 비용

### 카카오 지도

1. Kakao Developers에서 로컬이음 앱을 생성하거나 기존 사용 가능한 앱을 선택한다.
2. 앱의 카카오맵 사용 권한을 활성화한다.
3. `[앱 설정] → [앱] → [플랫폼 키]`의 JavaScript 키에 SDK 도메인을 등록한다.
4. 개발 도메인 `http://127.0.0.1:5173`, `http://localhost:5173`을 등록한다. 배포할 때 실제 HTTPS 도메인만 추가한다.
5. 로컬 `.env.local`의 `VITE_KAKAO_MAP_JAVASCRIPT_KEY`로 설정한다. `.env.example`에는 빈 예시만 둔다. 이번 단계에서 환경 파일은 수정하지 않았다.

JavaScript 키는 브라우저에 전달하도록 제공된 공개 식별자라 사용자 개발자 도구에서 보일 수 있다. 환경변수로 감춰지는 비밀키라고 설명하지 않는다. 허용 도메인·쿼터로 사용 범위를 제한한다. REST/Admin/Secret 및 Supabase service-role 키는 프론트엔드와 Git에 넣지 않는다.

공식 쿼터 문서 확인 기준: 개발자 계정에서 첫 번째로 활성화한 앱에 무료 쿼터를 제공하며, Web SDK는 일 300,000건, 주소 변환/키워드 검색은 각 일 100,000건이다. 월간 전체 API 무료 쿼터와 계정의 실제 무료 적용 여부도 콘솔에서 확인한다. 추가 유료 쿼터 표에는 Web SDK 0.1원/건, 주소 변환 0.5원/건, 키워드 검색 2원/건이 안내되어 있다. **유료 사용은 이번 승인 범위에 포함하지 않는다.** 기본 구현은 검색 버튼 제출 시 호출하고, 지도는 영역을 열 때 로드하며, 쿼터 초과·권한 없음에는 주소와 오류 안내를 표시한다.

네이버 공식 요금 안내는 대표 계정 기준 Dynamic Map 월 6,000,000건 무료, 초과 0.1원/건을 안내한다. 무료 적용과 상품 조건은 실제 등록 계정에서 다시 확인한다. 지도 요금만으로 두 공급자의 검색·저장 조건이 같다고 판단하지 않는다.

### 공공 주소/좌표 API

주소기반산업지원서비스에서 **도로명주소 검색 API와 좌표제공 API**를 각각 신청한다. 승인키·이용 조건·실제 호출 제한은 발급 화면에서 확인하고 기록한다. 아직 키가 발급되었다거나 호출 검증을 마쳤다고 간주하지 않는다.

API 키는 Supabase Edge Function secrets의 `JUSO_SEARCH_API_KEY`, `JUSO_COORD_API_KEY`에 보관한다. 새 함수는 로컬이음 전용으로 만들며 기존 팀 Express/Oracle 서버를 사용하지 않는다. 이 함수 배포와 외부 API 실제 호출은 이번 설계 단계에서 수행하지 않는다.

Edge Function은 Supabase JWT를 검증하고 DB의 HOST 역할·승인 상태를 확인한 뒤 고정된 공식 주소 API만 호출한다. 브라우저가 보낸 임의 URL은 호출하지 않는다. CORS는 등록한 로컬·배포 주소로 제한하고, 요청/응답 로그에 키나 검색 API 응답 원문을 기록하지 않는다. 검색 결과 개수·검색어 길이를 제한하고 호출 제한 응답을 처리한다. 별도의 무제한 공개 프록시는 만들지 않는다.

공공 좌표 API의 `entX/entY`는 UTM-K(GRS80) 좌표이므로 WGS84 위경도로 변환한다. 기존 x/y를 위도·경도로 그대로 저장하지 않는다. 변환 라이브러리의 정의와 공식 주소의 실제 위치를 함께 검증한다. API 발급 조건에서 이번 저장·활용을 허용하는지 확인한 뒤 활성화한다. 조건이 맞지 않으면 출처를 확인한 실제 호스트 제공 자료를 사용하거나 좌표를 NULL로 남긴다.

## 3. 테이블과 컬럼

SQL 파일: `migrations/20261016_experience_details_places.draft.sql`

기존 5개를 유지하고 2개를 추가하므로 총 7개다. 인증 계정·역할 테이블을 새로 만들지 않는다.

| 테이블 | 변경 | 주요 컬럼과 의미 |
| --- | --- | --- |
| `lc_experiences` | 컬럼 8개 추가 | `detail_description text`: 상세 소개. `inclusions text[]`: 제공 사항. `preparation_items text[]`: 준비물. `precautions text[]`: 유의사항. `hero_image_url text`, `hero_image_alt text`: 대표 이미지와 설명. `venue_place_id bigint`: 실제 체험 장소 FK. `updated_at timestamptz`: 동시 수정 감지. |
| `lc_experience_steps` | 신규 | `step_id bigint` PK, `experience_id bigint` FK, `step_order smallint`, `elapsed_min integer`, `duration_min integer`, `title text`, `description text`, `created_at/updated_at timestamptz`. |
| `lc_places` | 신규 | `place_id bigint` PK, `owner_host_id bigint` FK, `place_name text`, `road_address text`, `address_detail text`, `latitude/longitude numeric(10,7)`, `directions text`, `map_provider text`, `provider_place_id text`, `map_url text`, `coordinate_source text`, `source_reference text`, `is_confirmed boolean`, `confirmed_at/created_at/updated_at timestamptz`. |
| `lc_sessions` | FK 컬럼 1개 추가 | `meeting_place_id bigint`: 그 회차의 집결 장소 FK. 기존 날짜·시간·참가비·인원·`meeting_place` 문자열은 그대로 유지. |
| `lc_hosts` | 컬럼 추가 없음 | 기존 `display_name`, `bio`로 호스트 소개 표시. 본인 HOST가 두 공개 프로필 컬럼을 편집하도록 UPDATE 권한과 소유자 RLS 정책 추가. Auth 연결·승인·공개 여부 수정 권한은 추가하지 않음. |
| `lc_user_roles`, `lc_program_templates` | 변경 없음 | HOST/ADMIN 구조와 프로그램 연결 유지. |

`description`은 기존 짧은 소개로 계속 사용하므로 덮어쓰지 않는다. 상세 소개/이미지/장소 FK는 NULL, 목록은 빈 배열로 시작한다. 기존 체험과 회차에 가상 활동·주소·이미지를 자동 입력하는 데이터 이관은 없다.

목록은 각 30개까지, 항목은 1~500자다. 일정표는 순서가 체험 안에서 유일하고, 시작 경과 분은 0 이상, 소요 시간은 1분 이상이다. 단계 종료는 시작부터 1,440분 이내로 제한한다. 일정 시간의 증가·겹침과 각 회차 종료시간을 넘는지는 UI에서도 확인하며, 누락된 정보를 임의로 늘려 맞추지 않는다. 이번 DB 초안은 회차 전체와 일정표 사이의 시간 일치까지 강제하지 않는다.

대표 이미지는 HTTPS URL 또는 로컬이음 전용 정적 이미지 경로를 저장한다. 실제 이미지 업로드/Storage 버킷·업로드 정책은 이번 마이그레이션에 포함하지 않는다. 이미지가 없거나 실패하면 공통 자리표시자를 보여준다. 현재 모든 체험에 고정된 시장 사진을 표시하는 방식은 승인 후 `hero_image_url` 기반으로 바꾼다. 공방 체험에 시장 사진을 자동 대입하지 않는다.

### 연결 관계

```text
Auth 사용자 → lc_user_roles (HOST 또는 ADMIN)
            → lc_hosts (호스트 소개)
                 ├─ lc_experiences ← lc_program_templates
                 │    ├─ lc_experience_steps (공통 일정표 여러 줄)
                 │    ├─ venue_place_id → lc_places (실제 체험 장소)
                 │    └─ lc_sessions (운영 날짜·시간·참가비·인원)
                 │          └─ meeting_place_id → lc_places (회차 집결 장소)
                 └─ lc_places (이 호스트가 관리하는 장소 목록)
```

PK는 각 행의 고유 번호, FK는 다른 행을 가리키는 번호다. 예를 들어 체험 102의 `venue_place_id=10`이면 장소 10번에서 체험한다는 의미다. 회차의 `meeting_place_id=11`이면 그 회차는 별도 장소 11번에서 모인다. **이 번호는 관계 설명용이며 장소 10·11을 실제로 생성하는 SQL은 없다.**

하나의 장소를 동일 호스트의 여러 체험·회차에 연결할 수 있다. 장소를 수정하면 이를 참조하는 모든 체험에 반영되므로 HOST UI에서 연결된 체험/회차 수와 영향을 먼저 보여준다. 한 체험만 다르게 쓰려면 새 장소로 등록해 연결한다. 호스트가 다른 경우에는 현재 단계에서 서로의 장소를 편집하거나 연결하지 못한다. 여러 호스트가 공동 편집하는 장소 카탈로그는 별도 기능으로 두지 않는다.

FK는 `ON DELETE RESTRICT`이며 브라우저에는 장소 삭제·소유자 변경 권한을 주지 않는다. 체험 장소는 `(place_id, owner_host_id)` 복합 FK로, 회차 집결 장소는 DB 검사 트리거로 같은 호스트의 장소인지 검증한다.

## 4. 공개 조회·HOST 수정·원자적 저장

| 주체 | 체험·일정표 | 장소 | 쓰기 |
| --- | --- | --- | --- |
| 여행자/일반 로그인 | 기존 공개 조건(공개 체험 + 승인·공개 호스트 + 활성 프로그램)에 맞는 상세/일정만 조회. 회차는 기존 `RECRUITING` 공개 조건 유지. | 공개 체험의 실제 장소 또는 모집 중 공개 회차의 집결 장소로 연결되고, `is_confirmed=true`인 행만 조회. | 없음. |
| HOST | 승인된 본인 체험/일정 조회. | 승인된 본인 호스트 소유 장소 조회. 미확인 장소도 본인은 조회 가능. | 본인 체험의 허용 상세 컬럼, 일정표, 장소 입력·수정, 회차 장소 FK 수정. 본인 공개 프로필 이름·소개 편집. |
| ADMIN | 관리 범위 전체 조회. | 관리 범위 전체 조회. | 새 편집 권한 적용. 다른 호스트의 장소를 임의 연결하는 참조 무결성 검사는 ADMIN에도 적용. |

기존 읽기/회차 수정 RLS와 HOST/ADMIN 역할 부여 방식은 그대로 둔다. 기존 소유권 검사 함수를 재사용하고 새 테이블에 RLS를 활성화한다. 승인/공개 상태, 역할, 호스트 소유 FK 변경 권한은 추가하지 않는다. 신규 체험/회차 생성 권한도 이번 마이그레이션에서 열지 않는다. 이번 HOST 편집 UI의 대상은 등록된 체험의 공통 상세정보다.

`lc_private`는 Data API 노출 스키마에 추가하지 않는다. 정책 보조 함수는 빈 `search_path`와 명시적 실행 권한을 사용한다. 공개 장소 판단 함수는 RLS 재귀를 피하기 위한 조회 전용 `SECURITY DEFINER`이며 쓰기 기능이 없다.

상세정보와 일정표는 `lc_save_experience_details(experience_id, expected_updated_at, details, steps)` RPC로 한 번에 저장한다. 이 함수는 `SECURITY INVOKER`이므로 호출자의 RLS/컬럼 권한을 유지한다. 오래된 `updated_at`이면 저장을 거부하고, 잘못된 일정표가 있으면 상세 소개 변경까지 롤백한다. 명시 저장 시 해당 체험 일정표만 교체하므로 일정표 `step_id`는 바뀔 수 있다. 이 ID는 외부 참조용으로 사용하지 않는다. 직접 일정표를 수정해도 체험의 `updated_at`을 갱신한다.

**마이그레이션은 RPC를 정의만 하며 호출하지 않는다.** SQL 안의 일정표 DELETE/INSERT는 향후 HOST가 저장할 때 수행할 함수 본문이다. 지금 기존 일정이나 행을 지우는 이관 작업이 아니다. 장소 저장과 회차 저장은 별도 작업이며 성공/실패를 각각 알리고 저장 후 재조회한다. 여러 체험의 데이터를 한 번에 바꾸는 일괄 저장은 만들지 않는다.

HOST 계정에 ADMIN을 추가하지 않고 HOST 검증을 진행한다. 기존처럼 공개 행은 다른 HOST도 읽을 수 있지만 수정은 불가해야 한다. Dashboard의 postgres 편집 성공은 HOST RLS 검증으로 간주하지 않는다.

## 5. React 화면과 DB 연결 / 승인 후 구현

| 화면 영역 | 데이터 출처 / 동작 |
| --- | --- |
| 대표 이미지·체험 소개 | `lc_experiences.hero_image_*`, `title`, `description`, `detail_description`. HTML 문자열 실행 없이 텍스트로 표시. |
| 제공 사항·준비물·유의사항 | `inclusions`, `preparation_items`, `precautions`. 없는 값은 ‘호스트 확인 중’ 또는 미등록 표시. |
| 체험 일정표 | `lc_experience_steps`를 `step_order`순으로 조회. 선택 회차의 `starts_at + elapsed_min`으로 실제 시각 계산. `duration_min`으로 종료 시각 계산. 한국 시각으로 표시. |
| 운영 날짜·시간·회비·인원 | `lc_sessions.starts_at`, `ends_at`, `fee_amount`, `min_people`, `capacity`. 기존 회차 편집 흐름 유지. |
| 실제 체험 장소 | `lc_experiences.venue_place_id → lc_places`. |
| 집결 장소·지도·길찾기 | `lc_sessions.meeting_place_id → lc_places`. 미연결이면 기존 `meeting_place` 문자열만 표시. 실제 체험 장소를 집결 장소라고 추정하지 않음. |
| 호스트 소개 | `lc_hosts.display_name`, `bio`. Auth UID는 조회하지 않음. |
| HOST 상세 편집·미리보기 | 동일 데이터 모델과 `ExperienceDetailContent` 컴포넌트를 사용. 저장 전 미리보기와 실제 여행자 공개 페이지를 명확하게 구분. |

공통 React 단위는 `ExperienceDetailContent`(상세 내용), `ExperienceTimeline`(일정), `PlaceMap`(지도·마커), `PlacePicker`(주소 검색·선택·명시 확인)로 나눈다. 특정 체험 ID·주소·이미지·활동 내용을 컴포넌트에 고정하지 않는다. API 미설정/차단/네트워크 오류에는 안내와 실제 등록 주소를 표시하며 임의 기본 좌표로 장소 마커를 만들지 않는다. 좌표가 없으면 지도·좌표 기반 길찾기를 숨긴다.

지도 링크와 길찾기 링크는 같은 저장 좌표로 만든다. 길찾기는 카카오 공식 URL로 연결하며 GPS 권한 요청이나 별도 경로 계산 API를 추가하지 않는다. URL 허용 도메인과 HTTPS를 검증하고 외부 링크에는 `rel="noopener noreferrer"`를 사용한다.

예정 파일: `src/pages/local-eum/` 아래 상세 화면, HOST 상세 편집 화면, 전용 repository 및 components/maps 파일들. 기존 `SessionEdit.jsx`, `sessionRepository.js`는 공통 상세·장소를 조회하도록 필요한 부분만 확장한다.

새 URL을 열려면 **`src/App.jsx`에 로컬이음 전용 경로 2개를 추가하는 최소 변경**이 필요하다. 예정 URL은 `/local-eum/experiences/:experienceId`와 `/local-eum/host/experiences/:experienceId/edit`다. 이 공통 라우팅 파일 변경도 승인안에 포함하며, 승인 전에는 변경하지 않는다. 기존 경로·로그인·헤더는 그대로 둔다. 공통 남색·코랄·크림 팔레트를 사용하고 스타일은 로컬이음 범위로 제한한다.

## 6. 승인 범위와 실제 실행 순서

승인 요청 대상 SQL은 위 마이그레이션 파일 하나다. 주요 영향은 신규 테이블 2개, 기존 체험 컬럼 8개/회차 FK 1개, 보안·무결성 보조 함수/트리거, HOST 편집용 RPC, 제한된 컬럼 권한과 추가 RLS 정책이다. 기존 정책 삭제/교체, 기존 행 DELETE/UPDATE, 자동 시드, 역할 변경은 없다. `updated_at` 및 빈 배열 기본값은 기존 행에도 추가된다.

1. 사용자 승인 후 연결 도구/브라우저의 프로젝트 이름과 ID를 확인한다. 확인할 수 없으면 원격 실행을 중단한다.
2. 실제 컬럼·정책·기존 데이터 건수와 참가비를 읽어 로컬 전제와 비교한다. 이미 추가된 동명 객체나 예상 밖 권한이 있으면 덮어쓰지 않고 차이를 보고한다.
3. 승인 SQL을 한 트랜잭션으로 실행한다. 락을 5초 안에 얻지 못하면 실패하도록 하여 장시간 화면 요청을 막지 않는다. 실패하면 롤백하며 삭제/강제 초기화로 복구하지 않는다.
4. Dashboard → Table Editor → `public.lc_experiences`에서 새 컬럼과 기존 체험, `lc_sessions`에서 기존 4개 회차/참가비와 새 장소 FK를 확인한다.
5. 새 `lc_experience_steps`, `lc_places`는 처음에는 빈 상태인지 확인한다. Authentication Users와 `lc_user_roles` 계정/역할은 늘리지 않는다.
6. 필요한 지도/주소 API 설정 후 HOST 편집·여행자 공개 화면을 구현한다. 정확한 실제 성수동 공방명·공식 주소가 정해진 뒤에만 해당 실험 데이터를 등록한다. 제공사항·활동 일정도 호스트가 확인한 내용만 입력한다.
7. HOST 저장 → Table Editor 행 확인 → React 새로고침 재조회 → 비로그인 여행자 페이지의 같은 주소·좌표·마커 확인 순서로 검증한다. 저장 전 좌표와 지도 표시가 다르면 완료 처리하지 않는다.

이 설계 승인만으로 Git 커밋/Push, 유료 API 사용, 다른 Supabase 프로젝트 변경을 승인받은 것으로 보지 않는다.

## 7. 검증 계획과 현재 확인 결과

### 로컬 SQL 검증 완료 (원격/브라우저 검증 아님)

PGlite 0.5.10의 로컬 PostgreSQL 환경에서 기존 최초 스키마와 시드 사본을 실행하고, 가상 Auth/역할을 사용해 아래를 검사했다. 기존 스튜디오 문구 마이그레이션이 적용된 경우와 미적용된 경우를 모두 통과했다. 실제 계정·프로젝트 키·개인정보·`.env.local`은 사용하지 않았다. 원격 계정을 추가한 것이 아니다. 기존 두 체험을 모사하고, 장소명은 `LOCAL TEST` 자료만 사용했다. 실제 지도 위치의 정확성은 이 테스트로 검증하지 않았다.

- 새 마이그레이션 실행 성공, 기존 5개 테이블의 원래 컬럼/행 값 보존, 신규 두 테이블은 빈 상태.
- HOST 장소 생성/동일 호스트의 두 체험에서 재사용/프로필 소개 수정 성공.
- 상세+일정표 RPC 저장 성공. 오래된 버전 저장 거부. 일정표 중복 순서 오류 시 기존 일정과 소개 모두 보존.
- 좌표 한쪽만 입력, 출처 없는 좌표, 허용되지 않은 지도 URL, 빈 목록 항목 거부.
- 소유자/승인/역할 변경 및 장소 삭제 거부.
- 다른 HOST가 원 소유자 상세/일정/장소를 수정하지 못함. 다른 호스트 장소를 체험/회차에 연결하지 못함.
- 비로그인 사용자는 공개 일정표와 확인된 연결 장소만 조회. 쓰기/RPC/Auth UUID 조회 거부.
- 로그인했어도 HOST 역할을 제거한 가상 사용자는 기존 본인 행 수정 불가.
- ADMIN을 HOST와 분리한 가상 역할로 별도 검사. 기존 정책 보존 및 재실행 시 덮어쓰기 없이 중단 확인.

### 승인 후 실제 완료 조건

성수동 체험 102와 시장 체험 101에서 서로 다른 상세정보·일정표·대표 이미지를 읽고 저장하며, 빈 정보는 임의 내용 없이 표시해야 한다. 별도로 등록한 새 DRAFT 체험도 같은 UI/테이블 구조로 동작하는지 확인한다. 신규 체험은 이번 브라우저 권한으로 INSERT하지 않고 승인된 테스트 관리 절차로 만든다. 테스트 데이터 추가 전 대상/내용을 확인한다.

두 체험에 같은 장소를 연결해 재사용 여부를 확인하고, 집결 장소/실제 장소가 다른 회차도 확인한다. 날짜를 바꾸면 일정 내용은 유지되고 계산된 운영 시각만 바뀌어야 한다. 지도 좌표 누락·API 키 누락·검색 실패·권한 없음·저장 충돌을 검사한다. 현재 1개 실제 HOST 계정 원칙을 유지하므로 실제 다른 HOST 사용자 RLS 검증은 제한된다. 다른 소유자 검사는 로컬 가상 역할에서 검증한 결과와 실제 환경 검증을 구분해 보고한다.

## 8. 공식 근거 (2026-10-16 확인)

- [네이버 지역 검색 API: 인증·호출 한도·결과 범위](https://developers.naver.com/docs/serviceapi/search/local/local.md)
- [네이버 Maps 개요](https://guide.ncloud-docs.com/docs/maps-overview), [네이버 공식 요금 안내](https://m.ncloud.com/charge/price/ko)
- [카카오 지도 Web 시작·도메인·라이브러리·지도/길찾기 URL](https://apis.map.kakao.com/web/guide/)
- [카카오 지도 Web API 검색 인터페이스](https://apis.map.kakao.com/web/documentation/)
- [카카오 공식 쿼터·추가 요금](https://developers.kakao.com/docs/ko/getting-started/quota)
- [카카오 지도/Local 공식 FAQ: 검색 결과 저장 및 services 라이브러리 호출량](https://devtalk.kakao.com/t/faq-api/125610)
- [카카오 담당자 답변: 검색 응답 저장 제한·독립 공공데이터와 장소 ID 연결 범위](https://devtalk.kakao.com/t/local-api/151505)
- [공공 주소기반산업지원서비스](https://business.juso.go.kr/)
- [공식 답변: 좌표 API는 별도 신청, UTM-K(GRS80) 좌표 변환 필요](https://business.juso.go.kr/addrlink/qna/qnaDetail.do?bulletinRefSn=128137&currentPage=64&keyword=&noticeMgtSn=128137&noticeType=QNA&noticeTypeTmp=QNA&page=&searchType=)
