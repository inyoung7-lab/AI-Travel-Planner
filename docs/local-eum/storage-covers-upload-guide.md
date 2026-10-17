# 로컬이음 시연 이미지 Storage 연결

이 문서는 `local-eum-dev` Supabase 프로젝트에 시연용 대표 이미지를 연결할 때 사용하는 안내입니다. 이미지는 모두 AI 생성 사진 스타일이며 실제 시설 사진이 아닙니다.

## 파일과 체험 연결

각 파일은 `docs/local-eum/storage-upload/experiences/{experience_id}/cover.webp`에 있습니다. Supabase Storage의 `local-eum-media` 버킷에도 같은 상대 경로로 올립니다.

| 코드 | 체험 ID | 버킷 안 경로 |
| --- | ---: | --- |
| DEMO-01 | 102 | `experiences/102/cover.webp` |
| DEMO-02 | 103 | `experiences/103/cover.webp` |
| DEMO-03 | 104 | `experiences/104/cover.webp` |
| DEMO-04 | 101 | `experiences/101/cover.webp` |
| DEMO-05 | 105 | `experiences/105/cover.webp` |
| DEMO-06 | 106 | `experiences/106/cover.webp` |
| DEMO-07 | 107 | `experiences/107/cover.webp` |
| DEMO-08 | 108 | `experiences/108/cover.webp` |
| DEMO-09 | 109 | `experiences/109/cover.webp` |
| DEMO-10 | 110 | `experiences/110/cover.webp` |

이미지는 1200×800 WebP이며 각각 174–361 KB입니다. 버킷은 공개 읽기 전용으로 사용합니다. 앱에서 업로드·삭제 권한을 열지 않습니다. 이미지 변경은 HOST 이미지 관리 화면을 구현하기 전까지 프로젝트 관리자만 Dashboard에서 합니다.

## 연결 순서

1. Supabase Dashboard에서 프로젝트가 `local-eum-dev`이고 프로젝트 ref가 `rhkaxmqdkztpbljkunxb`인지 확인합니다.
2. SQL Editor에서 `storage-covers.review.sql`의 STEP A만 실행해 버킷을 만듭니다. 이 단계는 `local-eum-media`가 이미 설정과 다르면 중단합니다.
3. Storage 메뉴에서 `local-eum-media`를 열고 위 표의 상대 경로에 파일을 업로드합니다. 예를 들어 DEMO-01은 `experiences/102/cover.webp`입니다.
4. 10개 파일이 모두 올라온 뒤 SQL Editor에서 같은 파일의 STEP B를 실행해 `lc_experiences.hero_image_url`과 `hero_image_alt` 두 컬럼만 채웁니다.
5. Table Editor에서 `lc_experiences`의 `demo_code`, `hero_image_url`, `hero_image_alt`를 확인하고 `/local-eum`에서 카드와 상세 화면을 새로고침합니다.

## 진행 상태 (2026-10-17)

사용자의 이미지 연결 진행 지시에 따라 `local-eum-dev` / `rhkaxmqdkztpbljkunxb`에서 STEP A, 이미지 업로드, STEP B를 완료했습니다. STEP B는 최초 연결용이므로 다시 실행하면 기존 이미지 감지로 중단됩니다.

- `local-eum-media`: 공개 읽기, 파일당 400,000 bytes 제한, `image/webp`만 허용.
- Storage 객체 INSERT/UPDATE/DELETE/ALL 정책은 0개입니다.
- Chrome 파일 URL 접근 설정 후 이미지 10개(총 2,236,114 bytes)를 위 경로에 업로드했습니다. 기존 이미지 덮어쓰기는 수행하지 않았습니다.
- 공개 이미지 URL 10개가 모두 HTTP 200 / `image/webp`를 반환하며, 응답 파일의 SHA-256이 로컬 원본과 일치합니다.
- STEP B 원본과 SQL Editor 입력 전체가 일치함을 확인한 뒤 실행했습니다. 시연 체험 10개 모두 이미지 주소와 AI 시연 대체 텍스트가 연결되었습니다.
- 연결 전후 회차 전체 데이터와 이미지/수정 시각을 제외한 체험 데이터의 해시가 일치합니다.
- 실제 Supabase를 사용하는 목록에서 이미지 10개(1200×800)와 AI 표기를 확인했고, 상세 경로 10개도 모두 이미지 로딩을 확인했습니다.
- 390×844 모바일 목록·상세에서 이미지 표시와 가로 넘침 없음을 확인했습니다. 확인한 브라우저 오류 로그는 0개입니다.
- 기존 이미지/체험 표시 테스트 9개, `npm run build`, `npm run lint`를 통과했습니다. 빌드에는 기존 로그인/회원가입 배경 이미지 경로와 번들 크기 경고가 있습니다.

HOST 로그인/저장과 카카오 지도 동작 검증은 별도 후속 작업입니다. 이번 이미지 연결 작업에서 커밋/Push는 수행하지 않았습니다.

Storage에 이미 같은 버킷이나 object가 존재하는 경우 먼저 확인하고 덮어쓰지 않습니다.
