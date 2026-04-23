#!/bin/sh
set -e

# Path to config
mkdir -p /home/node/.openclaw
chmod 700 /home/node/.openclaw

# Fix Agent-specific configs (Deep Clean)
find /home/node/.openclaw/agents -name "models.json" -delete 2>/dev/null || true
# NOTE: openclaw.json is managed by Ansible (deployed to data_dir volume).
# Do NOT delete or overwrite it here.

# Patch 1008 'Device Identity Required' Error (multi-strategy for v2026.3.1 compatibility)
for f in /usr/local/lib/node_modules/openclaw/dist/gateway-cli-*.js; do
  if [ -f "$f" ]; then
    echo "[Patch] Bypassing device identity checks in $f"
    # Root checks
    sed -i 's/function evaluateMissingDeviceIdentity(params) {/function evaluateMissingDeviceIdentity(params) { return { kind: "allow" }; \/* AG_PATCH *\/ /g' "$f"
    sed -i 's/shouldSkipControlUiPairing([^)]*){/shouldSkipControlUiPairing(p,s,t){return true;/g' "$f"
    
    # Backward compatibility for v2026.2.x
    sed -i 's/const canSkipDevice = sharedAuthOk;/const canSkipDevice = true;/g' "$f"

    # String replacements for v2026.3.x+
    sed -i "s/close(1008, \"device identity required\")/close(1000, \"ok\")/g" "$f"
    sed -i "s/close(1008,'device identity required')/close(1000,'ok')/g" "$f"
    sed -i 's/sendHandshakeErrorResponse(ErrorCodes.NOT_PAIRED,"device identity required",.*DEVICE_IDENTITY_REQUIRED.*});/\/* AG_BYPASS *\/;/g' "$f"
  fi
done

# Patch UI Branding in JS bundles
# Use find for better globbing robustness across shell environments
ASSET_DIR="/usr/local/lib/node_modules/openclaw/dist/control-ui/assets"
if [ -d "$ASSET_DIR" ]; then
  find "$ASSET_DIR" -name "index-*.js" | while read -r f; do
    echo "[Setup] Patching branding in $f"
    if [ -n "$BRAND_TITLE" ]; then
      sed -i "s/<div class=\"brand-title\">NATIVOCLAW<\/div>/<div class=\"brand-title\">${BRAND_TITLE}<\/div>/g" "$f"
      sed -i "s/sidebar-brand__title\">NativoClaw<\/span>/sidebar-brand__title\">${BRAND_TITLE}<\/span>/g" "$f"
    fi
    if [ -n "$BRAND_SUBTITLE" ]; then
      sed -i "s/<div class=\"brand-sub\">Gateway Dashboard<\/div>/<div class=\"brand-sub\">${BRAND_SUBTITLE}<\/div>/g" "$f"
      # Target the specific sidebar eyebrow marker or the translation function
      sed -i "s/sidebar-brand__eyebrow\">[^<]*<\/span>/sidebar-brand__eyebrow\">${BRAND_SUBTITLE}<\/span>/g" "$f"
      sed -i "s/sidebar-brand__eyebrow\">\${M([^)]*)}<\/span>/sidebar-brand__eyebrow\">${BRAND_SUBTITLE}<\/span>/g" "$f"
    fi
    
    # Replace the multiline "OpenClaw" breadcrumb text
    if [ -n "$BRAND_TITLE" ]; then
      export BRAND_TITLE
      node -e "const fs = require('fs'); let c = fs.readFileSync('$f', 'utf8'); c = c.replace(/class=\"dashboard-header__breadcrumb-link\"[\\s\\S]*?>[\\s\\n]*OpenClaw[\\s\\n]*<\\/span>/g, m => m.replace('OpenClaw', process.env.BRAND_TITLE)); fs.writeFileSync('$f', c);"
    fi

    if [ -n "$BRAND_LOGO_URL" ]; then
      SAFE_URL=$(echo "$BRAND_LOGO_URL" | sed 's/\//\\\//g')
      sed -i "s/src=\"\/favicon.svg\"/src=\"${SAFE_URL}\"/g" "$f"
    fi
  done
fi

# Patch UI HTML Title
for f in /usr/local/lib/node_modules/openclaw/dist/control-ui/index.html; do
  if [ -f "$f" ] && [ -n "$BRAND_TITLE" ]; then
    sed -i "s/<title>NativoClaw Control<\/title>/<title>${BRAND_TITLE} Control<\/title>/g" "$f"
  fi
