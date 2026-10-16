import { filterTravelPlaces, parseTravelQuery } from "../shared/travelSearch.js";
import { CatalogNotConfiguredError } from "./repositories/travelPlaceRepository.js";
import { recommendForBrowser } from "./recommendations/recentSearchRecommendations.js";

export const DEFAULT_SEARCH_LIMIT = 8;
export const MAX_SEARCH_LIMIT = 50;
export const MAX_SEARCH_QUERY_LENGTH = 1000;

export class SearchInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "SearchInputError";
    this.status = 400;
    this.code = "INVALID_SEARCH_INPUT";
  }
}

export function validateSearchInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SearchInputError("검색 요청 본문은 객체여야 합니다.");
  }

  if (typeof body.query !== "string") {
    throw new SearchInputError("query는 문자열이어야 합니다.");
  }

  const query = body.query.trim();
  if (!query) throw new SearchInputError("검색어를 입력해 주세요.");
  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new SearchInputError(`검색어는 ${MAX_SEARCH_QUERY_LENGTH}자 이하여야 합니다.`);
  }

  const limit = body.limit === undefined ? DEFAULT_SEARCH_LIMIT : body.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
    throw new SearchInputError(`limit은 1부터 ${MAX_SEARCH_LIMIT} 사이의 정수여야 합니다.`);
  }

  return { query, limit };
}

export function createSearchHandler(repository, { historyRepository = null } = {}) {
  return async function searchHandler(req, res) {
    try {
      const { query, limit } = validateSearchInput(req.body);
      const filters = parseTravelQuery(query);
      const repositoryResult = await repository.listPlaces({ query, filters });
      const places = Array.isArray(repositoryResult) ? repositoryResult : repositoryResult.places;
      const matched = filterTravelPlaces(places, filters);
      const matchCountComplete = Array.isArray(repositoryResult) || repositoryResult.matchCountComplete !== false;
      const recommendation = historyRepository?.scope === "browser" && repository.dataSource !== "example"
        ? await recommendForBrowser({
          browserId: req.browserId,
          historyRepository,
          candidates: matched,
          currentConditions: filters,
          limit,
        })
        : { items: matched.slice(0, limit), personalized: false, personalizationBasis: "none", personalizationReason: "unavailable" };
      const items = recommendation.items.map((place) => ({
        ...place,
        reason: repository.dataSource === "tourapi" && place.reason === "장소명에 ‘바다’ 포함"
          ? place.reason
          : "검색 조건 일치",
      }));
      let history = { saved: false, reason: "not_configured" };

      if (repository.dataSource === "example") {
        history = { saved: false, reason: "example_data" };
      } else if (!matchCountComplete) {
        history = { saved: false, reason: "incomplete_match_count" };
      } else if (historyRepository) {
        try {
          history = await historyRepository.recordSearch({
            // Browser scope is an anonymous convenience identifier, never a member identity.
            ...(historyRepository.scope === "browser" ? { browserId: req.browserId } : { actorKey: null }),
            queryText: query,
            conditions: filters,
            matchedCount: matched.length,
            returnedCount: items.length,
            returnedPlaces: items,
          });
        } catch {
          // Search success is independent of history storage; report storage failure explicitly.
          history = { saved: false, reason: "save_failed" };
        }
      }

      return res.status(200).json({
        query,
        filters,
        matchedCount: matched.length,
        matchCountComplete,
        returnedCount: items.length,
        limit,
        dataSource: repository.dataSource,
        personalized: recommendation.personalized,
        personalization: {
          applied: recommendation.personalized,
          basis: recommendation.personalizationBasis,
          reason: recommendation.personalizationReason,
        },
        history,
        items,
      });
    } catch (error) {
      if (error instanceof SearchInputError) {
        return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      }

      if (error instanceof CatalogNotConfiguredError) {
        return res.status(error.status || 503).json({ error: { code: error.code, message: error.message } });
      }

      if (error?.status && error?.code) {
        return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      }

      return res.status(500).json({
        error: { code: "SEARCH_FAILED", message: "검색 처리 중 서버 오류가 발생했습니다." },
      });
    }
  };
}
