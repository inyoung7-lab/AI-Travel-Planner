import { useEffect, useSyncExternalStore } from 'react';
import { requireSupabase, sessionSupabase, supabase } from './supabaseClient.js';

let currentUser = null;
let sessionVersion = 0;
const listeners = new Set();
const logoutGuards = new Set();
function publish(user) { currentUser = user; listeners.forEach((listener) => listener()); }
export async function loadAccountUser(session) {
  if (!session?.user) return null;
  const user = session.user;
  const db = sessionSupabase(session);
  const [profile, role] = await Promise.all([
    db.from('travel_profiles').select('user_name').eq('user_id', user.id).maybeSingle(),
    db.from('lc_user_roles').select('role').eq('user_id', user.id).eq('role', 'HOST').maybeSingle(),
  ]);
  return { userId: user.id, name: profile.data?.user_name || user.user_metadata?.name || user.email?.split('@')[0] || '여행자',
    email: user.email, isHost: !role.error && role.data?.role === 'HOST', accountLoaded: true };
}
function syncSession(session) {
  const version = ++sessionVersion;
  const user = session?.user;
  try { localStorage.removeItem('user'); } catch { /* Old display cache is optional. */ }
  if (!user) { publish(null); return; }
  const previous = currentUser?.userId === user.id ? currentUser : null;
  publish({ userId: user.id, name: previous?.name || user.user_metadata?.name || user.email?.split('@')[0] || '여행자',
    email: user.email, isHost: previous?.isHost || false, accountLoaded: previous?.accountLoaded || false });
  queueMicrotask(() => {
    loadAccountUser(session).then((account) => { if (version === sessionVersion) publish(account); })
      .catch(() => { if (version === sessionVersion && currentUser) publish({ ...currentUser, accountLoaded: true }); });
  });
}
if (supabase) supabase.auth.onAuthStateChange((_event, session) => syncSession(session));
export function getUser() { return currentUser; }
export function subscribeUser(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function useUser() { return useSyncExternalStore(subscribeUser, getUser, () => null); }
export function useLogoutGuard(guard) {
  useEffect(() => { logoutGuards.add(guard); return () => logoutGuards.delete(guard); }, [guard]);
}
export async function logout() {
  for (const guard of logoutGuards) if (!guard()) return false;
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
  syncSession(null);
  return true;
}
export async function initializeAuth() {
  if (!supabase) { syncSession(null); return; }
  const { data, error } = await supabase.auth.getSession();
  syncSession(error ? null : data.session);
}
export async function refreshAccount() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  syncSession(data.session);
}
export async function authFetch(input, options = {}) {
  const headers = new Headers(options.headers);
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  return fetch(input, { ...options, headers });
}
