import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { summarizeActivity, summarizePlaceActivity, recordSearchActivity } from './siteActivity.js';

test('Korean midnight boundaries, missing days, and separate search/view signals', () => {
  const data = summarizeActivity([
    { kind: 'search', occurred_at: '2026-10-24T15:01:00Z' },
    { kind: 'search', occurred_at: '2026-10-24T14:59:00Z' },
    { kind: 'result', occurred_at: '2026-10-25T00:00:00Z', place_key: '1', place: { id: 1, name: '경복궁' } },
    { kind: 'view', occurred_at: '2026-10-25T00:01:00Z', place_key: '1', place: { id: 1, name: '경복궁' } },
    { kind: 'search', occurred_at: '2026-10-18T00:00:00Z' },
  ], new Date('2026-10-25T05:00:00Z'));
  assert.equal(data.days.length, 7);
  assert.deepEqual(data.days.at(-1), { date: '2026-10-25', searches: 1, views: 1 });
  assert.equal(data.days.at(-2).searches, 1);
  assert.equal(data.days[0].searches, 0);
  assert.equal(data.items[0].score, 2);
  assert.equal(data.items[0].searches, 1);
});
test('activity storage is server-only, deduplicates views, imports actual search dates', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create table public.travel_search_log(search_id bigint,searched_at timestamptz);
      insert into public.travel_search_log values(1,'2026-10-24T15:01:00Z');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610250004_site_activity.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('select count(*)::int n from travel_site_activity')).rows[0].n, 1);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from travel_site_activity'), /permission denied/);
    await db.exec('reset role;set role service_role');
    await db.exec(`insert into travel_site_activity(event_key,kind,place_key,place) values('view-key','view','1','{"id":1}');`);
    await assert.rejects(db.exec(`insert into travel_site_activity(event_key,kind,place_key,place) values('view-key','view','1','{"id":1}');`), /unique/);
  } finally { await db.close(); }
});

test('place comparison separates two Korean weeks and excludes future events', () => {
 const stats = summarizePlaceActivity([
  {kind:'result',occurred_at:'2026-10-25T00:00:00Z'},
  {kind:'view',occurred_at:'2026-10-18T00:00:00Z'},
  {kind:'view',occurred_at:'2026-10-26T00:00:00Z'}
 ], new Date('2026-10-25T05:00:00Z'));
 assert.equal(stats.current.at(-1).searches,1);
 assert.equal(stats.previous.at(-1).views,1);
 assert.equal(stats.current.reduce((n,d)=>n+d.views,0),0);
 assert.equal(stats.scope,'all_authenticated_members');
});
test('anonymous search cannot record member activity', async () => {
 await recordSearchActivity([{id:1}], {});
});
