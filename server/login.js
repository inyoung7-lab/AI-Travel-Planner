import express from 'express';
import { getSupabase } from './db.js';
const router = express.Router();
router.post('/', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return res.status(401).json({ message: '이메일 또는 비밀번호를 확인해 주세요.' });
    res.json({ success: true, session: data.session, user: { userId: data.user.id, name: data.user.user_metadata?.name, email: data.user.email } });
  } catch (error) { next(error); }
});
export default router;
