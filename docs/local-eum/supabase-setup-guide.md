# 로컬이음 Supabase 구축 및 연결 안내

이 안내는 승인된 개발 프로젝트 `local-eum-dev`만 대상으로 합니다. 확인된 프로젝트 ID는 `rhkaxmqdkztpbljkunxb`입니다. 대시보드에서 프로젝트명과 URL의 ID가 모두 일치할 때만 진행하세요.

## 팀원이 병합된 화면 실행하기

PR이 `main`에 병합되어도 다른 사람의 개인 브랜치가 자동으로 바뀌지는 않습니다. 작업을 보존하면서 각자 최신 `main`을 합칩니다.

```powershell
git status --short --branch
# 변경이 있으면 현재 브랜치에 커밋하거나, 구분되는 이름으로 임시 보관합니다.
git fetch origin
git switch <내-작업-브랜치>
git merge origin/main
npm install
```

충돌이 있을 때는 파일별로 내 작업과 `origin/main` 양쪽을 확인해 해결하고 `npm run build`로 확인합니다. 작업 트리를 초기화하거나 강제 push 하지 않습니다. 팀원의 브랜치와 Express 서버는 로컬이음 설정을 위해 수정할 필요가 없습니다.

저장소 루트의 `.env.example`을 참고해 `.env.local`을 만들고 다음 두 값을 넣습니다.

```dotenv
VITE_SUPABASE_URL=https://rhkaxmqdkztpbljkunxb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=여기에_대시보드의_publishable_key
```

URL과 publishable key는 Supabase Dashboard의 프로젝트 **Connect** 또는 **Project Settings → API Keys**에서 확인합니다. 브라우저 키는 publishable key만 사용합니다. `service_role`이나 `sb_secret_` 키는 브라우저에 넣지 않습니다. `.env.local`은 개인 개발환경 파일이므로 Git에 올리지 않습니다. `.env.local`을 새로 만들 때 기존 파일이 있으면 덮어쓰지 마세요.

### 화면 경로 확인

`npm run dev` 실행 후 다음 주소를 확인합니다.

- 체험 목록: `http://127.0.0.1:5173/local-eum`
- 로그인 없는 공개 HOST 데모: `http://127.0.0.1:5173/local-eum/host/profile?demo=1`

상단 공통 Header의 **로컬 체험**을 눌러 `/local-eum`으로 이동하는지도 확인합니다. 현재 경로는 `src/App.jsx`의 공통 BrowserRouter에 등록되어 있습니다. 이 로컬 주소는 다른 사람 PC에서 열 수 없습니다. 팀의 Vercel 프런트엔드에서는 프로젝트 환경변수에 동일한 Supabase URL과 publishable key를 등록하고 새 배포를 해야 합니다. 이 단계는 프런트엔드 실행 설정이며 원격 SQL을 적용하지 않습니다.

AI Agent를 팀 배포 도메인에서 호출하려면 그 도메인이 Edge Function의 허용 Origin 목록에 포함되어야 합니다. 현재 AI 연결 오류가 나면 최종 웹 주소와 `docs/local-eum/ai-agent-runbook.md`의 CORS 항목을 대조합니다. 공개 체험 목록과 호스트 데모가 열리는 것만으로 AI 요청까지 검증된 것은 아닙니다.

일반 체험 목록은 Supabase에서 `PUBLISHED` 행만 읽습니다. 세 언어·친구 정적 fixture는 `?demo=language-friends`가 명시된 체험 목록에서만 보이며, 각 fixture 상세 주소에도 같은 표식을 유지합니다. 숫자 ID의 실제 DRAFT 레코드는 일반 공개 상세에서 열리지 않습니다.

공유 개발 DB에 테이블·정책·시드가 이미 적용돼 있으면 앱 실행을 위해 `initial_schema.draft.sql`이나 시드 파일을 다시 실행할 필요가 없습니다. `.applied.sql`은 적용 기록이고 `.review.sql`/`.draft.sql`은 미적용 문서일 수 있으니, 적용 상태를 확인하지 않고 SQL Editor에서 실행하지 마세요.

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
