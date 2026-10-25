import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import { getSupabase, unwrap, databaseError } from './db.js';
import community from './community.js';
import mytrip from './mytrip.js';
import login from './login.js';
import places from './placeDetails.js';
import { createSearchHistoryRepository } from './repositories/searchHistoryRepository.js';
import { createItineraryRepository } from '../src/lib/itineraryRepository.js';
import { signupRequest } from '../src/pages/signupForm.js';

test('live Supabase: login, community, ownership, wishes, trips, places and search history', {skip:process.env.RUN_SUPABASE_INTEGRATION!=='1'}, async()=>{
 const admin=getSupabase({admin:true}), users=[], run=randomUUID(), password=randomBytes(32).toString('base64url');
 const app=express();app.use(express.json());app.use('/api/community',community);app.use('/api/mytrip',mytrip);app.use('/api/login',login);app.use('/api/places',places);app.use(databaseError);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 let historyId;
 const request=async(path,{token,body,method='GET'}={})=>{
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
 };
 try {
  for(const suffix of ['a','b']) {
   const email=`migration-test-${run}-${suffix}@example.invalid`;
   const registration=signupRequest({user_name:'  전환 검증 임시 계정  ',email,password,passwordConfirm:password,agreement:'accepted'});
   const {data,error}=await admin.auth.admin.createUser({email:registration.email,password:registration.password,email_confirm:true,user_metadata:registration.options.data});
   if(error) throw new Error('Cannot create integration account: '+error.message);
   users.push(data.user);
   const profile=await unwrap(admin.from('travel_profiles').select('user_id,user_name').eq('user_id',data.user.id).single());
   assert.equal(profile.user_id,data.user.id);
   assert.equal(profile.user_name,'전환 검증 임시 계정');
  }
  const signed=await request('/api/login',{method:'POST',body:{email:users[0].email,password}});assert.equal(signed.status,200);
  const token=signed.data.session.access_token;
  const signedB=await request('/api/login',{method:'POST',body:{email:users[1].email,password}});assert.equal(signedB.status,200);
  const other=signedB.data.session.access_token;
  const newPost=await request('/api/community/posts',{method:'POST',token,body:{userId:users[1].id,kind:'trip',title:'전환 검증 임시 글',content:'검증 후 자동 삭제됩니다.',region:'서울',placeIds:[8],placeRatings:{8:5}}});assert.equal(newPost.status,200);
  const id=newPost.data.id;
  const detail=await request(`/api/community/posts/${id}?view=1`);assert.equal(detail.status,200);assert.equal(detail.data.post.authorId,users[0].id);assert.equal(detail.data.post.placeRatings[8],5);
  assert.equal((await request(`/api/community/posts/${id}/comments`,{method:'POST',token:other,body:{content:'임시 댓글'}})).status,200);
  const like=await request(`/api/community/posts/${id}/like`,{method:'POST',token:other,body:{}});assert.equal(like.status,200);assert.equal(like.data.likes,1);
  assert.equal((await request(`/api/community/posts/${id}/delete`,{method:'POST',token:other,body:{userId:users[0].id}})).status,404);
  assert.equal((await request('/api/community/wishes/toggle',{method:'POST',body:{userId:users[0].id,placeId:8}})).status,401);
  const wish=await request('/api/community/wishes/toggle',{method:'POST',token,body:{userId:users[1].id,placeId:8}});assert.equal(wish.status,200);assert.equal(wish.data.wished,true);
  const plan=await unwrap(admin.from('mytrip_plan').insert({user_id:users[0].id,title:'검증 여행',region:'서울',start_date:'2026-10-20',end_date:'2026-10-21'}).select('trip_id').single());
  assert.equal((await request(`/api/mytrip/trips/${plan.trip_id}/places`,{method:'POST',token:other,body:{userId:users[0].id,placeId:8}})).status,404);
  assert.equal((await request(`/api/mytrip/trips/${plan.trip_id}/places`,{method:'POST',token,body:{placeId:8}})).status,200);
  const overview=await request(`/api/mytrip/overview?userId=${users[1].id}`,{token});assert.equal(overview.status,200);assert.equal(overview.data.user.id,users[0].id);assert.deepEqual(overview.data.wishes,[8]);assert.equal(overview.data.trips.length,1);
  assert.equal((await request('/api/community/places/8')).status,200);
  assert.equal((await request('/api/community/counts')).status,200);
  assert.equal((await request('/api/community/hot-places')).status,200);
  assert.equal((await request('/api/places')).status,200);
  const repo=createSearchHistoryRepository(), browserId=randomBytes(32).toString('base64url');
  const saved=await repo.recordSearch({browserId,queryText:'전환 검증',conditions:{region:'서울'},matchedCount:0,returnedCount:0,returnedPlaces:[]});historyId=saved.searchId;
  assert.equal((await repo.listRecentConditions({browserId})).length,1);
  const cloud=createItineraryRepository(getSupabase({token}));
  const itinerary=await cloud.save({savedId:'integration-plan',title:'계정 저장 검증',days:[{day:1,date:'2026-10-26',items:[{name:'성수동'}]}]});
  assert.equal(itinerary.savedId,'integration-plan');
  const secondDevice=createItineraryRepository(getSupabase({token}));
  assert.equal((await secondDevice.list()).current.title,'계정 저장 검증');
  assert.equal((await createItineraryRepository(getSupabase({token:other})).list()).plans.length,0);
  await assert.rejects(createItineraryRepository(getSupabase({token:other})).open(itinerary));
  const legacy={savedId:'legacy-integration',title:'기존 브라우저 일정',days:[{day:1,items:[]}]};
  assert.equal(await cloud.import([legacy],legacy.savedId),1);
  assert.equal(await cloud.import([legacy],legacy.savedId),0);
  assert.equal((await cloud.list()).current.savedId,'integration-plan');
  await cloud.open(legacy);
  assert.equal((await secondDevice.list()).current.savedId,'legacy-integration');
  const memberDb=getSupabase({token});
  const hostId=await unwrap(memberDb.rpc('lc_register_my_host_profile',{p_display_name:'검증용 개인 호스트',p_bio:'개인 프로필 저장 검증'}));
  const hostProfile=await unwrap(memberDb.from('lc_hosts').select('host_id,display_name,bio,approval_status,is_public').eq('host_id',hostId).single());
  assert.equal(hostProfile.approval_status,'PENDING');assert.equal(hostProfile.is_public,false);
  const savedProfile=await unwrap(memberDb.from('lc_hosts').update({bio:'변경한 개인 소개'}).eq('host_id',hostId).select('bio').single());assert.equal(savedProfile.bio,'변경한 개인 소개');
  const anotherId=await unwrap(memberDb.rpc('lc_register_my_host_profile',{p_display_name:'중복 생성 방지',p_bio:''}));assert.equal(anotherId,hostId);
  const visibleToOther=await unwrap(getSupabase({token:other}).from('lc_hosts').select('host_id').eq('host_id',hostId));assert.equal(visibleToOther.length,0);
  const attemptedApproval=await memberDb.from('lc_hosts').update({approval_status:'APPROVED'}).eq('host_id',hostId);assert.ok(attemptedApproval.error);
  const removed=await request(`/api/community/posts/${id}/delete`,{method:'POST',token,body:{}});assert.equal(removed.status,200);
 } finally {
  const cleanupErrors=[];
  if(historyId) {try {await unwrap(admin.from('travel_search_log').delete().eq('search_id',historyId));} catch(error) {cleanupErrors.push(error);}}
  for(const user of users) {
   try {await unwrap(admin.from('lc_hosts').delete().eq('auth_user_id',user.id));await unwrap(admin.auth.admin.deleteUser(user.id));}
   catch(error) {cleanupErrors.push(error);}
  }
  await new Promise((resolve,reject)=>server.close((e)=>e?reject(e):resolve()));
  if(cleanupErrors.length) throw new AggregateError(cleanupErrors,'Integration account cleanup failed');
 }
});
