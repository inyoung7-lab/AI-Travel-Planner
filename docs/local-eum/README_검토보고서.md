# 로컬이음 README 검토 보고서

검토 기준일: 2026-10-18

> 이 문서는 당시 상태를 기록합니다. 2026-10-20에 번역·회차 운영 SQL을 적용한 최신 상태는 [README](README.md)와 [적용 기록](migrations/20261020_language_friends_and_host_lifecycle.applied.md)을 확인하세요.

검토 브랜치: `hykang`

대상 Supabase: `local-eum-dev` (`rhkaxmqdkztpbljkunxb`)

## 1. 검토 범위와 기준

요청된 `README(3).md`는 현재 저장소와 `C:\Users\UserK\.codex\attachments`에서 찾지 못했다. 사용자가 현재 저장소 README를 기준으로 진행하도록 확인했으므로 이 보고서와 초안은 기존 `docs/local-eum/README.md`를 기준 문서로 삼았다. 팀 루트 `README.md`는 Create Vite 기본 안내만 담고 있으며 수정하지 않았다.

현재 브랜치는 `hykang`이고 upstream은 `origin/hykang`이다. 작업 트리에는 이전 작업의 staged·unstaged·untracked 변경이 함께 남아 있다. staged 변경에는 참가 신청 기능 파일과 신청 기능 설계 문서가 포함되어 있고, 체험 목록·상세·호스트 프로필·회차 편집·AI·다국어·운영센터·이미지·SQL·문서 변경은 unstaged 또는 untracked로 섞여 있다. 이 검토에서는 해당 파일을 편집하거나 stage 상태를 바꾸지 않았다.

README 산출물 생성 직전 `git status --short --branch`에서 staged 13개, unstaged 수정 17개, untracked 59개가 확인됐으며 staged·unstaged 중복을 제외한 기존 변경 경로는 85개였다. 현재 untracked 수에는 이 보고서와 초안도 추가되어 있다. 기존 작업 보존 백업은 `%TEMP%\local-eum-git-prep-20261018-134112\after-stage-preparation`에 있다. README 산출물은 검토용 새 문서이며 커밋·푸시하지 않는다.

## 2. 현재 README의 장점·문제점·누락사항

### 장점

- 팀 프로젝트와 로컬이음의 관계, 대상 사용자, 해결하려는 문제를 소개 초반에 설명한다.
- HOST 1명이 공통 프로필을 두고 여러 체험을 운영한다는 소유 관계를 분명히 한다.
- 표시 언어와 실제 진행 가능 언어를 분리하고, 영어·일본어 번역의 `DRAFT` 상태를 설명한다.
- 시연용 접수 안내와 실제 은행 가상계좌·카드 결제를 구분한다.
- Codyssey Agent의 도구, RAG 출처, 검토 후 저장 흐름과 개인정보 마스킹을 문서화한다.
- Mermaid 아키텍처, 개발 실행법, 관련 운영·AI·다국어 문서 링크가 이미 있다.

### 문제점

- README는 `docs/local-eum/README.md`에 존재하지만 Git 상태상 untracked다. 기존 파일을 수정해 최종 확정한 문서로 오인하면 안 된다.
- `완료 상태`와 화면 기능 목록 일부가 회차 생성·취소, 외부 배포, 실사용자 테스트, 운영 권한까지 모두 작동하는 것으로 읽힐 수 있다. 특히 UI 코드 존재와 원격 DB 권한·RPC 적용 여부를 구분해야 한다.
- ADMIN을 여행자·HOST와 같은 실제 화면 이용자로 소개할 근거가 부족하다. 공통 ADMIN 대시보드 라우트는 확인되지 않았고, DB의 관리자 정책 존재만으로 관리자 UI 완료를 주장할 수 없다.
- 운영 회차 추가·취소는 프런트엔드 코드와 검토용 SQL이 있지만, 원격 DB에는 회차 INSERT 정책과 `lc_cancel_experience` 함수가 없다. 이를 현재 동작 완료로 표현하면 안 된다.
- README의 “체험 카드 및 저장된 이미지” 표현을 배포 상태와 연결해서 읽지 않도록, 원격 Storage 파일의 실제 검증과 웹 앱 공개 배포를 별도로 구분할 필요가 있다.
- `.applied.sql` 파일은 원격 DB의 현재 스키마·데이터와 대조되지만 Supabase CLI migration ledger에는 기록이 없다. 파일명의 `applied`만으로 자동 마이그레이션 추적 또는 모든 SQL의 동일성 검증을 의미하지 않는다.
- AI 문서와 현재 코드의 모델 기본값은 `gpt-5.4-mini`로 일치하지만, `CODYSSEY_MODEL` 환경변수로 바뀔 수 있다. README에는 기본값과 재정의 가능성을 함께 적어야 한다.
- 문서에는 현재 공개 웹 배포 URL이나 5명 이상 사용자 검증 기록이 없다. 로컬 빌드 성공과 서비스 배포·사용자 테스트 완료를 구분해야 한다.
- 기존 README의 다국어 절에 단독 문자 `퐇`가 있어 초안에서 정리할 필요가 있다.
- 제공된 `README(3).md`를 찾지 못해 그 문서 고유의 구성이나 문구를 보존했는지 확인할 수 없다.

