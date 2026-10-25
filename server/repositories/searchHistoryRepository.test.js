import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSearchHistoryRepository } from './searchHistoryRepository.js';
function fakeClient(result, calls) {
 const q = new Proxy({}, {get: (_target,key) => key === 'then' ? (resolve) => resolve(result) : (...args) => { calls.push([key,...args]);return q; }});
 return { from: (table) => {calls.push(['from',table]);return q;} };
}
const browserId='a'.repeat(43);
const record={browserId,queryText:'서울',conditions:{region:'서울'},matchedCount:1,returnedCount:1,returnedPlaces:[{sourceCode:'tourapi',sourcePlaceId:'1'}]};
test('history saves validated search and results together in one Supabase row',async()=>{
 const calls=[];const repo=createSearchHistoryRepository({getClient:()=>fakeClient({data:{search_id:12},error:null},calls)});
 assert.deepEqual(await repo.recordSearch(record),{searchId:12,saved:true});
 const inserted=calls.find((c)=>c[0]==='insert')[1];
 assert.equal(inserted.browser_id,browserId);assert.deepEqual(inserted.conditions_json,{region:'서울'});assert.equal(inserted.returned_places[0].resultPosition,1);
});
test('invalid browser identity, counts and duplicate results fail before database access',async()=>{
 const repo=createSearchHistoryRepository({getClient:()=>{throw new Error('must not connect');}});
 for(const data of [{...record,browserId:null},{...record,returnedCount:2},{...record,matchedCount:2,returnedCount:2,returnedPlaces:[...record.returnedPlaces,...record.returnedPlaces]}]) await assert.rejects(repo.recordSearch(data),{code:'INVALID_SEARCH_HISTORY'});
 await assert.rejects(repo.listRecentConditions({browserId:'forged'}),{code:'INVALID_SEARCH_HISTORY'});
});
test('history lookup filters browser and time and maps jsonb conditions',async()=>{
 const calls=[];const repo=createSearchHistoryRepository({getClient:()=>fakeClient({data:[{conditions_json:{region:'서울'},searched_at:'2026-10-25T00:00:00Z'}]},calls)});
 const rows=await repo.listRecentConditions({browserId,now:new Date('2026-10-25T01:00:00Z')});
 assert.deepEqual(JSON.parse(rows[0].conditionsJson),{region:'서울'});assert.ok(calls.some((c)=>c[0]==='eq'&&c[1]==='browser_id'&&c[2]===browserId));assert.ok(calls.some((c)=>c[0]==='gte'));
});
test('database failures propagate instead of reporting saved history',async()=>{
 const repo=createSearchHistoryRepository({getClient:()=>fakeClient({error:{message:'unavailable',code:'PGRST205'}},[])});
 await assert.rejects(repo.recordSearch(record),{code:'PGRST205'});
});
