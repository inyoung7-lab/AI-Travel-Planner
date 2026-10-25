import { getSupabase, unwrap, allRows } from "../db.js";
import { classifyTourApiPlace } from "./tourApiCategories.js";
import { normalizeTravelRegion, normalizeTourApiRegion } from "../../shared/travelRegions.js";
import { photoFromRow } from "./placePhotoRepository.js";
import { samplePlacePhoto } from './placePhotos.js';

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const REQUEST_TIMEOUT = 8000;
const cache = new Map();
const CACHE_MS = 30 * 60 * 1000;
const NEARBY_CATEGORIES = Object.freeze({ food: { contentTypeId: "39", radius: 10000 }, lodging: { contentTypeId: "32", radius: 10000 }, festival: { contentTypeId: "15", radius: 20000 }, sights: { contentTypeId: "12", radius: 10000 } });

export function cleanText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function itemsOf(payload) {
  if (payload?.response?.header?.resultCode !== "0000") throw new Error("TourAPI 응답 오류");
  const item = payload?.response?.body?.items?.item;
  return item ? (Array.isArray(item) ? item : [item]) : [];
}

async function request(operation, params, fetchImpl = fetch) {
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) return [];
  const base = process.env.TOUR_API_BASE_URL?.trim() || BASE_URL;
  const url = new URL(`${base.replace(/\/$/, "")}/${operation}`);
  Object.entries({ serviceKey: key, MobileOS: "ETC", MobileApp: process.env.TOUR_API_MOBILE_APP?.trim() || "AITravelPlanner", _type: "json", numOfRows: "30", pageNo: "1", ...params })
    .forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}`);
  return itemsOf(await response.json());
}

function normalizeName(name) {
  return String(name || "").replace(/\[[^\]]*\]|\([^)]*\)/g, "").replace(/[\s·-]/g, "").toLowerCase();
}

export function selectTourMatch(place, candidates) {
  if (place.extKey === "sample:2") return candidates.find((item) => String(item.contentid) === "127490") || null;
  const name = normalizeName(place.name);
  const shortName = normalizeName(place.name.split(/\s+/).slice(1).join(" "));
  const region = normalizeTravelRegion(place.region);
  if (name.length < 2) return null;
  return candidates.find((item) => {
    const candidateName = normalizeName(item.title);
    if (candidateName !== name && !(shortName.length >= 3 && candidateName === shortName) &&
        !(name.length >= 5 && candidateName.endsWith(name))) return false;
    const address = String(item.addr1 || "");
    const candidateRegion = normalizeTravelRegion(String(item.areacode || "")) || normalizeTravelRegion(address);
    const city = String(place.address || "").match(/[가-힣]+(?:시|군|구)/g)?.at(0);
    return region ? candidateRegion === region || (!candidateRegion && !!city && address.includes(city)) : false;
  }) || null;
}

async function geocodePlace(place) {
  const fullName = place.name.replace(/해양케이블카/g, "해상케이블카");
  const parts = fullName.split(/\s+/);
  const shortName = parts.slice(1).join(" ");
  const terms = [...new Set([fullName.replace(/\s/g, ""), shortName, parts[1], place.address].filter(Boolean))];
  const acceptedNames = [normalizeName(place.name), normalizeName(shortName), normalizeName(parts[1]), normalizeName(fullName)];
  const expectedRegion = normalizeTravelRegion(place.region);
  const expectedCity = String(place.address || "").match(/[가-힣]+시/)?.[0];
  for (const term of terms) {
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", term);
      url.searchParams.set("limit", "6");
      url.searchParams.set("bbox", "124.5,33,132,38.7");
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const payload = await response.json();
      const match = (payload.features || []).find((feature) => {
        const properties = feature.properties || {};
        const actualName = normalizeName(properties.name);
        const nameMatches = acceptedNames.some((name) => name.length >= 2 &&
          (actualName === name || (name.length >= 2 && actualName.startsWith(name) && actualName.length <= name.length + 2)));
        const actualRegion = normalizeTravelRegion(properties.state) || normalizeTravelRegion(properties.city);
        const combinedRegion = String(properties.state || "");
        const regionMatches = actualRegion === expectedRegion ||
          (combinedRegion.startsWith("전남광주") && ["전남", "광주"].includes(expectedRegion));
        const cityMatches = !expectedCity || `${properties.city || ""} ${properties.county || ""}`.includes(expectedCity);
        const [lng, lat] = feature.geometry?.coordinates || [];
        return nameMatches && regionMatches && cityMatches && Number.isFinite(lat) && Number.isFinite(lng);
      });
      if (match) return { lat: match.geometry.coordinates[1], lng: match.geometry.coordinates[0] };
    } catch { /* 다른 검색어를 시도합니다. */ }
  }
  return null;
}

export async function getTourDetail(contentId, { refresh = false } = {}) {
  if (!/^\d+$/.test(String(contentId))) return null;
  const key = `tour:${contentId}`;
  if (!refresh) {
    const saved = await unwrap(getSupabase().from('comm_place_tour_detail').select('payload').eq('content_id', String(contentId)).maybeSingle());
    if (saved?.payload?.isActive === false) return null;
    if (saved?.payload?.source === 'tourapi' && !saved.payload.summaryOnly && !saved.payload.detailStale) return saved.payload;
  }
  const common = (await request("detailCommon2", { contentId })).at(0);
  if (!common?.title) return null;
  const contentTypeId = String(common.contenttypeid || "12");
  const [introResult, infoResult, imageResult] = await Promise.allSettled([
    request("detailIntro2", { contentId, contentTypeId }),
    request("detailInfo2", { contentId, contentTypeId }),
    request("detailImage2", { contentId, imageYN: "Y", numOfRows: "30" }),
  ]);
  const intro = introResult.status === "fulfilled" ? introResult.value.at(0) || {} : {};
  const info = infoResult.status === "fulfilled" ? infoResult.value : [];
  const images = imageResult.status === "fulfilled" ? imageResult.value : [];
  const permittedPhotoTypes = new Set(["Type1", "Type3"]);
  const mainPhotos = permittedPhotoTypes.has(common.cpyrhtDivCd) ? [common.firstimage, common.firstimage2] : [];
  const fee = info.find((entry) => /입장료|이용요금|요금/.test(entry.infoname || ""));
  const value = {
    source: "tourapi", contentId: String(contentId), contentTypeId, isActive: true, sourceModifiedTime: String(common.modifiedtime || ''), region: normalizeTourApiRegion(common), name: cleanText(common.title), category: classifyTourApiPlace({ contentTypeId }),
    address: cleanText([common.addr1, common.addr2].filter(Boolean).join(" ")),
    overview: cleanText(common.overview),
    phone: cleanText(common.tel || intro.infocenter || intro.infocenterculture),
    hours: cleanText(intro.usetime || intro.usetimeculture || intro.usetimeleports || intro.opentime),
    closed: cleanText(intro.restdate || intro.restdateculture || intro.restdateleports),
    parking: cleanText(intro.parking || intro.parkingculture || intro.parkingleports),
    fee: cleanText(fee?.infotext || intro.usefee || intro.usefeeculture),
    lat: Number(common.mapy) || null, lng: Number(common.mapx) || null,
    images: [...new Set([...mainPhotos, ...images.filter((item) => permittedPhotoTypes.has(item.cpyrhtDivCd)).map((item) => item.originimgurl || item.smallimageurl)].filter(Boolean))].slice(0, 12),
    imageSource: "한국관광공사 TourAPI",
    extraInfo: info.filter((entry) => entry.infoname && entry.infotext).map((entry) => ({ label: cleanText(entry.infoname), value: cleanText(entry.infotext) })).slice(0, 12),
  };
  // New external details are persisted before the page receives them.
  const writer = getSupabase({ admin: true });
  const storedPlace = await unwrap(writer.from('comm_place').upsert({ ext_key: `tourapi:${contentId}`, name: value.name, address: value.address,
    region: value.region || null, lat: value.lat, lng: value.lng }, { onConflict: 'ext_key' }).select('place_id').single());
  await unwrap(writer.from('comm_place_tour_detail').upsert({ place_id: storedPlace.place_id, content_id: String(contentId), payload: value, synced_at: new Date().toISOString() }));
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function getNearbyPlaces({ lat, lng, category, excludeContentId = "", responseCache = null }) {
  const config = NEARBY_CATEGORIES[category];
  if (!config) throw new RangeError("지원하지 않는 주변 장소 분류예요.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    throw new RangeError("올바른 국내 위치 좌표가 필요해요.");
  }
  const key = `nearby:${category}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  const cached = cache.get(key);
  let items = responseCache ? await responseCache.get(key, category === "festival" ? 86400000 : 30 * 86400000).catch(() => null) : null;
  if (Array.isArray(items)) {
    // Reuse a previously stored response before requiring an external API key.
  } else if (cached && Date.now() - cached.at < CACHE_MS) {
    items = cached.value;
  } else {
    if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error("TourAPI 인증키가 설정되지 않았어요.");
    const rows = await request("locationBasedList2", {
      mapX: String(lng), mapY: String(lat), radius: String(config.radius), arrange: "E",
      contentTypeId: config.contentTypeId, numOfRows: "30",
    });
    items = rows.filter((item) => item.contentid && item.title).map((item) => ({
      contentId: String(item.contentid), name: cleanText(item.title), category: classifyTourApiPlace(item),
      address: cleanText([item.addr1, item.addr2].filter(Boolean).join(" ")),
      distanceMeters: Number(item.dist) || null,
      image: ["Type1", "Type3"].includes(item.cpyrhtDivCd) ? item.firstimage || item.firstimage2 || null : null,
    }));
    cache.set(key, { at: Date.now(), value: items });
    if (responseCache) await responseCache.set(key, items).catch(() => {});
  }
  return { items: items.filter((item) => item.contentId !== String(excludeContentId)).slice(0, 8), radiusMeters: config.radius };
}

