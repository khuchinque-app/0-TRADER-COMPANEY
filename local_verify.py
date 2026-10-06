#!/usr/bin/env python3
"""
Local autopilot launcher - runs tasks against VPS backend API
"""
import json
import urllib.request
import urllib.error
import sys
from pathlib import Path

VPS_BACKEND = "http://187.127.178.20:11110"
VPS_TERMINAL = "http://187.127.178.20:22220"

def api_get(path):
    """GET request to VPS backend"""
    try:
        url = f"{VPS_BACKEND}{path}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def api_post(path, data=None):
    """POST request to VPS backend"""
    try:
        url = f"{VPS_BACKEND}{path}"
        body = json.dumps(data).encode() if data else b'{}'
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def test_health():
    """Test VPS backend health"""
    print("=" * 50)
    print("VPS Backend Health Check")
    print("=" * 50)
    result = api_get("/api/health")
    print(f"Health: {result}")
    return "error" not in result

def test_auth():
    """Test auth endpoints"""
    print("\n" + "=" * 50)
    print("Auth Endpoint Tests")
    print("=" * 50)
    
    # Seed
    seed_result = api_post("/api/auth/seed")
    print(f"Seed: {seed_result}")
    
    # Login
    login_result = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
    print(f"Login: {login_result}")
    
    return "token" in login_result

def test_ticker():
    """Test ticker endpoint"""
    print("\n" + "=" * 50)
    print("Ticker Endpoint Test")
    print("=" * 50)
    result = api_get("/api/ticker/BTCIDR")
    print(f"BTCIDR ticker: {result}")
    return "error" not in result and "last" in result

def test_terminal():
    """Test terminal endpoint"""
    print("\n" + "=" * 50)
    print("Terminal Endpoint Test")
    print("=" * 50)
    try:
        url = f"{VPS_TERMINAL}/api/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            print(f"Terminal health: {result}")
            return True
    except Exception as e:
        print(f"Terminal error: {e}")
        return False

def main():
    print("\n" + "=" * 60)
    print("  AUTOPILOT LOCAL VERIFICATION")
    print("  VPS: 187.127.178.20")
    print("  Backend: 11110, Terminal: 22220")
    print("=" * 60)
    
    results = {
        "health": test_health(),
        "auth": test_auth(),
        "ticker": test_ticker(),
        "terminal": test_terminal(),
    }
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for test, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {test}: {status}")
    
    all_pass = all(results.values())
    print(f"\nOverall: {'ALL PASSED' if all_pass else 'SOME FAILED'}")
    
    return 0 if all_pass else 1

if __name__ == "__main__":
    sys.exit(main())