import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUser, useLogoutGuard } from '../../lib/auth.js';
import { requireSupabase } from '../../lib/supabaseClient.js';
import { koreanToday } from '../../../shared/travelDates.js';
import { createManualPlan, editManualItem, manualRepository } from '../../lib/manualItinerary.js';
import { RouteSketch } from '../AiItinerary.jsx';
import './ManualTrip.css';

export default function ManualTrip(){
 const {id}=useParams(),user=useUser(),navigate=useNavigate();
 const [params]=useSearchParams();
 const today=koreanToday();
 const [form,setForm]=useState({title:'',region:'',startDate:today,endDate:today});
 const [loaded,setLoaded]=useState(null),[plan,setPlan]=useState(null),[day,setDay]=useState(Math.max(0,Math.min(4,(Number(params.get('day')) || 1)-1)));
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 useLogoutGuard(()=>!dirty||window.confirm('저장하지 않은 변경사항이 있어요. 로그아웃할까요?'));
 useEffect(()=>{
  if(!id||!user?.userId)return;
  let active=true;
  manualRepository(requireSupabase()).load(id).then(row=>{if(active){setLoaded({...row,id,owner:user.userId});setPlan(row.payload);setDay(current=>Math.min(current,row.payload.days.length-1));setDirty(false);}}).catch(problem=>{if(active)setError(problem.message);});
  return()=>{active=false;};
 },[id,user?.userId]);
 useEffect(()=>{const prevent=event=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[dirty]);
 async function save(event){
  event?.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const next=plan ? {...plan,title:plan.title.trim(),status:'saved'} : createManualPlan(form);
   if(!next.title || next.title.length>100)throw new Error('일정 이름을 1~100자로 입력해 주세요.');
   const row=await manualRepository(requireSupabase()).save(next,loaded?.updated_at);
   setLoaded({...row,id:row.payload.savedId,owner:user.userId});setPlan(row.payload);setDirty(false);setNotice('계정에 저장했어요. 여행지를 담아 나만의 코스를 만들어 보세요.');
   if(!id)navigate(`/mytrip/edit/${encodeURIComponent(row.payload.savedId)}`,{replace:true});
  }catch(problem){setError(problem.message);}finally{setBusy(false);}
 }
 function edit(index,action,value){setPlan(p=>editManualItem(p,day,index,action,value));setDirty(true);setNotice('');}
 function leave(event){if(dirty&&!window.confirm('저장하지 않은 변경사항을 두고 이동할까요?'))event.preventDefault();}
 if(!user)return <main className="manual-trip"><h1>로그인 후 나만의 일정을 만들 수 있어요</h1><Link to="/login">로그인하기</Link></main>;
 if(id&&(loaded?.id!==id || loaded?.owner!==user.userId))return <main className="manual-trip"><p role="status">{error || '일정을 불러오는 중이에요…'}</p><Link to="/mytrip">나의 여행으로</Link></main>;
 const selected=plan?.days[day];
 return <main className="manual-trip">
  <Link className="manual-back" to="/mytrip" onClick={leave}>← 나의 여행으로</Link>
  <header className="manual-hero"><div><p className="manual-eyebrow">MY OWN JOURNEY</p><h1>{plan?'여행을 내 방식대로.':<>내가 고른 곳으로,<br/>나만의 여행.</>}</h1><p className="manual-hero-description">{plan?'가고 싶은 곳을 담고, 순서와 시간을 내 취향에 맞춰 보세요.':'이름을 붙이고, 날짜를 고르면 여행의 첫 페이지가 열려요.'}</p></div>{plan ? <div className="manual-save-area"><span className={`manual-save-status${dirty?' is-dirty':''}`}>{dirty?'● 저장하지 않은 변경사항':'✓ 계정에 저장된 일정'}</span><button type="button" onClick={save} disabled={busy||!dirty}>{busy?'저장 중…':dirty?'변경사항 저장':'저장 완료'}</button></div> : <div className="manual-hero-stamp" aria-hidden="true"><span>MY TRAVEL</span><strong>✦</strong><span>나만의 한걸음</span></div>}</header>
  {!plan && <ol className="manual-steps" aria-label="일정 만들기 순서"><li className="is-active"><span>01</span>여행 정보</li><li><span>02</span>장소 담기</li><li><span>03</span>코스 완성</li></ol>}
  {error&&<p className="manual-error" role="alert">{error}</p>}{notice&&<p className="manual-notice" role="status">✓ {notice}</p>}
  {!plan ? <div className="manual-create-layout"><form className="manual-create" onSubmit={save}>
   <div className="manual-form-heading"><span>LET’S GET STARTED</span><h2>어떤 여행을 떠나시나요?</h2><p>여행의 이름과 기간부터 정해 볼까요.</p></div>
   <label><span className="manual-label">일정 이름 <small>필수</small></span><input required maxLength={100} placeholder="예: 친구와 떠나는 거제 3일" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label><span className="manual-label">여행 지역 <small>선택</small></span><input maxLength={20} placeholder="예: 거제" value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/></label>
   <div className="manual-dates"><label>출발일<input type="date" required min={today} value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>도착일<input type="date" required min={form.startDate>today?form.startDate:today} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label></div>
   <p className="manual-form-note">◷ 최대 5일 · 장소는 일정을 만든 뒤 천천히 담아도 괜찮아요.</p><button className="manual-create-submit" disabled={busy}>{busy?'만드는 중…':'나만의 일정 시작하기'} <span aria-hidden="true">→</span></button>
  </form><aside className="manual-inspiration">
    <div className="manual-postcard"><span className="manual-postcard-tag">A LITTLE TRIP, ALL YOURS</span><svg viewBox="0 0 360 210" aria-hidden="true"><circle cx="285" cy="47" r="25" fill="#e7ad72"/><path d="M0 155Q65 55 140 138T360 110V210H0Z" fill="#bfd0bf"/><path d="M0 190Q90 105 200 158T360 148V210H0Z" fill="#839e91"/><path d="M63 158C70 100 260 205 294 99" fill="none" stroke="#fffaf0" strokeWidth="4" strokeDasharray="6 8"/><circle cx="63" cy="158" r="9" fill="#ca735e" stroke="#fffaf0" strokeWidth="4"/><circle cx="181" cy="153" r="9" fill="#ca735e" stroke="#fffaf0" strokeWidth="4"/><circle cx="294" cy="99" r="9" fill="#ca735e" stroke="#fffaf0" strokeWidth="4"/></svg><div><span>YOUR NEXT CHAPTER</span><strong>좋아하는 곳을 잇는 여행</strong><p>유명한 코스보다, 내가 가고 싶은 곳으로.</p></div></div>
    <div className="manual-inspiration-tips"><h3>이렇게 만들어 보세요</h3><p><b>01</b><span><strong>마음에 드는 장소 발견</strong><small>여행지 찾기에서 ‘일정에 담기’를 눌러요.</small></span></p><p><b>02</b><span><strong>날짜별로 차곡차곡</strong><small>원하는 일차에 장소를 나눠 담아요.</small></span></p><p><b>03</b><span><strong>내 속도에 맞는 코스</strong><small>지도에서 동선을 보고 시간과 순서를 정해요.</small></span></p></div>
  </aside></div> : <>
   <div className="manual-plan-summary"><div><span>TRIP PERIOD</span><strong>{plan.startDate} <i>—</i> {plan.endDate}</strong></div><div><span>DURATION</span><strong>{plan.days.length}일간의 여행</strong></div><div><span>PLACES</span><strong>{plan.days.reduce((n,d)=>n+d.items.length,0)}개의 장소</strong></div></div>
   <label className="manual-name">일정 이름<input maxLength={100} value={plan.title} onChange={e=>{setPlan({...plan,title:e.target.value});setDirty(true);}}/></label>
   <p className="manual-plan-origin">{plan.source==='manual'?'✎ 직접 만든 일정':'✦ 저장한 일정'} · 방문 시간과 순서를 자유롭게 편집하세요.</p>
   <nav className="manual-days" aria-label="일차 선택">{plan.days.map((d,i)=><button key={i} aria-pressed={day===i} onClick={()=>setDay(i)}><b>DAY {i+1}</b><span>{d.date.slice(5).replace("-", ".")}</span><small>{d.items.length}곳</small></button>)}</nav>
   <div className="manual-layout"><section>
    <div className="manual-add"><div><span className="manual-eyebrow">DAY {String(day+1).padStart(2,"0")}</span><h2>{day+1}일차, 나의 코스 <small>{selected?.items.length || 0}곳</small></h2></div><Link onClick={leave} to={`/places?trip=${encodeURIComponent(`cloud:${plan.savedId}`)}&day=${day+1}`}>＋ 여행지 찾아 담기</Link></div>
    {!selected?.items.length&&<div className="manual-empty"><span aria-hidden="true">＋</span><h3>첫 번째 목적지는 어디인가요?</h3><p>마음에 드는 장소를 담으면<br/>나만의 하루가 시작돼요.</p><Link onClick={leave} to={`/places?trip=${encodeURIComponent(`cloud:${plan.savedId}`)}&day=${day+1}`}>여행지 둘러보기 →</Link></div>}
    <ol className="manual-stops">{selected?.items.map((item,index)=><li key={`${item.id}-${index}`}>
     <span className="manual-stop-number">{String(index+1).padStart(2,"0")}</span>{item.image?<img src={item.image} alt="" loading="lazy"/>:<span className="manual-stop-placeholder" aria-hidden="true">⌖</span>}<div className="manual-stop-copy"><h3>{item.name}</h3><p>{item.address}</p><label>방문 시간<input type="time" value={item.time || ''} onChange={e=>edit(index,'time',e.target.value)}/></label></div>
     <div className="manual-stop-actions"><button aria-label={`${item.name} 위로`} disabled={index===0} onClick={()=>edit(index,'move',-1)}>↑</button><button aria-label={`${item.name} 아래로`} disabled={index===selected.items.length-1} onClick={()=>edit(index,'move',1)}>↓</button><button className="manual-remove" onClick={()=>edit(index,'remove')}>삭제</button></div>
    </li>)}</ol>
   </section><aside className="manual-map-panel"><div className="manual-map-heading"><div><span className="manual-eyebrow">ON THE MAP</span><h2>한눈에 보는 동선</h2></div><span>{selected?.items.length || 0}곳</span></div><RouteSketch items={selected?.items || []}/><p>선은 위치 관계를 표시하며 실제 도로 경로가 아닙니다.</p><p>장소 순서를 바꾸면 방문 시간도 함께 확인해 주세요.</p></aside></div>
  </>}
 </main>;
}
