#!/usr/bin/env bash
# ============================================================
# fix-systemd.sh — MUST RUN AS ROOT (sudo)
# Fixes the two units the user created with mangled (single-line)
# content + wrong WorkingDirectory (project/ -> projects/),
# then enables and starts both services.
# Run:  echo <password> | sudo -S bash /home/chinque/projects/TRADING-COMPANEY/tools/fix-systemd.sh
# ============================================================
set -e

cat > /etc/systemd/system/local-webserver.service <<'EOF'
[Unit]
Description=Python Local Web Server
After=network.target

[Service]
Type=simple
User=chinque
WorkingDirectory=/home/chinque/projects/TRADING-COMPANEY
ExecStart=/usr/bin/python3 -m http.server 5015
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/cloudflared-tunnel.service <<'EOF'
[Unit]
Description=Cloudflare Tunnel Service
After=network.target local-webserver.service
Wants=local-webserver.service

[Service]
Type=simple
User=chinque
ExecStart=/usr/bin/cloudflared tunnel --url http://localhost:5015 --no-autoupdate
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now local-webserver.service
systemctl enable --now cloudflared-tunnel.service

sleep 3
echo "=== local-webserver ==="
systemctl --no-pager --lines=3 status local-webserver.service || true
echo "=== cloudflared-tunnel ==="
systemctl --no-pager --lines=3 status cloudflared-tunnel.service || true

echo "=== waiting for tunnel URL ==="
sleep 4
journalctl -u cloudflared-tunnel.service -n 30 --no-pager | grep -m1 -oE "https://[a-z0-9-]+\.trycloudflare\.com" \
  || { echo "(URL not found yet — check: journalctl -u cloudflared-tunnel.service -n 30)"; journalctl -u cloudflared-tunnel.service -n 10 --no-pager; }
