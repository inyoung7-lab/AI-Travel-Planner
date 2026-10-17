-- 읽기 전용 확인 쿼리: Table Editor 또는 SQL Editor에서 실행한다.
-- 시연 회차와 그 부모 행이 연결되고 회비가 15,000원인지 확인한다.
select
  s.session_id,
  s.experience_id,
  e.host_id,
  e.template_id,
  s.starts_at,
  s.ends_at,
  s.min_people,
  s.capacity,
  s.fee_amount,
  s.meeting_place,
  s.status,
  s.updated_at
from public.lc_sessions s
join public.lc_experiences e on e.experience_id = s.experience_id
where s.session_id = 1;

-- 다섯 테이블의 RLS 활성 상태와 등록된 정책을 점검한다.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('lc_user_roles', 'lc_hosts', 'lc_program_templates', 'lc_experiences', 'lc_sessions')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('lc_user_roles', 'lc_hosts', 'lc_program_templates', 'lc_experiences', 'lc_sessions')
order by tablename, policyname;
