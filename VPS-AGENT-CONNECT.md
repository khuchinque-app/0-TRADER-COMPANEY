# VPS Agent Connection Guide

## Current Status

| Service | Address | Status |
|---------|---------|--------|
| Backend API | http://187.127.178.20:11110 | ✅ Running |
| Terminal Next.js | http://187.127.178.20:22220 | ✅ Running |
| A2A Gateway | Not configured | ❌ Needs setup |

## Problem Diagnosis

`@Herme_KhuChinQue_bot` A2A gateway is not running. Current config points to Next.js terminal app (port 22220), not Hermes A2A gateway.

## Solution

### Set up A2A gateway on VPS

```bash
# 1. SSH login
ssh root@187.127.178.20

# 2. Switch to khuchinque user
su khuchinque

# 3. Start Hermes and configure A2A gateway
hermes -p herme-khuchinque
# In the interface run:
hermes gateway setup
# Select A2A protocol, set port to 29900 (compliant with 2xxxx rule)

# 4. Start gateway
hermes gateway

# 5. Verify endpoint
curl http://127.0.0.1:29900/.well-known/agent-card.json
```

### Verify A2A connectivity

After setup, test locally:
```bash
curl http://187.127.178.20:29900/.well-known/agent-card.json
```

On success, agent card JSON will be displayed.

## Port Compliance

Following user rule: **All ports must be >= 2000 or >= 20000**

| Service | Port | Compliant? |
|---------|------|------------|
| Backend API | 11110 | ✅ |
| Terminal Next.js | 22220 | ✅ |
| A2A Gateway | 29900 | ✅ |
| HTTP (8000) | 8000 | ❌ Needs migration to 28000+ |

## Quick Scripts

```bash
# Run VPS tests
python3 /home/chinque/CONTINUE-CONTINUE/vps-run.py

# Check task status
python3 /home/chinque/project/TRADING-COMPANEY/autopilot/autopilot.py --status
```
