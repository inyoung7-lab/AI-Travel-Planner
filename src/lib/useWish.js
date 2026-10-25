import { useEffect, useState } from 'react';
import { authFetch, useUser } from './auth.js';
let owner, keys = new Set(), pending;
const listeners = new Set();
const publish=()=>listeners.forEach(fn=>fn());
function loadWishes(account) {
 pending=authFetch('/api/mytrip/wishes').then(async r=>{if(!r.ok) throw Error();return r.json();}).then(rows=>{if(owner===account){keys=new Set(rows);publish();}}).catch(()=>{if(owner===account) pending=null;});
 return pending;
}
export function invalidateWishes() { if(owner) loadWishes(owner); }
export function useWish(id) {
 const user=useUser();
 const userId=user?.userId;
 const [,render]=useState(0);
 const [busy,setBusy]=useState(false);
 const key=String(id || '').replace(/^db:/,'');
 useEffect(()=>{
  const update=()=>render(n=>n+1); listeners.add(update);
  if(owner!==userId){owner=userId;keys=new Set();pending=null;publish();}
  if(userId && !pending){
   const account=userId;
   loadWishes(account);
  }
  return ()=>listeners.delete(update);
 },[userId]);
 async function toggle(){
  if(!user) throw new Error('로그인 후 찜할 수 있어요.');
  if(busy) return;
  setBusy(true);
  try {
   if(pending) await pending;
   const account=user.userId;
   const r=await authFetch('/api/mytrip/wishes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:key,saved:!keys.has(key)})});
   const data=await r.json();if(!r.ok) throw new Error(data.message || '찜을 저장하지 못했어요.');
   if(owner===account){for(const alias of data.keys) { if(data.saved) keys.add(alias); else keys.delete(alias); }publish();}
  } finally {setBusy(false);}
 }
 return {saved:owner===user?.userId && keys.has(key),busy,toggle};
}
