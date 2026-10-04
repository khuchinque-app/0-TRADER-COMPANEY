import json
import urllib.request
import sys
from datetime import datetime

BASE_MARKET = "http://localhost:22220"
BASE_API = "http://localhost:11110"

def test(name, condition, detail=""):
    if condition:
        print(f"  PASS: {name}")
        return True
    else:
        print(f"  FAIL: {name} - {detail}")
        return False

def main():
    passed = 0
    failed = 0
    
    print("=== SMOKE TEST - MARKET → TRADE ===")
    print(f"Timestamp: {datetime.utcnow().isoformat()}Z\n")
    
    # Test 1: GET /market -> 200
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/market")
        resp = urllib.request.urlopen(req)
        if test("GET /market returns 200", resp.status == 200):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: GET /market - {e}")
        failed += 1
    
    # Test 2: /market lists 477 pairs
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/api/markets/all")
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        if test("/market has 477 pairs", len(data) == 477, f"has {len(data)}"):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: /market pairs count - {e}")
        failed += 1
    
    # Test 3: GET /trade/ETHIDR -> 200
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/trade/ETHIDR")
        resp = urllib.request.urlopen(req)
        if test("GET /trade/ETHIDR returns 200", resp.status == 200):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: GET /trade/ETHIDR - {e}")
        failed += 1
    
    # Test 4: /trade/ETHIDR renders page
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/trade/ETHIDR")
        resp = urllib.request.urlopen(req)
        body = resp.read().decode()
        if test("/trade/ETHIDR renders", "trade" in body.lower()):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: /trade/ETHIDR render - {e}")
        failed += 1
    
    # Test 5: GET /trade/BTCUSDT -> 200
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/trade/BTCUSDT")
        resp = urllib.request.urlopen(req)
        if test("GET /trade/BTCUSDT returns 200", resp.status == 200):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: GET /trade/BTCUSDT - {e}")
        failed += 1
    
    # Test 6: GET /trade/FAKEXYZ shows not found
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/trade/FAKEXYZ")
        resp = urllib.request.urlopen(req)
        body = resp.read().decode()
        if test("/trade/FAKEXYZ shows not found", "Pair Not Found" in body):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: /trade/FAKEXYZ - {e}")
        failed += 1
    
    # Test 7: GET /trade/SOLIDR -> 200
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/trade/SOLIDR")
        resp = urllib.request.urlopen(req)
        if test("GET /trade/SOLIDR returns 200", resp.status == 200):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: GET /trade/SOLIDR - {e}")
        failed += 1
    
    # Test 8: FX rate endpoint
    try:
        req = urllib.request.Request(f"{BASE_API}/api/fx/usdt-idr")
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        rate = data.get("rate", 0)
        if test(f"FX rate: {rate}", rate > 0, f"rate={rate}"):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: FX rate endpoint - {e}")
        failed += 1
    
    # Test 9: FX source is indodax
    try:
        req = urllib.request.Request(f"{BASE_API}/api/fx/usdt-idr")
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        source = data.get("source", "")
        if test(f"FX source: {source}", source == "indodax", f"source={source}"):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: FX source check - {e}")
        failed += 1
    
    # Test 10: /market renders
    try:
        req = urllib.request.Request(f"{BASE_MARKET}/market")
        resp = urllib.request.urlopen(req)
        body = resp.read().decode()
        if test("/market renders", "market" in body.lower() or "table" in body.lower()):
            passed += 1
        else:
            failed += 1
    except Exception as e:
        print(f"  FAIL: /market render - {e}")
        failed += 1
    
    print(f"\n=== RESULTS: {passed} passed, {failed} failed ===")
    
    if failed > 0:
        sys.exit(1)
    
    print("=== ALL SMOKE TESTS PASSED ===")
    sys.exit(0)

if __name__ == "__main__":
    main()
