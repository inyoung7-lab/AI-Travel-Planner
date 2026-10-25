import { getSupabase, allRows } from '../db.js';

export function mapSavedTourPlace(row) {
  const detail = row.detail || row.comm_place_tour_detail?.payload;
  if (!/^tourapi:\d+$/.test(row.ext_key || '') || detail?.source !== 'tourapi' || !detail.contentTypeId) return null;
  const text = `${row.name} ${detail.overview || ''}`;
  const tags = ['바다', '카페', '정원', '자연', '휴식', '산책', '액티비티'].filter((tag) => text.includes(tag));
  if (/(?:^|\s)[가-힣]*산(?:\s|$|은|의|에)/u.test(text)) tags.push('산');
  const subtype = detail.contentTypeId === '32' ? ['게스트하우스', '캠핑장', '리조트', '펜션', '호텔', '모텔', '민박'].find((name) => text.includes(name)) : null;
  return { id: row.place_id, sourceCode: 'KTO_TOURAPI', sourcePlaceId: detail.contentId, contentTypeId: detail.contentTypeId,
    name: row.name, region: row.region, regionCode: row.region, address: row.address, type: subtype || detail.category, category: detail.category,
    tags, description: String(detail.overview || '').slice(0, 160), image: detail.images?.[0] || null, reason: '관광공사에서 가져와 저장한 장소', lat: row.lat, lng: row.lng };
}
export function createSavedTourRepository() {
  return { dataSource: 'supabase-tourapi', async listPlaces({ filters = {} } = {}) {
    const cacheKey = JSON.stringify([filters.regions || [], filters.types || [], filters.keywords || []]);
    let cached = catalogCache.get(cacheKey);
    if (!cached || cached.expires < Date.now()) {
      const promise = allRows(() => {
        let query = getSupabase().from('travel_saved_tour_catalog').select('*').order('place_id');
        if (filters.regions?.length) query = query.in('region', filters.regions);
        const types = { 관광지: '12', 문화시설: '14', '축제·공연': '15', 여행코스: '25', 레포츠: '28', 숙박: '32', 숙소: '32', 호텔: '32', 리조트: '32', 펜션: '32', 게스트하우스: '32', 모텔: '32', 민박: '32', 캠핑장: '32', 쇼핑: '38', 음식점: '39', 맛집: '39' };
        if (filters.types?.length && filters.types.every((t) => types[t])) query = query.in('detail->>contentTypeId', [...new Set(filters.types.map((t) => types[t]))]);
        for (const keyword of filters.keywords || []) query = query.ilike('search_text', `%${keyword.replace(/[\\%_]/g, '\\$&')}%`);
        return query;
      }, 1000).then((rows) => rows.map(mapSavedTourPlace).filter(Boolean));
      cached = { expires: Date.now() + 60000, promise };
      catalogCache.set(cacheKey, cached);
      if (catalogCache.size > 24) catalogCache.delete(catalogCache.keys().next().value);
      promise.catch(() => catalogCache.delete(cacheKey));
    }
    return { places: await cached.promise, matchCountComplete: true };
  } };
}
const catalogCache = new Map();
