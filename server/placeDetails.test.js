import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createCatalogHandler } from './placeDetails.js';

async function withApi(listCatalog, check) {
  const app = express();
  app.get('/api/places', createCatalogHandler(listCatalog));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await check(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('successful catalog responses preserve pagination and can be cached', async () => {
  await withApi(async options => {
    assert.deepEqual(options, { page: 2, q: '해변', region: '제주' });
    return { items: [{ id: 1 }], total: 50, page: 2, pageSize: 24 };
  }, async base => {
    const response = await fetch(`${base}/api/places?page=2&q=${encodeURIComponent('해변')}&region=${encodeURIComponent('제주')}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=30');
    assert.equal((await response.json()).total, 50);
  });
});

test('SQL timeout returns retryable 503 without caching or revealing database details', async () => {
  await withApi(async () => { throw Object.assign(new Error('internal-query-details'), { code: '57014' }); }, async base => {
    const response = await fetch(`${base}/api/places`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Retry-After'), '2');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /internal-query-details/);
  });
});

test('unexpected errors are not cached and a subsequent request can succeed', async () => {
  let calls = 0;
  await withApi(async () => {
    if (++calls === 1) throw new Error('private-error-detail');
    return { items: [], total: 0 };
  }, async base => {
    const failure = await fetch(`${base}/api/places`);
    assert.equal(failure.status, 500);
    assert.equal(failure.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await failure.text(), /private-error-detail/);
    assert.equal((await fetch(`${base}/api/places`)).status, 200);
  });
});
