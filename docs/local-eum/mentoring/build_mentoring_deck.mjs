import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const SKILL_DIR = 'C:/Users/UserK/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations';
const RUNTIME_MODULES = 'C:/Users/UserK/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
process.env.RUNTIME_NODE_MODULES = RUNTIME_MODULES;
const { importRuntimeModule } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/runtime_helpers.mjs')).href);
const { Presentation, PresentationFile } = await importRuntimeModule('@oai/artifact-tool');
const privateDir = path.join(HERE, '.build-private');
const finalPath = path.join(HERE, 'LOCAL_EUM_MENTORING.pptx');
const images = path.join(HERE, 'assets');
await fs.mkdir(privateDir, { recursive: true });

const C = {
  navy: '#192C40', blue: '#2E78BD', teal: '#129B9A', coral: '#F06D5D',
  ink: '#23384D', muted: '#62768A', line: '#DCE5EA', paper: '#F8FAFB',
  white: '#FFFFFF', paleBlue: '#EAF3FA', paleTeal: '#E6F4F2', paleCoral: '#FFF0ED',
  paleGold: '#FFF7E7', gold: '#D99C35', green: '#35885C', gray: '#EDF1F4',
};
const FONT = 'Malgun Gothic';
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function shape(slide, x, y, w, h, fill, line = 'none', radius = 0, name) {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect', name,
    position: { left: x, top: y, width: w, height: h }, fill,
    line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}
function text(slide, x, y, w, h, value, opts = {}) {
  const s = slide.shapes.add({
    geometry: 'textbox', name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none', line: { style: 'solid', fill: 'none', width: 0 },
  });
  s.text = value;
  s.text.style = {
    fontSize: opts.size ?? 22, typeface: FONT, color: opts.color ?? C.ink,
    bold: opts.bold ?? false, alignment: opts.align ?? 'left',
    verticalAlignment: opts.valign ?? 'top', wrap: 'square',
    autoFit: opts.autoFit ?? 'shrinkText', insets: 0,
    ...(opts.lineSpacing ? { lineSpacing: opts.lineSpacing } : {}),
  };
  return s;
}
function boxText(slide, x, y, w, h, title, body, opts = {}) {
  shape(slide, x, y, w, h, opts.fill ?? C.white, opts.line ?? C.line, 16);
  if (opts.accent) shape(slide, x, y, 7, h, opts.accent, 'none', 3);
  text(slide, x + 22, y + 18, w - 44, opts.titleH ?? 34, title, { size: opts.titleSize ?? 21, bold: true, color: opts.titleColor ?? C.navy });
  text(slide, x + 22, y + (opts.bodyY ?? 60), w - 44, h - (opts.bodyY ?? 60) - 16, body, { size: opts.bodySize ?? 17, color: opts.bodyColor ?? C.muted, lineSpacing: 1.15 });
}
function pill(slide, x, y, w, label, fill, color = C.navy) {
  shape(slide, x, y, w, 32, fill, 'none', 16);
  text(slide, x + 8, y + 5, w - 16, 22, label, { size: 14, color, bold: true, align: 'center', valign: 'middle' });
}
function footer(slide, n, dark = false) {
  const color = dark ? '#B8C9D7' : '#8293A0';
  text(slide, 64, 680, 520, 20, 'LOCAL EUM  ·  멘토링 브리프  ·  2026.10', { size: 12, color });
  text(slide, 1170, 678, 46, 22, `${String(n).padStart(2, '0')} / 12`, { size: 12, color, align: 'right' });
}
function base(title, kicker, n, dark = false) {
  const s = deck.slides.add();
  s.background.fill = dark ? C.navy : C.paper;
  const fg = dark ? C.white : C.navy;
  text(s, 64, 38, 600, 22, kicker.toUpperCase(), { size: 13, color: dark ? '#73D1CC' : C.coral, bold: true });
  text(s, 64, 70, 1120, 54, title, { size: 35, color: fg, bold: true });
  shape(s, 64, 139, 56, 4, dark ? '#73D1CC' : C.teal, 'none', 2);
  footer(s, n, dark);
  return s;
}
async function addImage(slide, filename, x, y, w, h, alt) {
  const buf = await fs.readFile(path.join(images, filename));
  return slide.images.add({ blob: new Uint8Array(buf), contentType: 'image/png', alt, fit: 'cover', position: { left: x, top: y, width: w, height: h }, geometry: 'roundRect', borderRadius: 12 });
}
function notes(slide, body) { slide.speakerNotes.text = body; }

