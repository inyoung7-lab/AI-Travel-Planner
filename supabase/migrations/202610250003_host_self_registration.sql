-- Signed-in members may create one private host profile owned by themselves.
-- Existing host approval/publication and experience ownership policies are unchanged.
begin;
set local lock_timeout='5s';
-- Seeded host IDs may have been inserted explicitly; keep the identity sequence ahead.
lock table public.lc_hosts in share row exclusive mode;
do $$ declare v_sequence text;v_last bigint;v_max bigint;begin
 v_sequence:=pg_get_serial_sequence('public.lc_hosts','host_id');
 if v_sequence is not null then
  execute format('select last_value from %s',v_sequence) into v_last;
  select max(host_id) into v_max from public.lc_hosts;
  if v_max>v_last then perform setval(v_sequence::regclass,v_max,true);end if;
 end if;
end $$;
create function public.lc_register_my_host_profile(p_display_name text,p_bio text default '')
returns bigint language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid();v_host_id bigint;v_status text;begin
 if v_user is null then raise insufficient_privilege;end if;
 if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80
 or char_length(coalesce(p_bio,''))>2000 then raise check_violation;end if;
 perform pg_advisory_xact_lock(hashtextextended('host-registration:'||v_user::text,0));
 select host_id,approval_status into v_host_id,v_status from public.lc_hosts where auth_user_id=v_user;
 if v_status='SUSPENDED' then raise insufficient_privilege;end if;
 if v_host_id is null then
  insert into public.lc_hosts(auth_user_id,display_name,bio,approval_status,is_public)
  values(v_user,btrim(p_display_name),nullif(btrim(p_bio),''),'PENDING',false) returning host_id into v_host_id;
 end if;
 insert into public.lc_user_roles(user_id,role,assigned_by) values(v_user,'HOST',v_user)
 on conflict(user_id,role) do nothing;
 return v_host_id;
end $$;
revoke all on function public.lc_register_my_host_profile(text,text) from public,anon;
grant execute on function public.lc_register_my_host_profile(text,text) to authenticated;
comment on function public.lc_register_my_host_profile(text,text) is
 'Creates or returns only the caller own private PENDING host profile and HOST membership; never grants ADMIN or approval.';
-- Server-side account maintenance must be able to remove a host before deleting its Auth user.
grant select,delete on public.lc_hosts to service_role;
commit;
