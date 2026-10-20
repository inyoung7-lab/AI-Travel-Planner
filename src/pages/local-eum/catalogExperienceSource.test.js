import test from 'node:test';
import assert from 'node:assert/strict';
import { composeCatalogExperiences, isLanguageFriendsDemoMode } from './catalogExperienceSource.js';

test('synthetic experiences are excluded unless the explicit demo query is present', () => {
  const params = new URLSearchParams('interest=LANGUAGE_FRIENDS');
  const publicExperience = { experience_id: 101, status: 'PUBLISHED', demo_code: 'DEMO-PUBLIC-01' };
  const fixture = { experience_id: 'demo-lf-seoul-01', is_demo: true, demo_code: 'DEMO-LF-SEOUL-01' };

  assert.equal(isLanguageFriendsDemoMode(params), false);
  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [publicExperience], demoExperiences: [fixture], demoMode: false }), [publicExperience]);

  params.set('demo', 'language-friends');
  assert.equal(isLanguageFriendsDemoMode(params), true);
  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [publicExperience], demoExperiences: [fixture], demoMode: true }), [publicExperience, fixture]);
});

test('a published Supabase row takes precedence over a matching demo fixture', () => {
  const published = { experience_id: 113, demo_code: 'DEMO-LF-SEOUL-01', status: 'PUBLISHED' };
  const fixture = { experience_id: 'demo-lf-seoul-01', demo_code: 'DEMO-LF-SEOUL-01', is_demo: true };

  assert.deepEqual(composeCatalogExperiences({ publishedExperiences: [published], demoExperiences: [fixture], demoMode: true }), [published]);
});
