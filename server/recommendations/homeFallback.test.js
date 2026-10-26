import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeRecommendationsHandler} from './handlers.js';
import {rankHomeViews,createPopularHomePlacesLoader} from './popularHomePlaces.js';
import {createSavedTourRepository} from '../repositories/savedTourRepository.js';
const place=(id,region='제주')=>({id,name:`여행지 ${id}`,region,regionCode:region,contentTypeId:'12',type:'관광지',tags:[],image:'https://example.com/photo.jpg'});
async function call(repository,options={},req={}){let code;let body;await createHomeRecommendationsHandler({dataSource:'supabase-tourapi',listPlaces(){throw Error('Full catalog must not load');},...repository},options)(req,{status(n){code=n;return this},json(value){body=value;return this}});return{code,body};}
test('new browser sees popular places and unique default fillers without loading the full catalog',async()=>{
 const r=await call({listHomePlaces:async()=>[place(1),place(2),place(3)]},{limit:3,popularPlacesLoader:async()=>[place(1)]});
 assert.equal(r.code,200);assert.equal(r.body.mode,'popular');assert.equal(r.body.personalized,false);assert.deepEqual(r.body.items.map(p=>p.id),[1,2,3]);
});
test('no activity or unavailable history uses the default catalog rather than failing',async()=>{
 const r=await call({listHomePlaces:async()=>[place(2)]},{historyRepository:{scope:'browser',listRecentConditions:async()=>{throw Error('history offline')}},popularPlacesLoader:async()=>[]},{browserId:'browser'});
 assert.equal(r.code,200);assert.equal(r.body.mode,'default');assert.equal(r.body.items.length,1);
});
test('matching recent preferences stay personalized and do not load popularity',async()=>{
 let selected;const r=await call({listHomePlaces:async options=>{selected=options.regions;return[place(1,'서울'),place(2)];}},{historyRepository:{scope:'browser',listRecentConditions:async()=>[{conditions:{regions:['제주']},searchedAt:new Date()}]},popularPlacesLoader:async()=>{throw Error('must not run')}},{browserId:'browser'});
 assert.equal(r.body.mode,'personalized');assert.equal(r.body.items[0].id,2);assert.deepEqual(selected,['제주']);
});
test('catalog failure can still return available popularity, but a total outage remains an error',async()=>{
 const repo={listHomePlaces:async()=>{throw Error('catalog offline')}};
 const partial=await call(repo,{popularPlacesLoader:async()=>[place(1)]});assert.equal(partial.code,200);assert.equal(partial.body.items.length,1);
 const failed=await call(repo,{popularPlacesLoader:async()=>{throw Error('activity offline')}});assert.equal(failed.code,500);
});
test('view ranking counts actual views with deterministic ties and rejects invalid place keys',()=>{
 assert.deepEqual(rankHomeViews([{place_key:'tourapi:2'},{place_key:'tourapi:1'},{place_key:'tourapi:2'},{place_key:'bad'}]),[['tourapi:2',2],['tourapi:1',1]]);
});
function clientFor(rows,queries){return {from(table){const filters=[];const query={select(){return query},eq(...a){filters.push(a);return query},not(){return query},order(){return query},like(){return query},gte(){return query},lte(){return query},in(){return query},limit(n){queries.push({table,filters,n});return Promise.resolve({data:rows(filters),error:null})},range(){return Promise.resolve({data:rows(filters),error:null})},then(resolve,reject){return Promise.resolve({data:rows(filters),error:null}).then(resolve,reject)}};return query;}};}
const row=(id,region)=>({place_id:id,ext_key:`tourapi:${id}`,name:'여행지',region,detail:{source:'tourapi',contentId:String(id),contentTypeId:'12',images:['https://example.com/a.jpg']}});
test('bounded home queries interleave regions and reuse only public candidate cache',async()=>{
 const queries=[];const repo=createSavedTourRepository({getClient:()=>clientFor(filters=>[row(filters[0][1]==='서울'?1:2,filters[0][1])],queries)});
 const items=await repo.listHomePlaces({regions:['서울','제주']});assert.deepEqual(items.map(p=>p.region),['서울','제주']);await repo.listHomePlaces({regions:['서울','제주']});assert.equal(queries.length,2);assert.ok(queries.every(q=>q.n===12));
});
test('popular activity snapshots cannot revive a place absent from the current public catalog',async()=>{
 const client={from(table){return clientFor(()=>table==='travel_site_activity'?[{place_key:'tourapi:1'},{place_key:'tourapi:2'}]:[row(1,'제주')],[]).from(table)}};
 const load=createPopularHomePlacesLoader({getClient:()=>client});assert.deepEqual((await load()).map(p=>p.id),[1]);
});
