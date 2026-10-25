import express from 'express';
import { databaseSession, requireUser, unwrap } from './db.js';
const router = express.Router();
router.use(databaseSession, requireUser);
export function mapTrips(plans, places, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })) {
  return plans.map((t) => {
    const rows = places.filter((p) => p.trip_id === t.trip_id), byDay = new Map();
    for (const p of rows) { const day = p.day_no || 1; if (!byDay.has(day)) byDay.set(day, []); byDay.get(day).push(p.place_id); }
    return { id: t.trip_id, title: t.title, region: t.region, start: t.start_date, end: t.end_date,
      dday: Math.round((Date.parse(t.start_date) - Date.parse(today)) / 86400000), status: t.end_date >= today ? 'upcoming' : 'past',
      placeCount: new Set(rows.map((p) => p.place_id)).size,
      days: [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, placeIds]) => ({ day, date: new Date(Date.parse(t.start_date) + (day - 1) * 86400000).toISOString().slice(0, 10), placeIds })) };
  });
}
router.get('/wishes', async (req,res)=>{
 const rows=await unwrap(req.db.from('mytrip_wish').select('place_id,comm_place(ext_key)').eq('user_id',req.user.id));
 res.json(rows.flatMap(r=>[String(r.place_id),r.comm_place?.ext_key].filter(Boolean)));
});
router.put('/wishes', async (req,res)=>{
 const key=String(req.body?.id || '').replace(/^db:/,'');
 if(!/^(tourapi:)?\d{1,15}$/.test(key) || typeof req.body.saved !== 'boolean') return res.status(400).json({message:'여행지를 확인해 주세요.'});
 let query=req.db.from('comm_place').select('place_id,ext_key');
 query=key.startsWith('tourapi:')?query.eq('ext_key',key):query.eq('place_id',Number(key));
 const place=await unwrap(query.maybeSingle());
 if(!place) return res.status(404).json({message:'저장된 여행지를 찾지 못했어요.'});
 if(req.body.saved) await unwrap(req.db.from('mytrip_wish').upsert({user_id:req.user.id,place_id:place.place_id},{onConflict:'user_id,place_id',ignoreDuplicates:true}));
 else await unwrap(req.db.from('mytrip_wish').delete().eq('user_id',req.user.id).eq('place_id',place.place_id));
 res.json({saved:req.body.saved,keys:[String(place.place_id),place.ext_key].filter(Boolean)});
});
router.get('/overview', async (req, res) => {
  const [plans, wishes, reviews, saved] = await Promise.all([
    unwrap(req.db.from('mytrip_plan').select('*').eq('user_id', req.user.id).order('start_date')),
    unwrap(req.db.from('mytrip_wish').select('place_id').eq('user_id', req.user.id).order('created_at', { ascending: false })),
    unwrap(req.db.from('community_posts').select('place_ids').eq('user_id', req.user.id).eq('category', '리뷰')),
    unwrap(req.db.from('travel_itineraries').select('client_id,payload').eq('user_id', req.user.id)),
  ]);
  const places = plans.length ? await unwrap(req.db.from('mytrip_place').select('*').in('trip_id', plans.map((p) => p.trip_id)).order('tp_id')) : [];
  const trips = [...mapTrips(plans, places), ...mapSavedTrips(saved)].sort((a,b)=>a.start.localeCompare(b.start)), reviewed = new Set(reviews.flatMap((r) => r.place_ids)), visited = new Set(), past = [];
  for (const trip of trips.filter((t) => t.status === 'past').sort((a, b) => b.end.localeCompare(a.end))) {
    for (const placeId of new Set(trip.days.flatMap((d) => d.placeIds))) {
      visited.add(placeId); past.push({ date: trip.end, placeId, tripId: trip.id, savedId: trip.savedId || null, tripTitle: trip.title, reviewed: reviewed.has(placeId) });
    }
  }
  const ids = [...new Set([...wishes.map(w=>w.place_id), ...trips.flatMap(t=>t.days.flatMap(d=>d.placeIds))])];
  const details = ids.length ? await unwrap(req.db.from('comm_place').select('place_id,name,address,region,comm_place_tour_detail(payload)').in('place_id', ids)) : [];
  const placeMap = Object.fromEntries(details.map(p=>[p.place_id,{name:p.name,region:p.region,address:p.address,image:p.comm_place_tour_detail?.payload?.images?.[0] || p.comm_place_tour_detail?.payload?.image || null}]));
  res.json({ placeMap, user: { id: req.user.id, name: req.user.user_metadata?.name || req.user.email?.split('@')[0] },
    stats: { visited: visited.size, reviews: reviews.length, wishes: wishes.length }, trips, wishes: wishes.map((p) => p.place_id), past });
});
router.post('/trips/:tripId/places', async (req, res) => {
  const placeId = Number(req.body?.placeId);
  if (req.params.tripId.startsWith('cloud:')) {
    if (!Number.isSafeInteger(placeId) || placeId <= 0) return res.status(400).json({message:'여행지를 확인해 주세요.'});
    const row = await unwrap(req.db.from('travel_itineraries').select('payload,updated_at').eq('client_id',req.params.tripId.slice(6)).eq('user_id',req.user.id).single());
    const place = await unwrap(req.db.from('comm_place').select('place_id,name,address,lat,lng,comm_place_tour_detail(payload)').eq('place_id',placeId).single());
    const dayNo=Number(req.body?.dayNo ?? 1);
    if(!Number.isInteger(dayNo)||dayNo<1||dayNo>row.payload.days.length)return res.status(400).json({message:'추가할 일차를 확인해 주세요.'});
    const payload=appendPlaceToPlan(row.payload,place,dayNo);
    const updated=await unwrap(req.db.from('travel_itineraries').update({payload,updated_at:new Date().toISOString()}).eq('client_id',req.params.tripId.slice(6)).eq('user_id',req.user.id).eq('updated_at',row.updated_at).select('client_id').maybeSingle());
    if(!updated)return res.status(409).json({message:'다른 화면에서 일정이 변경됐어요. 다시 시도해 주세요.'});
    return res.json({success:true});
  }
  const tripId = Number(req.params.tripId);
  if (![tripId, placeId].every((x) => Number.isSafeInteger(x) && x > 0)) return res.status(400).json({ message: '잘못된 요청이에요.' });
  await unwrap(req.db.rpc('travel_add_trip_place', { p_trip_id: tripId, p_place_id: placeId }));
  res.json({ success: true });
});
export default router;

