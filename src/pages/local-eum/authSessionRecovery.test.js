import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthSessionRecovery } from './authSessionRecovery.js';

const expired = { data: null, error: { code: 'PGRST303', message: 'JWT expired' } };
const session = (token = 'old', id = 'host-1') => ({ access_token: token, user: { id } });

function authStub(refresh) {
  let current = session();
  return {
    refreshes: 0, signouts: 0,
    getSession: async () => ({ data: { session: current }, error: null }),
    async refreshSession() { this.refreshes++; const result = await refresh(); current = result.data.session; return result; },
    async signOut(options) { assert.equal(options.scope, 'local'); this.signouts++; current = null; return { error: null }; },
  };
}

test('server-expired JWT refreshes even when the local SDK still sees a session', async () => {
  const auth = authStub(async () => ({ data: { session: session('new') }, error: null }));
  const recover = createAuthSessionRecovery(auth);
  let requests = 0;
  const result = await recover(async () => ++requests === 1 ? expired : { data: { role: 'HOST' }, error: null }, 'host-1');
  assert.equal(result.data.role, 'HOST');
  assert.equal(requests, 2);
  assert.equal(auth.refreshes, 1);
});

test('concurrent expired reads share a refresh', async () => {
  const auth = authStub(async () => { await new Promise(resolve => setTimeout(resolve, 5)); return { data: { session: session('new') }, error: null }; });
  const recover = createAuthSessionRecovery(auth);
  const operation = () => { let calls = 0; return async () => ++calls === 1 ? expired : { data: 'ok', error: null }; };
  await Promise.all([recover(operation(), 'host-1'), recover(operation(), 'host-1')]);
  assert.equal(auth.refreshes, 1);
});

test('revoked refresh session is cleared locally and requests login', async () => {
  const auth = authStub(async () => ({ data: { session: null }, error: { status: 400, code: 'refresh_token_not_found' } }));
  await assert.rejects(createAuthSessionRecovery(auth)(async () => expired, 'host-1'), { code: 'AUTH_SESSION_EXPIRED' });
  assert.equal(auth.signouts, 1);
});

test('network refresh failure preserves the session and does not replay the query', async () => {
  const auth = authStub(async () => ({ data: { session: session() }, error: { status: 0, message: 'Failed to fetch' } }));
  let requests = 0;
  await assert.rejects(createAuthSessionRecovery(auth)(async () => { requests++; return expired; }, 'host-1'), { code: 'AUTH_REFRESH_FAILED' });
  assert.equal(auth.signouts, 0);
  assert.equal(requests, 1);
});

test('permission errors do not trigger refresh and a changed account is not retried', async () => {
  const auth = authStub(async () => ({ data: { session: session('new', 'host-2') }, error: null }));
  const recover = createAuthSessionRecovery(auth);
  const forbidden = { data: null, error: { code: '42501', message: 'permission denied' } };
  assert.equal(await recover(async () => forbidden, 'host-1'), forbidden);
  assert.equal(auth.refreshes, 0);
  let requests = 0;
  await assert.rejects(recover(async () => { requests++; return expired; }, 'host-1'), { code: 'AUTH_ACCOUNT_CHANGED' });
  assert.equal(requests, 1);
});

test('a second expiry stops after one replay', async () => {
  const auth = authStub(async () => ({ data: { session: session('new') }, error: null }));
  let requests = 0;
  await assert.rejects(createAuthSessionRecovery(auth)(async () => { requests++; return expired; }, 'host-1'), { code: 'AUTH_SESSION_EXPIRED' });
  assert.equal(requests, 2);
  assert.equal(auth.refreshes, 1);
});
