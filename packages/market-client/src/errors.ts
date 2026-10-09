/**
 * errors.ts — typed error classes for the market client.
 *
 * Every failure mode the client can produce is a distinct class so callers can
 * branch on it without string-matching messages:
 *
 *   MarketClientError   base class (always thrown)
 *   TimeoutError        request exceeded config.timeoutMs
 *   HttpError           non-2xx after retries were exhausted (has .status)
 *   NotFoundError       404
 *   RateLimitError      429 (has .retryAfterMs when the server sent Retry-After)
 *   ServerError         5xx
 *   ParseError          2xx but the body was not valid JSON / did not match shape
 *   AuthRequiredError   401/403 — this client only does read-only calls, so this
 *                       means the endpoint is not in the read-only scope
 *   ConfigError         bad config (e.g. missing baseUrl)
 */

export type MarketClientErrorCode =
  | 'timeout'
  | 'http'
  | 'not_found'
  | 'rate_limited'
  | 'server_error'
  | 'parse_error'
  | 'auth_required'
  | 'config_error'
  | 'network_error';

export class MarketClientError extends Error {
  readonly code: MarketClientErrorCode;
  readonly status?: number;
  readonly url?: string;
  readonly attempt?: number;

  constructor(
    message: string,
    code: MarketClientErrorCode,
    opts: { status?: number; url?: string; attempt?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = opts.status;
    this.url = opts.url;
    this.attempt = opts.attempt;
    if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause;
  }
}

export class ConfigError extends MarketClientError {
  constructor(message: string) {
    super(message, 'config_error');
  }
}

export class NetworkError extends MarketClientError {
  constructor(message: string, opts: { url?: string; attempt?: number; cause?: unknown } = {}) {
    super(message, 'network_error', opts);
  }
}

export class TimeoutError extends MarketClientError {
  constructor(url: string, timeoutMs: number, attempt?: number) {
    super(`Request timed out after ${timeoutMs}ms: ${url}`, 'timeout', { url, attempt });
  }
}

export class HttpError extends MarketClientError {
  readonly body?: unknown;
  constructor(message: string, status: number, url: string, body?: unknown, attempt?: number) {
    super(message, 'http', { status, url, attempt });
    this.body = body;
  }
}

export class NotFoundError extends HttpError {
  constructor(url: string, body?: unknown) {
    super(`404 Not Found: ${url}`, 404, url, body);
    (this as { code: MarketClientErrorCode }).code = 'not_found';
  }
}

export class RateLimitError extends HttpError {
  readonly retryAfterMs?: number;
  constructor(url: string, retryAfterMs?: number, body?: unknown) {
    super(
      `429 Too Many Requests: ${url}${retryAfterMs ? ` (retry after ${retryAfterMs}ms)` : ''}`,
      429,
      url,
      body,
    );
    (this as { code: MarketClientErrorCode }).code = 'rate_limited';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ServerError extends HttpError {
  constructor(status: number, url: string, body?: unknown, attempt?: number) {
    super(`${status} server error: ${url}`, status, url, body, attempt);
    (this as { code: MarketClientErrorCode }).code = 'server_error';
  }
}

export class AuthRequiredError extends HttpError {
  constructor(status: number, url: string, body?: unknown) {
    super(`${status} auth required (out of read-only scope): ${url}`, status, url, body);
    (this as { code: MarketClientErrorCode }).code = 'auth_required';
  }
}

export class ParseError extends MarketClientError {
  readonly bodyPreview?: string;
  constructor(url: string, detail: string, bodyPreview?: string) {
    super(`Malformed JSON from ${url}: ${detail}`, 'parse_error', { url });
    this.bodyPreview = bodyPreview;
  }
}

/** Map an HTTP status to the most specific error class. */
export function httpErrorFor(status: number, url: string, body?: unknown, retryAfterMs?: number): HttpError {
  if (status === 404) return new NotFoundError(url, body);
  if (status === 429) return new RateLimitError(url, retryAfterMs, body);
  if (status === 401 || status === 403) return new AuthRequiredError(status, url, body);
  if (status >= 500) return new ServerError(status, url, body);
  return new HttpError(`${status} HTTP error: ${url}`, status, url, body);
}
