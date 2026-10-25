import { getSupabase, unwrap } from '../db.js';
import { getRecentSearchWindow } from '../recommendations/recentSearchRecommendations.js';

export class SearchHistoryInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "SearchHistoryInputError";
    this.code = "INVALID_SEARCH_HISTORY";
  }
}

export function normalizeSearchHistoryRecord(record) {
  const {
    queryText, conditions, matchedCount, returnedCount, returnedPlaces, browserId,
  } = record || {};

  if (typeof queryText !== "string" || !queryText.trim() || queryText.length > 1000) {
    throw new SearchHistoryInputError("검색어 길이 또는 형식이 올바르지 않습니다.");
  }
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) {
    throw new SearchHistoryInputError("검색 조건은 객체여야 합니다.");
  }
  if (!Number.isInteger(matchedCount) || matchedCount < 0
      || !Number.isInteger(returnedCount) || returnedCount < 0 || returnedCount > matchedCount) {
    throw new SearchHistoryInputError("검색 결과 건수가 올바르지 않습니다.");
  }
  if (!Array.isArray(returnedPlaces) || returnedPlaces.length !== returnedCount) {
    throw new SearchHistoryInputError("반환 건수와 결과 목록 수가 일치해야 합니다.");
  }
  if (typeof browserId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(browserId)) {
    throw new SearchHistoryInputError("인증 주체 키 형식이 올바르지 않습니다.");
  }

  const seen = new Set();
  const normalizedPlaces = returnedPlaces.map((place, index) => {
    if (!place || typeof place.sourceCode !== "string" || !place.sourceCode.trim()
        || place.sourceCode.length > 40 || typeof place.sourcePlaceId !== "string"
        || !place.sourcePlaceId.trim() || place.sourcePlaceId.length > 120) {
      throw new SearchHistoryInputError("검색 결과에 저장 가능한 원천 코드와 원천 ID가 필요합니다.");
    }
    const uniqueKey = `${place.sourceCode}\u0000${place.sourcePlaceId}`;
    if (seen.has(uniqueKey)) throw new SearchHistoryInputError("검색 결과에 같은 원천 장소가 중복되었습니다.");
    seen.add(uniqueKey);
    return {
      sourceCode: place.sourceCode,
      sourcePlaceId: place.sourcePlaceId,
      resultPosition: index + 1,
    };
  });

  let conditionsJson;
  try {
    conditionsJson = JSON.stringify(conditions);
  } catch {
    throw new SearchHistoryInputError("검색 조건을 JSON으로 변환할 수 없습니다.");
  }

  return {
    browserId,
    queryText: queryText.trim(),
    conditionsJson,
    matchedCount,
    returnedCount,
    returnedPlaces: normalizedPlaces,
  };
}

export function createSearchHistoryRepository({ getClient = () => getSupabase({ admin: true }) } = {}) {
  return {
    scope: 'browser',
    async listRecentConditions({ browserId, at = new Date(), now = at } = {}) {
      if (typeof browserId !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(browserId)) throw new SearchHistoryInputError('검증된 브라우저 식별자가 필요합니다.');
      const { from, to } = getRecentSearchWindow(now);
      const rows = await unwrap(getClient().from('travel_search_log').select('conditions_json,searched_at').eq('browser_id', browserId)
        .gte('searched_at', from.toISOString()).lte('searched_at', to.toISOString()).order('searched_at', { ascending: false }));
      return rows.map((r) => ({ conditionsJson: JSON.stringify(r.conditions_json), searchedAt: r.searched_at }));
    },
    async recordSearch(record) {
      const valid = normalizeSearchHistoryRecord(record);
      const row = await unwrap(getClient().from('travel_search_log').insert({ browser_id: valid.browserId, query_text: valid.queryText,
        conditions_json: JSON.parse(valid.conditionsJson), matched_count: valid.matchedCount, returned_count: valid.returnedCount,
        returned_places: valid.returnedPlaces }).select('search_id').single());
      return { searchId: row.search_id, saved: true };
    },
  };
}
