import { listDbPlaces } from "./placeDetailRepository.js";

// The home page only recommends destinations already registered in COMM_PLACE.
export function createDbRecommendationRepository({ listPlaces = listDbPlaces } = {}) {
  return {
    dataSource: "database",
    async listPlaces() {
      const places = await listPlaces();
      return {
        places: places.filter((place) => place.region && !place.extKey?.startsWith("osm:"))
          .map((place) => ({
            ...place,
            sourceCode: "COMM_PLACE",
            sourcePlaceId: String(place.id),
            regionCode: place.region,
            contentTypeId: "12",
            type: "관광지",
            tags: [],
          })),
        matchCountComplete: true,
      };
    },
  };
}
