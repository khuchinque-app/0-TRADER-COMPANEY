#!/usr/bin/env python3
"""Verify the COMPREHENSIVE_PROJECT_PROMPT.md build on VPS 187.127.178.20.

Checks (from Part C2 acceptance + ops rules):
 - :22221 root, static routes, pair pages -> 200; FAKEXYZ -> 404; NO_FEED pair -> 200+data-state
 - robots.txt Disallow: / ; noindex meta ; SIMULASI banner
 - backend :11110 /api/market/* endpoints
 - route parity sample -> no 5xx
"""
import json, re, sys, urllib.request

HOST = "187.127.178.20"
EXCH = f"http://{HOST}:22221"
BE = f"http://{HOST}:11110"

def get(url, method="GET"):
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read(200000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(2000).decode("utf-8", "replace")
    except Exception as e:
        return None, str(e)

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'} | {name} | {detail}")

# 1. Root page
st, body = get(EXCH + "/")
check("root 200", st == 200, f"status={st}")
check("SIMULASI banner", "SIMULASI" in body.upper())
check("noindex meta", "noindex" in body.lower())

# 2. robots.txt
st, body = get(EXCH + "/robots.txt")
check("robots.txt Disallow: /", st == 200 and "Disallow: /" in body, f"status={st}")

# 3. Static routes from manifest (known from repo routes.json)
for p in ["/market", "/trade_api", "/affiliate", "/privacy-policy"]:
    st, _ = get(EXCH + p)
    check(f"static {p} 200", st == 200, f"status={st}")

# 4. Pair pages
for p in ["/market/BTCIDR", "/market/depth_chart/BTCIDR", "/chart/BTCIDR", "/market/BTCUSDT"]:
    st, _ = get(EXCH + p)
    check(f"{p} 200", st == 200, f"status={st}")

# 5. 404 for unknown slug
st, _ = get(EXCH + "/market/FAKEXYZ")
check("/market/FAKEXYZ -> 404", st == 404, f"status={st}")

# 6. Backend market API
st, body = get(BE + "/api/market/health")
ok = st == 200 and '"ok":true' in body.replace(" ", "")
check("/api/market/health", ok, body[:120])

st, body = get(BE + "/api/market/depth/BTCIDR?limit=20")
try:
    d = json.loads(body); ok = bool(d.get("bids")) and bool(d.get("asks"))
except Exception:
    ok = False
check("/api/market/depth/BTCIDR bids+asks", st == 200 and ok)

st, body = get(BE + "/api/market/tickers")
try:
    d = json.loads(body)
    rows = d.get("tickers", d if isinstance(d, list) else [])
    ok = len(rows) > 0
except Exception:
    ok = False
check("/api/market/tickers rows>0", st == 200 and ok, f"rows={len(rows) if ok else 'n/a'}")

st, body = get(BE + "/api/market/klines/BTCIDR?interval=1m&limit=5")
try:
    d = json.loads(body); ok = len(d.get("klines", [])) > 0
except Exception:
    ok = False
check("/api/market/klines/BTCIDR", st == 200 and ok)

st, body = get(BE + "/api/market/trades/BTCIDR?limit=5")
try:
    d = json.loads(body); ok = len(d.get("trades", [])) > 0
except Exception:
    ok = False
check("/api/market/trades/BTCIDR", st == 200 and ok)

st, body = get(BE + "/api/market/pairs")
nofeed_slug = None
try:
    d = json.loads(body)
    pairs = d.get("pairs", d if isinstance(d, list) else [])
    live = sum(1 for p in pairs if p.get("state") == "LIVE")
    nf = [p["slug"] for p in pairs if p.get("state") == "NO_FEED"]
    nofeed_slug = nf[0] if nf else None
    ok = len(pairs) > 400 and live > 0 and nofeed_slug
except Exception:
    ok = False
check("/api/market/pairs manifest+states", st == 200 and ok, f"live={live}, no_feed example={nofeed_slug}")

# 7. NO_FEED page renders 200 with data-state="no-feed"
if nofeed_slug:
    st, body = get(EXCH + f"/market/{nofeed_slug}")
    check(f"NO_FEED page {nofeed_slug} 200+data-state", st == 200 and 'data-state="no-feed"' in body, f"status={st}")

# 8. Route parity sample (spread across manifest)
try:
    import subprocess
    # fetch routes.json via backend pairs is not enough; use sampled slugs from pairs call
    st, body = get(BE + "/api/market/pairs")
    d = json.loads(body); pairs = d.get("pairs", [])
    sample = [pairs[i]["slug"] for i in range(0, len(pairs), max(1, len(pairs)//25))]
    bad = []
    for s in sample:
        stt, _ = get(EXCH + f"/market/{s}")
        if stt is None or stt >= 500:
            bad.append((s, stt))
    check("route parity sample: 0 x 5xx", len(bad) == 0, f"sampled={len(sample)}, bad={bad[:3]}")
except Exception as e:
    check("route parity sample", False, str(e))

fails = [r for r in results if not r[1]]
print(f"\nTOTAL: {len(results)} checks, {len(fails)} failed")
sys.exit(1 if fails else 0)
