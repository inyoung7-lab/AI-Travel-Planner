# 로컬이음 언어·친구 3개 도시 시연 데이터 적용 기록

- 적용 일시: 2026-10-18 (Asia/Seoul)
- Supabase 프로젝트: `local-eum-dev` (`rhkaxmqdkztpbljkunxb`)
- 실행 SQL: `supabase/seed/20261018_local_eum_language_friends_three_city.sql`
- 적용 결과: 성공. 호스트/체험/회차 테이블 외 스키마, RLS, Auth, Storage, Edge Function은 변경하지 않음.

## 적용 행

| 도시 | HOST | 체험 ID | 회차 ID | 장소 ID | 상태 | 운영 일정 (KST) |
|---|---:|---:|---:|---:|---|---|
| 서울 | 500 | 113 | 17 | 17 | DRAFT | 2026-11-07 14:00–15:30 |
| 부산 | 500 | 114 | 18 | 18 | DRAFT | 2026-11-14 10:30–12:00 |
| 창원 | 500 | 115 | 19 | 8 | DRAFT | 2026-11-21 14:00–15:30 |

세 체험 모두 `available_languages`가 빈 배열이며 모집·신청·결제는 활성화하지 않았다. 회차별 운영 단계는 6개, 합계 90분이다. 번역 필드는 검수 전 초안으로 저장했다. 두 신규 장소의 좌표는 비워 두었고 장소 #8의 소유권은 변경하지 않았다.

## 사후 확인

Supabase CLI를 통한 읽기 전용 사후 조회에서 호스트 2명, 체험 15개(기존 HOST #500 10개에서 13개, HOST #501 2개 유지), 새 시연 체험 3개 및 DRAFT 회차 3개를 확인했다. 세 체험 모두 예상 HOST·장소·상태와 일치하며, 각 체험에 단계 6개/90분이 있다. 장소 #8은 계속 HOST #500 소유다.

두 번의 사전 적용 시도는 제약 조건 및 SQL 구성 오류로 트랜잭션 전체가 롤백되었고 테이블 행은 생성되지 않았다. 수정 후 실행한 단일 트랜잭션만 적용됐다. 롤백된 시도에서 식별자 시퀀스에 공백이 생길 수 있으나 기존 데이터 행이나 정합성에는 영향이 없다.

장소 공식 주소·시설 정보는 [서울관광 서울숲 안내](https://korean.visitseoul.net/etc-area/%EC%84%9C%EC%9A%B8%EC%88%B2/KOP001838), [부산시민공원 방문자센터](https://citizenparkmap.bisco.or.kr/vistor-center/), [창원관광 창동예술촌아트센터](https://www.changwon.go.kr/tour/index.do?menuCode=001_003000000000&page.pageNo=1&search.searchKeyword=%EC%95%84%ED%8A%B8&tourProgramNo=207)를 기준으로 확인했다. 주소 확인은 모임·상업 운영 허가를 의미하지 않는다.

## 대표 이미지·창동 문구 후속 적용 (2026-10-18)

Supabase CLI로 `local-eum-dev`에 세 WebP를 `local-eum-media` Storage에 올린 뒤, `20261018_language_friends_images_and_changdong_copy.applied.sql`을 실행했다. SQL은 체험 #113–#115의 HOST #500 소유권, DRAFT 상태, 비어 있던 이미지 필드, 각 Storage 객체의 MIME·크기를 검증하고 세 이미지 URL과 대체 텍스트를 연결했다. 창동 #115의 한국어·영어·일본어 소개는 바다가 없는 좁은 도심 골목에 맞게 수정했고, 영어·일본어 `review_status`는 계속 `DRAFT`다.

| 체험 | Storage 경로 | 크기 | 공개 URL 응답 |
|---|---|---:|---|
| 113 | `experiences/113/cover.webp` | 120,258 bytes | HTTP 200 |
| 114 | `experiences/114/cover.webp` | 98,066 bytes | HTTP 200 |
| 115 | `experiences/115/cover-v2.webp` | 205,608 bytes | HTTP 200 |

사후 조회에서 세 URL·대체 텍스트가 연결되고 각 체험은 HOST #500 소유 DRAFT, `available_languages=[]` 상태임을 확인했다. 실제 입장·예약·결제나 시설 모임 허가는 추가되지 않았다. 로컬 시연 상세에서도 창동 이미지와 수정 문구를 확인했다.
