# 로컬이음 구현·검증 상태

기준일: 2026-10-20. 이번 자료는 최신 `origin/main` 커밋 `79374c262707e71440767f483d928e248e7a0d19`에서 확인했습니다. 수치는 아래에 적은 시각의 read-only 조회 결과이며, 시간이 지나면 달라질 수 있습니다.

## 상태 구분

| 영역 | 상태 | 확인 내용과 경계 |
| --- | --- | --- |
| 공통 앱 라우팅 | 구현 | `src/App.jsx`에 `/local-eum`, 상세, HOST profile, 회차 편집 route가 있고 공통 Header가 연결 |
| 공개 체험 목록·상세 | 구현·화면 확인 | Supabase `PUBLISHED` 체험 조회. 로컬 실제 화면에서 목록 15개와 상세 회차·신청 버튼 확인 |
| 신청 접수 | 구현 | `lc_submit_experience_application` RPC 사용. 현재 접수 데이터는 1건. 실 결제 기능과는 별개 |
| HOST 운영센터 | 구현·일부 실조작 확인 | 프로필, 체험·회차, 신청자, AI 탭. 공개 데모는 가상 데이터·읽기 전용 |
| 회차 lifecycle/RLS | DB 적용·부분 검증 | 소유 HOST/ADMIN DRAFT 생성·수정 정책과 취소 RPC 적용 기록. 테스트 전용 데이터로 HOST 생성·취소와 다른 HOST 화면 차단 확인 기록이 있으나 실제 교차 HOST API 수정은 별도 호출하지 않았으며 ADMIN 실조작은 미검증 |
| AI Agent | 코드 구현·단위 검증 | Edge Function, 로그인·HOST 소유권 검사, 허용 도구 4개, JSON adapter. mock 테스트와 기존 테스트 기록은 실제 모델 품질·모든 계정 권한 보증이 아님 |
| 다국어 | 구현·초안 | 화면 `ko/en/ja`; 영어·일본어 번역은 DRAFT. 실제 진행 언어는 HOST 확인 별도 |
| Kakao Maps | 코드 구현 | 주소 검색/길찾기 링크, 키·허용 도메인 설정에 따라 실제 지도 로드 여부가 달라짐 |
| 결제 | 미구현 | 화면의 금액·가상계좌/결제 안내는 시연용. 실제 결제·입금 확인·환불·정산 없음 |
| 실사용자 검증 | 미완료 | 외부 사용자 5명 테스트 및 피드백 반영 기록을 확인하지 못함 |
| 외부 통합 배포 | 별도 확인 필요 | 로컬 개발 화면과 저장소 병합은 외부 배포 완료의 증거가 아님 |

## 읽기 전용 DB 스냅샷

프로젝트 `local-eum-dev`에 SELECT만 실행했습니다. API 키·사용자 개인정보·신청자 연락처를 조회하지 않았습니다.

| 테이블 | 행 수 |
| --- | ---: |
| `lc_hosts` | 2 |
| `lc_experiences` | 15 |
| `lc_experience_steps` | 68 |
| `lc_sessions` | 19 |
| `lc_applications` | 1 |
| `lc_application_payments` | 1 |

`lc_hosts`, `lc_experiences`, `lc_sessions`, `lc_applications`, `lc_application_payments`에서 RLS 활성화를 확인했습니다. `lc_experiences` 공개 SELECT와 HOST/ADMIN 관련 정책, `lc_sessions` 공개 SELECT·소유자 DRAFT INSERT·소유자/ADMIN UPDATE, 신청·결제의 본인/소유 HOST/ADMIN read 정책을 카탈로그에서 확인했습니다. `lc_submit_experience_application`과 `lc_cancel_experience` 함수는 `SECURITY DEFINER`로 조회됐습니다. 함수 본문과 권한은 applied SQL 및 적용 기록과 함께 읽어야 하며 카탈로그 요약만으로 모든 경로를 증명하지 않습니다.

언어·친구 체험 #113–#115는 `PUBLISHED`, 해당 회차 #17–#19는 `RECRUITING`이고 `available_languages`는 세 건 모두 빈 배열입니다. 표시 참가비는 서울 10,000원, 부산 0원, 창원 10,000원입니다. 이는 매출·결제 성공 기록을 뜻하지 않습니다.

## 테스트·증거 한계

- 이번 작업 트리에서 `npm run build` 통과(이미지 경로 2개와 큰 chunk 경고), `npm run lint` 통과(다른 기존 Community/MyTrip/server 경고), Local Eum 56/56 통과, AI Edge 16/16 통과, Deno check/lint 통과, `git diff --check` 통과를 확인했습니다.
- `npm run test:travel`은 49개 중 48개 통과, 1개 실패입니다. `src/pages/data/trendingPlaceDetails.test.js`의 공통 내비게이션 테스트가 실패했습니다. 로컬이음 파일 변경과 무관한 팀 화면 테스트입니다.
- 현재 앱 화면 캡처 3개는 실제 localhost 화면입니다. AI 실제 실행 화면은 이번 자료에서 캡처하지 않았으며, AI 슬라이드는 코드 기반 흐름도입니다. 이번 작업 중 비용이 발생할 수 있는 실 모델 요청은 하지 않았습니다.

## 포함·제외 및 안전

이 폴더의 자료·캡처·제작 스크립트만 멘토링 브랜치에 추가합니다. HOST 계정, 신청자 연락처, API 키, `.env.local`, 백업 파일은 포함하지 않습니다. Supabase DB·Storage·Edge Function을 변경하지 않았습니다.