done

# Download and replace local favicon/logo
if [ -n "$BRAND_LOGO_URL" ]; then
  WEB_ROOT="/usr/local/lib/node_modules/openclaw/dist/control-ui"
  echo "[Setup] Overwriting local favicon with custom logo from ${BRAND_LOGO_URL}"
  # Ensure we don't fail the whole setup if download fails
  (
    # Create potential subdirectories if they are used for relative branding
    mkdir -p "${WEB_ROOT}/login"

    if [ -f "/home/node/.openclaw/logo.png" ] || [ -f "/home/node/.openclaw/favicon.png" ]; then
      SOURCE_PNG="/home/node/.openclaw/logo.png"
      [ -f "/home/node/.openclaw/favicon.png" ] && [ ! -f "${SOURCE_PNG}" ] && SOURCE_PNG="/home/node/.openclaw/favicon.png"
      
      echo "[Setup] Deploying transparent local PNG assets for branding"
      cp "${SOURCE_PNG}" "${WEB_ROOT}/favicon.png"
      cp "${SOURCE_PNG}" "${WEB_ROOT}/logo.png"
      # Ensure /login/ also has a copy if relative resolution fails
      mkdir -p "${WEB_ROOT}/login"
      cp "${SOURCE_PNG}" "${WEB_ROOT}/login/favicon.png"
      
      if [ -f "/home/node/.openclaw/favicon.svg" ]; then
         echo "[Setup] Deploying transparent local SVG assets (wrappers)"
         cp "/home/node/.openclaw/favicon.svg" "${WEB_ROOT}/favicon.svg"
         cp "/home/node/.openclaw/favicon.svg" "${WEB_ROOT}/login/favicon.svg"
      fi
    elif command -v curl >/dev/null 2>&1; then
      curl -sL -o "${WEB_ROOT}/favicon.svg" "${BRAND_LOGO_URL}" || echo "[Error] curl failed to download"
    elif command -v wget >/dev/null 2>&1; then
      wget -qO "${WEB_ROOT}/favicon.svg" "${BRAND_LOGO_URL}" || echo "[Error] wget failed to download"
    else
      echo "[Error] Neither curl nor wget found for logo download"
    fi
  ) || true

  # Redirect SVG requests to PNG if possible, or just patch the references
  # We use absolute root paths to avoid /login/ related relative failures
  for f in ${WEB_ROOT}/assets/index-*.js ${WEB_ROOT}/index.html; do
     if [ -f "$f" ]; then
        # Ensure we use the absolute path /favicon.png for most consistency
        sed -i 's/href="[^"]*favicon.svg"/href="\/favicon.png"/g' "$f"
        sed -i 's/src="[^"]*favicon.svg"/src="\/logo.png"/g' "$f"
     fi
  done
fi

# Ensure undici is in place
export NODE_PATH="/usr/local/lib/node_modules" || true

# Verify Ansible-deployed openclaw.json is in place
if [ ! -f /home/node/.openclaw/openclaw.json ]; then
  echo "[FATAL] /home/node/.openclaw/openclaw.json not found."
  echo "This file must be deployed by Ansible to the data_dir volume."
  exit 1
fi
echo "[Setup] openclaw.json OK (deployed by Ansible)"

