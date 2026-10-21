import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../../../docs/local-eum/migrations/20261020_language_friends_itinerary_translations.review.sql', import.meta.url), 'utf8');

test('review SQL contains draft English and Japanese for all 18 Seoul, Busan, and Changwon steps', () => {
  const payloadRows = [...sql.matchAll(/^\s*\((11[3-5]),([1-6]),'[^']*','[^']*','[^']*','[^']*','[^']*'\),?$/gm)];
  assert.equal(payloadRows.length, 18);
  for (const experienceId of ['113', '114', '115']) {
    assert.equal(payloadRows.filter(([, id]) => id === experienceId).length, 6);
  }
  assert.match(sql, /'review_status', 'DRAFT'/);
  assert.match(sql, /changed <> 18/);
  assert.match(sql, /Expected to add 18 draft itinerary translations/);
  assert.match(sql, /does not change experience\/session status or available_languages/);
});
