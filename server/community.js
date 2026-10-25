import express from 'express';
import { databaseSession, requireUser, unwrap } from './db.js';
import { placePhotoCredits as photoCredits, photoCreditFor as creditFor } from './repositories/placePhotos.js';

const router = express.Router();
router.use(databaseSession);
const integer = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const timeAgo = (date) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date)) / 60000));
  return minutes < 1 ? '방금 전' : minutes < 60 ? `${minutes}분 전` : minutes < 1440 ? `${Math.floor(minutes / 60)}시간 전` : `${Math.floor(minutes / 1440)}일 전`;
};
export function mapPost(row) {
  const type = row.category === '리뷰' ? 'review' : row.category === '질문' ? 'question' : 'talk';
  return { id: row.post_id, type, title: row.title, excerpt: row.content.slice(0, 150), author: row.user_name,
    authorId: row.user_id, time: timeAgo(row.created_at), region: row.region, likes: row.like_count,
    comments: row.comment_count, views: row.view_count, placeIds: row.place_ids || [], placeRatings: row.place_ratings || {},
    ...(type === 'question' ? { answers: row.answer_count, ...(row.top_answer ? { topAnswer: { label: '인기 답변', text: row.top_answer } } : {}) } : {}),
    ...(row.photo_count ? { thumb: { bg: 'linear-gradient(135deg,#8FA4BA,#5B7491)', more: row.photo_count - 1 } } : {}),
  };
}

router.get('/posts', async (req, res) => {
  let query = req.db.from('community_posts').select('*');
  const category = { review: '리뷰', trip: '리뷰', place: '리뷰', question: '질문', talk: '소통' }[req.query.category];
  if (category) query = query.eq('category', category);
  if (req.query.category === 'trip') query = query.eq('sub_category', '여행 리뷰');
  if (req.query.category === 'place') query = query.eq('sub_category', '장소 리뷰');
  if (req.query.region && req.query.region !== '전체') query = query.eq('region', req.query.region);
  if (req.query.author) query = query.eq('user_id', req.query.author);
  if (req.query.unanswered === '1') query = query.eq('category', '질문').eq('answer_count', 0);
  if (req.query.q?.trim()) query = query.ilike('search_text', `%${req.query.q.trim().replace(/[%_]/g, '')}%`);
  if (req.query.sort === 'recommend') query = query.order('like_count', { ascending: false });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
  const rows = await unwrap(query.order('created_at', { ascending: false }).limit(limit));
  const images = rows.length ? await unwrap(req.db.from('comm_post_image').select('post_id,image_url,sort_no').in('post_id', rows.map((p) => p.post_id)).order('sort_no')) : [];
  res.json(rows.map((row) => {
    const post = mapPost(row);
    const photo = images.find((i) => i.post_id === row.post_id);
    if (photo) post.thumb = { ...post.thumb, url: photo.image_url };
    return post;
  }));
});

router.post('/posts', requireUser, async (req, res) => {
  const b = req.body || {};
  const kinds = { trip: ['리뷰', '여행 리뷰'], place: ['리뷰', '여행 리뷰'], question: ['질문', null], talk: ['소통', null] };
  const kind = kinds[b.kind];
  const title = String(b.title || '').trim(), content = String(b.content || '').trim();
  const ids = [...new Set((Array.isArray(b.placeIds) ? b.placeIds : []).filter(integer).map(Number))];
  if (!kind || !title || title.length > 100 || !content || Buffer.byteLength(content, 'utf8') > 3900 || String(b.region || '').length > 20
    || ids.length > 10 || (kind[0] === '리뷰' && !ids.length)) return res.status(400).json({ message: '글 종류, 제목, 내용과 여행지(1~10곳)를 확인해 주세요.' });
  const id = await unwrap(req.db.rpc('travel_create_post', { p_category: kind[0], p_sub_category: kind[1], p_title: title,
    p_content: content, p_region: b.region || null, p_place_ids: ids, p_ratings: b.placeRatings || {} }));
  res.json({ success: true, id, kind: b.kind, placeIds: ids });
});

