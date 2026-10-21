import test from "node:test";
import assert from "node:assert/strict";
import { createAsyncTtlCache } from "./asyncTtlCache.js";

test("expires successful results and retries failed loads", async () => {
  let time = 0;
  let calls = 0;
  const cached = createAsyncTtlCache({ ttlMs: 100, now: () => time });
  const load = async () => ++calls;
  assert.equal(await cached("place", load), 1);
  time = 99;
  assert.equal(await cached("place", load), 1);
  time = 100;
  assert.equal(await cached("place", load), 2);

  await assert.rejects(() => cached("error", async () => { throw new Error("temporary"); }));
  assert.equal(await cached("error", load), 3);
});
