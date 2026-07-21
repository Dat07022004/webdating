#!/bin/bash
set -euo pipefail

APP_NAME=webdating-backend
AWS_REGION=ap-southeast-1
IMAGE_URI=055259485156.dkr.ecr.ap-southeast-1.amazonaws.com/webdating-backend:latest

mkdir -p /etc/docdb /opt/webdating

aws s3 cp s3://webdating-docdb-ca-055259485156-ap-southeast-1/docdb/global-bundle.pem /etc/docdb/global-bundle.pem --region "$AWS_REGION"

systemctl enable docker || true
systemctl start docker || true

DATABASE_URL=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/DATABASE_URL" --query SecretString --output text)
REDIS_URL=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/REDIS_URL" --query SecretString --output text)
CLERK_PUBLISHABLE_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLERK_PUBLISHABLE_KEY" --query SecretString --output text)
CLERK_SECRET_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLERK_SECRET_KEY" --query SecretString --output text)
CLOUDINARY_CLOUD_NAME=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_CLOUD_NAME" --query SecretString --output text)
CLOUDINARY_API_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_API_KEY" --query SecretString --output text)
CLOUDINARY_API_SECRET=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_API_SECRET" --query SecretString --output text)
INNGEST_SIGNING_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/INNGEST_SIGNING_KEY" --query SecretString --output text)
MOMO_PARTNER_CODE=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_PARTNER_CODE" --query SecretString --output text)
MOMO_ACCESS_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_ACCESS_KEY" --query SecretString --output text)
MOMO_SECRET_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_SECRET_KEY" --query SecretString --output text)
ALLOWED_ORIGINS=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/ALLOWED_ORIGINS" --query SecretString --output text)
FRONTEND_URL=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/FRONTEND_URL" --query SecretString --output text)
API_BASE_URL=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/API_BASE_URL" --query SecretString --output text)

cat > /opt/webdating/backend.env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=$DATABASE_URL
REDIS_URL=$REDIS_URL
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
FRONTEND_URL=$FRONTEND_URL
API_BASE_URL=$API_BASE_URL
CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=$CLERK_SECRET_KEY
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
INNGEST_SIGNING_KEY=$INNGEST_SIGNING_KEY
MOMO_PARTNER_CODE=$MOMO_PARTNER_CODE
MOMO_ACCESS_KEY=$MOMO_ACCESS_KEY
MOMO_SECRET_KEY=$MOMO_SECRET_KEY
EOF

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker pull "$IMAGE_URI"
docker rm -f "$APP_NAME" || true
aws logs create-log-group --region "$AWS_REGION" --log-group-name "/webdating/backend" || true
aws logs put-retention-policy --region "$AWS_REGION" --log-group-name "/webdating/backend" --retention-in-days 7 || true

docker run -d \
  --name "$APP_NAME" \
  --restart unless-stopped \
  --env-file /opt/webdating/backend.env \
  -v /etc/docdb:/etc/docdb:ro \
  --log-driver=awslogs \
  --log-opt awslogs-region="$AWS_REGION" \
  --log-opt awslogs-group="/webdating/backend" \
  --log-opt awslogs-stream="backend/$(hostname)" \
  -p 3000:3000 \
  "$IMAGE_URI"
