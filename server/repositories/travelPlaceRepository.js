import { examplePlaces } from "../../shared/travelExamples.js";
import { createTourApiRepository } from "./tourApiRepository.js";
import { createSavedTourRepository } from './savedTourRepository.js';

export class CatalogNotConfiguredError extends Error {
  constructor(code = "CATALOG_NOT_CONFIGURED", message = "검색 데이터 연결 설정을 확인해 주세요.") {
    super(message);
    this.name = "CatalogNotConfiguredError";
    this.code = code;
    this.status = 503;
  }
}

export function createTravelPlaceRepository({ mode = process.env.TRAVEL_SEARCH_DATA_SOURCE, tourApiOptions } = {}) {
  if (mode === "example") {
    return {
      dataSource: "example",
      async listPlaces() {
        return { places: examplePlaces, matchCountComplete: true };
      },
    };
  }

  if (mode === "tourapi") return createTourApiRepository(tourApiOptions);
  if (mode === 'database') return createSavedTourRepository();

  return {
    dataSource: "database",
    async listPlaces() {
      throw new CatalogNotConfiguredError();
    },
  };
}
