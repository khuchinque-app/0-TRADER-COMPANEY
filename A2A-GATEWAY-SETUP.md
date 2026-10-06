# VPS A2A Gateway Setup Guide

## Current Status
- VPS Backend API: `http://187.127.178.20:11110` ✅ Running
- VPS Terminal: `http://187.127.178.20:22220` ✅ Running (Next.js)
- A2A Gateway: ❌ Not configured

## Setup Steps

### 1. SSH Login to VPS
```bash
ssh root@187.127.178.20
```

### 2. Switch to khuchinque user
```bash
su khuchinque
```

### 3. Start Hermes and configure A2A gateway
```bash
hermes -p herme-khuchinque
```

Then in the Hermes interface run:
```
hermes gateway setup
```
Select **A2A** protocol, set port to **29900** (compliant with your 2xxxx rule)

### 4. Start the A2A gateway
```bash
hermes gateway
```

### 5. Verify A2A endpoint
```bash
curl http://127.0.0.1:29900/.well-known/agent-card.json
```

Should return something like:
```json
{
  "name": "herme-khuchinque",
  "url": "http://187.127.178.20:29900",
  "capabilities": [...]
}
```

### 6. Update local configuration

Modify `~/.hermes/profiles/herme-chinque/config.yaml`:

```yaml
a2a_agents:
  hermekhu:
    url: "http://187.127.178.20:29900/.well-known/agent-card.json"
    auth:
      type: bearer
      token: "your-token-here"  # Optional, if authentication is enabled
    timeout: 120
    capabilities:
      - web_search
      - terminal
      - code_execution
      - file
      - memory
```

### 7. Enable A2A tools
```bash
hermes tools enable a2a --platform telegram
```

## Port Compliance Check

| Service | Port | Compliant? |
|---------|------|------------|
| Backend API | 11110 | ✅ |
| Terminal Next.js | 22220 | ✅ |
| A2A Gateway | 29900 | ✅ |

## Test Connection

Run locally:
```bash
curl http://187.127.178.20:29900/.well-known/agent-card.json
```

If successful, you can use `a2a_discover` and `a2a_call` tools.