### 누락사항

- 여행자·HOST·관리자·팀원/심사위원별 실제 이용 흐름과 각자의 접근 경계
- 공개 호스트 홈페이지와 HOST 전용 관리센터의 차이
- HOST의 여러 프로그램과 공통 호스트 프로필 관계
- 로그인 신청과 비회원 신청의 접수 흐름, 시연 결제의 한계
- 적용된 DB 변경과 검토 중인 SQL, 원격 확인 방법 및 CLI ledger 상태
- 회차 추가·취소 등 화면 코드와 DB 미적용 제약의 분리
- 실제 모델 호출 검증과 모의 테스트의 차이
- 팀 공통 Header·라우터·인증·배포 경로와 다른 팀원 영역의 협업 경계
- 외부 심사 접근을 위한 공개 데모 URL 준비 요건

## 3. 코드·원격 DB·검증 자료 대조

| 주제 | 저장소 및 원격 근거 | 확인 결과 | README 반영 기준 |
| --- | --- | --- | --- |
| 팀 구조 | `src/App.jsx`, `src/components/header.jsx` | 공통 React Router와 Header 아래 `/local-eum` 경로가 연결된다. 다른 팀 화면도 같은 앱에 존재한다. | 로컬이음은 「여행, 한걸음」의 모듈이며 팀 전체 앱을 대체하지 않는다고 명시한다. |
| 루트 안내 | `README.md` | Vite 기본 템플릿 설명만 있다. | 팀 전체 README를 임의 교체하지 않는다. 로컬이음 문서를 별도 링크하는 방안만 제안한다. |
| 목록·상세 | `src/pages/local-eum/ExperienceCatalog.jsx`, `ExperienceDetail.jsx`, `src/pages/local-eum/sessionRepository.js` | 목록 필터·정렬·언어 전환, 체험 상세와 회차 표시 및 신청 컴포넌트가 있다. | 구현 화면과 저장소 데이터 기준을 기술한다. |
| 공통 호스트 프로필 | `src/pages/local-eum/HostProfileEdit.jsx`, `sessionRepository.js` | 호스트 프로필 편집은 HOST 계정/프로필에 연결된다. 운영센터에서 선택한 프로그램과 프로필 편집이 함께 배치된다. | 한 HOST가 여러 체험을 운영하며 프로필은 호스트 단위로 한 번 관리한다고 쓴다. |
| 공개 운영센터 데모 | `HostProfileEdit.jsx`, `components/HostOperationsDemo.jsx`, `hostOperationsDemo.js` | `?demo=1`은 가상 레코드 기반의 읽기 전용 화면이며 샘플 연락처는 `example.com` 및 비실제 번호다. HOST 로그인 화면과 구분된다. | 팀원·심사위원은 로그인 없는 공개 데모로 운영 흐름을 확인할 수 있다고 설명하되, 실제 공개 배포 주소는 확인되지 않았다고 구분한다. |
| 신청·시연 결제 | `components/ExperienceApplicationFlow.jsx`, `applicationRepository.js`, `migrations/20261017_experience_applications.applied.sql` | 신청 폼 및 RPC 호출 코드가 있고 원격 DB에 신청/결제 테이블·RPC가 존재한다. 실제 결제와 은행 계좌 발급은 아니다. | 로그인/비회원 접수 및 접수 안내를 설명하고, 결제·입금 확인·예약 확정은 제공되지 않는다고 쓴다. |
| HOST 신청자 조회 | `components/HostApplicationContacts.jsx`, `sessionRepository.js` 및 원격 RLS | 소유 체험 신청을 기존 신청 행에서 조회하는 코드가 있다. 연락처 표시·복사·전화/메일 링크는 HOST 화면 기능이다. 실제 개인정보는 공개 데모가 쓰지 않는다. | 신청자 관리가 로그인한 HOST의 소유 범위이며 공개 데모는 합성 데이터라고 설명한다. |
| 회차 추가·취소 | `SessionEdit.jsx`, `sessionRepository.js`, `sessionLifecycle.js`; `migrations/20261017_host_operations_lifecycle.review.sql`, `20261017_session_lifecycle.review.sql` | 입력·취소 UI 및 호출 로직은 있지만, 원격 DB에는 회차 INSERT 정책과 `lc_cancel_experience` 함수가 확인되지 않았다. 검토 SQL은 적용되지 않은 상태다. | “코드 구현, 원격 권한/함수 미적용”으로 표시한다. 실제 운영 가능 기능으로 쓰지 않는다. |
| 다국어 | `localEumI18n.js`, 편집 화면, `.applied.sql` 2종, `local-eum-language-rollout.md` | 원격 DB에서 host 2, experience 12, step 50행에 EN/JA 번역이 있고 모두 초안이다. 진행 가능 언어 배열은 12개 전부 비어 있다. | 번역 초안은 지원되지만 호스트 검수와 실제 진행 언어 확정이 남았다고 명시한다. |
| AI Agent | `supabase/functions/local-eum-agent/{index.ts,agent-core.mjs,codyssey-client.mjs,auth.mjs,knowledge.mjs}`, `supabase/config.toml` | JWT 검증, HOST 승인·소유권 확인, 허용 도구 실행, RAG 출처, 평가·비용 로직이 있다. Codyssey OpenAI 호환 Chat Completions를 사용하고 기본 모델은 `gpt-5.4-mini`; 서버 환경변수로 재정의 가능하다. AI 결과는 일반 저장 전 HOST 검토를 거친다. | Agent가 돕는 업무와 안전 경계, 모의 테스트와 실제 서비스 호출 검증을 분리한다. |
| Edge Function 배포 | 읽기 전용 `supabase functions list --project-ref rhkaxmqdkztpbljkunxb` | `local-eum-agent` 상태 `ACTIVE`, 버전 10, `verify_jwt=true`로 확인됐다. | Edge Function이 배포된 사실은 기록 가능하지만 전체 프런트엔드 배포와 동일시하지 않는다. |
| 원격 DB 현황 | 읽기 전용 `supabase db query --linked --project-ref ...` | 호스트 2, 체험 12, 회차 16, 일정 50, 신청 1, 결제 시연 1. 번역 적용 상태는 호스트 2/2, 체험 12/12, 일정 50/50, 진행 언어 확정 체험 0/12다. | 수치에는 확인 기준일과 프로젝트 ID를 붙인다. 행 내용이나 개인정보는 README에 넣지 않는다. |
| SQL 적용 추적 | `supabase migration list --project-ref rhkaxmqdkztpbljkunxb` 및 `docs/local-eum/migrations/` | 원격 CLI migration ledger가 비어 있다. `.applied.sql` 파일은 원격 현재 상태와 기능/건수로 대조됐지만, ledger 기반 이력은 아니다. `.review.sql` 및 `.draft.sql`은 미적용 검토 자료다. | 적용 확인과 파일의 기록 표기를 구분하고, 미적용 SQL을 README에서 분명히 표시한다. |
| 지도·이미지 | `maps/PlaceMap.jsx`, `maps/kakaoMapLoader.js`, `ExperienceImage.jsx`, `experienceImageSource.js`, `docs/local-eum/storage-upload/` | 카카오 지도 연동은 키 설정에 의존하고, 확인 좌표가 없으면 마커를 만들지 않는 로직이 있다. 이미지 경로·시연 자산은 코드에서 분류한다. 원격 Storage 버킷/모든 객체를 이번 검토에서 별도 열거하지 않았다. | 지도 키·저장된 좌표에 따라 작동한다고 쓰고, Storage 원격 업로드 완료 수량은 주장하지 않는다. |
| 관리자 기능 | `src/App.jsx`, `src/pages/local-eum/` | ADMIN 전용 대시보드 라우트나 화면이 확인되지 않았다. 신청 정책 중 ADMIN 읽기 정책이 있다고 해서 승인 UI가 구현된 것은 아니다. | ADMIN은 현재 설계/권한 경계와 향후 역할로 설명하고, 호스트 승인·전체 운영 UI는 구현 완료에서 제외한다. |
| 외부 배포·사용자 평가 | 저장소 설정·문서 및 현재 환경 | 확인된 웹 URL은 로컬 개발 주소뿐이다. 5명 이상 실사용자 테스트와 피드백 반영 증빙은 찾지 못했다. | 과제 목표/추가 검증 항목으로 둔다. 배포 완료·사용자 검증 완료를 주장하지 않는다. |

