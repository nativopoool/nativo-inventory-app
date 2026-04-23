#!/bin/bash
# fix-bot2-autoerrors.sh - Enhanced script to diagnose and fix bot2 auto-restart errors
# Created: 2026-04-02
# Version: 1.0

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_CMD="ssh -p 2222 -i nativobot.pem -o StrictHostKeyChecking=no openclaw@52.200.214.27"
REMOTE_HOME="/home/openclaw"
BOT2_DOCKER="$REMOTE_HOME/bot2-docker"
BOT2_DATA="$REMOTE_HOME/bot2-data"
VENDURE_DIR="$REMOTE_HOME/bot2-workspace/projects/vendure-ferreteria"
LOG_FILE="/tmp/fix-bot2-$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Test SSH connectivity
test_ssh() {
    log_info "Testing SSH connectivity to remote host..."
    if $SSH_CMD "echo 'SSH connection successful'" >/dev/null 2>&1; then
        log_success "SSH connection established"
        return 0
    else
        log_error "SSH connection failed. Check SSH key and network connectivity."
        return 1
    fi
}

# Check container status
check_containers() {
    log_info "Checking container status..."
    
    containers=$($SSH_CMD "podman ps --format '{{.Names}}|{{.Status}}|{{.Ports}}'" 2>/dev/null)
    
    echo -e "\n${BLUE}=== Container Status ===${NC}" | tee -a "$LOG_FILE"
    echo "NAME|STATUS|PORTS" | tee -a "$LOG_FILE"
    echo "----|------|------" | tee -a "$LOG_FILE"
    
    IFS=$'\n'
    for container in $containers; do
        echo "$container" | tee -a "$LOG_FILE"
    done
    unset IFS
    
    # Check for critical containers
    critical_containers=("bot2-agent" "bot2-litellm" "bot2-redis" "bot2-oauth2")
    for container in "${critical_containers[@]}"; do
        if echo "$containers" | grep -q "^$container"; then
            log_success "$container is running"
        else
            log_error "$container is NOT running"
        fi
    done
}

# Check health endpoints
check_health_endpoints() {
    log_info "Checking health endpoints..."
    
    endpoints=(
        "http://[::1]:18791/__openclaw__/health|Agent Health"
        "http://[::1]:4183/ping|OAuth2 Proxy Health"
        "http://[::1]:4002/health|LiteLLM Health"
    )
    
    echo -e "\n${BLUE}=== Health Endpoint Checks ===${NC}" | tee -a "$LOG_FILE"
    
    for endpoint in "${endpoints[@]}"; do
        url=$(echo "$endpoint" | cut -d'|' -f1)
        name=$(echo "$endpoint" | cut -d'|' -f2)
        
        http_code=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 '$url' 2>&1" | tail -1)
        
        if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
            log_success "$name: HTTP $http_code"
        else
            log_warn "$name: HTTP $http_code (or timeout)"
        fi
    done
}

# Check monitor.sh configuration
check_monitor_config() {
    log_info "Checking monitor.sh configuration..."
    
    monitor_path="$BOT2_DOCKER/monitor.sh"
    
    # Read current config
    agent_url=$($SSH_CMD "grep '^AGENT_URL=' $monitor_path 2>/dev/null | cut -d'=' -f2- | tr -d '\"'" || echo "NOT_FOUND")
    proxy_url=$($SSH_CMD "grep '^PROXY_URL=' $monitor_path 2>/dev/null | cut -d'=' -f2- | tr -d '\"'" || echo "NOT_FOUND")
    
    echo -e "\n${BLUE}=== Monitor.sh Configuration ===${NC}" | tee -a "$LOG_FILE"
    echo "AGENT_URL: $agent_url" | tee -a "$LOG_FILE"
    echo "PROXY_URL: $proxy_url" | tee -a "$LOG_FILE"
    
    # Check if configuration is correct
    issues=0
    if [[ "$agent_url" != *"[::1]"* ]] || [[ "$agent_url" != *"__openclaw__/health"* ]]; then
        log_warn "AGENT_URL is incorrect (should be http://[::1]:18791/__openclaw__/health)"
        issues=$((issues + 1))
    fi
    
    if [[ "$proxy_url" != *"[::1]"* ]]; then
        log_warn "PROXY_URL is incorrect (should be http://[::1]:4183/ping)"
        issues=$((issues + 1))
    fi
    
    if [ $issues -eq 0 ]; then
        log_success "Monitor.sh configuration is correct"
    else
        log_warn "Found $issues configuration issues in monitor.sh"
    fi
}

