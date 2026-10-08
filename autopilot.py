#!/usr/bin/env python3
"""
autopilot.py - never-stop task driver for 0-TRADER-COMPANEY (Simulasi Exchange).

Design (why it does not stall like the chat agents do):
  * The LOOP is plain Python, not an LLM. It cannot "forget", ask "Lanjut?" or run out of context.
  * State lives in files (tasks.json = what, state.json = progress, TASKS.md = human checklist).
  * "Done" is decided ONLY by an exit code from a verify command, never by what an agent claims.
  * Engines (hermes profiles, gemini-cli, opencode ...) are interchangeable. Rate limit / dead key /
    timeout on one -> cooldown it, hand the SAME working tree to the next one. No attempt is burned.
  * If every engine is cooling down, it sleeps until the first one comes back. It never exits
    until the goal task passes (or you touch autopilot/STOP).

Run:    python3 autopilot/autopilot.py
Test:   python3 autopilot/autopilot.py --selftest      (checks each engine CLI actually works)
Stop:   touch autopilot/STOP
Reset:  rm autopilot/state.json
Env:    AP_REPO (repo path), TG_TOKEN + TG_CHAT (optional Telegram progress pings)
"""
import fcntl
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(os.environ.get("AP_REPO", "/home/khuchinque/0-TRADER-COMPANEY")).resolve()
AP = ROOT / "autopilot"
F_TASKS, F_ENG, F_STATE, F_MD = AP / "tasks.json", AP / "engines.json", AP / "state.json", AP / "TASKS.md"
F_PROMPT, F_STOP, LOGS, VERIFY_DIR = AP / "prompt.md", AP / "STOP", AP / "logs", AP / "verify"
F_BEAT = AP / "heartbeat"

MAX_FAILS = int(os.environ.get("AP_MAX_FAILS", "4"))          # real failures per task before BLOCKED
RESCUE_WAIT = int(os.environ.get("AP_RESCUE_WAIT", "1800"))   # seconds between rescue passes
VERIFY_TIMEOUT = int(os.environ.get("AP_VERIFY_TIMEOUT", "300"))
DEPLOY_TIMEOUT = int(os.environ.get("AP_DEPLOY_TIMEOUT", "900"))

RATE_RE = re.compile(
    r"(rate[\s_-]?limit|\b429\b|too many requests|quota|resource[\s_-]?exhausted|overloaded|"
    r"at capacity|try again (in|later)|usage limit|exceeded.{0,40}(limit|quota)|throttl)", re.I)
DEAD_RE = re.compile(
    r"(invalid api key|incorrect api key|api key.{0,20}(invalid|expired|revoked)|unauthori[sz]ed|\b401\b|"
    r"\b402\b|payment required|insufficient[\s_-]?(credit|balance|quota|funds)|credit balance|"
    r"billing|daily (limit|quota)|per day|out of credits)", re.I)
MARKER_RE = re.compile(r"^\s*AUTOPILOT_RESULT:\s*(DONE|BLOCKED)\b(.*)$", re.M)

S = {"tasks": {}, "engines": {}, "rescues": 0, "branch_ready": False}
_last_note = {}
_all_down_notified = False


