import assert from 'node:assert/strict';
import test from 'node:test';
import { createCodysseyModelCall } from './codyssey-client.mjs';

test('Codyssey adapter lets plain chat select among tools and maps the chosen action', async () => {
  let captured;
  const call = createCodysseyModelCall({ apiKey: 'test-only-secret', model: 'gpt-5.4-mini', fetchImpl: async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"action":"tool","tool":"retrieve_local_knowledge","arguments":{"query":"Masan","region":"CHANGWON"},"reason":"Need regional source evidence."}' } }] }) };
  } });
  const response = await call({
    input: [
      { role: 'system', content: 'system' },
      { role: 'user', content: 'request' },
      { type: 'function_call', name: 'search_existing_experiences', call_id: 'call-1', arguments: '{"query":"market"}' },
      { type: 'function_call_output', call_id: 'call-1', output: '{"experiences":[]}' },
    ],
    tools: [{ type: 'function', name: 'search_existing_experiences', parameters: { type: 'object' } }, { type: 'function', name: 'retrieve_local_knowledge', parameters: { type: 'object', properties: { query: { type: 'string' }, region: { type: ['string', 'null'] } }, required: ['query', 'region'] } }],
    tool_choice: 'auto',
    max_output_tokens: 900,
  });
  assert.equal(captured.url, 'https://copa.codyssey.kr/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-only-secret');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.model, 'gpt-5.4-mini');
  assert.deepEqual(Object.keys(body).sort(), ['max_completion_tokens', 'messages', 'model']);
  assert.equal(body.max_completion_tokens, 900);
  assert.match(body.messages.at(-1).content, /retrieve_local_knowledge/);
  assert.match(body.messages.at(-1).content, /search_existing_experiences/);
  assert.match(body.messages.at(-1).content, /finish/);
  assert.match(body.messages[2].content, /search_existing_experiences/);
  assert.match(body.messages[3].content, /Verified tool result/);
  assert.equal(response.output[0].type, 'function_call');
  assert.equal(response.output[0].name, 'retrieve_local_knowledge');
  assert.equal(response.output[0].reason, 'Need regional source evidence.');
  assert.deepEqual(JSON.parse(response.output[0].arguments), { query: 'Masan', region: 'CHANGWON' });
});

test('Codyssey adapter recognizes explicit finish without fabricating a tool call', async () => {
  const call = createCodysseyModelCall({ apiKey: 'test-only-secret', fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"action":"finish","reason":"Sufficient evidence and calculations."}' } }] })) });
  const result = await call({ input: [], tools: [], tool_choice: 'auto' });
  assert.deepEqual(result.output, []);
  assert.equal(result.decision.action, 'finish');
});

test('Codyssey adapter rejects unknown tools, malformed decisions and ambiguous finish actions', async () => {
  for (const decision of [
    { action: 'tool', tool: 'delete_experience', arguments: {}, reason: 'Delete' },
    { action: 'tool', tool: 'search_existing_experiences', arguments: [], reason: 'Search' },
    { action: 'tool', tool: 'search_existing_experiences', arguments: {}, reason: '' },
    { action: 'finish', tool: 'search_existing_experiences', arguments: {}, reason: 'Done' },
    { action: 'tool', tool: 'search_existing_experiences', arguments: {}, reason: 'x'.repeat(241) },
    { action: 'something_else', reason: 'Done' },
  ]) {
    const call = createCodysseyModelCall({ apiKey: 'test-only-secret', fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(decision) } }] })) });
    await assert.rejects(call({ input: [], tools: [{ name: 'search_existing_experiences' }], tool_choice: 'auto' }), error => error.code === 'MODEL_TOOL');
  }
});

test('Codyssey adapter accepts a JSON report from plain chat', async () => {
  let body;
  const call = createCodysseyModelCall({ apiKey: 'test-only-secret', fetchImpl: async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: '```json\n{"ok":true}\n```' } }] }) };
  } });
  const result = await call({ input: [{ role: 'user', content: 'report' }], tool_choice: 'none', text: { format: { type: 'json_schema', schema: { type: 'object' } } } });
  assert.deepEqual(Object.keys(body).sort(), ['messages', 'model']);
  assert.match(body.messages.at(-1).content, /JSON object/);
  assert.equal(result.output_text, '{"ok":true}');
});

test('Codyssey adapter rejects malformed model JSON', async () => {
  const call = createCodysseyModelCall({ apiKey: 'test-only-secret', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'No JSON' } }] }) }) });
  await assert.rejects(call({ input: [] }), (error) => error.code === 'MODEL_OUTPUT');
});

test('Codyssey adapter masks upstream error body', async () => {
  const call = createCodysseyModelCall({ apiKey: 'test-only-secret', fetchImpl: async () => new Response('do not expose', { status: 429 }) });
  await assert.rejects(call({ input: [] }), (error) => error.code === 'MODEL_UNAVAILABLE' && !error.message.includes('do not expose'));
});

test('Codyssey adapter requires a server-side API key', () => {
  assert.throws(() => createCodysseyModelCall({ apiKey: '', model: 'gpt-5.4-mini' }), (error) => error.code === 'CONFIG');
});
