import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogRecruitingOnly, confirmedCoordinates, filterCatalogExperiences, filterExperiences, meetingPlaceAddress, orderedSessions, placeLinks, prioritizeExperiences, sortCatalogExperiences, timelineRows } from './experiencePresentation.js';

test('Masan demo experiences appear first in the requested order while other items keep their order', () => {
  const items = [
    { demo_code: 'DEMO-01', title: '기존 1' },
    { demo_code: 'DEMO-MASAN-SEAFOOD-LAB', title: '오늘의 바다밥상 연구소' },
    { demo_code: 'DEMO-02', title: '기존 2' },
    { demo_code: 'DEMO-MASAN-MYSTERY-MAP', title: '사라진 마산의 비밀지도' },
  ];

  assert.deepEqual(
    prioritizeExperiences(items).map(item => item.title),
    ['사라진 마산의 비밀지도', '오늘의 바다밥상 연구소', '기존 1', '기존 2'],
  );
  assert.deepEqual(items.map(item => item.title), ['기존 1', '오늘의 바다밥상 연구소', '기존 2', '사라진 마산의 비밀지도']);
});

test('catalog facets filter region, interest, language availability, and active recruitment', () => {
  const now = new Date('2026-10-17T00:00:00Z');
  const items = [
    { demo_code: 'DEMO-MASAN-MYSTERY-MAP', title: '사라진 마산의 비밀지도', description: '창동 원도심 골목 추리 탐방', region_code: 'CHANGWON', template_id: 103, available_languages: ['ko'], sessions: [{ status: 'RECRUITING', starts_at: '2026-12-13T05:00:00Z', ends_at: '2026-12-13T06:45:00Z' }] },
    { demo_code: 'DEMO-MASAN-SEAFOOD-LAB', title: '오늘의 바다밥상 연구소', description: '마산어시장 제철 음식문화', region_code: 'CHANGWON', template_id: 101, available_languages: ['ko'], sessions: [{ status: 'RECRUITING', starts_at: '2026-12-12T01:00:00Z', ends_at: '2026-12-12T02:40:00Z' }] },
    { demo_code: 'DEMO-02', title: '북촌 전통공예 체험', description: '전통 공예 손작업', region_code: 'SEOUL', template_id: 102, sessions: [] },
  ];

  assert.deepEqual(
    filterCatalogExperiences(items, { region: 'CHANGWON', language: 'ko', interest: 'MARKET_FOOD', recruitingOnly: true }, now).map(item => item.title),
    ['오늘의 바다밥상 연구소'],
  );
  assert.deepEqual(filterCatalogExperiences(items, { language: 'en', recruitingOnly: false }, now), []);
  assert.deepEqual(filterCatalogExperiences(items, { region: 'SEOUL', interest: 'CRAFTS', recruitingOnly: true }, now), []);
  assert.deepEqual(filterCatalogExperiences(items, { region: 'SEOUL', interest: 'CRAFTS', recruitingOnly: false }, now).map(item => item.title), ['북촌 전통공예 체험']);
});

test('catalog recruitment filter follows the selected state for every experience', () => {
  assert.equal(catalogRecruitingOnly(new URLSearchParams('recruiting=on')), true);
  assert.equal(catalogRecruitingOnly(new URLSearchParams('recruiting=off')), false);
  assert.equal(catalogRecruitingOnly(new URLSearchParams()), false);
});

test('newest sorting keeps the two requested featured experiences first', () => {
  const items = [
    { demo_code: 'DEMO-01', title: '기존', created_at: '2026-01-01T00:00:00Z' },
    { demo_code: 'DEMO-MASAN-SEAFOOD-LAB', title: '오늘의 바다밥상 연구소', created_at: '2026-08-01T00:00:00Z' },
    { demo_code: 'DEMO-MASAN-MYSTERY-MAP', title: '사라진 마산의 비밀지도', created_at: '2026-07-01T00:00:00Z' },
    { demo_code: 'DEMO-02', title: '새 기존 체험', created_at: '2026-09-01T00:00:00Z' },
  ];
  assert.deepEqual(sortCatalogExperiences(items, 'newest').map(item => item.title), ['사라진 마산의 비밀지도', '오늘의 바다밥상 연구소', '새 기존 체험', '기존']);
});

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

test('meeting place text can provide a Kakao address fallback without a place ID', () => {
  assert.equal(meetingPlaceAddress('창동예술촌 아트센터 앞 공공 보행 구역 · 주소: 경상남도 창원시 마산합포구 오동서6길 24 (현장 확인 전)'), '경상남도 창원시 마산합포구 오동서6길 24');
  assert.equal(meetingPlaceAddress('미술관 입구, 세부 위치 현장 확인'), '');
  assert.equal(meetingPlaceAddress(null), '');
});
