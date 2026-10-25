import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { getSupabase, unwrap } from './db.js';
import { normalizeSearchHistoryRecord } from './repositories/searchHistoryRepository.js';
export function historyMigrationRows(contents) {
 const store=JSON.parse(contents);
 if(store?.version!==1 || !Array.isArray(store.searches)) throw new Error('검색 이력 파일 형식을 확인해 주세요.');
 return store.searches.map((entry)=>{
  if(typeof entry.searchId!=='string' || !entry.searchId || !entry.searchedAt || Number.isNaN(Date.parse(entry.searchedAt))) throw new Error('검색 이력 ID 또는 날짜 형식이 올바르지 않습니다.');
  const normalized=normalizeSearchHistoryRecord(entry);
  return {legacy_source_id:'legacy-json:'+entry.searchId,browser_id:normalized.browserId,query_text:normalized.queryText,
   conditions_json:JSON.parse(normalized.conditionsJson),matched_count:normalized.matchedCount,returned_count:normalized.returnedCount,
   returned_places:normalized.returnedPlaces,searched_at:new Date(entry.searchedAt).toISOString()};
 });
}
export async function migrateJsonHistory({filePath=fileURLToPath(new URL('./data/search-history.json',import.meta.url)),apply=false,client}={}) {
 let contents;
 try {contents=await readFile(filePath,'utf8');} catch(error) {if(error.code==='ENOENT') return {found:false,records:0,applied:false};throw error;}
 // Validate the entire source before writing; preserve the original file.
 const rows=historyMigrationRows(contents);
 if(apply && rows.length) {
  const db=client || getSupabase({admin:true});
  for(let index=0;index<rows.length;index+=200) await unwrap(db.from('travel_search_log').upsert(rows.slice(index,index+200),{onConflict:'legacy_source_id',ignoreDuplicates:true}));
 }
 return {found:true,records:rows.length,applied:apply};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 migrateJsonHistory({apply:process.argv.includes('--apply')}).then((result)=>console.log(JSON.stringify(result))).catch((error)=>{console.error('JSON 검색 이력 이전 실패:',error.message);process.exitCode=1;});
}
