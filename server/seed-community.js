import { getSupabase, unwrap } from './db.js';
import { readFile } from 'node:fs/promises';

// Explicitly labelled examples; never overwrite existing posts or invent engagement.
const examples = [
  ['리뷰', '여행 리뷰', '제주', '제주 서쪽 1박 2일 여행 코스', '애월에서 해안 산책을 하고 협재해변으로 이동하는 예시 코스입니다.\n첫날은 이동을 여유 있게 잡고, 둘째 날은 해변 주변에서 쉬는 일정으로 구성해 보세요. 실제 방문 후기가 아닌 화면 확인용 예시입니다.', [1, 2]],
  ['리뷰', '장소 리뷰', '제주', '협재해변에서 여유롭게 보내는 오후', '해변 산책과 휴식을 중심으로 작성한 장소 리뷰 예시입니다.\n방문 전 날씨와 현지 안내를 확인하고, 쓰레기는 되가져가는 여행을 추천합니다.', [2]],
  ['리뷰', '여행 리뷰', '전남', '여수에서 순천까지 이어지는 여행', '여수 오동도와 순천만 국가정원을 연결한 여행 기록 예시입니다.\n도시 간 이동 시간을 충분히 두고 하루에 한두 곳을 둘러보는 구성입니다.', [4, 5]],
  ['리뷰', '장소 리뷰', '전남', '낙안읍성 골목 산책 코스', '전통 마을의 골목을 천천히 둘러보는 장소 리뷰 예시입니다.\n주민 생활 공간을 존중하고 사진 촬영 시 안내를 확인해 주세요.', [6]],
  ['리뷰', '장소 리뷰', '부산', '흰여울문화마을 산책 기록', '골목과 바다 풍경을 감상하는 산책 리뷰 예시입니다.\n계단이 있는 구간을 고려해 편한 신발을 준비하고, 주택가에서는 조용히 이동해 주세요.', [7]],
  ['리뷰', '여행 리뷰', '서울', '성수동에서 보내는 반나절', '성수동의 골목을 걸으며 카페와 전시 공간을 둘러보는 여행 예시입니다.\n영업 여부와 전시 일정은 방문 전에 별도로 확인해 주세요.', [8]],
  ['질문', null, '제주', '제주 서쪽 여행은 렌터카 없이도 괜찮을까요?', '애월과 협재를 둘러보는 2일 여행을 준비하고 있어요. 대중교통으로 이동할 때 일정 간격을 얼마나 두면 좋을까요?\n질문·답변 화면을 확인하기 위한 예시 게시글입니다.', []],
  ['질문', null, '전남', '여수와 순천을 함께 가면 며칠이 좋을까요?', '오동도와 순천만 국가정원을 일정에 넣고 싶어요. 여유 있게 둘러보려면 어떻게 나누면 좋을까요?\n질문·답변 화면 확인용 예시입니다.', []],
  ['질문', null, '부산', '부산에서 비 오는 날 갈 만한 곳이 궁금해요', '야외 산책 일정을 잡아 두었는데 비 예보가 있으면 실내 일정으로 바꾸려고 해요. 여러분은 어떤 기준으로 대체 코스를 정하시나요?\n답변 없는 질문 화면 확인용 예시입니다.', []],
  ['소통', null, '전체', '여행 가방에서 절대 빼놓지 않는 물건은?', '저는 보조배터리와 작은 물병을 먼저 챙겨요. 여러분의 필수 준비물도 이야기해 주세요.\n커뮤니티 소통 화면 확인용 예시 게시글입니다.', []],
  ['소통', null, '서울', '혼자 떠나는 여행, 일정은 얼마나 채우시나요?', '계획을 촘촘하게 세우는 편인가요, 도착해서 결정하는 편인가요? 하루에 한 구간은 비워 두는 여행을 상상해 봤어요.\n실제 이용자 후기가 아닌 소통 예시입니다.', []],
  ['소통', null, '제주', '여행 사진을 정리하는 나만의 방법', '여행이 끝난 뒤 장소별로 사진을 모으고 한 줄 메모를 남기는 방법을 공유해요. 다음 여행을 준비할 때도 도움이 될 것 같아요.\n화면 확인용 소통 예시입니다.', []],
];