function upperPlace(row) {
  const detail = row.comm_place_tour_detail;
  return { ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toUpperCase(), v])),
    PAYLOAD: detail?.payload ? JSON.stringify(detail.payload) : null };
}
export async function listDbPlaces() {
  const rows = await allRows(() => getSupabase().from('travel_saved_tour_catalog').select('*').eq('detail->>contentTypeId', '12').order('place_id'), 1000);
  return rows.map((row) => mapDbPlaceListRow(upperPlace({ ...row, comm_place_tour_detail: { payload: row.detail } })));
}

const catalogPages = new Map();
let catalogCounts;
function getCatalogCounts() {
  if (!catalogCounts || Date.now() >= catalogCounts.expires) {
    const entry = { expires: Date.now() + 5 * 60000 };
    entry.promise = unwrap(getSupabase().rpc('travel_tour_catalog_counts')).catch(error => {
      if (catalogCounts === entry) catalogCounts = null;
      throw error;
    });
    catalogCounts = entry;
  }
  return catalogCounts.promise;
}
export function listDbCatalogPage({ page = 1, q = '', region = '' } = {}) {
  q = q.trim();
  region = region === '전체' ? '' : region;
  const key = JSON.stringify([page, q, region]);
  const found = catalogPages.get(key);
  if (found && Date.now() < found.expires) return found.promise;
  if (catalogPages.size >= 80) catalogPages.delete(catalogPages.keys().next().value);
  const entry = { expires: Date.now() + 60000 };
  entry.promise = loadDbCatalogPage({ page, q, region }).catch(error => {
    if (catalogPages.get(key) === entry) catalogPages.delete(key);
    throw error;
  });
  catalogPages.set(key, entry);
  return entry.promise;
}
async function loadDbCatalogPage({ page, q, region }) {
  const pageSize = 24;
  let query = getSupabase().from('travel_saved_tour_catalog').select('*', { count: 'exact' }).eq('detail->>contentTypeId', '12');
  if (region && region !== '전체') query = query.eq('region', region);
  if (q.trim()) query = query.ilike('search_text', `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`);
  const [{ data, count, error }, counts] = await Promise.all([
    query.order('region').order('place_id').range((page - 1) * pageSize, page * pageSize - 1),
    getCatalogCounts(),
  ]);
  if (error) throw error;
  return { items: data.map((row) => mapDbPlaceListRow(upperPlace({ ...row, comm_place_tour_detail: { payload: row.detail } }))), total: count, page, pageSize, catalogTotal: counts.total, regionCounts: counts.regions };
}

