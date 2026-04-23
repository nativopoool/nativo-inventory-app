#!/bin/bash

# Script de monitoreo para servicios de Ferreteria El Hogar
# Monitorea: bot2, ERP/Inventario, webpage principal

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
LOG_FILE="/home/openclaw/monitor_servicios.log"
MAX_LOG_LINES=50
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
ERP_ADMIN_PORT=3002

# Funciones de utilidad
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_telegram() {
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}&text=$1" > /dev/null
    fi
}

check_service() {
    local name=$1
    local url=$2
    local port=$3
    local type=$4
    
    echo -e "${BLUE}=== Verificando $name ===${NC}"
    
    # Verificar contenedor (si aplica)
    if [ -n "$port" ]; then
        if (docker ps --format "{{.Names}}" 2>/dev/null || podman ps --format "{{.Names}}") | grep -q "$name"; then
            echo -e "${GREEN}✓ Contenedor $name está corriendo${NC}"
        else
            echo -e "${RED}✗ Contenedor $name NO está corriendo${NC}"
            log_message "ERROR: Contenedor $name no está corriendo"
            send_telegram "🚨 ALERTA: Contenedor $name no está corriendo"
            return 1
        fi
        
        # Verificar puerto local
        if ss -tln | grep -q ":$port "; then
            echo -e "${GREEN}✓ Puerto $port está escuchando${NC}"
        else
            echo -e "${RED}✗ Puerto $port NO está escuchando${NC}"
            log_message "ERROR: Puerto $port no está escuchando para $name"
            send_telegram "🚨 ALERTA: Puerto $port no está escuchando para $name"
            return 1
        fi
    fi
    
    # Verificar endpoint HTTP/HTTPS
    if [ -n "$url" ]; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
            echo -e "${GREEN}✓ Endpoint $url responde con HTTP $http_code${NC}"
        else
            echo -e "${RED}✗ Endpoint $url NO responde (HTTP $http_code)${NC}"
            log_message "ERROR: Endpoint $url no responde (HTTP $http_code)"
            send_telegram "🚨 ALERTA: Endpoint $url no responde (HTTP $http_code)"
            return 1
        fi
    fi
    
    return 0
}

check_nginx() {
    echo -e "${BLUE}=== Verificando Nginx ===${NC}"
    
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx está corriendo${NC}"
        
        # Verificar configuración
        if nginx -t 2>/dev/null; then
            echo -e "${GREEN}✓ Configuración Nginx es válida${NC}"
        else
            echo -e "${RED}✗ Configuración Nginx NO es válida${NC}"
            log_message "ERROR: Configuración Nginx no válida"
            send_telegram "🚨 ALERTA: Configuración Nginx no válida"
            return 1
        fi
    else
        echo -e "${RED}✗ Nginx NO está corriendo${NC}"
        log_message "ERROR: Nginx no está corriendo"
        send_telegram "🚨 ALERTA: Nginx no está corriendo"
        return 1
    fi
    
    return 0
}

check_logs() {
    echo -e "${BLUE}=== Verificando Logs de Error ===${NC}"
    
    # Verificar logs de nginx
    nginx_errors=$(sudo tail -20 /var/log/nginx/error.log 2>/dev/null | grep -i "error\|failed\|refused" | tail -5)
    if [ -n "$nginx_errors" ]; then
        echo -e "${YELLOW}⚠ Errores recientes en logs de Nginx:${NC}"
        echo "$nginx_errors"
        log_message "WARNING: Errores en logs de Nginx"
    else
        echo -e "${GREEN}✓ Sin errores recientes en logs de Nginx${NC}"
    fi
    
    # Verificar logs de contenedores
    for container in bot2-agent bot2-litellm bot2-redis bot2-vendure; do
        if (docker ps --format "{{.Names}}" 2>/dev/null || podman ps --format "{{.Names}}") | grep -q "$container"; then
            container_logs=$((docker logs --tail 10 "$container" 2>/dev/null || podman logs --tail 10 "$container" 2>/dev/null) | grep -i "error\|failed\|exception" | tail -3)
            if [ -n "$container_logs" ]; then
                echo -e "${YELLOW}⚠ Errores en contenedor $container:${NC}"
                echo "$container_logs"
                log_message "WARNING: Errores en contenedor $container"
            fi
        fi
    done
    
    return 0
}

check_resources() {
    echo -e "${BLUE}=== Verificando Recursos del Sistema ===${NC}"
    
    # Uso de CPU
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "CPU: ${cpu_usage}%"
    
    # Uso de memoria
    mem_total=$(free -m | awk '/^Mem:/{print $2}')
    mem_used=$(free -m | awk '/^Mem:/{print $3}')
    mem_percent=$((mem_used * 100 / mem_total))
    echo -e "Memoria: ${mem_used}MB/${mem_total}MB (${mem_percent}%)"
    
    # Uso de disco
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    echo -e "Disco: ${disk_usage}% usado"
    
    # Alertas
    if [ "$cpu_usage" -gt 80 ]; then
        echo -e "${YELLOW}⚠ Alta utilización de CPU${NC}"
        log_message "WARNING: Alta utilización de CPU: ${cpu_usage}%"
    fi
    
    if [ "$mem_percent" -gt 80 ]; then
        echo -e "${YELLOW}⚠ Alta utilización de memoria${NC}"
        log_message "WARNING: Alta utilización de memoria: ${mem_percent}%"
    fi
    
    if [ "$disk_usage" -gt 80 ]; then
        echo -e "${YELLOW}⚠ Alta utilización de disco${NC}"
        log_message "WARNING: Alta utilización de disco: ${disk_usage}%"
    fi
    
    return 0
}

# Función principal
main() {
    echo -e "\n${BLUE}🚀 Iniciando monitoreo - $(date)${NC}\n"
    
    # Verificar servicios
    check_service "bot2-agent" "$BOT_URL" "$BOT_PORT" "bot"
    bot_status=$?
    
    check_service "bot2-vendure" "$ERP_URL" "$ERP_PORT" "erp"
    erp_status=$?
    
    check_service "" "$INVENTARIO_URL" "" "inventario"
    inventario_status=$?
    
    check_service "" "$WEBPAGE_URL" "" "webpage"
    webpage_status=$?
    
    # Verificar Nginx
    check_nginx
    nginx_status=$?
    
    # Verificar logs
    check_logs
    
    # Verificar recursos
    check_resources
    
    # Resumen
    echo -e "\n${BLUE}📊 Resumen del Estado${NC}"
    echo -e "Bot: $( [ $bot_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "ERP: $( [ $erp_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Inventario: $( [ $inventario_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Webpage: $( [ $webpage_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    echo -e "Nginx: $( [ $nginx_status -eq 0 ] && echo -e "${GREEN}✅ OPERATIVO${NC}" || echo -e "${RED}❌ PROBLEMA${NC}" )"
    
    # Estado general
    total_status=$((bot_status + erp_status + inventario_status + webpage_status + nginx_status))
    
    if [ $total_status -eq 0 ]; then
        echo -e "\n${GREEN}🎉 TODOS LOS SERVICIOS ESTÁN OPERATIVOS${NC}"
        log_message "INFO: Todos los servicios están operativos"
    else
        echo -e "\n${RED}⚠ ALGUNOS SERVICIOS TIENEN PROBLEMAS${NC}"
        log_message "ERROR: Algunos servicios tienen problemas"
        send_telegram "⚠ ALERTA: Problemas detectados en servicios de Ferretería El Hogar"
    fi
    
    echo -e "\n${BLUE}📝 Logs guardados en: $LOG_FILE${NC}"
}

# Ejecutar
main "$@"