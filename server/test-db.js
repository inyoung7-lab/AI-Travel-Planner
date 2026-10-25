import { getSupabase, unwrap } from './db.js';
try {
  const places = await unwrap(getSupabase().from('comm_place').select('place_id,name').limit(1));
  console.log('Supabase 연결 성공', places);
} catch (error) { console.error('Supabase 연결 실패:', error.message); process.exitCode = 1; }
