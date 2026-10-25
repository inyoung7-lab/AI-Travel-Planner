import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historyMigrationRows} from './migrate-json-history.js';
const entry={searchId:'old-id',browserId:'a'.repeat(43),queryText:'서울',conditions:{regions:['서울']},searchedAt:'2026-10-24T01:00:00.000Z',matchedCount:1,returnedCount:1,returnedPlaces:[{sourceCode:'KTO_TOURAPI',sourcePlaceId:'12'}]};
test('JSON history migration keeps identity, original dates and idempotency key',()=>{
 const rows=historyMigrationRows(JSON.stringify({version:1,searches:[entry]}));
 assert.equal(rows[0].legacy_source_id,'legacy-json:old-id');assert.equal(rows[0].searched_at,entry.searchedAt);assert.equal(rows[0].browser_id,entry.browserId);assert.equal(rows[0].returned_places[0].resultPosition,1);
});
test('entire JSON history source is rejected if one record is corrupt',()=>{
 assert.throws(()=>historyMigrationRows(JSON.stringify({version:1,searches:[entry,{...entry,browserId:'forged'}]})),{code:'INVALID_SEARCH_HISTORY'});
 assert.throws(()=>historyMigrationRows('{broken'));assert.throws(()=>historyMigrationRows(JSON.stringify({version:2,searches:[]})));
});
