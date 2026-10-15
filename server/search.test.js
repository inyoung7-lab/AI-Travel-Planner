import test from "node:test";
import assert from "node:assert/strict";
import { filterTravelPlaces, parseTravelQuery } from "../shared/travelSearch.js";
import {
  createSearchHandler,
  DEFAULT_SEARCH_LIMIT,
  validateSearchInput,
} from "./search.js";
import { createTravelPlaceRepository } from "./repositories/travelPlaceRepository.js";

function invokeHandler(handler, body) {
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
  return handler({ body }, response).then(() => response);
}

test("parses region, type, and theme from the existing Korean query format", () => {
  assert.deepEqual(parseTravelQuery("경남 바다 펜션"), {
    regions: ["경남"],
    types: ["펜션"],
    themes: ["바다"],
    keywords: [],
  });
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
  const repository = createTravelPlaceRepository({ mode: "database" });
  const result = await invokeHandler(createSearchHandler(repository), { query: "부산" });

  assert.equal(result.statusCode, 503);
  assert.equal(result.payload.error.code, "CATALOG_NOT_CONFIGURED");
  assert.equal("matchedCount" in result.payload, false);
});
