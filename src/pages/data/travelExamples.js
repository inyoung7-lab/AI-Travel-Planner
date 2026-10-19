import { examplePlaces } from "../../../shared/travelExamples.js";
import { filterTravelPlaces, parseTravelQuery } from "../../../shared/travelSearch.js";

export { examplePlaces, parseTravelQuery };

export function searchExamplePlaces(query) {
  const conditions = parseTravelQuery(query);
  return { conditions, results: filterTravelPlaces(examplePlaces, conditions) };
}
