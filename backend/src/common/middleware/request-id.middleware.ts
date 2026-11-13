import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Ensures every request carries a request id, echoed in the response header and
 * in error bodies. Incoming ids are reused only when they look sane.
 */
export function requestIdMiddleware(
  request: Request & { requestId?: string },
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const candidate =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : randomUUID();

  request.requestId = candidate;
  response.setHeader(REQUEST_ID_HEADER, candidate);
  next();
}
