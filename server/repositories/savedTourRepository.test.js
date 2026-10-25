import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSavedTourPlace } from './savedTourRepository.js';
import { selectCatalogItems } from '../import-tour-catalog.js';

test('saved catalog excludes manual examples and keeps verified TourAPI IDs and categories', () => {
  const row = { place_id: 10, ext_key: 'tourapi:123', name: '해변', address: '제주', region: '제주', comm_place_tour_detail: { payload: { source: 'tourapi', contentId: '123', contentTypeId: '12', category: '관광지', overview: '바다 산책', images: ['https://example.com/photo.jpg'] } } };
  const place = mapSavedTourPlace(row);
  assert.equal(place.id, 10);
  assert.equal(place.sourcePlaceId, '123');
  assert.equal(place.contentTypeId, '12');
  assert.deepEqual(place.tags, ['바다', '산책']);
  assert.equal(mapSavedTourPlace({ ...row, ext_key: 'curated:wiki:123' }), null);
  assert.equal(mapSavedTourPlace({ ...row, ext_key: 'sample:2' }), null);
  assert.equal(mapSavedTourPlace({ ...row, comm_place_tour_detail: { payload: { source: 'curated' } } }), null);
});
test('API import rejects mismatched regions/types and duplicate source IDs', () => {
  const row = { contentid: '123', areacode: '39', contenttypeid: '12', title: '관광지', addr1: '제주', mapx: '126.2', mapy: '33.4' };
  const result = selectCatalogItems([row, row, { ...row, contentid: '234', areacode: '1' }, { ...row, contentid: '345', contenttypeid: '39' }], '39', '12', 5);
  assert.equal(result.length, 1);
  assert.equal(result[0].contentid, '123');
});
