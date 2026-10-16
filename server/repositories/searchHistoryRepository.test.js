import test from "node:test";
import assert from "node:assert/strict";
import { createSearchHistoryRepository, isOracleConnectionConfigured } from "./searchHistoryRepository.js";

const driver = { BIND_OUT: 3003, NUMBER: 2010, STRING: 2001, CLOB: 2017 };

function validRecord(overrides = {}) {
  return {
    actorKey: null,
    queryText: "\uBD80\uC0B0 \uBC14\uB2E4",
    conditions: { regions: ["\uBD80\uC0B0"], types: [], themes: ["\uBC14\uB2E4"], keywords: [] },
    matchedCount: 2,
    returnedCount: 2,
    returnedPlaces: [
      { sourceCode: "KTO_TOURAPI", sourcePlaceId: "source-1" },
      { sourceCode: "KTO_TOURAPI", sourcePlaceId: "source-2" },
    ],
    ...overrides,
  };
}

function mockConnection({ failResults = false } = {}) {
  const calls = [];
  let pendingLog = false;
  let pendingResults = [];
  const connection = {
    calls,
    async execute(sql, binds, options) {
      calls.push({ kind: "execute", sql, binds, options });
      pendingLog = true;
      return { outBinds: { searchId: [731] } };
    },
    async executeMany(sql, rows, options) {
      calls.push({ kind: "executeMany", sql, rows, options });
      if (failResults) throw new Error("simulated result insert failure");
      pendingResults = rows;
      return { rowsAffected: rows.length };
    },
    async commit() {
      calls.push({ kind: "commit" });
      this.committed = { log: pendingLog, results: [...pendingResults] };
    },
    async rollback() {
      calls.push({ kind: "rollback" });
      pendingLog = false;
      pendingResults = [];
    },
    async close() { calls.push({ kind: "close" }); },
  };
  return connection;
}

test("stores search header and ordered source results in one transaction", async () => {
  const connection = mockConnection();
  const repository = createSearchHistoryRepository({ getConnection: async () => connection, driver });
  const result = await repository.recordSearch(validRecord());

  assert.deepEqual(result, { searchId: 731, saved: true });
  assert.deepEqual(connection.calls.map(({ kind }) => kind), ["execute", "executeMany", "commit", "close"]);
  const header = connection.calls[0];
  assert.match(header.sql, /INSERT INTO TRAVEL_SEARCH_LOG/u);
  assert.equal(header.binds.actorKey, null);
  assert.equal(header.binds.queryText, "\uBD80\uC0B0 \uBC14\uB2E4");
  assert.equal(JSON.parse(header.binds.conditionsJson.val).themes[0], "\uBC14\uB2E4");
  assert.equal(header.binds.matchedCount, 2);
  assert.equal(header.binds.returnedCount, 2);
  assert.equal(header.options.autoCommit, false);
  assert.deepEqual(connection.calls[1].rows.map(({ resultPosition }) => resultPosition), [1, 2]);
  assert.equal(connection.calls[1].rows[0].searchId, 731);
  assert.equal(connection.calls[1].rows[0].sourceCode, "KTO_TOURAPI");
  assert.equal(connection.calls[1].rows[0].sourcePlaceId, "source-1");
  assert.equal(connection.calls[1].options.autoCommit, false);
  assert.doesNotMatch(connection.calls[1].sql, /clicked_at/iu);
  assert.deepEqual(connection.committed, {
    log: true,
    results: connection.calls[1].rows,
  });
});

test("rolls back the header when result insertion fails", async () => {
  const connection = mockConnection({ failResults: true });
  const repository = createSearchHistoryRepository({ getConnection: async () => connection, driver });

  await assert.rejects(() => repository.recordSearch(validRecord()), /simulated result insert failure/u);
  assert.deepEqual(connection.calls.map(({ kind }) => kind), ["execute", "executeMany", "rollback", "close"]);
  assert.equal(connection.committed, undefined);
});

test("stores a successful zero-result search without a result-list insert", async () => {
  const connection = mockConnection();
  const repository = createSearchHistoryRepository({ getConnection: async () => connection, driver });
  const result = await repository.recordSearch(validRecord({ matchedCount: 0, returnedCount: 0, returnedPlaces: [] }));

  assert.equal(result.saved, true);
  assert.deepEqual(connection.calls.map(({ kind }) => kind), ["execute", "commit", "close"]);
  assert.equal(connection.calls[0].binds.matchedCount, 0);
});

