export const SAVED_ITINERARIES_KEY = 'ai-travel-saved-itineraries';
export const CURRENT_ITINERARY_KEY = 'ai-travel-itinerary';
async function unwrap(query) {
 const {data,error}=await query;
 if(error) throw new Error(error.message || '일정을 저장하지 못했어요.');
 return data;
}
export function createItineraryRepository(client) {
 return {
  async list() {
   const rows=await unwrap(client.from('travel_itineraries').select('payload,is_current').order('updated_at',{ascending:false}));
   return { plans:rows.map((row)=>row.payload),current:rows.find((row)=>row.is_current)?.payload || null };
  },
  async save(plan) {
   const savedId=plan.savedId || crypto.randomUUID();
   return unwrap(client.rpc('travel_save_itinerary',{p_client_id:savedId,p_payload:{...plan,
    startDate:plan.startDate || plan.days?.[0]?.date,endDate:plan.endDate || plan.days?.at(-1)?.date}}));
  },
  async open(plan) {return unwrap(client.rpc('travel_open_itinerary',{p_client_id:plan.savedId}));},
  async import(entries,current) {return unwrap(client.rpc('travel_import_itineraries',{p_entries:entries,p_current:current}));},
 };
}
async function legacyId(plan) {
 if(typeof plan.savedId==='string' && plan.savedId.trim() && plan.savedId.length<=120) return plan.savedId;
 const bytes=new TextEncoder().encode(JSON.stringify(plan));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return 'legacy-'+Array.from(new Uint8Array(digest),(value)=>value.toString(16).padStart(2,'0')).join('');
}
export async function importBrowserItineraries(storage,repository) {
 const rawList=storage.getItem(SAVED_ITINERARIES_KEY),rawCurrent=storage.getItem(CURRENT_ITINERARY_KEY);
 if(rawList===null && rawCurrent===null) return 0;
 let list,current;
 try {list=rawList===null?[]:JSON.parse(rawList);current=rawCurrent===null?null:JSON.parse(rawCurrent);}
 catch {throw new Error('이전에 저장한 일정을 읽지 못했어요. 원본은 그대로 보관했습니다.');}
 if(!Array.isArray(list) || (current!==null && !current?.days?.length)) throw new Error('이전에 저장한 일정 형식을 확인해 주세요. 원본은 그대로 보관했습니다.');
 const entries=new Map();
 for(const plan of [...list,...(current?[current]:[])]) {
  if(!Array.isArray(plan?.days) || !plan.days.length) throw new Error('이전에 저장한 일정 형식을 확인해 주세요. 원본은 그대로 보관했습니다.');
  const savedId=await legacyId(plan);
  if(!entries.has(savedId)) entries.set(savedId,{...plan,savedId,startDate:plan.startDate||plan.days[0]?.date,endDate:plan.endDate||plan.days.at(-1)?.date});
 }
 if(entries.size) await repository.import([...entries.values()],current?await legacyId(current):null);
 // Remove only the exact snapshot successfully imported, so edits in another tab survive.
 if(storage.getItem(SAVED_ITINERARIES_KEY)===rawList) storage.removeItem(SAVED_ITINERARIES_KEY);
 if(storage.getItem(CURRENT_ITINERARY_KEY)===rawCurrent) storage.removeItem(CURRENT_ITINERARY_KEY);
 return entries.size;
}
