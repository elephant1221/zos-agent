import {
  InputError,
  classifyRpcError,
  normalizeRecordId,
  normalizeSearchInput,
  resolveRoute,
  validateCandidateInput,
  validateContentLength,
  validateObservationInput,
} from './domain.ts';

export type RpcResult = {
  data: unknown;
  error: { code: string } | null;
};

export type KnowledgeApiConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  publicApiKey: string;
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
  logError?: (message: string, details?: unknown) => void;
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-zos-knowledge-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function errorResponse(status: number, code: string, message: string): Response {
  return response(status, { ok: false, error: { code, message } });
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function readJson(request: Request): Promise<unknown> {
  validateContentLength(request.headers.get('content-length'));
  const text = await request.text();
  if (text.length > 20_000) throw new InputError('request body is too large', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError('request body must be valid JSON');
  }
}

export function createKnowledgeApiHandler(config: KnowledgeApiConfig) {
  const logError = config.logError ?? console.error;

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    const route = resolveRoute(request.method, url.searchParams.get('action'));
    if (!route) return errorResponse(404, 'ACTION_NOT_FOUND', 'Unsupported method or action');

    if (!config.supabaseUrl || !config.serviceRoleKey || !config.publicApiKey) {
      return errorResponse(503, 'SERVICE_NOT_CONFIGURED', 'Knowledge Service is not configured');
    }

    const providedKey = request.headers.get('X-ZOS-Knowledge-Key') ?? '';
    if (!(await secureEqual(providedKey, config.publicApiKey))) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid Knowledge Service key');
    }

    if (route === 'health') {
      return response(200, {
        ok: true,
        data: { status: 'ok', service: 'knowledge-api', version: 'V1.2' },
      });
    }

    try {
      let rpcName: string;
      let rpcArguments: Record<string, unknown>;

      if (route === 'search') {
        rpcName = 'search_public_records';
        rpcArguments = normalizeSearchInput(
          url.searchParams.get('q'),
          url.searchParams.get('limit') ?? undefined,
        );
      } else if (route === 'record') {
        rpcName = 'get_public_record';
        rpcArguments = { p_record_id: normalizeRecordId(url.searchParams.get('id')) };
      } else if (route === 'create_candidate') {
        rpcName = 'create_public_candidate';
        rpcArguments = validateCandidateInput(await readJson(request));
      } else {
        rpcName = 'add_public_observation';
        rpcArguments = validateObservationInput(await readJson(request));
      }

      const { data, error } = await config.rpc(rpcName, rpcArguments);
      if (error) {
        logError('Knowledge Service RPC failed', { rpcName, code: error.code });
        const classified = classifyRpcError(error.code);
        return errorResponse(classified.status, classified.code, classified.message);
      }

      if (route === 'record' && Array.isArray(data) && data.length === 0) {
        return errorResponse(404, 'RECORD_NOT_FOUND', 'Published record not found');
      }

      return response(route === 'create_candidate' || route === 'add_observation' ? 201 : 200, {
        ok: true,
        data,
      });
    } catch (error) {
      if (error instanceof InputError) {
        return errorResponse(error.status, 'INVALID_INPUT', error.message);
      }
      logError('Knowledge Service request failed', error);
      return errorResponse(500, 'INTERNAL_ERROR', 'Knowledge Service request failed');
    }
  };
}
