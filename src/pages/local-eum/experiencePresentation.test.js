import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedCoordinates, filterExperiences, orderedSessions, placeLinks, timelineRows } from './experiencePresentation.js';

test('region and Korean search combine without matching a different title', () => {
  const items = [{title:'성수동 공방 체험',region_code:'SEOUL'},{title:'부산 공간 탐방',region_code:'BUSAN'}];
  assert.deepEqual(filterExperiences(items,'SEOUL','성수동공방'),[items[0]]);
  assert.deepEqual(filterExperiences(items,'BUSAN','공방'),[]);
  assert.equal(filterExperiences(items,'','').length,2);
});

test('next session excludes past or private sessions and reflects changed price', () => {
  const items = [
    {session_id:1,starts_at:'2026-11-14T05:00:00Z',ends_at:'2026-11-14T07:00:00Z',status:'RECRUITING',fee_amount:18000},
    {session_id:2,starts_at:'2026-11-13T05:00:00Z',ends_at:'2026-11-13T07:00:00Z',status:'DRAFT',fee_amount:10000},
    {session_id:3,starts_at:'2026-10-01T05:00:00Z',ends_at:'2026-10-01T07:00:00Z',status:'RECRUITING',fee_amount:15000},
  ];
  assert.equal(orderedSessions(items,new Date('2026-10-16T00:00:00Z'))[0].fee_amount,18000);
  assert.equal(orderedSessions(items,new Date('2026-12-01T00:00:00Z')).length,0);
});

test('timeline uses the selected session date and flags duration mismatch', () => {
  const steps=[{step_order:1,elapsed_min:0,duration_min:15},{step_order:2,elapsed_min:100,duration_min:20}];
  const session={starts_at:'2026-11-15T02:00:00Z',ends_at:'2026-11-15T04:00:00Z'};
  const original=timelineRows(steps,session);
  assert.equal(original[1].startsAt.toISOString(),'2026-11-15T03:40:00.000Z');
  assert.equal(original[1].exceedsSession,false);
  const changed=timelineRows(steps,{...session,starts_at:'2026-11-22T02:00:00Z',ends_at:'2026-11-22T03:30:00Z'});
  assert.equal(changed[1].startsAt.toISOString(),'2026-11-22T03:40:00.000Z');
  assert.equal(changed[1].exceedsSession,true);
  assert.deepEqual(steps,[{step_order:1,elapsed_min:0,duration_min:15},{step_order:2,elapsed_min:100,duration_min:20}]);
});

test('missing/unconfirmed/invalid/source-less coordinates never create a marker or directions', () => {
  for(const place of [null,{}, {latitude:null,longitude:null,is_confirmed:true},
    {latitude:37,longitude:127,is_confirmed:false},
    {latitude:37,longitude:127,is_confirmed:true},
    {latitude:'',longitude:'',is_confirmed:true,coordinate_source:'JUSO',source_reference:'TEST'},
    {latitude:91,longitude:181,is_confirmed:true,coordinate_source:'JUSO',source_reference:'TEST'}]) {
    assert.equal(confirmedCoordinates(place),null);
    assert.equal(placeLinks(place).directions,null);
  }
  assert.ok(placeLinks({road_address:'서울특별시 성동구 아차산로 53'}).search.includes('/link/search/'));
});

test('map and directions derive from exactly the same confirmed saved coordinates', () => {
  const place={is_confirmed:true,place_name:'TEST / PLACE',latitude:'37.5',longitude:'127.0',coordinate_source:'JUSO',source_reference:'TEST ONLY'};
  const links=placeLinks(place);
  assert.equal(links.map.split('/map/')[1],links.directions.split('/to/')[1]);
  assert.ok(links.map.includes('TEST%20%2F%20PLACE,37.5,127'));
});
