# 로컬이음 원격 SQL 적용 기록 — 2026-10-20

- 대상: Supabase `local-eum-dev` (`rhkaxmqdkztpbljkunxb`)
- 실행: Supabase CLI `db query --linked --project-ref rhkaxmqdkztpbljkunxb --file ...`
- 사용자 승인: 번역 SQL 적용·검증 후 회차 운영 SQL을 별도로 적용·검증
- 적용본: [일정 번역](20261020_language_friends_itinerary_translations.applied.sql), [회차 운영](20261017_host_operations_lifecycle.applied.sql)
- 원래 `.review.sql` 파일은 검토 이력을 위해 보관한다. `.applied.sql` 복사본은 적용 후 주석만 현재 상태에 맞춰 정리했으며 실행 SQL 문장은 동일하다.

## 1. 일정 번역

적용 전 원격 조회에서 체험 113·114·115는 HOST 500 소유의 `DRAFT`였고, 회차 17·18·19도 `DRAFT`였다. 일정 단계 ID 67~84가 체험별 6개씩 정확히 18개였으며 SQL의 체험 ID·순서·한국어 제목과 모두 일치했다. 이 단계에는 `en`·`ja` 번역이 없었다.

트랜잭션으로 각 단계의 영문·일문 제목과 설명을 `review_status: DRAFT`로 추가했다. 기존 언어가 있거나 대상 단계가 바뀌면 적용을 중단하는 가드를 사용했다. 적용 후 조회 결과는 아래와 같다.

| 검사 | 결과 |
| --- | ---: |
| 대상 단계 | 18개 |
| `en`·`ja` 모두 제목·설명과 `DRAFT`가 있는 단계 | 18개 |
| 체험별 반영 | 113·114·115 각각 6개 |
| `REVIEWED` 단계 | 0개 |
| 대상 체험·회차 상태 및 회비 | 적용 전과 동일 |

단계 UPDATE 트리거가 해당 체험의 `updated_at`도 갱신한다. `available_languages`는 수정하지 않았다. 체험 115에 현재 `ko/en/ja`가 들어 있는 이유와 HOST 확인 여부는 별도 확인이 필요하다.

## 2. 회차 운영

번역 결과 확인 후 별도 트랜잭션으로 적용했다. 적용 전 `lc_experiences`·`lc_sessions`의 상태 제약은 각각 `DRAFT/PUBLISHED`, `DRAFT/RECRUITING`이었고 두 테이블 모두 RLS가 켜져 있었다. 회차 INSERT 정책과 `lc_cancel_experience(bigint)`는 없었으며 기존 회차 UPDATE 정책과 참가 신청 RPC는 있었다.

적용 후 원격 조회로 다음을 확인했다.

| 검사 | 결과 |
| --- | --- |
| 체험 상태 제약 | `DRAFT`, `PUBLISHED`, `CANCELLED` |
| 회차 상태 제약 | `DRAFT`, `RECRUITING`, `CANCELLED` |
| 회차 INSERT | `authenticated`의 제한된 컬럼 권한; 소유 HOST 또는 ADMIN의 `DRAFT` 행만 허용하는 RLS |
| 회차 UPDATE | 소유 HOST 또는 ADMIN만 허용; `CANCELLED` 행 재개방 차단 |
| 체험 취소 RPC | `SECURITY DEFINER`, 소유 HOST/ADMIN 확인, 체험과 시작 전 회차를 한 호출에서 취소 |
| RPC 실행 권한 | `authenticated` 허용, `anon` 거부 |
| 기존 행 수 | 체험 15·회차 19·신청 1·시연 결제 1, 적용 전과 동일 |

RPC를 호출해 실제 체험을 취소하거나 새 회차를 만들지는 않았다. HOST/ADMIN 계정별 브라우저 조작과 교차 소유권 검증은 별도 기능 테스트가 필요하다. 기존 신청·결제 이력은 취소 RPC의 UPDATE 대상이 아니며, 환불·자동 알림은 이 SQL에 포함되지 않는다.

## 복구 원칙

각 SQL은 자체 `BEGIN`/`COMMIT` 트랜잭션이다. 실행 중 가드·제약 오류가 나면 그 SQL의 변경 전체가 롤백된다. 이미 적용한 SQL은 재실행 시 가드에서 중단된다.

커밋 후 번역을 되돌릴 필요가 생기면 18개 단계의 현재 번역과 HOST의 후속 수정을 먼저 확인하고, 이번에 추가한 `DRAFT` 언어만 대상으로 별도 복구 SQL을 검토한다. 회차 상태가 한 번이라도 `CANCELLED`로 사용되면 이전 상태 제약을 그대로 복원할 수 없다. 그때는 신청·운영 기록을 보존하는 전진 수정안을 먼저 검토한다. 복구를 이유로 기존 신청 또는 결제 이력을 삭제하지 않는다.