# ----------------------------------------------------------------------------- utils
def ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log(msg):
    line = f"[{ts()}] {msg}"
    print(line, flush=True)
    try:
        LOGS.mkdir(parents=True, exist_ok=True)
        with open(LOGS / "autopilot.log", "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def notify(msg):
    log("NOTIFY " + msg.replace("\n", " | "))
    tok, chat = os.environ.get("TG_TOKEN"), os.environ.get("TG_CHAT")
    if not (tok and chat) or time.time() - _last_note.get(msg, 0) < 60:
        return
    _last_note[msg] = time.time()
    try:
        data = urllib.parse.urlencode({"chat_id": chat, "text": ("autopilot: " + msg)[:3900]}).encode()
        urllib.request.urlopen(f"https://api.telegram.org/bot{tok}/sendMessage", data, timeout=15)
    except Exception as e:
        log(f"telegram failed: {e}")


def start_heartbeat():
    """Touch autopilot/heartbeat every 30s from a thread, even while an engine runs for 30 min.
    watchdog.sh (on the VPS or on the local machine) restarts the runner if this goes stale."""
    def beat():
        while True:
            try:
                F_BEAT.write_text(f"{int(time.time())} {datetime.now():%H:%M:%S}\n")
            except Exception:
                pass
            time.sleep(30)
    threading.Thread(target=beat, daemon=True).start()


def load(path, default):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def save():
    tmp = F_STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(S, indent=1))
    tmp.replace(F_STATE)
    try:
        render()
    except Exception as e:
        log(f"render failed: {e}")


def sh(cmd, timeout, extra_env=None):
    """Run a shell command in the repo. Returns (rc, output). rc 124 = timeout."""
    env = os.environ.copy()
    env["AP_REPO"] = str(ROOT)
    env.update(extra_env or {})
    p = subprocess.Popen(["bash", "-lc", cmd], cwd=ROOT, env=env, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True, errors="replace", start_new_session=True)
    try:
        out, _ = p.communicate(timeout=timeout)
        return p.returncode, out or ""
    except subprocess.TimeoutExpired:
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except Exception:
            pass
        out = ""
        try:
            out, _ = p.communicate(timeout=10)
        except Exception:
            pass
        return 124, (out or "") + "\n[autopilot] TIMEOUT"


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)


def nap(seconds):
    """Interruptible sleep. Returns True if STOP was requested."""
    end = time.time() + seconds
    while time.time() < end:
        if F_STOP.exists():
            return True
        time.sleep(min(5, max(0, end - time.time())))
    return False


# ----------------------------------------------------------------------------- engines
def engines():
    out = []
    for e in load(F_ENG, {"engines": []}).get("engines", []):
        if e.get("enabled", True) and shutil.which(e.get("bin", e["name"])):
            out.append(e)
    return out


def estate(name):
    return S["engines"].setdefault(name, {"until": 0, "fails": 0, "unk": 0})


def choose_engine(avoid=None):
    ready = [e for e in engines() if estate(e["name"])["until"] <= time.time()]
    if not ready:
        return None
    for e in ready:
        if e["name"] != avoid:
            return e
    return ready[0]


def cooldown_for(kind, out, E):
    if kind == "dead":
        return 6 * 3600
    m = re.search(r"retry[- ]after\D{0,5}(\d+)", out, re.I)
    if m:
        secs = int(m.group(1))
    else:
        m = re.search(r"(?:try again|retry|resets?)\D{0,25}(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b", out, re.I)
        if m:
            secs = int(m.group(1)) * {"s": 1, "m": 60, "h": 3600}[m.group(2)[0].lower()]
        else:
            secs = 900 * 2 ** min(E["fails"], 4)
    return int(min(max(secs + 30, 60), 8 * 3600))


def classify(rc, out):
    """ok | rate | dead | timeout | unknown   (marker in the LAST lines beats any error text)"""
    tail_lines = out.strip().splitlines()[-15:]
    if MARKER_RE.search("\n".join(tail_lines)):
        return "ok"
    if rc == 124:
        return "timeout"
    tail = out[-4000:]
    if DEAD_RE.search(tail):
        return "dead"
    if RATE_RE.search(tail):
        return "rate"
    return "unknown"


