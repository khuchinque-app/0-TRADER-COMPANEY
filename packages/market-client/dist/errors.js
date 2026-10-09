"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = exports.AuthRequiredError = exports.ServerError = exports.RateLimitError = exports.NotFoundError = exports.HttpError = exports.TimeoutError = exports.NetworkError = exports.ConfigError = exports.MarketClientError = void 0;
exports.httpErrorFor = httpErrorFor;
class MarketClientError extends Error {
    code;
    status;
    url;
    attempt;
    constructor(message, code, opts = {}) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.status = opts.status;
        this.url = opts.url;
        this.attempt = opts.attempt;
        if (opts.cause !== undefined)
            this.cause = opts.cause;
    }
}
exports.MarketClientError = MarketClientError;
class ConfigError extends MarketClientError {
    constructor(message) {
        super(message, 'config_error');
    }
}
exports.ConfigError = ConfigError;
class NetworkError extends MarketClientError {
    constructor(message, opts = {}) {
        super(message, 'network_error', opts);
    }
}
exports.NetworkError = NetworkError;
class TimeoutError extends MarketClientError {
    constructor(url, timeoutMs, attempt) {
        super(`Request timed out after ${timeoutMs}ms: ${url}`, 'timeout', { url, attempt });
    }
}
exports.TimeoutError = TimeoutError;
class HttpError extends MarketClientError {
    body;
    constructor(message, status, url, body, attempt) {
        super(message, 'http', { status, url, attempt });
        this.body = body;
    }
}
exports.HttpError = HttpError;
class NotFoundError extends HttpError {
    constructor(url, body) {
        super(`404 Not Found: ${url}`, 404, url, body);
        this.code = 'not_found';
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends HttpError {
    retryAfterMs;
    constructor(url, retryAfterMs, body) {
        super(`429 Too Many Requests: ${url}${retryAfterMs ? ` (retry after ${retryAfterMs}ms)` : ''}`, 429, url, body);
        this.code = 'rate_limited';
        this.retryAfterMs = retryAfterMs;
    }
}
exports.RateLimitError = RateLimitError;
class ServerError extends HttpError {
    constructor(status, url, body, attempt) {
        super(`${status} server error: ${url}`, status, url, body, attempt);
        this.code = 'server_error';
    }
}
exports.ServerError = ServerError;
class AuthRequiredError extends HttpError {
    constructor(status, url, body) {
        super(`${status} auth required (out of read-only scope): ${url}`, status, url, body);
        this.code = 'auth_required';
    }
}
exports.AuthRequiredError = AuthRequiredError;
class ParseError extends MarketClientError {
    bodyPreview;
    constructor(url, detail, bodyPreview) {
        super(`Malformed JSON from ${url}: ${detail}`, 'parse_error', { url });
        this.bodyPreview = bodyPreview;
    }
}
exports.ParseError = ParseError;
/** Map an HTTP status to the most specific error class. */
function httpErrorFor(status, url, body, retryAfterMs) {
    if (status === 404)
        return new NotFoundError(url, body);
    if (status === 429)
        return new RateLimitError(url, retryAfterMs, body);
    if (status === 401 || status === 403)
        return new AuthRequiredError(status, url, body);
    if (status >= 500)
        return new ServerError(status, url, body);
    return new HttpError(`${status} HTTP error: ${url}`, status, url, body);
}
