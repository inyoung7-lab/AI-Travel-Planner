import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJsonSearchHistoryRepository } from "./jsonSearchHistoryRepository.js";

const now = new Date("2026-10-15T12:00:00.000Z");
const browserA = Buffer.alloc(32, 1).toString("base64url");
const browserB = Buffer.alloc(32, 2).toString("base64url");

async function makeStore(t, clock = () => now) {
  const directory = await mkdtemp(join(tmpdir(), "travel-history-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "search-history.json");
  return { directory, filePath, repository: createJsonSearchHistoryRepository({ filePath, now: clock }) };
}

function record(browserId, suffix, overrides = {}) {
  return {
    browserId,
    queryText: `부산 바다 ${suffix}`,
    conditions: { regions: ["부산"], types: [], themes: ["바다"], keywords: [] },
    searchedAt: now,
    matchedCount: 1,
    returnedCount: 1,
    returnedPlaces: [{ sourceCode: "KTO_TOURAPI", sourcePlaceId: `source-${suffix}` }],
    ...overrides,
  };
}

test("initializes missing file and reads the browser's history after repository restart", async (t) => {
  const { filePath, repository } = await makeStore(t);
  await repository.initialize();
  assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), { version: 1, searches: [] });

  const saved = await repository.recordSearch(record(browserA, "one"));
  assert.equal(saved.saved, true);
  const restarted = createJsonSearchHistoryRepository({ filePath, now: () => now });
  const rows = await restarted.listRecentConditions({ browserId: browserA });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].conditions, record(browserA, "one").conditions);
  const persisted = JSON.parse(await readFile(filePath, "utf8")).searches[0];
  assert.equal(persisted.queryText, "부산 바다 one");
  assert.equal(persisted.searchedAt, now.toISOString());
  assert.deepEqual(persisted.returnedPlaces, record(browserA, "one").returnedPlaces);
  assert.equal(persisted.matchedCount, 1);
  assert.equal(persisted.returnedCount, 1);
});

test("keeps browser histories separate and ignores actorKey as an input substitute", async (t) => {
  const { repository } = await makeStore(t);
  await repository.recordSearch(record(browserA, "a"));
  await repository.recordSearch(record(browserB, "b"));
  assert.equal((await repository.listRecentConditions({ browserId: browserA })).length, 1);
  assert.equal((await repository.listRecentConditions({ browserId: browserB })).length, 1);
  assert.deepEqual(await repository.listRecentConditions({ actorKey: browserA }), []);
  await assert.rejects(() => repository.recordSearch({ ...record(browserA, "forged"), browserId: undefined, actorKey: browserA }), { code: "INVALID_BROWSER_ID" });
});

test("serializes concurrent writes without dropping records", async (t) => {
  const { filePath, repository } = await makeStore(t);
  await Promise.all(Array.from({ length: 40 }, (_, index) => repository.recordSearch(record(browserA, `concurrent-${index}`))));
  const persisted = JSON.parse(await readFile(filePath, "utf8"));
  assert.equal(persisted.searches.length, 40);
  assert.equal(new Set(persisted.searches.map(({ searchId }) => searchId)).size, 40);
});

test("preserves damaged JSON and reports corruption instead of replacing it", async (t) => {
  const { filePath, repository } = await makeStore(t);
  await repository.initialize();
  const damaged = "{ broken json";
  await import("node:fs/promises").then(({ writeFile }) => writeFile(filePath, damaged, "utf8"));
  await assert.rejects(() => repository.recordSearch(record(browserA, "blocked")), { code: "SEARCH_HISTORY_CORRUPT" });
  await assert.rejects(() => repository.listRecentConditions({ browserId: browserA }), { code: "SEARCH_HISTORY_CORRUPT" });
  assert.equal(await readFile(filePath, "utf8"), damaged);
});

test("does not accept invalid source IDs, counts, or non-browser identity fields", async (t) => {
  const { filePath, repository } = await makeStore(t);
  await repository.initialize();
  await assert.rejects(() => repository.recordSearch(record(browserA, "bad", { matchedCount: 0 })), { code: "INVALID_SEARCH_HISTORY" });
  await assert.rejects(() => repository.recordSearch(record(browserA, "bad", { returnedPlaces: [{ sourceCode: "", sourcePlaceId: "x" }] })), { code: "INVALID_SEARCH_HISTORY" });
  assert.equal(JSON.parse(await readFile(filePath, "utf8")).searches.length, 0);
});