# ----------------------------------------------------------------------------- git / prompt
def preflight():
    if git("rev-parse", "--is-inside-work-tree").returncode != 0:
        sys.exit(f"{ROOT} is not a git repo")
    exc = ROOT / ".git" / "info" / "exclude"
    have = exc.read_text() if exc.exists() else ""
    add = [p for p in ["autopilot/", ".env", ".env.*", "**/ledger.db*"] if p not in have.splitlines()]
    if add:
        exc.parent.mkdir(exist_ok=True)
        with open(exc, "a") as f:
            f.write("\n# autopilot\n" + "\n".join(add) + "\n")
    cur = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    if not cur.startswith("autopilot/"):
        exists = git("rev-parse", "--verify", "autopilot/sim").returncode == 0
        r = git("checkout", "autopilot/sim") if exists else git("checkout", "-b", "autopilot/sim")
        log(f"branch {cur} -> autopilot/sim ({'existing' if exists else 'new'}) rc={r.returncode} {r.stderr.strip()}")
    if not engines():
        sys.exit("no usable engine CLI found on PATH - edit autopilot/engines.json, run --selftest")
    log(f"engines available: {[e['name'] for e in engines()]}")


def handoff(t, st):
    parts = []
    if st.get("note"):
        parts.append("Runner note: " + st["note"])
    if st.get("last_verify_tail"):
        parts.append("Last verify/deploy output (tail):\n" + st["last_verify_tail"])
    if st.get("rescue"):
        parts.append("RESCUE PASS: earlier attempts failed. Check `git stash list` for 'autopilot-blocked-" + t["id"]
                     + "' and inspect/apply it if useful. Try a different approach than before.")
    ds = git("status", "--short").stdout.strip().splitlines()[:25]
    if ds:
        parts.append("Working tree currently has uncommitted work (maybe from a previous agent):\n" + "\n".join(ds))
    done = [x for x, v in S["tasks"].items() if v["status"] == "done"]
    parts.append("Already done tasks: " + (", ".join(done) or "none"))
    return "\n\n".join(parts)[:7000]


def build_prompt(t, st):
    spec = t["spec"] if isinstance(t["spec"], str) else "\n".join(t["spec"])
    p = F_PROMPT.read_text()
    for k, v in {"TASK_ID": t["id"], "TITLE": t["title"], "SPEC": spec,
                 "VERIFY": t["verify"], "HANDOFF": handoff(t, st)}.items():
        p = p.replace("{{" + k + "}}", v)
    return p


def snapshot_guard(skip_path):
    snap = {}
    files = [f for f in VERIFY_DIR.glob("*") if f.is_file()] + [AP / "autopilot.py"]
    for f in files:
        if skip_path and f.resolve() == skip_path.resolve():
            continue
        snap[f] = f.read_bytes()
    return snap


def restore_guard(snap):
    for f, data in snap.items():
        try:
            if not f.exists() or f.read_bytes() != data:
                f.write_bytes(data)
                log(f"GUARD restored {f.name} (an agent changed a protected file)")
        except Exception as e:
            log(f"guard failed for {f}: {e}")


def lint_agent_verify(t):
    path = ROOT / t["verify"].split()[-1]
    if not path.exists():
        return False, f"{t['verify']} does not exist - this task requires you to create it."
    body = [l for l in path.read_text().splitlines() if l.strip() and not l.strip().startswith("#")]
    text = "\n".join(body)
    if len(body) < 4 or not re.search(r"(curl|sqlite3|jq|grep|node|npm|npx|playwright)", text) \
            or not re.search(r"(set -e|exit 1|\|\| *exit|\|\| *\{)", text):
        return False, "verify script looks fake/too thin (needs real curl/sqlite3/jq/grep assertions that fail with non-zero exit)."
    return True, ""


def verify(t):
    if t.get("agent_writes_verify"):
        ok, why = lint_agent_verify(t)
        if not ok:
            return False, "VERIFY LINT: " + why
    if (AP / "deploy.sh").exists() and not t.get("no_deploy"):
        rc, o = sh("bash autopilot/deploy.sh", DEPLOY_TIMEOUT)
        if rc != 0:
            return False, "DEPLOY/BUILD FAILED:\n" + o[-2000:]
    rc, o = sh(t["verify"], VERIFY_TIMEOUT)
    return rc == 0, o[-2500:]


