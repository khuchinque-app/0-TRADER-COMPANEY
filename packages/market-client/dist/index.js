"use strict";
/**
 * @trading/market-client — read-only, config-driven client for the /market/* service.
 *
 * Quick start:
 *   import { createMarketClient } from '@trading/market-client';
 *   const client = createMarketClient({ baseUrl: 'http://187.127.178.20:22221' });
 *   const ticker = await client.getMarket('ANIMEIDR');
 *   const page   = await client.getMarketPage('ANIMEIDR');
 *   const body   = await client.getMarketSubresource('depth', 'ANIMEIDR', { limit: 20 });
 *   const pairs  = await client.listMarkets();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtlCache = exports.RateLimiter = exports.httpErrorFor = exports.TimeoutError = exports.ServerError = exports.RateLimitError = exports.ParseError = exports.NotFoundError = exports.NetworkError = exports.MarketClientError = exports.HttpError = exports.ConfigError = exports.AuthRequiredError = exports.loadConfig = exports.SUBRESOURCE_IDS = exports.SUBRESOURCES = exports.PAGINATION = exports.PAGE_ROUTES = exports.DEFAULT_CONFIG = exports.parseRetryAfter = exports.normalisePair = exports.createMarketClient = exports.MarketClient = void 0;
var market_client_1 = require("./market_client");
Object.defineProperty(exports, "MarketClient", { enumerable: true, get: function () { return market_client_1.MarketClient; } });
Object.defineProperty(exports, "createMarketClient", { enumerable: true, get: function () { return market_client_1.createMarketClient; } });
Object.defineProperty(exports, "normalisePair", { enumerable: true, get: function () { return market_client_1.normalisePair; } });
Object.defineProperty(exports, "parseRetryAfter", { enumerable: true, get: function () { return market_client_1.parseRetryAfter; } });
var config_1 = require("./config");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "PAGE_ROUTES", { enumerable: true, get: function () { return config_1.PAGE_ROUTES; } });
Object.defineProperty(exports, "PAGINATION", { enumerable: true, get: function () { return config_1.PAGINATION; } });
Object.defineProperty(exports, "SUBRESOURCES", { enumerable: true, get: function () { return config_1.SUBRESOURCES; } });
Object.defineProperty(exports, "SUBRESOURCE_IDS", { enumerable: true, get: function () { return config_1.SUBRESOURCE_IDS; } });
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_1.loadConfig; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "AuthRequiredError", { enumerable: true, get: function () { return errors_1.AuthRequiredError; } });
Object.defineProperty(exports, "ConfigError", { enumerable: true, get: function () { return errors_1.ConfigError; } });
Object.defineProperty(exports, "HttpError", { enumerable: true, get: function () { return errors_1.HttpError; } });
Object.defineProperty(exports, "MarketClientError", { enumerable: true, get: function () { return errors_1.MarketClientError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return errors_1.NetworkError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_1.NotFoundError; } });
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return errors_1.ParseError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return errors_1.RateLimitError; } });
Object.defineProperty(exports, "ServerError", { enumerable: true, get: function () { return errors_1.ServerError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return errors_1.TimeoutError; } });
Object.defineProperty(exports, "httpErrorFor", { enumerable: true, get: function () { return errors_1.httpErrorFor; } });
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rate_limiter_1.RateLimiter; } });
var cache_1 = require("./cache");
Object.defineProperty(exports, "TtlCache", { enumerable: true, get: function () { return cache_1.TtlCache; } });
