import test from "node:test";
import assert from "node:assert/strict";
import { createTourApiRepository } from "./tourApiRepository.js";
import { createSearchHandler } from "../search.js";
import { filterTravelPlaces, parseTravelQuery } from "../../shared/travelSearch.js";

function apiResponse(items, totalCount = items.length, resultCode = "0000") {
  return new Response(JSON.stringify({ response: {
    header: { resultCode, resultMsg: resultCode === "0000" ? "OK" : "ERROR" },
    body: { totalCount, items: { item: items } },
  } }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("sends separate source filters and keeps exact source evidence", async () => {
  const requestedUrls = [];
  const repository = createTourApiRepository({
    serviceKey: "test-key", mobileApp: "AI-Travel-Planner-test",
    fetchImpl: async (url) => {
      requestedUrls.push(new URL(url));
      return apiResponse([
        { contentid: "src-1", contenttypeid: "32", areacode: "36", title: "Geoje \uBC14\uB2E4 \uD39C\uC158", addr1: "\uACBD\uB0A8 Geoje", firstimage: "https://img.example/1.jpg", cat3: "\uD39C\uC158" },
        { contentid: "src-2", contenttypeid: "32", areacode: "38", title: "Yeosu \uBC14\uB2E4 \uD39C\uC158", addr1: "\uC804\uB0A8 Yeosu", cat3: "\uD39C\uC158" },
        { contentid: "src-3", contenttypeid: "32", areacode: "36", title: "Geoje \uBC14\uB2E4 Hotel", addr1: "\uACBD\uB0A8 Geoje", cat3: "Hotel" },
      ]);
    },
  });
  const filters = parseTravelQuery("\uACBD\uB0A8 \uBC14\uB2E4 \uD39C\uC158");
  const result = await repository.listPlaces({ filters });
  const exact = filterTravelPlaces(result.places, filters);

  assert.equal(requestedUrls.length, 1);
  assert.equal(requestedUrls[0].pathname.endsWith("/searchKeyword2"), true);
  assert.equal(requestedUrls[0].searchParams.get("keyword"), "\uBC14\uB2E4");
  assert.equal(requestedUrls[0].searchParams.get("areaCode"), "36");
  assert.equal(requestedUrls[0].searchParams.get("contentTypeId"), "32");
  assert.equal(exact.length, 1);
  assert.equal(exact[0].sourcePlaceId, "src-1");
  assert.equal(exact[0].id, "tourapi:src-1");
  assert.equal(exact[0].photoSource, "\uD55C\uAD6D\uAD00\uAD11\uACF5\uC0AC TourAPI");
  assert.equal(exact[0].reason, "\uC7A5\uC18C\uBA85\uC5D0 ‘\uBC14\uB2E4’ \uD3EC\uD568");
  assert.equal(result.places.find((place) => place.sourcePlaceId === "src-2").regionCode, "\uC804\uB0A8");
});

test("treats 숙박 and 숙소 as TourAPI accommodation content type 32", async () => {
  const requestUrls = [];
  const repository = createTourApiRepository({
    serviceKey: "test-key", mobileApp: "AI-Travel-Planner-test",
    fetchImpl: async (url) => {
      requestUrls.push(new URL(url));
      return apiResponse([
        { contentid: "stay-1", contenttypeid: "32", areacode: "6", title: "Gwangalli Stay", addr1: "Busan" },
        { contentid: "spot-1", contenttypeid: "12", areacode: "6", title: "Busan attraction", addr1: "Busan" },
      ]);
    },
  });

  for (const query of ["\uBD80\uC0B0 \uC219\uBC15", "\uBD80\uC0B0 \uC219\uC18C"]) {
    const filters = parseTravelQuery(query);
    const result = await repository.listPlaces({ query, filters });
    assert.deepEqual(filters.types, ["\uC219\uBC15"]);
    assert.equal(requestUrls.at(-1).pathname.endsWith("/areaBasedList2"), true);
    assert.equal(requestUrls.at(-1).searchParams.get("contentTypeId"), "32");
    assert.deepEqual(filterTravelPlaces(result.places, filters).map((place) => place.sourcePlaceId), ["stay-1"]);
  }
});

test("keeps missing photos empty and marks page-capped counts incomplete", async () => {
  const repository = createTourApiRepository({
    serviceKey: "test-key", mobileApp: "AI-Travel-Planner-test", pageSize: 1, maxPages: 1,
    fetchImpl: async () => apiResponse([
      { contentid: "1", contenttypeid: "12", areacode: "6", title: "Busan \uBC14\uB2E4" },
    ], 3),
  });
  const result = await repository.listPlaces({ filters: parseTravelQuery("\uBD80\uC0B0 \uBC14\uB2E4") });

  assert.equal(result.places[0].image, null);
  assert.equal(result.places[0].sourcePhotoUrl, null);
  assert.equal(result.matchCountComplete, false);
});

test("does not hide missing settings or quota errors as empty results", async () => {
  const noKey = createTourApiRepository({ serviceKey: "", mobileApp: "" });
  await assert.rejects(() => noKey.listPlaces({ filters: {} }), { code: "TOUR_API_CONFIGURATION_MISSING", status: 503 });

  const quota = createTourApiRepository({
    serviceKey: "test-key", mobileApp: "AI-Travel-Planner-test", fetchImpl: async () => apiResponse([], 0, "22"),
  });
  const handler = createSearchHandler(quota);
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  await handler({ body: { query: "\uBD80\uC0B0" } }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.error.code, "TOUR_API_RATE_LIMIT");
  assert.equal("items" in response.payload, false);
});

test("maps provider timeouts to a retriable error", async () => {
  const repository = createTourApiRepository({
    serviceKey: "test-key", mobileApp: "AI-Travel-Planner-test",
    fetchImpl: async () => { const error = new Error("timeout"); error.name = "TimeoutError"; throw error; },
  });
  await assert.rejects(() => repository.listPlaces({ filters: {} }), { code: "TOUR_API_TIMEOUT", status: 504 });
});
