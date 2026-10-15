import { filterTravelPlaces } from "../../shared/travelSearch.js";

export const RECENT_SEARCH_WINDOW_DAYS = 30;
const WINDOW_MS = RECENT_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const lodgingSubtypes = ["숙소", "호텔", "리조트", "펜션", "게스트하우스", "모텔", "민박"];

export function getRecentSearchWindow(now = new Date()) {
  const end = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (Number.isNaN(end.getTime())) throw new TypeError("now must be a valid date.");
  return { from: new Date(end.getTime() - WINDOW_MS), to: end };
}

function readConditions(record) {
  const source = record?.conditions ?? record?.conditionsJson ?? record?.conditions_json;
  if (!source) return null;
  if (typeof source === "object" && !Array.isArray(source)) return source;
  if (typeof source !== "string") return null;
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function addCounts(target, values) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    target[value] = (target[value] || 0) + 1;
  }
}

export function countRecentSearchPreferences(records, { now = new Date() } = {}) {
  const { from, to } = getRecentSearchWindow(now);
  const frequencies = { regions: {}, types: {}, themes: {} };
  let validHistoryCount = 0;

  for (const record of records || []) {
    const searchedAt = new Date(record?.searchedAt ?? record?.searched_at ?? NaN);
    if (Number.isNaN(searchedAt.getTime()) || searchedAt < from || searchedAt > to) continue;
    if ((Object.hasOwn(record || {}, "actorKey") && (record.actorKey === null || record.actorKey === undefined))
        || (Object.hasOwn(record || {}, "actor_key") && (record.actor_key === null || record.actor_key === undefined))) continue;
    const conditions = readConditions(record);
    if (!conditions) continue;
    const hasRecognizedConditions = [conditions.regions, conditions.types, conditions.themes]
      .some((values) => Array.isArray(values) && values.some((value) => typeof value === "string" && value.trim()));
    if (!hasRecognizedConditions) continue;
    addCounts(frequencies.regions, conditions.regions);
    addCounts(frequencies.types, conditions.types);
    addCounts(frequencies.themes, conditions.themes);
    validHistoryCount += 1;
  }

  return { frequencies, validHistoryCount, window: { from, to } };
}

function matchesPreferenceType(place, preferredType) {
  if (preferredType === "숙박") {
    return String(place.contentTypeId || place.sourceContentTypeId || "") === "32"
      || lodgingSubtypes.includes(place.type);
  }
  return place.type === preferredType;
}

function getPreferenceScore(place, frequencies) {
  let score = frequencies.regions[place.regionCode] || 0;
  for (const [type, count] of Object.entries(frequencies.types)) {
    if (matchesPreferenceType(place, type)) score += count;
  }
  for (const theme of place.tags || []) score += frequencies.themes[theme] || 0;
  return score;
}

/**
 * Inject authenticated-user history into this pure ranking function only after a server-side
 * verifier supplies actorKey. Current API routes do not call this function because no such auth exists.
 */
export function rankCandidatesWithRecentSearches({
  candidates,
  currentConditions,
  historyRecords,
  limit = candidates.length,
  now = new Date(),
}) {
  const eligible = filterTravelPlaces(candidates || [], currentConditions);
  const { frequencies, validHistoryCount } = countRecentSearchPreferences(historyRecords, { now });
  if (!validHistoryCount) {
    return { items: eligible.slice(0, limit), personalized: false, frequencies };
  }

  const scored = eligible.map((place, index) => ({ place, index, score: getPreferenceScore(place, frequencies) }));
  if (!scored.some(({ score }) => score > 0)) {
    return { items: eligible.slice(0, limit), personalized: false, frequencies };
  }
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    items: scored.slice(0, limit).map(({ place }) => place),
    personalized: true,
    frequencies,
  };
}

export async function recommendForVerifiedActor({
  actorKey,
  historyRepository,
  candidates,
  currentConditions,
  limit,
  now = new Date(),
}) {
  const ordinary = filterTravelPlaces(candidates || [], currentConditions).slice(0, limit);
  if (typeof actorKey !== "string" || !actorKey.trim() || !historyRepository?.listRecentConditions) {
    return { items: ordinary, personalized: false };
  }
  let historyRecords;
  try {
    historyRecords = await historyRepository.listRecentConditions({ actorKey, now });
  } catch {
    return { items: ordinary, personalized: false };
  }
  return rankCandidatesWithRecentSearches({ candidates, currentConditions, historyRecords, limit, now });
}
