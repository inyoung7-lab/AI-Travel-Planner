import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {getSupabase,unwrap} from './db.js';
import {createManualPlan,manualRepository,editManualItem} from '../src/lib/manualItinerary.js';
import {createItineraryRepository} from '../src/lib/itineraryRepository.js';
import {koreanToday} from '../shared/travelDates.js';
import {districtOf,distanceKm} from './itineraryContext.js';

test('live planner flow: manual editing, place/day additions, wishes, review, past history and real AI generation', {skip:process.env.RUN_PLANNER_LIVE!=='1',timeout:180000},async()=>{
 const admin=getSupabase({admin:true}),client=getSupabase(),run=randomUUID(),password=randomBytes(30).toString('base64url');
 const base='http://localhost:3000';let account;
 try{
  const created=await admin.auth.admin.createUser({email:`planner-check-${run}@example.invalid`,password,email_confirm:true,user_metadata:{name:'임시 플래너 검증'}});
  if(created.error)throw created.error;account=created.data.user;
  const {data:session,error}=await client.auth.signInWithPassword({email:account.email,password});if(error)throw error;
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${session.session.access_token}`};
  async function api(path,method='GET',body){const response=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.equal(response.status,200,`${path}: ${JSON.stringify(data)}`);return data;}
  const today=koreanToday(),tomorrow=new Date(Date.parse(today)+86400000).toISOString().slice(0,10),yesterday=new Date(Date.parse(today)-86400000).toISOString().slice(0,10);
  const catalog=await api('/api/places?page=1');assert.equal(catalog.items.length,24);assert(catalog.total>10000);const place=catalog.items[0];
  const manual=manualRepository(client);
  const draft=await manual.save(createManualPlan({title:'[자동 검증] 직접 일정',region:'강원',startDate:today,endDate:tomorrow}));
  const id=draft.payload.savedId,path='/api/mytrip/trips/'+encodeURIComponent('cloud:'+id)+'/places';
  assert((await api('/api/mytrip/overview')).trips.some(t=>t.savedId===id&&t.source==='manual'&&t.placeCount===0));
  await api(path,'POST',{placeId:place.id,dayNo:2});await api(path,'POST',{placeId:place.id,dayNo:2});
  await api(path,'POST',{placeId:catalog.items[1].id,dayNo:2});
  let loaded=await manual.load(id);assert.equal(loaded.payload.days[0].items.length,0);assert.equal(loaded.payload.days[1].items.length,2);
  await assert.rejects(manual.save(draft.payload,draft.updated_at),/변경/);
  let edited=editManualItem(loaded.payload,1,0,'time','10:30');edited=editManualItem(edited,1,0,'move',1);edited=editManualItem(edited,1,0,'remove');
  const saved=await manual.save(edited,loaded.updated_at);
  loaded=await manualRepository(getSupabase({token:session.session.access_token})).load(id);
  assert.equal(loaded.payload.days[1].items[0].time,'10:30');assert.equal(loaded.payload.days[1].items.length,1);
  console.log('PASS manual: create → choose day → add → duplicate protection → reorder/time/delete → save → reload');
  await api('/api/mytrip/wishes','PUT',{id:String(place.id),saved:true});await api('/api/mytrip/wishes','PUT',{id:String(place.id),saved:true});
  assert((await api('/api/mytrip/overview')).wishes.includes(place.id));
  const wishKeys=await api('/api/mytrip/wishes');assert(wishKeys.includes(String(place.id)));
  await api('/api/mytrip/wishes','PUT',{id:String(place.id),saved:false});assert(!(await api('/api/mytrip/overview')).wishes.includes(place.id));
  console.log('PASS wishes: persist → list → cancel');
  const pastPayload={...saved.payload,savedId:'past-'+run,startDate:yesterday,endDate:yesterday,days:[{day:1,date:yesterday,items:[loaded.payload.days[1].items[0]]}]};
  await unwrap(client.from('travel_itineraries').insert({user_id:account.id,client_id:pastPayload.savedId,payload:pastPayload,is_current:false}));
  let overview=await api('/api/mytrip/overview');assert(overview.trips.some(t=>t.savedId===pastPayload.savedId&&t.status==='past'));assert(overview.past.some(t=>t.savedId===pastPayload.savedId));
  const review=await api('/api/community/posts','POST',{kind:'trip',title:'[자동 검증] 장소 리뷰',content:'테스트 후 자동으로 정리되는 리뷰입니다.',region:'강원',placeIds:[place.id],placeRatings:{[place.id]:5}});
  const detail=await api('/api/community/posts/'+review.id);assert.equal(detail.post.placeRatings[place.id],5);assert(detail.post.placeIds.includes(place.id));
  overview=await api('/api/mytrip/overview');assert(overview.past.find(t=>t.savedId===pastPayload.savedId).reviewed);
  await api('/api/community/posts/'+review.id+'/delete','POST',{});
  console.log('PASS history/review: past itinerary → saved full payload → place review → rating and reviewed status');
  const rejected=await fetch(base+'/api/itineraries/generate',{method:'POST',headers,body:JSON.stringify({region:'경남',startDate:yesterday,endDate:today,people:2,budget:500000,transport:'자차',styles:[]})});assert.equal(rejected.status,400);
  const invalidDay=await fetch(base+path,{method:'POST',headers,body:JSON.stringify({placeId:place.id,dayNo:9})});assert.equal(invalidDay.status,400);
  assert.equal((await fetch(base+'/api/mytrip/overview')).status,401);
  console.log('PASS validation: past-date generation, invalid day, anonymous private-data access blocked');
  const ai=await api('/api/itineraries/generate','POST',{region:'경남',district:'거제시',startDate:tomorrow,endDate:tomorrow,people:2,budget:500000,transport:'자차',styles:['자연·힐링']});
  assert.equal(ai.days.length,1);assert.equal(ai.planningContext.district,'거제시');
  for(const item of ai.days[0].items){assert.equal(districtOf(item),'거제시');assert(distanceKm(ai.planningContext.anchor,item)<=15.01);assert(/^db:\d+$/.test(item.id));}
  const cloud=createItineraryRepository(client),aiSaved=await cloud.save({...ai,savedId:'ai-'+run});
  assert.equal((await cloud.open(aiSaved)).savedId,aiSaved.savedId);
  assert((await api('/api/mytrip/overview')).trips.some(t=>t.savedId===aiSaved.savedId));
  console.log('PASS real AI: generation → same district and distance bounds → save → reopen → My Trips');
 } finally {
  if(account){const {error}=await admin.auth.admin.deleteUser(account.id);if(error)throw error;console.log('CLEANUP temporary account and associated trips/reviews/wishes removed');}
 }
});