// 1 — Cover
{
  const s = base('로컬이음, 지역의 만남을 체험으로', 'MENTORING SESSION  ·  15 MIN', 1, true);
  text(s, 64, 190, 590, 90, '여행, 한걸음', { size: 56, color: C.white, bold: true });
  text(s, 64, 283, 590, 48, 'LOCAL EUM', { size: 31, color: '#73D1CC', bold: true });
  text(s, 64, 360, 535, 90, '여행에서 만남으로,\n만남에서 새로운 경험으로', { size: 28, color: C.white, bold: true });
  text(s, 64, 475, 510, 76, '지역 호스트의 체험을 찾고 신청하는 흐름과\n호스트 운영·AI 기획 지원을 연결합니다.', { size: 20, color: '#C7D6E2' });
  await addImage(s, 'catalog.png', 690, 184, 526, 330, '2026-10-20 로컬이음 실제 체험 목록 화면 캡처');
  pill(s, 690, 532, 182, '실제 UI 캡처', '#D5F2EE', '#126B6B');
  text(s, 64, 600, 1100, 30, '멘토링 목표  ·  무엇을 검증하고, 다음에 무엇을 만들지 결정하기', { size: 18, color: '#D8E5ED' });
  notes(s, '발표 목표는 완성 홍보가 아니라 현재 구현의 경계와 검증이 필요한 선택을 멘토와 함께 정하는 것입니다. 화면 캡처는 2026-10-20 로컬 개발 앱에서 직접 취득했습니다. 주요 근거: docs/local-eum/README.md, src/App.jsx.');
}
// 2 — Problem and value
{
  const s = base('관광 정보와 “돈을 내고 싶은 경험” 사이', 'WHY LOCAL EUM', 2);
  boxText(s, 64, 176, 530, 230, '여행자 문제', '지역 주민과 함께하는 경험을 찾기 어렵고,\n가격·진행 언어·시간·집결 정보가 흩어져\n참여 전에 신뢰와 가치를 판단하기 어렵습니다.', { fill: C.white, accent: C.blue, bodySize: 20 });
  boxText(s, 622, 176, 594, 230, '호스트 문제', '아이디어를 운영 가능한 일정·안전 안내·가격으로\n구체화하고, 여러 체험의 회차와 신청자를\n일관되게 관리하기가 어렵습니다.', { fill: C.white, accent: C.teal, bodySize: 20 });
  shape(s, 64, 435, 1152, 154, C.paleCoral, 'none', 18);
  text(s, 92, 460, 280, 34, '핵심 가설', { size: 18, color: C.coral, bold: true });
  text(s, 92, 500, 1050, 62, '단순히 장소를 방문하는 것만으로는 부족합니다.\n호스트의 해석·참여·기억할 결과가 실제 지불 이유인지 확인해야 합니다.', { size: 24, color: C.navy, bold: true });
  notes(s, '문제 정의는 현재 서비스 가설입니다. 지불 의사나 시장 규모를 조사로 입증한 사실처럼 말하지 않습니다. 검증 질문은 외부 여행자·호스트의 인터뷰와 유료 전환 테스트가 필요합니다.');
}
// 3 — Journeys
{
  const s = base('한 서비스 안에서 여행자와 호스트의 흐름을 연결', 'SERVICE FLOW', 3);
  text(s, 64, 175, 150, 28, '여행자', { size: 18, color: C.blue, bold: true });
  const traveler = ['체험 검색', '상세·호스트 확인', '회차 선택', '신청·접수'];
  traveler.forEach((label, i) => {
    const x = 64 + i * 286;
    shape(s, x, 216, 246, 88, i === 3 ? C.paleTeal : C.white, C.line, 14);
    text(s, x + 16, 230, 36, 25, `0${i + 1}`, { size: 14, color: C.coral, bold: true });
    text(s, x + 16, 264, 214, 28, label, { size: 19, color: C.navy, bold: true });
    if (i < 3) text(s, x + 252, 244, 30, 30, '→', { size: 25, color: C.teal, bold: true });
  });
  text(s, 64, 340, 150, 28, '호스트', { size: 18, color: C.teal, bold: true });
  const host = ['로그인·내 체험', '회차 운영', '신청자 관리', 'AI 제안 검토'];
  host.forEach((label, i) => {
    const x = 64 + i * 286;
    shape(s, x, 381, 246, 88, i === 3 ? C.paleBlue : C.white, C.line, 14);
    text(s, x + 16, 395, 36, 25, `0${i + 1}`, { size: 14, color: C.coral, bold: true });
    text(s, x + 16, 429, 214, 28, label, { size: 19, color: C.navy, bold: true });
    if (i < 3) text(s, x + 252, 409, 30, 30, '→', { size: 25, color: C.teal, bold: true });
  });
  shape(s, 64, 513, 1152, 92, C.paleGold, 'none', 16);
  text(s, 88, 535, 1096, 56, '경계  ·  신청·접수는 구현되어 있지만, 결제는 시연 안내이며 실제 결제·환불은 제공하지 않습니다.\n호스트의 편집·신청자 조회는 로그인 권한과 RLS의 영향을 받습니다.', { size: 18, color: C.ink });
  notes(s, '화면 경로는 src/App.jsx와 src/pages/local-eum의 라우트 구성에서 확인했습니다. 공개 체험은 Supabase PUBLISHED 조회, 신청은 lc_submit_experience_application RPC 경로를 사용합니다. 회차 선택·신청의 노출은 실제 공개 화면 캡처로 확인했습니다.');
}
// 4 — Actual UI evidence
{
  const s = base('화면으로 확인한 현재 구현', 'LIVE UI EVIDENCE', 4);
  await addImage(s, 'catalog.png', 64, 174, 350, 260, '실제 로컬이음 공개 목록 캡처');
  await addImage(s, 'experience-detail.png', 465, 174, 350, 260, '실제 로컬이음 체험 상세 캡처');
  await addImage(s, 'host-demo.png', 866, 174, 350, 260, '실제 로컬이음 공개 호스트 데모 캡처');
  text(s, 64, 452, 350, 33, '01  공개 체험 목록', { size: 20, bold: true, color: C.navy });
  text(s, 64, 490, 350, 80, '지역·관심분야 필터와\n공개 체험 15개 표시', { size: 17, color: C.muted });
  text(s, 465, 452, 350, 33, '02  상세·회차·신청', { size: 20, bold: true, color: C.navy });
  text(s, 465, 490, 350, 80, '장소·시간·참가비와\n신청 진입 버튼', { size: 17, color: C.muted });
  text(s, 866, 452, 350, 33, '03  호스트 공개 데모', { size: 20, bold: true, color: C.navy });
  text(s, 866, 490, 350, 80, '가상 데이터·읽기 전용\n실제 HOST 정보는 미노출', { size: 17, color: C.muted });
  shape(s, 64, 590, 1152, 48, C.paleBlue, 'none', 12);
  text(s, 82, 603, 1110, 25, '주의  ·  카드 이미지는 앱에서 AI 생성 이미지로 표시됩니다. 화면은 로컬 개발 환경의 실제 렌더링 캡처입니다.', { size: 15, color: C.ink });
  notes(s, '세 장의 화면은 2026-10-20 로컬 개발 앱을 Edge headless 브라우저로 실제 렌더링해 캡처했습니다. URL은 /local-eum, /local-eum/experiences/113, /local-eum/host/profile?demo=1 입니다. 공개 운영 서버의 캡처가 아니며, 공개 호스트 데모 화면은 가상 데이터를 표시합니다.');
}
// 5 — Data model and snapshot
{
  const s = base('Supabase 실제 조회: 작은 운영 데이터와 명확한 관계', 'DATA MODEL  ·  READ-ONLY SNAPSHOT', 5);
  const metrics = [
    ['호스트', '2'], ['체험', '15'], ['운영 회차', '19'], ['일정 단계', '68'], ['신청', '1'], ['시연 결제 안내', '1'],
  ];
  metrics.forEach((m, i) => {
    const x = 64 + (i % 3) * 386;
    const y = 174 + Math.floor(i / 3) * 92;
    shape(s, x, y, 356, 72, C.white, C.line, 14);
    text(s, x + 18, y + 12, 210, 22, m[0], { size: 15, color: C.muted });
    text(s, x + 268, y + 12, 68, 44, m[1], { size: 28, color: C.blue, bold: true, align: 'right' });
  });
  const nodes = [
    [64, 'HOST', 'lc_hosts'], [324, '체험', 'lc_experiences'], [584, '회차', 'lc_sessions'], [844, '신청', 'lc_applications'], [1070, '결제 안내', 'lc_application_payments'],
  ];
  nodes.forEach(([x, title, table]) => {
    shape(s, x, 405, 184, 84, C.paleBlue, 'none', 13);
    text(s, x + 14, 420, 156, 26, title, { size: 19, bold: true, color: C.navy, align: 'center' });
    text(s, x + 10, 454, 164, 20, table, { size: 12, color: C.muted, align: 'center' });
  });
  for (const x of [255, 515, 775, 1035]) text(s, x, 431, 52, 26, '→', { size: 25, color: C.teal, bold: true, align: 'center' });
  text(s, 64, 525, 1120, 74, '서울·부산·창원 언어·친구 3건은 PUBLISHED, 연결 회차는 RECRUITING.\n진행 가능 언어는 3건 모두 미확인 빈 배열이며, 0원 회차 1건은 실제 결제가 연결된 뜻이 아닙니다.', { size: 18, color: C.ink });
  notes(s, '2026-10-20 Supabase local-eum-dev 프로젝트에 read-only SQL 조회를 수행했습니다. 집계: hosts 2, experiences 15, experience_steps 68, sessions 19, applications 1, lc_application_payments 1. 113/114/115는 각각 17/18/19 회차, PUBLISHED/RECRUITING, 표시 참가비 10,000/0/10,000원이며 available_languages 길이는 0. 사용자 개인정보는 읽거나 슬라이드에 포함하지 않았습니다. 적용 기록: docs/local-eum/migrations/20261020_language_friends_publish.applied.md.');
}
// 6 — Architecture
{
  const s = base('팀 공통 React 안의 로컬이음, 데이터는 Supabase로 분리', 'SYSTEM ARCHITECTURE', 6);
  shape(s, 64, 174, 750, 360, C.white, C.line, 18);
  text(s, 88, 193, 700, 28, '여행자·HOST 브라우저', { size: 20, color: C.navy, bold: true, align: 'center' });
  boxText(s, 92, 244, 240, 104, 'React + Vite', '공통 Header / App 라우터\n/local-eum 화면', { fill: C.paleBlue, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 394, 244, 348, 104, 'Supabase Auth + PostgreSQL', '로그인·역할·체험 데이터\nRLS가 행 접근을 제한', { fill: C.paleTeal, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  text(s, 339, 280, 42, 30, '↔', { size: 25, color: C.teal, bold: true, align: 'center' });
  boxText(s, 92, 386, 240, 104, 'Storage + Kakao Maps', '체험 이미지와 주소 기반\n지도·길찾기', { fill: C.gray, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 394, 386, 348, 104, 'Edge Function: AI Agent', 'HOST 권한 확인 → 도구 실행\n→ Codyssey COPA', { fill: C.paleGold, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 856, 174, 360, 160, '팀의 다른 영역', '일정·검색 등은 Express API와\nOracle을 사용합니다.\n로컬이음의 체험·HOST DB는\nSupabase PostgreSQL입니다.', { fill: C.white, accent: C.coral, titleH: 30, bodyY: 62, bodySize: 17 });
  boxText(s, 856, 358, 360, 176, '연동 접점', '공통 Header → 로컬 체험 경로\n공통 React 라우터\n\n아직 별도 확인이 필요한 영역:\n팀 인증 연계 · 통합 배포 주소', { fill: C.white, accent: C.blue, titleH: 30, bodyY: 62, bodySize: 16 });
  text(s, 64, 568, 1120, 54, '설계 선택  ·  기존 팀 앱의 화면·라우팅을 재사용하면서, 체험 운영 데이터는 전용 Supabase 스키마와 RLS로 관리', { size: 19, bold: true, color: C.ink, align: 'center' });
  notes(s, '실제 연결: src/App.jsx, src/components/header.jsx; Supabase client src/pages/local-eum/... 및 supabase/functions/local-eum-agent/index.ts. DB는 Supabase 프로젝트 local-eum-dev입니다. Codyssey API 비밀키는 Edge Function secret로만 관리됩니다. 팀 Oracle은 다른 영역이며 로컬이음이 대체하지 않습니다.');
}
// 7 — AI agent
{
  const s = base('AI는 답변기가 아니라, 검증된 도구를 순서대로 호출하는 보조자', 'AI EXPERIENCE AGENT', 7);
  const steps = [
    ['1', 'HOST 요청', '현재 체험 분석\n또는 아이디어'],
    ['2', 'Edge 검증', 'JWT · HOST 역할\n소유권 · 입력'],
    ['3', 'JSON 인자', '모델은 허용 도구의\n인자만 제안'],
    ['4', '서버 도구', '검색 · RAG · 평가\n비용 계산'],
    ['5', '결과 검토', '근거·위험 표시\nHOST가 편집·저장'],
  ];
  steps.forEach((step, i) => {
    const x = 64 + i * 235;
    shape(s, x, 190, 202, 174, i === 4 ? C.paleTeal : C.white, C.line, 16);
    pill(s, x + 18, 208, 36, step[0], i === 4 ? C.teal : C.navy, C.white);
    text(s, x + 18, 256, 166, 29, step[1], { size: 19, color: C.navy, bold: true });
    text(s, x + 18, 296, 166, 55, step[2], { size: 16, color: C.muted });
    if (i < 4) text(s, x + 205, 262, 26, 28, '→', { size: 22, color: C.teal, bold: true });
  });
  boxText(s, 64, 400, 548, 166, '구현된 도구 4개', '공개 체험 검색 · 지역 자료 검색(RAG)\n5개 가치 기준 평가 · 운영비 산식 계산\n출처 ID와 결과 형식을 Edge에서 검증', { fill: C.white, accent: C.blue, titleH: 30, bodyY: 63, bodySize: 17 });
  boxText(s, 636, 400, 580, 166, '중요한 기술 경계', 'COPA 네이티브 Tool Calling 사용 아님.\n일반 채팅으로 JSON 인자를 받아 허용 목록으로 실행.\n테스트 16개는 모의 모델 검증이며 비용·품질 보증은 아님.', { fill: C.paleCoral, accent: C.coral, titleH: 30, bodyY: 63, bodySize: 17 });
  text(s, 64, 592, 1120, 42, '자동 저장·확정 금지  →  HOST가 결과를 검토하고 편집란으로 복사한 뒤 별도 저장', { size: 19, color: C.navy, bold: true, align: 'center' });
  notes(s, '코드 근거: supabase/functions/local-eum-agent/agent-core.mjs와 codyssey-client.mjs. Adapter는 COPA Chat Completions의 JSON 응답을 정해진 함수 인자로 변환하고, Edge가 서버 도구를 실행합니다. 모델이 SQL/도구를 직접 실행하지 않습니다. 화면 AiExperienceAgent.jsx에서는 검토 체크 후 소개란에 복사, 저장은 일반 HOST 폼에서 별도로 합니다. Deno tests는 16개 통과했던 PR #13 검증 기록이며, 현재 이 문서 작업 중 유료 AI 호출을 수행하지 않았습니다.');
}
// 8 — Multilingual + maps
{
  const s = base('화면 언어, 번역 검수, 실제 진행 언어는 서로 다릅니다', 'LANGUAGE & PLACE', 8);
  const rows = [
    ['화면 전환', 'ko / en / ja', '인터페이스 언어'],
    ['콘텐츠 번역', '영·일 초안', '검수 상태 DRAFT'],
    ['진행 가능 언어', 'HOST 확인값', '실제 안내 가능 여부'],
  ];
  rows.forEach((r, i) => {
    const y = 180 + i * 86;
    shape(s, 64, y, 650, 68, i === 2 ? C.paleTeal : C.white, C.line, 13);
    text(s, 82, y + 20, 176, 28, r[0], { size: 18, color: C.navy, bold: true });
    text(s, 270, y + 20, 184, 28, r[1], { size: 18, color: C.blue, bold: true });
    text(s, 470, y + 20, 222, 28, r[2], { size: 16, color: C.muted });
  });
  boxText(s, 760, 180, 456, 154, '주소 기반 지도', '확인된 주소를 보여주고\nKakao Maps에서 주소를 검색합니다.\n좌표는 임의 생성·DB 저장하지 않음.', { fill: C.white, accent: C.teal, titleH: 30, bodyY: 62, bodySize: 17 });
  boxText(s, 760, 356, 456, 154, '운영 전 과제', '번역 초안의 원어민 검수\n호스트별 실제 진행 언어 확인\n주소·집결 장소와 상업 이용 승인', { fill: C.paleGold, accent: C.gold, titleH: 30, bodyY: 62, bodySize: 17 });
  shape(s, 64, 480, 650, 94, C.paleBlue, 'none', 15);
  text(s, 86, 501, 604, 56, '3개 언어·친구 체험의 `available_languages`는\n원격 조회 시 모두 빈 배열로 확인', { size: 19, color: C.ink, bold: true });
  text(s, 64, 602, 1152, 28, '다국어 표시가 가능하다는 것과 외국어로 안전하게 운영할 수 있다는 것은 다른 검증입니다.', { size: 18, color: C.navy, bold: true, align: 'center' });
  notes(s, '원격 read-only 조회에서 #113–#115의 available_languages cardinality 0. 코드 근거: localEumI18n.js, experiencePresentation.js, maps/PlaceMap.jsx. DB 번역 적용 기록은 README와 migrations에 있으며, 이번 작업의 수치는 2026-10-20 DB 조회로 확인했습니다.');
}
// 9 — Progress
{
  const s = base('기능은 연결되고 있지만, 테스트 범위와 운영 증거를 나눠 봅니다', 'PROGRESS & EVIDENCE', 9);
  const items = [
    ['화면·데이터', '공개 목록·상세·신청·호스트 공간', '코드 + 실제 로컬 화면'],
    ['DB 운영', '2 HOST · 15 체험 · 19 회차', '2026-10-20 read-only 조회'],
    ['AI Agent', '4 도구 · JSON adapter · HOST 검토', '코드 + 모의 테스트 16개'],
    ['협업', 'PR #13 병합', 'main 커밋에서 확인'],
  ];
  items.forEach((it, i) => {
    const y = 174 + i * 86;
    shape(s, 64, y, 1152, 68, C.white, C.line, 13);
    text(s, 84, y + 18, 186, 30, it[0], { size: 18, color: C.navy, bold: true });
    text(s, 278, y + 18, 524, 30, it[1], { size: 18, color: C.ink });
    pill(s, 862, y + 17, 326, it[2], i === 1 ? C.paleTeal : C.paleBlue, i === 1 ? '#126B6B' : C.navy);
  });
  shape(s, 64, 548, 1152, 78, C.paleCoral, 'none', 14);
  text(s, 84, 566, 1110, 46, '테스트 통과 ≠ 실서비스 보증  ·  실 사용자 5명 평가와 피드백 반영은 아직 완료 증거가 없습니다.', { size: 20, color: '#9A3C32', bold: true, align: 'center' });
  notes(s, 'main HEAD는 79374c262707e71440767f483d928e248e7a0d19이며 커밋 제목에 PR #13이 표시됩니다. PR13 검증 기록은 Local Eum node tests 56개, AI Edge Deno tests 16개, build/lint pass with existing warnings. Team regression 48/49 pass; existing failure `trendingPlaceDetails.test.js`는 로컬이음 변경이 없는 팀 파일로 기록됨. 이 검증은 현 브랜치에서 재실행 예정입니다. 실사용자 5명 테스트/피드백 반영은 미완료.');
}
// 10 — Risks
{
  const s = base('운영으로 넘어가기 전에 해결할 6가지 리스크', 'OPEN RISKS', 10);
  const risks = [
    ['가격·가치', 'Busan 표기 0원. 무료/실비/가격가설 의도를 결정하고 호스트 확인'],
    ['진행 언어', '3개 체험 모두 HOST 언어 확인 필요'],
    ['호스트 권한', '회차 생성·취소 일부 검증 기록; 교차 HOST·ADMIN 전체 검증은 제한적'],
    ['결제', '시연 안내만. 실제 결제·환불·정산 없음'],
    ['AI 신뢰성', '지역 corpus 규모·근거 최신성·가격 근거를 사람 검토 필요'],
    ['출시 증거', '외부 사용자 5명 이상 테스트와 사용 피드백 미완료'],
  ];
  risks.forEach((r, i) => {
    const x = 64 + (i % 2) * 576;
    const y = 174 + Math.floor(i / 2) * 132;
    boxText(s, x, y, 548, 110, r[0], r[1], { fill: i === 0 || i === 2 ? C.paleCoral : C.white, accent: i === 0 || i === 2 ? C.coral : C.blue, titleH: 28, bodyY: 53, bodySize: 16 });
  });
  text(s, 64, 594, 1152, 36, '우선순위 제안  ·  체험 가치·가격·호스트 운영 조건을 작은 사용자 테스트로 먼저 확인', { size: 19, color: C.navy, bold: true, align: 'center' });
  notes(s, '호스트 실 조작의 경계는 docs/local-eum/migrations/20261020_language_friends_and_host_lifecycle.applied.md 및 docs/local-eum/host-operations-guide.md를 참조하십시오. 기존 기록은 HOST #500 테스트 전용 회차 생성·취소를 확인했고, HOST #501 접근 차단은 RLS 결과를 확인하되 직접 JWT 브라우저 조작은 완전히 검증하지 못했다고 기록합니다. ADMIN 실조작은 미검증입니다. Busan 0원은 fee_amount 표시 값이며 결제 모듈이 없습니다.');
}
// 11 — Questions
{
  const s = base('멘토에게 받고 싶은 판단: 지금 무엇부터 증명할까?', 'MENTOR QUESTIONS', 11, true);
  const qs = [
    ['01', '고객 가치·가격', '장소 방문을 넘어 돈을 지불할 이유를 어떤 테스트로 검증할까요?'],
    ['02', '운영의 최소 조건', 'HOST 2명·시범 3개 중 어떤 운영조건을 먼저 실제로 확인할까요?'],
    ['03', 'Agent 구조', '현재 JSON 도구 어댑터를 유지할까요, 실험 기준을 정해 다른 구조와 비교할까요?'],
    ['04', 'RAG 범위', '출처·확인일·지역 커버리지를 어떤 기준으로 늘리고 품질을 평가할까요?'],
    ['05', '팀 통합', 'HOST 로그인·라우팅·공통 배포에서 팀 인증과 Supabase 역할을 어떻게 연결할까요?'],
  ];
  qs.forEach((q, i) => {
    const y = 170 + i * 88;
    pill(s, 64, y + 3, 52, q[0], i === 0 ? C.coral : '#29425A', C.white);
    text(s, 142, y, 230, 30, q[1], { size: 19, color: '#73D1CC', bold: true });
    text(s, 374, y, 820, 54, q[2], { size: 18, color: C.white });
  });
  text(s, 64, 625, 1152, 28, '오늘 결정할 것  ·  다음 2주 MVP의 검증 대상 하나와 측정 기준 하나', { size: 20, color: C.white, bold: true, align: 'center' });
  notes(s, '질문은 현재 근거의 빈칸과 결정 대안을 연결하도록 구성했습니다. 특히 AI 기술 진화보다 먼저 고객이 실제로 지불할 경험인지 검증하는 것이 사업·개발 우선순위의 핵심 판단입니다.');
}
// 12 — Next plan
{
  const s = base('다음 단계는 기능 추가보다 작게 검증하고 정리하기', 'NEXT 2–4 WEEKS', 12);
  const phases = [
    ['1', '운영 사실 확인', '호스트 진행 언어·회비·장소\n회차 취소·신청 흐름 확인', C.paleCoral],
    ['2', '5명 사용자 테스트', '여행자 과제·소요 시간·혼동\n피드백 1건 이상 반영', C.paleBlue],
    ['3', 'Agent 평가 기준', '4 도구의 근거·오답·비용\n실행 여부와 품질 분리 측정', C.paleTeal],
    ['4', '출시·팀 연동 결정', '공통 배포·인증 접점 확정\n재검증 후 데모 공유', C.paleGold],
  ];
  phases.forEach((p, i) => {
    const x = 64 + i * 288;
    shape(s, x, 190, 254, 226, p[3], 'none', 17);
    pill(s, x + 20, 208, 38, p[0], C.navy, C.white);
    text(s, x + 20, 267, 214, 36, p[1], { size: 19, color: C.navy, bold: true });
    text(s, x + 20, 320, 214, 74, p[2], { size: 17, color: C.ink });
  });
  shape(s, 64, 466, 1152, 120, C.navy, 'none', 17);
  text(s, 92, 488, 1090, 34, '멘토링에서 합의할 산출물', { size: 20, color: '#73D1CC', bold: true });
  text(s, 92, 531, 1090, 34, '검증할 가설 1개  ·  성공 기준 1개  ·  다음 단계와 제외할 범위', { size: 24, color: C.white, bold: true });
  text(s, 64, 610, 1120, 28, 'LOCAL EUM  ·  지역의 경험이 여행자의 기억과 호스트의 지속 가능한 운영으로 이어지는지 확인합니다.', { size: 16, color: C.muted, align: 'center' });
  notes(s, '4단계는 제안이지 현재 완료된 계획 승인 사항이 아닙니다. 멘토링에서 한정된 캡스톤 기간에 필요한 목표·측정치·제외 범위를 정합니다.');
}

for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(privateDir, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
const candidatePath = path.join(privateDir, 'candidate.pptx');
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(path.join(REPO, '.codex-finalizer'), { recursive: true });
const result = await finalizePresentation({
  explicitTotalSlideCount: 12,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir: REPO,
  candidatePath,
  finalPath,
  pythonExecutable: 'C:/Users/UserK/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  fontPolicy: { basis: 'design', families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(REPO, '.codex-finalizer', 'LOCAL_EUM_MENTORING.validation.json'),
});
console.log(JSON.stringify({ finalPath, slideCount: deck.slides.items.length, finalizer: result }, null, 2));
