// apps/exchange/lib/pair-resolver.mjs
// Slug <-> HollaEx symbol resolution. SERVER-SIDE ONLY.
//
// HollaEx Kit symbols look like `btc-usdt`. Our Indodax-mirror routes look like
// `/market/BTCIDR`. The resolution rule (from new-prompt/task.md §DISCOVERY PLAN):
//   1. strip the IDR / USDT suffix once from the end
//   2. append `-usdt`
//   3. verify the result against the HollaEx pair list
//
// The rule is deliberately quoted-currency agnostic: the internal quote is USDT
// (AGENTS.md locked decision), so every mirrored pair resolves to `<base>-usdt`
// regardless of whether the display slug ends in IDR or USDT.

const QUOTE_SUFFIXES = ['USDT', 'IDR'];

/**
 * Normalize an arbitrary slug/symbol into the uppercase alphanumeric form used
 * across the exchange (e.g. "btc-idr" -> "BTCIDR").
 * @param {string} slug
 * @returns {string}
 */
export function normalizeSlug(slug) {
  return String(slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Map a frontend slug to a HollaEx symbol.
 * @param {string} slug e.g. "ANIMEIDR", "BTCUSDT", "btc-idr"
 * @returns {string|null} e.g. "anime-usdt", or null when unresolvable
 */
export function toHollaexSymbol(slug) {
  let base = normalizeSlug(slug);
  if (!base) return null;
  for (const q of QUOTE_SUFFIXES) {
    if (base.endsWith(q) && base.length > q.length) {
      base = base.slice(0, -q.length);
      break;
    }
  }
  // A slug that is *only* a quote (e.g. "IDR") has no base asset.
  if (!base || QUOTE_SUFFIXES.includes(base)) return null;
  return `${base.toLowerCase()}-usdt`;
}

/**
 * Map a HollaEx symbol back to the display slug. USDT is the internal quote, so
 * we mirror HollaEx pairs onto the IDR display namespace by default (matching the
 * Indodax-mirror routes.json manifest).
 * @param {string} symbol e.g. "btc-usdt"
 * @param {string} [quote='IDR']
 * @returns {string|null}
 */
export function toSlug(symbol, quote = 'IDR') {
  const s = String(symbol || '').toLowerCase();
  const m = s.match(/^([a-z0-9]+)-([a-z0-9]+)$/);
  if (!m) return null;
  return `${m[1].toUpperCase()}${quote.toUpperCase()}`;
}

/**
 * Split a slug into base/quote for display purposes.
 * @param {string} slug
 * @returns {{ base: string, quote: string } | null}
 */
export function splitSlug(slug) {
  const s = normalizeSlug(slug);
  for (const q of QUOTE_SUFFIXES) {
    if (s.endsWith(q) && s.length > q.length) {
      return { base: s.slice(0, -q.length), quote: q };
    }
  }
  return null;
}

/**
 * @typedef {object} PairIndex
 * @property {Map<string,string>} slugToSymbol
 * @property {Map<string,string>} symbolToSlug
 * @property {Set<string>} symbols
 * @property {Set<string>} slugs
 * @property {boolean} verified   true when built from a live HollaEx pair list
 */

/**
 * Build a bidirectional pair index from a list of slugs and/or HollaEx symbols.
 * Slugs are normalized and mapped through {@link toHollaexSymbol}. When
 * `symbols` is provided (the verified HollaEx pair list), entries whose symbol is
 * absent are dropped and `verified` is set true.
 *
 * @param {{ slugs?: string[], symbols?: string[], quote?: string }} input
 * @returns {PairIndex}
 */
export function buildPairIndex(input = {}) {
  const quote = input.quote || 'IDR';
  const symbols = new Set((input.symbols || []).map((s) => String(s).toLowerCase()));
  const verified = symbols.size > 0;
  const slugToSymbol = new Map();
  const symbolToSlug = new Map();

  const add = (slug, symbol) => {
    if (!slug || !symbol) return;
    if (verified && !symbols.has(symbol)) return;
    slugToSymbol.set(slug, symbol);
    if (!symbolToSlug.has(symbol)) symbolToSlug.set(symbol, slug);
  };

  for (const slug of input.slugs || []) {
    const s = normalizeSlug(slug);
    add(s, toHollaexSymbol(s));
  }
  // HollaEx symbols that have no explicit slug still resolve.
  for (const symbol of symbols) {
    const slug = toSlug(symbol, quote);
    add(slug, symbol);
  }

  return {
    slugToSymbol,
    symbolToSlug,
    symbols: verified ? symbols : new Set(slugToSymbol.values()),
    slugs: new Set(slugToSymbol.keys()),
    verified,
  };
}