## 4. 확인한 테스트와 한계

2026-10-18 현재 코드에서 재실행한 결과:

- `npm run build`: 성공. Vite가 `/images/login-bg.jpg`, `/images/signup-bg.jpg` 참조를 빌드 시 해석하지 못한다는 경고와 500KB 초과 번들 경고가 있다.
- `npm run lint`: 종료 코드 0. 기존 MyTrip·Community·server 코드에 경고 11건이 남아 있다.
- `npm run test:travel`: 48개 중 47개 통과, 1개 실패. `server/search.test.js`의 “home recommendations use browser history and example cards remain clearly non-personalized”에서 assertion이 실패했다. 로컬이음 테스트 파일 실패는 아니다.
- `node --test src/pages/local-eum/*.test.js`: 44/44 통과.
- `node --test supabase/functions/local-eum-agent/*.test.mjs`: 16/16 통과. 모의 모델 호출을 포함한다.
- `deno check supabase/functions/local-eum-agent/index.ts`, `deno lint supabase/functions/local-eum-agent`: 성공.

테스트 통과는 라이브 Codyssey 출력 품질, HOST 두 계정의 브라우저 교차 권한, 외부 배포, 실사용자 만족도, 운영 회차 추가·취소의 원격 DB 지원을 증명하지 않는다. 팀 회귀 테스트의 1건 실패는 README 검토에서 수정하지 않았다. Edge Function 활성 상태는 Supabase CLI로 조회했지만 실제 모델 요청은 이 README 검토에서 실행하지 않았다.