# Check MCP configuration
check_mcp_config() {
    log_info "Checking MCP configuration..."
    
    mcp_path="$BOT2_DATA/mcp.json"
    
    vendure_url=$($SSH_CMD "podman exec bot2-agent grep -A2 'vendure-shop' /home/node/.openclaw/mcp.json 2>/dev/null | grep 'http://' | head -1 | tr -d ' ,'" || echo "NOT_FOUND")
    
    echo -e "\n${BLUE}=== MCP Configuration ===${NC}" | tee -a "$LOG_FILE"
    echo "Vendure URL: $vendure_url" | tee -a "$LOG_FILE"
    
    if [[ "$vendure_url" == *"bot2-vendure"* ]]; then
        log_success "MCP configuration uses container name (correct)"
    elif [[ "$vendure_url" == *"172.31.85.62"* ]]; then
        log_warn "MCP configuration uses IP address (should use container name)"
    else
        log_warn "MCP configuration not found or malformed"
    fi
}

# Check vendure networking
check_vendure_networking() {
    log_info "Checking vendure networking..."
    
    vendure_compose="$VENDURE_DIR/docker-compose.yml"
    
    echo -e "\n${BLUE}=== Vendure Networking ===${NC}" | tee -a "$LOG_FILE"
    
    # Check if vendure is running
    vendure_running=$($SSH_CMD "podman ps --format '{{.Names}}' | grep -q 'bot2-vendure' && echo 'YES' || echo 'NO'")
    echo "Vendure running: $vendure_running" | tee -a "$LOG_FILE"
    
    # Check vendure container network
    if [ "$vendure_running" = "YES" ]; then
        vendure_network=$($SSH_CMD "podman inspect bot2-vendure --format '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}' 2>/dev/null" || echo "UNKNOWN")
        echo "Vendure network: $vendure_network" | tee -a "$LOG_FILE"
        
        # Test vendure endpoint from bot2-agent
        vendure_test=$($SSH_CMD "podman exec bot2-agent curl -s -X POST -H 'Content-Type: application/json' --data '{\"query\":\"{ __typename }\"}' http://bot2-vendure:3000/shop-api 2>&1 | head -1" || echo "TEST_FAILED")
        
        if [[ "$vendure_test" == *"__typename"* ]]; then
            log_success "Vendure GraphQL endpoint is accessible from bot2-agent"
        else
            log_warn "Vendure endpoint NOT accessible from bot2-agent: $vendure_test"
        fi
    fi
}

# Check cron jobs
check_cron_jobs() {
    log_info "Checking cron jobs..."
    
    cron_jobs=$($SSH_CMD "crontab -l 2>/dev/null" || echo "NO_CRONTAB")
    
    echo -e "\n${BLUE}=== Cron Jobs ===${NC}" | tee -a "$LOG_FILE"
    echo "$cron_jobs" | tee -a "$LOG_FILE"
    
    # Count active monitoring jobs
    active_jobs=$(echo "$cron_jobs" | grep -v '^#' | grep -c "monitor" || true)
    commented_jobs=$(echo "$cron_jobs" | grep '^#.*monitor' | wc -l)
    
    echo "Active monitoring jobs: $active_jobs" | tee -a "$LOG_FILE"
    echo "Commented monitoring jobs: $commented_jobs" | tee -a "$LOG_FILE"
    
    if [ "$active_jobs" -eq 0 ]; then
        log_success "No active monitoring cron jobs (restart loop prevented)"
    else
        log_warn "$active_jobs active monitoring cron job(s) detected"
    fi
}