router.get('/posts/:id', async (req, res) => {
  if (!integer(req.params.id)) return res.status(404).json({ message: '글을 찾을 수 없어요.' });
  const id = Number(req.params.id);
  if (req.query.view === '1') await unwrap(req.db.rpc('travel_view_post', { p_id: id }));
  const row = await unwrap(req.db.from('community_posts').select('*').eq('post_id', id).maybeSingle());
  if (!row) return res.status(404).json({ message: '글을 찾을 수 없어요.' });
  const [allComments, authorPosts, trips, otherPosts, placeLinks] = await Promise.all([
    unwrap(req.db.from('community_comments').select('*').eq('post_id', id).order('created_at')),
    unwrap(req.db.from('comm_post').select('category,like_count').eq('user_id', row.user_id)),
    unwrap(req.db.rpc('travel_author_trip_count', { p_user_id: row.user_id })),
    unwrap(req.db.from('community_posts').select('*').eq('category', row.category).neq('post_id', id).order('created_at', { ascending: false }).limit(100)),
    row.place_ids?.length ? unwrap(req.db.from('comm_post_place').select('place_id').in('place_id', row.place_ids)) : [],
  ]);
  let liked = false, likedComments = new Set(), wishes = [];
  if (req.user) {
    const [likes, commentLikes, saved] = await Promise.all([
      unwrap(req.db.from('comm_post_like').select('post_id').eq('user_id', req.user.id).eq('post_id', id)),
      unwrap(req.db.from('comm_comment_like').select('comment_id').eq('user_id', req.user.id)),
      unwrap(req.db.from('mytrip_wish').select('place_id').eq('user_id', req.user.id)),
    ]);
    liked = likes.length > 0; likedComments = new Set(commentLikes.map((x) => x.comment_id)); wishes = saved.map((x) => x.place_id);
  }
  const parents = allComments.filter((x) => x.parent_id == null);
  if (row.category === '질문') parents.sort((a, b) => b.like_count - a.like_count || new Date(a.created_at) - new Date(b.created_at));
  else parents.reverse();
  const comments = parents.map((c) => {
    const replyList = allComments.filter((r) => r.parent_id === c.comment_id).map((r) => ({ name: r.user_name, text: r.content }));
    return { id: c.comment_id, name: c.user_name, text: c.content, time: timeAgo(c.created_at), likes: c.like_count,
      liked: likedComments.has(c.comment_id), replyCount: replyList.length, replyList };
  });
  const related = row.category === '리뷰' ? otherPosts.filter((x) => x.place_ids.some((p) => row.place_ids.includes(p))).sort((a, b) => b.like_count - a.like_count).slice(0, 3).map((x) => ({ id: x.post_id, title: x.title, likes: x.like_count })) : [];
  const similar = row.category === '리뷰' ? [] : otherPosts.sort((a, b) => Number(b.region === row.region) - Number(a.region === row.region)).slice(0, 3).map((x) => ({ id: x.post_id, title: x.title, answers: row.category === '질문' ? x.answer_count : x.comment_count }));
  const images = await unwrap(req.db.from('comm_post_image').select('image_url').eq('post_id', id).order('sort_no'));
  res.json({ post: { ...mapPost(row), liked }, images: images.map((i) => i.image_url), imageCredits: images.map((i) => creditFor(i.image_url)).filter(Boolean), body: row.content.split(/\n+/).filter(Boolean), photoCount: row.photo_count,
    photoMore: Math.max(row.photo_count - 3, 0), placeReviews: Object.fromEntries((row.place_ids || []).map((p) => [p, placeLinks.filter((x) => x.place_id === p).length])),
    wishedPlaceIds: wishes.filter((p) => row.place_ids.includes(p)), comments,
    profile: { joined: null, reviews: authorPosts.filter((p) => p.category === '리뷰').length, likes: authorPosts.reduce((sum, p) => sum + p.like_count, 0), trips, recent: [] }, related, similar });
});

