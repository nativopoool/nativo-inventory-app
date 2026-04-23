#!/bin/bash
# nativo-publish.sh - Auto-Publisher and Diagnostic Script for Nativo Inventory App
# Este script verifica el entorno, sube los secrets a EAS, inicializa un build de produccion (.aab)
# y lo envia a la Play Store en el track interno. Todo de manera automatizada y con observabilidad.

set -e

# Colores para observabilidad
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

LOG_FILE="publish_$(date +%s).log"

# Redirigir stdout y stderr a tee para mostrar y guardar
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BLUE}=== Iniciando Diagnóstico y Publicación de Nativo Inventory App ===${NC}"
echo "Log guardado en: $LOG_FILE"

# 0. Cleanup
echo "🧹 [1/8] Limpiando cache de Metro y temporales..."
rm -rf .expo
rm -rf dist

# 0.1 Incremento Automático de Versión
echo -e "\n${YELLOW}[0/5] Incrementando versionCode en app.json...${NC}"
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'jq' no está instalado. Instalalo para usar el autoincremento.${NC}"
    exit 1
fi

CURRENT_VERSION=$(jq -r '.expo.android.versionCode' app.json)
NEW_VERSION=$((CURRENT_VERSION + 1))
jq ".expo.android.versionCode = $NEW_VERSION" app.json > app.json.tmp && mv app.json.tmp app.json

echo -e "${GREEN}✓ VersionCode actualizado: $CURRENT_VERSION -> $NEW_VERSION${NC}"

# Hacer commit automático del cambio de versión
git add app.json
git commit -m "chore: bump versionCode to $NEW_VERSION [auto]" || echo "No hay cambios para committear"

# 1. Diagnóstico del entorno
echo -e "\n${YELLOW}[1/5] Diagnostics: Checking Environment...${NC}"

# Verificar si pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm no está instalado. Usando npx como fallback donde sea necesario.${NC}"
else
    echo -e "${GREEN}✓ pnpm está instalado.${NC}"
fi

# Verificar si EAS CLI está disponible via NPX si no es global
if ! npx -y eas-cli --version &> /dev/null; then
    echo -e "${RED}Instalando eas-cli temporalmente localmente...${NC}"
    pnpm add -D eas-cli
else
    echo -e "${GREEN}✓ eas-cli test pasado.${NC}"
fi

# Verificar si hay expo project configurado
if [ ! -f "eas.json" ]; then
    echo -e "${RED}Error: as.json no encontrado. Asegurate de estar en nativo-inventory-app.${NC}"
    exit 1
fi

EAS_CMD="npx -y eas-cli"

# Verificar status de login en EAS
echo "Verificando sesión en Expo..."
if ! $EAS_CMD whoami &> /dev/null; then
    echo -e "${YELLOW}No hay sesión activa en EAS. Por favor, logueate primero usando: npx eas-cli login${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Sesión activa en EAS Confirmada.${NC}"
fi


# 2. Diagnóstico del Proyecto y Sincronización de Secrets
echo -e "\n${YELLOW}[2/5] Diagnostics: Reading local .env variables and syncing to EAS Secrets...${NC}"
if [ -f ".env" ]; then
    echo "Sincronizando secretos esenciales a EAS scope: project..."
    # Usando awk para parsear el .env de manera segura (ignorando comentarios y líneas vacías)
    export $(grep -v '^#' .env | xargs)
    
    # Subir propiedades críticas para producción
    secrets_to_upload=(
        "EXPO_PUBLIC_API_URL"
        "EXPO_PUBLIC_AI_AGENT_URL"
        "EXPO_PUBLIC_AI_AGENT_KEY"
        "EXPO_PUBLIC_AI_MODEL"
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
        "EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID"
    )

    for secret in "${secrets_to_upload[@]}"; do
        if [ -n "${!secret}" ]; then
            echo "Subiendo secreto: $secret"
            # Intentar crear/actualizar. Ignoramos errores si ya existe con otra visibilidad para no bloquear el build.
            $EAS_CMD env:create --scope project --environment production --name "$secret" --value "${!secret}" --type string --visibility plaintext --force --non-interactive || \
            $EAS_CMD env:create --scope project --environment production --name "$secret" --value "${!secret}" --type string --visibility sensitive --force --non-interactive || \
            echo -e "${YELLOW}Advertencia: No se pudo actualizar $secret (posiblemente ya existe con otra visibilidad). Continuando...${NC}"
        else
            echo -e "${RED}Advertencia: El secreto $secret no se encuentra en el .env local.${NC}"
        fi
    done

    # Fallback especial para OpenRouter
    if [ -z "$EXPO_PUBLIC_OPENROUTER_KEY" ] && [ -n "$EXPO_PUBLIC_AI_AGENT_KEY" ]; then
        echo "Sincronizando EXPO_PUBLIC_OPENROUTER_KEY..."
        $EAS_CMD env:create --scope project --environment production --name "EXPO_PUBLIC_OPENROUTER_KEY" --value "$EXPO_PUBLIC_AI_AGENT_KEY" --type string --visibility sensitive --force --non-interactive || true
    fi
    echo -e "${GREEN}✓ Secretos sincronizados.${NC}"