export function mapSavedTrips(rows, today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'})) {
 return rows.flatMap(({client_id,payload:p})=>{
  const start=p.startDate || p.days?.[0]?.date, end=p.endDate || p.days?.at(-1)?.date;
  if(!start || !end) return [];
  const days=(p.days||[]).map((d,i)=>({day:i+1,date:d.date || new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),placeIds:(d.items||[]).map(x=>/^db:(\d+)$/.exec(String(x.id))?.[1]).filter(Boolean).map(Number),names:(d.items||[]).map(x=>x.name)}));
  return [{id:`cloud:${client_id}`,savedId:client_id,title:p.title,region:p.region,start,end,dday:Math.round((Date.parse(start)-Date.parse(today))/86400000),status:end>=today?'upcoming':'past',source:p.source || 'ai',placeCount:new Set((p.days||[]).flatMap(d=>(d.items||[]).map(x=>x.id))).size,days,image:p.days?.flatMap(d=>d.items||[]).find(i=>i.image)?.image}];
 });
}

export function appendPlaceToPlan(plan, place, selectedDay) {
 const dayNo=Number(selectedDay);
 if(!Number.isInteger(dayNo)||dayNo<1||dayNo>(plan.days?.length || 0)) {const error=new Error('추가할 일차를 확인해 주세요.');error.status=400;throw error;}
 const payload=structuredClone(plan),detail=place.comm_place_tour_detail?.payload || {};
 const items=payload.days[dayNo-1].items ||= [];
 if(!items.some(i=>String(i.id)===`db:${place.place_id}`))items.push({id:`db:${place.place_id}`,name:place.name,address:place.address,lat:place.lat,lng:place.lng,image:detail.images?.[0] || null,type:detail.contentTypeId==='32'?'숙소':detail.contentTypeId==='39'?'음식점':'관광지',url:`/places/${place.place_id}`,time:'',reason:'내 일정에 추가한 장소입니다.'});
 return payload;
}
