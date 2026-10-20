# 코드·근거 링크

저장소: [inyoung7-lab/AI-Travel-Planner](https://github.com/inyoung7-lab/AI-Travel-Planner)

## 핵심 근거

- [공통 Router 및 로컬이음 경로 — `src/App.jsx`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/App.jsx)
- [공통 Header의 로컬 체험 메뉴 — `src/components/header.jsx`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/components/header.jsx)
- [현재 로컬이음 README](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/docs/local-eum/README.md)
- [체험 조회 — `experienceRepository.js`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/pages/local-eum/experienceRepository.js)
- [신청 RPC payload — `applicationRepository.js`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/pages/local-eum/applicationRepository.js)
- [실제 화면의 체험 상세 — `ExperienceDetail.jsx`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/pages/local-eum/ExperienceDetail.jsx)
- [읽기 전용 호스트 데모 — `HostOperationsDemo.jsx`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/pages/local-eum/components/HostOperationsDemo.jsx)
- [AI 도구·검증 orchestration — `agent-core.mjs`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/supabase/functions/local-eum-agent/agent-core.mjs)
- [Codyssey Chat Completions JSON adapter — `codyssey-client.mjs`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/supabase/functions/local-eum-agent/codyssey-client.mjs)
- [Edge Function 인증·데이터 접근 — `index.ts`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/supabase/functions/local-eum-agent/index.ts)
- [Kakao Maps 주소 기반 조회 — `PlaceMap.jsx`](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/src/pages/local-eum/maps/PlaceMap.jsx)

## SQL 적용·운영 기록

- [HOST 회차 lifecycle·RLS 적용 기록](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/docs/local-eum/migrations/20261020_language_friends_and_host_lifecycle.applied.md)
- [서울·부산·창원 공개 적용 및 데이터 확인](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/docs/local-eum/migrations/20261020_language_friends_publish.applied.md)
- [호스트 운영센터 안내](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/docs/local-eum/host-operations-guide.md)
- [AI 실행·배포·검증 안내](https://github.com/inyoung7-lab/AI-Travel-Planner/blob/main/docs/local-eum/ai-agent-runbook.md)

## 협업·캡처

- [PR #13 — 언어·친구 공개 체험 반영](https://github.com/inyoung7-lab/AI-Travel-Planner/pull/13)
- 이 자료의 `assets/catalog.png`, `assets/experience-detail.png`, `assets/host-demo.png`는 2026-10-20 로컬 앱에서 실제 렌더링해 캡처했습니다. 로컬 캡처는 공개 배포 상태를 증명하지 않습니다.

수치·RLS·운영 상태의 해석은 [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)를 우선합니다. 테스트 결과는 코드 단위 테스트와 실사용자 검증을 분리해 읽어 주세요.
