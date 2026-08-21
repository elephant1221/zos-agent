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

test('normalizes live text record identifiers and rejects malformed values', () => {
  assert.equal(
    normalizeRecordId(' PUB-E-DFSMS-10000000-0000-4000-8000-0000000000AA '),
    'PUB-E-DFSMS-10000000-0000-4000-8000-0000000000AA',
  );
  assert.equal(normalizeRecordId('K-EXISTING-LIVE-001'), 'K-EXISTING-LIVE-001');
  assert.throws(() => normalizeRecordId('contains whitespace'), InputError);
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

test('normalizes live any-term search filters and clamps the result limit', () => {
  assert.deepEqual(normalizeSearchInput(
    '  atomic   regression\ttesting  ',
    '999',
    ' DFSMS ',
    'experience',
  ), {
    p_query: 'atomic regression testing',
    p_component: 'DFSMS',
    p_record_type: 'EXPERIENCE',
    p_limit: 20,
  });
  assert.deepEqual(normalizeSearchInput('', '0', null, null), {
    p_query: '',
    p_component: null,
    p_record_type: null,
    p_limit: 1,
  });
  assert.throws(() => normalizeSearchInput('allocation', '10', null, 'FORGED'), InputError);
});

test('candidate validation returns only public RPC arguments', () => {
  assert.deepEqual(validateCandidateInput({
    record_type: 'experience',
    title: ' Generalized allocation pattern ',
    component: ' DFSMS ',
    content: { finding: 'A sanitized reusable technical finding.' },
    applicability: { scope: 'Generalized allocation failures.' },
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  }), {
    p_record_type: 'EXPERIENCE',
    p_component: 'DFSMS',
    p_title: 'Generalized allocation pattern',
    p_content: { finding: 'A sanitized reusable technical finding.' },
    p_applicability: { scope: 'Generalized allocation failures.' },
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
    content: { finding: 'A sanitized reusable technical finding.' },
    applicability: { scope: 'Generalized checks.' },
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
  assert.deepEqual(classifyRpcError('23505'), {
    status: 409,
    code: 'DUPLICATE_OBSERVATION',
    message: 'Observation already exists for this record and case fingerprint',
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
    record_id: 'PUB-E-DFSMS-10000000-0000-4000-8000-000000000001',
    case_fingerprint: 'synthetic-case-001',
    result: 'A sanitized generalized observation.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  });

  assert.deepEqual(result, {
    p_record_id: 'PUB-E-DFSMS-10000000-0000-4000-8000-000000000001',
    p_case_fingerprint: 'synthetic-case-001',
    p_result: 'A sanitized generalized observation.',
  });
  for (const field of ['source_type', 'validated', 'independent', 'privacy_status', 'maturity']) {
    assert.equal(Object.hasOwn(result, field), false);
  }
});

test('observation validation rejects invalid identifiers and forged trust fields', () => {
  const valid = {
    record_id: 'PUB-E-DFSMS-10000000-0000-4000-8000-000000000001',
    case_fingerprint: 'synthetic-case-001',
    result: 'A sanitized generalized observation.',
    sanitized: true,
    generalized: true,
    raw_evidence_included: false,
  };

  assert.throws(() => validateObservationInput({ ...valid, record_id: 'contains whitespace' }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, validated: true }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, independent: true }), InputError);
  assert.throws(() => validateObservationInput({ ...valid, source_type: 'MPBSDP' }), InputError);
});
