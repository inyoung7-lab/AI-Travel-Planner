import { examplePlaces } from "../../shared/travelExamples.js";

export class CatalogNotConfiguredError extends Error {
  constructor() {
    super("관광지 카탈로그 저장소가 아직 설정되지 않았습니다.");
    this.name = "CatalogNotConfiguredError";
    this.code = "CATALOG_NOT_CONFIGURED";
  }
}

export function createTravelPlaceRepository({ mode = process.env.TRAVEL_SEARCH_DATA_SOURCE } = {}) {
  if (mode === "example") {
    return {
      dataSource: "example",
      async listPlaces() {
        return examplePlaces;
      },
    };
  }

  return {
    dataSource: "database",
    async listPlaces() {
      throw new CatalogNotConfiguredError();
    },
  };
}
