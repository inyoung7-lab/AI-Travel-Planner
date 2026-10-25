import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSavedTrips } from './mytrip.js';
test('saved AI itinerary retains its identity, day names, dates and database places in My Trips',()=>{
 const [trip]=mapSavedTrips([{client_id:'saved-1',payload:{title:'서울 여행',region:'서울',startDate:'2026-10-26',endDate:'2026-10-27',days:[{date:'2026-10-26',items:[{id:'db:1001',name:'경복궁',image:'/palace.jpg'},{id:'db:1001',name:'경복궁'}]},{date:'2026-10-27',items:[{id:'db:2740',name:'다음 장소'}]}]}}], '2026-10-25');
 assert.equal(trip.id,'cloud:saved-1');assert.equal(trip.savedId,'saved-1');
 assert.equal(trip.status,'upcoming');assert.equal(trip.dday,1);assert.equal(trip.placeCount,2);
 assert.deepEqual(trip.days[1].placeIds,[2740]);assert.deepEqual(trip.days[1].names,['다음 장소']);
 assert.equal(trip.image,'/palace.jpg');
});
test('past itineraries are classified by their end date, missing dates do not crash overview',()=>{
 assert.equal(mapSavedTrips([{client_id:'old',payload:{days:[{date:'2026-10-20',items:[]}]}}],'2026-10-25')[0].status,'past');
 assert.deepEqual(mapSavedTrips([{client_id:'invalid',payload:{days:[]}}]),[]);
});
