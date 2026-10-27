import { getSupabase, allRows } from '../db.js';
import { mapSavedTourPlace } from '../repositories/savedTourRepository.js';

export function rankHomeViews(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (!/^(tourapi:)?\d{1,15}$/.test(row.place_key || '')) continue;
    counts.set(row.place_key, (counts.get(row.place_key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function createPopularHomePlacesLoader({ getClient = () => getSupabase({ admin: true }), now = () => new Date() } = {}) {
  let cached;
  return async function loadPopularHomePlaces(limit = 8) {
    if (!cached || cached.expires < Date.now()) {
      const at = now();
      const from = new Date(at.getTime() - 7 * 86400000);
      const promise = (async () => {
        const rows = await allRows(() => getClient().from('travel_site_activity').select('place_key')
          .like('event_key', 'member:%').eq('kind', 'view')
          .gte('occurred_at', from.toISOString()).lte('occurred_at', at.toISOString()).order('event_key'));
        const ranked = rankHomeViews(rows).slice(0, 32);
        if (!ranked.length) return [];
        const columns = 'place_id,ext_key,name,address,region,lat,lng,detail';
        const tourKeys = ranked.map(([key]) => key).filter(key => key.startsWith('tourapi:'));
        const dbIds = ranked.map(([key]) => key).filter(key => !key.startsWith('tourapi:'));
        const query = () => getClient().from('travel_saved_tour_catalog').select(columns).eq('detail->>contentTypeId', '12');
        const results = await Promise.all([
          tourKeys.length ? query().in('ext_key', tourKeys) : { data: [] },
          dbIds.length ? query().in('place_id', dbIds.map(Number)) : { data: [] },
        ]);
        const places = results.flatMap(result => {
          if (result.error) throw result.error;
          return (result.data || []).map(mapSavedTourPlace).filter(Boolean);
        });
        // Rejoin live public catalog rows; stale activity snapshots never revive hidden places.
        const byKey = new Map();
        for (const place of places) { byKey.set(String(place.id), place); byKey.set(`tourapi:${place.sourcePlaceId}`, place); }
        const views = new Map();
        for (const [key, count] of ranked) {
          const place = byKey.get(key);
          if (place) views.set(place.id, { place, count: (views.get(place.id)?.count || 0) + count });
        }
        return [...views.values()].sort((a, b) => b.count - a.count || a.place.id - b.place.id)
          .map(({ place, count }) => ({ ...place, viewCount: count, recommendationReason: `최근 7일 상세 조회 ${count}회` }));
      })();
      const entry = { expires: Date.now() + 60000, promise };
      cached = entry;
      promise.catch(() => { if (cached === entry) cached = null; });
    }
    return (await cached.promise).slice(0, limit);
  };
}

export const loadPopularHomePlaces = createPopularHomePlacesLoader();
