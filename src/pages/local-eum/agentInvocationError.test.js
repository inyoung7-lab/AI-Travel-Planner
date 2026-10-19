import test from 'node:test';
import assert from 'node:assert/strict';
import { agentInvocationErrorMessage, classifyAgentInvocationError } from './agentInvocationError.js';

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
