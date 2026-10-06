#!/usr/bin/env bash
set -euo pipefail
# T02 verify: Unknown trade pair shows 'Pair Not Found' (server-rendered)

echo "=== T02: Pair Not Found verification ==="

# Test with a fake pair
RESP=$(curl -sf "http://127.0.0.1:22220/trade/FAKEXYZ" 2>/dev/null || echo "")
if echo "$RESP" | grep -qi "pair not found\|not found"; then
  echo "   PASS: Pair Not Found shown for FAKEXYZ"
  echo "T02: PASS"
  exit 0
else
  echo "   FAIL: No 'Pair Not Found' in response"
  echo "   Response length: ${#RESP}"
  echo "   First 500 chars: $(echo "$RESP" | head -c 500)"
  echo "T02: FAIL"
  exit 1
fi