# AWS Backend Deployment Guide

Hướng dẫn này triển khai backend Docker image lên 2 EC2 private instances trong Auto Scaling Group, đứng sau public Application Load Balancer. Database dùng Amazon DocumentDB trong private DB subnets.

## 1. Kiến trúc triển khai

- Region mặc định: `ap-southeast-1`. Có thể đổi bằng biến `AWS_REGION`.
- VPC có 6 subnets:
  - 2 public subnets cho ALB.
  - 2 private app subnets cho EC2 Auto Scaling Group.
  - 2 private DB subnets cho DocumentDB subnet group.
- EC2 không có public IP. Backend public duy nhất qua ALB.
- Docker image backend lưu ở Amazon ECR.
- EC2 private pull image qua VPC endpoints: ECR API, ECR Docker, CloudWatch Logs, SSM, Secrets Manager/SSM Parameter Store, và S3 gateway endpoint cho image layers.
- ALB target group health check: `GET /api/health`.
- DB connectivity check thủ công: `GET /api/health/db`.

## 2. Biến dùng trong CLI

```bash
export AWS_REGION=ap-southeast-1
export APP_NAME=webdating
export BACKEND_PORT=3000
export ECR_REPO=webdating-backend
export IMAGE_TAG=latest
```

## 3. Build và push backend image lên ECR

Đăng nhập AWS CLI trước:

```bash
aws configure
aws sts get-caller-identity
```

Tạo ECR repository:

```bash
aws ecr create-repository \
  --region "$AWS_REGION" \
  --repository-name "$ECR_REPO" \
  --image-scanning-configuration scanOnPush=true
```

Build và push image:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$ECR_REPO:$IMAGE_TAG" ./backend
docker tag "$ECR_REPO:$IMAGE_TAG" "$ECR_URI:$IMAGE_TAG"
docker push "$ECR_URI:$IMAGE_TAG"
```

Ghi lại `ECR_URI`, vì Launch Template sẽ dùng image này.

## 4. VPC, subnets và routing

Tạo VPC CIDR ví dụ `10.20.0.0/16`.

Subnet gợi ý:

| Name | CIDR | AZ | Public IP |
| --- | --- | --- | --- |
| `webdating-public-a` | `10.20.0.0/24` | AZ-a | Yes |
| `webdating-public-b` | `10.20.1.0/24` | AZ-b | Yes |
| `webdating-app-a` | `10.20.10.0/24` | AZ-a | No |
| `webdating-app-b` | `10.20.11.0/24` | AZ-b | No |
| `webdating-db-a` | `10.20.20.0/24` | AZ-a | No |
| `webdating-db-b` | `10.20.21.0/24` | AZ-b | No |

Routing:

- Public route table: `0.0.0.0/0` tới Internet Gateway.
- Private app route table: không cần internet route nếu dùng VPC endpoints đầy đủ.
- Private DB route table: chỉ local VPC route.

Nếu chưa bake AMI có Docker sẵn, dùng NAT Gateway tạm thời trong quá trình tạo AMI hoặc bootstrap. Sau khi AMI đã có Docker, user data chỉ cần pull image và start container.

## 5. Security groups

Tạo 3 security groups:

### `webdating-alb-sg`

Inbound:

- `80` từ `0.0.0.0/0`.
- `443` từ `0.0.0.0/0` nếu dùng ACM certificate.

Outbound:

- TCP `3000` tới `webdating-ec2-backend-sg`.

### `webdating-ec2-backend-sg`

Inbound:

- TCP `3000` chỉ từ `webdating-alb-sg`.

Outbound:

- TCP `27017` tới `webdating-docdb-sg`.
- TCP `443` tới VPC endpoint security group.

### `webdating-docdb-sg`

Inbound:

- TCP `27017` chỉ từ `webdating-ec2-backend-sg`.

Outbound:

- Giữ mặc định hoặc giới hạn local VPC nếu team vận hành yêu cầu.

## 6. VPC endpoints cho EC2 private subnet

Tạo endpoints trong private app subnets:

- Interface endpoint `com.amazonaws.$AWS_REGION.ecr.api`
- Interface endpoint `com.amazonaws.$AWS_REGION.ecr.dkr`
- Gateway endpoint `com.amazonaws.$AWS_REGION.s3`
- Interface endpoint `com.amazonaws.$AWS_REGION.logs`
- Interface endpoint `com.amazonaws.$AWS_REGION.ssm`
- Interface endpoint `com.amazonaws.$AWS_REGION.ssmmessages`
- Interface endpoint `com.amazonaws.$AWS_REGION.ec2messages`
- Interface endpoint cho `secretsmanager` hoặc `ssm` tùy nơi lưu env/secrets.

Endpoint security group cho phép inbound `443` từ `webdating-ec2-backend-sg`.

## 7. Lưu env/secrets

Khuyến nghị:

- Secrets Manager: `CLERK_SECRET_KEY`, `DATABASE_URL`, Cloudinary secrets, MoMo secrets.
- SSM Parameter Store: non-secret như `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `API_BASE_URL`.

Tạo file mẫu từ [backend/.env.aws.example](../backend/.env.aws.example), rồi đưa từng giá trị lên AWS. Không commit file `.env` thật.

Ví dụ lưu secret:

