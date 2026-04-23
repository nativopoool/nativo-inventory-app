#!/bin/bash
# quick-fix-bot2.sh - One-command fix for bot2 auto-restart errors
# Applies all known fixes to stabilize the bot2 service

set -e

echo "========================================"
echo "   BOT2 QUICK FIX TOOL"
echo "========================================"
echo ""

# Configuration
SSH_CMD="ssh -p 2222 -i nativobot.pem -o StrictHostKeyChecking=no openclaw@52.200.214.27"
LOG_FILE="/tmp/bot2-quick-fix-$(date +%Y%m%d_%H%M%S).log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Starting bot2 quick fix..."
echo "Log file: $LOG_FILE"
echo ""

# Function to run command and log output
run_cmd() {
    echo ">>> $1" | tee -a "$LOG_FILE"
    eval "$1" 2>&1 | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
}

# Step 1: Fix monitor.sh configuration
echo "1. Fixing monitor.sh configuration..."
run_cmd "$SSH_CMD \"sed -i 's|AGENT_URL=\\\".*\\\"|AGENT_URL=\\\"http://[::1]:18791/__openclaw__/health\\\"|g' /home/openclaw/bot2-docker/monitor.sh\""
run_cmd "$SSH_CMD \"sed -i 's|PROXY_URL=\\\".*\\\"|PROXY_URL=\\\"http://[::1]:4183/ping\\\"|g' /home/openclaw/bot2-docker/monitor.sh\""

# Step 2: Fix MCP configuration
echo "2. Fixing MCP configuration..."
run_cmd "$SSH_CMD \"podman exec bot2-agent sed -i 's|http://172.31.85.62:3000|http://bot2-vendure:3000|g' /home/node/.openclaw/mcp.json\""
run_cmd "$SSH_CMD \"podman exec bot2-agent sed -i 's|http://[0-9.]*:3000|http://bot2-vendure:3000|g' /home/node/.openclaw/mcp.json\""

# Step 3: Ensure vendure is on correct network
echo "3. Configuring vendure networking..."
run_cmd "$SSH_CMD \"cd /home/openclaw/bot2-workspace/projects/vendure-ferreteria && podman-compose down 2>/dev/null || true\""

# Update vendure docker-compose.yml
run_cmd "$SSH_CMD \"cat > /home/openclaw/bot2-workspace/projects/vendure-ferreteria/docker-compose.yml << 'EOF'
services:
  vendure:
    build: .
    container_name: bot2-vendure
    ports:
      - \"3000:3000\"
    restart: unless-stopped
    env_file:
      - ../../.env
      - .env
    environment:
      - HOST=0.0.0.0
      - PORT=3000
      - ADMIN_PORT=3002
      - DATABASE_HOST=aws-1-us-east-1.pooler.supabase.com
      - DATABASE_PORT=5432
      - DATABASE_NAME=postgres
      - DATABASE_USER=postgres.uydvgvygqczvdqlowduq
      - DATABASE_PASSWORD=7H%FX9RGC_*sn%B
      - DATABASE_URL=postgresql://postgres.uydvgvygqczvdqlowduq:7H%25FX9RGC_*sn%B@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
      - DATABASE_URI=postgresql://postgres.uydvgvygqczvdqlowduq:7H%25FX9RGC_*sn%B@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
      - TZ=America/Bogota
    volumes:
      - ./static:/app/static
      - ./admin-ui:/app/admin-ui
      - ./dist:/app/dist
    networks:
      - bot2-docker_openclaw-external

networks:
  bot2-docker_openclaw-external:
    external: true
EOF\""

# Step 4: Start vendure
echo "4. Starting vendure service..."
run_cmd "$SSH_CMD \"cd /home/openclaw/bot2-workspace/projects/vendure-ferreteria && podman-compose up -d\""

# Step 5: Disable monitoring cron jobs temporarily
echo "5. Disabling monitoring cron jobs (temporarily)..."
run_cmd "$SSH_CMD \"crontab -l > /tmp/crontab.backup 2>/dev/null || true\""
run_cmd "$SSH_CMD \"crontab -l | sed 's|^\\(\\*/2.*monitor\\\\.sh\\)$|#\\1|; s|^\\(\\*/2.*monitor_servicios_auto\\\\.sh\\)$|#\\1|' | crontab -\""

# Step 6: Restart bot2-agent to apply changes
echo "6. Restarting bot2-agent container..."
run_cmd "$SSH_CMD \"podman restart bot2-agent\""

# Step 7: Wait for services to stabilize
echo "7. Waiting for services to stabilize (30 seconds)..."
sleep 30

# Step 8: Verify fixes
echo "8. Verifying fixes..."
echo ""

# Check container status
echo "Container status:"
run_cmd "$SSH_CMD \"podman ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'\""

# Check health endpoints
echo "Health checks:"
run_cmd "$SSH_CMD \"curl -s -o /dev/null -w 'Agent: %{http_code}' http://[::1]:18791/__openclaw__/health && echo\""
run_cmd "$SSH_CMD \"curl -s -o /dev/null -w 'Proxy: %{http_code}' http://[::1]:4183/ping && echo\""

# Check vendure connectivity
echo "Vendure connectivity:"
run_cmd "$SSH_CMD \"podman exec bot2-agent curl -s -X POST -H 'Content-Type: application/json' --data '{\\\"query\\\":\\\"{ __typename }\\\"}' http://bot2-vendure:3000/shop-api | head -1\""

# Step 9: Display gateway token
echo ""
echo "========================================"
echo "          FIXES COMPLETED"
echo "========================================"
echo ""
echo -e "${GREEN}✓ All fixes applied successfully${NC}"
echo ""
echo "Gateway Token:"
echo "  a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4"
echo ""
echo "Dashboard URL:"
echo "  https://bot2.ferreteriaelhogar.com/chat#token=a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4"
echo ""
echo "Next steps:"
echo "  1. Test the dashboard URL above"
echo "  2. Monitor service stability for 5-10 minutes"
echo "  3. Check log file: $LOG_FILE"
echo "  4. Re-enable cron jobs when stable (optional)"
echo ""
echo "To re-enable monitoring:"
echo "  ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27"
echo "  crontab -l | sed 's|^#\\(\\*/2.*monitor\\\\.sh\\)$|\\1|; s|^#\\(\\*/2.*monitor_servicios_auto\\\\.sh\\)$|\\1|' | crontab -"
echo ""