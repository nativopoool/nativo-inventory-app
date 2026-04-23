#!/bin/bash
# monitor_bot2_autorepair.sh
# Monitor con auto-reparación completa para bot2.ferreteriaelhogar.com
# v2.0 - 2026-04-04
# Detecta y repara: contenedores caídos/Created, stack completo abajo, nginx caído

# ===================== CONFIG =====================
COMPOSE_PATH="/home/openclaw/bot2-workspace/projects/vendure-ferreteria"
LOG_FILE="/home/openclaw/bot2-workspace/projects/vendure-ferreteria/monitor.log"
MAX_LOG_LINES=1000
AGENT_URL="http://127.0.0.1:18791/__openclaw__/health"
PROXY_URL="http://127.0.0.1:4183/ping"
PUBLIC_URL="https://bot2.ferreteriaelhogar.com/chat"
VITACORA_FILE="/home/openclaw/bot2-workspace/projects/vendure-ferreteria/INCIDENTS.md"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="8286401760"

# Contenedores críticos que DEBEN estar en estado "Up"
CRITICAL_CONTAINERS=("vendure-ferreteria-agent" "vendure-ferreteria-litellm" "vendure-ferreteria-redis" "vendure-ferreteria-oauth2" "vendure-ferreteria-vendure" "vendure-ferreteria-frontend")

# ===================== LOCK para evitar ejecuciones paralelas =====================
LOCK_FILE="/tmp/monitor_bot2.lock"
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "Monitor ya en ejecución (PID $LOCK_PID). Saliendo."
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# ===================== UTILIDADES =====================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
    # Rotar log si supera MAX_LOG_LINES
    line_count=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$line_count" -gt "$MAX_LOG_LINES" ]; then
        tail -500 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
}

send_telegram() {
    local msg="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
            --data-urlencode "text=${msg}" \
            > /dev/null 2>&1
    fi
}

# Registrar incidencia en la vitácora Markdown
log_incident_to_vitacora() {
    local gravedad="$1"
    local incidente="$2"
    local causa="$3"
    local solucion="$4"
    
    # Crear archivo si no existe con cabecera
    if [ ! -f "$VITACORA_FILE" ]; then
        echo "# 📋 Registro de Incidencias: Bot2 Admin Agent" > "$VITACORA_FILE"
        echo "" >> "$VITACORA_FILE"
        echo "| Fecha/Hora | Gravedad | Incidente | Análisis (Root Cause) | Solución / Reparación |" >> "$VITACORA_FILE"
        echo "| :--- | :--- | :--- | :--- | :--- |" >> "$VITACORA_FILE"
    fi
    
    local fecha=$(date '+%Y-%m-%d %H:%M')
    echo "| **$fecha** | **$gravedad** | $incidente | $causa | $solucion |" >> "$VITACORA_FILE"
}

# ===================== VERIFICACIONES =====================

# Verifica si un contenedor está corriendo (estado "Up")
is_container_up() {
    local name="$1"
    podman ps --format '{{.Names}}\t{{.Status}}' 2>/dev/null | grep "^${name}" | grep -q "Up"
}

# Verifica si hay contenedores en estado "Created" (parados pero configurados)
has_created_containers() {
    podman ps -a --format '{{.Names}}\t{{.Status}}' 2>/dev/null | grep -q "Created"
}

# Cuenta cuántos críticos están caídos
count_down_containers() {
    local count=0
    for c in "${CRITICAL_CONTAINERS[@]}"; do
        if ! is_container_up "$c"; then
            count=$((count + 1))
        fi
    done
    echo "$count"
}

# Verifica el health del agente vía HTTP
check_agent_http() {
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "$AGENT_URL" 2>/dev/null || echo "000")
    [ "$code" = "200" ]
}

# Verifica el health del OAuth2 proxy
check_proxy_http() {
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "$PROXY_URL" 2>/dev/null || echo "000")
    [ "$code" = "200" ] || [ "$code" = "202" ] || [ "$code" = "204" ]
}

# ===================== ACCIONES DE REPARACIÓN =====================

# Reparación nivel 1: reiniciar un contenedor específico
restart_container() {
    local name="$1"
    log "REPAIR L1: Reiniciando contenedor $name..."
    podman restart "$name" 2>&1 | tail -3 >> "$LOG_FILE" || true
    sleep 8
    if is_container_up "$name"; then
        log "SUCCESS: Contenedor $name reiniciado correctamente."
        log_incident_to_vitacora "Media" "Contenedor $name caído" "Fallo individual del proceso" "Reinicio de contenedor individual exitoso"
        return 0
    else
        log "ERROR: Contenedor $name no pudo reiniciarse."
        return 1
    fi
}

