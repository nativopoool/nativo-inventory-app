#!/bin/bash
# nativo-publish-apk.sh - Automatización punta a punta para el APK de MeBot Inventory
# Este script compila en EAS, espera el resultado, descarga el APK y lo despliega.

set -e

# Configuración de nombres base
BASE_NAME="meBot-Inventory"
EAS_CMD="npx -y eas-cli"

# Colores para feedback
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   MeBot Inventory: Pipeline de Despliegue de APK     ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 0. Incremento Automático de Versión
echo -e "${YELLOW}[0/3] Incrementando versionCode en app.json...${NC}"
CURRENT_VERSION=$(jq -r '.expo.android.versionCode' app.json)
NEW_VERSION=$((CURRENT_VERSION + 1))
jq ".expo.android.versionCode = $NEW_VERSION" app.json > app.json.tmp && mv app.json.tmp app.json

echo -e "${GREEN}✅ VersionCode actualizado: $CURRENT_VERSION -> $NEW_VERSION${NC}"

# Hacer commit automático del cambio de versión
git add app.json
git commit -m "chore: bump versionCode to $NEW_VERSION [auto]" || echo "No hay cambios para committear"

# 1. Verificación de herramientas
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'jq' no está instalado. Es necesario para parsear la respuesta de EAS.${NC}"
    exit 1
fi

# 2. Iniciar build en EAS y esperar
# Usamos --wait para que el script no termine hasta que el APK esté listo en la nube.
echo -e "${YELLOW}[1/3] Lanzando build en Expo EAS (perfil: preview)...${NC}"
echo "Nota: Esto puede tardar varios minutos dependiendo de la cola de Expo."
$EAS_CMD build --profile preview --platform android --non-interactive --wait

# 3. Obtener URL del artefacto
echo -e "${YELLOW}[2/3] Localizando el nuevo APK generado en la nube...${NC}"
APK_URL=$($EAS_CMD build:list --limit 1 --status finished --profile preview --platform android --json | jq -r '.[0].artifacts.applicationArchiveUrl')

if [ "$APK_URL" == "null" ] || [ -z "$APK_URL" ]; then
    echo -e "${RED}❌ Error: No se pudo recuperar la URL del APK desde EAS.${NC}"
    exit 1
fi

# 4. Descarga y Reemplazo
echo -e "${YELLOW}[3/3] Descargando y desplegando en mebot.online...${NC}"
FINAL_FILENAME="${BASE_NAME}-v${NEW_VERSION}.apk"
TARGET_APK_PATH="../webpages/mebot.online/public/app-bin/${FINAL_FILENAME}"
ROOT_BACKUP_PATH="../${FINAL_FILENAME}"

curl -L -o "temp_build.apk" "$APK_URL"

# Asegurar que el directorio de destino existe
mkdir -p "$(dirname "$TARGET_APK_PATH")"

# Mover a la ubicación final
mv "temp_build.apk" "$TARGET_APK_PATH"

# Actualizar copia de respaldo en la raíz del stack (limpiando versiones viejas en la raíz de paso)
rm -f ../${BASE_NAME}-v*.apk
cp "$TARGET_APK_PATH" "$ROOT_BACKUP_PATH"

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}✅ ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!${NC}"
echo -e "El nuevo APK está disponible para descarga en:"
echo -e "${BLUE}https://mebot.online/app-bin/${FINAL_FILENAME}${NC}"
echo -e "${YELLOW}NOTA: Recuerde hacer push en '../webpages/mebot.online' para activar el link.${NC}"
echo -e "${GREEN}======================================================${NC}"
