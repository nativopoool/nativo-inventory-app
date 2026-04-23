#!/bin/bash

# Script de monitoreo simple para servicios de Ferreteria El Hogar
# Diseñado para ejecutarse como usuario openclaw sin privilegios especiales

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
LOG_FILE="/home/openclaw/monitor_servicios.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="8286401760"

# URLs a monitorear
BOT_URL="https://bot2.ferreteriaelhogar.com/chat"
ERP_URL="https://erp.ferreteriaelhogar.com/"
INVENTARIO_URL="https://inventario.ferreteriaelhogar.com/"
WEBPAGE_URL="https://ferreteriaelhogar.com/"

# Puertos locales
BOT_PORT=18791
ERP_PORT=3000

# Funciones de utilidad
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_telegram() {
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}&text=$1" > /dev/null 2>&1
    fi
}

check_container() {
    local container_name=$1
    local display_name=$2
    
    if podman ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✓ ${display_name} está corriendo${NC}"
        return 0
    else
        echo -e "${RED}✗ ${display_name} NO está corriendo${NC}"
        log_message "ERROR: Contenedor ${display_name} no está corriendo"
        return 1
    fi
}

check_port() {
    local port=$1
    local service_name=$2
    
    if ss -tln 2>/dev/null | grep -q ":${port} "; then
        echo -e "${GREEN}✓ Puerto ${port} (${service_name}) está escuchando${NC}"
        return 0
    else
        echo -e "${RED}✗ Puerto ${port} (${service_name}) NO está escuchando${NC}"
        log_message "ERROR: Puerto ${port} (${service_name}) no está escuchando"
        return 1
    fi
}

check_http() {
    local url=$1
    local service_name=$2
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        echo -e "${GREEN}✓ ${service_name} (${url}) responde con HTTP ${http_code}${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service_name} (${url}) NO responde (HTTP ${http_code})${NC}"
        log_message "ERROR: ${service_name} (${url}) no responde (HTTP ${http_code})"
        return 1
    fi
}

check_nginx_status() {
    if systemctl is-active nginx >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx está corriendo${NC}"
        return 0
    else
        echo -e "${RED}✗ Nginx NO está corriendo${NC}"
        log_message "ERROR: Nginx no está corriendo"
        return 1
    fi
}

check_system_resources() {
    echo -e "${BLUE}=== Recursos del Sistema ===${NC}"
    
    # Memoria
    if command -v free >/dev/null 2>&1; then
        mem_total=$(free -m | awk '/^Mem:/{print $2}')
        mem_used=$(free -m | awk '/^Mem:/{print $3}')
        mem_percent=$(( (mem_used * 100) / mem_total ))
        echo -e "Memoria: ${mem_used}MB/${mem_total}MB (${mem_percent}%)"
        
        if [ "$mem_percent" -gt 80 ]; then
            echo -e "${YELLOW}⚠ Alta utilización de memoria${NC}"
            log_message "WARNING: Alta utilización de memoria: ${mem_percent}%"
        fi
    fi
    
    # Disco
    if command -v df >/dev/null 2>&1; then
        disk_usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
        echo -e "Disco: ${disk_usage}% usado"
        
        if [ "$disk_usage" -gt 80 ]; then
            echo -e "${YELLOW}⚠ Alta utilización de disco${NC}"
            log_message "WARNING: Alta utilización de disco: ${disk_usage}%"
        fi
    fi
    
    # Contenedores
    container_count=$(podman ps --format "{{.Names}}" | wc -l)
    echo -e "Contenedores activos: ${container_count}"
    
    return 0
}

check_container_logs() {
    echo -e "${BLUE}=== Verificando Logs de Contenedores ===${NC}"
    
    for container in bot2-agent bot2-litellm bot2-vendure; do
        if podman ps --format "{{.Names}}" | grep -q "^${container}$"; then
            error_count=$(podman logs --tail 20 "$container" 2>/dev/null | grep -i -c "error\|failed\|exception")
            if [ "$error_count" -gt 0 ]; then
                echo -e "${YELLOW}⚠ ${container} tiene ${error_count} errores en logs recientes${NC}"
                log_message "WARNING: ${container} tiene ${error_count} errores en logs"
            else
                echo -e "${GREEN}✓ ${container} sin errores recientes${NC}"
            fi
        fi
    done
    
    return 0
}

