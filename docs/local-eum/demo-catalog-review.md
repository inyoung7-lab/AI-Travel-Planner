# 시연 체험 10개: 구현 결과와 DB 적용 승인안

2026-10-16 / 브랜치 `hykang` / **원격 DB 적용 승인됨 · 실행 대기**

## 실제 수행한 범위

- 기존 Supabase 공개 데이터 읽기: 체험 101/102, 회차 1~4. 회차 1은 15,000원, 2는 18,000원. 이 작업에서 원격 쓰기 요청은 하지 않았다.
- 공식 시설/지자체/관광기관 출처와 사용자 제공 시연 일정을 `demo-catalog.json`에 정리했다. 상호·주소의 출처 URL을 각 항목에 포함했다. 일정/금액/정원/준비물은 시연 설정임을 명시했다.
- `/local-eum` 목록과 `/local-eum/experiences/:experienceId` 상세를 공통 React 구조로 구현했다. 목록·상세는 별도 anon 클라이언트로 읽으므로 같은 브라우저의 HOST 세션이 공개 조회 검사를 가리지 않는다.
- 서울/부산/창원 필터, 체험명 검색, 회차 선택, 공통 4단계 일정표, 장소/주소/지도 상태, 제공사항/준비물/유의사항, 호스트 소개, DB 재조회 흐름을 구현했다.
- 기존 HOST 회차 편집의 저장 경로를 유지했다. 여행자 목록/선택 회차 상세 링크와 DB 대표 이미지 연동을 추가했다.
- `src/App.jsx`에는 로컬이음 경로와 import만 추가했다. 기존 `/`, 공통 헤더, 로그인, Oracle/팀 서버 파일은 수정하지 않았다.

## 실행 승인 요청 파일

**`docs/local-eum/apply_demo_catalog.review.sql` 하나만 검토·실행 대상으로 삼는다.** 세 부분을 하나의 트랜잭션으로 묶은 파일이다. 기존 `initial_schema.draft.sql`, `seed_demo.sql`을 다시 실행하지 않는다.

1. `migrations/20261016_experience_details_places.draft.sql`: 공통 상세 컬럼·일정표·장소·FK·RLS·저장 RPC.
2. `migrations/20261016_demo_catalog.draft.sql`: `is_demo`, `demo_code`, `seed_code` 및 유일 제약.
3. `seed_demo_catalog.draft.sql`: 시연 체험 10개, 40단계, 장소 11개, 별도 시연 회차 10개.

통합 SQL은 `node scripts/local-eum/prepare-demo-seed.mjs`로 원장에서 재생성한다. 생성 명령은 DB에 연결하지 않는다.

### 적용 영향

| 대상 | 예상 결과 |
| --- | --- |
| 기존 HOST/역할 | 그대로 사용. 새 Auth 계정 생성·ADMIN 추가 없음. |
| 프로그램 | 기존 101/102 유지. 지역문화 시연 원형 1개 추가. |
| 체험 | 기존 101/102 재사용 + 신규 8개 = 시연 체험 10개. |
| 체험 101 | 최초 적용 때 제목을 `전통시장 함께 걷기`에서 `광장시장 음식문화 산책`으로 보강. 기존 짧은 소개 유지. |
| 체험 102 | `성수동 공방 체험` 제목/기존 짧은 소개 유지. 상세 소개·준비물·장소 등 새 속성 보강. |
| 기존 회차 1~4 | 금액·정원·시간·장소·수정 시각까지 기존 값 보존. 연결 체험의 공통 제목/소개 보강은 해당 체험 전체에 표시됨. |
| 신규 회차 | 요청한 10개 날짜/금액/정원으로 별도 생성. 기존 4개를 합쳐 총 14개. 같은 시각의 기존 성수동 회차도 삭제하지 않음. |
| 새 장소 | 공통 장소 11개. 경화역은 집결 주차장 665와 공원 주소 649를 구분하므로 장소가 하나 더 필요. |
| 위경도 | API로 확인한 자료가 아직 없어 모두 NULL. 임의 좌표·기본 위치 마커 없음. |
| 시연 표식 | 체험의 `is_demo=true`, 고유 `DEMO-01~10`. 새 회차/장소/프로그램의 고유 `seed_code`. HOST가 표식을 제거하는 컬럼 권한은 없음. |

