// Offline-only SQL verification. No .env, network, real accounts or remote database.
// Run: node scripts/local-eum/check-demo-sql.mjs <absolute PGlite dist/index.js path>
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../../',import.meta.url));
const { PGlite }=await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db=new PGlite();
const uid='11111111-1111-4111-8111-111111111111';
const sql=async path=>readFile(resolve(root,'docs/local-eum',path),'utf8');
const rows=async (query,args=[]) => (await db.query(query,args)).rows;
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    insert into auth.users values('${uid}');`);
  await db.exec(await sql('initial_schema.draft.sql'));
  await db.exec((await sql('seed_demo.sql')).replaceAll('__TEST_HOST_AUTH_USER_UUID__',uid));
  await db.exec(`insert into public.lc_program_templates(template_id,title,duration_min,default_fee_amount,is_active)
    values(102,'골목 공방 하루',120,18000,true);
    insert into public.lc_experiences(experience_id,host_id,template_id,title,description,region_code,status)
    values(102,500,102,'성수동 공방 체험','동네 공방에서 손작업을 경험하는 체험입니다.','SEOUL','PUBLISHED');
    update public.lc_experiences set description='시장 먹거리를 함께 둘러보는 체험입니다.' where experience_id=101;
    insert into public.lc_sessions(session_id,experience_id,starts_at,ends_at,meeting_place,min_people,capacity,fee_amount,status)
    values(2,101,'2026-11-21 14:00+09','2026-11-21 16:00+09','광장시장 정문 앞',2,8,18000,'RECRUITING'),
    (3,102,'2026-11-15 11:00+09','2026-11-15 13:00+09','성수역 3번 출구 앞',2,6,18000,'RECRUITING'),
    (4,102,'2026-11-22 11:00+09','2026-11-22 13:00+09','성수동 공방 입구',2,6,20000,'RECRUITING');`);
  const protectedRows=await rows('select * from public.lc_sessions order by session_id');
  if(process.argv.includes('--combined')) await db.exec(await sql('apply_demo_catalog.review.sql'));
  else {
    await db.exec(await sql('migrations/20261016_experience_details_places.draft.sql'));
    await db.exec(await sql('migrations/20261016_demo_catalog.draft.sql'));
    await db.exec(await sql('seed_demo_catalog.draft.sql'));
  }
  const counts=async()=>({experiences:(await rows('select count(*)::int n from public.lc_experiences where is_demo'))[0].n,
    steps:(await rows('select count(*)::int n from public.lc_experience_steps'))[0].n,
    places:(await rows('select count(*)::int n from public.lc_places'))[0].n,
    sessions:(await rows('select count(*)::int n from public.lc_sessions'))[0].n});
  assert.deepEqual(await counts(),{experiences:10,steps:40,places:11,sessions:14});
  const afterRows=await rows('select * from public.lc_sessions where session_id in(1,2,3,4) order by session_id');
  assert.deepEqual(afterRows.map(({meeting_place_id:_meeting,seed_code:_seed,...original})=>original),protectedRows);
  assert.ok(afterRows.every(row=>row.meeting_place_id===null && row.seed_code===null));
  assert.equal((await rows('select description from public.lc_experiences where experience_id=102'))[0].description,'동네 공방에서 손작업을 경험하는 체험입니다.');
  assert.equal((await rows("select count(*)::int n from public.lc_places where latitude is not null or longitude is not null"))[0].n,0);
  console.log('PASS 10 experiences / 40 steps / 11 places / 14 sessions; all 4 old sessions and original short description preserved; no invented coordinates');
  const outputIndex=process.argv.indexOf('--fixture-output');
  if(outputIndex>=0) {
    const fixture={};
    for(const table of ['lc_experiences','lc_sessions','lc_experience_steps','lc_places','lc_program_templates']) fixture[table]=await rows(`select * from public.${table}`);
    fixture.lc_hosts=await rows('select host_id,display_name,bio,page_slug,approval_status,is_public from public.lc_hosts');
    await writeFile(process.argv[outputIndex+1],JSON.stringify(fixture,null,2));
    console.log('Prepared offline browser fixture from migrated SQL (not remote Supabase data)');
  }
  await db.exec("update public.lc_sessions set fee_amount=19000 where seed_code='LE-DEMO-01-SESSION'");
  await db.exec(await sql('seed_demo_catalog.draft.sql'));
  assert.deepEqual(await counts(),{experiences:10,steps:40,places:11,sessions:14});
  assert.equal((await rows("select fee_amount from public.lc_sessions where seed_code='LE-DEMO-01-SESSION'"))[0].fee_amount,19000);
  console.log('PASS repeat seed creates no duplicates and preserves later HOST edits');
  await db.exec('set role anon');
  assert.equal((await rows('select * from public.lc_experiences where is_demo')).length,10);
  assert.equal((await rows('select * from public.lc_experience_steps')).length,40);
  assert.equal((await rows('select * from public.lc_places')).length,11);
  await db.exec('reset role');
  await rows("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
  await db.exec('set role authenticated');
  const protectedValue=(await rows('select updated_at from public.lc_sessions where session_id=1'))[0].updated_at;
  await rows('update public.lc_sessions set fee_amount=18000 where session_id=1 and updated_at=$1',[protectedValue]);
  let rejected=false;
  try { await db.exec("update public.lc_experiences set is_demo=false where experience_id=102"); } catch(error) { rejected=error.code==='42501'; }
  assert.equal(rejected,true);
  console.log('PASS anon sees seeded catalog and HOST fee update retains RLS; HOST cannot remove demo label');
  console.log('ALL OFFLINE DEMO SQL CHECKS PASSED; no Supabase changes made');
} finally { await db.close(); }