# Función principal
main() {
    echo -e "\n${BLUE}🚀 Monitoreo de Servicios - Ferretería El Hogar${NC}"
    echo -e "${BLUE}Fecha: $(date)${NC}\n"
    
    # Estado de contenedores
    echo -e "${BLUE}=== Estado de Contenedores ===${NC}"
    check_container "bot2-agent" "Bot2 Agent"
    bot_container_status=$?
    
    check_container "bot2-vendure" "ERP Vendure"
    erp_container_status=$?
    
    check_container "bot2-litellm" "LiteLLM Proxy"
    litellm_status=$?
    
    check_container "bot2-redis" "Redis"
    redis_status=$?
    
    # Puertos locales
    echo -e "\n${BLUE}=== Puertos Locales ===${NC}"
    check_port "$BOT_PORT" "Bot2"
    bot_port_status=$?
    
    check_port "$ERP_PORT" "ERP"
    erp_port_status=$?
    
    # Endpoints HTTP/HTTPS
    echo -e "\n${BLUE}=== Endpoints Públicos ===${NC}"
    check_http "$BOT_URL" "Bot2"
    bot_http_status=$?
    
    check_http "$ERP_URL" "ERP"
    erp_http_status=$?
    
    check_http "$INVENTARIO_URL" "Inventario"
    inventario_http_status=$?
    
    check_http "$WEBPAGE_URL" "Webpage Principal"
    webpage_http_status=$?
    
    # Nginx
    echo -e "\n${BLUE}=== Nginx ===${NC}"
    check_nginx_status
    nginx_status=$?
    
    # Recursos del sistema
    check_system_resources
    
    # Logs de contenedores
    check_container_logs
    
    # Resumen
    echo -e "\n${BLUE}=== Resumen del Estado ===${NC}"
    
    # Calcular estado general por servicio
    bot_status=$((bot_container_status + bot_port_status + bot_http_status))
    erp_status=$((erp_container_status + erp_port_status + erp_http_status))
    
    echo -e "Bot2: $( [ $bot_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "ERP: $( [ $erp_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Inventario: $( [ $inventario_http_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Webpage: $( [ $webpage_http_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Nginx: $( [ $nginx_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    
    # Estado general
    total_status=$((bot_status + erp_status + inventario_http_status + webpage_http_status + nginx_status))
    
    if [ $total_status -eq 0 ]; then
        echo -e "\n${GREEN}🎉 TODOS LOS SERVICIOS ESTÁN OPERATIVOS${NC}"
        log_message "INFO: Todos los servicios están operativos"
    else
        echo -e "\n${RED}⚠ ALGUNOS SERVICIOS TIENEN PROBLEMAS${NC}"
        log_message "ERROR: Algunos servicios tienen problemas"
        
        # Enviar alerta por Telegram
        alert_message="🚨 ALERTA MONITOREO $(date '+%H:%M %d/%m'): "
        [ $bot_status -ne 0 ] && alert_message="${alert_message}Bot2, "
        [ $erp_status -ne 0 ] && alert_message="${alert_message}ERP, "
        [ $inventario_http_status -ne 0 ] && alert_message="${alert_message}Inventario, "
        [ $webpage_http_status -ne 0 ] && alert_message="${alert_message}Webpage, "
        [ $nginx_status -ne 0 ] && alert_message="${alert_message}Nginx, "
        alert_message="${alert_message%%, } con problemas"
        send_telegram "$alert_message"
    fi
    
    echo -e "\n${BLUE}📝 Logs guardados en: $LOG_FILE${NC}"
    echo -e "${BLUE}Últimas líneas del log:${NC}"
    tail -5 "$LOG_FILE" 2>/dev/null || echo "No hay log previo"
}

# Ejecutar
main "$@"