export function mapDbPlaceListRow(row) {
  let detail = {};
  try { detail = row.PAYLOAD ? JSON.parse(row.PAYLOAD) : {}; } catch { /* 목록은 상세 데이터가 손상되어도 계속 표시합니다. */ }
  const image = Array.isArray(detail?.images) ? detail.images.find((url) => typeof url === "string" && url.trim()) : null;
  const secureImage = image?.replace(/^http:\/\/tong\.visitkorea\.or\.kr\//i, "https://tong.visitkorea.or.kr/");
  const representative = photoFromRow(row);
  return {
    id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", extKey: row.EXT_KEY || "",
    image: representative?.image || secureImage || samplePlacePhoto(row.EXT_KEY)?.url || null,
    imageCredit: detail?.imageCredits?.[0] || samplePlacePhoto(row.EXT_KEY) || null,
  };
}

export async function getDbPlace(id) {
  const record = await unwrap(getSupabase().from('comm_place').select('*,comm_place_tour_detail(payload)').eq('place_id', id).maybeSingle());
  const row = record ? upperPlace(record) : null;
  const storedTour = record?.comm_place_tour_detail?.payload || null;
    if (!row) return null;
    if (storedTour?.isActive === false) return null;
    const place = { id: row.PLACE_ID, name: row.NAME, address: row.ADDRESS || "", region: row.REGION || "", lat: row.LAT, lng: row.LNG, extKey: row.EXT_KEY || "" };
    let tourId = /^tourapi:(\d+)$/.exec(place.extKey)?.[1];
    if (!tourId && place.extKey === "sample:2") tourId = "127490";
    if (!tourId && process.env.TOUR_API_SERVICE_KEY?.trim()) {
      const matchKey = `match:${place.id}:${place.name}`;
      const cachedMatch = cache.get(matchKey);
      if (cachedMatch && Date.now() - cachedMatch.at < (cachedMatch.value ? CACHE_MS : 5 * 60 * 1000)) {
        tourId = cachedMatch.value;
      } else try {
        const keywords = [...new Set([
          normalizeName(place.name),
          place.name.split(/\s+/).slice(1).join(" "),
          place.name.split(/\s+/)[1],
        ].filter((keyword) => typeof keyword === "string" && keyword.length >= 2))];
        for (const keyword of keywords) {
          const candidates = await request("searchKeyword2", { keyword, numOfRows: "100" });
          tourId = selectTourMatch(place, candidates)?.contentid;
          if (tourId) break;
        }
        cache.set(matchKey, { at: Date.now(), value: tourId || null });
      } catch { /* DB 정보만으로 상세를 표시합니다. */ }
    }
    let tour = storedTour;
    if (tourId && (!tour || tour.summaryOnly || tour.detailStale)) {
      try { const fresh = await getTourDetail(tourId); if (fresh) tour = fresh; } catch { /* DB 정보만으로 상세를 표시합니다. */ }
    }
    let geocoded = null;
    if (!place.lat && !tour?.lat) {
      const geocodeKey = `geocode:${place.id}:${place.name}:${place.address}`;
      const cachedGeocode = cache.get(geocodeKey);
      if (cachedGeocode && Date.now() - cachedGeocode.at < (cachedGeocode.value ? CACHE_MS : 5 * 60 * 1000)) {
        geocoded = cachedGeocode.value;
      } else {
        geocoded = await geocodePlace(place);
        cache.set(geocodeKey, { at: Date.now(), value: geocoded });
      }
    }
    const referencePhoto = samplePlacePhoto(place.extKey);
    const hasTourPhotos = tour?.images?.length > 0;
    return {
      source: "db", id: place.id, name: place.name, category: tour?.category || null, address: place.address || tour?.address || "",
      region: place.region, lat: place.lat ?? tour?.lat ?? geocoded?.lat ?? null, lng: place.lng ?? tour?.lng ?? geocoded?.lng ?? null,
      coordinateSource: geocoded ? "OpenStreetMap 기반 주소 검색" : null, coordinateApproximate: !!geocoded,
      overview: tour?.overview || "", phone: tour?.phone || "", hours: tour?.hours || "", closed: tour?.closed || "",
      parking: tour?.parking || "", fee: tour?.fee || "", images: hasTourPhotos ? tour.images : referencePhoto ? [referencePhoto.url] : [],
      imageCredits: hasTourPhotos ? tour.imageCredits || [] : referencePhoto ? [referencePhoto] : [],
      informationSourceUrl: tour?.sourceUrl || null,
      imageSource: hasTourPhotos ? tour.imageSource : referencePhoto ? 'Wikimedia Commons · 여행지 참고 사진' : null, extraInfo: tour?.extraInfo || [], tourContentId: tour?.contentId || null,
    };
}
