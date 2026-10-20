import test from "node:test";
import assert from "node:assert/strict";
import { parseTravelQuery } from "../../shared/travelSearch.js";
import { filterMainRecommendationCandidates, MAIN_RECOMMENDATION_CONTENT_TYPE_IDS } from "./mainRecommendationCandidates.js";
import { rankCandidatesWithRecentSearches } from "./recentSearchRecommendations.js";

const now = new Date("2026-10-15T12:00:00.000Z");

test("allows only TourAPI travel content types and excludes shopping, medical and unknown classifications", () => {
  const allowed = [...MAIN_RECOMMENDATION_CONTENT_TYPE_IDS].map((contentTypeId) => ({
    sourcePlaceId: `allowed-${contentTypeId}`,
    contentTypeId,
    sourceCategoryCodes: { cat1: "A01", cat2: "", cat3: "" },
  }));
  const excluded = [
    { sourcePlaceId: "shopping", contentTypeId: "38", sourceCategoryCodes: { cat1: "A04" } },
    { sourcePlaceId: "gagyeong-ranch", contentTypeId: "39", sourceCategoryCodes: { lclsSystm1: "FD" } },
    { sourcePlaceId: "restaurant", contentTypeId: "39", sourceCategoryCodes: { cat1: "A05" } },
    { sourcePlaceId: "lodging", contentTypeId: "32", sourceCategoryCodes: { cat1: "B02" } },
    { sourcePlaceId: "culture", contentTypeId: "14", sourceCategoryCodes: { lclsSystm1: "VE" } },
    { sourcePlaceId: "festival", contentTypeId: "15", sourceCategoryCodes: { cat1: "A02" } },
    { sourcePlaceId: "course", contentTypeId: "25", sourceCategoryCodes: { cat1: "C01" } },
    { sourcePlaceId: "leisure", contentTypeId: "28", sourceCategoryCodes: { cat1: "A03" } },
    { sourcePlaceId: "pharmacy", contentTypeId: "38", sourceCategoryCodes: { cat1: "A04", cat2: "A0401" } },
    { sourcePlaceId: "medical-unknown", contentTypeId: "", sourceCategoryCodes: { cat1: "" } },
    { sourcePlaceId: "unknown-type", contentTypeId: "99", sourceCategoryCodes: { cat1: "A01" } },
    { sourcePlaceId: "conflicting-shopping-category", contentTypeId: "12", sourceCategoryCodes: { cat1: "A04" } },
    { sourcePlaceId: "conflicting-food-category", contentTypeId: "12", sourceCategoryCodes: { lclsSystm1: "FD" } },
  ];

  assert.deepEqual(filterMainRecommendationCandidates([...allowed, ...excluded]).map(({ sourcePlaceId }) => sourcePlaceId),
    allowed.map(({ sourcePlaceId }) => sourcePlaceId));
  assert.equal(filterMainRecommendationCandidates([{ sourcePlaceId: "missing-source-type" }]).length, 0);
});

test("filters source classifications before applying preference score, rank and return limit", () => {
  const candidates = filterMainRecommendationCandidates([
    { name: "부산 관광지", region: "부산", regionCode: "부산", contentTypeId: "12", tags: [], sourceCategoryCodes: { cat1: "A01" } },
    { name: "부산 음식점", region: "부산", regionCode: "부산", contentTypeId: "39", tags: ["바다"], sourceCategoryCodes: { cat1: "A05" } },
    { name: "가까운약국", region: "부산", regionCode: "부산", contentTypeId: "38", tags: ["바다"], sourceCategoryCodes: { cat1: "A04" } },
  ]);
  const result = rankCandidatesWithRecentSearches({
    candidates,
    currentConditions: parseTravelQuery("부산"),
    historyRecords: [{
      conditions: { regions: ["부산"], types: [], themes: ["바다"] },
      searchedAt: now,
    }],
    limit: 1,
    now,
  });

  assert.equal(result.personalized, true);
  assert.deepEqual(result.items.map(({ name }) => name), ["부산 관광지"]);
  assert.equal(result.items[0].personalizationScore, 1);
});
