import { examplePlaces } from "../../../shared/travelExamples.js";

// These figures are illustrative only. They are not computed from search logs or tourism data.
const exampleTrendById = {
  7: { previous: [22, 25, 24, 28, 26, 31, 33], current: [28, 30, 29, 35, 34, 39, 42] },
  3: { previous: [18, 20, 22, 21, 24, 26, 25], current: [24, 26, 28, 30, 29, 33, 35] },
  1: { previous: [31, 29, 32, 34, 30, 36, 38], current: [35, 37, 34, 39, 41, 40, 44] },
  8: { previous: [24, 22, 25, 27, 26, 29, 28], current: [27, 29, 28, 31, 33, 32, 36] },
  5: { previous: [16, 19, 18, 21, 22, 20, 24], current: [20, 22, 23, 24, 26, 28, 29] },
};

export function getTrendingPlaceById(id) {
  const place = examplePlaces.find((candidate) => String(candidate.id) === String(id));
  if (!place || !exampleTrendById[place.id]) return null;

  return {
    ...place,
    introduction: place.reason,
    trend: exampleTrendById[place.id],
  };
}

export function summarizeTrend(trend) {
  const previousTotal = trend.previous.reduce((sum, value) => sum + value, 0);
  const currentTotal = trend.current.reduce((sum, value) => sum + value, 0);
  const changePercent = previousTotal === 0
    ? null
    : Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1));

  return { previousTotal, currentTotal, changePercent };
}

export function getRelatedTrendingPlaces(place, limit = 3) {
  return examplePlaces
    .filter((candidate) => candidate.id !== place.id)
    .filter((candidate) => candidate.tags.some((tag) => place.tags.includes(tag)))
    .slice(0, limit);
}
