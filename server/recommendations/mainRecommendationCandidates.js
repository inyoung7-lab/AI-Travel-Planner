// TourAPI contentTypeId values for travel-focused places. Shopping (38) and
// unknown types are deliberately absent from this allowlist.
export const MAIN_RECOMMENDATION_CONTENT_TYPE_IDS = new Set(["12", "14", "15", "25", "28", "32", "39"]);
const EXCLUDED_CATEGORY_CODES = new Set(["A04"]); // TourAPI legacy major category: shopping

function sourceCategoryCodes(place) {
  const codes = place.sourceCategoryCodes || {};
  return [codes.cat1, codes.cat2, codes.cat3, codes.lclsSystm1, codes.lclsSystm2, codes.lclsSystm3]
    .filter((code) => typeof code === "string" && code.trim())
    .map((code) => code.trim().toUpperCase());
}

/** Strict TourAPI-only allowlist for the main recommendation candidate pool. */
export function filterMainRecommendationCandidates(places) {
  return (Array.isArray(places) ? places : []).filter((place) => {
    const contentTypeId = String(place?.contentTypeId || place?.sourceContentTypeId || "");
    if (!MAIN_RECOMMENDATION_CONTENT_TYPE_IDS.has(contentTypeId)) return false;
    return !sourceCategoryCodes(place).some((code) => EXCLUDED_CATEGORY_CODES.has(code));
  });
}
