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

export {
  MarketClient,
  createMarketClient,
  normalisePair,
  parseRetryAfter,
  type ClientResponse,
  type MarketClientDeps,
  type PaginatedResult,
  type PaginateOptions,
  type RequestOptions,
} from './market_client';

export {
  DEFAULT_CONFIG,
  PAGE_ROUTES,
  PAGINATION,
  SUBRESOURCES,
  SUBRESOURCE_IDS,
  loadConfig,
  type AuthMode,
  type EndpointCategory,
  type MarketClientConfig,
  type ParamSpec,
  type SubresourceSpec,
} from './config';

export {
  AuthRequiredError,
  ConfigError,
  HttpError,
  MarketClientError,
  NetworkError,
  NotFoundError,
  ParseError,
  RateLimitError,
  ServerError,
  TimeoutError,
  httpErrorFor,
  type MarketClientErrorCode,
} from './errors';

export { RateLimiter, type RateLimiterOptions } from './rate-limiter';
export { TtlCache } from './cache';

export type {
  BulkTicker,
  Candle,
  DepthResponse,
  EndpointRecord,
  ErrorEnvelope,
  HealthResponse,
  KlinesResponse,
  LevelTuple,
  ManifestResponse,
  PairDescriptor,
  PairState,
  PairsResponse,
  QuoteCurrency,
  SubresourceId,
  SubresourceResponseMap,
  TickerResponse,
  TickersResponse,
  TradesResponse,
  UniversePair,
  UniverseResponse,
} from './types';
