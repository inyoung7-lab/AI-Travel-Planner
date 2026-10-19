# HOST 프로필 번역 열 읽기 권한 적용 기록

- 적용 일시: 2026-10-18 (Asia/Seoul)
- 프로젝트: `local-eum-dev` (`rhkaxmqdkztpbljkunxb`)
- 실행 파일: `20261018_host_profile_translation_read.applied.sql`
- 원인: 로그인한 HOST의 프로필 조회는 `lc_hosts.translations`를 선택하지만 `authenticated`에 이 열의 `SELECT` 권한이 없었다. 서버 오류는 `permission denied for table lc_hosts`였다.
- 변경: `authenticated`에 `lc_hosts.translations` 열의 읽기 권한만 부여했다. 호스트 행, RLS 정책, 익명 권한, `auth_user_id` 열 접근권은 변경하지 않았다.
- 확인: 원격 권한 조회에서 `authenticated`는 번역 열을 읽고 `anon`은 읽지 못한다. RLS는 켜져 있다. 로그인된 `beautimind01@gmail.com` 세션의 호스트 운영센터를 다시 불러오자 프로그램·회차 목록과 호스트 프로필 편집란이 표시됐다.

이번 적용은 팀 공통 인증이나 Oracle 영역을 변경하지 않는다.
