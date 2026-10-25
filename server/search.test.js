import test from "node:test";
import assert from "node:assert/strict";
import { filterTravelPlaces, parseTravelQuery } from "../shared/travelSearch.js";
import {
  createSearchHandler,
  DEFAULT_SEARCH_LIMIT,
  validateSearchInput,
} from "./search.js";
import { createTravelPlaceRepository } from "./repositories/travelPlaceRepository.js";
import { createHomeRecommendationsHandler } from "./recommendations/handlers.js";

function invokeHandler(handler, body, extraRequest = {}) {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  return handler({ body, ...extraRequest }, response).then(() => response);
}

test("parses region, type, and theme from the existing Korean query format", () => {
  assert.deepEqual(parseTravelQuery("경남 바다 펜션"), {
    regions: ["경남"],
    types: ["펜션"],
    themes: ["바다"],
    keywords: [],
  });
});

test("normalizes 숙박 and 숙소 to the accommodation parent type and filters by TourAPI content type", () => {
  const lodging = { regionCode: "부산", contentTypeId: "32", type: "", tags: [], name: "해운대 숙박시설", region: "부산 해운대" };
  const pension = { regionCode: "경남", contentTypeId: "32", type: "펜션", tags: ["바다"], name: "바다 펜션", region: "경남 거제" };
  const attraction = { regionCode: "부산", contentTypeId: "12", type: "", tags: [], name: "부산 관광지", region: "부산" };

  for (const query of ["부산 숙박", "부산 숙소"]) {
    const conditions = parseTravelQuery(query);
    assert.deepEqual(conditions, { regions: ["부산"], types: ["숙박"], themes: [], keywords: [] });
    assert.deepEqual(filterTravelPlaces([lodging, attraction], conditions), [lodging]);
  }

  assert.deepEqual(filterTravelPlaces([pension, attraction], parseTravelQuery("경남 바다 펜션")), [pension]);
  assert.deepEqual(filterTravelPlaces([pension], parseTravelQuery("경남 바다 숙박")), [pension]);
});

test("requires every region, type, and theme condition to match", () => {
  const places = [
    { regionCode: "경남", type: "펜션", tags: ["바다"], name: "통영 바다 펜션", region: "경남 통영" },
    { regionCode: "전남", type: "펜션", tags: ["바다"], name: "여수 펜션", region: "전남 여수" },
    { regionCode: "경남", type: "호텔", tags: ["바다"], name: "거제 호텔", region: "경남 거제" },
    { regionCode: "경남", type: "펜션", tags: ["산"], name: "산속 펜션", region: "경남 산청" },
  ];
  const conditions = parseTravelQuery("경남 바다 펜션");

  assert.deepEqual(filterTravelPlaces(places, conditions).map((place) => place.name), ["통영 바다 펜션"]);
});

test("returns no unrelated example records for 경남 바다 펜션", async () => {
  const repository = createTravelPlaceRepository({ mode: "example" });
  const result = await invokeHandler(createSearchHandler(repository), { query: "경남 바다 펜션" });

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.matchedCount, 0);
  assert.equal(result.payload.returnedCount, 0);
  assert.equal(result.payload.dataSource, "example");
  assert.equal(result.payload.personalized, false);
});

test("separates all exact matches from the limited response count", async () => {
  const repository = {
    dataSource: "example",
    async listPlaces() {
      return [
        { id: 21, name: "거제 바다 펜션", region: "경남 거제", regionCode: "경남", type: "펜션", tags: ["바다"], reason: "조건 일치" },
        { id: 22, name: "통영 바다 펜션", region: "경남 통영", regionCode: "경남", type: "펜션", tags: ["바다"], reason: "조건 일치" },
        { id: 23, name: "여수 바다 펜션", region: "전남 여수", regionCode: "전남", type: "펜션", tags: ["바다"], reason: "지역 불일치" },
      ];
    },
  };
  const result = await invokeHandler(createSearchHandler(repository), {
    query: "경남 바다 펜션",
    limit: 1,
  });

  assert.equal(result.payload.matchedCount, 2);
  assert.equal(result.payload.returnedCount, 1);
  assert.equal(result.payload.items[0].regionCode, "경남");
  assert.equal(result.payload.items[0].reason, "검색 조건 일치");
});