router.post('/posts/:id/comments', requireUser, async (req, res) => {
  const content = String(req.body?.content || '').trim();
  const parentId = req.body?.parentId ?? null;
  if (!integer(req.params.id) || !content || content.length > 1000 || (parentId !== null && !integer(parentId))) return res.status(400).json({ message: '댓글 내용을 확인해 주세요. (1~1000자)' });
  await unwrap(req.db.from('comm_comment').insert({ post_id: Number(req.params.id), user_id: req.user.id, content, parent_id: parentId }));
  res.json({ success: true });
});
for (const [path, kind] of [['posts', 'post'], ['comments', 'comment']]) {
  router.post(`/${path}/:id/like`, requireUser, async (req, res) => {
    if (!integer(req.params.id)) return res.status(400).json({ message: '잘못된 번호입니다.' });
    res.json({ success: true, ...await unwrap(req.db.rpc('travel_toggle_like', { p_kind: kind, p_id: Number(req.params.id) })) });
  });
}
router.post('/posts/:id/delete', requireUser, async (req, res) => {
  if (!integer(req.params.id)) return res.status(400).json({ message: '잘못된 번호입니다.' });
  const deleted = await unwrap(req.db.from('comm_post').delete().eq('post_id', Number(req.params.id)).eq('user_id', req.user.id).select('post_id'));
  if (!deleted.length) return res.status(404).json({ message: '삭제할 내 글을 찾을 수 없어요.' });
  res.json({ success: true });
});
router.get('/hot-places', async (req, res) => {
  const hot = await unwrap(req.db.rpc('travel_hot_places'));
  if (!hot.length) return res.json([]);
  const ids = hot.map((p) => p.placeId);
  const [places, links] = await Promise.all([
    unwrap(req.db.from('comm_place').select('place_id,name').in('place_id', ids)),
    unwrap(req.db.from('comm_post_place').select('place_id,post_id').in('place_id', ids)),
  ]);
  const postIds = [...new Set(links.map((p) => p.post_id))];
  const images = postIds.length ? await unwrap(req.db.from('comm_post_image').select('post_id,image_url,sort_no').in('post_id', postIds).order('sort_no').order('img_id')) : [];
  res.json(hot.map((place) => {
    const matching = new Set(links.filter((p) => p.place_id === place.placeId).map((p) => p.post_id));
    const imageUrl = photoCredits[place.placeId]?.url || images.find((image) => matching.has(image.post_id))?.image_url || null;
    return { ...place, name: places.find((p) => p.place_id === place.placeId)?.name,
      imageUrl, imageCredit: creditFor(imageUrl) };
  }));
});
router.get('/counts', async (req, res) => res.json(await unwrap(req.db.rpc('travel_post_counts'))));
router.get('/place-search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  res.json(await unwrap(req.db.rpc('travel_search_places', { p_query: q })));
});
router.get('/places-by-ids', async (req, res) => {
  const ids = [...new Set(String(req.query.ids || '').split(',').filter(integer).map(Number))].slice(0, 100);
  const rows = ids.length ? await unwrap(req.db.from('comm_place').select('place_id,name,address,region').in('place_id', ids)) : [];
  res.json(Object.fromEntries(rows.map((p) => [p.place_id, { name: p.name, addr: p.address || '', region: p.region || '' }])));
});
router.post('/places', requireUser, async (req, res) => {
  const b = req.body || {}, name = String(b.name || '').trim(), key = String(b.extKey || '').trim();
  if (!name || name.length > 200 || !key || key.length > 100) return res.status(400).json({ message: '여행지 정보를 확인해 주세요.' });
  const coordinate = (value, max) => value != null && value !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= max ? Number(value) : null;
  const id = await unwrap(req.db.rpc('travel_save_place', { p_name: name, p_address: String(b.addr || '').slice(0, 300), p_region: String(b.region || '').slice(0, 20),
    p_lat: coordinate(b.lat, 90), p_lng: coordinate(b.lng, 180), p_ext_key: key }));
  res.json({ placeId: id });
});
router.get('/places/:placeId', async (req, res) => {
  if (!integer(req.params.placeId)) return res.status(404).json({ message: '여행지를 찾을 수 없어요.' });
  const id = Number(req.params.placeId);
  let query = req.db.from('community_place_reviews').select('*').eq('place_id', id);
  if (req.query.sort !== 'latest') query = query.order('like_count', { ascending: false });
  const rows = await unwrap(query.order('created_at', { ascending: false }).limit(30));
  const photos = rows.length ? await unwrap(req.db.from('comm_post_image').select('post_id,image_url').in('post_id', rows.map((r) => r.post_id)).order('sort_no')) : [];
  const wishes = req.user ? await unwrap(req.db.from('mytrip_wish').select('wish_id').eq('user_id', req.user.id).eq('place_id', id)) : [];
  res.json({ placeId: id, reviewCount: rows.length, wished: wishes.length > 0, reviews: rows.map((r) => ({ id: r.post_id, type: 'review', author: r.user_name,
    time: timeAgo(r.created_at), rating: r.rating, text: r.content.slice(0, 300), photos: Math.min(r.photo_count, 3), imageUrls: photos.filter((i) => i.post_id === r.post_id).slice(0, 3).map((i) => i.image_url), likes: r.like_count })) });
});
router.post('/wishes/toggle', requireUser, async (req, res) => {
  if (!integer(req.body?.placeId)) return res.status(400).json({ message: '여행지를 확인해 주세요.' });
  res.json({ success: true, wished: await unwrap(req.db.rpc('travel_toggle_wish', { p_place_id: Number(req.body.placeId) })) });
});
export default router;
