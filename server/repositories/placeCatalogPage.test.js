import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogPageReader } from './placeDetailRepository.js';

function fixture({ read, stats } = {}) {
  const queries = [];
  let statCalls = 0;
  const client = {
    rpc(name) { assert.equal(name, 'travel_tour_catalog_counts'); statCalls++; return Promise.resolve(stats ? stats(statCalls) : { data: { total: 50, regions: { 서울: 20, 부산: 30 } }, error: null }); },
    from(table) {
      assert.equal(table, 'travel_saved_tour_catalog');
      const record = { filters: [], orders: [] };
      const query = {
        select(fields, options) { record.fields = fields; record.options = options; return query; },
        eq(...args) { record.filters.push(['eq', ...args]); return query; },
        ilike(...args) { record.filters.push(['ilike', ...args]); return query; },
        order(field) { record.orders.push(field); return query; },
        range(start, end) { record.range = [start, end]; return query; },
        then(resolve, reject) {
          queries.push(record);
          const result = read ? read(record) : { data: record.options?.head ? null : [{ place_id: (record.range?.[0] || 0) + 1, name: '여행지', region: '서울', detail: {} }], count: record.options?.head ? 12 : null, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, queries, get statCalls() { return statCalls; } };
}

test('pages never combine row retrieval with an exact count; overall and region totals reuse aggregate counts', async () => {
  const f = fixture();
  const list = createCatalogPageReader({ getClient: () => f.client });
  const first = await list({ page: 1 });
  const second = await list({ page: 2 });
  const seoul = await list({ region: '서울' });
  assert.equal(first.total, 50);
  assert.equal(second.items[0].id, 25);
  assert.equal(seoul.total, 20);
  assert.equal(f.statCalls, 1);
  assert.equal(f.queries.length, 3);
  assert.ok(f.queries.every(query => !query.options?.count));
  assert.deepEqual(f.queries[1].range, [24, 47]);
});

test('search counts use a cached HEAD query with identical filters and escaped wildcard characters', async () => {
  const f = fixture();
  const list = createCatalogPageReader({ getClient: () => f.client });
  const first = await list({ page: 1, q: '  해변%_  ', region: '서울' });
  await list({ page: 2, q: '해변%_', region: '서울' });
  assert.equal(first.total, 12);
  const counts = f.queries.filter(query => query.options?.head);
  const pages = f.queries.filter(query => !query.options?.head);
  assert.equal(counts.length, 1);
  assert.deepEqual(counts[0].options, { count: 'exact', head: true });
  assert.deepEqual(counts[0].filters, pages[0].filters);
  assert.deepEqual(counts[0].filters.at(-1), ['ilike', 'search_text', '%해변\\%\\_%']);
  assert.equal(pages.length, 2);
});

test('identical in-flight reads and normalized all-region URLs share one page request', async () => {
  const f = fixture();
  const list = createCatalogPageReader({ getClient: () => f.client });
  const [one, two] = await Promise.all([list({ region: '전체', q: ' ' }), list()]);
  assert.deepEqual(one, two);
  assert.equal(f.queries.length, 1);
  assert.equal(f.statCalls, 1);
});

test('a failed page is evicted so a later retry can recover', async () => {
  let calls = 0;
  const f = fixture({ read: () => ++calls <= 2 ? { error: { code: '57014', message: 'timeout' } } : { data: [], error: null } });
  const list = createCatalogPageReader({ getClient: () => f.client });
  await assert.rejects(list(), error => error.code === '57014');
  assert.deepEqual((await list()).items, []);
  assert.equal(calls, 3);
});

test('failed aggregate counts are evicted rather than cached as a successful empty catalog', async () => {
  const f = fixture({ stats: calls => calls <= 2 ? { error: { code: '57014', message: 'timeout' } } : { data: { total: 50, regions: { 서울: 20 } }, error: null } });
  const list = createCatalogPageReader({ getClient: () => f.client });
  await assert.rejects(list(), error => error.code === '57014');
  assert.equal((await list()).total, 50);
  assert.equal(f.statCalls, 3);
});

test('one transient read timeout is retried, while permission errors are not replayed', async () => {
  let calls = 0;
  const f = fixture({ read: () => ++calls === 1 ? { error: { code: '57014', message: 'timeout' } } : { data: [], error: null } });
  const list = createCatalogPageReader({ getClient: () => f.client });
  assert.deepEqual((await list()).items, []);
  assert.equal(calls, 2);
  let denied = 0;
  const restricted = fixture({ read: () => { denied++; return { error: { code: '42501', message: 'denied' } }; } });
  await assert.rejects(createCatalogPageReader({ getClient: () => restricted.client })(), error => error.code === '42501' && error.catalogStage === 'page');
  assert.equal(denied, 1);
});

test('page cache expires before aggregate and search-count caches', async () => {
  let now = 0;
  const f = fixture();
  const list = createCatalogPageReader({ getClient: () => f.client, now: () => now });
  await list({ q: '해변' });
  now = 61000;
  await list({ q: '해변' });
  assert.equal(f.statCalls, 1);
  assert.equal(f.queries.filter(query => query.options?.head).length, 1);
  now = 301000;
  await list({ q: '해변' });
  assert.equal(f.statCalls, 2);
  assert.equal(f.queries.filter(query => query.options?.head).length, 2);
});
