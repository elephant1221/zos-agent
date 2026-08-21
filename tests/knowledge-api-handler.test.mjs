import test from 'node:test';
import assert from 'node:assert/strict';

import { createKnowledgeApiHandler } from '../supabase/functions/knowledge-api/handler.ts';

const API_KEY = 'synthetic-public-action-key';

function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('X-ZOS-Knowledge-Key')) headers.set('X-ZOS-Knowledge-Key', API_KEY);
  return new Request(`https://example.supabase.co/functions/v1/knowledge-api${path}`, {
    ...init,
    headers,
  });
}

function configuredHandler(rpc) {
  return createKnowledgeApiHandler({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    publicApiKey: API_KEY,
    rpc,
    logError: () => {},
  });
}

test('returns 503 for missing server configuration and 401 for a wrong public key', async () => {
  const unconfigured = createKnowledgeApiHandler({
    supabaseUrl: '',
    serviceRoleKey: '',
    publicApiKey: '',
    rpc: async () => ({ data: null, error: null }),
  });
  assert.equal((await unconfigured(request('?action=health'))).status, 503);

  const configured = configuredHandler(async () => ({ data: null, error: null }));
  const unauthorized = request('?action=health', {
    headers: { 'X-ZOS-Knowledge-Key': 'wrong-key' },
  });
  assert.equal((await configured(unauthorized)).status, 401);
});

test('returns authenticated health without calling the database', async () => {
  let calls = 0;
  const handler = configuredHandler(async () => {
    calls += 1;
    return { data: null, error: null };
  });

  const response = await handler(request('?action=health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'zOS Agent Knowledge Service',
    version: 'V1.2',
  });
  assert.equal(calls, 0);
});

test('routes a successful public record read and returns the RPC result', async () => {
  const calls = [];
  const record = {
    id: 'PUB-K-JES2-10000000-0000-4000-8000-000000000001',
    title: 'Published public record',
  };
  const handler = configuredHandler(async (name, args) => {
    calls.push({ name, args });
    return { data: record, error: null };
  });

  const response = await handler(request(
    '?action=record&id=PUB-K-JES2-10000000-0000-4000-8000-000000000001',
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', record });
  assert.deepEqual(calls, [{
    name: 'get_public_record',
    args: { p_record_id: 'PUB-K-JES2-10000000-0000-4000-8000-000000000001' },
  }]);
});

test('routes public candidate creation and returns HTTP 201', async () => {
  const calls = [];
  const handler = configuredHandler(async (name, args) => {
    calls.push({ name, args });
    return {
      data: { record_id: '10000000-0000-4000-8000-000000000002' },
      error: null,
    };
  });
  const response = await handler(request('?action=create_candidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      record_type: 'EXPERIENCE',
      title: 'Generalized allocation pattern',
      component: 'DFSMS',
      content: { finding: 'A sanitized reusable technical finding.' },
      applicability: { scope: 'Generalized allocation failures.' },
      sanitized: true,
      generalized: true,
      raw_evidence_included: false,
    }),
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    record_id: '10000000-0000-4000-8000-000000000002',
  });
  assert.deepEqual(calls, [{
    name: 'create_public_candidate',
    args: {
      p_record_type: 'EXPERIENCE',
      p_component: 'DFSMS',
      p_title: 'Generalized allocation pattern',
      p_content: { finding: 'A sanitized reusable technical finding.' },
      p_applicability: { scope: 'Generalized allocation failures.' },
    },
  }]);
});

test('routes public observation creation and returns HTTP 201', async () => {
  const calls = [];
  const handler = configuredHandler(async (name, args) => {
    calls.push({ name, args });
    return {
      data: { observation_id: '10000000-0000-4000-8000-000000000003' },
      error: null,
    };
  });
  const response = await handler(request('?action=add_observation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      record_id: 'PUB-E-DFSMS-10000000-0000-4000-8000-000000000001',
      case_fingerprint: 'synthetic-case-001',
      result: 'A sanitized generalized observation.',
      sanitized: true,
      generalized: true,
      raw_evidence_included: false,
    }),
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    observation_id: '10000000-0000-4000-8000-000000000003',
  });
  assert.deepEqual(calls, [{
    name: 'add_public_observation',
    args: {
      p_record_id: 'PUB-E-DFSMS-10000000-0000-4000-8000-000000000001',
      p_case_fingerprint: 'synthetic-case-001',
      p_result: 'A sanitized generalized observation.',
    },
  }]);
});

