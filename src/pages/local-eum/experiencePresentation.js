export const REGION_LABELS = { SEOUL: '서울', BUSAN: '부산', CHANGWON: '창원' };

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

export function formatKst(timestamp, options = { month: 'long', day: 'numeric', weekday: 'short' }) {
  if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) return '일정 미등록';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...options }).format(new Date(timestamp));
}

export function timelineRows(steps, session) {
  return [...steps].sort((a, b) => a.step_order - b.step_order).map(step => {
    const startsAt = session ? new Date(new Date(session.starts_at).getTime() + step.elapsed_min * 60000) : null;
    const endsAt = startsAt ? new Date(startsAt.getTime() + step.duration_min * 60000) : null;
    return { ...step, startsAt, endsAt, exceedsSession: Boolean(session && endsAt > new Date(session.ends_at)) };
  });
}

export const formatWon = value => `${new Intl.NumberFormat('ko-KR').format(value)}원`;

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
