import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { getSupabase, allRows } from './db.js';
export async function checkTourismData() {
 const db=getSupabase({admin:true});
 const places=await allRows(()=>db.from('comm_place').select('place_id,name,region,ext_key').order('place_id'));
 const snapshots=await allRows(()=>db.from('comm_place_tour_detail').select('place_id').order('place_id'));
 const regionCounts={};for(const row of places) regionCounts[row.region||'미지정']=(regionCounts[row.region||'미지정']||0)+1;
 const report={searchMode:process.env.TRAVEL_SEARCH_DATA_SOURCE?.trim()||'not_configured',tourApiConfigured:!!process.env.TOUR_API_SERVICE_KEY?.trim(),
  aiConfigured:!!process.env.CODYSSEY_OPENAI_KEY?.trim(),historyStore:process.env.TRAVEL_SEARCH_HISTORY_STORE||'supabase',
  catalog:{total:places.length,tourApi:places.filter((p)=>/^tourapi:\d+$/.test(p.ext_key||'')).length,sample:places.filter((p)=>p.ext_key?.startsWith('sample:')).length,detailSnapshots:snapshots.length,regions:regionCounts},
  tourApi:{baseUrl:process.env.TOUR_API_BASE_URL||'https://apis.data.go.kr/B551011/KorService2',
   search:['searchKeyword2','areaBasedList2'],detail:['detailCommon2','detailIntro2','detailInfo2','detailImage2'],nearby:['locationBasedList2'],
   fields:['장소명','주소','좌표','지역·분류','사진','소개','전화번호','운영시간','휴무일','주차','요금'],
   categories:['관광지','문화시설','축제·공연','여행코스','레포츠','숙박','쇼핑','음식점']},
  otherSources:['Photon/OpenStreetMap 장소·좌표 검색','Nominatim/OpenStreetMap 보조 검색','OpenStreetMap 지도 타일'],
 };
 if(report.tourApiConfigured) {
  const url=new URL(report.tourApi.baseUrl.replace(/\/$/,'')+'/areaBasedList2');
  for(const [key,value] of Object.entries({serviceKey:process.env.TOUR_API_SERVICE_KEY,MobileOS:'ETC',MobileApp:process.env.TOUR_API_MOBILE_APP||'AITravelPlanner',_type:'json',numOfRows:'1',pageNo:'1',areaCode:'1',contentTypeId:'12'})) url.searchParams.set(key,value);
  try {const response=await fetch(url,{signal:AbortSignal.timeout(8000)});const payload=await response.json();report.liveProbe={httpStatus:response.status,resultCode:payload?.response?.header?.resultCode,totalCount:payload?.response?.body?.totalCount};}
  catch {report.liveProbe={error:'TourAPI 연결 또는 JSON 응답 실패'};}
 } else report.liveProbe={skipped:'인증키 미설정'};
 return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) checkTourismData().then((report)=>console.log(JSON.stringify(report,null,2))).catch((error)=>{console.error(error.message);process.exitCode=1;});
