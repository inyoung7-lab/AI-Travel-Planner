# LOCAL EUM AI Experience Agent — 실행·배포 준비

## 구현 경계

호스트 운영센터(`/local-eum/host/profile`)의 **AI 기획·진단** 메뉴와 기존 회차 편집 화면의 **AI 체험 기획·진단**은 `local-eum-agent` Supabase Edge Function을 호출한다. 서버는 로그인 JWT를 검증하고 `lc_user_roles`의 HOST 역할, `lc_my_host_id()`의 본인 프로필, 승인 상태, 체험 소유 관계를 확인한다. 이 함수는 기존 `lc_*` 테이블을 읽기만 한다. 분석·운영안은 브라우저의 임시 상태이며, HOST가 검토 체크 후 체험 소개 편집란에 복사하고 기존 저장 버튼을 눌러야 DB에 반영된다.

모델 경로는 Codyssey COPA의 OpenAI 호환 Chat Completions API(`https://copa.codyssey.kr/v1/chat/completions`)를 사용한다. 기본 모델은 `gpt-5.4-mini`다. 실제 연결에서 기본 채팅은 성공했으나 네이티브 도구 호출 요청은 `unsupported_feature`로 거절되었다. 배포된 어댑터는 일반 채팅으로 JSON 도구 인자 4개와 최종 보고서를 순차 요청한다. 실제 도구 실행·인자 검증·출처 검증은 Edge Function이 담당한다. 허용 도구는 `search_existing_experiences`, `retrieve_local_knowledge`, `evaluate_experience_value`, `estimate_program_cost` 네 개뿐이다. 관련 공개 체험은 Supabase RLS가 적용된 사용자 JWT로 조회한다. RAG 문서는 `supabase/functions/local-eum-agent/knowledge.mjs`에 있으며 출처 URL과 확인일을 포함한다. 검색된 사실은 모델 입력에 들어가지만 명령으로 취급하지 않는다. 점수와 금액 계산은 서버가 실행하고 결과의 출처 ID는 실제 검색 결과에 한정한다.

`supabase/config.toml`은 함수의 JWT 확인을 켠다. 함수 내부에서도 `auth.getUser`와 HOST 소유권을 확인한다. API 키는 브라우저, `VITE_` 변수, DB, Git에 넣지 않는다. 이메일·휴대전화 형식은 모델 입력에서 제거하고, 로그에는 도구명·소요시간·결과 수·오류 코드만 남긴다. 요청당 모델 호출 5회, 텍스트 길이 제한, 도구 호출 제한, Edge 인스턴스별 HOST 계정당 1시간 12회 제한이 있다. 인스턴스별 제한은 전역 할당량이 아니므로 실제 공개 운영 전에는 승인된 영속 저장소 기반 전역 쿼터나 제공자 예산 경보를 추가해야 한다. RAG 자료는 현재 등록된 서울·부산·창원의 12개 체험 지역을 포괄하지만 장소·주소 중심이며 실제 제휴·영업·원가 근거는 포함하지 않는다.

## 로컬 검증

```sh
node --test supabase/functions/local-eum-agent/*.test.mjs
deno check supabase/functions/local-eum-agent/index.ts
deno lint supabase/functions/local-eum-agent
npm run build
npm run lint
git diff --check
```

Node 테스트는 **모의 모델**을 사용한다. 실제 Codyssey 응답, 배포된 Edge Function, 실제 HOST JWT, 브라우저 화면의 종단 간 동작을 증명하지 않는다. 시나리오 A(단순 관광 방문), B(만남·언어교류), C(바다밥상·시식), D(비밀지도·추리)를 모의 도구 호출로 확인한다. 각 시나리오의 실제 모델 품질과 한국어·영어·일본어 표현은 별도의 실제 호출 검수가 필요하다.

## 배포 전 승인·설정

