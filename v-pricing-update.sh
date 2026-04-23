#!/bin/bash
# v-pricing-update.sh — Syncs pricing policy changes to the remote bot

set -e
SSH_KEY="-i nativobot.pem"
SSH_PORT="2222"
REMOTE_HOST="openclaw@52.200.214.27"
REMOTE_WORKSPACE="/home/openclaw/workspace"
REMOTE_DOCKER="/home/openclaw/bot2-docker"
REMOTE_DATA="/home/openclaw/bot2-data/workspace"

echo "=== 1. Sincronizando IDENTITY.md y search_catalog.py ==="
scp -P $SSH_PORT $SSH_KEY IDENTITY.md $REMOTE_HOST:/tmp/IDENTITY.md
scp -P $SSH_PORT $SSH_KEY search_catalog.py $REMOTE_HOST:/tmp/search_catalog.py
scp -P $SSH_PORT $SSH_KEY KNOWLEDGE.md $REMOTE_HOST:/tmp/KNOWLEDGE.md

ssh -p $SSH_PORT $SSH_KEY $REMOTE_HOST "
  # Workspace root (MCP context)
  sudo mv /tmp/IDENTITY.md $REMOTE_WORKSPACE/IDENTITY.md
  sudo mv /tmp/search_catalog.py $REMOTE_WORKSPACE/search_catalog.py
  sudo cp /tmp/KNOWLEDGE.md $REMOTE_WORKSPACE/KNOWLEDGE.md
  
  # Active Data folder (Agent context)
  sudo cp $REMOTE_WORKSPACE/IDENTITY.md $REMOTE_DATA/IDENTITY.md
  sudo cp $REMOTE_WORKSPACE/KNOWLEDGE.md $REMOTE_DATA/KNOWLEDGE.md
  
  # Base files (Backup)
  sudo cp $REMOTE_WORKSPACE/IDENTITY.md /home/openclaw/bot2-data/workspace-files/IDENTITY.md
  sudo cp $REMOTE_WORKSPACE/KNOWLEDGE.md /home/openclaw/bot2-data/workspace-files/KNOWLEDGE.md
  
  # Limpiar memoria para forzar recarga de identidad
  sudo rm -rf /home/openclaw/bot2-data/workspace/memory/*
  
  sudo chown -R 166535:166535 $REMOTE_WORKSPACE $REMOTE_DATA /home/openclaw/bot2-data/workspace-files
"

echo "=== 2. Sincronizando .env.ferreteriaelhogar2 ==="
scp -P $SSH_PORT $SSH_KEY .env.ferreteriaelhogar2 $REMOTE_HOST:/tmp/.env.ferreteriaelhogar2
ssh -p $SSH_PORT $SSH_KEY $REMOTE_HOST "
  mv /tmp/.env.ferreteriaelhogar2 $REMOTE_DOCKER/.env.ferreteriaelhogar2
"

echo "=== 3. Reiniciando bot2-agent para aplicar cambios ==="
ssh -p $SSH_PORT $SSH_KEY $REMOTE_HOST "podman restart bot2-agent"

echo "=== ✅ Despliegue de política de precios completado ==="