test("rejects invalid source IDs and count mismatches before opening a connection", async () => {
  let connectionRequests = 0;
  const repository = createSearchHistoryRepository({
    getConnection: async () => { connectionRequests += 1; return mockConnection(); }, driver,
  });

  await assert.rejects(() => repository.recordSearch(validRecord({ returnedPlaces: [{ sourceCode: "", sourcePlaceId: "x" }, { sourceCode: "KTO", sourcePlaceId: "y" }] })), { code: "INVALID_SEARCH_HISTORY" });
  await assert.rejects(() => repository.recordSearch(validRecord({ returnedCount: 1 })), { code: "INVALID_SEARCH_HISTORY" });
  assert.equal(connectionRequests, 0);
});

test("checks only presence of the required Oracle settings", () => {
  assert.equal(isOracleConnectionConfigured({ DB_USER: "u", DB_PASSWORD: "p", DB_CONNECT_STRING: "c" }), true);
  assert.equal(isOracleConnectionConfigured({ DB_USER: "u", DB_PASSWORD: "p" }), false);
  assert.equal(isOracleConnectionConfigured({}), false);
});

test("queries only the supplied non-null actor within the inclusive 30-day window", async () => {
  const now = new Date("2026-10-15T00:00:00.000Z");
  const connection = {
    calls: [],
    async execute(sql, binds, options) {
      this.calls.push({ sql, binds, options });
      return { rows: [{ CONDITIONS_JSON: "{\"regions\":[\"\uBD80\uC0B0\"]}", SEARCHED_AT: now }] };
    },
    async close() { this.closed = true; },
  };
  const readDriver = { OUT_FORMAT_OBJECT: 4002, STRING: 2001 };
  const repository = createSearchHistoryRepository({ getConnection: async () => connection, driver: readDriver });
  const rows = await repository.listRecentConditions({ actorKey: "verified-member-9", now });
  const call = connection.calls[0];

  assert.match(call.sql, /actor_key = :actorKey/u);
  assert.match(call.sql, /actor_key IS NOT NULL/u);
  assert.match(call.sql, /searched_at >= TO_TIMESTAMP_TZ\(:windowStart/u);
  assert.match(call.sql, /searched_at <= TO_TIMESTAMP_TZ\(:windowEnd/u);
  assert.equal(call.binds.actorKey, "verified-member-9");
  assert.equal(call.binds.windowStart, "2026-09-15T00:00:00.000+00:00");
  assert.equal(call.binds.windowEnd, "2026-10-15T00:00:00.000+00:00");
  assert.equal(call.options.outFormat, readDriver.OUT_FORMAT_OBJECT);
  assert.equal(rows[0].conditionsJson, "{\"regions\":[\"\uBD80\uC0B0\"]}");
  assert.equal(connection.closed, true);
});

test("refuses anonymous history lookup before opening an Oracle connection", async () => {
  let connectionRequests = 0;
  const repository = createSearchHistoryRepository({
    getConnection: async () => { connectionRequests += 1; return mockConnection(); }, driver,
  });

  await assert.rejects(() => repository.listRecentConditions({ actorKey: null }), { code: "INVALID_SEARCH_HISTORY" });
  await assert.rejects(() => repository.listRecentConditions({ actorKey: " " }), { code: "INVALID_SEARCH_HISTORY" });
  assert.equal(connectionRequests, 0);
});

test("binds each verified actor independently for user-scoped preference reads", async () => {
  const actorCalls = [];
  const repository = createSearchHistoryRepository({
    driver: { OUT_FORMAT_OBJECT: 4002, STRING: 2001 },
    getConnection: async () => ({
      async execute(_sql, binds) {
        actorCalls.push(binds.actorKey);
        return { rows: [{ CONDITIONS_JSON: `{"themes":["${binds.actorKey}"]}`, SEARCHED_AT: new Date("2026-10-15T00:00:00Z") }] };
      },
      async close() {},
    }),
  });

  const first = await repository.listRecentConditions({ actorKey: "member-a", now: new Date("2026-10-15T00:00:00Z") });
  const second = await repository.listRecentConditions({ actorKey: "member-b", now: new Date("2026-10-15T00:00:00Z") });
  assert.deepEqual(actorCalls, ["member-a", "member-b"]);
  assert.match(first[0].conditionsJson, /member-a/u);
  assert.match(second[0].conditionsJson, /member-b/u);
});
