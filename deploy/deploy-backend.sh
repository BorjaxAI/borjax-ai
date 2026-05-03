#!/usr/bin/env bash
set -euo pipefail

# Source AWS credentials
source ~/.pi/agent/bedrock.env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BorjaxAI — Backend Deploy (EC2 + Docker Compose)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="borjaxai-key"
KEY_FILE="$HOME/.ssh/borjaxai-key.pem"
SG_NAME="borjaxai-sg"
INSTANCE_TYPE="t3.medium"
AMI_ID="ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS us-east-1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Key pair ───────────────────────────────────────────────────────────────────
echo ""
echo "1/5  Setting up key pair..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  echo "  Creating key pair: $KEY_NAME"
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "  ✓ Key pair created: $KEY_FILE"
else
  echo "  ✓ Key pair already exists"
fi

# ── Security group ─────────────────────────────────────────────────────────────
echo ""
echo "2/5  Setting up security group..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "BorjaxAI Security Group" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)
  echo "  Created security group: $SG_ID"

  # Allow SSH, HTTP, HTTPS, and app ports
  for port in 22 80 443 3000 8000; do
    aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" \
      --protocol tcp \
      --port "$port" \
      --cidr "0.0.0.0/0" \
      --region "$REGION" 2>/dev/null || true
  done
  echo "  ✓ Security group configured"
else
  echo "  ✓ Security group already exists: $SG_ID"
fi

# ── Launch EC2 ─────────────────────────────────────────────────────────────────
echo ""
echo "3/5  Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --region "$REGION" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=borjaxai-backend},{Key=Project,Value=BorjaxAI}]" \
  --user-data '#!/bin/bash
apt-get update -y
apt-get install -y docker.io docker-compose git curl
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu
' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "  Instance ID: $INSTANCE_ID"
echo "  Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "  ✓ Instance running: $PUBLIC_IP"

# ── Wait for SSH ───────────────────────────────────────────────────────────────
echo ""
echo "4/5  Waiting for SSH to be ready (up to 3 mins)..."
for i in $(seq 1 18); do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i "$KEY_FILE" ubuntu@"$PUBLIC_IP" "echo ready" 2>/dev/null; then
    echo "  ✓ SSH ready"
    break
  fi
  echo "  Attempt $i/18 — waiting 10s..."
  sleep 10
done

# ── Deploy code ────────────────────────────────────────────────────────────────
echo ""
echo "5/5  Deploying application..."

# Create .env file for the instance
cat > /tmp/borjaxai.env << ENVEOF
POSTGRES_USER=borjaxai
POSTGRES_PASSWORD=borjaxai_$(openssl rand -hex 12)
POSTGRES_DB=borjaxai
DATABASE_URL=postgresql://borjaxai:\${POSTGRES_PASSWORD}@postgres:5432/borjaxai
REDIS_URL=redis://redis:6379/0
JWT_SECRET=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
AWS_REGION=$AWS_REGION
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
INTERNAL_SECRET=$(openssl rand -hex 16)
ALLOWED_ORIGINS=http://$PUBLIC_IP:3000,http://$PUBLIC_IP:5173
APP_URL=http://$PUBLIC_IP:3000
ENVEOF

# Upload project files
tar -czf /tmp/borjaxai-app.tar.gz -C "$ROOT_DIR" apps docker-compose.yml .env.example

scp -o StrictHostKeyChecking=no -i "$KEY_FILE" \
  /tmp/borjaxai-app.tar.gz \
  /tmp/borjaxai.env \
  ubuntu@"$PUBLIC_IP":/home/ubuntu/

# Remote deploy
ssh -o StrictHostKeyChecking=no -i "$KEY_FILE" ubuntu@"$PUBLIC_IP" << 'SSHEOF'
set -e
cd /home/ubuntu

# Extract app
mkdir -p borjaxai
tar -xzf borjaxai-app.tar.gz -C borjaxai
cd borjaxai
cp /home/ubuntu/borjaxai.env .env

# Wait for docker
for i in $(seq 1 10); do
  docker ps &>/dev/null && break || sleep 5
done

# Start services
docker-compose pull 2>/dev/null || true
docker-compose up -d --build

echo "Services started:"
docker-compose ps
SSHEOF

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Backend Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐 EC2 Public IP:  $PUBLIC_IP"
echo "  🔌 API Gateway:    http://$PUBLIC_IP:3000"
echo "  🤖 AI Backend:     http://$PUBLIC_IP:8000"
echo "  🔑 SSH:            ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
echo ""
echo "  Save the public IP — you'll need to update VITE_API_URL"
echo "  and re-deploy the web app to point to this backend."
echo ""

# Save IP to file for reference
echo "$PUBLIC_IP" > "$SCRIPT_DIR/.ec2-ip"
