import { getSupabase, unwrap, allRows } from './db.js';
import { getTourDetail } from './repositories/placeDetailRepository.js';
export async function syncTourPlaceDetails({ all = false } = {}) {
  const db = getSupabase({ admin: true });
  const rows = await allRows(() => db.from('comm_place').select('place_id,name,ext_key,comm_place_tour_detail(place_id)').like('ext_key', 'tourapi:%').order('place_id'));
  let saved = 0; const incomplete = [], failed = [];
  for (const row of rows.filter((p) => all || !p.comm_place_tour_detail)) {
    const contentId = row.ext_key.slice(8);
    try {
      const detail = await getTourDetail(contentId, { refresh: true });
      if (!detail?.name || detail.contentId !== contentId) throw new Error('관광 상세 응답 없음');
      await unwrap(db.from('comm_place_tour_detail').upsert({ place_id: row.place_id, content_id: contentId, payload: detail, synced_at: new Date().toISOString() }));
      saved++;
      if (!detail.overview || !detail.images.length) incomplete.push({ id: row.place_id, name: row.name });
    } catch (error) { failed.push({ id: row.place_id, name: row.name, reason: error.message }); }
  }
  console.log({ saved, failed, incomplete });
  if (failed.length) process.exitCode = 1;
  return { saved, failed, incomplete };
}
if (process.argv[1]?.endsWith('sync-tour-place-details.js')) syncTourPlaceDetails({ all: process.argv.includes('--all') }).catch((error) => { console.error(error.message); process.exitCode = 1; });
