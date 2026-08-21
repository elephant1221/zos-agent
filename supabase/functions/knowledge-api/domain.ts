export type PublicV1Action =
  | 'health'
  | 'search'
  | 'record'
  | 'create_candidate'
  | 'add_observation';

export class InputError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'InputError';
    this.status = status;
  }
}

const ROUTES = new Map<string, PublicV1Action>([
  ['GET:health', 'health'],
  ['GET:search', 'search'],
  ['GET:record', 'record'],
  ['POST:create_candidate', 'create_candidate'],
  ['POST:add_observation', 'add_observation'],
]);

const LIVE_RECORD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/#+-]{0,199}$/;

const SECRET_PATTERNS = [
  /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|passwd|secret)\s*[:=]/i,
  /\bauthorization\s*:\s*(?:bearer|basic)\s+/i,
  /\bsk-(?:proj-)?[a-z0-9_-]{20,}\b/i,
  /\b(?:ghp_|github_pat_|xox[baprs]-)[a-z0-9_-]{16,}\b/i,
  /\beyJ[a-z0-9_-]{5,}\.[a-z0-9_-]{5,}\.[a-z0-9_-]{8,}\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

const RAW_EVIDENCE_PATTERNS = [
  /\braw\s+(?:syslog|operlog|joblog|dump)\b/i,
  /\b(?:syslog|operlog|joblog)\s+(?:follows|excerpt|output)\b/i,
  /\b(?:svcdump|standalone dump|system dump)\b/i,
];

const INTERNAL_URL_PATTERN = /https?:\/\/[^\s/]*(?:\.internal\.|\.internal(?:[/:]|$)|\.local(?:[/:.]|$)|internal\.)/i;
const INTERNAL_HOSTNAME_PATTERN = /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*\.(?:internal|local|corp|lan)\b/i;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function isDocumentationAddress(value: string): boolean {
  const parts = value.split('.').map(Number);
  return (
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 2)
    || (parts[0] === 198 && parts[1] === 51 && parts[2] === 100)
    || (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)
  );
}

function isValidIpv4(value: string): boolean {
  return value.split('.').every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

export function containsSensitiveEvidence(value: string): boolean {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return true;
  if (RAW_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value))) return true;
  if (INTERNAL_URL_PATTERN.test(value)) return true;
  if (INTERNAL_HOSTNAME_PATTERN.test(value)) return true;

  for (const match of value.matchAll(IPV4_PATTERN)) {
    if (isValidIpv4(match[0]) && !isDocumentationAddress(match[0])) return true;
  }

  return false;
}

export function resolveRoute(method: string, action: string | null): PublicV1Action | null {
  if (!action) return null;
  return ROUTES.get(`${method.toUpperCase()}:${action}`) ?? null;
}

export function normalizeSearchInput(
  query: string | null,
  limit: string | number | undefined,
  component: string | null = null,
  recordType: string | null = null,
): {
  p_query: string;
  p_component: string | null;
  p_record_type: 'KNOWLEDGE' | 'EXPERIENCE' | null;
  p_limit: number;
} {
  const p_query = String(query ?? '').trim().replace(/\s+/g, ' ');
  if (p_query.length > 200) throw new InputError('q must not exceed 200 characters');

  const normalizedComponent = String(component ?? '').trim();
  if (normalizedComponent.length > 100) {
    throw new InputError('component must not exceed 100 characters');
  }

  const normalizedRecordType = String(recordType ?? '').trim().toUpperCase();
  if (
    normalizedRecordType
    && normalizedRecordType !== 'KNOWLEDGE'
    && normalizedRecordType !== 'EXPERIENCE'
  ) {
    throw new InputError('record_type must be KNOWLEDGE or EXPERIENCE');
  }

  const parsed = typeof limit === 'number' ? limit : Number.parseInt(limit ?? '20', 10);
  const finite = Number.isFinite(parsed) ? Math.trunc(parsed) : 20;
  const p_limit = Math.min(20, Math.max(1, finite));
  return {
    p_query,
    p_component: normalizedComponent || null,
    p_record_type: normalizedRecordType as 'KNOWLEDGE' | 'EXPERIENCE' | null || null,
    p_limit,
  };
}

export function normalizeRecordId(value: unknown): string {
  if (typeof value !== 'string') throw new InputError('record_id must be a live text identifier');
  const normalized = value.trim();
  if (!LIVE_RECORD_ID_PATTERN.test(normalized)) {
    throw new InputError('record_id must be a valid live text identifier');
  }
  return normalized;
}

