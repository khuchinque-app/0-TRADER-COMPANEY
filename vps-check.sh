#!/usr/bin/env bash
# vps-check.sh - Check VPS connectivity and run tasks
# Usage: ./vps-check.sh [health|api|ssh|deploy]

set -euo pipefail

VPS_HOST="187.127.178.20"
VPS_USER="root"
VPS_PASS="Herolike66@@"
BACKEND_PORT=11110
TERMINAL_PORT=22220
SSH_PORT=22

cmd=${1:-health}

echo "========================================"
echo "  VPS Check — $VPS_HOST"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# Check backend API
check_api() {
    echo -n "Backend API ($BACKEND_PORT): "
    if curl -sf "http://$VPS_HOST:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
        echo "✓ OK"
        curl -s "http://$VPS_HOST:$BACKEND_PORT/api/health" | python3 -m json.tool 2>/dev/null || true
    else
        echo "✗ FAILED"
    fi
}

# Check terminal port
check_terminal() {
    echo -n "Terminal API ($TERMINAL_PORT): "
    if curl -sf "http://$VPS_HOST:$TERMINAL_PORT/api/health" >/dev/null 2>&1; then
        echo "✓ OK"
    else
        echo "✗ FAILED"
    fi
}

# Check SSH port
check_ssh() {
    echo -n "SSH ($SSH_PORT): "
    if sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
        "$VPS_USER@$VPS_HOST" -p $SSH_PORT "echo connected" 2>/dev/null; then
        echo "✓ OK"
    else
        echo "✗ FAILED (port closed/refused)"
        
        # Try alternative SSH ports
        for alt_port in 2222 8022; do
            echo -n "  Trying port $alt_port: "
            if sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 \
                "$VPS_USER@$VPS_HOST" -p $alt_port "echo connected" 2>/dev/null; then
                echo "✓ OK on port $alt_port"
                export SSH_PORT=$alt_port
                return 0
            else
                echo "✗ failed"
            fi
        done
    fi
}

# Run API-based auth test
run_auth_test() {
    echo ""
    echo "--- Auth Test ---"
    SEED=$(curl -sf -X POST "http://$VPS_HOST:$BACKEND_PORT/api/auth/seed" \
        -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo '{}')
    echo "Seed: $SEED"
    
    LOGIN=$(curl -sf -X POST "http://$VPS_HOST:$BACKEND_PORT/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"dev@example.com","password":"devpass123"}' 2>/dev/null || echo '{}')
    echo "Login: $LOGIN"
}

# Run autopilot via SSH
run_autopilot() {
    echo ""
    echo "--- Running Autopilot ---"
    ssh_cmd="sshpass -p '$VPS_PASS' ssh -o StrictHostKeyChecking=no -p $SSH_PORT $VPS_USER@$VPS_HOST"
    
    $ssh_cmd "cd /home/khuchinque/0-TRADER-COMPANEY && python3 autopilot/autopilot.py --run T01"
}

# Full deploy + verify
run_deploy() {
    echo ""
    echo "--- Deploy & Verify ---"
    ssh_cmd="sshpass -p '$VPS_PASS' ssh -o StrictHostKeyChecking=no -p $SSH_PORT $VPS_USER@$VPS_HOST"
    
    $ssh_cmd "cd /home/khuchinque/0-TRADER-COMPANEY && bash autopilot/deploy.sh"
    $ssh_cmd "cd /home/khuchinque/0-TRADER-COMPANEY && bash autopilot/verify/T01.sh"
}

case $cmd in
    health)
        check_api
        check_terminal
        check_ssh
        ;;
    api)
        check_api
        run_auth_test
        ;;
    ssh)
        check_ssh
        ;;
    deploy)
        check_api
        run_deploy
        ;;
    autopilot)
        check_api
        run_autopilot
        ;;
    *)
        echo "Usage: $0 {health|api|ssh|deploy|autopilot}"
        echo ""
        echo "Commands:"
        echo "  health    - Check all ports and services"
        echo "  api       - Test backend API endpoints"
        echo "  ssh       - Test SSH connectivity (with fallback ports)"
        echo "  deploy    - Run deploy.sh + T01 verify"
        echo "  autopilot - Run autopilot T01 task"
        exit 1
        ;;
esac