# Match the environment variable to the JSON config precisely via jq
if [ -x /usr/bin/jq ]; then
  echo "[Setup] Patching openclaw.json with host-header origin fallback..."
  # Ensure we have a valid JSON file to start with, or initialize it
  if [ ! -s /home/node/.openclaw/openclaw.json ]; then echo "{}" > /home/node/.openclaw/openclaw.json; fi
  
  tmp=$(mktemp)
  /usr/bin/jq '
    .gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback = true |
    .gateway.controlUi.dangerouslyDisableDeviceAuth = true |
    del(.gateway.dangerouslyAllowUnpaired) |
    del(.gateway.controlUi.dangerouslyAllowUnpaired) |
    .browser.ssrfPolicy.allowedHostnames = ["vendure","litellm","redis","frontend"] |
    .browser.ssrfPolicy.hostnameAllowlist = ["vendure","litellm","redis","frontend"] |
    .agents.defaults.model = {
      "primary": "openrouter/stepfun/step-3.5-flash:free",
      "fallbacks": ["openrouter/qwen/qwen3.6-plus:free", "openrouter/google/gemma-3-27b-it:free"]
    } |
    .models.providers.openrouter = {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "${OPENROUTER_API_KEY}",
      "api": "openai-completions",
      "models": [
        {"id": "stepfun/step-3.5-flash:free",           "name": "StepFun Flash (gratis)",   "compat": {"supportsTools": true}},
        {"id": "qwen/qwen3-coder:free",                 "name": "Qwen3 Coder (gratis)",     "compat": {"supportsTools": true}},
        {"id": "qwen/qwen3-next-80b-a3b-instruct:free", "name": "Qwen3 80B (gratis)",       "reasoning": true, "compat": {"thinkingFormat": "qwen", "supportsTools": true}},
        {"id": "qwen/qwen3.6-plus:free",                "name": "Qwen3.6+ 1M ctx (gratis)", "reasoning": true, "compat": {"thinkingFormat": "qwen", "supportsTools": true}},
        {"id": "google/gemma-3-27b-it:free",            "name": "Gemma 3 27B (gratis)",     "compat": {"supportsTools": true}}
      ]
    }
  ' /home/node/.openclaw/openclaw.json > "$tmp" && cat "$tmp" > /home/node/.openclaw/openclaw.json && rm "$tmp"
  echo "[Setup] openclaw.json patched successfully."
else
  echo "[WARN] jq not found at /usr/bin/jq, skipping config patch."
fi

# Ensure workspace TOOLS.md always uses the correct Docker hostname
mkdir -p /home/node/.openclaw/workspace
cat > /home/node/.openclaw/workspace/TOOLS.md << 'TOOLSEOF'
# TOOLS.md - Ferretería El Hogar

## IMPORTANTE: Búsqueda de productos

Para buscar productos y precios, USA SIEMPRE exec con curl. NO uses browser (no funciona).

Comando para buscar productos (reemplaza TERMINO con el producto):

exec: curl -s -X POST http://vendure:3000/shop-api -H "Content-Type: application/json" -d "{\"query\": \"{ search(input: { term: \\\"TERMINO\\\", take: 10 }) { items { productName priceWithTax { ... on SinglePrice { value } } } } }\"}"

Los precios vienen en centavos COP. Divide entre 100 para obtener pesos.
Ejemplo: value 3290000 = $32.900 COP

## Vendure ERP

- Shop API: http://vendure:3000/shop-api
- Admin API: http://vendure:3000/admin-api
- Accesible desde este servidor via curl (hostname Docker interno)

## Reglas de precios

- Moneda: SIEMPRE COP (pesos colombianos)
- Formato: $X.XXX COP
- NUNCA USD, MXN ni otras monedas
TOOLSEOF
echo "[Setup] workspace/TOOLS.md written."

# Ensure buscar_producto.sh always uses correct Docker hostname
cat > /home/node/.openclaw/workspace/buscar_producto.sh << 'SCRIPTEOF'
#!/bin/sh
TERMINO="${1:-taladro}"
curl -s -X POST http://vendure:3000/shop-api \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ search(input: { term: \\\"${TERMINO}\\\", take: 10 }) { items { productName priceWithTax { ... on SinglePrice { value } } } totalItems } }\"}"
SCRIPTEOF
chmod +x /home/node/.openclaw/workspace/buscar_producto.sh
echo "[Setup] workspace/buscar_producto.sh written."

# Force global HOME and config dir
export HOME=/home/node
export OPENCLAW_CONFIG_DIR=/home/node/.openclaw
export OPENPROSE_POSTGRES_URL="${DATABASE_URL}"

# Send Telegram notification if token is configured
TELEGRAM_FLAG="/home/node/.openclaw/.telegram_notified"
if [ -n "${TELEGRAM_BOT_TOKEN}" ] && [ -n "${TELEGRAM_CHAT_ID}" ] && [ ! -f "${TELEGRAM_FLAG}" ]; then
    BOT_LABEL="bot2"
    MSG="✅ *${BOT_LABEL}* ha sido configurado y está en línea.%0A🌐 https://bot2.ferreteriaelhogar.com%0A🤖 Modelo: google/gemma-3-27b-it:free"
    wget -q --no-check-certificate "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${MSG}&parse_mode=Markdown" -O /tmp/tg_notify.json || true
    touch "${TELEGRAM_FLAG}"
    echo "[Setup] Telegram notification sent."
fi

# Start Gateway
exec openclaw gateway --allow-unconfigured --bind lan
