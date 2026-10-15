import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBrowserIdentityMiddleware, loadBrowserCookieSecret } from "./browserIdentity.js";

test("issues a signed browser cookie and restores only the server-issued identifier", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "travel-cookie-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const secretPath = join(directory, "cookie-secret");
  const secret = await loadBrowserCookieSecret({ filePath: secretPath });
  const afterRestart = await loadBrowserCookieSecret({ filePath: secretPath });
  assert.deepEqual(afterRestart, secret);
  const configuredSecret = "stable-test-secret-with-at-least-32-bytes";
  const fromEnvironment = await loadBrowserCookieSecret({ filePath: secretPath, configuredSecret });
  const afterConfiguredRestart = await loadBrowserCookieSecret({ filePath: secretPath, configuredSecret });
  assert.deepEqual(fromEnvironment, afterConfiguredRestart);

  const middleware = createBrowserIdentityMiddleware({ secret, secure: false });
  const firstRes = { headers: {}, setHeader(name, value) { this.headers[name] = value; } };
  const firstReq = { headers: { cookie: "actorKey=attacker-chosen" } };
  middleware(firstReq, firstRes, () => {});
  assert.match(firstReq.browserId, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(firstRes.headers["Set-Cookie"], /HttpOnly/u);
  assert.match(firstRes.headers["Set-Cookie"], /SameSite=Lax/u);
  assert.doesNotMatch(firstRes.headers["Set-Cookie"], /Secure/u);

  const cookiePair = firstRes.headers["Set-Cookie"].split(";")[0];
  const nextReq = { headers: { cookie: cookiePair } };
  const nextRes = { setHeader() { throw new Error("valid cookie should not be reissued"); } };
  middleware(nextReq, nextRes, () => {});
  assert.equal(nextReq.browserId, firstReq.browserId);

  const tamperedReq = { headers: { cookie: `${cookiePair.slice(0, -1)}x` } };
  const tamperedRes = { headers: {}, setHeader(name, value) { this.headers[name] = value; } };
  middleware(tamperedReq, tamperedRes, () => {});
  assert.notEqual(tamperedReq.browserId, firstReq.browserId);
  assert.ok((await readFile(secretPath, "utf8")).length > 0);
});