```bash
aws secretsmanager create-secret \
  --region "$AWS_REGION" \
  --name "/webdating/backend/DATABASE_URL" \
  --secret-string "mongodb://<user>:<password>@<cluster-endpoint>:27017/webdating?tls=true&tlsCAFile=/etc/docdb/global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
```

## 8. IAM role cho EC2

Gắn instance profile có quyền tối thiểu:

- Pull image từ ECR.
- Read secrets/parameters của `/webdating/backend/*`.
- Write logs lên CloudWatch.
- SSM Session Manager để truy cập private EC2 không cần SSH public.

AWS managed policies có thể dùng lúc đầu:

- `AmazonEC2ContainerRegistryReadOnly`
- `AmazonSSMManagedInstanceCore`
- `CloudWatchAgentServerPolicy`

Thêm inline policy giới hạn read secrets/parameters theo prefix `/webdating/backend/`.

## 9. Launch Template user data

Điền các biến trước khi tạo Launch Template:

- `<ECR_URI>`: ECR URI đã push ở bước 3.
- `<AWS_REGION>`: region triển khai.
- Secret/parameter names đúng với bước 7.

User data mẫu:

```bash
#!/bin/bash
set -euo pipefail

APP_NAME=webdating-backend
AWS_REGION=ap-southeast-1
IMAGE_URI=<ECR_URI>:latest

mkdir -p /etc/docdb /opt/webdating
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -o /etc/docdb/global-bundle.pem

DATABASE_URL=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/DATABASE_URL" --query SecretString --output text)
CLERK_PUBLISHABLE_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLERK_PUBLISHABLE_KEY" --query SecretString --output text)
CLERK_SECRET_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLERK_SECRET_KEY" --query SecretString --output text)
CLOUDINARY_CLOUD_NAME=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_CLOUD_NAME" --query SecretString --output text)
CLOUDINARY_API_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_API_KEY" --query SecretString --output text)
CLOUDINARY_API_SECRET=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/CLOUDINARY_API_SECRET" --query SecretString --output text)
INNGEST_SIGNING_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/INNGEST_SIGNING_KEY" --query SecretString --output text)
MOMO_PARTNER_CODE=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_PARTNER_CODE" --query SecretString --output text)
MOMO_ACCESS_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_ACCESS_KEY" --query SecretString --output text)
MOMO_SECRET_KEY=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "/webdating/backend/MOMO_SECRET_KEY" --query SecretString --output text)

cat > /opt/webdating/backend.env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=$DATABASE_URL
ALLOWED_ORIGINS=https://<future-frontend-domain>
FRONTEND_URL=https://<future-frontend-domain>
API_BASE_URL=https://<backend-alb-domain>
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
docker run -d \
  --name "$APP_NAME" \
  --restart unless-stopped \
  --env-file /opt/webdating/backend.env \
  -v /etc/docdb:/etc/docdb:ro \
  -p 3000:3000 \
  "$IMAGE_URI"
```

Production note: user data trên giả định AMI đã có Docker, AWS CLI v2 và CloudWatch/SSM agent. Nếu dùng Amazon Linux 2023 gốc, hãy tạo custom AMI trước hoặc dùng NAT tạm thời để cài Docker trong lần bootstrap đầu.

## 10. ALB và Auto Scaling Group

Tạo target group:

- Target type: `Instance`.
- Protocol: HTTP.
- Port: `3000`.
- Health check path: `/api/health`.
- Success code: `200`.

Tạo internet-facing Application Load Balancer:

- Subnets: 2 public subnets.
- Security group: `webdating-alb-sg`.
- Listener `80` forward tới target group.
- Nếu có domain/certificate, thêm listener `443` bằng ACM certificate và redirect `80 -> 443`.

Tạo Auto Scaling Group:

- Launch Template: template ở bước 9.
- Subnets: `webdating-app-a`, `webdating-app-b`.
- Desired capacity: `2`.
- Min capacity: `2`.
- Max capacity: `4`.
- Attach target group.
- Health checks: EC2 + ELB.
- Health check grace period: `300` giây.

## 11. Kiểm tra sau deploy

Kiểm tra ALB:

```bash
curl -i http://<alb-dns-name>/api/health
```

Expected:

```json
{"message":"OK"}
```

Kiểm tra backend kết nối DocumentDB:

```bash
curl -i http://<alb-dns-name>/api/health/db
```

Expected khi DB healthy:

```json
{
  "message": "Database connection is healthy",
  "state": "connected",
  "host": "<docdb-cluster-endpoint>",
  "database": "webdating"
}
```

Nếu `/api/health` pass nhưng `/api/health/db` fail, kiểm tra theo thứ tự:

1. `DATABASE_URL` có dùng cluster endpoint và `retryWrites=false`.
2. File `/etc/docdb/global-bundle.pem` có tồn tại trong container mount.
3. `docdb-sg` inbound `27017` cho phép từ `ec2-backend-sg`.
4. EC2 app subnets và DB subnets cùng VPC.
5. DocumentDB cluster status là `Available`.

## 12. Tài liệu liên quan

- [AWS_DOCUMENTDB_SETUP.md](./AWS_DOCUMENTDB_SETUP.md)
- [AWS_POSTMAN_TESTING.md](./AWS_POSTMAN_TESTING.md)