사용자가 `CODYSSEY_API_KEY`를 대상 프로젝트 `rhkaxmqdkztpbljkunxb`의 Edge Secrets에 등록했다. `local-eum-agent` 함수도 Dashboard에서 배포되어 CORS 사전 요청 204를 확인했다. 일반 채팅 어댑터와 출력 토큰 한도 전달 수정을 버전 10으로 배포했다. 실제 HOST 로그인 상태에서 네 도구 실행과 최종 보고서 표시를 확인했으며, 운영센터 통합 화면에서도 실제 분석 결과를 확인했다. 전체 언어·시나리오·교차 HOST 권한 검수는 아래 별도 검증 항목으로 유지한다. 선택적으로 `CODYSSEY_MODEL`을 설정할 수 있으며 로컬 기본값은 `gpt-5.4-mini`다. 공개 프런트엔드의 정확한 origin 목록은 `LOCAL_EUM_ALLOWED_ORIGINS`에 등록한다. 비밀값은 채팅, 문서, CLI 명령 기록, `.env.local`, PR에 쓰지 않는다. 번역 데이터베이스 변경은 Agent와 독립적이며, `translations` 스키마와 영어·일본어 초안은 2026-10-18에 별도 승인 후 적용했다. 적용 내역은 `local-eum-language-rollout.md`를 참고한다.

배포 후 브라우저에서 승인된 HOST #500, #501 계정으로 각각 로그인해 본인 체험을 분석한다. 다른 HOST의 체험 ID를 직접 요청했을 때 403인지 확인한다. 비로그인 401, 잘못된 origin 403, 제한 초과 429, 키 누락 503, 모델 장애 502를 확인한다. 함수 로그에 네 도구의 호출 흔적이 있고 개인정보·API 키·프롬프트가 없는지 검토한다. 네 시나리오에 대해 실제 모델의 5가지 평가, 2개 이상 다른 대안, 출처 링크, 미확인 원가·제휴·위생 표시, 선택안 운영안, HOST의 명시적 복사·기존 저장 흐름을 확인한다. ko/en/ja 전환 시 결과를 다시 생성하고 고유명사·금액·날짜·URL·체험 ID가 보존되는지 확인한다.

## 공개 URL 및 5명 사용자 테스트

공개 서비스 배포 역시 별도 승인 후 수행한다. 공개 URL에서 승인된 HOST만 Agent를 실행할 수 있는지와 비회원의 접근 차단을 검증한다. 실제 사용자 5명 이상에게 다음 과제를 동일하게 제공한다.

1. 본인 체험 또는 새 아이디어 한 가지를 분석한다.
2. 5개 평가 기준과 출처가 이해되는지 말한다.
3. 두 개선안 중 하나를 선택하고 운영안에서 사실 확인이 필요한 부분을 표시한다.
4. 한국어·영어·일본어 중 사용할 언어를 바꾸어 결과를 확인한다.
5. 실제로 저장할 가치가 있는 문장만 편집란으로 복사하고, 저장 여부를 스스로 결정한다.

피드백 기록은 익명 테스터 ID, 테스트 날짜, 사용 시나리오, 언어, 성공/실패, 소요 시간, 혼동한 문구, 부정확한 근거, 위험한 확정 표현, 제안, 수정 커밋/PR, 재시험 결과를 포함한다. 실명·연락처·아이디어 원문은 동의 없이 기록하지 않는다. 최소 1건 이상의 구체적 피드백을 코드 또는 문구에 반영하고 재검증한다.

## 캡스톤 발표 증거

발표 자료에는 실제 서비스 URL, 도구 호출 로그의 비식별 화면, RAG 검색 입력/출처/결과, 계산 도구의 재현 가능한 입력·출력, HOST 검토 후 저장 전/후 화면, 5명 테스트 표와 피드백 반영 기록, GitHub PR·커밋을 포함한다. 현재는 로컬 구현·모의 모델 테스트 단계이므로 실서비스 배포·실사용자 피드백 충족으로 표시하면 안 된다.
