-- LOCAL EUM / 여행, 한걸음 — 호스트 스튜디오 안내 문구 컬럼 추가 초안
-- 대상: local-eum-dev / rhkaxmqdkztpbljkunxb
-- 기존 5개 테이블을 유지하고 public.lc_hosts에 표시 문구 2개만 추가합니다.
-- 이 파일은 설계 초안입니다. 승인 전 Supabase에서 실행하지 마세요.

begin;

alter table public.lc_hosts
  add column if not exists host_studio_title text not null
    default '운영 회차를 다듬어 볼까요?'
    check (char_length(btrim(host_studio_title)) between 1 and 80),
  add column if not exists host_studio_description text not null
    default '운영 날짜와 시간, 모집 인원, 참가비, 장소를 한곳에서 확인하고 변경할 수 있습니다.'
    check (char_length(btrim(host_studio_description)) between 1 and 240);

comment on column public.lc_hosts.host_studio_title is
  '호스트 스튜디오 상단 제목. Supabase Dashboard에서 편집하며 일반 앱 사용자는 읽기 전용.';
comment on column public.lc_hosts.host_studio_description is
  '호스트 스튜디오 상단 설명. Supabase Dashboard에서 편집하며 일반 앱 사용자는 읽기 전용.';

-- React HOST 화면에서 본인 호스트의 두 문구를 읽고 저장할 수 있도록 컬럼 권한을 줍니다.
grant select (host_studio_title, host_studio_description)
  on public.lc_hosts to authenticated;
grant update (host_studio_title, host_studio_description)
  on public.lc_hosts to authenticated;

-- HOST는 본인 호스트 행, ADMIN은 모든 호스트 행의 문구를 수정할 수 있습니다.
-- 새 정책만 추가하며 기존 읽기 정책이나 다른 테이블의 정책은 바꾸지 않습니다.
do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lc_hosts'
      and policyname = 'lc_hosts_update_studio_copy_owner_or_admin'
  ) then
    create policy lc_hosts_update_studio_copy_owner_or_admin
      on public.lc_hosts
      for update
      to authenticated
      using (
        lc_private.lc_owns_host(host_id)
        or (select lc_private.lc_has_role('ADMIN'))
      )
      with check (
        lc_private.lc_owns_host(host_id)
        or (select lc_private.lc_has_role('ADMIN'))
      );
  end if;
end;
$policy$;

commit;
