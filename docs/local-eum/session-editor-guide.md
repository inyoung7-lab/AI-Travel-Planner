# 로컬이음 운영 회차 수정 화면

PPT 12번을 바탕으로 한 운영 회차 편집 화면입니다. 여행, 한걸음 공통 헤더를 유지하며, 프로그램과 체험은 읽기 전용 정보로 표시하고 운영 회차의 날짜·시간·장소·정원·회비·모집 상태를 편집합니다.

## 실행 전 필요한 준비

현재 Supabase 프로젝트 ID는 `rhkaxmqdkztpbljkunxb`로 확인했습니다. 이 프로젝트의 SQL은 아직 실행하지 않았고, 테스트 HOST 계정도 아직 연결되지 않았습니다. 설정이 끝나기 전 로컬 화면에는 Supabase 설정 안내가 표시됩니다.

전체 순서와 Dashboard 클릭 위치는 [Supabase 구축 및 연결 안내](supabase-setup-guide.md)를 확인하세요.

1. Dashboard SQL Editor에서 `initial_schema.draft.sql`을 실행하고 `public`의 다섯 `lc_` 테이블을 확인합니다.
2. Authentication > Users에서 테스트 계정을 만들고, 그 계정 UUID를 사용해 `seed_demo.sql`을 실행합니다.
3. 저장소 루트의 `.env.example`을 복사해 `.env.local`을 만들고 프로젝트 URL 및 publishable key를 입력합니다. secret/service-role 키는 쓰지 않습니다.
4. 개발 서버를 재시작하고 아래 주소를 엽니다.

`http://127.0.0.1:5173/local-eum/host/sessions/1/edit`

## 화면 데이터 흐름

1. Supabase Auth 세션을 확인합니다. 로그아웃 상태에서는 HOST 로그인 폼을 표시합니다.
2. 로그인한 사용자에게 `lc_user_roles`의 HOST 행이 있는지 확인합니다.
3. `lc_sessions` → `lc_experiences` → `lc_hosts` 및 `lc_program_templates` 순서로 회차와 화면 문맥을 읽습니다. 각 요청은 Supabase RLS를 통과해야 합니다.
4. 변경 저장은 `session_id`와 읽은 시점의 `updated_at`이 일치하는 회차만 업데이트합니다. `experience_id` 같은 소유권 FK는 수정하지 않습니다.
5. 저장 성공 후 다시 조회해 DB 값을 폼과 미리보기에 반영합니다.

참가비는 `lc_sessions.fee_amount`에 원 단위 정수로 저장됩니다. 기존 `localStorage` 값은 더 이상 조회·저장에 사용하지 않습니다.

## 저장 검증

1. Table Editor > `public.lc_sessions`에서 `session_id=1`, `fee_amount=15000`을 확인합니다.
2. React 화면에서 회비를 `18000`으로 바꾸고 저장합니다.
3. Table Editor를 새로고침해 `fee_amount=18000`을 확인합니다.
4. React 화면도 새로고침해 18,000원이 다시 표시되는지 확인합니다.
5. 로그아웃 상태와 HOST 역할이 없는 테스트 로그인으로 회차 편집이 차단되는지 확인합니다.

실제 DB가 아직 생성되지 않았기 때문에 이 흐름의 원격 조회·저장은 아직 검증하지 않았습니다. 실행 후에는 SQL Editor의 읽기 전용 확인문을 사용하고, 브라우저 앱의 HOST 로그인으로 RLS까지 점검합니다.
