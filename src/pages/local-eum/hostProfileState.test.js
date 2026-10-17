import test from 'node:test';
import assert from 'node:assert/strict';
import { hasHostProfileChanges } from './hostProfileState.js';

test('a failed host profile load does not crash change detection', () => {
  assert.equal(hasHostProfileChanges(null), false);
  assert.equal(hasHostProfileChanges({ host: null, draft: null, error: 'HOST 권한이 없습니다.' }), false);
});

test('loaded host profile change detection compares name and bio', () => {
  const current = {
    host: { display_name: '마산 골목 이야기', bio: '기존 소개' },
    draft: { displayName: '마산 골목 이야기', bio: '기존 소개' },
  };
  assert.equal(hasHostProfileChanges(current), false);
  assert.equal(hasHostProfileChanges({ ...current, draft: { ...current.draft, bio: '새 소개' } }), true);
});
