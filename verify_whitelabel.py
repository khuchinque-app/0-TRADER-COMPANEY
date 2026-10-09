#!/usr/bin/env python3
"""Acceptance check: whitelabel backend (11110) + login frontend (22221). Run from anywhere with VPS access."""
import json, urllib.request, sys

VPS = "http://187.127.178.20"
BE, FE = f"{VPS}:11110", f"{VPS}:22221"
ok = fail = 0

def req(url, method="GET", data=None, headers=None):
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, method=method,
                               headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"{}")
        except Exception: return e.code, {}

def check(name, cond):
    global ok, fail
    print(("PASS " if cond else "FAIL ") + name)
    ok += cond; fail += (not cond)

# --- Backend whitelabel API ---
s, brand = req(f"{BE}/api/brand")
check("public GET /api/brand -> 200", s == 200)
check("brand has all 10 whitelabel fields", all(k in brand for k in
      ["name","tagline","logoText","logoAccent","supportEmail","supportUrl","colorUp","colorDown","theme","announcement"]))

s, d = req(f"{BE}/api/admin/login", "POST", {"password": "admin1"})
check("admin login POST /api/admin/login -> ok+token", s == 200 and d.get("ok") and "token" in d)
tok = d.get("token", "")
H = {"Authorization": "Bearer " + tok}

s, d = req(f"{BE}/api/admin/whitelabel", headers=H)
check("authed GET /api/admin/whitelabel -> 200 w/ brand", s == 200 and "brand" in d)

orig_tag = brand["tagline"]
s, d = req(f"{BE}/api/admin/whitelabel", "PUT", {"brand": {"tagline": "WL-VERIFY-TMP"}}, H)
check("authed PUT whitelabel -> ok", s == 200 and d.get("ok"))
s, d = req(f"{BE}/api/brand")
check("public /api/brand reflects PUT immediately", d.get("tagline") == "WL-VERIFY-TMP")
req(f"{BE}/api/admin/whitelabel", "PUT", {"brand": {"tagline": orig_tag}}, H)
s, d = req(f"{BE}/api/brand")
check("restore original tagline works", d.get("tagline") == orig_tag)

s, _ = req(f"{BE}/api/admin/whitelabel")
check("unauthed GET whitelabel -> 403", s == 403)
s, _ = req(f"{BE}/api/admin/whitelabel", "PUT", {"brand": {"name": "HACK"}})
check("unauthed PUT whitelabel -> 403", s == 403)
s, _ = req(f"{BE}/api/admin/whitelabel", "PUT", {"brand": {"theme": "neon"}}, H)
check("invalid theme rejected -> 400", s == 400)

# --- Frontend: login pages + admin console served by exchange app ---
import re
for path in ["/akun/masuk", "/akun/daftar", "/admin", "/akun/admin"]:
    try:
        with urllib.request.urlopen(FE + path, timeout=15) as resp:
            html = resp.read().decode()
        check(f"frontend {path} -> 200 HTML SPA", resp.status == 200 and "<div id=\"root\"" in html)
    except Exception as e:
        check(f"frontend {path} reachable ({e})", False)

m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
js = urllib.request.urlopen(FE + m.group(1), timeout=20).read().decode() if m else ""
check("bundle contains LoginPage (/api/auth/login)", "/api/auth/login" in js)
check("bundle contains admin login (/api/admin/login)", "/api/admin/login" in js)
check("bundle contains whitelabel editor (/api/admin/whitelabel)", "/api/admin/whitelabel" in js)
check("bundle reads live brand on boot (/api/brand)", "/api/brand" in js)

print(f"\n{ok}/{ok+fail} PASS")
sys.exit(0 if fail == 0 else 1)
