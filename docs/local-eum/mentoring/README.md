# 로컬이음 멘토링 자료

로컬이음은 지역 호스트와 여행자를 연결해 지역의 시장·골목·문화 경험을 탐색하고 신청하도록 돕는 서비스 모듈입니다. 이 자료는 기능 홍보보다 **현재 구현의 증거와 남은 검증 문제를 공유하고, 다음 MVP의 우선순위를 멘토와 결정하는 것**을 목적으로 합니다.

## 먼저 볼 자료

1. [발표 자료 (PPTX)](LOCAL_EUM_MENTORING.pptx)
2. [공유용 PDF](LOCAL_EUM_MENTORING.pdf)
3. [1페이지 요약](MENTORING_BRIEF.md)
4. [멘토링 질문](MENTORING_QUESTIONS.md)
5. [구현·검증 상태](IMPLEMENTATION_STATUS.md)
6. [코드·근거 링크](EVIDENCE_LINKS.md)

PPT는 12장, 15분 이내 설명용이며 편집 가능한 도형·텍스트와 현재 로컬 앱의 실제 캡처를 포함합니다. 캡처는 2026-10-20에 `/local-eum`, 공개 체험 상세, `/local-eum/host/profile?demo=1`을 로컬에서 렌더링해 만들었습니다. 화면의 체험 카드는 서비스 표시대로 AI 생성 이미지가 포함되므로 실제 장소 사진이나 운영 현장 기록으로 해석하지 않습니다.

## 현재 수준

- 체험 목록·상세·회차 선택·신청 UI와 HOST 운영센터가 공통 React 앱에 구현되어 있습니다.
- 로컬이음 데이터는 Supabase PostgreSQL을 사용하고, HOST·ADMIN 역할과 RLS를 적용합니다. 팀의 다른 기능은 Express·Oracle을 사용할 수 있으며 로컬이음 DB를 대체하지 않습니다.
- AI 기획 Agent는 Supabase Edge Function 안의 JSON 도구 어댑터로 네 개 서버 도구를 다룹니다. COPA 네이티브 Tool Calling 구현으로 표현하지 않습니다.
- 신청 접수는 구현되어 있지만 결제는 데모 안내이며 실제 결제·환불·정산은 없습니다.
- 실 사용자 5명 테스트와 피드백 반영 증거, 전체 ADMIN 실운영 검증, 외부 통합 배포는 별도 확인이 필요합니다.

## 실행·확인

팀 저장소 루트에서 환경변수를 설정한 뒤 `npm run dev`를 실행합니다. 주요 경로는 `/local-eum`, `/local-eum/experiences/113`, `/local-eum/host/profile?demo=1`입니다. 로컬 주소는 실행 중인 본인 PC에서만 열립니다. 공개 HOST 데모는 가상 데이터·읽기 전용 화면이며 실제 HOST 운영 기능과 다릅니다.

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, 선택적 `VITE_KAKAO_MAP_JAVASCRIPT_KEY`를 환경변수로 둡니다. Codyssey API 키는 Edge Function secret에만 둡니다. 실제 값, HOST 계정, 신청자 연락처는 이 문서에 포함하지 않습니다.

## 재생성

`build_mentoring_deck.mjs`는 `assets/`의 세 실제 UI 캡처와 `@oai/artifact-tool`을 사용합니다. 슬라이드 렌더는 presentation toolchain의 `render_slides.py`로 만들고, `build_pdf.py`로 12장을 묶어 PDF를 생성합니다. 글꼴과 런타임은 Codex 작업 환경의 Malgun Gothic 및 presentation toolchain에 맞춰져 있습니다.
