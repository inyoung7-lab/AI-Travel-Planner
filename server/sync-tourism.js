import { randomUUID } from 'node:crypto';
import { getSupabase, unwrap } from './db.js';

export async function fetchSyncPage({ page, pageSize, sinceDay, fetchImpl = fetch }) {
  const url = new URL(`${(process.env.TOUR_API_BASE_URL || 'https://apis.data.go.kr/B551011/KorService2').replace(/\/$/, '')}/areaBasedSyncList2`);
  url.search = new URLSearchParams({ serviceKey: process.env.TOUR_API_SERVICE_KEY, MobileOS: 'ETC', MobileApp: 'AITravelPlanner', _type: 'json', pageNo: String(page), numOfRows: String(pageSize), arrange: 'A', ...(sinceDay ? { modifiedtime: sinceDay } : {}) });
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`TOUR_SYNC_HTTP_${response.status}`); }
    const code = json.response?.header?.resultCode;
    if (code === '23' && attempt < 2) { await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1))); continue; }
    if (!response.ok || code !== '0000') throw new Error(code === '22' ? 'TOUR_DAILY_LIMIT' : `TOUR_SYNC_${code || response.status}`);
    const body = json.response.body;
    if (Number(body.pageNo) !== page || !Number.isSafeInteger(Number(body.numOfRows)) || Number(body.numOfRows) < 0 || Number(body.numOfRows) > pageSize || !Number.isSafeInteger(Number(body.totalCount)) || Number(body.totalCount) < 0) throw new Error('TOUR_SYNC_INVALID_PAGINATION');
    const item = body.items?.item || [];
    const rows = Array.isArray(item) ? item : [item];
    if (rows.length > pageSize || (rows.length < pageSize && page * pageSize < Number(body.totalCount))) throw new Error('TOUR_SYNC_SHORT_PAGE');
    if (rows.some((r) => !/^\d+$/.test(String(r.contentid)) || !['0', '1'].includes(String(r.showflag)))) throw new Error('TOUR_SYNC_INVALID_ROW');
    if (!rows.length && (page - 1) * pageSize < Number(body.totalCount)) throw new Error('TOUR_SYNC_UNEXPECTED_EMPTY_PAGE');
    return { rows, total: Number(body.totalCount) };
  }
}
export async function syncTourism({ db = getSupabase({ admin: true }), fetchPage = fetchSyncPage, maxPages = Infinity } = {}) {
  if (!process.env.TOUR_API_SERVICE_KEY?.trim()) throw new Error('TOUR_API_KEY_MISSING');
  const run = randomUUID();
  let state = await unwrap(db.rpc('travel_start_tour_sync', { p_run: run }));
  if (!state) { console.log('이미 동기화가 진행 중입니다.'); return null; }
  let pages = 0;
  try {
    while (state.status === 'running' && pages < maxPages) {
      const { rows, total } = await fetchPage({ page: state.next_page, pageSize: state.page_size, sinceDay: state.since_day });
      state = await unwrap(db.rpc('travel_apply_tour_page', { p_run: run, p_page: state.next_page, p_total: total, p_rows: rows }));
      pages++;
      console.log(JSON.stringify({ mode: state.since_day ? 'changes' : 'full', page: state.status === 'idle' ? Math.ceil(total / state.page_size) : state.next_page - 1, processed: state.processed_count, total, changed: state.changed_count, complete: state.status === 'idle' }));
    }
    if (state.status !== 'idle') await unwrap(db.rpc('travel_stop_tour_sync', { p_run: run, p_error: 'BATCH_LIMIT_RESUME_NEXT_RUN' }));
    return state;
  } catch (error) {
    await unwrap(db.rpc('travel_stop_tour_sync', { p_run: run, p_error: error.message })).catch(() => {});
    throw error;
  }
}
if (process.argv[1]?.endsWith('sync-tourism.js')) syncTourism().catch((error) => { console.error('관광 동기화 중단:', error.message); process.exitCode = 1; });
