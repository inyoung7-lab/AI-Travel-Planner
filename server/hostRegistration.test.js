import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const owner='00000000-0000-0000-0000-000000000011',other='00000000-0000-0000-0000-000000000012';
test('members register and update only their own private host profile without self-approval or ADMIN access',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values('${owner}'),('${other}');`);
  await db.exec(await readFile(new URL('../docs/local-eum/initial_schema.draft.sql',import.meta.url),'utf8'));
  await db.exec(`grant update(display_name,bio) on public.lc_hosts to authenticated;
   create policy lc_hosts_update_profile on public.lc_hosts for update to authenticated using(lc_private.lc_owns_host(host_id)) with check(lc_private.lc_owns_host(host_id));
   insert into public.lc_hosts(auth_user_id,display_name,approval_status,is_public) values('${other}','기존 호스트','APPROVED',false);`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610250003_host_self_registration.sql',import.meta.url),'utf8'));
  const asUser=async(user,sql)=>{await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`);return db.query(sql);};
  const id=(await asUser(owner,"select public.lc_register_my_host_profile(' 나의 호스트 ','소개') id")).rows[0].id;
  const profile=(await db.query(`select host_id,display_name,approval_status,is_public from public.lc_hosts where host_id=${id}`)).rows[0];
  assert.equal(profile.display_name,'나의 호스트');assert.equal(profile.approval_status,'PENDING');assert.equal(profile.is_public,false);
  assert.equal((await db.query('select * from public.lc_user_roles')).rows[0].role,'HOST');
  assert.equal((await db.query('select host_id from public.lc_hosts')).rows.length,1);
  assert.equal((await asUser(owner,"select public.lc_register_my_host_profile('덮어쓰지 않음','') id")).rows[0].id,id);
  assert.equal((await db.query(`select display_name from public.lc_hosts where host_id=${id}`)).rows[0].display_name,'나의 호스트');
  await db.query(`update public.lc_hosts set bio='수정한 소개' where host_id=${id}`);
  assert.equal((await db.query(`select bio from public.lc_hosts where host_id=${id}`)).rows[0].bio,'수정한 소개');
  await assert.rejects(db.query(`update public.lc_hosts set approval_status='APPROVED' where host_id=${id}`),/permission denied/);
  await assert.rejects(db.query(`insert into public.lc_user_roles(user_id,role) values('${owner}','ADMIN')`),/permission denied/);
  assert.equal((await asUser(other,`select host_id from public.lc_hosts where host_id=${id}`)).rows.length,0);
  assert.equal((await db.query(`update public.lc_hosts set bio='다른 회원' where host_id=${id} returning host_id`)).rows.length,0);
  await assert.rejects(asUser(owner,"select public.lc_register_my_host_profile(' ','')"),/check_violation/);
  await db.exec(`reset role;update public.lc_hosts set approval_status='SUSPENDED' where host_id=${id};`);
  await assert.rejects(asUser(owner,"select public.lc_register_my_host_profile('재등록','')"),/insufficient_privilege/);
  await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(db.query("select public.lc_register_my_host_profile('익명','')"),/permission denied/);
 } finally {await db.close();}
});
