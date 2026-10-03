#!/usr/bin/env python3
import subprocess
import json
import sys

login_data = json.dumps({"email": "chinque@dev.local", "password": "TestTrader2026!"})
tests = []

# Test 1: Health
resp = subprocess.run(["curl", "-s", "http://localhost:11110/health"], capture_output=True, text=True)
tests.append(("health", "ok" in resp.stdout))

# Test 2: Login
resp = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:11110/api/auth/login",
                       "-H", "Content-Type: application/json", "-d", login_data],
                      capture_output=True, text=True)
token = json.loads(resp.stdout).get("token", "") if "ok" in resp.stdout else ""
tests.append(("login", "ok" in resp.stdout))

# Test 3: Auth/me
me_resp = ""
if token:
    resp = subprocess.run(["curl", "-s", "http://localhost:11110/api/auth/me",
                           "-H", f"Authorization: Bearer {token}"],
                          capture_output=True, text=True)
    me_resp = resp.stdout
tests.append(("me", "chinque@dev.local" in me_resp))

# Test 4: Markets
resp = subprocess.run(["curl", "-s", "http://localhost:11110/api/markets"], capture_output=True, text=True)
tests.append(("markets", "markets" in resp.stdout))

# Test 5: Terminal proxy
resp = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:22220/api/auth/login",
                       "-H", "Content-Type: application/json", "-d", login_data],
                      capture_output=True, text=True)
tests.append(("terminal", "ok" in resp.stdout))

# Print results
print("=== SMOKE TEST RESULTS ===")
all_pass = all(r[1] for r in tests)
for name, passed in tests:
    status = "PASS" if passed else "FAIL"
    print(f"[{name}] {status}")
print()
if all_pass:
    print("=== ALL SMOKE TESTS PASSED ===")
    sys.exit(0)
else:
    print("=== SOME SMOKE TESTS FAILED ===")
    sys.exit(1)