def commit(t, engine):
    git("add", "-A")
    git("-c", "user.name=autopilot", "-c", "user.email=autopilot@local", "commit", "--no-verify",
        "-m", f"autopilot({t['id']}): {t['title']} [{engine}]")


# ----------------------------------------------------------------------------- core
def work(t):
    global _all_down_notified
    tid, st = t["id"], S["tasks"][t["id"]]
    eng = choose_engine(avoid=st.get("last_engine") if st["fails"] else None)
    if eng is None:
        cds = [estate(e["name"])["until"] for e in engines()]
        wake = min(cds) if cds else time.time() + 60
        if not _all_down_notified:
            notify(f"all engines cooling down; resuming at {datetime.fromtimestamp(wake):%H:%M:%S}. Task {tid} waits.")
            _all_down_notified = True
        nap(max(5, min(60, wake - time.time())))
        return
    _all_down_notified = False

    LOGS.mkdir(parents=True, exist_ok=True)
    prompt = build_prompt(t, st)
    pf = LOGS / f"{tid}.prompt.md"
    pf.write_text(prompt)
    own = (ROOT / t["verify"].split()[-1]) if t.get("agent_writes_verify") else None
    snap = snapshot_guard(own)

    log(f">>> {tid} '{t['title']}' via {eng['name']} (fails so far {st['fails']})")
    rc, out = sh(eng["cmd"], eng.get("timeout", 1800), {"PROMPT_FILE": str(pf)})
    restore_guard(snap)
    stamp = datetime.now().strftime("%H%M%S")
    (LOGS / f"{tid}.{stamp}.{eng['name']}.log").write_text(out)
    st["last_engine"] = eng["name"]
    E = estate(eng["name"])
    kind = classify(rc, out)
    log(f"    engine finished rc={rc} kind={kind}")

    if kind in ("rate", "dead"):
        cd = cooldown_for(kind, out, E)
        E["fails"] += 1
        E["until"] = time.time() + cd
        st["note"] = f"{eng['name']} hit a {kind} limit mid-task and stopped. Working tree may hold partial work - continue it, do not restart from scratch."
        others = [e["name"] for e in engines() if estate(e["name"])["until"] <= time.time()]
        notify(f"{eng['name']} {kind}-limited, cooldown {cd // 60}m. {tid} continues on: {others or 'nobody ready - waiting'}")
        save()
        return  # no attempt burned

    ok, vout = verify(t)
    if ok:
        commit(t, eng["name"])
        st.update(status="done", engine=eng["name"], note="", last_verify_tail="", rescue=False)
        E["fails"] = E["unk"] = 0
        notify(f"DONE {tid} {t['title']} (by {eng['name']})")
        save()
        return

    st["fails"] += 1
    st["last_verify_tail"] = vout[-1800:]
    if kind in ("timeout", "unknown"):
        E["unk"] += 1
        if E["unk"] >= 3:
            E["until"] = time.time() + 1200
            E["unk"] = 0
            notify(f"{eng['name']} failed 3x without a clear result; resting it 20m")
    mk = MARKER_RE.search("\n".join(out.strip().splitlines()[-15:]))
    st["note"] = (f"Previous engine {eng['name']} ended with '{mk.group(0).strip()}'. " if mk else
                  f"Previous engine {eng['name']} ended without a result ({kind}). ") + "Verify still FAILS."
    log(f"    verify FAILED ({st['fails']}/{MAX_FAILS})")
    if st["fails"] >= MAX_FAILS:
        git("stash", "push", "-u", "-m", f"autopilot-blocked-{tid}-{ts()}")
        st["status"] = "blocked"
        notify(f"BLOCKED {tid} after {MAX_FAILS} failed attempts (work kept in git stash). Moving on; rescue pass later.")
    save()


