import test from 'node:test';
import assert from 'node:assert/strict';
import {focusCandidates,distanceKm,districtOf,loadWeather} from './itineraryContext.js';
import {hydrateItinerary,validateItineraryRequest} from './itinerary.js';
const validate=input=>validateItineraryRequest(input,new Date('2026-10-25T00:00:00Z'));
const request={region:'경남',startDate:'2026-10-26',endDate:'2026-10-27',days:2,transport:'자차',styles:['자연·힐링']};
const point=(id,city,lat,lng,name='자연 공원',contentTypeId='12')=>({id:`db:${id}`,name,address:`경상남도 ${city} 테스트로`,lat,lng,contentTypeId});
const candidates=[point(1,'창원시',35.22,128.68),point(2,'창원시',35.23,128.69),point(3,'창원시',35.21,128.67),point(4,'진주시',35.18,128.08),point(5,'거제시',34.88,128.62),point(6,'창원시',35.23,128.68,'음식점','39')];
test('province selection keeps sights, food and events in one compact municipality',()=>{
 const focus=focusCandidates(candidates,request,[point(7,'거제시',34.88,128.62,'행사','15'),point(8,'창원시',35.22,128.68,'행사','15')]);
 assert.equal(focus.district,'창원시');assert.equal(focus.sights.length,3);assert.equal(focus.food.length,1);assert.equal(focus.events.length,1);
 for(const p of [...focus.sights,...focus.food,...focus.events])assert(distanceKm(focus.anchor,p)<=15);
 assert.equal(districtOf(point(1,'창원시 성산구',35.2,128.6)),'창원시');
});
test('unknown or distant coordinates are never used as close-by candidates',()=>{
 assert.throws(()=>focusCandidates([point(1,'창원시',0,0),point(2,'진주시',35.18,128.08),point(3,'거제시',34.88,128.62)],request),/이동 범위/);
});
test('verified-date events cannot be scheduled after their end date',()=>{
 const req=validate({...request,people:2,budget:500000});
 const event={...point(7,'창원시',35.22,128.68,'행사','15'),eventStartDate:'2026-10-26',eventEndDate:'2026-10-26'};
 const result=hydrateItinerary({days:[{items:[{candidateId:'db:1'},{candidateId:'db:7'}]},{items:[{candidateId:'db:1'},{candidateId:'db:7'}]}]},[candidates[0],event],req);
 assert.equal(result.days[0].items.length,2);assert.equal(result.days[1].items.length,1);
});
test('forecast horizon does not fabricate weather or call a service for unsupported dates',async()=>{
 const weather=await loadWeather({...request,startDate:'2099-10-26'},{lat:35,lng:128},()=>{throw Error('should not call');});
 assert.equal(weather.status,'outside_forecast');assert.deepEqual(weather.days,[]);
});
test('daily forecast is date-matched and missing forecast days remain explicitly partial',async()=>{
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
 const weather=await loadWeather({...request,startDate:date,endDate:date,days:1},{lat:35,lng:128},async()=>({ok:true,json:async()=>({daily:{time:[date],weather_code:[61],temperature_2m_min:[9],temperature_2m_max:[16],precipitation_probability_max:[80],wind_speed_10m_max:[30]}})}));
 assert.equal(weather.status,'available');assert.equal(weather.days[0].rainPercent,80);assert.equal(weather.days[0].date,date);
});

test('explicit municipality choice cannot silently fall back to another city',()=>{
 assert.equal(focusCandidates(candidates,{...request,district:'창원시'}).district,'창원시');
 assert.throws(()=>focusCandidates(candidates,{...request,district:'진주시'}),/이동 범위/);
 assert.equal(validate({...request,people:2,budget:500000,district:'창원시'}).district,'창원시');
 assert.equal(validate({...request,people:2,budget:500000,district:'<script>'}),null);
});
