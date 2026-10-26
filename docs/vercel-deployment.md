# Vercel 배포 및 검증

2026-10-26 기준. 배포 대상은 Vite 정적 화면과 Express API이며, Supabase Auth·DB·Edge Function은 기존 Supabase에서 운영합니다. Vercel 로그인 상태와 별개로 이 프로젝트의 실제 공개 URL과 운영 검증은 아직 확정하지 않았습니다.

## 실행 구조

- `npm run build`로 `dist`를 생성합니다.
- `api/index.js`가 `server/app.js`의 Express 앱을 내보냅니다. 로컬 `server/server.js`만 포트를 엽니다.
- `/api/*`는 함수로, 나머지 경로는 SPA의 `index.html`로 전달합니다. `/mytrip` 같은 직접 링크의 새로고침도 지원합니다.
- 함수 최대 실행시간은 300초로 지정했습니다. 실제 사용 가능 시간과 과금은 Vercel 계정·실행 환경 설정에 따라 확인합니다.
- `.vercelignore`는 서버 코드를 포함하고 자료·원본·로컬 비밀 파일·수집 데이터 폴더를 제외합니다.

## 프로젝트 설정

1. GitHub의 `inyoung7-lab/AI-Travel-Planner`를 Import하고 제출 브랜치 `chlee`를 선택합니다. 기본 Production Branch도 실제 배포할 브랜치와 일치시킵니다.
2. Framework Preset은 Vite, Root Directory는 저장소 루트, Build Command는 `npm run build`, Output Directory는 `dist`입니다.
3. 아래 변수의 기존 값을 Vercel 환경 설정에 등록합니다. Preview·Production 범위를 구분하고 환경 변경 후 다시 배포합니다.

| 변수 | 범위 / 의미 |
| --- | --- |
| VITE_SUPABASE_URL | 빌드 시 공개 Supabase 주소 |
| VITE_SUPABASE_PUBLISHABLE_KEY | 빌드 시 공개 클라이언트 키 |
| SUPABASE_SECRET_KEY | 서버 전용 관리 키. VITE_ 접두사 금지 |
| CODYSSEY_OPENAI_KEY | 서버 전용 AI 키 |
| TOUR_API_SERVICE_KEY | 서버 전용 관광공사 키 |
| TRAVEL_BROWSER_COOKIE_SECRET | 서버 전용 고정 무작위 비밀값, UTF-8 32바이트 이상 |
| TRAVEL_SEARCH_DATA_SOURCE | database |
| TRAVEL_SEARCH_HISTORY_STORE | supabase |
| WEB_ORIGIN | 실제 공개 서비스의 https origin |
| VITE_KAKAO_MAP_JAVASCRIPT_KEY | 필요할 때만 지도 공개 키 |

`SUPABASE_URL`과 `SUPABASE_PUBLISHABLE_KEY`는 서버에서 VITE 설정을 공통으로 사용할 수 있습니다. 선택적으로 별도 등록할 수 있습니다. 모델 주소·모델명 등 추가 설정은 `.env.example`과 실제 환경을 비교합니다. 키를 문서·브라우저 코드·스크린샷·로그에 복사하지 않습니다.

4. Supabase Auth의 Site URL·허용 Redirect URL을 실제 주소로 설정합니다. 호스트 Agent의 허용 origin과 지도 제공자의 허용 도메인도 확인합니다.
5. 호스트 Agent는 Supabase Edge Function의 별도 배포·환경 설정을 유지합니다. Vercel에 Express를 올리는 것으로 Edge Function 배포가 완료되지는 않습니다.

## 배포 후 수용 검사

| 검사 | 기대 결과 |
| --- | --- |
| GET /api/health | 200 JSON, status=ok |
| 알 수 없는 /api 경로 | 404 JSON, HTML 응답 아님 |
| /places, /mytrip 직접 접속·새로고침 | SPA 렌더링 |
| 비로그인 나의 여행 API | 401 |
| 가입·로그인·로그아웃 | 계정 상태와 오류 한글 표시 |
| 장소 검색·찜·일정 저장 후 재접속 | 기존 Supabase 데이터와 연결 |
| AI 생성·수동 편집 | 실제 후보만 표시, 소유권·날짜·충돌 검사 |
| 로컬 체험·호스트 Agent | 공개/비공개 및 역할별 동작 |

## 수집 작업 운영

전체 관광정보 동기화는 페이지를 반복 처리하는 장시간 작업입니다. 300초 API 함수 안에서 전체 수집을 시작하지 않습니다. 현재 `npm run sync:tourism`을 실행하는 작업 환경을 유지하고, 운영 시에는 별도 스케줄러/작업 실행 환경에서 커서·실행 잠금·한도 오류 종료 규칙을 사용합니다. Vercel 메모리 캐시는 인스턴스 간 공유되지 않으며 영속 데이터는 Supabase에 둡니다.

## 근거

- [Vercel의 Vite 구성](https://vercel.com/docs/frameworks/frontend/vite)
- [Express 앱 내보내기](https://vercel.com/docs/frameworks/backend/express)
- [함수 실행시간](https://vercel.com/docs/functions/configuring-functions/duration)
- [프로젝트 설정](https://vercel.com/docs/project-configuration/vercel-json)
