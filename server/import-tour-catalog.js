import { getSupabase, unwrap } from './db.js';
import { getTourDetail } from './repositories/placeDetailRepository.js';

const regions = { 서울: '1', 인천: '2', 대전: '3', 대구: '4', 광주: '5', 부산: '6', 울산: '7', 세종: '8', 경기: '31', 강원: '32', 충북: '33', 충남: '34', 경북: '35', 경남: '36', 전북: '37', 전남: '38', 제주: '39' };
const types = [['12', 5], ['39', 3], ['32', 3]];
export function selectCatalogItems(rows, areaCode, type, count) {
  const seen = new Set();
  return rows.filter((p) => {
    if (!/^\d+$/.test(String(p.contentid)) || String(p.areacode) !== areaCode || String(p.contenttypeid) !== type || !p.title?.trim() || !p.addr1?.trim() || !Number(p.mapx) || !Number(p.mapy) || seen.has(String(p.contentid))) return false;
    seen.add(String(p.contentid)); return true;
  }).sort((a, b) => Number(Boolean(b.firstimage || b.firstimage2)) - Number(Boolean(a.firstimage || a.firstimage2))).slice(0, count);
}
async function list(areaCode, type) {
  const url = new URL(`${process.env.TOUR_API_BASE_URL || 'https://apis.data.go.kr/B551011/KorService2'}/areaBasedList2`);
  url.search = new URLSearchParams({ serviceKey: process.env.TOUR_API_SERVICE_KEY, MobileOS: 'ETC', MobileApp: 'AITravelPlanner', _type: 'json', numOfRows: '100', pageNo: '1', arrange: 'Q', areaCode, contentTypeId: type });
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}`);
  const json = await response.json();
  if (json.response?.header?.resultCode !== '0000') throw new Error(`TourAPI ${json.response?.header?.resultCode || 'INVALID'}`);
  const rows = json.response?.body?.items?.item || [];
  return Array.isArray(rows) ? rows : [rows];
}
export async function importCatalog() {
  if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error('관광공사 인증키가 필요합니다.');
  const db = getSupabase({ admin: true });
  let saved = 0;
  const failed = [];
  for (const [region, area] of Object.entries(regions)) {
    const counts = {};
    for (const [type, count] of types) {
      const selected = selectCatalogItems(await list(area, type), area, type, count);
      counts[type] = 0;
      for (const row of selected) {
        const contentId = String(row.contentid);
        try {
          const detail = await getTourDetail(contentId, { refresh: true });
          if (!detail || detail.contentTypeId !== type) throw new Error('상세 분류 불일치');
          const place = await unwrap(db.from('comm_place').upsert({ ext_key: `tourapi:${contentId}`, name: detail.name, address: detail.address || row.addr1, region,
            lat: detail.lat || Number(row.mapy), lng: detail.lng || Number(row.mapx) }, { onConflict: 'ext_key' }).select('place_id').single());
          await unwrap(db.from('comm_place_tour_detail').upsert({ place_id: place.place_id, content_id: contentId, payload: detail, synced_at: new Date().toISOString() }));
          saved++; counts[type]++;
        } catch (error) { failed.push({ contentId, region, reason: error.message }); }
      }
    }
    console.log(JSON.stringify({ region, saved: counts }));
  }
  console.log(JSON.stringify({ saved, failed }));
  if (failed.length) process.exitCode = 1;
}
if (process.argv[1]?.endsWith('import-tour-catalog.js')) importCatalog().catch((error) => { console.error(error.message); process.exitCode = 1; });