export function validateContentLength(value: string | null, maximum = 20_000): void {
  if (value === null || value === '') return;
  if (!/^\d+$/.test(value)) throw new InputError('content-length must be a non-negative integer');
  if (Number(value) > maximum) throw new InputError('request body is too large', 413);
}

export function classifyRpcError(code: string): {
  status: number;
  code: string;
  message: string;
} {
  if (code === 'P0002') {
    return { status: 404, code: 'RECORD_NOT_FOUND', message: 'Record not found' };
  }
  if (['22023', '22P02', '23502', '23514'].includes(code)) {
    return {
      status: 400,
      code: 'INVALID_REQUEST',
      message: 'Knowledge Service rejected the request',
    };
  }
  if (code === '23505') {
    return {
      status: 409,
      code: 'DUPLICATE_OBSERVATION',
      message: 'Observation already exists for this record and case fingerprint',
    };
  }
  return {
    status: 500,
    code: 'DATABASE_ERROR',
    message: 'Knowledge Service operation failed',
  };
}

type JsonObject = Record<string, unknown>;

function requireObject(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InputError('request body must be a JSON object');
  }
  return value as JsonObject;
}

function assertAllowedKeys(value: JsonObject, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new InputError(`field is not accepted: ${unknown.sort().join(', ')}`);
  }
}

function requireText(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== 'string') throw new InputError(`${field} must be a string`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new InputError(`${field} length must be between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function requireJsonObject(value: unknown, field: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InputError(`${field} must be a JSON object`);
  }
  return value as JsonObject;
}

function requirePublicSafeDeclaration(value: JsonObject): void {
  if (
    value.sanitized !== true
    || value.generalized !== true
    || value.raw_evidence_included !== false
  ) {
    throw new InputError(
      'public submissions must be sanitized and generalized and must not include raw evidence',
    );
  }
}

function screenText(values: string[]): void {
  if (containsSensitiveEvidence(values.join('\n'))) {
    throw new InputError('submission appears to contain sensitive or raw evidence');
  }
}

const CANDIDATE_KEYS = [
  'record_type',
  'title',
  'component',
  'content',
  'applicability',
  'sanitized',
  'generalized',
  'raw_evidence_included',
] as const;

export function validateCandidateInput(value: unknown): {
  p_record_type: 'KNOWLEDGE' | 'EXPERIENCE';
  p_component: string;
  p_title: string;
  p_content: JsonObject;
  p_applicability: JsonObject | null;
} {
  const input = requireObject(value);
  assertAllowedKeys(input, CANDIDATE_KEYS);
  requirePublicSafeDeclaration(input);

  if (typeof input.record_type !== 'string') {
    throw new InputError('record_type must be KNOWLEDGE or EXPERIENCE');
  }
  const p_record_type = input.record_type.trim().toUpperCase();
  if (p_record_type !== 'KNOWLEDGE' && p_record_type !== 'EXPERIENCE') {
    throw new InputError('record_type must be KNOWLEDGE or EXPERIENCE');
  }

  const p_title = requireText(input.title, 'title', 3, 200);
  const p_component = requireText(input.component, 'component', 1, 100);
  const p_content = requireJsonObject(input.content, 'content');
  const p_applicability = input.applicability == null
    ? null
    : requireJsonObject(input.applicability, 'applicability');
  screenText([
    p_title,
    p_component,
    JSON.stringify(p_content),
    JSON.stringify(p_applicability),
  ]);

  return {
    p_record_type,
    p_component,
    p_title,
    p_content,
    p_applicability,
  };
}

const OBSERVATION_KEYS = [
  'record_id',
  'case_fingerprint',
  'result',
  'sanitized',
  'generalized',
  'raw_evidence_included',
] as const;

export function validateObservationInput(value: unknown): {
  p_record_id: string;
  p_case_fingerprint: string;
  p_result: string | null;
} {
  const input = requireObject(value);
  assertAllowedKeys(input, OBSERVATION_KEYS);
  requirePublicSafeDeclaration(input);

  const p_record_id = normalizeRecordId(input.record_id);
  const p_case_fingerprint = requireText(
    input.case_fingerprint,
    'case_fingerprint',
    1,
    200,
  );
  const p_result = input.result == null
    ? null
    : requireText(input.result, 'result', 1, 8000);
  screenText([p_case_fingerprint, p_result ?? '']);

  return {
    p_record_id,
    p_case_fingerprint,
    p_result,
  };
}
