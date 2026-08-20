import test from 'node:test';
import assert from 'node:assert/strict';

import {
  InputError,
  classifyRpcError,
  containsSensitiveEvidence,
  normalizeRecordId,
  normalizeSearchInput,
  resolveRoute,
  validateContentLength,
  validateCandidateInput,
  validateObservationInput,
} from '../supabase/functions/knowledge-api/domain.ts';

test('normalizes record identifiers and rejects malformed values', () => {
  assert.equal(
    normalizeRecordId('10000000-0000-4000-8000-0000000000AA'),
    '10000000-0000-4000-8000-0000000000aa',
  );
  assert.throws(() => normalizeRecordId('not-a-uuid'), InputError);
  assert.throws(() => normalizeRecordId(null), InputError);
});

test('routes only the five Public V1.2 method and action combinations', () => {
  assert.equal(resolveRoute('GET', 'health'), 'health');
  assert.equal(resolveRoute('GET', 'search'), 'search');
  assert.equal(resolveRoute('GET', 'record'), 'record');
  assert.equal(resolveRoute('POST', 'create_candidate'), 'create_candidate');
  assert.equal(resolveRoute('POST', 'add_observation'), 'add_observation');

  assert.equal(resolveRoute('GET', 'create_candidate'), null);
  assert.equal(resolveRoute('POST', 'search'), null);
  assert.equal(resolveRoute('POST', 'mpbsdp_create_candidate'), null);
  assert.equal(resolveRoute('POST', 'mpbsdp_add_observation'), null);
  assert.equal(resolveRoute('POST', 'publish_record'), null);
});

test('normalizes multi-keyword search and clamps the result limit', () => {
  assert.deepEqual(normalizeSearchInput('  atomic   regression\ttesting  ', '999'), {
    p_query: 'atomic regression testing',
    p_limit: 20,
  });
  assert.deepEqual(normalizeSearchInput('allocation', '0'), {
    p_query: 'allocation',
    p_limit: 1,
  });
  assert.deepEqual(normalizeSearchInput('allocation', undefined), {
    p_query: 'allocation',
    p_limit: 20,
  });
  assert.throws(() => normalizeSearchInput('   ', '10'), InputError);
});

test('candidate validation returns only public RPC arguments', () => {
  assert.deepEqual(validateCandidateInput({
    record_type: 'experience',
    title: ' Generalized allocation pattern ',
    component: ' DFSMS ',
    content: ' A sanitized reusable technical finding. ',
    applicability: ' Applies to generalized allocation failures. ',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  }), {
    p_record_type: 'EXPERIENCE',
    p_title: 'Generalized allocation pattern',
    p_component: 'DFSMS',
    p_content: 'A sanitized reusable technical finding.',
    p_applicability: 'Applies to generalized allocation failures.',
    p_sanitized: true,
    p_generalized: true,
    p_raw_evidence_included: false,
  });
});

test('candidate validation rejects caller-owned trust and lifecycle fields', () => {
  const valid = {
    record_type: 'EXPERIENCE',
    title: 'Generalized allocation pattern',
    component: 'DFSMS',
    content: 'A sanitized reusable technical finding.',
    applicability: 'Applies to generalized allocation failures.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  };

  for (const field of ['status', 'privacy_status', 'provenance', 'source_type', 'maturity']) {
    assert.throws(
      () => validateCandidateInput({ ...valid, [field]: 'FORGED' }),
      (error) => error instanceof InputError && error.message.includes(field),
    );
  }
});

test('public submission declarations must be sanitized and generalized without raw evidence', () => {
  const valid = {
    record_type: 'KNOWLEDGE',
    title: 'Generalized check',
    component: 'JES2',
    content: 'A sanitized reusable technical finding.',
    applicability: 'Applies to generalized checks.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  };

  assert.throws(() => validateCandidateInput({ ...valid, sanitized: false }), InputError);
  assert.throws(() => validateCandidateInput({ ...valid, generalized: false }), InputError);
  assert.throws(() => validateCandidateInput({ ...valid, raw_evidence_included: true }), InputError);
});

test('privacy screen detects common sensitive or raw evidence patterns', () => {
  const blocked = [
    'api_key=sk-example-secret-value',
    'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturevalue',
    'Authorization: Bearer secret-token-value',
    'Connect to https://host.internal.example/private',
    'The system hostname is PRODLPAR01.CORP.LOCAL',
    'The failing host was 10.23.45.67',
    'RAW SYSLOG follows with production messages',
    '-----BEGIN PRIVATE KEY-----',
  ];

  for (const value of blocked) {
    assert.equal(containsSensitiveEvidence(value), true, value);
  }

  assert.equal(
    containsSensitiveEvidence('Use documentation addresses 192.0.2.10 and HOST1.EXAMPLE.COM.'),
    false,
  );
  assert.equal(containsSensitiveEvidence('See https://www.ibm.com/docs/ for official guidance.'), false);
});

test('classifies stable database domain errors as client errors', () => {
  assert.deepEqual(classifyRpcError('P0002'), {
    status: 404,
    code: 'RECORD_NOT_FOUND',
    message: 'Record not found',
  });
  assert.deepEqual(classifyRpcError('22023'), {
    status: 400,
    code: 'INVALID_REQUEST',
    message: 'Knowledge Service rejected the request',
  });
  assert.deepEqual(classifyRpcError('23514'), {
    status: 400,
    code: 'INVALID_REQUEST',
    message: 'Knowledge Service rejected the request',
  });
  assert.deepEqual(classifyRpcError('XX000'), {
    status: 500,
    code: 'DATABASE_ERROR',
    message: 'Knowledge Service operation failed',
  });
});

test('rejects an oversized declared request body before buffering', () => {
  assert.doesNotThrow(() => validateContentLength(null));
  assert.doesNotThrow(() => validateContentLength('20000'));
  assert.throws(
    () => validateContentLength('20001'),
    (error) => error instanceof InputError && error.status === 413,
  );
  assert.throws(() => validateContentLength('not-a-number'), InputError);
});

test('observation validation omits all trust and maturity controls', () => {
  const result = validateObservationInput({
    record_id: '10000000-0000-4000-8000-000000000001',
    content: 'A sanitized generalized observation.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  });

  assert.deepEqual(result, {
    p_record_id: '10000000-0000-4000-8000-000000000001',
    p_content: 'A sanitized generalized observation.',
    p_sanitized: true,
    p_generalized: true,
    p_raw_evidence_included: false,
  });
  for (const field of ['source_type', 'validated', 'independent', 'privacy_status', 'maturity']) {
    assert.equal(Object.hasOwn(result, field), false);
  }
});

test('observation validation rejects invalid identifiers and forged trust fields', () => {
  const valid = {
    record_id: '10000000-0000-4000-8000-000000000001',
    content: 'A sanitized generalized observation.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  };

  assert.throws(() => validateObservationInput({ ...valid, record_id: 'not-a-uuid' }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, validated: true }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, independent: true }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, source_type: 'MPBSDP' }), InputError);
});