## 5. 최종 README 목차와 개선 방향

개선 초안은 기존 문서의 프로젝트 소개·대상과 목적·주요 기능·AI·아키텍처·실행·DB·테스트·데모 섹션을 살리고, 다음 내용을 보강한다.

1. 팀 프로젝트와 모듈의 관계 및 일반 관광정보와 다른 점
2. 여행자·HOST·ADMIN·심사위원의 목적과 구현 경계
3. 여행자 신청, HOST 운영, AI 검토·저장 업무 흐름도
4. Supabase/Auth/RLS/Storage/Edge Function과 팀 공통 React 구조의 Mermaid 아키텍처
5. 코드·DB 적용·테스트·배포·사용자 검증을 나눈 기능 상태 표
6. 검증된 시연 데이터 수치와 번역 검수·실제 진행 언어의 분리
7. 가상 접수/계좌, 공개 읽기 전용 데모, 실제 결제 부재 안내
8. 회차 생명주기 SQL이 원격 DB에 미적용된 상태 및 수정 전제
9. 팀원 실행 방법, HOST 로그인 조건, 심사위원 공개 접근의 구분
10. 팀 공통 Header·라우터·인증·배포와 로컬이음 담당 경계

## 6. 보안·작업 상태

비밀키 값을 출력하거나 문서에 기록하지 않았다. 본문에 `CODYSSEY_API_KEY` 등 이름만 기재하고 서버 Secret으로 관리하도록 안내한다. 변경 파일의 이전 보안 점검에서는 키 형태 문자열 및 실제 신청자 개인정보가 확인되지 않았고 `.env.local`은 ignore 상태였다. `supabase/.temp` 아래 CLI 파일은 로컬 임시 파일이므로 Git 반영 대상에서 제외해야 한다. 실제 비밀값이나 신청자 연락처를 포함하는 공개 산출물은 추가 점검 없이 커밋하지 않는다.

검토 중 Supabase 원격 DB에는 SELECT 및 함수 목록 조회만 수행했다. SQL 적용, 데이터 변경, Edge 재배포, React 코드 변경, Git stage/commit/push/PR은 하지 않았다. 이 보고서는 새 파일이며 현재 기존 작업 변경분과 별도로 검토해야 한다.
