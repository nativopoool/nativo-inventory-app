# Plan de Pruebas: Dashboard Bot2 via Túnel SSH

## Objetivo
Probar el dashboard Bot2 utilizando túnel SSH para evitar complejidades de OAuth2, ejecutar un protocolo de preguntas estandarizado y documentar resultados con timestamp.

## Fecha y Hora
Plan creado: 2026-04-02 16:35 UTC-5

## Estado Actual Verificado
✅ **Servicios operativos** (desde ~16:30 UTC-5):
- `bot2-agent`: ~1 hora estable (sin reinicios)
- `bot2-vendure`: ~1 hora activo
- Health endpoints respondiendo HTTP 200
- Configuraciones IPv6 corregidas
- Cron jobs deshabilitados (prevención reinicios)

## Pre-requisitos
1. **SSH key:** `nativobot.pem` disponible y con permisos 600
2. **Conexión:** Acceso a servidor `52.200.214.27:2222`
3. **Navegador:** Chrome/Firefox moderno
4. **Token:** `a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4`

## Pasos Detallados

### Paso 1: Actualizar script de túnel (si necesario)
```bash
# Verificar y actualizar 3-tunnel.sh con IP correcta
sed -i 's/54\.147\.195\.15/52.200.214.27/g' 3-tunnel.sh
sed -i 's/18790:localhost:18789/8080:localhost:18791/g' 3-tunnel.sh
```

**Justificación:** 
- IP antigua: `54.147.195.15` → Nueva: `52.200.214.27`
- Puerto: `18791` (host) redirige a `18789` (container)
- Puerto local: `8080` para evitar conflictos

### Paso 2: Establecer túnel SSH
```bash
# Opción A: Usar script modificado
./3-tunnel.sh

# Opción B: Comando directo
ssh -i nativobot.pem -p 2222 -N -L 8080:localhost:18791 openclaw@52.200.214.27 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"
echo "Dashboard: http://localhost:8080/chat"
```

### Paso 3: Verificar conectividad
```bash
# Test básico (debería devolver HTML)
curl -s http://localhost:8080/chat | head -5

# Test health endpoint
curl -s http://localhost:8080/__openclaw__/health | head -5
```

### Paso 4: Acceder dashboard
1. Abrir navegador: `http://localhost:8080/chat`
2. En "Token de la puerta de enlace" pegar: `a9ecfbfee200bfbe22092e264187380d7c20a06b8ea288c4`
3. Click en "Conectar"
4. **Esperado:** Interfaz de chat se carga sin errores

## Protocolo de Preguntas

### Metodología
- **Tiempo entre preguntas:** 30 segundos (para procesamiento)
- **Métrica:** ✅ Correcta, ⚠️ Parcial, ❌ Fallida
- **Timestamps:** Formato `HH:MM:SS`
- **Documentación:** Copiar respuesta completa

### Preguntas Estándar

| # | Categoría | Pregunta | Objetivo de Validación |
|---|-----------|----------|------------------------|
| 1 | Básico | "Hola, ¿cómo estás?" | Conexión WebSocket + respuesta básica |
| 2 | Conocimiento | "¿Cuál es el horario de atención de lunes a viernes?" | Uso de KNOWLEDGE.md (8am-5pm) |
| 3 | Contacto | "¿Cómo los contacto por WhatsApp?" | Información correcta (305 3838829) |
| 4 | Ubicación | "¿Dónde están ubicados exactamente?" | Dirección: Calle 45 #50-79, Medellín |
| 5 | Skill Vendure | "¿Tienen martillos de uña en inventario?" | Activación skill vendure + consulta productos |
| 6 | Skill Vendure | "Buscar productos de ferretería" | Capacidad búsqueda general |
| 7 | Precios | "¿Qué precio tienen los martillos?" | Integración precios desde Vendure |
| 8 | Servicio | "¿Tienen servicio a domicilio? ¿Es gratis?" | Info envíos (gratis >$500k COP) |
| 9 | Compleja | "Necesito herramientas para reparar una puerta, ¿qué me recomiendan?" | Razonamiento + conocimiento productos |
|10 | Error handling | "Buscar producto que no existe: 'xyz123abc'" | Manejo errores apropiado |

### Preguntas Opcionales (Usuario)
- [ ] Agregar preguntas específicas del negocio
- [ ] Incluir consultas de stock específicas
- [ ] Probar formato de precios (COP)

## Método de Documentación

### Archivo de resultados
`TEST_RESULTS_20260402_HHMMSS.md` (generar con timestamp de inicio)