test('maps an empty public record result to HTTP 404', async () => {
  const handler = configuredHandler(async () => ({ data: null, error: null }));
  const response = await handler(request(
    '?action=record&id=PUB-K-JES2-10000000-0000-4000-8000-000000000001',
  ));

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'RECORD_NOT_FOUND');
});

test('routes normalized any-term search filters to the public search RPC', async () => {
  const calls = [];
  const handler = configuredHandler(async (name, args) => {
    calls.push({ name, args });
    return {
      data: {
        query: { q: 'atomic regression testing' },
        visibility: { status: 'PUBLISHED', privacy_status: 'PASS' },
        count: 1,
        records: [{ id: 'K-EXISTING-LIVE-001' }],
      },
      error: null,
    };
  });

  const response = await handler(request('?action=search&q=%20atomic%20%20regression%20testing%20&limit=99&component=DFSMS&record_type=EXPERIENCE'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    query: { q: 'atomic regression testing' },
    visibility: { status: 'PUBLISHED', privacy_status: 'PASS' },
    count: 1,
    records: [{ id: 'K-EXISTING-LIVE-001' }],
  });
  assert.deepEqual(calls, [{
    name: 'search_public_records',
    args: {
      p_query: 'atomic regression testing',
      p_component: 'DFSMS',
      p_record_type: 'EXPERIENCE',
      p_limit: 20,
    },
  }]);
});

test('maps stable RPC domain failures to client responses and unknown failures to 500', async (t) => {
  const cases = [
    ['P0002', 404, 'RECORD_NOT_FOUND'],
    ['22023', 400, 'INVALID_REQUEST'],
    ['XX000', 500, 'DATABASE_ERROR'],
  ];

  for (const [databaseCode, expectedStatus, expectedCode] of cases) {
    await t.test(databaseCode, async () => {
      const handler = configuredHandler(async () => ({
        data: null,
        error: { code: databaseCode },
      }));
      const response = await handler(request('?action=record&id=10000000-0000-4000-8000-000000000001'));
      assert.equal(response.status, expectedStatus);
      assert.equal((await response.json()).error.code, expectedCode);
    });
  }
});

test('rejects a declared oversized body before parsing or calling the RPC', async () => {
  let calls = 0;
  const handler = configuredHandler(async () => {
    calls += 1;
    return { data: null, error: null };
  });
  const response = await handler(request('?action=create_candidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': '20001',
    },
    body: '{}',
  }));

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'INVALID_INPUT');
  assert.equal(calls, 0);
});

test('rejects an oversized chunked body after consuming the stream', async () => {
  let calls = 0;
  let deliveredBytes = 0;
  let index = 0;
  const chunks = [
    new TextEncoder().encode('x'.repeat(15_000)),
    new TextEncoder().encode('y'.repeat(15_000)),
  ];
  const body = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        deliveredBytes += chunks[index].byteLength;
        controller.enqueue(chunks[index]);
        index += 1;
      } else {
        controller.close();
      }
    },
  });
  const handler = configuredHandler(async () => {
    calls += 1;
    return { data: null, error: null };
  });
  const response = await handler(request('?action=create_candidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    duplex: 'half',
  }));

  assert.equal(response.status, 413);
  assert.equal(deliveredBytes, 30_000);
  assert.equal(calls, 0);
});

test('rejects a body whose declared Content-Length understates its actual size', async () => {
  let calls = 0;
  const handler = configuredHandler(async () => {
    calls += 1;
    return { data: null, error: null };
  });
  const response = await handler(request('?action=add_observation', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': '2',
    },
    body: 'x'.repeat(20_001),
  }));

  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('measures the actual request limit in UTF-8 bytes rather than JavaScript characters', async () => {
  let calls = 0;
  const handler = configuredHandler(async () => {
    calls += 1;
    return { data: null, error: null };
  });
  const response = await handler(request('?action=create_candidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ evidence: 'é'.repeat(10_001) }),
  }));

  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});
