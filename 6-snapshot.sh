#!/bin/bash
mkdir -p config-backup
echo "📸 Iniciando Snapshot Total (Archivos + AWS)..."

# Parte 1: Snapshot de Configuración (Archivos locales)
echo "--- 📁 Sincronizando archivos de configuración ---"
for f in openclaw.json mcp.json exec-approvals.json tools.yaml; do
  ssh -o StrictHostKeyChecking=no -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@54.147.195.15 "sudo cat /home/openclaw/openclaw-data/\$f" > config-backup/\$f 2>/dev/null && echo "✅ \$f" || echo "❌ \$f (no existe o error)"
done
ssh -o StrictHostKeyChecking=no -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@54.147.195.15 "cat /home/openclaw/openclaw-docker/.env" > config-backup/docker.env && echo "✅ docker.env"

# Parte 2: AWS Cloud Snapshot (EBS)
echo "--- ☁️ Generando AWS EBS Snapshot ---"
INSTANCE_ID=$(ssh -o StrictHostKeyChecking=no -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@54.147.195.15 "curl -s http://169.254.169.254/latest/meta-data/instance-id")

if [ -z "$INSTANCE_ID" ]; then
  echo "❌ No se pudo obtener el Instance ID desde los metadatos (¿Es una instancia de AWS?)"
else
  echo "ID de instancia: $INSTANCE_ID"
  VOLUME_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' --output text 2>/dev/null)
  
  if [ -z "$VOLUME_ID" ] || [ "$VOLUME_ID" == "None" ]; then
    echo "❌ No se pudo obtener el Volume ID (Verifica tu config local de AWS CLI)"
  else
    echo "ID de volumen: $VOLUME_ID"
    SNAPSHOT_ID=$(aws ec2 create-snapshot --volume-id $VOLUME_ID --description "Snapshot-bot2ferreteriaelhogar-\$(date +%Y%m%d-%H%M)" --query 'SnapshotId' --output text)
    echo "✅ AWS Snapshot creado: $SNAPSHOT_ID"
  fi
fi

date > config-backup/snapshot_date.txt
echo "✅ Proceso completado exitosamente."
