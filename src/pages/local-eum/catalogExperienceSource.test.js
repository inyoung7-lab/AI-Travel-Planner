import test from 'node:test';
import assert from 'node:assert/strict';
import { composeCatalogExperiences, includeLanguageFriendsDemoInCatalog, isLanguageFriendsDemoMode } from './catalogExperienceSource.js';
import { filterCatalogExperiences } from './experiencePresentation.js';
import { LANGUAGE_FRIENDS_DEMO } from './languageFriendsDemo.js';

test('synthetic experiences stay out of unrelated public catalog searches', () => {
  const params = new URLSearchParams('interest=MARKET_FOOD');
  const publicExperience = { experience_id: 101, status: 'PUBLISHED', demo_code: 'DEMO-PUBLIC-01' };
  const fixture = { experience_id: 'demo-lf-seoul-01', is_demo: true, demo_code: 'DEMO-LF-SEOUL-01' };

  assert.equal(isLanguageFriendsDemoMode(params), false);
  assert.equal(includeLanguageFriendsDemoInCatalog(params), false);
  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [publicExperience], demoExperiences: [fixture], demoMode: false }), [publicExperience]);

  params.set('demo', 'language-friends');
  assert.equal(isLanguageFriendsDemoMode(params), true);
  assert.equal(includeLanguageFriendsDemoInCatalog(params), true);
  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [publicExperience], demoExperiences: [fixture], demoMode: true }), [publicExperience, fixture]);
});

test('language-friends search returns published experiences without injecting draft fixtures', () => {
  const params = new URLSearchParams('interest=LANGUAGE_FRIENDS&recruiting=off');
  const demoMode = includeLanguageFriendsDemoInCatalog(params);
  assert.equal(demoMode, false);

  const published = [
    { experience_id: 113, region_code: 'SEOUL', status: 'PUBLISHED', title: '서울숲 언어 친구 산책', available_languages: [], sessions: [{ status: 'RECRUITING' }] },
    { experience_id: 114, region_code: 'BUSAN', status: 'PUBLISHED', title: '부산말로 시작하는 로컬 친구 산책', available_languages: [], sessions: [{ status: 'RECRUITING' }] },
    { experience_id: 115, region_code: 'CHANGWON', status: 'PUBLISHED', title: '창동예술촌 문화 친구 산책', available_languages: [], sessions: [{ status: 'RECRUITING' }] },
  ];
  const catalog = composeCatalogExperiences({ publishedExperiences: published, demoExperiences: LANGUAGE_FRIENDS_DEMO, demoMode });
  const visible = filterCatalogExperiences(catalog, { interest: 'LANGUAGE_FRIENDS', recruitingOnly: false });
  assert.deepEqual(visible.map(item => item.region_code).sort(), ['BUSAN', 'CHANGWON', 'SEOUL']);

  params.set('recruiting', 'on');
  assert.equal(includeLanguageFriendsDemoInCatalog(params), false);
});

test('live language-friends data suppresses its mapped demo fixture after publication', () => {
  const published = { experience_id: 113, demo_code: null, status: 'PUBLISHED' };
  const fixture = { experience_id: 'demo-lf-seoul-01', database_experience_id: 113, demo_code: 'DEMO-LF-SEOUL-01', is_demo: true };

  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [published], demoExperiences: [fixture], demoMode: true }), [published]);
});
