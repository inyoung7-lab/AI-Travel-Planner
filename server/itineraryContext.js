import { getSupabase, unwrap } from './db.js';

export function distanceKm(a,b) {
 const rad=x=>Number(x)*Math.PI/180;
 const dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export const validPoint=p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Number(p.lat)>=33&&Number(p.lat)<=39&&Number(p.lng)>=124&&Number(p.lng)<=132;
export function districtOf(place) {
 const words=String(place.address || '').trim().split(/\s+/);
 return words.slice(1).find(w=>/[시군구]$/.test(w)) || words.find(w=>/[시군구]$/.test(w)) || '';
}
export function seasonalScore(place,request) {
 const month=Number(request.startDate.slice(5,7));
 const text=`${place.name} ${place.description || ''}`;
 const patterns=month>=3&&month<=5?/봄|벚꽃|유채|철쭉/:month>=6&&month<=8?/여름|해수욕|물놀이|계곡/:month>=9&&month<=11?/가을|단풍|억새|갈대/:/겨울|눈꽃|설경|온천/;
 return (patterns.test(text)?3:0)+(text.includes(`${month}월`)?3:0)+(request.styles || []).some(s=>s==='문화·역사'&&/박물관|미술관|문화|역사|사찰/.test(text)||s==='자연·힐링'&&/산책|자연|공원|숲|정원/.test(text)) * 2;
}
export function focusCandidates(places,request,events=[]) {
 const radius=request.transport==='자차'?15:request.transport==='대중교통'?8:4;
 const sights=places.filter(p=>['12','14'].includes(p.contentTypeId)&&validPoint(p)&&districtOf(p)&&(!request.district||districtOf(p)===request.district));
 const anchors=[...sights].sort((a,b)=>seasonalScore(b,request)-seasonalScore(a,request)||String(a.id).localeCompare(String(b.id))).slice(0,180);
 let best;
 for(const anchor of anchors){
  const district=districtOf(anchor);
  const near=sights.filter(p=>districtOf(p)===district&&distanceKm(anchor,p)<=radius);
  if(near.length<3)continue;
  const nearbyEvents=events.filter(p=>validPoint(p)&&districtOf(p)===district&&distanceKm(anchor,p)<=radius);
  const score=near.sort((a,b)=>seasonalScore(b,request)-seasonalScore(a,request)).slice(0,request.days*4).reduce((n,p)=>n+seasonalScore(p,request),0)+Math.min(near.length,request.days*4)+Math.min(nearbyEvents.length,3)*6;
  if(!best||score>best.score)best={anchor,district,near,nearbyEvents,score};
 }
 if(!best)throw new Error('이동 범위 안에 일정 구성에 필요한 장소가 부족합니다. 이동 수단이나 지역을 바꿔 주세요.');
 const nearAll=places.filter(p=>validPoint(p)&&districtOf(p)===best.district&&distanceKm(best.anchor,p)<=radius);
 const order=items=>items.sort((a,b)=>seasonalScore(b,request)-seasonalScore(a,request)||distanceKm(best.anchor,a)-distanceKm(best.anchor,b));
 return {district:best.district,anchor:{lat:Number(best.anchor.lat),lng:Number(best.anchor.lng)},radiusKm:radius,
  sights:order(best.near).slice(0,30),food:order(nearAll.filter(p=>p.contentTypeId==='39')).slice(0,12),lodging:order(nearAll.filter(p=>p.contentTypeId==='32')).slice(0,8),events:best.nearbyEvents.slice(0,8)};
}
export async function loadWeather(request,anchor,fetchImpl=fetch) {
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
 const horizon=new Date(`${today}T00:00:00Z`);horizon.setUTCDate(horizon.getUTCDate()+15);
 if(request.startDate<today||request.startDate>horizon.toISOString().slice(0,10))return {status:'outside_forecast',days:[],note:'여행 날짜가 예보 범위 밖입니다. 실제 날씨를 반영하지 않았습니다.'};
 try{
  const params=new URLSearchParams({latitude:String(anchor.lat),longitude:String(anchor.lng),daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',timezone:'Asia/Seoul',forecast_days:'16'});
  const response=await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('weather');const data=await response.json();const d=data.daily;
  const days=(d?.time || []).flatMap((date,i)=>date>=request.startDate&&date<=request.endDate?[{date,code:d.weather_code?.[i],minC:d.temperature_2m_min?.[i],maxC:d.temperature_2m_max?.[i],rainPercent:d.precipitation_probability_max?.[i],windKph:d.wind_speed_10m_max?.[i]}]:[]);
  return {status:days.length===request.days?'available':'partial',days,source:'Open-Meteo',sourceUrl:'https://open-meteo.com/',note:days.length===request.days?'권역 대표 지점의 일별 예보입니다.':'일부 날짜의 예보가 없어 해당 날짜 날씨는 반영하지 않았습니다.'};
 }catch{return {status:'unavailable',days:[],note:'날씨 정보를 가져오지 못해 날씨 조건은 반영하지 않았습니다.'};}
}
const eventCache=new Map();
export async function loadDateEvents(request,areaCode,fetchImpl=fetch) {
 const db=getSupabase({admin:true});
 const cached=eventCache.get(`${request.region}:${request.startDate}:${request.endDate}`);
 if(cached&&cached.expires>Date.now())return cached.value;
 const since=new Date(`${request.startDate}T00:00:00Z`);since.setUTCFullYear(since.getUTCFullYear()-1);
 const matches=[];let complete=false;
 const deadline=Date.now()+20000;
 try{
  if(!process.env.TOUR_API_SERVICE_KEY)throw Error('key');
  for(let page=1;page<=10;page++){
   if(Date.now()>=deadline)break;
   const url=new URL(`${(process.env.TOUR_API_BASE_URL || 'https://apis.data.go.kr/B551011/KorService2').replace(/\/$/,'')}/searchFestival2`);
   url.search=new URLSearchParams({serviceKey:process.env.TOUR_API_SERVICE_KEY,MobileOS:'ETC',MobileApp:'AITravelPlanner',_type:'json',areaCode,eventStartDate:since.toISOString().slice(0,10).replaceAll('-',''),numOfRows:'100',pageNo:String(page)});
   const r=await fetchImpl(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(8000,deadline-Date.now())))});if(!r.ok)throw Error('events');
   const json=await r.json();if(json.response?.header?.resultCode!=='0000')throw Error('events');
   const body=json.response.body;const raw=body.items?.item;const rows=Array.isArray(raw)?raw:raw?[raw]:[];
   for(const row of rows){
    const format=v=>/^\d{8}$/.test(String(v))?`${String(v).slice(0,4)}-${String(v).slice(4,6)}-${String(v).slice(6)}`:null;
    const start=format(row.eventstartdate),end=format(row.eventenddate);
    if(start&&end&&start<=request.endDate&&end>=request.startDate&&/^\d+$/.test(String(row.contentid)))matches.push({row,start,end});
   }
   if(page*100>=Number(body.totalCount)||!rows.length){complete=true;break;}
  }
  const events=[];
  for(const {row,start,end} of matches){
   const place=await unwrap(db.from('comm_place').upsert({ext_key:`tourapi:${row.contentid}`,name:String(row.title).slice(0,200),address:String(row.addr1 || '').slice(0,300),region:request.region,lat:Number(row.mapy)||null,lng:Number(row.mapx)||null},{onConflict:'ext_key'}).select('place_id').single());
   const existing=await unwrap(db.from('comm_place_tour_detail').select('payload').eq('place_id',place.place_id).maybeSingle());
   const payload={source:'tourapi',summaryOnly:true,...(existing?.payload || {}),contentId:String(row.contentid),contentTypeId:'15',isActive:true,eventStartDate:start,eventEndDate:end,eventsCheckedAt:new Date().toISOString()};
   if(!payload.images)payload.images=['Type1','Type3'].includes(row.cpyrhtDivCd)&&row.firstimage?[row.firstimage]:[];
   await unwrap(db.from('comm_place_tour_detail').upsert({place_id:place.place_id,content_id:String(row.contentid),payload,synced_at:new Date().toISOString()}));
   events.push({id:`db:${place.place_id}`,name:row.title,address:row.addr1,region:request.region,contentTypeId:'15',type:'축제·공연',lat:Number(row.mapy),lng:Number(row.mapx),eventStartDate:start,eventEndDate:end,url:`/places/${place.place_id}`,image:payload.images?.[0] || null,description:`행사 기간 ${start} ~ ${end}`});
  }
  const value={status:complete?'available':'partial',events,note:complete?'관광공사 등록 행사 중 여행 기간과 겹치는 행사입니다.':'행사 목록을 일부만 확인했습니다.'};
  eventCache.set(`${request.region}:${request.startDate}:${request.endDate}`,{expires:Date.now()+15*60000,value});if(eventCache.size>30)eventCache.delete(eventCache.keys().next().value);
  return value;
 }catch{return {status:'unavailable',events:[],note:'행사 일정을 확인하지 못해 행사 추천에는 반영하지 않았습니다.'};}
}
