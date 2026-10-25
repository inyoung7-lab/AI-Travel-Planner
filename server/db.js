import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export function getSupabase({ token, admin = false } = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = admin ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Object.assign(new Error(admin ? '서버의 SUPABASE_SECRET_KEY 설정이 필요합니다.' : 'Supabase URL과 publishable key 설정이 필요합니다.'), { status: 503 });
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

export async function unwrap(query) {
  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}

export async function databaseSession(req, res, next) {
  try {
    const header = req.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    req.db = getSupabase({ token });
    if (token) {
      const { data, error } = await req.db.auth.getUser(token);
      if (error || !data.user) return res.status(401).json({ message: '로그인이 만료되었습니다. 다시 로그인해 주세요.' });
      req.user = data.user;
    }
    next();
  } catch (error) { next(error); }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ message: '로그인이 필요해요.' });
  next();
}

export function databaseError(error, _req, res, _next) {
  console.error('[database]', error.code || error.message);
  const status = error.status || ({ '23505': 409, '23503': 400, '23514': 400, '42501': 403, P0002: 404, '22P02': 400 }[error.code]) || 500;
  res.status(status).json({ message: status === 503 ? error.message : status === 404 ? '요청한 데이터를 찾을 수 없어요.' : status === 403 ? '권한이 없습니다.' : status === 409 ? '이미 등록된 데이터입니다.' : '요청을 처리하지 못했어요.' });
}

// Use a fresh query for each page; PostgREST can cap a response's row count.
export async function allRows(makeQuery, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await unwrap(makeQuery().range(offset, offset + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
