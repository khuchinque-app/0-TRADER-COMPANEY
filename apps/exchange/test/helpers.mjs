// apps/exchange/test/helpers.mjs — shared test utilities (no external deps).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Load a recorded HollaEx fixture by file name. */
export function fixture(name) {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8'));
}

/** Build a minimal fetch `Response`-like object. */
export function jsonResponse(obj, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => obj,
  };
}

/** A fetch that always returns the same fixture. */
export function fetchReturning(obj) {
  return async () => jsonResponse(obj);
}

/** A fetch that always fails with the given HTTP status. */
export function fetchStatus(status) {
  return async () => jsonResponse({ error: 'x' }, status);
}

/** A fetch that throws a network/timeout error. */
export function fetchThrows(name = 'TimeoutError') {
  return async () => {
    const e = new Error(name);
    e.name = name;
    throw e;
  };
}

/** A fetch returning a 200 with a body that is not valid JSON. */
export function fetchMalformed() {
  return async () => ({
    status: 200,
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  });
}

/** A controllable clock. */
export function clock(start = 0) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => {
    t += ms;
    return t;
  };
  now.set = (v) => {
    t = v;
    return t;
  };
  return now;
}
