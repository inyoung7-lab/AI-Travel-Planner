import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualPlan,editManualItem} from './manualItinerary.js';
import {appendPlaceToPlan,mapSavedTrips} from '../../server/mytrip.js';
const input={title:'직접 만든 서울 여행',region:'서울',startDate:'2026-10-26',endDate:'2026-10-27'};
const now=new Date('2026-10-25T00:00:00Z');
test('blank manual plan preserves empty calendar days and is included in My Trips',()=>{
 const plan=createManualPlan(input,now);
 assert.equal(plan.source,'manual');assert.equal(plan.days.length,2);assert.deepEqual(plan.days[1].items,[]);
 const [trip]=mapSavedTrips([{client_id:'manual-1',payload:plan}],'2026-10-25');
 assert.equal(trip.source,'manual');assert.equal(trip.placeCount,0);assert.equal(trip.days.length,2);
});
test('manual creation rejects past dates, invalid calendar days and more than five days',()=>{
 assert.throws(()=>createManualPlan({...input,startDate:'2026-10-24'},now));
 assert.throws(()=>createManualPlan({...input,endDate:'2026-10-31'},now));
 assert.throws(()=>createManualPlan({...input,startDate:'2026-02-30'},now));
 assert.throws(()=>createManualPlan({...input,title:' '},now));
});
test('adding a real place uses the selected day and keeps photo and map coordinates',()=>{
 const initial=createManualPlan(input,now),place={place_id:1001,name:'경복궁',lat:37.5,lng:126.9,comm_place_tour_detail:{payload:{images:['/palace.jpg'],contentTypeId:'12'}}};
 const added=appendPlaceToPlan(initial,place,2);
 assert.equal(initial.days[1].items.length,0);assert.equal(added.days[0].items.length,0);assert.equal(added.days[1].items[0].image,'/palace.jpg');assert.equal(added.days[1].items[0].lat,37.5);
 assert.equal(appendPlaceToPlan(added,place,2).days[1].items.length,1);
 assert.equal(appendPlaceToPlan(added,place,1).days[0].items.length,1);
 assert.throws(()=>appendPlaceToPlan(added,place,3));
});
test('time edits, reorder and removal affect only the selected day without mutating stored input',()=>{
 const plan=createManualPlan(input,now);plan.days[1].items=[{id:'db:1',name:'A'},{id:'db:2',name:'B'}];
 const timed=editManualItem(plan,1,0,'time','10:30');assert.equal(timed.days[1].items[0].time,'10:30');assert.equal(plan.days[1].items[0].time,undefined);
 const moved=editManualItem(timed,1,0,'move',1);assert.equal(moved.days[1].items[1].name,'A');
 const removed=editManualItem(moved,1,0,'remove');assert.equal(removed.days[1].items.length,1);assert.deepEqual(removed.days[0].items,[]);
});
