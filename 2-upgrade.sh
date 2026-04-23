#!/bin/bash
echo "🚀 Iniciar el upgrade de OpenClaw..."
ssh -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@52.200.214.27 "cd /home/openclaw/bot2-docker/openclaw-docker && podman build --no-cache -f Dockerfile -t localhost/openclaw-agent:local . && cd .. && podman-compose down && podman-compose up -d"
echo "✅ Upgrade completado."
