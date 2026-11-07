import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SERVICE_POLICY_VERSION } from '../shared/servicePolicies.js';
import { signupRequest } from '../src/pages/signupForm.js';

test('consent draft validates signup, records server time, preserves old users and restricts reads/writes', async () => {
  const db = new PGlite();
  const legacy = '00000000-0000-0000-0000-000000000001';
  const owner = '00000000-0000-0000-0000-000000000002';
  const other = '00000000-0000-0000-0000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      insert into auth.users values('${legacy}','{}');`);
    await db.exec(await readFile(new URL('../docs/reviews/20261107_signup_consent.review.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('select * from public.travel_signup_consents')).rows.length, 0);
    const request = signupRequest({ user_name: '테스트', email: 'synthetic@example.com', password: 'synthetic-password', passwordConfirm: 'synthetic-password', termsAgreement: 'accepted', privacyAgreement: 'accepted' });
    const metadata = { ...request.options.data, accepted_at: '2000-01-01T00:00:00Z' };
    await db.query('insert into auth.users values($1,$2)', [owner, JSON.stringify(metadata)]);
    const row = (await db.query('select * from public.travel_signup_consents')).rows[0];
    assert.equal(row.terms_version, SERVICE_POLICY_VERSION);
    assert.equal(row.privacy_version, SERVICE_POLICY_VERSION);
    assert.notEqual(new Date(row.accepted_at).getUTCFullYear(), 2000);
    for (const data of [{}, { travel_consent: { ...metadata.travel_consent, terms_accepted: false } }, { travel_consent: { ...metadata.travel_consent, privacy_version: 'old' } }]) {
      await assert.rejects(db.query('insert into auth.users values($1,$2)', [other, JSON.stringify(data)]), /Current terms and privacy consent required/);
    }
    await db.query('update auth.users set raw_user_meta_data=$1 where id=$2', ['{}', owner]);
    assert.equal((await db.query('select * from public.travel_signup_consents')).rows.length, 1);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
    assert.equal((await db.query('select * from public.travel_signup_consents')).rows.length, 1);
    await assert.rejects(db.query('delete from public.travel_signup_consents'), /permission denied/);
    await assert.rejects(db.query("update public.travel_signup_consents set terms_version='forged'"), /permission denied/);
    await assert.rejects(db.query(`insert into public.travel_signup_consents(user_id,terms_version,privacy_version) values('${other}','forged','forged')`), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub','${legacy}',false);`);
    assert.equal((await db.query('select * from public.travel_signup_consents')).rows.length, 0);
    await db.exec('reset role;set role anon;');
    await assert.rejects(db.query('select * from public.travel_signup_consents'), /permission denied/);
  } finally { await db.close(); }
});
