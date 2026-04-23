# Protocolo de QA — Chat IA MeBot Inventory

Este documento define las pruebas para validar la integración conversacional con el agente OpenClaw y la consulta de datos en Vendure ERP.

## 1. Pruebas de Interfaz (UI/UX)
- [ ] **Acceso**: Verificar que el icono de chat (💬) aparece en la TabBar.
- [ ] **Scroll automático**: Al enviar o recibir mensajes, la lista debe bajar automáticamente al final.
- [ ] **Teclado**: Verificar que el `KeyboardAvoidingView` permite ver el campo de texto mientras se escribe.
- [ ] **Indicador de escritura**: Debe aparecer "MeBot está pensando..." mientras se espera la respuesta del API.

## 2. Pruebas de Integración IA (OpenClaw)
- [ ] **Conexión**: Enviar un saludo ("Hola") y verificar que la IA responda identificándose como MeBot.
- [ ] **Contexto**: Preguntar "¿Quién eres?" para validar que el `system_message` está configurado correctamente.
- [ ] **Error de Red**: Desactivar el WiFi/Datos y enviar un mensaje. Debe mostrar un mensaje de error amigable.

## 3. Pruebas de Negocio (Consultas Vendure)
*Nota: Estas pruebas requieren que el agente OpenClaw tenga configuradas las herramientas (tools) de Vendure.*

| Caso de Prueba | Entrada (Prompt) | Resultado Esperado |
|--------------|------------------|--------------------|
| **Búsqueda General** | "¿Tienes martillos en inventario?" | Lista de productos que contienen "martillo". |
| **Consulta Stock** | "¿Cuántas unidades hay del SKU 'MART-001'?" | Respuesta con la cantidad exacta en bodegas. |
| **Precios** | "¿Qué precio tiene el Taladro Bosch?" | Respuesta con el precio actual en COP. |
| **Ubicación** | "¿Dónde está el Serrucho Pro?" | Información sobre la bodega o pasillo (si está en Vendure). |

## 4. Pruebas de Robustez
- [ ] **Prompts Largos**: Enviar un párrafo largo para ver si el API maneja bien el límite de tokens.
- [ ] **Cambio de Pestaña**: Cambiar al Scanner y volver al Chat. Los mensajes deben persistir (mientras la app no se cierre).

---
**Fecha de última actualización:** 2026-04-23
**Versión de App:** 25 (Web/Mobile)
