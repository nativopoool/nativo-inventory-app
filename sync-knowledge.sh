#!/bin/bash
# sync-knowledge.sh — Sincroniza la base de conocimientos con el servidor remoto

set -e

# Configuración
SSH_KEY="-i nativobot.pem"
SSH_PORT="2222"
REMOTE_HOST="openclaw@52.200.214.27"
REMOTE_DIR="/home/openclaw/workspace"
FILE="KNOWLEDGE.md"

echo "=== 1. Sincronizando $FILE con /tmp/ en el servidor remoto ==="
scp -P $SSH_PORT $SSH_KEY -o StrictHostKeyChecking=no $FILE $REMOTE_HOST:/tmp/$FILE

echo "=== 2. Moviendo archivo a $REMOTE_DIR con sudo ==="
ssh -p $SSH_PORT $SSH_KEY -o StrictHostKeyChecking=no $REMOTE_HOST "sudo mv /tmp/$FILE $REMOTE_DIR/$FILE && sudo chown 166535:166535 $REMOTE_DIR/$FILE"

echo "=== 3. Verificando archivo en el servidor ==="
ssh -p $SSH_PORT $SSH_KEY -o StrictHostKeyChecking=no $REMOTE_HOST "ls -lh $REMOTE_DIR/$FILE"

echo "=== 4. Reiniciando bot2-agent para recargar conocimiento ==="
ssh -p $SSH_PORT $SSH_KEY -o StrictHostKeyChecking=no $REMOTE_HOST "podman restart bot2-agent"

echo "=== ✅ Sincronización completada ==="
