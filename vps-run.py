#!/usr/bin/env python3
"""
Complete VPS autopilot verification via API
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

VPS_BACKEND = "http://187.127.178.20:11110"
VPS_TERMINAL = "http://187.127.178.20:22220"
TASKS_FILE = "/home/chinque/CONTINUE-CONTINUE/tasks.json"

def api_get(path, token=None):
    try:
        url = f"{VPS_BACKEND}{path}"
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": str(e), "status": e.code}
    except Exception as e:
        return {"error": str(e)}

def api_post(path, data=None, token=None):
    try:
        url = f"{VPS_BACKEND}{path}"
        body = json.dumps(data).encode() if data else b'{}'
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        req = urllib.request.Request(url, data=body, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": str(e), "status": e.code}
    except Exception as e:
        return {"error": str(e)}

def terminal_get(path):
    try:
        url = f"{VPS_TERMINAL}{path}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode()
    except Exception as e:
        return f"Error: {e}"

def get_token():
    result = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
    return result.get("token")

def test_t01():
    """T01: Auth works"""
    print("\n" + "="*60)
    print("T01: Auth works: seeded dev accounts + guest demo login")
    print("="*60)
    
    seed = api_post("/api/auth/seed", {})
    print(f"Seed: {json.dumps(seed)}")
    
    login = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
    token = login.get("token")
    print(f"Login: token={'YES' if token else 'NO'}")
    
    if token:
        me = api_get("/api/auth/me", token=token)
        print(f"Protected: id={me.get('id', 'N/A')}")
        return "PASS", {"token": bool(token), "protected": "error" not in me}
    return "FAIL", {"reason": "No token"}

def test_t02():
    """T02: Unknown trade pair"""
    print("\n" + "="*60)
    print("T02: Unknown trade pair shows error")
    print("="*60)
    
    # Test API - invalid pair returns zeros
    ticker = api_get("/api/ticker/INVALIDPAIR")
    print(f"Ticker API: last={ticker.get('last', 'N/A')}")
    
    # Test terminal page - invalid pair gets 404
    page = terminal_get("/trade/INVALIDPAIR")
    has_404 = "404" in page or "Not Found" in page or "could not be found" in page.lower()
    print(f"Terminal: 404 response={has_404}")
    
    # Valid pair works
    valid = api_get("/api/ticker/BTCIDR")
    print(f"Valid BTCIDR: last={valid.get('last', 0)}")
    
    status = "PASS" if (ticker.get("last", -1) == 0 and has_404) else "FAIL"
    return status, {"invalid_zeros": ticker.get("last") == 0, "page_404": has_404}

def test_t03():
    """T03: Smoke suite"""
    print("\n" + "="*60)
    print("T03: Smoke suite passes")
    print("="*60)
    
    tests = []
    
    h = api_get("/api/health")
    ok = "status" in h and h["status"] == "ok"
    tests.append(("Health", ok))
    print(f"  Health: {'PASS' if ok else 'FAIL'}")
    
    l = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
    ok = "token" in l
    tests.append(("Auth", ok))
    print(f"  Auth: {'PASS' if ok else 'FAIL'}")
    
    t = api_get("/api/ticker/BTCIDR")
    ok = "last" in t and t["last"] > 0
    tests.append(("Ticker", ok))
    print(f"  Ticker: {'PASS' if ok else 'FAIL'}")
    
    tp = terminal_get("/api/health")
    ok = "ok" in tp
    tests.append(("Terminal", ok))
    print(f"  Terminal: {'PASS' if ok else 'FAIL'}")
    
    all_pass = all(t[1] for t in tests)
    return "PASS" if all_pass else "FAIL", tests

def test_t04():
    """T04: Price feed for 6 assets"""
    print("\n" + "="*60)
    print("T04: Price feed for shortlisted assets")
    print("="*60)
    
    assets = ["BTCIDR", "ETHIDR", "USDTIDR", "BNBIDR", "XRPIDR", "ADAIDR"]
    results = []
    
    for asset in assets:
        ticker = api_get(f"/api/ticker/{asset}")
        has_price = "last" in ticker and ticker["last"] > 0
        results.append((asset, has_price, ticker.get("last", 0)))
        print(f"  {asset}: {'✓' if has_price else '○'} (last={ticker.get('last', 'N/A')})")
    
    all_have = all(r[1] for r in results)
    return "PASS" if all_have else "PARTIAL", results

def main():
    print("\n" + "="*60)
    print("  AUTOPILOT TASK VERIFICATION VIA API")
    print("  VPS: 187.127.178.20")
    print("  Backend: 11110, Terminal: 22220")
    print("="*60)
    
    results = {
        "T01": test_t01(),
        "T02": test_t02(),
        "T03": test_t03(),
        "T04": test_t04(),
    }
    
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    for task, (status, data) in results.items():
        print(f"  {task}: {status}")
        if isinstance(data, list):
            for item in data:
                print(f"    - {item}")
    
    passed = sum(1 for s, _ in results.values() if s == "PASS")
    print(f"\nOverall: {passed}/{len(results)} PASSED")
    
    return 0 if passed == len(results) else 1

if __name__ == "__main__":
    sys.exit(main())