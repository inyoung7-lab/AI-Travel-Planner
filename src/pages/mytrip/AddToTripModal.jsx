import { useUser } from '../../lib/auth.js';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadOverview, addPlaceToTrip, fmtShort } from './api.js';

export default function AddToTripModal({placeId,placeName,onClose,onAdded}) {
 const user=useUser(),userId=user?.userId;
 const [params]=useSearchParams();
 const [trips,setTrips]=useState(null),[selected,setSelected]=useState(params.get('trip') || ''),[day,setDay]=useState(Number(params.get('day')) || 1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState(false);
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  loadOverview(userId).then(data=>{if(active){const rows=data.trips.filter(t=>t.status==='upcoming');setTrips(rows);setSelected(current=>rows.some(t=>String(t.id)===current)?current:String(rows[0]?.id || ''));}}).catch(e=>{if(active){setError(e.message);setTrips([]);}});
  return()=>{active=false;};
 },[userId]);
 useEffect(()=>{
  const handler=event=>{if(event.key==='Escape'&&!busy)onClose();};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[busy,onClose]);
 const trip=trips?.find(t=>String(t.id)===selected);
 const totalDays=trip?.savedId ? Math.round((Date.parse(trip.end)-Date.parse(trip.start))/86400000)+1 : 1;
 const dayNo=Math.min(Math.max(day,1),totalDays);
 async function add(){setBusy(true);setError('');try{await addPlaceToTrip(selected,userId,Number(placeId),dayNo);setAdded(true);onAdded?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="trip-add-backdrop" onClick={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}><section className="trip-add-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-add-title">
  <header><h2 id="trip-add-title">일정에 담기</h2><button type="button" onClick={onClose} disabled={busy} aria-label="닫기">×</button></header><p>{placeName}</p>
  {error&&<p role="alert">{error}</p>}
  {!user ? <p>로그인 후 일정을 만들 수 있어요. <Link to="/login" onClick={onClose}>로그인하기</Link></p> : added ? <div role="status"><p>{trip?.title} · {dayNo}일차에 담았어요.</p>{trip?.savedId&&<Link to={`/mytrip/edit/${encodeURIComponent(trip.savedId)}?day=${dayNo}`} onClick={onClose}>내 일정 편집하기 →</Link>}<button type="button" onClick={onClose}>계속 둘러보기</button></div> : trips===null ? <p role="status">내 일정을 불러오는 중이에요…</p> : !trips.length ? <><p>먼저 빈 일정을 만들어 주세요.</p><Link to="/mytrip/new" onClick={onClose}>＋ 직접 일정 만들기</Link></> : <>
   <label>담을 일정<select value={selected} onChange={e=>{setSelected(e.target.value);setDay(1);}}>{trips.map(t=><option key={t.id} value={String(t.id)}>{t.title} ({fmtShort(t.start)}~{fmtShort(t.end)})</option>)}</select></label>
   <label>담을 날짜<select value={dayNo} onChange={e=>setDay(Number(e.target.value))}>{Array.from({length:totalDays},(_,i)=><option key={i} value={i+1}>{i+1}일차 · {new Date(Date.parse(trip.start)+i*86400000).toISOString().slice(0,10)}</option>)}</select></label>
   <button type="button" disabled={busy||!trip} onClick={add}>{busy?'저장 중…':'이 날짜에 담기'}</button><Link to="/mytrip/new" onClick={onClose}>＋ 새 일정 만들기</Link>
  </>}
 </section></div>;
}
