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
const validatedPath = path.join(privateDir, `validated-LOCAL_EUM_MENTORING-${Date.now()}.pptx`);
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
  text(slide, 64, 680, 520, 20, 'LOCAL EUM  ·  기획과 구현  ·  2026.10', { size: 12, color });
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
  const s = base('관광지에서 사람으로, 정보에서 경험으로', 'LOCAL EXPERIENCE PROJECT', 1, true);
  text(s, 64, 190, 590, 90, '여행, 한걸음', { size: 56, color: C.white, bold: true });
  text(s, 64, 283, 590, 48, 'LOCAL EUM', { size: 31, color: '#73D1CC', bold: true });
  text(s, 64, 350, 535, 88, '여행에서 만남으로,\n만남에서 새로운 경험으로', { size: 28, color: C.white, bold: true });
  text(s, 64, 463, 535, 90, '지역 주민의 이야기와 관심사를 여행자와 연결해,\n평범한 일상을 함께하는 체험으로 만듭니다.', { size: 19, color: '#C7D6E2' });
  await addImage(s, 'catalog.png', 690, 184, 526, 330, '2026-10-20 로컬이음 실제 체험 목록 화면 캡처');
  pill(s, 690, 532, 182, '실제 UI 캡처', '#D5F2EE', '#126B6B');
  text(s, 64, 600, 1100, 30, '지역의 일상이 여행자의 기억이 되는 경험을 만듭니다.', { size: 18, color: '#D8E5ED' });
  notes(s, '로컬이음은 지역 주민과 여행자가 함께하는 경험을 연결하기 위해 기획했습니다. 화면 캡처는 2026-10-20 로컬 개발 앱에서 직접 취득했습니다. 주요 근거: docs/local-eum/README.md, src/App.jsx.');
}
// 2 — Problem and value
{
  const s = base('지역 주민의 이야기가 여행의 경험이 됩니다', 'WHY LOCAL EUM', 2);
  boxText(s, 64, 176, 530, 230, '여행자에게', '방문 장소와 명소 정보는 많지만,\n지역 주민과 일상을 함께하는 경험은\n쉽게 찾기 어렵습니다.', { fill: C.white, accent: C.blue, bodySize: 20 });
  boxText(s, 622, 176, 594, 230, '지역 호스트에게', '지역 주민의 이야기와 관심사를\n여행 경험으로 소개하고 운영할 수 있는\n프로그램과 도구가 필요합니다.', { fill: C.white, accent: C.teal, bodySize: 20 });
  shape(s, 64, 435, 1152, 154, C.paleCoral, 'none', 18);
  text(s, 92, 460, 280, 34, '로컬이음의 역할', { size: 18, color: C.coral, bold: true });
  text(s, 92, 500, 1050, 62, '여행자와 지역 주민을 연결해\n평범한 지역의 일상을 함께하는 체험으로 만듭니다.', { size: 24, color: C.navy, bold: true });
  notes(s, '서비스 기획은 관광 정보 탐색에서 지역 주민과 함께하는 경험으로 초점을 넓히는 데서 출발했습니다. 시장 규모와 지불 의사는 향후 사용자 조사로 확인할 영역입니다.');
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
  const s = base('여행자 화면과 호스트 운영을 Supabase로 연결', 'LOCAL EUM ARCHITECTURE', 6);
  shape(s, 64, 174, 750, 360, C.white, C.line, 18);
  text(s, 88, 193, 700, 28, '여행자·HOST 브라우저', { size: 20, color: C.navy, bold: true, align: 'center' });
  boxText(s, 92, 244, 240, 104, 'React + Vite', '공통 Header / App 라우터\n/local-eum 화면', { fill: C.paleBlue, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 394, 244, 348, 104, 'Supabase Auth + PostgreSQL', '로그인·역할·체험 데이터\nRLS가 행 접근을 제한', { fill: C.paleTeal, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  text(s, 339, 280, 42, 30, '↔', { size: 25, color: C.teal, bold: true, align: 'center' });
  boxText(s, 92, 386, 240, 104, 'Storage + Kakao Maps', '체험 이미지와 주소 기반\n지도·길찾기', { fill: C.gray, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 394, 386, 348, 104, 'Edge Function: AI Agent', 'HOST 권한 확인 → 도구 실행\n→ Codyssey COPA', { fill: C.paleGold, titleH: 26, bodyY: 54, bodySize: 16, line: 'none' });
  boxText(s, 856, 174, 360, 160, '체험 운영 데이터', '체험 소개와 단계별 일정\n모집 회차와 신청 정보\n호스트 역할에 따른 접근 제한', { fill: C.white, accent: C.coral, titleH: 30, bodyY: 62, bodySize: 17 });
  boxText(s, 856, 358, 360, 176, 'AI 기획 지원', '지역 자료와 체험 정보를 바탕으로\n운영 아이디어를 제안합니다.\n\n호스트가 검토하고 편집한 뒤\n기존 프로필에 저장합니다.', { fill: C.white, accent: C.blue, titleH: 30, bodyY: 62, bodySize: 16 });
  text(s, 64, 568, 1120, 54, '서비스 흐름  ·  여행자는 체험을 찾고 신청하며 호스트는 회차와 참가자를 관리합니다.', { size: 19, bold: true, color: C.ink, align: 'center' });
  notes(s, '로컬이음의 프런트엔드와 데이터 계층은 React/Vite와 Supabase로 구성했습니다. DB는 Supabase PostgreSQL이며 Auth, RLS, Storage, Edge Function을 사용합니다. Codyssey API 비밀키는 Edge Function secret로만 관리됩니다.');
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
    ['시범 체험', '서울·부산·창원 언어·친구 3건', 'Supabase 조회 + 앱 화면'],
  ];
  items.forEach((it, i) => {
    const y = 174 + i * 86;
    shape(s, 64, y, 1152, 68, C.white, C.line, 13);
    text(s, 84, y + 18, 186, 30, it[0], { size: 18, color: C.navy, bold: true });
    text(s, 278, y + 18, 524, 30, it[1], { size: 18, color: C.ink });
    pill(s, 862, y + 17, 326, it[2], i === 1 ? C.paleTeal : C.paleBlue, i === 1 ? '#126B6B' : C.navy);
  });
  shape(s, 64, 548, 1152, 78, C.paleCoral, 'none', 14);
  text(s, 84, 566, 1110, 46, '구현과 테스트 결과를 실제 운영 검증과 구분합니다. 실 사용자 평가와 피드백 반영은 진행 전입니다.', { size: 19, color: '#9A3C32', bold: true, align: 'center' });
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
  text(s, 64, 594, 1152, 36, '개발 방향  ·  체험 가치와 호스트 운영 조건을 작은 사용자 테스트로 확인', { size: 19, color: C.navy, bold: true, align: 'center' });
  notes(s, '호스트 실 조작의 경계는 docs/local-eum/migrations/20261020_language_friends_and_host_lifecycle.applied.md 및 docs/local-eum/host-operations-guide.md를 참조하십시오. 기존 기록은 HOST #500 테스트 전용 회차 생성·취소를 확인했고, HOST #501 접근 차단은 RLS 결과를 확인하되 직접 JWT 브라우저 조작은 완전히 검증하지 못했다고 기록합니다. ADMIN 실조작은 미검증입니다. Busan 0원은 fee_amount 표시 값이며 결제 모듈이 없습니다.');
}
// 11 — Product intention
{
  const s = base('관광지에서 사람으로, 정보에서 경험으로', 'LOCAL EUM’S INTENTION', 11, true);
  text(s, 64, 174, 1152, 124, '기존 여행 서비스가 주로 어디를 방문하고 무엇을 볼 것인지에 집중한다면, 로컬이음은 그곳에서 누구를 만나고 무엇을 함께 경험할 수 있는가라는 질문에서 출발했습니다.', { size: 22, color: C.white, lineSpacing: 1.18 });
  shape(s, 64, 318, 56, 4, '#73D1CC', 'none', 2);
  text(s, 64, 348, 1152, 124, '국내외 여행자가 지역 주민과 시장을 걷고, 음식을 나누고, 언어와 문화를 교류하며 평범한 일상 속에서 특별한 경험을 발견하도록 연결하는 서비스입니다.', { size: 22, color: C.white, lineSpacing: 1.18 });
  text(s, 64, 490, 1152, 82, '지역 주민은 단순한 관광 안내자가 아니라 자신이 가진 이야기와 관심사로 여행 경험을 만드는 호스트가 됩니다.', { size: 22, color: '#C7D6E2', lineSpacing: 1.18 });
  text(s, 64, 608, 1152, 38, '“여행에서 만남으로, 만남에서 새로운 경험으로.”', { size: 25, color: '#73D1CC', bold: true, align: 'center' });
  notes(s, '기획 의도는 장소 정보를 나열하는 여행에서 지역 주민과 함께 일상을 경험하는 여행으로 확장하는 것입니다. 호스트는 자신의 이야기와 관심사를 체험으로 구성하는 주체입니다.');
}
// 12 — Next plan
{
  const s = base('로컬이음의 다음 개발 방향', 'NEXT 2–4 WEEKS', 12);
  const phases = [
    ['1', '운영 사실 확인', '호스트 진행 언어·회비·장소\n회차 취소·신청 흐름 확인', C.paleCoral],
    ['2', '5명 사용자 테스트', '여행자 과제·소요 시간·혼동\n피드백 1건 이상 반영', C.paleBlue],
    ['3', 'Agent 평가 기준', '4 도구의 근거·오답·비용\n실행 여부와 품질 분리 측정', C.paleTeal],
    ['4', '공개 운영 준비', '장소·안내 정보 확인\n시연 데이터 운영 전환 검토', C.paleGold],
  ];
  phases.forEach((p, i) => {
    const x = 64 + i * 288;
    shape(s, x, 190, 254, 226, p[3], 'none', 17);
    pill(s, x + 20, 208, 38, p[0], C.navy, C.white);
    text(s, x + 20, 267, 214, 36, p[1], { size: 19, color: C.navy, bold: true });
    text(s, x + 20, 320, 214, 74, p[2], { size: 17, color: C.ink });
  });
  shape(s, 64, 466, 1152, 120, C.navy, 'none', 17);
  text(s, 92, 488, 1090, 34, '기획 의도를 이어갈 개발 방향', { size: 20, color: '#73D1CC', bold: true });
  text(s, 92, 531, 1090, 58, '호스트가 운영하고 여행자가 만족하는 체험을 위해\n운영 조건과 사용자 반응을 단계적으로 확인합니다.', { size: 22, color: C.white, bold: true });
  text(s, 64, 610, 1120, 28, '지역의 일상과 호스트의 이야기가 여행자의 기억으로 이어지는 서비스로 발전시킵니다.', { size: 16, color: C.muted, align: 'center' });
  notes(s, '다음 개발 단계는 호스트 운영 조건, 여행자 이용 경험, Agent 제안 품질을 순서대로 확인하는 것입니다. 각 항목은 실제 운영과 사용자 테스트를 통해 개선합니다.');
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
  finalPath: validatedPath,
  pythonExecutable: 'C:/Users/UserK/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  fontPolicy: { basis: 'design', families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(REPO, '.codex-finalizer', `LOCAL_EUM_MENTORING-${Date.now()}.validation.json`),
});
await fs.copyFile(validatedPath, finalPath);
console.log(JSON.stringify({ finalPath, slideCount: deck.slides.items.length, finalizer: result }, null, 2));
