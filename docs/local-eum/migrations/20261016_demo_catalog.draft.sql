-- 승인 대기 / local-eum-dev / rhkaxmqdkztpbljkunxb
-- 선행: 20261016_experience_details_places.draft.sql
-- 기존 행을 갱신하지 않고 식별 컬럼·제약만 추가한다. 시드는 별도 파일.
begin;
set local lock_timeout = '5s';

alter table public.lc_experiences
  add column is_demo boolean not null default false,
  add column demo_code text unique check (demo_code ~ '^DEMO-[A-Z0-9-]{2,48}$'),
  add constraint lc_experiences_demo_marker check (demo_code is null or is_demo);
alter table public.lc_places
  add column seed_code text unique check (seed_code ~ '^LE-DEMO-[A-Z0-9-]+$');
alter table public.lc_sessions
  add column seed_code text unique check (seed_code ~ '^LE-DEMO-[A-Z0-9-]+$');
alter table public.lc_program_templates
  add column seed_code text unique check (seed_code ~ '^LE-DEMO-[A-Z0-9-]+$');

comment on column public.lc_experiences.is_demo is '시연용·실제 예약 불가 여부. HOST 브라우저에서 제거할 권한 없음.';
comment on column public.lc_experiences.demo_code is 'DEMO-01 등 중복 방지용 고유 시연 코드. 최초 등록 후 시드는 내용을 덮어쓰지 않음.';
-- 기존 테이블 SELECT 권한은 새 컬럼을 포함한다. 신규 컬럼의 클라이언트 쓰기 권한은 부여하지 않는다.
commit;
