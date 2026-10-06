# Wayfinder Map: Trading Company Project Audit
**Destination:** Production-ready trading simulation platform with all bugs resolved, permissions fixed, and automation pipeline stable.

**Created:** 2026-10-06  
**Map Type:** Engineering Audit & Cleanup

---

## Destination

A fully operational trading simulation platform (Trading Company) with:
- All smoke tests passing (10/10)
- Correct file permissions (no root-owned files)
- Stable PM2 services
- Clean git state
- documented issues resolved

---

## Current State Assessment

### ✅ Healthy
- Smoke tests: 10/10 PASS
- Services: backend (11110), terminal (22220), engine (3001) all online
- Git branch: feat/market-trade, commit 8796fda
- Feature completeness: Market page, Trade page, Strata theme, Wayfinder skills

### ⚠️ Issues Found
1. **Root-owned files** in project directory
2. **CONTEXT.md** ownership issue (root:root)
3. **Autopilot folder** owned by root
4. **Hermes update pending** (permission issue in /usr/local/lib/hermes-agent/.git)

---

## Not Yet Specified (Fog)

1. Root-owned files impact on functionality?
2. Should we migrate autopilot to new system?
3. What's the priority: fix permissions vs. new features?
4. A2A gateway setup status (blocked earlier)?

---

## Out of Scope

- Building new features (market/trade already complete)
- Voice agent reactivation (disabled per user request)
- Hermes update (separate task)

---

## Tickets

### T01: Fix Root-Owned Files
**Type:** task  
**Status:** IN PROGRESS  
**Created:** 2026-10-06

**Question:** How to cleanly fix all root-owned files in the project without breaking git state?

**Context:**
- Multiple files owned by root: CONTEXT.md, PLANNING/ASSUMPTIONS.md, docs/PROGRESS.md, autopilot/*
- Git index also root-owned
- Need to preserve git history and .git internals

**Resolution:** SSH as root to chown -R khuchinque:khuchinque /home/khuchinque/0-TRADER-COMPANEY

---

### T02: Verify Smoke Tests After Permission Fix
**Type:** task  
**Status:** PENDING  
**Blocking:** T01

**Question:** Do smoke tests still pass after permission changes?

---

### T03: Document Project Health Status
**Type:** research  
**Status:** PENDING

**Question:** What is the complete health status of the Trading Company project?

**Deliverable:** Summary report of:
- Service status
- Test results
- Known issues
- Recommendations

---

### T04: Clear Git State
**Type:** task  
**Status:** PENDING

**Question:** Is the git repository in a clean state after fixes?

---

## Decisions So Far

*(Empty - map just created)*

---

## Handoff Notes

**For @Herme_ChinQue_bot (Local Agent):**
- This map tracks project audit progress
- T01 is in progress on VPS
- Local agent should:
  1. Wait for T01 completion
  2. Review any new issues surfaced
  3. Help with local testing if needed
  4. Coordinate on feature branch strategy

**Next Action:** Complete T01 (fix permissions), then verify with smoke tests.