최초 보강 대상의 제목/상세가 예상과 다르면 SQL은 중단하고 롤백한다. 기존 상세가 입력되어 있으면 덮어쓰지 않는다. 재실행 시 같은 DEMO는 건너뛰므로 중복 등록과 HOST 수정값 덮어쓰기를 막는다. 자동 번호가 수동 ID보다 뒤처졌을 때는 번호를 앞으로만 맞추며 기존 PK를 바꾸지 않는다. 실패 후 번호가 건너뛰는 것은 가능하다.

## 승인 후 Supabase에서 확인할 순서

1. Dashboard 상단 `local-eum-dev`, URL 프로젝트 ID `rhkaxmqdkztpbljkunxb`를 확인한다. `main PRODUCTION` 브랜치 표시는 다른 프로젝트라는 의미로 취급하지 않는다.
2. SQL Editor의 새 빈 쿼리에 통합 SQL 파일 **전체를 한 번만** 붙여 넣는다. 기존 오류 쿼리에 문장을 덧붙이지 않는다.
3. 실행 결과의 마지막 조회에서 DEMO-01~10과 신규 회차 10개를 확인한다.
4. Table Editor → `lc_experiences`: 10개 DEMO와 `is_demo`, `demo_code`, 상세/장소 FK를 본다.
5. `lc_experience_steps`: 체험별 4줄, 총 40줄을 확인한다. `elapsed_min`은 날짜가 아니라 시작 기준 경과 분이다.
6. `lc_places`: 장소명/주소 11개, `latitude/longitude=NULL`을 확인한다. 주소 근거 URL은 `source_reference`에 있다.
7. `lc_sessions`: 총 14개와 기존 ID 1=15,000원, 2=18,000원 및 기존 회차 시간을 확인한다.
8. React `/local-eum`을 새로고침해 10개 체험을 확인한다. Table Editor와 나란히 놓고 코드/제목/회차 ID를 비교한다.
9. HOST 화면에서 **시드된 새 회차 하나**를 골라 금액을 바꾼다. 같은 회차 ID를 상세 URL `?session=...`로 열고 저장·재조회를 비교한다. 목록은 가장 가까운 공개 회차 금액을 표시하므로 다른 날짜 회차 변경은 목록의 대표 금액을 바꾸지 않을 수 있다. 시작 시각이 같은 기존/신규 시연 회차는 신규 시연 회차를 우선 표시한다.

사용자가 원격 적용을 승인했고 Dashboard의 프로젝트 이름과 ID도 일치했다. 다만 SQL Editor로 파일을 옮기는 과정에서 입력 내용이 원본과 달라진 것을 실행 전에 발견해 편집기를 비웠다. Run을 누르지 않았으며 원격 DB는 변경되지 않았다. 읽기 전용 REST 확인에서 `lc_places`, `lc_experience_steps`가 아직 없음을 확인했다(각각 PostgREST `PGRST205`). 승인 파일은 그대로 보존되어 있다. 로컬 SQL 검증은 통과했으며, 원격 적용 뒤에는 읽기 전용 조회로 생성 결과를 다시 확인한다.

## 지도 연결의 남은 조건

지도 키의 존재 위치는 `C:\ia-codyssey\assignments\A1-2\.env`로 확인했다. 변수 이름은 `KAKAO_REST_API_KEY`이며, 값은 출력하거나 저장소에 복사하지 않았다. 이 REST 키는 브라우저 지도 SDK 키가 아니므로 React 환경변수로 공개하지 않는다. 실제 지도 마커 검증은 아직 수행하지 못했다.

