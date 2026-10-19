export const REGION_LABELS = { SEOUL: '서울', BUSAN: '부산', CHANGWON: '창원' };

const FEATURED_EXPERIENCE_CODES = [
  'DEMO-MASAN-MYSTERY-MAP',
  'DEMO-MASAN-SEAFOOD-LAB',
];

export const CATALOG_INTERESTS = [
  { value: 'MARKET_FOOD', label: '시장·음식' },
  { value: 'NEIGHBORHOOD', label: '동네 탐방' },
  { value: 'TRADITION_HISTORY', label: '전통·역사' },
  { value: 'NATURE_OUTDOOR', label: '자연·야외' },
  { value: 'LANGUAGE_FRIENDS', label: '언어·친구' },
  { value: 'CRAFTS', label: '공예·만들기' },
];

export function catalogRecruitingOnly(params) {
  return params.has('recruiting') ? params.get('recruiting') !== 'off' : false;
}

export function hasCatalogLanguageMetadata(items) {
  return items.some(experience => Array.isArray(experience.available_languages));
}

export function catalogDeliveryLanguages(items) {
  return new Set(items.flatMap(experience => Array.isArray(experience.available_languages)
    ? experience.available_languages.filter(language => ['ko', 'en', 'ja'].includes(language))
    : []));
}

function catalogInterestCodes(experience) {
  const text = `${experience.title || ''} ${experience.description || ''}`.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const interests = new Set();
  if (experience.template_id === 101 || /시장|음식|맛|밥상|식재료|수산물|먹거리/.test(text)) interests.add('MARKET_FOOD');
  if (experience.template_id === 102 || /공예|공방|만들기|손작업/.test(text)) interests.add('CRAFTS');
  if (experience.template_id === 103 || /골목|동네|마을|탐방|산책|문화/.test(text)) interests.add('NEIGHBORHOOD');
  if (/전통|역사|유산|옛|근대/.test(text)) interests.add('TRADITION_HISTORY');
  if (/자연|야외|바다|해양|산책|공원|철길|사진/.test(text)) interests.add('NATURE_OUTDOOR');
  if (/언어|교환|친구|모임/.test(text)) interests.add('LANGUAGE_FRIENDS');
  return interests;
}

export function filterCatalogExperiences(items, { region = '', programLanguages = [], language = '', interest = '', recruitingOnly = true } = {}, now = new Date()) {
  const selectedLanguages = hasCatalogLanguageMetadata(items)
    ? (programLanguages.length ? programLanguages : (language ? [language] : []))
    : [];
  return items.filter(experience => (!region || experience.region_code === region)
    && (!selectedLanguages.length || selectedLanguages.some(code => experience.available_languages?.includes(code)))
    && (!interest || catalogInterestCodes(experience).has(interest))
    && (!recruitingOnly || orderedSessions(experience.sessions || [], now).length > 0));
}

export function sortCatalogExperiences(items, sort = 'recommended') {
  const featured = prioritizeExperiences(items);
  if (sort !== 'newest') return featured;
  const featuredCodes = new Set(FEATURED_EXPERIENCE_CODES);
  const head = featured.filter(item => featuredCodes.has(item.demo_code));
  const rest = featured.filter(item => !featuredCodes.has(item.demo_code))
    .map((experience, index) => ({ experience, index }))
    .sort((a, b) => new Date(b.experience.created_at || 0) - new Date(a.experience.created_at || 0) || a.index - b.index)
    .map(({ experience }) => experience);
  return [...head, ...rest];
}

export function prioritizeExperiences(items, featuredCodes = FEATURED_EXPERIENCE_CODES) {
  const priority = new Map(featuredCodes.map((code, index) => [code, index]));
  return items
    .map((experience, index) => ({ experience, index }))
    .sort((a, b) => (priority.get(a.experience.demo_code) ?? Infinity)
      - (priority.get(b.experience.demo_code) ?? Infinity) || a.index - b.index)
    .map(({ experience }) => experience);
}

export function filterExperiences(items, region = '', keyword = '') {
  const search = keyword.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s/g, '');
  return items.filter(item => (!region || item.region_code === region)
    && item.title.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s/g, '').includes(search));
}

export function orderedSessions(sessions, now = new Date()) {
  return sessions.filter(session => session.status === 'RECRUITING' && new Date(session.ends_at) > now)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)
      || Number(Boolean(b.seed_code)) - Number(Boolean(a.seed_code))
      || Number(a.session_id) - Number(b.session_id));
}

export function sessionDuration(session) {
  return session ? Math.round((new Date(session.ends_at) - new Date(session.starts_at)) / 60000) : null;
}

export function formatKst(timestamp, options = { month: 'long', day: 'numeric', weekday: 'short' }, locale = 'ko') {
  if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) {
    return { ko: '일정 미등록', en: 'Date not set', ja: '日程未登録' }[locale] || '일정 미등록';
  }
  const intlLocale = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }[locale] || 'ko-KR';
  return new Intl.DateTimeFormat(intlLocale, { timeZone: 'Asia/Seoul', ...options }).format(new Date(timestamp));
}

export function timelineRows(steps, session) {
  return [...steps].sort((a, b) => a.step_order - b.step_order).map(step => {
    const startsAt = session ? new Date(new Date(session.starts_at).getTime() + step.elapsed_min * 60000) : null;
    const endsAt = startsAt ? new Date(startsAt.getTime() + step.duration_min * 60000) : null;
    return { ...step, startsAt, endsAt, exceedsSession: Boolean(session && endsAt > new Date(session.ends_at)) };
  });
}

export const formatWon = (value, locale = 'ko') => locale === 'ko'
  ? `${new Intl.NumberFormat('ko-KR').format(value)}원`
  : new Intl.NumberFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);

export function regionLabel(region, locale = 'ko') {
  const labels = {
    SEOUL: { ko: '서울', en: 'Seoul', ja: 'ソウル' },
    BUSAN: { ko: '부산', en: 'Busan', ja: '釜山' },
    CHANGWON: { ko: '창원', en: 'Changwon', ja: '昌原' },
  };
  return labels[region]?.[locale] || region || '';
}

export function meetingPlaceAddress(value) {
  if (typeof value !== 'string') return '';
  const markerIndex = value.indexOf('주소:');
  return markerIndex < 0 ? '' : value.slice(markerIndex + '주소:'.length).split('(')[0].trim();
}

export function confirmedCoordinates(place) {
  if (!place?.is_confirmed || place.latitude == null || place.longitude == null
    || String(place.latitude).trim() === '' || String(place.longitude).trim() === ''
    || !['JUSO', 'HOST_PROVIDED', 'LICENSED'].includes(place.coordinate_source) || !place.source_reference) return null;
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { latitude, longitude } : null;
}

export function placeLinks(place) {
  const coordinates = confirmedCoordinates(place);
  if (!coordinates) return {
    search: place?.road_address ? `https://map.kakao.com/link/search/${encodeURIComponent(place.road_address)}` : null,
    map: null, directions: null,
  };
  const destination = `${encodeURIComponent(place.place_name)},${coordinates.latitude},${coordinates.longitude}`;
  return { map: `https://map.kakao.com/link/map/${destination}`, directions: `https://map.kakao.com/link/to/${destination}`, search: null };
}