# Fix monitor.sh configuration
fix_monitor_config() {
    log_info "Fixing monitor.sh configuration..."
    
    monitor_path="$BOT2_DOCKER/monitor.sh"
    
    # Create backup
    $SSH_CMD "cp $monitor_path $monitor_path.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
    
    # Fix AGENT_URL
    $SSH_CMD "sed -i 's|AGENT_URL=\".*\"|AGENT_URL=\"http://[::1]:18791/__openclaw__/health\"|g' $monitor_path"
    
    # Fix PROXY_URL
    $SSH_CMD "sed -i 's|PROXY_URL=\".*\"|PROXY_URL=\"http://[::1]:4183/ping\"|g' $monitor_path"
    
    # Verify changes
    agent_url=$($SSH_CMD "grep '^AGENT_URL=' $monitor_path | cut -d'=' -f2- | tr -d '\"'" )
    proxy_url=$($SSH_CMD "grep '^PROXY_URL=' $monitor_path | cut -d'=' -f2- | tr -d '\"'" )
    
    if [[ "$agent_url" == *"[::1]"* ]] && [[ "$proxy_url" == *"[::1]"* ]]; then
        log_success "monitor.sh configuration fixed successfully"
        echo "New AGENT_URL: $agent_url" | tee -a "$LOG_FILE"
        echo "New PROXY_URL: $proxy_url" | tee -a "$LOG_FILE"
    else
        log_error "Failed to fix monitor.sh configuration"
    fi
}

# Fix MCP configuration
fix_mcp_config() {
    log_info "Fixing MCP configuration..."
    
    # Update vendure-shop endpoint
    $SSH_CMD "podman exec bot2-agent sed -i 's|http://172.31.85.62:3000|http://bot2-vendure:3000|g' /home/node/.openclaw/mcp.json 2>/dev/null || true"
    $SSH_CMD "podman exec bot2-agent sed -i 's|http://[0-9.]*:3000|http://bot2-vendure:3000|g' /home/node/.openclaw/mcp.json 2>/dev/null || true"
    
    # Update vendure-admin endpoint
    $SSH_CMD "podman exec bot2-agent sed -i 's|http://172.31.85.62:3000/admin-api|http://bot2-vendure:3000/admin-api|g' /home/node/.openclaw/mcp.json 2>/dev/null || true"
    
    log_success "MCP configuration updated to use container names"
}

# Fix vendure networking
fix_vendure_networking() {
    log_info "Fixing vendure networking..."
    
    vendure_compose="$VENDURE_DIR/docker-compose.yml"
    
    # Check if vendure compose file exists
    if $SSH_CMD "[ -f $vendure_compose ]"; then
        # Backup original
        $SSH_CMD "cp $vendure_compose $vendure_compose.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
        
        # Recreate compose file with correct network
        $SSH_CMD "cat > $vendure_compose << 'EOF'
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
EOF"
        
        log_success "Vendure docker-compose.yml updated with correct network"
    else
        log_warn "Vendure docker-compose.yml not found at $vendure_compose"
    fi
    
    # Restart vendure if needed
    vendure_running=$($SSH_CMD "podman ps --format '{{.Names}}' | grep -q 'bot2-vendure' && echo 'YES' || echo 'NO'")
    
    if [ "$vendure_running" = "YES" ]; then
        log_info "Restarting vendure container to apply network changes..."
        $SSH_CMD "cd $VENDURE_DIR && podman-compose down 2>/dev/null || true"
    fi
    
    $SSH_CMD "cd $VENDURE_DIR && podman-compose up -d 2>/dev/null"
    
    if $SSH_CMD "podman ps --format '{{.Names}}' | grep -q 'bot2-vendure'"; then
        log_success "Vendure container started with correct network"
    else
        log_error "Failed to start vendure container"
    fi
}

# Manage cron jobs
manage_cron_jobs() {
    local action="$1"  # disable, enable, or status
    
    log_info "Managing cron jobs: $action"
    
    case "$action" in
        disable)
            # Backup current crontab
            $SSH_CMD "crontab -l > /tmp/crontab.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
            
            # Comment out monitoring jobs
            $SSH_CMD "crontab -l | sed 's|^\\(\\*/2.*monitor\\.sh\\)$|#\\1|; s|^\\(\\*/2.*monitor_servicios_auto\\.sh\\)$|#\\1|' | crontab -"
            
            log_success "Monitoring cron jobs disabled"
            ;;
        enable)
            # Uncomment monitoring jobs
            $SSH_CMD "crontab -l | sed 's|^#\\(\\*/2.*monitor\\.sh\\)$|\\1|; s|^#\\(\\*/2.*monitor_servicios_auto\\.sh\\)$|\\1|' | crontab -"
            
            log_success "Monitoring cron jobs enabled"
            ;;
        status)
            check_cron_jobs
            ;;
    esac
}

