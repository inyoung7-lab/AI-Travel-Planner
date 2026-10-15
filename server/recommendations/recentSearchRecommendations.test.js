import test from "node:test";
import assert from "node:assert/strict";
import { parseTravelQuery } from "../../shared/travelSearch.js";
import {
  countRecentSearchPreferences,
  recommendForBrowser,
  rankCandidatesWithRecentSearches,
  recommendForVerifiedActor,
} from "./recentSearchRecommendations.js";

const now = new Date("2026-10-15T12:00:00.000Z");
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const record = (conditions, searchedAt = now, actorKey) => ({ conditions, searchedAt, ...(actorKey === undefined ? {} : { actorKey }) });

function candidate(name, { regionCode, type, contentTypeId, tags }) {
  return { name, regionCode, type, contentTypeId, tags, region: regionCode };
}

test("counts only the inclusive rolling 30-day boundary and excludes anonymous, old and future rows", () => {
  const result = countRecentSearchPreferences([
    record({ regions: ["부산"], types: ["숙박"], themes: ["바다"] }, daysAgo(30), "member-a"),
    record({ regions: ["경남"], types: [], themes: ["산"] }, new Date(daysAgo(30).getTime() - 1), "member-a"),
    record({ regions: ["서울"], types: [], themes: ["카페"] }, daysAgo(-1), "member-a"),
    record({ regions: ["제주"], types: [], themes: ["바다"] }, now, null),
  ], { now });

  assert.deepEqual(result.frequencies, {
    regions: { 부산: 1 },
    types: { 숙박: 1 },
    themes: { 바다: 1 },
  });
  assert.equal(result.validHistoryCount, 1);
});