### Formato por pregunta
```markdown
### [HH:MM:SS] Pregunta #X: [Categoría]
**Pregunta:** "¿Texto de la pregunta?"
**Respuesta:** (copiar respuesta completa)
**Evaluación:** ✅ Correcta | ⚠️ Parcial | ❌ Fallida
**Tiempo respuesta:** XX segundos
**Observaciones:**
- Skill activada: [vendure/health/etc]
- Fuentes citadas: [KNOWLEDGE.md, etc]
- Problemas detectados: [ninguno/...]
```

### Resumen ejecutivo
```markdown
## Resumen Ejecutivo
- **Fecha prueba:** 2026-04-02
- **Hora inicio:** HH:MM:SS
- **Hora fin:** HH:MM:SS
- **Duración total:** XX minutos
- **Preguntas totales:** 10
- **Correctas:** X (XX%)
- **Parciales:** Y (YY%)
- **Fallidas:** Z (ZZ%)
- **Skills funcionando:** [vendure, health, etc]
- **Problemas críticos:** [ninguno/lista]
```

## Solución de Problemas

### Escenario 1: Túnel no conecta
```bash
# Verificar SSH
ssh -i nativobot.pem -p 2222 -o ConnectTimeout=5 openclaw@52.200.214.27 "echo test"

# Verificar puerto remoto
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "curl -s http://[::1]:18791/__openclaw__/health"

# Alternativa: usar puerto diferente
ssh -i nativobot.pem -p 2222 -N -L 8081:localhost:18791 openclaw@52.200.214.27 &
```

### Escenario 2: Token no funciona
```bash
# Generar nuevo token
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "podman exec bot2-agent openclaw dashboard"

# Verificar token en openclaw.json
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "grep -A2 'auth' /home/openclaw/bot2-data/openclaw.json"
```

### Escenario 3: Skill vendure no responde
```bash
# Test vendure directo
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "podman exec bot2-agent curl -s -X POST -H 'Content-Type: application/json' --data '{\"query\":\"{ products(options: { take: 1 }) { items { name } } }\"}' http://bot2-vendure:3000/shop-api"

# Verificar MCP config
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "podman exec bot2-agent cat /home/node/.openclaw/mcp.json | grep -A3 vendure"
```

### Escenario 4: WebSocket timeout
- Esperar 1-2 minutos (agente puede estar inicializando)
- Recargar página
- Verificar logs: `ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "podman logs --tail 10 bot2-agent"`

## Criterios de Éxito

### Mínimo aceptable
- ✅ 7/10 preguntas respondidas correctamente
- ✅ Skill vendure funciona en al menos 1 consulta
- ✅ Token authentication funciona
- ✅ No crashes durante prueba (15-20 minutos)

### Óptimo
- ✅ 9/10 preguntas correctas
- ✅ Todas las skills responden apropiadamente
- ✅ Tiempo respuesta < 30 segundos por pregunta
- ✅ Formato de precios correcto (COP)
- ✅ Citas a KNOWLEDGE.md visibles

## Post-Pruebas

### Acciones según resultados
1. **>80% éxito:** Habilitar monitoreo, considerar producción
2. **60-80% éxito:** Ajustar configuración, mejorar skills
3. **<60% éxito:** Diagnóstico profundo, revisar logs

### Habilitar monitoreo (si estable)
```bash
ssh -i nativobot.pem -p 2222 openclaw@52.200.214.27 "crontab -l | sed 's|^#\\(\\*/2.*monitor\\\\.sh\\)$|\\1|; s|^#\\(\\*/2.*monitor_servicios_auto\\\\.sh\\)$|\\1|' | crontab -"
```

### Generar reporte final
1. Consolidar resultados en `TEST_RESULTS_FINAL.md`
2. Incluir recomendaciones específicas
3. Actualizar `README.md` con estado
4. Crear tickets para problemas identificados

## Preguntas Pendientes para Usuario

1. **¿Alguna pregunta específica del negocio para incluir?**
2. **¿Prefiere copiar respuestas manualmente o automatizar captura?**
3. **¿Desea incluir pruebas de carga/estres?**
4. **¿Alguna métrica adicional importante?**

## Timeline Estimado
- **Configuración:** 5 minutos
- **Pruebas:** 15-20 minutos  
- **Documentación:** 10 minutos
- **Total:** 30-35 minutos

## Responsabilidades
- **Ejecutor:** Usuario (con asistencia si necesario)
- **Documentación:** Sistema generará template, usuario completa detalles
- **Validación:** Revisión cruzada de resultados

---
**Plan listo para implementación** 🚀