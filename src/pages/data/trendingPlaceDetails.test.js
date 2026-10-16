import test from "node:test";
import assert from "node:assert/strict";
import { getPlaceDetailPath, openPlaceDetail } from "./placeNavigation.js";
import { scrollToPageTop } from "./pageScroll.js";
import {
  getRelatedTrendingPlaces,
  getTrendingPlaceById,
  summarizeTrend,
} from "./trendingPlaceDetails.js";

test("popular card IDs resolve to their own trending detail route and data", () => {
  assert.equal(getPlaceDetailPath(7, "trending"), "/trending/7");
  assert.equal(getPlaceDetailPath(3, "trending"), "/trending/3");
  assert.equal(getTrendingPlaceById("7").name, "부산 흰여울문화마을");
  assert.equal(getTrendingPlaceById("3").name, "여수 해양케이블카");
  assert.notDeepEqual(getTrendingPlaceById("7").trend, getTrendingPlaceById("3").trend);
});

test("common navigation keeps team-owned cards pending while routing trending cards", () => {
  const paths = [];
  const navigate = (path) => paths.push(path);

  assert.equal(openPlaceDetail(7, navigate, "trending"), true);
  assert.equal(openPlaceDetail(7, navigate, "team"), false);
  assert.deepEqual(paths, ["/trending/7"]);
});

test("unknown place IDs resolve to not found", () => {
  assert.equal(getTrendingPlaceById("999"), null);
  assert.equal(getTrendingPlaceById("not-an-id"), null);
});

test("period comparison is calculated from example series and related places exclude current place", () => {
  assert.deepEqual(summarizeTrend({ previous: [1, 2], current: [2, 4] }), {
    previousTotal: 3,
    currentTotal: 6,
    changePercent: 100,
  });

  const place = getTrendingPlaceById("7");
  assert.deepEqual(summarizeTrend(place.trend), {
    previousTotal: 189,
    currentTotal: 237,
    changePercent: 25.4,
  });
  const related = getRelatedTrendingPlaces(place);
  assert.ok(related.length > 0);
  assert.ok(related.every((item) => item.id !== place.id));
  assert.ok(related.every((item) => getPlaceDetailPath(item.id, "trending") === `/trending/${item.id}`));
});

test("detail navigation resets the viewport to the top", () => {
  let scrollPosition = null;
  scrollToPageTop({ scrollTo: (x, y) => { scrollPosition = { x, y }; } });
  assert.deepEqual(scrollPosition, { x: 0, y: 0 });
});
