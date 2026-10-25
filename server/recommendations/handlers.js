import { filterTravelPlaces } from "../../shared/travelSearch.js";
import { CatalogNotConfiguredError } from "../repositories/travelPlaceRepository.js";
import { recommendForBrowser } from "./recentSearchRecommendations.js";
import { filterMainRecommendationCandidates } from "./mainRecommendationCandidates.js";

const EMPTY_CONDITIONS = { regions: [], types: [], themes: [], keywords: [] };
const DEFAULT_HOME_LIMIT = 8;

export function createHomeRecommendationsHandler(repository, { historyRepository = null, limit = DEFAULT_HOME_LIMIT } = {}) {
  return async function homeRecommendationsHandler(req, res) {
    try {
      const result = await repository.listPlaces({ filters: repository.dataSource === 'supabase-tourapi' ? { ...EMPTY_CONDITIONS, types: ['관광지'] } : EMPTY_CONDITIONS });
      const places = Array.isArray(result) ? result : result.places;
      const sourceClassifiedPlaces = repository.dataSource === "example"
        ? places || []
        : filterMainRecommendationCandidates(places || []);
      const candidates = filterTravelPlaces(sourceClassifiedPlaces, EMPTY_CONDITIONS);
      const recommendation = repository.dataSource === "example"
        ? { items: candidates.slice(0, limit), personalized: false, personalizationBasis: "none", personalizationReason: "example_data" }
        : historyRepository?.scope === "browser"
          ? await recommendForBrowser({
            browserId: req.browserId,
            historyRepository,
            candidates,
            currentConditions: EMPTY_CONDITIONS,
            limit,
          })
          : { items: candidates.slice(0, limit), personalized: false, personalizationBasis: "none", personalizationReason: "unavailable" };

      return res.status(200).json({
        dataSource: repository.dataSource,
        candidateCount: candidates.length,
        matchCountComplete: Array.isArray(result) || result.matchCountComplete !== false,
        returnedCount: recommendation.items.length,
        personalized: recommendation.personalized,
        personalization: {
          applied: recommendation.personalized,
          basis: recommendation.personalizationBasis,
          reason: recommendation.personalizationReason,
        },
        items: recommendation.items,
      });
    } catch (error) {
      if (error instanceof CatalogNotConfiguredError || (error?.status && error?.code)) {
        return res.status(error.status || 503).json({ error: { code: error.code, message: error.message } });
      }
      return res.status(500).json({
        error: { code: "RECOMMENDATIONS_FAILED", message: "여행지 목록을 불러오지 못했습니다." },
      });
    }
  };
}
