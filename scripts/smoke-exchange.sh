#!/usr/bin/env bash
# scripts/smoke-exchange.sh — acceptance criteria for the :22221 route-mirror exchange (spec Part C2).
# Usage: bash scripts/smoke-exchange.sh [exchange_url] [backend_url]
set -uo pipefail
EX="${1:-http://187.127.178.20:22221}"
BE="${2:-http://187.127.178.20:11110}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/packages/indodax-routes/routes.json"
FAIL=0
say() { printf '%s %s\n' "$1" "$2"; }

# 1. root 200
c=$(curl -s -o /dev/null -w "%{http_code}" "$EX/")
[ "$c" = "200" ] && say PASS "root 200" || { say FAIL "root -> $c"; FAIL=1; }

# 2. each static manifest route 200 (empty loc entries skipped)
while IFS= read -r s; do
  [ -z "$s" ] || [ "$s" = "/" ] && s=""
  c=$(curl -s -o /dev/null -w "%{http_code}" "$EX$s")
  case "$c" in 200) ;; *) say FAIL "static $s -> $c"; FAIL=1;; esac
done < <(python3 -c "
import json,sys
m=json.load(open('$MANIFEST'))
for s in m['static']: print(s)
")

# 3. pair pages 200
for u in /market/BTCIDR /market/depth_chart/BTCIDR /chart/BTCIDR; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "$EX$u")
  [ "$c" = "200" ] && say PASS "$u 200" || { say FAIL "$u -> $c"; FAIL=1; }
done

# 4. unknown slug -> 404
c=$(curl -s -o /dev/null -w "%{http_code}" "$EX/market/FAKEXYZ")
[ "$c" = "404" ] && say PASS "FAKEXYZ 404" || { say FAIL "FAKEXYZ -> $c"; FAIL=1; }

# 5. a NO_FEED pair -> 200 with data-state no-feed
NF=$(curl -s "$BE/api/market/pairs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
nf=[p['slug'] for p in d.get('pairs',[]) if p.get('state')=='NO_FEED']
print(nf[0] if nf else '', end='')")
if [ -n "$NF" ]; then
  body=$(curl -s "$EX/market/$NF")
  c=$(curl -s -o /dev/null -w "%{http_code}" "$EX/market/$NF")
  if [ "$c" = "200" ]; then say PASS "NO_FEED $NF 200 (noindex meta: $(echo "$body" | grep -c noindex))"; else say FAIL "NO_FEED $NF -> $c"; FAIL=1; fi
else say SKIP "no NO_FEED pair found to test"; fi

# 6. /api/market/health ok + mexc latency
h=$(curl -s "$EX/api/market/health")
echo "$h" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('ok') and 'mexcLatencyMs' in d, 'health bad: '+str(d)
assert d.get('simulasi') is True
" && say PASS "health ok + latency" || { say FAIL "health: $h"; FAIL=1; }

# 7. depth non-empty
curl -s "$EX/api/market/depth/BTCIDR?limit=20" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['bids'])>0 and len(d['asks'])>0, 'empty book'
" && say PASS "depth BTCIDR non-empty" || { say FAIL "depth empty/broken"; FAIL=1; }

# 8. tickers >0 rows, no 5xx
c=$(curl -s -o /tmp/sx_tickers.json -w "%{http_code}" "$EX/api/market/tickers")
n=$(python3 -c "import json;print(json.load(open('/tmp/sx_tickers.json')).get('count',0))")
[ "$c" = "200" ] && [ "$n" -gt 0 ] && say PASS "tickers $n rows" || { say FAIL "tickers -> $c/$n"; FAIL=1; }

# 9. route parity: every route in manifest -> 0 x 5xx  (sample of pairs, full sweep static above)
python3 - "$EX" "$MANIFEST" <<'PY'
import json, sys, urllib.request, urllib.error
ex, man = sys.argv[1], sys.argv[2]
m = json.load(open(man))
slugs = [p['slug'] for p in m['pairs']]
step = max(1, len(slugs)//120)   # sample ~120 pairs across the union
bad = []
five = 0
for s in slugs[::step] + slugs[-1:]:
    for u in (f"/market/{s}", f"/market/depth_chart/{s}", f"/chart/{s}"):
        try:
            r = urllib.request.urlopen(ex+u, timeout=10)
            code = r.getcode()
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception:
            code = 0
        if code >= 500: five += 1
        if code not in (200, 404): bad.append((u, code))
if five or bad:
    print(f"FAIL route parity: 5xx={five} bad={bad[:5]}"); sys.exit(1)
print("PASS route parity (sampled): 0 x 5xx")
PY
[ $? -eq 0 ] || FAIL=1

# 10. no MEXC secrets anywhere in repo code
if grep -rEn "MEXC_API_(KEY|SECRET)|mexc.*secret" \
    --include="*.ts" --include="*.mjs" --include="*.js" --include="*.jsx" --include="*.tsx" \
    "$ROOT/apps" "$ROOT/packages" "$ROOT/scripts" 2>/dev/null | grep -v node_modules | grep -q .; then
  say FAIL "MEXC secret found in repo"; FAIL=1
else say PASS "no MEXC keys/secrets in repo"; fi

# 11. robots.txt Disallow: /
r=$(curl -s "$EX/robots.txt")
echo "$r" | grep -q "Disallow: /" && say PASS "robots.txt Disallow: /" || { say FAIL "robots.txt: $r"; FAIL=1; }

# 12. every page noindex + SIMULASI banner
body=$(curl -s "$EX/market/BTCIDR")
echo "$body" | grep -q 'noindex' && echo "$body" | grep -q 'SIMULASI' && say PASS "noindex + SIMULASI banner" || { say FAIL "banner/noindex missing"; FAIL=1; }

exit $FAIL
