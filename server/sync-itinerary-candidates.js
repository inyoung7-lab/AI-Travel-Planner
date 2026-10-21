// Run manually to refresh the food and lodging candidates used by AI itineraries.
import "dotenv/config";
import { syncItineraryCandidates } from "./repositories/itineraryCandidateRepository.js";

try {
  const counts = await syncItineraryCandidates();
  console.log(JSON.stringify(counts, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
