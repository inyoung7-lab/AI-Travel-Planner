import { koreanToday } from '../../shared/travelDates.js';
export function createManualPlan(input, now=new Date()) {
 const title=String(input.title || '').trim();
 const start=String(input.startDate || ''),end=String(input.endDate || '');
 const startTime=Date.parse(`${start}T00:00:00Z`),endTime=Date.parse(`${end}T00:00:00Z`);
 const count=(endTime-startTime)/86400000+1;
 if(!title || title.length>100)throw new Error('일정 이름을 1~100자로 입력해 주세요.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isInteger(count)||count<1||count>5||new Date(startTime).toISOString().slice(0,10)!==start||new Date(endTime).toISOString().slice(0,10)!==end||start<koreanToday(now))throw new Error('오늘 이후 날짜로 1~5일의 여행 기간을 선택해 주세요.');
 return {title,region:String(input.region || '').trim().slice(0,20),startDate:start,endDate:end,source:'manual',status:'draft',summary:'직접 만든 나만의 여행 일정',days:Array.from({length:count},(_,i)=>({day:i+1,date:new Date(startTime+i*86400000).toISOString().slice(0,10),theme:'',items:[]}))};
}
export function editManualItem(plan,dayIndex,itemIndex,action,value) {
 const next=structuredClone(plan);const items=next.days[dayIndex]?.items;
 if(!items || !items[itemIndex])return plan;
 if(action==='remove')items.splice(itemIndex,1);
 if(action==='time')items[itemIndex].time=value;
 if(action==='move') {const target=itemIndex+value;if(target>=0&&target<items.length)[items[itemIndex],items[target]]=[items[target],items[itemIndex]];}
 return next;
}
export function manualRepository(client){
 async function userId(){const {data,error}=await client.auth.getSession();if(error||!data.session)throw new Error('로그인이 필요해요.');return data.session.user.id;}
 return {
  async load(id){const {data,error}=await client.from('travel_itineraries').select('payload,updated_at').eq('client_id',id).single();if(error)throw new Error('저장된 일정을 불러오지 못했어요.');return data;},
  async save(plan,version){
   const owner=await userId(),id=plan.savedId || crypto.randomUUID(),at=new Date().toISOString();
   const row={payload:{...plan,savedId:id,savedAt:at},updated_at:at};
   let query;
   if(version)query=client.from('travel_itineraries').update(row).eq('user_id',owner).eq('client_id',id).eq('updated_at',version);
   else query=client.from('travel_itineraries').insert({...row,user_id:owner,client_id:id,is_current:false});
   const {data,error}=await query.select('payload,updated_at').maybeSingle();
   if(error)throw new Error(error.message);if(!data)throw new Error('다른 화면에서 일정이 변경됐어요. 새로고침 후 다시 편집해 주세요.');return data;
  }
 };
}
