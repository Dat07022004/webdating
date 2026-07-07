# EC2 Backend + MongoDB Deployment

This guide deploys only the WebDating backend API and MongoDB to one EC2 instance.
The frontend is intentionally out of scope.

## 1. Recommended EC2

- Instance type: `t4g.small` for beta testing.
- AMI: Ubuntu 24.04 LTS ARM64 or Amazon Linux 2023 ARM64.
- Storage: 30 GiB `gp3` EBS, encrypted.
- Security group:
  - Allow inbound `3000/tcp` from your IP while testing with Postman.
  - Do not open `27017/tcp`.
  - Restrict SSH `22/tcp` to your IP, or use AWS Systems Manager Session Manager.

Use `t4g.medium` if memory stays above 75%, MongoDB restarts from OOM, or queries slow down because the dataset outgrows available RAM.

## 2. Build and Push Backend Image to ECR

Set these values locally:

```bash
AWS_REGION=ap-southeast-1
AWS_ACCOUNT_ID=123456789012
ECR_REPOSITORY=webdating-backend
IMAGE_TAG=latest
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"
```

Create the repository once:

```bash
aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION"
```

Log in and push an ARM64 image:

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker buildx create --use --name webdating-builder || docker buildx use webdating-builder

docker buildx build \
  --platform linux/arm64 \
  -t "$IMAGE_URI" \
  --push \
  ./backend
```

## 3. Prepare the EC2 Host

Install Docker and AWS CLI on the EC2 instance. For Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl unzip
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin awscli
sudo usermod -aG docker ubuntu
```

Log out and back in after adding the user to the `docker` group.

## 4. Configure Production Environment

Copy these files to the EC2 host:

- `docker-compose.prod.yml`
- `.env.production.example`
- `scripts/backup-mongodb.sh`

Create the real env file:

```bash
cp .env.production.example .env.production
nano .env.production
```

Required edits:

- `BACKEND_IMAGE`: ECR image URI pushed above.
- `MONGO_INITDB_ROOT_PASSWORD`: long random password.
- `DATABASE_URL`: same MongoDB username/password and database.
- `API_BASE_URL`: `http://EC2_PUBLIC_IP_OR_DNS:3000`.
- Clerk keys: real test or production values.

MongoDB is reachable only inside Docker as `mongodb:27017`.

## 5. Run Backend and MongoDB

Log in to ECR from EC2:

```bash
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com
```

Start the stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Check logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f mongodb
```

## 6. Postman Smoke Test

Base URL:

```text
http://EC2_PUBLIC_IP_OR_DNS:3000/api
```

First request:

```text
GET /health
```

Expected response:

```json
{
  "messsage": "OK"
}
```

Then continue with `POSTMAN_API_TESTS.md`.

## 7. MongoDB Backup

Attach an IAM role to EC2 that can write to the configured S3 bucket.

Run backup manually:

```bash
chmod +x scripts/backup-mongodb.sh
./scripts/backup-mongodb.sh
```

Add a daily cron job:

```bash
crontab -e
```

```cron
15 2 * * * cd /home/ubuntu/webdating && ./scripts/backup-mongodb.sh >> backups/mongodb/backup.log 2>&1
```

## 8. Update Deployment

After pushing a new backend image:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull backend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```
