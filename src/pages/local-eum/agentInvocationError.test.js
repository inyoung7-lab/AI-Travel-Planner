import test from 'node:test';
import assert from 'node:assert/strict';
import { agentInvocationErrorMessage, classifyAgentInvocationError, readAgentInvocationErrorMessage } from './agentInvocationError.js';

test('classifies missing function, authorization, rate limit, server and browser fetch failures', () => {
  assert.equal(classifyAgentInvocationError({ context: { status: 404 } }), 'FUNCTION_NOT_DEPLOYED');
  assert.equal(classifyAgentInvocationError({ context: { status: 403 } }), 'AUTH_REQUIRED');
  assert.equal(classifyAgentInvocationError({ context: { status: 429 } }), 'RATE_LIMIT');
  assert.equal(classifyAgentInvocationError({ context: { status: 503 } }), 'SERVER_FAILURE');
  assert.equal(classifyAgentInvocationError({ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }), 'ORIGIN_OR_NETWORK');
  assert.equal(classifyAgentInvocationError(new Error('unknown')), 'UNKNOWN');
});

test('returns localized safe error copy without exposing server response contents', () => {
  const unsafe = { context: { status: 500 }, message: 'Bearer super-secret-token', body: 'private applicant data' };
  const message = agentInvocationErrorMessage(unsafe, 'ko');
  assert.match(message, /함수 로그/);
  assert.doesNotMatch(message, /super-secret|private applicant data/);
  assert.match(agentInvocationErrorMessage({ context: { status: 404 } }, 'en'), /not find local-eum-agent/);
  assert.match(agentInvocationErrorMessage({ context: { status: 404 } }, 'ja'), /local-eum-agent/);
});

test('reads allowlisted function codes without consuming the original response or leaking its message', async () => {
  const cases = [
    [503, 'CONFIG', 'SERVER_CONFIG'], [502, 'DATABASE', 'DATABASE'], [422, 'AGENT_LIMIT', 'ANALYSIS_LIMIT'],
    [403, 'FORBIDDEN', 'HOST_PERMISSION'], [403, 'ORIGIN_DENIED', 'ORIGIN_OR_NETWORK'],
    [401, 'UNAUTHORIZED', 'AUTH_REQUIRED'], [429, 'RATE_LIMIT', 'RATE_LIMIT'],
    [400, 'BAD_REQUEST', 'BAD_REQUEST'], [400, 'TOOL_ARGUMENT', 'MODEL_OUTPUT'],
    [502, 'MODEL_OUTPUT', 'MODEL_OUTPUT'], [502, 'MODEL_TOOL', 'MODEL_OUTPUT'],
    [502, 'MODEL_UNAVAILABLE', 'UPSTREAM_FAILURE'],
  ];
  for (const [status, code, kind] of cases) {
    const context = new Response(JSON.stringify({ code, error: 'private-server-details' }), { status });
    const error = { context };
    assert.equal(classifyAgentInvocationError(error, code), kind);
    for (const locale of ['ko', 'en', 'ja']) {
      const message = await readAgentInvocationErrorMessage(error, locale);
      assert.equal(message, agentInvocationErrorMessage(error, locale, code));
      assert.doesNotMatch(message, /private-server-details/);
    }
    assert.equal(context.bodyUsed, false);
  }
});

test('malformed, unknown and absent server responses fall back safely', async () => {
  for (const content of ['<html>private</html>', '{"code":"__proto__","error":"private"}', '{"code":"NEW_CODE"}']) {
    const error = { context: new Response(content, { status: 502 }) };
    assert.equal(await readAgentInvocationErrorMessage(error), agentInvocationErrorMessage(error));
  }
  assert.equal(await readAgentInvocationErrorMessage(new Error('private')), agentInvocationErrorMessage(new Error()));
});
