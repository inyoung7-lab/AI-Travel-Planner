# 로컬이음 Supabase 구축 및 연결 안내

이 안내는 승인된 개발 프로젝트 `local-eum-dev`만 대상으로 합니다. 확인된 프로젝트 ID는 `rhkaxmqdkztpbljkunxb`입니다. 대시보드에서 프로젝트명과 URL의 ID가 모두 일치할 때만 진행하세요.

## 1. 스키마 생성

현재 Codex 환경에는 Supabase DB 실행용 연결 도구가 없습니다. 따라서 사용자가 Dashboard의 SQL Editor에서 실행해야 합니다.

1. [local-eum-dev SQL Editor](https://supabase.com/dashboard/project/rhkaxmqdkztpbljkunxb/sql)에서 상단 프로젝트명과 URL의 ID를 확인합니다.
2. SQL Editor 왼쪽의 **New query**를 눌러 새 탭을 만듭니다. 기존 `Untitled query`에는 미저장 확인 쿼리가 있으므로 덮어쓰지 않습니다.
3. 저장소의 `docs/local-eum/initial_schema.draft.sql` 전체를 새 쿼리에 붙여 넣고 **Run**을 누릅니다.
4. 성공 결과를 확인한 뒤 Dashboard → **Table Editor** → `public`에서 아래 테이블을 확인합니다.
   - `lc_user_roles`
   - `lc_hosts`
   - `lc_program_templates`
   - `lc_experiences`
   - `lc_sessions`
5. SQL Editor에서 `lc_private` 스키마를 노출 스키마 목록에 추가하지 않습니다.

이 SQL은 다섯 테이블과 `lc_private`, 인덱스, 수정 시각 트리거, 권한 및 RLS만 추가합니다. 기존 객체를 지우거나 초기화하지 않습니다. 같은 객체가 이미 존재하면 실행이 실패하며 트랜잭션 전체가 롤백됩니다. 실패했다면 다시 실행하지 말고 오류 내용을 공유해 주세요.

## 2. 테스트 HOST 계정과 데이터

1. Dashboard → **Authentication** → **Users** → **Add user**에서 테스트 전용 사용자를 만듭니다. 테스트 계정만 사용하고 비밀번호는 로컬에서 직접 관리합니다.
2. 사용자의 UUID를 확인합니다. UUID는 비밀번호나 API 키가 아니지만 채팅에는 붙여넣지 않아도 됩니다.
3. `docs/local-eum/seed_demo.sql`을 열고 `__TEST_HOST_AUTH_USER_UUID__`만 해당 UUID로 바꿉니다. 새 SQL Editor 쿼리에서 한 번만 실행합니다.
4. 실행 후 `docs/local-eum/verify_demo.sql`의 첫 쿼리를 실행해 `session_id=1`, `fee_amount=15000`, 체험·호스트 연결을 확인합니다. 나머지 쿼리로 다섯 테이블의 RLS 활성 상태와 정책도 확인합니다.

시드 SQL은 `HOST` 역할과 승인된 호스트 `500`, 프로그램 `101`, 체험 `101`, 회차 `1`을 삽입합니다. 동일 ID가 있으면 덮어쓰지 않고 전체를 중단합니다. 테스트 사용자가 Auth에 생성되지 않았으면 시드 작업도 실패합니다.

## 3. 로컬 React 환경 설정

1. 저장소 루트의 `.env.example`을 복사해 `.env.local`을 만듭니다.
2. `VITE_SUPABASE_URL`에는 승인 프로젝트 URL을 사용합니다.
3. Dashboard → **Project Settings** → **API Keys** 또는 **Connect**에서 **publishable key**를 복사해 `VITE_SUPABASE_PUBLISHABLE_KEY`에 넣습니다.
4. secret 또는 `service_role` 키는 브라우저에 넣지 않습니다. `.env.local`은 Git ignore 대상이며, 키를 채팅에 보내지 않습니다.
5. Vite 개발 서버를 재시작하고 `http://127.0.0.1:5173/local-eum/host/sessions/1/edit`에 접속합니다.
6. 테스트 HOST로 로그인합니다. 화면은 HOST 역할과 승인 상태를 검사한 다음 `lc_sessions`에서 회차를 조회합니다.

## 4. 저장 확인

1. Table Editor → `public.lc_sessions`에서 `session_id=1` 행의 `fee_amount`가 `15000`인지 확인합니다.
2. React 화면에서 참가비를 `18000`으로 바꾸고 저장합니다.
3. 화면의 “Supabase에 저장한 뒤 다시 조회했습니다” 표시와 금액을 확인합니다.
4. Table Editor를 새로고침하고 같은 행의 `fee_amount=18000`을 확인합니다.
5. React 페이지도 새로고침해 `18000`이 다시 표시되는지 확인합니다.
6. 로그아웃 상태에서는 로그인 화면이 나와야 합니다. HOST 역할이 없는 로그인 계정은 회차를 수정할 수 없어야 합니다.

Table Editor는 대시보드 권한으로 행을 보여줄 수 있으므로, 행이 보인다는 사실만으로 HOST RLS 검증을 대신하지 않습니다. 실제 저장 요청은 React의 테스트 HOST 로그인 상태에서 확인합니다.
