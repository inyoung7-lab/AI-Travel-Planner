import { filterTravelPlaces } from "../../shared/travelSearch.js";
import { CatalogNotConfiguredError } from "../repositories/travelPlaceRepository.js";
import { recommendForBrowser, rankCandidatesWithRecentSearches, countRecentSearchPreferences } from "./recentSearchRecommendations.js";
import { loadPopularHomePlaces } from './popularHomePlaces.js';
import { filterMainRecommendationCandidates } from "./mainRecommendationCandidates.js";

const EMPTY_CONDITIONS = { regions: [], types: [], themes: [], keywords: [] };
const DEFAULT_HOME_LIMIT = 8;

export function createHomeRecommendationsHandler(repository, { historyRepository = null, limit = DEFAULT_HOME_LIMIT, popularPlacesLoader = loadPopularHomePlaces } = {}) {
  return async function homeRecommendationsHandler(req, res) {
    try {
      if (repository.listHomePlaces) {
        let records = [];
        if (req.browserId && historyRepository?.scope === 'browser') {
          try { records = await historyRepository.listRecentConditions({ browserId: req.browserId }); } catch { /* Public fallback remains available. */ }
        }
        let candidates = [];
        let ranked = { personalized: false, items: [] };
        if (records.length) {
          const { frequencies } = countRecentSearchPreferences(records);
          const regions = Object.keys(frequencies.regions).sort((a, b) => frequencies.regions[b] - frequencies.regions[a]);
          try {
            candidates = filterMainRecommendationCandidates(await repository.listHomePlaces({ regions, limit: 204 }));
            ranked = rankCandidatesWithRecentSearches({ candidates, historyRecords: records, currentConditions: EMPTY_CONDITIONS, limit });
          } catch { /* A preference lookup failure must not hide public recommendations. */ }
        }
        let items = ranked.items;
        let mode = 'personalized';
        if (!ranked.personalized) {
          let popular = [];
          try { popular = filterMainRecommendationCandidates(await popularPlacesLoader(limit)); } catch { /* Fall back to the public catalog. */ }
          let defaults = [];
          if (popular.length < limit) {
            try { defaults = filterMainRecommendationCandidates(await repository.listHomePlaces({ limit })); }
            catch (error) { if (!popular.length) throw error; }
          }
          const seen = new Set();
          items = [...popular, ...defaults.map(place => ({ ...place, recommendationReason: '처음 여행을 계획할 때 둘러보기 좋은 여행지' }))]
            .filter(place => { if (seen.has(place.id)) return false; seen.add(place.id); return true; }).slice(0, limit);
          mode = popular.length ? 'popular' : 'default';
        }
        return res.status(200).json({ dataSource: repository.dataSource, mode,
          personalized: ranked.personalized, personalization: { applied: ranked.personalized, basis: ranked.personalized ? 'browser' : 'none' },
          candidateCount: candidates.length, matchCountComplete: false, returnedCount: items.length, items });
      }
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