else
    echo -e "${RED}Error: Archivo .env local no encontrado. El proyecto requiere estas variables para la IA.${NC}"
    exit 1
fi


# 3. Pre-build Validation (Local Bundle Check)
echo -e "\n${YELLOW}[3/5] Validating: Running local bundle export to prevent EAS failure...${NC}"
if npx -y expo export --platform android --non-interactive; then
    echo -e "${GREEN}✓ Local bundle validation passed.${NC}"
else
    echo -e "${RED}Error: Local bundle validation failed. Fix code errors before rebuilding.${NC}"
    exit 1
fi

# 4. Queue Guard: Avoiding EAS Concurrency Loops
echo -e "\n${YELLOW}[4/5] Queue Guard: Checking EAS Build status...${NC}"
QUEUED_BUILDS=$($EAS_CMD build:list --status in-queue --limit 1 --non-interactive | grep -c "Status" || true)

if [ "$QUEUED_BUILDS" -gt 0 ]; then
    echo -e "${RED}Error: Ya hay una build en cola para este proyecto.${NC}"
    echo -e "${YELLOW}Para evitar bucles de concurrencia, este script no iniciará una nueva build hasta que la cola esté vacía.${NC}"
    echo -e "Puedes cancelar la build actual con: npx eas-cli build:cancel"
    exit 1
fi

# 5. Solicitando Build en EAS
echo -e "\n${YELLOW}[5/5] Constructing: Solicitando build (AAB) para producción...${NC}"
echo "Iniciando compilación remota (platform: android, profile: production)"
# --non-interactive para que no pida confirmaciones manuales de keystore (usará la que se ha autogenerado)
if $EAS_CMD build --profile production --platform android --non-interactive; then
    echo -e "${GREEN}✓ Build enviado y procesado exitosamente en EAS.${NC}"
else
    echo -e "${RED}Error catastrófico en la fase de compilación. Revisa el log de EAS.${NC}"
    exit 1
fi

# 6. Solicitando Submit a la Play Store
echo -e "\n${YELLOW}[6/5] Distributing: Enviando AAB a Google Play Console (Track: internal)...${NC}"

# Verificar si existe el archivo de credenciales configurado en eas.json
PLAY_KEY="google-play-key.json"
if [ ! -f "$PLAY_KEY" ]; then
    echo -e "${RED}Error: Archivo de credenciales '$PLAY_KEY' no encontrado.${NC}"
    echo -e "${YELLOW}Para automatizar el envío, descarga el JSON de Service Account desde Google Play Console y gúardalo como '$PLAY_KEY'.${NC}"
else
    echo "Iniciando proceso de envío (submit)..."
    if $EAS_CMD submit --profile production --platform android --track internal --non-interactive; then
        echo -e "${GREEN}✓ Solicitud de publicación enviada exitosamente.${NC}"
    else
        echo -e "${RED}Error al enviar a la Play Store. Revisa los logs de EAS.${NC}"
    fi
fi

# 5. Resumen
echo -e "\n${BLUE}=== Operación Finalizada ===${NC}"
echo -e "Logs guardados en: ${GREEN}$(realpath $LOG_FILE)${NC}"
echo -e "Puedes monitorear tu build actual desde la url web proporcionada por expo."
