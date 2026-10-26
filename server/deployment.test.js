import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel API uses the same app without opening a listening port', async (t) => {
  const settings = {
    TRAVEL_SEARCH_HISTORY_STORE: 'disabled',
    SUPABASE_URL: 'https://deployment-test.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'deployment-test-public-key',
  };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { default: app } = await import('../api/index.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const missing = await fetch(`${base}/api/no-such-route`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type'), /application\/json/);
    const privateApi = await fetch(`${base}/api/mytrip/overview`);
    assert.equal(privateApi.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('deployment routes API before SPA and keeps server code in the upload', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.rewrites[0].source, '/api/:path*');
  assert.equal(config.rewrites[0].destination, '/api');
  assert.equal(config.rewrites[1].destination, '/index.html');
  const ignored = (await readFile(new URL('../.vercelignore', import.meta.url), 'utf8')).split(/\r?\n/);
  assert.ok(!ignored.includes('server'));
  assert.ok(ignored.includes('deliverables'));
});