test("keeps current search filters mandatory and ranks matching candidates by recent frequencies", () => {
  const candidates = [
    candidate("부산 산 여행지", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"] }),
    candidate("부산 바다 숙소", { regionCode: "부산", type: "숙박", contentTypeId: "32", tags: ["바다"] }),
    candidate("경남 바다 펜션", { regionCode: "경남", type: "펜션", contentTypeId: "32", tags: ["바다"] }),
  ];
  const histories = [
    record({ regions: ["부산"], types: [], themes: ["바다"] }, now),
    record({ regions: [], types: ["숙박"], themes: ["바다"] }, daysAgo(1)),
    record({ regions: [], types: ["숙박"], themes: [] }, daysAgo(2)),
  ];
  const result = rankCandidatesWithRecentSearches({
    candidates,
    currentConditions: parseTravelQuery("부산"),
    historyRecords: histories,
    now,
  });

  assert.deepEqual(result.items.map(({ name }) => name), ["부산 바다 숙소", "부산 산 여행지"]);
  assert.equal(result.personalized, true);
  assert.equal(result.frequencies.types["숙박"], 2);
  assert.equal(result.frequencies.themes["바다"], 2);
  assert.ok(result.items.every((place) => place.regionCode === "부산"));
});

test("shows only preference conditions that contributed to each candidate score", () => {
  const candidates = [
    candidate("부산 바다", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
    candidate("부산 산", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"] }),
  ];
  const result = rankCandidatesWithRecentSearches({
    candidates,
    currentConditions: parseTravelQuery("부산"),
    historyRecords: [
      record({ regions: ["부산"], types: [], themes: ["바다"] }, now),
    ],
    now,
  });

  const byName = Object.fromEntries(result.items.map((place) => [place.name, place]));
  assert.equal(result.personalized, true);
  assert.ok(byName["부산 바다"].recommendationReason.includes("부산"));
  assert.ok(byName["부산 바다"].recommendationReason.includes("바다"));
  assert.ok(byName["부산 산"].recommendationReason.includes("부산"));
  assert.ok(!byName["부산 산"].recommendationReason.includes("바다"));
  assert.deepEqual(byName["부산 산"].personalizationReasons, ["최근 검색한 부산 지역과 일치"]);
});

test("returns ordinary ordering when there is no valid in-window history", () => {
  const candidates = [
    candidate("첫 번째", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"] }),
    candidate("두 번째", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
  ];
  const result = rankCandidatesWithRecentSearches({
    candidates,
    currentConditions: parseTravelQuery("부산"),
    historyRecords: [record({ regions: ["제주"] }, daysAgo(31), "member-a")],
    now,
  });

  assert.deepEqual(result.items.map(({ name }) => name), ["첫 번째", "두 번째"]);
  assert.equal(result.personalized, false);
});

test("does not let user preferences override current type and theme conditions", () => {
  const candidates = [
    candidate("부산 바다 펜션", { regionCode: "부산", type: "펜션", contentTypeId: "32", tags: ["바다"] }),
    candidate("부산 바다 관광지", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
    candidate("경남 바다 펜션", { regionCode: "경남", type: "펜션", contentTypeId: "32", tags: ["바다"] }),
    candidate("부산 산 펜션", { regionCode: "부산", type: "펜션", contentTypeId: "32", tags: ["산"] }),
  ];
  const result = rankCandidatesWithRecentSearches({
    candidates,
    currentConditions: parseTravelQuery("부산 바다 펜션"),
    historyRecords: [record({ regions: ["경남"], types: ["관광지"], themes: ["산"] }, now)],
    now,
  });

  assert.deepEqual(result.items.map(({ name }) => name), ["부산 바다 펜션"]);
  assert.ok(result.items.every((place) => place.regionCode === "부산" && place.type === "펜션" && place.tags.includes("바다")));
});

test("uses only the supplied actor's injected history and never queries for anonymous requests", async () => {
  const candidates = [
    candidate("바다 여행지", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
    candidate("산 여행지", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"] }),
  ];
  const historyByActor = {
    "verified-a": [record({ themes: ["바다"] }, now)],
    "verified-b": [record({ themes: ["산"] }, now)],
  };
  const requestedActors = [];
  const historyRepository = {
    async listRecentConditions({ actorKey }) {
      requestedActors.push(actorKey);
      return historyByActor[actorKey];
    },
  };
  const options = { historyRepository, candidates, currentConditions: parseTravelQuery("부산"), now };
  const first = await recommendForVerifiedActor({ ...options, actorKey: "verified-a" });
  const second = await recommendForVerifiedActor({ ...options, actorKey: "verified-b" });
  const anonymous = await recommendForVerifiedActor({ ...options, actorKey: null });

  assert.deepEqual(first.items.map(({ name }) => name), ["바다 여행지", "산 여행지"]);
  assert.deepEqual(second.items.map(({ name }) => name), ["산 여행지", "바다 여행지"]);
  assert.equal(first.personalized, true);
  assert.equal(second.personalized, true);
  assert.equal(anonymous.personalized, false);
  assert.deepEqual(anonymous.items.map(({ name }) => name), ["바다 여행지", "산 여행지"]);
  assert.deepEqual(requestedActors, ["verified-a", "verified-b"]);
});

test("browser recommendation ranks only eligible candidates from the last 30 days and handles empty history", async () => {
  const candidates = [
    candidate("부산 바다 장소", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
    candidate("부산 산 장소", { regionCode: "부산", type: "관광지", contentTypeId: "12", tags: ["산"] }),
    candidate("경남 바다 장소", { regionCode: "경남", type: "관광지", contentTypeId: "12", tags: ["바다"] }),
  ];
  const historyRepository = {
    async listRecentConditions({ browserId }) {
      assert.equal(browserId, "this-browser");
      return [
        record({ regions: ["부산"], themes: ["산"] }, daysAgo(30)),
        record({ regions: ["부산"], themes: ["산"] }, daysAgo(31)),
      ];
    },
  };
  const result = await recommendForBrowser({
    browserId: "this-browser",
    historyRepository,
    candidates,
    currentConditions: parseTravelQuery("부산"),
    limit: 1,
    now,
  });
  assert.equal(result.personalized, true);
  assert.equal(result.personalizationBasis, "browser");
  assert.deepEqual(result.items.map(({ name }) => name), ["부산 산 장소"]);

  const ordinary = await recommendForBrowser({
    browserId: "this-browser",
    historyRepository: { async listRecentConditions() { return []; } },
    candidates,
    currentConditions: parseTravelQuery("부산 바다"),
    limit: 1,
    now,
  });
  assert.equal(ordinary.personalized, false);
  assert.equal(ordinary.personalizationBasis, "browser");
  assert.deepEqual(ordinary.items.map(({ name }) => name), ["부산 바다 장소"]);

  const unavailable = await recommendForBrowser({
    browserId: "this-browser",
    historyRepository: { async listRecentConditions() { throw new Error("read failed"); } },
    candidates,
    currentConditions: parseTravelQuery("부산 바다"),
    limit: 1,
    now,
  });
  assert.equal(unavailable.personalized, false);
  assert.equal(unavailable.personalizationBasis, "browser");
  assert.deepEqual(unavailable.items.map(({ name }) => name), ["부산 바다 장소"]);
});
