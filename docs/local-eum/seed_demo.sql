-- LOCAL EUM / 여행, 한걸음 — 테스트 HOST와 연결된 시연 데이터
-- 전제: initial_schema.draft.sql 적용 완료, Authentication > Users에서 disposable 테스트 계정을 생성.
-- 아래 UUID 표식을 그 테스트 사용자의 UUID로 바꾼 후 한 번만 실행한다.
-- 비밀번호, 이메일, 비밀키는 이 파일에 기록하지 않는다.
-- 중복 ID가 있으면 충돌로 전체 작업이 롤백된다. 기존 행을 갱신/삭제하지 않는다.

begin;

do $seed$
declare
  test_host_user_id uuid := '__TEST_HOST_AUTH_USER_UUID__'::uuid;
begin
  if not exists (select 1 from auth.users u where u.id = test_host_user_id) then
    raise exception 'Test Auth user UUID does not exist in auth.users';
  end if;

  if exists (select 1 from public.lc_user_roles r where r.user_id = test_host_user_id and r.role = 'HOST')
     or exists (select 1 from public.lc_hosts h where h.host_id = 500)
     or exists (select 1 from public.lc_program_templates t where t.template_id = 101)
     or exists (select 1 from public.lc_experiences e where e.experience_id = 101)
     or exists (select 1 from public.lc_sessions s where s.session_id = 1) then
    raise exception 'A demo row already exists; stop and inspect before retrying';
  end if;

  insert into public.lc_user_roles (user_id, role, assigned_by)
  values (test_host_user_id, 'HOST', null);

  insert into public.lc_hosts (
    host_id, auth_user_id, display_name, bio, page_slug, approval_status, is_public
  ) values (
    500, test_host_user_id, '시연 호스트', '로컬이음 테스트용 호스트입니다.',
    'demo-host', 'APPROVED', true
  );

  insert into public.lc_program_templates (
    template_id, title, description, duration_min, default_fee_amount, is_active
  ) values (
    101, '시장과 한국 음식', '테스트용 프로그램 원형입니다.', 120, 15000, true
  );

  insert into public.lc_experiences (
    experience_id, host_id, template_id, title, description, region_code, status
  ) values (
    101, 500, 101, '전통시장 함께 걷기', '테스트용 공개 체험입니다.',
    'SEOUL', 'PUBLISHED'
  );

  insert into public.lc_sessions (
    session_id, experience_id, starts_at, ends_at, meeting_place, recruit_deadline,
    min_people, capacity, fee_amount, status
  ) values (
    1, 101, timestamptz '2026-11-14 14:00:00+09',
    timestamptz '2026-11-14 16:00:00+09', '광장시장 정문 앞', null,
    3, 8, 15000, 'RECRUITING'
  );
end;
$seed$;

-- 명시적으로 넣은 시연 ID보다 큰 값부터 다음 자동 ID가 발급되도록 맞춘다.
select setval(pg_get_serial_sequence('public.lc_hosts', 'host_id'), (select max(host_id) from public.lc_hosts), true);
select setval(pg_get_serial_sequence('public.lc_program_templates', 'template_id'), (select max(template_id) from public.lc_program_templates), true);
select setval(pg_get_serial_sequence('public.lc_experiences', 'experience_id'), (select max(experience_id) from public.lc_experiences), true);
select setval(pg_get_serial_sequence('public.lc_sessions', 'session_id'), (select max(session_id) from public.lc_sessions), true);

commit;
