// TourAPI contentTypeId is the source classification. A restaurant is not
// promoted to a travel destination just because it matches a user's interests.
export const TOUR_API_CATEGORIES = Object.freeze({
  "12": "관광지",
  "14": "문화시설",
  "15": "축제·공연",
  "25": "여행코스",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식점",
});

// The home section is explicitly for 관광지. Culture, festivals, courses, and
// leisure remain searchable in their own categories.
export const DESTINATION_CONTENT_TYPE_IDS = new Set(["12"]);

export function classifyTourApiPlace(place) {
  const contentTypeId = String(place?.contentTypeId || place?.sourceContentTypeId || place?.contenttypeid || "");
  return TOUR_API_CATEGORIES[contentTypeId] || "기타";
}
