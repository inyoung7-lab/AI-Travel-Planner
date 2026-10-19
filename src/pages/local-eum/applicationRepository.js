import { requireSupabase } from '../../lib/supabaseClient.js';
import { toApplicationRpcPayload } from './applicationRpcPayload.js';

export async function submitExperienceApplication(input, db) {
  const client = db || requireSupabase();
  const { data, error } = await client.rpc(
    'lc_submit_experience_application',
    toApplicationRpcPayload(input),
  );
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('신청 결과를 확인하지 못했습니다.');
  return data;
}
