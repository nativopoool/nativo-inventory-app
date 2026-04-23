# 🦞 bot2ferreteriaelhogar — Guía de Operación

**Tipo de instalación:** `openrouter-https-cloudflare`  
**Fecha de instalación:** 2026-03-18  
**Última actualización:** 2026-04-02  
**Estado:** ✅ OPERATIVO (Estabilizado)  
**OpenClaw:** v2026.4.1

---

## 🌐 Acceso

| | |
|--|--|
| **Dashboard HTTPS** | **https://bot2.ferreteriaelhogar.com** |
| **Token de acceso** | `a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4` |
| **Dashboard con token** | **https://bot2.ferreteriaelhogar.com/chat#token=a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4** |
| **WebSocket URL** | `wss://bot2.ferreteriaelhogar.com` |

> El token va en el campo de login del dashboard. No compartas este archivo.

---

## 🖥️ Servidor

| Campo | Valor |
|-------|-------|
| **IP pública** | `52.200.214.27` |
| **SSH** | `ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27` |
| **Instancia** | AWS EC2 |
| **Disco** | 30GB gp3 SSD |
| **OS** | Ubuntu 24.04 LTS |
| **Región AWS** | us-east-1 |

---

## 🐚 Scripts de Administración

Ejecutar desde este directorio (`bot2ferreteriaelhogar/`):

```bash
./1-connect-ssh.sh       # Abre sesión SSH interactiva
./2-upgrade.sh           # Actualiza OpenClaw a la última versión (npm install -g + rebuild)
./3-tunnel.sh            # Túnel local → dashboard en localhost:18790
./4-status.sh            # Estado completo del sistema (contenedores, logs, recursos)
./5-tui.sh               # Acceso directo a la interfaz terminal (OpenClaw TUI)
./6-snapshot.sh          # Instantánea total (Backup de archivos .json + AWS EBS Snapshot)
```

### Nuevos Scripts de Mantenimiento (2026-04-02)

```bash
./quick-fix-bot2.sh       # Corrección rápida de errores de auto-reinicio
./fix-bot2-autoerrors.sh  # Herramienta diagnóstica y reparación completa
```

---

## 🛠️ Solución de Problemas Recientes (2026-04-02)

### Problema Identificado
El servicio bot2 estaba en un bucle de reinicio cada ~2 minutos debido a:
1. Endpoints de health incorrectos en `monitor.sh`
2. Configuración de red IPv4/IPv6 incorrecta
3. Configuración MCP apuntando a IP en lugar de nombre de contenedor
4. Cron jobs agresivos que reiniciaban servicios fallidos

### Solución Aplicada
1. **Endpoints corregidos** en `/home/openclaw/bot2-docker/monitor.sh`:
   - `AGENT_URL="http://[::1]:18791/__openclaw__/health"`
   - `PROXY_URL="http://[::1]:4183/ping"`
2. **Red corregida**: Vendure conectado a `bot2-docker_openclaw-external`
3. **MCP corregido**: Endpoints actualizados a `http://bot2-vendure:3000`
4. **Cron jobs deshabilitados** temporalmente

### Verificación
```bash
# Verificar estado de contenedores
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "podman ps"

# Verificar health endpoints
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "curl -s -o /dev/null -w 'Agent: %{http_code}' http://[::1]:18791/__openclaw__/health && echo"
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "curl -s -o /dev/null -w 'Proxy: %{http_code}' http://[::1]:4183/ping && echo"
```

---

## 🤖 Configuración LLM

| Campo | Valor |
|-------|-------|
| **Proveedor** | Openrouter |
| **Modelo primario** | `openai/gpt-4o-mini` |
| **Modelo LiteLLM** | `openrouter/openai/gpt-4o-mini` |
| **Ruta** | `agent → bot2-litellm:4000 → openrouter.ai` |

**Archivo de configuración:** `litellm-config.yaml`

---

## 🐳 Contenedores (Actual)

```bash
# Ver estado
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "podman ps"

# Logs del agente (últimas 50 líneas)
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "podman logs --tail 50 bot2-agent"

# Reiniciar agente
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "podman restart bot2-agent"

# Lista de contenedores activos:
# - bot2-litellm    (LiteLLM proxy, puerto 4002)
# - bot2-redis      (Redis cache, puerto 6379)
# - bot2-oauth2     (OAuth2 proxy, puerto 4183)
# - bot2-agent      (OpenClaw gateway, puertos 18791, 4003)
# - bot2-filebrowser(File browser, puerto 8882)
# - bot2-vendure    (Vendure ERP, puerto 3000)
```

---

## 📊 Monitoreo

### Estado Actual
Los cron jobs de monitoreo están **deshabilitados** temporalmente para prevenir reinicios innecesarios.

### Habilitar monitoreo (cuando el sistema esté estable)
```bash
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "crontab -l | sed 's|^#\\(\\*/2.*monitor\\\\.sh\\)$|\\1|; s|^#\\(\\*/2.*monitor_servicios_auto\\\\.sh\\)$|\\1|' | crontab -"
```

### Deshabilitar monitoreo
```bash
ssh -p 2222 -i nativobot.pem openclaw@52.200.214.27 "crontab -l | sed 's|^\\(\\*/2.*monitor\\\\.sh\\)$|#\\1|; s|^\\(\\*/2.*monitor_servicios_auto\\\\.sh\\)$|#\\1|' | crontab -"
```

---

## 📝 Historial

| Fecha | Cambio |
|-------|--------|
| 2026-03-18 | Instalación inicial — OpenClaw + openrouter (gemma-3-27b-it:free) |
| 2026-03-18 | Configuración de scripts de administración locales |
| 2026-03-18 | HTTPS configurado: `bot2.ferreteriaelhogar.com` |
| 2026-04-02 | **ESTABILIZACIÓN CRÍTICA**: Corrección de bucle de reinicio, endpoints IPv6, red vendure |
| 2026-04-02 | Nuevos scripts de diagnóstico y reparación |
| 2026-04-02 | Actualización de documentación y tokens |

---

## 📚 Documentación Adicional

- **Solución detallada:** [BOT2_FIX_SOLUTION.md](BOT2_FIX_SOLUTION.md)
- **Script de diagnóstico:** `./fix-bot2-autoerrors.sh`
- **Script de reparación rápida:** `./quick-fix-bot2.sh`

---

## ⚠️ Notas Importantes

1. **IPv6 vs IPv4**: Los servicios se enlazan a `[::1]` (IPv6), no a `127.0.0.1` (IPv4)
2. **Comunicación entre contenedores**: Usar nombres de contenedor (ej: `bot2-vendure:3000`)
3. **Token de gateway**: Cambiado a `a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4`
4. **Monitoreo**: Deshabilitado hasta confirmar estabilidad del sistema

---

**Última verificación:** 2026-04-02 15:35 UTC-5  
**Estado del sistema:** ✅ ESTABLE