const db = getSupabase({ admin: true });
const destinations = [
  ['제주', '애월', 1], ['제주', '협재해변', 2], ['전남', '여수 오동도', 4],
  ['전남', '순천만 국가정원', 5], ['부산', '흰여울문화마을', 7], ['서울', '성수동', 8],
];
for (const [region, name, place] of destinations) {
  examples.push(
    ['리뷰', '여행 리뷰', region, `${name} 느린 여행과 휴식 코스`, `${name}에서 산책과 휴식을 번갈아 즐기는 여행 코스 예시입니다.\n오전에는 주변을 둘러보고 오후에는 쉬는 시간을 넉넉히 두는 구성입니다. 동행자의 체력과 날씨에 맞춰 조정해 보세요.\n첨부 사진은 분위기를 보여주는 샘플 이미지이며 실제 방문 사진이나 해당 장소의 사진이 아닐 수 있습니다.`, [place]],
    ['질문', null, region, `${name} 여행 준비물은 무엇이 좋을까요?`, `${name} 여행을 계획하는 상황을 가정한 질문 예시입니다. 가벼운 짐으로 이동하려면 어떤 준비물을 우선 챙기면 좋을까요?\n실제 이용자의 문의가 아닌 커뮤니티 화면 확인용 샘플입니다.`, []],
    ['소통', null, region, `${name} 여행에서 남기고 싶은 한 장면`, `풍경을 사진으로 남기는 여행과 메모로 기록하는 여행 중 어떤 쪽을 좋아하시나요? ${name} 여행을 상상하며 자유롭게 이야기를 나눠 보세요.\n화면 확인을 위한 샘플 게시글입니다.`, []],
  );
}
const photoManifest = JSON.parse(await readFile(new URL('../public/images/community/credits.json', import.meta.url), 'utf8'));
const moreReviews = [
  ['제주', '애월 해안에서 시작하는 아침 산책', 1, '해안 풍경을 바라보며 걷고 중간에 쉬어 가는 오전 일정입니다. 바람을 막을 겉옷과 편한 신발을 준비하는 구성으로 계획해 보세요.'],
  ['제주', '협재해변 풍경을 담는 사진 여행', 2, '해변과 바다 풍경을 천천히 담는 사진 여행 예시입니다. 파도와 날씨에 맞춰 안전한 장소에서 촬영하고 해안 출입 안내를 따라 주세요.'],
  ['전남', '여수 케이블카와 함께 구성한 반나절', 3, '케이블카 탑승과 주변 산책을 조합한 반나절 일정입니다. 운행 여부와 탑승 조건은 방문 전에 운영처에서 확인하는 계획으로 구성했습니다.'],
  ['전남', '오동도 산책길에서 쉬어 가는 하루', 4, '산책과 휴식을 번갈아 배치하는 오동도 여행 예시입니다. 걷는 속도에 맞춰 일정을 여유롭게 잡고 돌아오는 교통편도 미리 확인해 보세요.'],
  ['전남', '순천만 국가정원 가족 나들이 계획', 5, '가족과 함께 정원을 둘러보는 일정 예시입니다. 보고 싶은 구역을 먼저 고르고, 휴식 장소와 이동 거리를 고려해 동선을 나누어 보세요.'],
  ['전남', '낙안읍성에서 만나는 전통 마을 풍경', 6, '마을 골목과 전통 가옥의 풍경을 중심으로 둘러보는 장소 리뷰 예시입니다. 주민의 생활 공간과 촬영 안내를 존중하는 방문을 계획해 주세요.'],
  ['부산', '흰여울문화마을 골목과 바다 산책', 7, '바다 전망과 골목 산책을 함께 즐기는 일정 예시입니다. 계단과 경사 구간을 고려해 이동량을 정하고 주택가에서는 조용히 걸어 주세요.'],
  ['서울', '성수동 골목을 천천히 둘러본다면', 8, '골목 구경과 카페 휴식을 조합한 도심 여행 예시입니다. 관심 있는 공간의 운영 시간을 먼저 확인하고 혼잡하면 대체 장소로 이동하는 구성입니다.'],
];
for (const [region, title, place, content] of moreReviews) examples.push(['리뷰', '장소 리뷰', region, title, `${content}\n실제 방문 후기가 아닌 커뮤니티 기능 확인용 예시입니다.`, [place]]);
const moreQuestions = [
  ['제주', '애월과 협재를 하루에 둘러보는 동선이 궁금해요', '두 장소 사이 이동과 식사 시간을 넉넉히 두고 싶어요. 한 곳에 오래 머무는 일정과 두 곳을 나누는 일정 중 어떻게 계획하시나요?'],
  ['전남', '여수 케이블카 일정은 날씨에 따라 어떻게 바꾸나요?', '운행 안내를 확인한 뒤 방문하려고 해요. 바람이 강한 날에는 어떤 방식으로 대체 일정을 준비하면 좋을까요?'],
  ['전남', '순천만 국가정원은 동선을 어떻게 나누면 좋을까요?', '일행의 걷는 속도가 서로 달라요. 보고 싶은 구역을 나누거나 중간에 만나는 식으로 계획해 보신 분들의 생각이 궁금합니다.'],
  ['전남', '낙안읍성과 정원을 함께 가는 일정은 어떨까요?', '한날에 이동할지 날짜를 나눌지 고민하고 있어요. 이동 시간과 휴식 시간을 기준으로 일정표를 어떻게 짜시나요?'],
  ['부산', '흰여울문화마을 산책 때 신발은 어떻게 준비하나요?', '골목과 계단을 걷는 여행을 계획 중이에요. 편안한 신발과 짐의 무게 중 어떤 부분을 더 신경 쓰시나요?'],
  ['서울', '성수동에서 친구와 만날 때 약속 장소 정하는 팁', '사람이 많을 때 서로 찾기 쉬운 약속 장소를 정하려고 해요. 지도 링크와 도착 시간을 어떻게 공유하면 좋을까요?'],
];
for (const [region, title, content] of moreQuestions) examples.push(['질문', null, region, title, `${content}\n질문·답변 동작 확인을 위한 샘플 게시글입니다.`, []]);
const moreTalks = [
  ['제주', '바다 여행에서 좋아하는 시간대는 언제인가요?', '밝은 낮의 바다와 해 질 무렵의 바다 중 어떤 풍경을 좋아하시나요? 여행 사진을 고르는 기준도 함께 나눠 보세요.'],
  ['전남', '여행 일정에 쉬는 시간을 넣는 방법', '목적지를 줄이고 한 장소에서 오래 쉬는 여행을 생각해 봤어요. 여러분은 하루 일정에서 휴식 시간을 얼마나 남겨 두시나요?'],
  ['부산', '골목 여행할 때 지키고 싶은 작은 약속', '생활 공간에서는 목소리를 낮추고 길을 막지 않는 여행을 하고 싶어요. 함께 기억할 만한 여행 습관을 이야기해 주세요.'],
  ['서울', '여행 메모는 종이와 휴대폰 중 무엇을 쓰나요?', '장소 이름과 기억하고 싶은 장면을 한 줄씩 적어 두는 방법을 고민 중이에요. 다시 보기 편한 기록 방법을 공유해 보세요.'],
  ['전남', '함께 여행할 때 역할을 나누는 방법', '한 사람은 길을 찾고 다른 사람은 휴식 장소를 고르면 어떨까요? 동행자와 부담 없이 여행을 준비하는 방법을 나눠 주세요.'],
  ['제주', '다음 여행을 위해 남겨 두고 싶은 장소', '이번 일정에 모두 넣기보다는 다음에 갈 곳을 남겨 두는 여행도 좋을 것 같아요. 다시 찾고 싶은 여행의 분위기를 이야기해 보세요.'],
];
for (const [region, title, content] of moreTalks) examples.push(['소통', null, region, title, `${content}\n커뮤니티 소통 화면 확인용 예시입니다.`, []]);
const oldSampleImages = ['/images/place-preview/hyeopjae-beach.png', '/images/place-preview/seaside-cafe.png', '/images/place-preview/jeju-seafood.png'];
const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email === 'test@test.com');
if (!user) throw new Error('기존 테스트 계정이 필요합니다.');
let created = 0;
for (const [category, sub_category, region, subject, content, places] of examples) {
  const title = `[예시] ${subject}`;
  let post = await unwrap(db.from('comm_post').select('post_id').eq('user_id', user.id).eq('title', title).maybeSingle());
  if (!post) {
    post = await unwrap(db.from('comm_post').insert({ user_id: user.id, category, sub_category, region, title, content }).select('post_id').single());
    created++;
  }
  if (places.length) await unwrap(db.from('comm_post_place').upsert(places.map((place_id) => ({ post_id: post.post_id, place_id, rating: 4 })), { onConflict: 'post_id,place_id', ignoreDuplicates: true }));
  if (category === '리뷰') {
    const sampleImages = places.map((id) => photoManifest[id]?.url).filter(Boolean);
    await unwrap(db.from('comm_post_image').delete().eq('post_id', post.post_id).in('image_url', oldSampleImages));
    const images = await unwrap(db.from('comm_post_image').select('image_url').eq('post_id', post.post_id));
    const missing = sampleImages.filter((url) => !images.some((i) => i.image_url === url));
    if (missing.length) await unwrap(db.from('comm_post_image').insert(missing.map((image_url) => ({ post_id: post.post_id, image_url, sort_no: sampleImages.indexOf(image_url) }))));
    const updatedContent = content.replace(/\n첨부 사진은[^\n]*/g, '') + '\n사진은 해당 여행지의 참고 사진입니다. 작성자가 직접 촬영한 방문 후기는 아니며, 사진 출처와 이용 조건은 하단에서 확인할 수 있습니다.';
    await unwrap(db.from('comm_post').update({ content: updatedContent }).eq('post_id', post.post_id));
  }
  const comments = category === '질문' && region === '부산' ? [] : category === '질문'
    ? ['[예시 답변] 이동 구간을 먼저 확인하고, 하루에 주요 장소를 두 곳 정도로 나누는 일정을 생각해 보세요.', '[예시 답글] 일정 사이에 휴식 시간을 넣는 방법도 좋겠네요.']
    : ['[예시 댓글] 다음 여행 계획을 이야기할 때 참고할 수 있는 예시네요.'];
  let parentId = null;
  for (const [index, text] of comments.entries()) {
    let comment = await unwrap(db.from('comm_comment').select('comment_id').eq('post_id', post.post_id).eq('user_id', user.id).eq('content', text).maybeSingle());
    if (!comment) comment = await unwrap(db.from('comm_comment').insert({ post_id: post.post_id, user_id: user.id, content: text, parent_id: index ? parentId : null }).select('comment_id').single());
    parentId = comment.comment_id;
  }
}
const posts = await unwrap(getSupabase().from('community_posts').select('post_id,category,comment_count,answer_count').eq('user_id', user.id).like('title', '[예시]%'));
console.log(JSON.stringify({ created, totalExamples: posts.length, categories: Object.fromEntries(['리뷰', '질문', '소통'].map((category) => [category, posts.filter((p) => p.category === category).length])), comments: posts.reduce((n, p) => n + p.comment_count, 0) }));
