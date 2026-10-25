import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importBrowserItineraries,createItineraryRepository,SAVED_ITINERARIES_KEY,CURRENT_ITINERARY_KEY} from './itineraryRepository.js';
const plan={title:'제주 여행',days:[{day:1,date:'2026-10-26',items:[{name:'협재해변'}]}]};
function storage(entries){const values=new Map(entries);return {getItem:(key)=>values.get(key)??null,removeItem:(key)=>values.delete(key),setItem:(k,v)=>values.set(k,v)};}
test('legacy browser itineraries import once with stable IDs and remove only after successful save',async()=>{
 const original=JSON.stringify([plan]),current=JSON.stringify(plan),data=storage([[SAVED_ITINERARIES_KEY,original],[CURRENT_ITINERARY_KEY,current]]),calls=[];
 const repo={import:async(entries,id)=>calls.push({entries,id})};
 assert.equal(await importBrowserItineraries(data,repo),1);
 assert.equal(calls[0].entries.length,1);assert.equal(calls[0].id,calls[0].entries[0].savedId);assert.match(calls[0].id,/^legacy-/);
 assert.equal(data.getItem(SAVED_ITINERARIES_KEY),null);assert.equal(await importBrowserItineraries(data,repo),0);
 const other=storage([[CURRENT_ITINERARY_KEY,current]]);await importBrowserItineraries(other,repo);assert.equal(calls[1].id,calls[0].id);
});
test('failed imports and damaged data preserve the original browser backup',async()=>{
 const original=JSON.stringify([plan]),data=storage([[SAVED_ITINERARIES_KEY,original]]);
 await assert.rejects(importBrowserItineraries(data,{import:async()=>{throw new Error('offline');}}),/offline/);assert.equal(data.getItem(SAVED_ITINERARIES_KEY),original);
 data.setItem(SAVED_ITINERARIES_KEY,'invalid json');await assert.rejects(importBrowserItineraries(data,{}),/원본/);assert.equal(data.getItem(SAVED_ITINERARIES_KEY),'invalid json');
});
test('import never deletes a newer edit made in another browser tab',async()=>{
 const data=storage([[SAVED_ITINERARIES_KEY,JSON.stringify([plan])]]);
 await importBrowserItineraries(data,{import:async()=>data.setItem(SAVED_ITINERARIES_KEY,'newer edit')});assert.equal(data.getItem(SAVED_ITINERARIES_KEY),'newer edit');
});
test('cloud save retains its ID for updates and selects the account current itinerary',async()=>{
 const calls=[],saved={...plan,savedId:'saved-1'};
 const repo=createItineraryRepository({rpc:async(name,args)=>{calls.push({name,args});return {data:saved};}});
 assert.deepEqual(await repo.save(saved),saved);assert.equal(calls[0].args.p_client_id,'saved-1');await repo.open(saved);assert.equal(calls[1].name,'travel_open_itinerary');
});
