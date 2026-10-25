# External API usage

> Historical Oracle implementation notes from the main branch. The running merged app uses Supabase. Follow `docs/supabase-migration.md` and `server/sync-tourism.js` for current storage and refresh procedures. The Oracle maintenance scripts below are retained as reference and are not loaded by the server.

The running app reads the home destination recommendations and registered place details from `COMM_PLACE` and `COMM_PLACE_TOUR_DETAIL`. Registered place coordinates are stored in `COMM_PLACE`, so viewing a registered place does not call TourAPI or Photon.

Curated representative photo metadata is stored in `COMM_PLACE_PHOTO` (path, source, source URL, subject, and regional flag). Image bytes stay in `public/images/place-preview`. The API creates the table and inserts missing seed rows automatically at startup. Existing Oracle rows are preserved, so edit them to change a place photo; the application does not read a JavaScript mapping.

Four verified name aliases (협재해변, 여수 해양케이블카, 인천 차이나타운, 동피랑마을) have TourAPI detail snapshots in the same table. Refresh these only when needed with `node server/sync-known-place-details.js`. The remaining places without a detail snapshot show their saved DB fields and local representative photo.

AI itinerary generation still calls the Codyssey model once per requested itinerary. Its food and lodging candidate lists are read from `COMM_ITINERARY_CANDIDATE` instead of making TourAPI requests during generation. The table currently contains 170 food and 154 lodging candidates across 17 regions. To refresh it deliberately, run:

```sh
node server/sync-itinerary-candidates.js
```

The sync command makes one TourAPI `areaBasedList2` request for each region and candidate type (34 total). It creates the table if needed and replaces each region and type only after a successful response.

Search queries can be arbitrary and include food or lodging absent from `COMM_PLACE`. Nearby recommendations can include those categories and current festivals. Their first TourAPI response is stored in `COMM_EXTERNAL_RESPONSE_CACHE` and reused across server restarts. Search and non-festival nearby results expire after 30 days; nearby festival results expire after one day. Standalone TourAPI detail pages use the same 30-day cache. Cache lookup failures fall back to TourAPI.

The following external calls remain by design: Codyssey when the user generates an itinerary; TourAPI on a new or expired search, nearby request, or standalone TourAPI detail; Kakao Maps and OpenStreetMap map tiles when a map is displayed; and place search geocoding when a user searches for a new community place that is not in the database. Local-eum map address geocoding only runs when a place has no confirmed stored coordinates. User accounts and user-generated content still use their existing database services.
