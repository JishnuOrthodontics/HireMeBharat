import type { FastifyRequest } from 'fastify';
import type { IncomingHttpHeaders } from 'node:http';

const X_FIREBASE_AUTH = 'x-firebase-authorization';

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
  return undefined;
}

function pickFromIncoming(h: IncomingHttpHeaders, name: string): string | undefined {
  return firstString(h[name]);
}

/**
 * Bearer from `Authorization`, or `X-Firebase-Authorization` if a reverse proxy stripped the standard header.
 */
export function getBearerAuthorizationHeader(req: FastifyRequest): string | undefined {
  const tries: Array<string | undefined> = [
    firstString(req.headers.authorization),
    firstString(req.headers[X_FIREBASE_AUTH]),
  ];
  const raw = req.raw?.headers;
  if (raw) {
    tries.push(pickFromIncoming(raw, 'authorization'));
    tries.push(pickFromIncoming(raw, X_FIREBASE_AUTH));
  }
  for (const t of tries) {
    if (t?.startsWith('Bearer ')) return t;
  }
  return undefined;
}
