# Wayfinder Diagnostic Report — External Access Issue

**Date:** 2026-10-07 03:40 UTC  
**Skill:** agent-reach + wayfinder  
**Target:** http://187.127.178.20:22220/

---

## 🔍 Problem Statement

**Issue:** External access to trading platform fails  
**URL Tested:** http://187.127.178.20:22220/  
**Status:** ❌ Inaccessible from external network

---

## 🧪 Diagnostic Results

### Internal Access (localhost)
```bash
curl http://localhost:22220/market
→ ✅ 200 OK (Next.js serving frontend)
```

### External Access (VPS IP)
```bash
curl http://187.127.178.20:22220/market
→ ❌ Connection timeout/refused
```

### Port Check
```bash
nc -zv 187.127.178.20 22220
→ ❌ Port closed or blocked by firewall
```

---

## 📊 Root Cause Analysis

### Possible Causes:
1. **Firewall Blocking** — UFW/iptables blocking port 22220
2. **Nginx Not Configured** — No reverse proxy for port 22220
3. **Bind Address** — Next.js only binding to 127.0.0.1
4. **Cloud Firewall** — VPS provider firewall (AWS Security Group, etc.)

---

## 🔧 Diagnosis Steps

### Step 1: Check Nginx Configuration
```bash
# Look for trading-related nginx configs
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/conf.d/trading.conf
```

### Step 2: Check Firewall Status
```bash
# UFW (Ubuntu Firewall)
sudo ufw status

# iptables rules
sudo iptables -L -n | grep 22220
```

### Step 3: Check Bind Address
```bash
# See what address Next.js is binding to
ss -tlnp | grep 22220
# Expected: *:22220 (all interfaces)
# If shows: 127.0.0.1:22220 (localhost only) → PROBLEM
```

---

## 🛠️ Recommended Fixes

### Option A: Configure Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name 187.127.178.20;

    location / {
        proxy_pass http://localhost:22220;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then restart nginx:
```bash
sudo systemctl restart nginx
```

### Option B: Open Firewall Port
```bash
# If using UFW
sudo ufw allow 22220/tcp

# If using iptables
sudo iptables -A INPUT -p tcp --dport 22220 -j ACCEPT
```

### Option C: Bind Next.js to All Interfaces
Edit PM2 config or start command:
```bash
# Set HOST environment variable
export HOST=0.0.0.0
pm2 restart terminal
```

---

## 📝 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js Frontend | ✅ Running | Port 22220 (localhost only?) |
| Backend API | ✅ Running | Port 11110 |
| Nginx | ⚠️ Unknown | Need to check config |
| Firewall | ⚠️ Unknown | Need to check rules |
| External Access | ❌ Blocked | Port not reachable |

---

## 🎯 Next Actions

1. **Check if Nginx is installed and configured**
2. **Verify firewall rules (UFW/iptables)**
3. **Configure reverse proxy for port 22220**
4. **Test external access after fix**

---

**Report Generated:** 2026-10-07 03:40 UTC  
**Diagnostic Tool:** agent-reach + wayfinder
