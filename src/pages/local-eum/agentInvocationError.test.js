import test from 'node:test';
import assert from 'node:assert/strict';
import { agentInvocationErrorMessage, classifyAgentInvocationError, readPromptInjectionMessage } from './agentInvocationError.js';

test('classifies missing function, authorization, rate limit, server and browser fetch failures', () => {
  assert.equal(classifyAgentInvocationError({ context: { status: 404 } }), 'FUNCTION_NOT_DEPLOYED');
  assert.equal(classifyAgentInvocationError({ context: { status: 403 } }), 'AUTH_REQUIRED');
  assert.equal(classifyAgentInvocationError({ context: { status: 429 } }), 'UPSTREAM_FAILURE');
  assert.equal(classifyAgentInvocationError({ context: { status: 503 } }), 'UPSTREAM_FAILURE');
  assert.equal(classifyAgentInvocationError({ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }), 'ORIGIN_OR_NETWORK');
  assert.equal(classifyAgentInvocationError(new Error('unknown')), 'UNKNOWN');
});

test('returns localized safe error copy without exposing server response contents', () => {
  const unsafe = { context: { status: 500 }, message: 'Bearer super-secret-token', body: 'private applicant data' };
  const message = agentInvocationErrorMessage(unsafe, 'ko');
  assert.match(message, /Codyssey API/);
  assert.doesNotMatch(message, /super-secret|private applicant data/);
  assert.match(agentInvocationErrorMessage({ context: { status: 404 } }, 'en'), /not find local-eum-agent/);
  assert.match(agentInvocationErrorMessage({ context: { status: 404 } }, 'ja'), /local-eum-agent/);
});

test('reads only the known prompt injection rejection and localizes it', async () => {
  const injection = { context: new Response(JSON.stringify({ code: 'PROMPT_INJECTION', error: 'server detail' }), { status: 400 }) };
  assert.match(await readPromptInjectionMessage(injection, 'ko'), /분석을 중단했습니다/);
  assert.match(await readPromptInjectionMessage(injection, 'en'), /Analysis stopped/);
  assert.match(await readPromptInjectionMessage(injection, 'ja'), /分析を中止/);
  assert.equal(await readPromptInjectionMessage({ context: new Response(JSON.stringify({ code: 'BAD_REQUEST' }), { status: 400 }) }), null);
  assert.equal(await readPromptInjectionMessage({ context: { status: 400 } }), null);
});
