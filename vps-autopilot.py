#!/usr/bin/env python3
"""
VPS Autopilot Runner - Run autopilot tasks via backend API
Bypasses SSH by using the backend API directly
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

VPS_BACKEND = "http://187.127.178.20:11110"
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

def get_token():
    result = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
    return result.get("token")

def load_tasks():
    with open(TASKS_FILE, 'r') as f:
        return json.load(f)

def run_task(task_id):
    """Run a specific task by ID via API"""
    tasks = load_tasks()
    task = next((t for t in tasks.get("tasks", []) if t.get("id") == task_id), None)
    
    if not task:
        return {"error": f"Task {task_id} not found"}
    
    print(f"\n{'='*60}")
    print(f"Running Task: {task_id} - {task.get('title', 'N/A')}")
    print(f"{'='*60}")
    
    # Check task type and run appropriate test
    test_type = task.get("type", "verify")
    
    if test_type == "verify" or test_type == "T01":
        # Auth verification
        token = get_token()
        if token:
            # Test protected endpoint
            verify_result = api_get("/api/auth/me", token=token)
            return {
                "task": task_id,
                "status": "PASS",
                "token_received": bool(token),
                "protected_endpoint": "accessible" if "error" not in verify_result else "denied",
                "details": verify_result
            }
        else:
            return {"task": task_id, "status": "FAIL", "reason": "No token received"}
    
    elif test_type == "T02":
        # Pair not found test
        result = api_get("/api/ticker/INVALIDPAIR")
        if "error" in result or result.get("error"):
            return {"task": task_id, "status": "PASS", "result": result}
        return {"task": task_id, "status": "FAIL", "result": result}
    
    else:
        return {"task": task_id, "status": "SKIP", "reason": f"Test type {test_type} not implemented"}

def main():
    if len(sys.argv) < 2:
        print("Usage: vps-autopilot.py [list|run <task_id>|test]")
        print("")
        print("Commands:")
        print("  list          - Show all available tasks")
        print("  run <task_id> - Run a specific task (e.g., T01, T02)")
        print("  test          - Run quick smoke tests")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "list":
        tasks = load_tasks()
        print(f"\nAvailable Tasks ({len(tasks.get('tasks', []))}):")
        print("-" * 60)
        for t in tasks.get("tasks", []):
            status = t.get("status", "todo")
            icon = "✓" if status == "done" else "○"
            print(f"  {icon} {t['id']:6s} | {t.get('title', 'N/A')}")
        print("-" * 60)
        
    elif cmd == "run" and len(sys.argv) > 2:
        task_id = sys.argv[2]
        result = run_task(task_id)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result.get("status") == "PASS" else 1)
    
    elif cmd == "test":
        print("\nRunning Quick Smoke Tests...")
        print("-" * 40)
        
        # Health check
        health = api_get("/api/health")
        print(f"Health: {'PASS' if 'status' in health else 'FAIL'}")
        
        # Auth
        token_data = api_post("/api/auth/login", {"email": "dev@example.com", "password": "devpass123"})
        token_ok = "token" in token_data
        print(f"Auth Login: {'PASS' if token_ok else 'FAIL'}")
        
        # Ticker
        ticker = api_get("/api/ticker/BTCIDR")
        ticker_ok = "last" in ticker
        print(f"Ticker: {'PASS' if ticker_ok else 'FAIL'}")
        
        # Invalid pair
        invalid = api_get("/api/ticker/NONEXIST")
        invalid_ok = "error" in invalid or invalid.get("error")
        print(f"Invalid Pair: {'PASS' if invalid_ok else 'FAIL'}")
        
        print("-" * 40)
        all_pass = token_ok and ticker_ok and invalid_ok
        print(f"Overall: {'ALL PASSED' if all_pass else 'SOME FAILED'}")
        sys.exit(0 if all_pass else 1)
    
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()