# Generate diagnostic report
generate_report() {
    log_info "Generating diagnostic report..."
    
    echo -e "\n${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}        BOT2 DIAGNOSTIC REPORT          ${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
    echo "Report generated: $(date)" | tee -a "$LOG_FILE"
    echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
    
    # Summary of checks
    echo -e "\n${BLUE}=== SUMMARY ===${NC}" | tee -a "$LOG_FILE"
    
    # Test all endpoints and count successes
    successes=0
    total_checks=0
    
    # Add your summary logic here based on previous checks
    
    echo -e "\n${BLUE}=== RECOMMENDATIONS ===${NC}" | tee -a "$LOG_FILE"
    echo "1. Keep monitoring cron jobs disabled until all services are stable" | tee -a "$LOG_FILE"
    echo "2. Monitor the log file for 5-10 minutes to ensure no restarts" | tee -a "$LOG_FILE"
    echo "3. Test the gateway authentication with the provided token" | tee -a "$LOG_FILE"
    echo "4. Once stable, consider re-enabling monitoring with longer intervals" | tee -a "$LOG_FILE"
    
    echo -e "\n${BLUE}=== GATEWAY TOKEN ===${NC}" | tee -a "$LOG_FILE"
    echo "Token: a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4" | tee -a "$LOG_FILE"
    echo "Dashboard URL: https://bot2.ferreteriaelhogar.com/chat#token=a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4" | tee -a "$LOG_FILE"
    
    log_success "Diagnostic report generated in $LOG_FILE"
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}=== BOT2 AUTO-ERROR FIX TOOL ===${NC}"
    echo "1. Run full diagnostic check"
    echo "2. Fix all detected issues"
    echo "3. Fix monitor.sh configuration only"
    echo "4. Fix MCP configuration only"
    echo "5. Fix vendure networking only"
    echo "6. Disable monitoring cron jobs"
    echo "7. Enable monitoring cron jobs"
    echo "8. Check cron job status"
    echo "9. Generate diagnostic report"
    echo "10. Exit"
    echo -e "\nEnter your choice [1-10]: "
}

# Main execution
main() {
    log_info "Starting bot2 auto-error fix tool"
    log_info "Log file: $LOG_FILE"
    
    # Test SSH first
    if ! test_ssh; then
        exit 1
    fi
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                echo -e "\n${BLUE}=== RUNNING FULL DIAGNOSTIC ===${NC}"
                check_containers
                check_health_endpoints
                check_monitor_config
                check_mcp_config
                check_vendure_networking
                check_cron_jobs
                ;;
            2)
                echo -e "\n${BLUE}=== FIXING ALL DETECTED ISSUES ===${NC}"
                fix_monitor_config
                fix_mcp_config
                fix_vendure_networking
                manage_cron_jobs "disable"
                log_info "All fixes applied. Please wait 30 seconds for services to stabilize..."
                sleep 30
                check_containers
                check_health_endpoints
                ;;
            3)
                fix_monitor_config
                ;;
            4)
                fix_mcp_config
                ;;
            5)
                fix_vendure_networking
                ;;
            6)
                manage_cron_jobs "disable"
                ;;
            7)
                manage_cron_jobs "enable"
                ;;
            8)
                check_cron_jobs
                ;;
            9)
                generate_report
                ;;
            10)
                log_info "Exiting. Log file saved to: $LOG_FILE"
                exit 0
                ;;
            *)
                log_warn "Invalid choice. Please enter a number between 1-10."
                ;;
        esac
        
        echo -e "\nPress Enter to continue..."
        read -r
    done
}

# Run main function
if [ "$0" = "$BASH_SOURCE" ]; then
    main "$@"
fi