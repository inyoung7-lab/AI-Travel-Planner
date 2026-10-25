import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requireSupabase } from '../../lib/supabaseClient.js';
import { fmtDate } from './api.js';

export default function TripHistoryDetail({trip, placeMap = {}, onClose}) {
 const dialog = useRef(null);
 const [state,setState] = useState({loading:true});
 useEffect(()=>{dialog.current.showModal();},[]);
 useEffect(()=>{
  let active=true;
  async function load(){
   try {
    let plan;
    if(trip.savedId){
     const {data,error}=await requireSupabase().from('travel_itineraries').select('payload').eq('client_id',trip.savedId).single();
     if(error) throw error;
     plan=data.payload;
    } else plan={title:trip.title,days:trip.days.map(d=>({...d,items:d.placeIds.map(id=>({id:`db:${id}`,name:placeMap[id]?.name || `여행지 ${id}`,image:placeMap[id]?.image,address:placeMap[id]?.address,url:`/places/${id}`}))}))};
    if(active)setState({plan,loading:false});
   }catch(error){if(active)setState({loading:false,error:error.message});}
  }
  void load();return()=>{active=false;};
 },[trip,placeMap]);
 return <dialog className="mt-history-dialog" ref={dialog} aria-labelledby="history-trip-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current)onClose();}}>
  <div className="mt-history-dialog-inner">
   <header className="mt-history-dialog-head"><div><p>지난 여행 · 저장된 전체 일정</p><h2 id="history-trip-title">{trip.title}</h2><span>{fmtDate(trip.start)} ~ {fmtDate(trip.end)} · {trip.placeCount}곳</span></div><button type="button" onClick={onClose} aria-label="일정 상세 닫기">×</button></header>
   {state.loading ? <p role="status">저장한 일정을 불러오는 중이에요…</p> : state.error ? <p role="alert">{state.error}</p> : <>
    {state.plan.summary && <p className="mt-history-summary">{state.plan.summary}</p>}
    {state.plan.days.map((day,index)=><section className="mt-history-day" key={day.day || index}>
     <h3>DAY {index+1} {day.date && <small>{fmtDate(day.date)}</small>}</h3>{day.theme && <p>{day.theme}</p>}
     <ol>{(day.items || []).map((item,i)=><li className="mt-history-stop" key={`${item.id}-${i}`}>
      <div className="mt-history-time">{item.time || '시간 미정'}<small>{item.type || '여행지'}</small></div>
      <article>{item.image && <img src={item.image} alt={item.name} loading="lazy" />}<div><h4>{item.name}</h4>{item.reason && <p>{item.reason}</p>}{item.address && <small>{item.address}</small>}{/^db:\d+$/.test(String(item.id)) && <div className="mt-history-stop-actions"><Link to={`/places/${String(item.id).slice(3)}`} onClick={onClose}>장소 정보 보기 →</Link><Link className="mt-history-review" to={`/community/write?type=review&placeId=${String(item.id).slice(3)}`} onClick={onClose} aria-label={`${item.name} 리뷰 쓰기`}>리뷰 쓰기</Link></div>}</div></article>
     </li>)}</ol>
    </section>)}
   </>}
  </div>
 </dialog>;
}