def eligible(tasks):
    for t in tasks:
        st = S["tasks"][t["id"]]
        if st["status"] == "todo" and all(S["tasks"].get(n, {}).get("status") == "done" for n in t.get("needs", [])):
            return t
    return None


def render():
    cfg = load(F_TASKS, {"tasks": []})
    L = [f"# AUTOPILOT STATUS  (updated {ts()})", "", f"Goal: {cfg.get('goal', '')}", "", "## Tasks"]
    for t in cfg["tasks"]:
        st = S["tasks"].get(t["id"], {})
        s = st.get("status", "todo")
        box = {"done": "[x]", "blocked": "[!]"}.get(s, "[ ]")
        extra = {"done": f"- by {st.get('engine')}", "blocked": "- BLOCKED (see git stash / logs)"}.get(
            s, f"- attempts failed: {st.get('fails', 0)}" if st.get("fails") else "")
        L.append(f"- {box} **{t['id']}** {t['title']} {extra}")
    L += ["", "## Engines", "| engine | state |", "|---|---|"]
    for e in engines():
        u = estate(e["name"])["until"]
        L.append(f"| {e['name']} | " + (f"cooling until {datetime.fromtimestamp(u):%H:%M:%S}" if u > time.time() else "ready") + " |")
    F_MD.write_text("\n".join(L) + "\n")


def selftest():
    AP.mkdir(exist_ok=True)
    LOGS.mkdir(exist_ok=True)
    pf = LOGS / "selftest.prompt.md"
    pf.write_text("Do not use any tools. Reply with exactly one line and nothing else:\nAUTOPILOT_RESULT: DONE\n")
    for e in load(F_ENG, {"engines": []}).get("engines", []):
        name, binary = e["name"], e.get("bin", e["name"])
        if not shutil.which(binary):
            print(f"[SKIP] {name:18} '{binary}' not on PATH")
            continue
        t0 = time.time()
        rc, out = sh(e["cmd"], 120, {"PROMPT_FILE": str(pf)})
        k = classify(rc, out)
        print(f"[{'OK  ' if k == 'ok' else 'FAIL'}] {name:18} kind={k} rc={rc} {time.time() - t0:.0f}s")
        if k != "ok":
            print("       tail: " + out[-300:].replace("\n", " | "))


def main():
    if "--selftest" in sys.argv:
        return selftest()
    AP.mkdir(exist_ok=True)
    LOGS.mkdir(exist_ok=True)
    lock = open(AP / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit("another autopilot is already running")
    S.update(load(F_STATE, S))
    start_heartbeat()
    preflight()
    notify(f"started on {ROOT.name}")
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        while True:
            if F_STOP.exists():
                notify("stopped by STOP file")
                return 0
            tasks = load(F_TASKS, {"tasks": []})["tasks"]
            for t in tasks:
                S["tasks"].setdefault(t["id"], {"status": "todo", "fails": 0, "note": "", "engine": None, "rescue": False})
            t = eligible(tasks)
            if t:
                work(t)
                continue
            if all(S["tasks"][x["id"]]["status"] == "done" for x in tasks):
                save()
                notify("GOAL REACHED - every task and the final acceptance gate pass. Branch: autopilot/sim")
                return 0
            blocked = [x["id"] for x in tasks if S["tasks"][x["id"]]["status"] == "blocked"]
            if not blocked:
                log("tasks waiting on unknown/cyclic dependencies - check tasks.json 'needs'")
                if nap(60):
                    continue
            else:
                S["rescues"] += 1
                notify(f"{len(blocked)} blocked ({', '.join(blocked)}); rescue pass #{S['rescues']} in {RESCUE_WAIT // 60}m")
                save()
                if nap(RESCUE_WAIT):
                    continue
                for b in blocked:
                    S["tasks"][b].update(status="todo", fails=0, rescue=True)
                save()
    except KeyboardInterrupt:
        log("interrupted")
        return 130


if __name__ == "__main__":
    sys.exit(main())
