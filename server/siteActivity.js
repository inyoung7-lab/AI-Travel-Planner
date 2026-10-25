import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { allRows, getSupabase, databaseSession } from './db.js';
async function activityPlace(id) {
  let query = getSupabase({ admin: true }).from('comm_place').select('*,comm_place_tour_detail(payload)');
  query = String(id).startsWith('tourapi:') ? query.eq('ext_key', String(id)) : query.eq('place_id', Number(id));
  const { data: row, error } = await query.maybeSingle();
  if (error) throw error;
  if (!row || row.comm_place_tour_detail?.payload?.isActive === false) return null;
  const detail = row.comm_place_tour_detail?.payload || {};
  return { ...detail, id: row.place_id, name: row.name, region: row.region, tourContentId: /^tourapi:(\d+)$/.exec(row.ext_key || '')?.[1] || detail.tourContentId };
}

const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
export function summarizeActivity(rows, now = new Date()) {
  const today = dayKey(now);
  const end = new Date(`${today}T00:00:00+09:00`);
  const days = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(end.getTime() - (6 - i) * 86400000)), searches: 0, views: 0 }));
  const ranks = new Map();
  for (const row of rows) {
    const day = days.find((d) => d.date === dayKey(row.occurred_at));
    if (!day || new Date(row.occurred_at) > now) continue;
    if (row.kind === 'search') day.searches++;
    if (row.kind === 'view') day.views++;
    if (row.place_key && row.place && row.place.isDestination !== false && ['result', 'view'].includes(row.kind)) {
      const place = ranks.get(row.place_key) || { ...row.place, key: row.place_key, searches: 0, views: 0 };
      if (row.kind === 'result') place.searches++;
      else place.views++;
      ranks.set(row.place_key, place);
    }
  }
  const items = [...ranks.values()].map((p) => ({ ...p, score: p.searches + p.views })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, 3);
  return { days, items, from: days[0].date, to: today };
}
function snapshot(place) {
  return { id: place.id, name: place.name, region: place.regionCode || place.region || '', image: place.image || place.images?.[0] || null,
    tags: place.tags || [], isDestination: !place.contentTypeId || String(place.contentTypeId) === '12', photoCredit: place.imageCredits?.[0] || null };
}
export async function recordSearchActivity(places, { requestId: clientId, browserId, userId } = {}) {
  if (!userId) return;
  const requestId = browserId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId || '')
    ? createHash('sha256').update(`${userId}:${clientId}`).digest('hex') : randomUUID();
  const unique = new Map(places.map((p) => [p.sourceCode === 'KTO_TOURAPI' && p.sourcePlaceId ? `tourapi:${p.sourcePlaceId}` : String(p.id), p]));
  const rows = [{ event_key: `member:${requestId}`,  kind: 'search' }, ...[...unique].map(([id, place]) => ({ event_key: `member:${requestId}:${id}`, kind: 'result', place_key: id, place: snapshot(place) }))];
  const { error } = await getSupabase({ admin: true }).from('travel_site_activity').insert(rows);
  if (error && error.code !== '23505') throw error;
}
export function createActivityRouter(browserIdentity) {
  const router = express.Router();
  router.get('/', async (_req, res, next) => {
    try {
      const from = new Date(`${dayKey(new Date())}T00:00:00+09:00`); from.setTime(from.getTime() - 6 * 86400000);
      const rows = await allRows(() => getSupabase({ admin: true }).from('travel_site_activity').select('kind,place_key,place,occurred_at').like('event_key', 'member:%').gte('occurred_at', from.toISOString()).order('event_key'));
      res.set('Cache-Control', 'no-store').json(summarizeActivity(rows));
    } catch (error) { next(error); }
  });
  router.get('/place/:id', async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!/^(tourapi:)?\d{1,15}$/.test(id)) return res.status(400).json({ message: '여행지 번호를 확인해 주세요.' });
      const place = await activityPlace(id);
      if (!place) return res.status(404).json({ message: '여행지를 찾지 못했어요.' });
      const key = id.startsWith('tourapi:') ? id : place.tourContentId ? `tourapi:${place.tourContentId}` : String(place.id);
      const now = new Date();
      const from = new Date(`${dayKey(now)}T00:00:00+09:00`); from.setTime(from.getTime() - 13 * 86400000);
      const rows = await allRows(() => getSupabase({ admin: true }).from('travel_site_activity').select('kind,occurred_at').like('event_key', 'member:%').eq('place_key', key).gte('occurred_at', from.toISOString()).order('event_key'));
      res.set('Cache-Control', 'no-store').json({ place: { ...snapshot(place), id: key }, ...summarizePlaceActivity(rows, now) });
    } catch (error) { next(error); }
  });
  router.post('/view', databaseSession, browserIdentity, async (req, res, next) => {
    try {
      if (!req.user) return res.json({ saved: false, reason: 'login_required' });
      const { source, id } = req.body || {};
      if (!req.browserId) return res.status(503).json({ message: '조회 집계 설정을 확인해 주세요.' });
      if (!['db', 'tourapi'].includes(source) || !/^\d{1,15}$/.test(String(id))) return res.status(400).json({ message: '여행지 번호를 확인해 주세요.' });
      const place = await activityPlace(source === 'db' ? id : `tourapi:${id}`);
      if (!place) return res.status(404).json({ message: '여행지를 찾지 못했어요.' });
      const key = source === 'db' ? place.tourContentId ? `tourapi:${place.tourContentId}` : String(place.id) : `tourapi:${id}`;
      // One view per browser/place/30-minute window; StrictMode and refreshes do not inflate it.
      const event_key = `member:${createHash('sha256').update(`${req.user.id}:${key}:${Math.floor(Date.now() / 1800000)}`).digest('hex')}`;
      const { error } = await getSupabase({ admin: true }).from('travel_site_activity').insert({ event_key, kind: 'view', place_key: key, place: snapshot({ ...place, id: key }) });
      if (error && error.code !== '23505') throw error;
      res.json({ saved: true });
    } catch (error) { next(error); }
  });
  return router;
}

export function summarizePlaceActivity(rows, now = new Date()) {
  const start = new Date(`${dayKey(now)}T00:00:00+09:00`).getTime() - 13 * 86400000;
  const days = Array.from({ length: 14 }, (_, i) => ({ date: dayKey(start + i * 86400000), searches: 0, views: 0 }));
  for (const row of rows) {
    if (new Date(row.occurred_at) > now) continue;
    const day = days.find(d => d.date === dayKey(row.occurred_at));
    if (day && row.kind === 'result') day.searches++;
    if (day && row.kind === 'view') day.views++;
  }
  return { previous: days.slice(0, 7), current: days.slice(7), scope: 'all_authenticated_members' };
}
