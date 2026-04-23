#!/bin/bash
# deploy.sh — Build y deploy completo de vendure-ferreteria
# Uso: ./deploy.sh
# Resuelve: permisos, compilacion correcta con node20, receipt plugin, logo

set -e
SSH="ssh -p 2222 -i nativobot.pem -o StrictHostKeyChecking=no openclaw@52.200.214.27"
SCP="scp -P 2222 -i nativobot.pem -o StrictHostKeyChecking=no"
REMOTE=/home/openclaw/bot2-workspace/projects/vendure-ferreteria
LOGO=/home/user/Escritorio/pro26/ferreteriaehogar.com/public/images/logo.jpg

echo "=== 1. Compilar receipt plugin (con logo base64) ==="
cd "$(dirname "$0")"
python3 build_receipt_js.py
node -c /tmp/receipt-printer.plugin.js
$SCP /tmp/receipt-printer.plugin.js openclaw@52.200.214.27:$REMOTE/dist/plugins/receipt-printer.plugin.js

echo "=== 2. Compilar admin-ui (Angular) en host con linuxbrew node ==="
export PATH=/home/linuxbrew/.linuxbrew/bin:$PATH
# Limpiar archivos del container que bloquean el compile
$SSH "podman exec bot2-vendure rm -rf /app/admin-ui/src /app/admin-ui/static-assets 2>/dev/null || true"
$SSH "cd $REMOTE && node node_modules/.bin/ts-node compile-admin-ui.ts 2>&1 | tail -3"

echo "=== 3. Restaurar logos en admin-ui/dist/browser/assets/ ==="
python3 -c "
from PIL import Image
img = Image.open('$LOGO')
img.save('/tmp/logo-top.webp', 'WEBP')
img.save('/tmp/logo-top.png', 'PNG')
"
$SCP /tmp/logo-top.webp /tmp/logo-top.png openclaw@52.200.214.27:$REMOTE/admin-ui/dist/browser/assets/
$SCP $LOGO openclaw@52.200.214.27:$REMOTE/admin-ui/dist/browser/assets/logo.jpg

echo "=== 4. Compilar TypeScript src/ -> dist/ dentro del container (node20) ==="
$SSH "
  podman run -d --name vendure-tsc --user root \
    -v $REMOTE/dist:/app/dist \
    --entrypoint sleep localhost/vendure-ferreteria_vendure infinity
  podman cp $REMOTE/src vendure-tsc:/app/src
  podman cp $REMOTE/tsconfig.json vendure-tsc:/app/tsconfig.json
  podman exec -w /app vendure-tsc node node_modules/.bin/tsc
  podman stop vendure-tsc && podman rm vendure-tsc
  echo 'tsc OK'
"

echo "=== 5. Restaurar receipt plugin (tsc lo sobreescribe) ==="
$SCP /tmp/receipt-printer.plugin.js openclaw@52.200.214.27:$REMOTE/dist/plugins/receipt-printer.plugin.js

echo "=== 6. Rebuild imagen Docker ==="
$SSH "cd $REMOTE && podman build -t localhost/vendure-ferreteria_vendure . 2>&1 | tail -3"

echo "=== 7. Permisos admin-ui/dist para escritura por container (uid 1001) ==="
$SSH "chmod -R 777 $REMOTE/admin-ui/dist/"

echo "=== 8. Restart container ==="
$SSH "
  cd $REMOTE
  export PATH=/home/linuxbrew/.linuxbrew/bin:\$PATH
  podman stop bot2-vendure 2>/dev/null || true
  podman rm bot2-vendure 2>/dev/null || true
  podman-compose up -d 2>&1 | grep -E 'exit code'
"

echo "=== 9. Verificar startup ==="
sleep 15
$SSH "podman logs --tail 5 bot2-vendure"