# Reparación nivel 2: levantar stack completo con podman-compose
restart_full_stack() {
    log "REPAIR L2: Reiniciando STACK COMPLETO con podman-compose..."
    send_telegram "🔧 Bot2 Ferretería: stack caído. Iniciando reparación automática completa..."

    cd "$COMPOSE_PATH" || { log "ERROR: No se puede acceder a $COMPOSE_PATH"; return 1; }

    # Intentar levantar directamente (sin bajar - más rápido)
    log "Intentando podman-compose up -d..."
    podman-compose up -d 2>&1 | tail -20 >> "$LOG_FILE"

    sleep 20

    local down_count
    down_count=$(count_down_containers)

    if [ "$down_count" -eq 0 ] && check_agent_http; then
        log "SUCCESS: Stack completo restaurado. Agente respondiendo HTTP 200."
        send_telegram "✅ Bot2 Ferretería restaurado automáticamente. Todos los servicios operativos."
        log_incident_to_vitacora "Crítica" "Stack completo caído" "Posible reinicio de servidor o caída masiva" "Reparación de stack completo (podman-compose up)"
        return 0
    fi

    # Si aún hay problemas, bajar y subir
    log "REPAIR L2b: Bajando stack y reiniciando..."
    podman-compose down 2>&1 | tail -10 >> "$LOG_FILE" || true
    sleep 5
    podman-compose up -d 2>&1 | tail -20 >> "$LOG_FILE"
    sleep 25

    down_count=$(count_down_containers)
    if [ "$down_count" -eq 0 ] && check_agent_http; then
        log "SUCCESS: Stack restaurado tras down+up. Agente HTTP 200."
        send_telegram "✅ Bot2 Ferretería restaurado (down+up). Todos los servicios operativos."
        log_incident_to_vitacora "Crítica" "Stack completo caído (reintento)" "Fallo persistente tras primer intento" "Reparación profunda (down + up)"
        return 0
    else
        log "CRITICAL: No se pudo restaurar el stack. Contenedores caídos: $down_count"
        send_telegram "❌ CRÍTICO: Bot2 Ferretería NO pudo ser restaurado automáticamente. Requiere intervención manual."
        log_incident_to_vitacora "Fatal" "Fallo total de reparación" "Fallo sistémico no recuperable automáticamente" "N/A - Requiere manual"
        return 1
    fi
}

# ===================== LÓGICA PRINCIPAL =====================
main() {
    local healed=0
    local issues=0

    # --- Paso 1: verificar contenedores críticos ---
    local down_count
    down_count=$(count_down_containers)

    if [ "$down_count" -gt 0 ]; then
        log "ALERT: $down_count contenedor(es) crítico(s) NO están Up."
        issues=$((issues + down_count))

        # Listar cuáles están caídos
        for c in "${CRITICAL_CONTAINERS[@]}"; do
            if ! is_container_up "$c"; then
                log "DOWN: $c => $(podman ps -a --format '{{.Names}}\t{{.Status}}' 2>/dev/null | grep "^${c}" | awk '{print $2, $3}')"
            fi
        done

        # Si el agente principal está caído → reparar stack completo
        if ! is_container_up "bot2-agent"; then
            log "CRITICAL: bot2-agent está caído. Iniciando reparación de stack completo..."
            if restart_full_stack; then
                healed=1
            fi
        else
            # Solo algunos contenedores secundarios caídos → reiniciar individualmente
            for c in "${CRITICAL_CONTAINERS[@]}"; do
                if ! is_container_up "$c"; then
                    restart_container "$c" && healed=1 || true
                fi
            done
        fi
    fi

    # --- Paso 2: verificar health HTTP del agente (aunque esté "Up" puede no responder) ---
    if ! check_agent_http; then
        log "ALERT: Agente Up pero NO responde HTTP en $AGENT_URL"
        issues=$((issues + 1))

        if [ "$healed" -eq 0 ]; then
            log "Intentando reiniciar bot2-agent por fallo HTTP..."
            if restart_container "bot2-agent"; then
                sleep 10
                if check_agent_http; then
                    log "SUCCESS: Agente respondiendo HTTP tras reinicio."
                    healed=1
                    send_telegram "✅ Bot2 Ferretería: agente reiniciado y restaurado."
                else
                    log "Reinicio individual falló. Escalando a reparación de stack completo..."
                    restart_full_stack && healed=1 || true
                fi
            fi
        fi
    fi

    # --- Paso 3: verificar OAuth2 proxy ---
    if ! check_proxy_http && is_container_up "bot2-oauth2"; then
        log "ALERT: OAuth2 proxy Up pero no responde en $PROXY_URL"
        restart_container "bot2-oauth2" || true
    fi

    # --- Resumen ---
    if [ "$issues" -eq 0 ]; then
        log "OK: Todos los servicios operativos. Agent HTTP: $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$AGENT_URL" 2>/dev/null)"
    elif [ "$healed" -eq 1 ]; then
        log "REPAIRED: Se detectaron y repararon $issues problema(s)."
    else
        log "ERROR: $issues problema(s) sin resolver. Revisar manualmente."
    fi
}

main