- Kakao Developers → 앱 → 카카오맵 사용 활성화. 브라우저 지도 표시에는 별도의 JavaScript 키가 필요하다.
- JavaScript 키의 허용 도메인에 `http://127.0.0.1:5173`, `http://localhost:5173`과 실제 배포 HTTPS 주소를 등록.
- 로컬 `.env.local`에 `VITE_KAKAO_MAP_JAVASCRIPT_KEY` 추가 후 개발 서버 재시작. JavaScript 키는 브라우저용 공개 키이며 허용 도메인으로 제한한다. REST/Admin/Secret 키는 넣지 않는다. 현재 확인한 `KAKAO_REST_API_KEY`는 서버 측 프록시에서만 사용한다.
- 영구 저장할 좌표는 공공 주소/좌표 API의 이용 조건 확인과 발급 뒤 확보한다. 카카오 Local 검색·지오코딩 응답을 그대로 DB에 저장하는 방식은 사용하지 않는다. 공공 API 프록시와 좌표 저장 검증은 키/서버 설정을 갖춘 후 이어서 구현한다.
- API 검색 실패 또는 출처/확인 상태가 없으면 좌표를 채우지 않는다. 지도·길찾기는 동일한 확인 좌표를 사용한다. 현재는 실제 주소의 외부 지도 검색 링크만 제공한다.

## 검증 결과

로컬 PostgreSQL(PGlite)에서 통합 SQL 실행, 재실행, 기존 4개 회차 전체 보존, 총 행 수, 시드 이후 금액 수정 보존, 익명 공개 조회, HOST 시연 표식 변경 차단을 검사했다. 기존 RLS 검증도 별도 로컬 검사에서 통과했다. 실제 프로젝트의 RLS·저장 성공을 이 결과로 대체하지 않는다.

Playwright 격리 브라우저에서 SQL로 생성한 로컬 검증 데이터를 응답하도록 구성해 다음을 확인했다. 원격 DB에 이 10개가 이미 등록된 것처럼 표시하는 production 대체 데이터 기능은 없다.

- 카드 10개, 서울 5/부산 2/창원 3, 검색/검색 결과 없음.
- 상세 10개 경로의 제목·각 일정 4단계·시연 표식 일치.
- 확인 좌표가 없을 때 마커 없음.
- 데이터 소스 참가비 변경 뒤 상세와 목록 재조회 반영.
- 390px 모바일 목록 가로 넘침 없음, 브라우저 런타임 오류 없음.
- 실제 읽기 전용 연결에서 DB 준비 안내, 기존 HOST 로그인 화면, 기존 팀 `/` 화면 유지.

스크린샷은 `local-eum-catalog-check` 시각화 폴더에 있으며 **로컬 SQL 검증 자료 / 원격 적용 전** 워터마크를 포함한다. 실제 지도 API의 검색 정확성·마커 위치·원격 HOST 저장·GitHub 업로드는 완료 항목에 포함하지 않는다.

검증 명령:

```powershell
node scripts/local-eum/prepare-demo-seed.mjs
node --test src/pages/local-eum/experiencePresentation.test.js
node scripts/local-eum/check-demo-sql.mjs <PGlite의 절대 dist/index.js 경로> --combined
node scripts/local-eum/catalog-browser.check.mjs <Playwright의 절대 index.mjs 경로> <로컬 fixture JSON 경로> <캡처 폴더>
npm run build
npm run lint
```

검사 도구는 임시 폴더에 설치했으며 이 작업으로 프로젝트 package.json/package-lock.json에 테스트용 의존성을 추가하지 않았다. 이전 Supabase SDK 변경은 기존 작업 상태 그대로다.

## GitHub 상태

사용자는 이번 지시에서 `hykang` 커밋·Push를 허용했다. 실제 DB·지도 연결 검증과 비밀정보 점검 후 수행할 예정이다. 현재는 원격 DB 실행 승인이 필요하므로 완료 커밋/Push를 하지 않았다. main/develop 병합도 하지 않았다.
