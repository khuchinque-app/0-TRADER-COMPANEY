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
export type MarketClientErrorCode = 'timeout' | 'http' | 'not_found' | 'rate_limited' | 'server_error' | 'parse_error' | 'auth_required' | 'config_error' | 'network_error';
export declare class MarketClientError extends Error {
    readonly code: MarketClientErrorCode;
    readonly status?: number;
    readonly url?: string;
    readonly attempt?: number;
    constructor(message: string, code: MarketClientErrorCode, opts?: {
        status?: number;
        url?: string;
        attempt?: number;
        cause?: unknown;
    });
}
export declare class ConfigError extends MarketClientError {
    constructor(message: string);
}
export declare class NetworkError extends MarketClientError {
    constructor(message: string, opts?: {
        url?: string;
        attempt?: number;
        cause?: unknown;
    });
}
export declare class TimeoutError extends MarketClientError {
    constructor(url: string, timeoutMs: number, attempt?: number);
}
export declare class HttpError extends MarketClientError {
    readonly body?: unknown;
    constructor(message: string, status: number, url: string, body?: unknown, attempt?: number);
}
export declare class NotFoundError extends HttpError {
    constructor(url: string, body?: unknown);
}
export declare class RateLimitError extends HttpError {
    readonly retryAfterMs?: number;
    constructor(url: string, retryAfterMs?: number, body?: unknown);
}
export declare class ServerError extends HttpError {
    constructor(status: number, url: string, body?: unknown, attempt?: number);
}
export declare class AuthRequiredError extends HttpError {
    constructor(status: number, url: string, body?: unknown);
}
export declare class ParseError extends MarketClientError {
    readonly bodyPreview?: string;
    constructor(url: string, detail: string, bodyPreview?: string);
}
/** Map an HTTP status to the most specific error class. */
export declare function httpErrorFor(status: number, url: string, body?: unknown, retryAfterMs?: number): HttpError;
