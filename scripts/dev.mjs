import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}

function start(args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); stop(code ?? 1); });
  return child;
}

async function apiReady() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(500) });
    return response.ok && (await response.json()).status === 'ok';
  } catch { return false; }
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

if (await apiReady()) {
  console.log('이미 실행 중인 API 서버를 사용합니다: http://localhost:3000');
} else {
  start(['--watch', 'server/server.js'], { ...process.env, PORT: '3000' });
  const deadline = Date.now() + 15000;
  while (!stopping && Date.now() < deadline && !(await apiReady())) await delay(150);
  if (!stopping && !(await apiReady())) {
    console.error('API 서버를 시작하지 못했습니다. 위 오류와 3000번 포트를 확인해 주세요.');
    stop(1);
  }
}

if (!stopping) start([fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), ...process.argv.slice(2)]);
