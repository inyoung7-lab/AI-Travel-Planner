import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LANGUAGE_FRIENDS_DEMO,
  filterLanguageFriendsDemo,
  getLanguageFriendsDatabaseExperienceId,
  getLanguageFriendsDemoExperience,
} from './languageFriendsDemo.js';

test('language and friends demo contains exactly one draft experience per selected city', () => {
  assert.equal(LANGUAGE_FRIENDS_DEMO.length, 3);
  assert.deepEqual(LANGUAGE_FRIENDS_DEMO.map(item => item.region_code), ['SEOUL', 'BUSAN', 'CHANGWON']);
  assert.ok(LANGUAGE_FRIENDS_DEMO.every(item => item.host_id === 500));
  assert.ok(LANGUAGE_FRIENDS_DEMO.every(item => item.status === 'DRAFT' && item.is_demo));
  assert.deepEqual(filterLanguageFriendsDemo({ interest: 'LANGUAGE_FRIENDS' }), []);
  assert.deepEqual(filterLanguageFriendsDemo({ demoMode: true, interest: 'LANGUAGE_FRIENDS' }), LANGUAGE_FRIENDS_DEMO);
  assert.equal(filterLanguageFriendsDemo({ demoMode: true, interest: 'LANGUAGE_FRIENDS', region: 'BUSAN' }).length, 1);
});

test('planned and simulated languages never become verified delivery languages', () => {
  assert.ok(LANGUAGE_FRIENDS_DEMO.every(item => item.available_languages.length === 0));
  assert.deepEqual(filterLanguageFriendsDemo({ demoMode: true, programLanguages: ['en'] }), []);
  assert.deepEqual(filterLanguageFriendsDemo({ demoMode: true, programLanguages: ['ja'] }), []);
});

test('each draft schedule has six steps totaling 90 minutes and cannot be filtered as recruiting', () => {
  for (const item of LANGUAGE_FRIENDS_DEMO) {
    assert.equal(item.steps.length, 6);
    assert.equal(item.steps.reduce((total, step) => total + step.duration_min, 0), 90);
    assert.equal(item.sessions.length, 1);
    assert.equal(item.sessions[0].status, 'DRAFT');
  }
  assert.deepEqual(filterLanguageFriendsDemo({ demoMode: true, recruitingOnly: true }), []);
});

test('demo fee and language metadata match the verified demo state', () => {
  assert.deepEqual(LANGUAGE_FRIENDS_DEMO.map(item => item.sessions[0].fee_amount), [10000, 0, 10000]);
  assert.ok(LANGUAGE_FRIENDS_DEMO.every(item => item.available_languages.length === 0));
});

test('venue records include official source and no invented coordinates', () => {
  for (const item of LANGUAGE_FRIENDS_DEMO) {
    assert.ok(item.venue.road_address);
    assert.match(item.venue.source_reference, /^https:\/\//);
    assert.equal(item.venue.latitude, null);
    assert.equal(item.venue.longitude, null);
  }
});

test('each demo has a bundled generated cover image and useful alternative text', () => {
  for (const item of LANGUAGE_FRIENDS_DEMO) {
    const url = new URL(item.hero_image_url);
    assert.equal(url.host, 'rhkaxmqdkztpbljkunxb.supabase.co');
    const objectPath = url.pathname.replace('/storage/v1/object/public/local-eum-media/', '');
    assert.ok(existsSync(resolve(process.cwd(), 'public/images/local-eum', objectPath)));
    assert.match(item.hero_image_alt, /AI 생성 이미지/);
  }
  const changwon = LANGUAGE_FRIENDS_DEMO.find(item => item.region_code === 'CHANGWON');
  assert.ok(changwon.hero_image_url.endsWith('/experiences/115/cover-v2.webp'));
  assert.match(changwon.description, /도심 한복판의 좁은/);
  assert.doesNotMatch(changwon.description, /바다|해안|항구/);
});

test('slug lookup is explicit and never falls back to a database numeric ID', () => {
  assert.equal(getLanguageFriendsDemoExperience('demo-lf-seoul-01')?.experience_id, 'demo-lf-seoul-01');
  assert.equal(getLanguageFriendsDemoExperience('101'), null);
  assert.deepEqual(LANGUAGE_FRIENDS_DEMO.map(item => getLanguageFriendsDatabaseExperienceId(item.experience_id)), [113, 114, 115]);
  assert.equal(getLanguageFriendsDatabaseExperienceId('unknown'), null);
});