test("validates required query and optional bounded integer limit", () => {
  assert.deepEqual(validateSearchInput({ query: "  부산 산  " }), {
    query: "부산 산",
    limit: DEFAULT_SEARCH_LIMIT,
  });
  assert.deepEqual(validateSearchInput({ query: "부산", limit: 3 }), { query: "부산", limit: 3 });

  for (const body of [
    null,
    [],
    {},
    { query: "   " },
    { query: 42 },
    { query: "x".repeat(1001) },
    { query: "부산", limit: 0 },
    { query: "부산", limit: 1.5 },
    { query: "부산", limit: 51 },
    { query: "부산", limit: "8" },
  ]) {
    assert.throws(() => validateSearchInput(body), { code: "INVALID_SEARCH_INPUT" });
  }
});

test("reports an unconfigured catalog as an error, not an empty result", async () => {
  const repository = createTravelPlaceRepository({ mode: "" });
  const result = await invokeHandler(createSearchHandler(repository), { query: "부산" });

  assert.equal(result.statusCode, 503);
  assert.equal(result.payload.error.code, "CATALOG_NOT_CONFIGURED");
  assert.equal("matchedCount" in result.payload, false);
});

test("keeps TourAPI search successful without history storage and explicitly reports not saved", async () => {
  const repository = {
    dataSource: "tourapi",
    async listPlaces() {
      return { places: [], matchCountComplete: true };
    },
  };
  const response = await invokeHandler(createSearchHandler(repository), { query: "부산" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.matchedCount, 0);
  assert.deepEqual(response.payload.history, { saved: false, reason: "not_configured" });
});

test("stores successful search with anonymous identity and ignores request body userId", async () => {
  const place = {
    id: "tourapi:source-77", sourceCode: "KTO_TOURAPI", sourcePlaceId: "source-77",
    regionCode: "부산", type: "숙박", contentTypeId: "32", tags: [], name: "부산 숙박", region: "부산",
  };
  let storedRecord;
  const repository = {
    dataSource: "tourapi",
    async listPlaces() { return { places: [place], matchCountComplete: true }; },
  };
  const historyRepository = {
    async recordSearch(record) {
      storedRecord = record;
      return { saved: true, searchId: 912 };
    },
  };
  const response = await invokeHandler(
    createSearchHandler(repository, { historyRepository }),
    { query: "부산 숙박", userId: "forged-from-browser" },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload.history, { saved: true, searchId: 912 });
  assert.equal(storedRecord.actorKey, null);
  assert.equal(storedRecord.queryText, "부산 숙박");
  assert.deepEqual(storedRecord.conditions.types, ["숙박"]);
  assert.equal(storedRecord.matchedCount, 1);
  assert.equal(storedRecord.returnedCount, 1);
  assert.deepEqual(storedRecord.returnedPlaces, [{ ...place, reason: "검색 조건 일치" }]);
});

test("records a successful zero-result search as a real zero-count search", async () => {
  let savedRecord;
  const repository = { dataSource: "tourapi", async listPlaces() { return { places: [], matchCountComplete: true }; } };
  const historyRepository = { async recordSearch(record) { savedRecord = record; return { saved: true, searchId: 913 }; } };
  const response = await invokeHandler(createSearchHandler(repository, { historyRepository }), { query: "\uBD80\uC0B0" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload.history, { saved: true, searchId: 913 });
  assert.equal(savedRecord.matchedCount, 0);
  assert.equal(savedRecord.returnedCount, 0);
  assert.deepEqual(savedRecord.returnedPlaces, []);
});

test("does not persist failed searches or incomplete match counts", async () => {
  let saveCalls = 0;
  const historyRepository = { async recordSearch() { saveCalls += 1; return { saved: true }; } };
  const providerFailure = {
    dataSource: "tourapi",
    async listPlaces() { throw Object.assign(new Error("upstream"), { code: "UPSTREAM", status: 502 }); },
  };
  const failed = await invokeHandler(createSearchHandler(providerFailure, { historyRepository }), { query: "부산" });
  assert.equal(failed.statusCode, 502);
  assert.equal("history" in failed.payload, false);

  const partial = {
    dataSource: "tourapi",
    async listPlaces() { return { places: [], matchCountComplete: false }; },
  };
  const partialResponse = await invokeHandler(createSearchHandler(partial, { historyRepository }), { query: "부산" });
  assert.deepEqual(partialResponse.payload.history, { saved: false, reason: "incomplete_match_count" });
  assert.equal(saveCalls, 0);
});

test("reports storage failure without turning a successful search into a failed or saved response", async () => {
  const repository = {
    dataSource: "tourapi",
    async listPlaces() { return { places: [], matchCountComplete: true }; },
  };
  const historyRepository = { async recordSearch() { throw new Error("simulated database failure"); } };
  const response = await invokeHandler(createSearchHandler(repository, { historyRepository }), { query: "부산" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload.history, { saved: false, reason: "save_failed" });
});

test("ranks browser search history before applying the return limit and saves only after ranking", async () => {
  const places = [
    { id: "tourapi:sea", sourceCode: "KTO_TOURAPI", sourcePlaceId: "sea", regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"], name: "부산 바다", region: "부산" },
    { id: "tourapi:mountain", sourceCode: "KTO_TOURAPI", sourcePlaceId: "mountain", regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"], name: "부산 산", region: "부산" },
  ];
  const events = [];
  const repository = { dataSource: "tourapi", async listPlaces() { return { places, matchCountComplete: true }; } };
  const historyRepository = {
    scope: "browser",
    async listRecentConditions({ browserId }) {
      events.push("read");
      assert.equal(browserId, "server-cookie-browser");
      return [{ conditions: { regions: ["부산"], types: [], themes: ["산"] }, searchedAt: new Date(Date.now() - 1000) }];
    },
    async recordSearch(record) {
      events.push("write");
      this.record = record;
      return { saved: true, searchId: "mock" };
    },
  };
  const response = await invokeHandler(
    createSearchHandler(repository, { historyRepository }),
    { query: "부산", limit: 1, userId: "forged-user", actorKey: "forged-actor" },
    { browserId: "server-cookie-browser" },
  );

  assert.equal(response.payload.matchedCount, 2);
  assert.deepEqual(response.payload.items.map(({ sourcePlaceId }) => sourcePlaceId), ["mountain"]);
  assert.equal(response.payload.personalized, true);
  assert.deepEqual(response.payload.personalization, { applied: true, basis: "browser", reason: "applied" });
  assert.deepEqual(events, ["read", "write"]);
  assert.equal(historyRepository.record.browserId, "server-cookie-browser");
  assert.equal("actorKey" in historyRepository.record, false);
});

test("home recommendations use browser history and example cards remain clearly non-personalized", async () => {
  const places = [
    { id: "1", sourceCode: "KTO_TOURAPI", sourcePlaceId: "one", contentTypeId: "12", sourceCategoryCodes: { cat1: "A01" }, regionCode: "부산", type: "관광지", tags: ["바다"], name: "부산 바다", region: "부산" },
    { id: "2", sourceCode: "KTO_TOURAPI", sourcePlaceId: "two", contentTypeId: "12", sourceCategoryCodes: { cat1: "A01" }, regionCode: "제주", type: "관광지", tags: ["산"], name: "제주 산", region: "제주" },
    { id: "3", sourceCode: "KTO_TOURAPI", sourcePlaceId: "pharmacy", contentTypeId: "38", sourceCategoryCodes: { cat1: "A04" }, regionCode: "제주", type: "", tags: ["산"], name: "가까운약국", region: "제주" },
  ];
  const repository = { dataSource: "tourapi", async listPlaces() { return { places, matchCountComplete: true }; } };
  const historyRepository = { scope: "browser", async listRecentConditions({ browserId }) {
    assert.equal(browserId, "browser-for-home");
    return [{ conditions: { regions: ["제주"], types: [], themes: ["산"] }, searchedAt: new Date(Date.now() - 1000) }];
  } };
  const personalized = await invokeHandler(createHomeRecommendationsHandler(repository, { historyRepository }), {}, { browserId: "browser-for-home" });
  assert.equal(personalized.payload.personalization.applied, true);
  assert.equal(personalized.payload.personalization.basis, "browser");
  assert.equal(personalized.payload.items[0].sourcePlaceId, "two");
  assert.equal(personalized.payload.candidateCount, 2);
  assert.ok(personalized.payload.items.every((place) => place.sourcePlaceId !== "pharmacy"));

  const examples = await invokeHandler(createHomeRecommendationsHandler(createTravelPlaceRepository({ mode: "example" }), { historyRepository }), {}, { browserId: "browser-for-home" });
  assert.equal(examples.payload.dataSource, "example");
  assert.equal(examples.payload.personalized, false);
  assert.deepEqual(examples.payload.personalization, { applied: false, basis: "none", reason: "example_data" });
});
