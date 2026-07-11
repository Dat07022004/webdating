# AWS DocumentDB Setup Guide

Tài liệu này tạo Amazon DocumentDB cluster cho backend WebDating: 1 writer/primary instance và 1 reader replica ở AZ khác làm failover target/standby.

## 1. Chuẩn bị

Cần có sẵn:

- VPC production.
- 2 private DB subnets ở 2 Availability Zones khác nhau.
- Security group `webdating-docdb-sg`.
- Security group backend EC2 `webdating-ec2-backend-sg`.

DocumentDB không public internet. EC2 backend trong private app subnets kết nối tới DocumentDB qua private networking trong VPC.

## 2. Tạo subnet group

Qua AWS Console:

1. Mở Amazon DocumentDB.
2. Chọn `Subnet groups`.
3. Create subnet group:
   - Name: `webdating-docdb-subnet-group`
   - VPC: VPC production.
   - Subnets: chọn 2 private DB subnets, ví dụ `webdating-db-a`, `webdating-db-b`.

Hoặc AWS CLI:

```bash
aws docdb create-db-subnet-group \
  --region "$AWS_REGION" \
  --db-subnet-group-name webdating-docdb-subnet-group \
  --db-subnet-group-description "WebDating DocumentDB private DB subnets" \
  --subnet-ids <PRIVATE_DB_SUBNET_A_ID> <PRIVATE_DB_SUBNET_B_ID>
```

## 3. Tạo cluster parameter group

Giữ TLS enabled. Đây là mặc định của DocumentDB mới và phù hợp production.

```bash
aws docdb create-db-cluster-parameter-group \
  --region "$AWS_REGION" \
  --db-cluster-parameter-group-name webdating-docdb-params \
  --db-parameter-group-family docdb5.0 \
  --description "WebDating DocumentDB parameters"
```

Nếu chọn engine version khác, chỉnh `docdb5.0` theo version đó.

## 4. Tạo DocumentDB cluster

Tạo master password mạnh và lưu vào Secrets Manager. Password có ký tự đặc biệt phải URL-encode khi đưa vào `DATABASE_URL`.

```bash
aws docdb create-db-cluster \
  --region "$AWS_REGION" \
  --db-cluster-identifier webdating-docdb \
  --engine docdb \
  --engine-version 5.0.0 \
  --master-username webdating_admin \
  --master-user-password '<STRONG_PASSWORD>' \
  --db-subnet-group-name webdating-docdb-subnet-group \
  --vpc-security-group-ids <DOCDB_SG_ID> \
  --db-cluster-parameter-group-name webdating-docdb-params \
  --storage-encrypted \
  --backup-retention-period 7 \
  --preferred-backup-window 18:00-19:00 \
  --preferred-maintenance-window sun:19:00-sun:20:00
```

## 5. Tạo primary và replica instances

Tạo writer/primary instance:

```bash
aws docdb create-db-instance \
  --region "$AWS_REGION" \
  --db-cluster-identifier webdating-docdb \
  --db-instance-identifier webdating-docdb-primary-1 \
  --db-instance-class db.t3.medium \
  --engine docdb \
  --promotion-tier 1
```

Sau khi primary đang tạo, tạo reader replica ở AZ khác:

```bash
aws docdb create-db-instance \
  --region "$AWS_REGION" \
  --db-cluster-identifier webdating-docdb \
  --db-instance-identifier webdating-docdb-reader-1 \
  --db-instance-class db.t3.medium \
  --engine docdb \
  --promotion-tier 1
```

Khuyến nghị primary và replica dùng cùng instance class để failover không làm giảm hiệu năng.

## 6. Lấy cluster endpoint

```bash
aws docdb describe-db-clusters \
  --region "$AWS_REGION" \
  --db-cluster-identifier webdating-docdb \
  --query 'DBClusters[0].{ClusterEndpoint:Endpoint,ReaderEndpoint:ReaderEndpoint,Port:Port,Status:Status}' \
  --output table
```

Dùng `ClusterEndpoint` trong backend `DATABASE_URL`. Không dùng instance endpoint trong app vì khi failover, role primary/replica có thể đổi.

Connection string mẫu:

```text
mongodb://webdating_admin:<URL_ENCODED_PASSWORD>@<CLUSTER_ENDPOINT>:27017/webdating?tls=true&tlsCAFile=/etc/docdb/global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

Giải thích nhanh:

- `tls=true`: DocumentDB bật TLS mặc định.
- `tlsCAFile=/etc/docdb/global-bundle.pem`: CA bundle của AWS RDS/DocumentDB.
- `replicaSet=rs0`: hỗ trợ topology/failover.
- `readPreference=secondaryPreferred`: đọc có thể dùng replica khi driver chọn được.
- `retryWrites=false`: bắt buộc an toàn với DocumentDB.

## 7. Security group rules

DocumentDB security group:

```bash
aws ec2 authorize-security-group-ingress \
  --region "$AWS_REGION" \
  --group-id <DOCDB_SG_ID> \
  --protocol tcp \
  --port 27017 \
  --source-group <EC2_BACKEND_SG_ID>
```

Backend EC2 security group outbound cần cho phép TCP `27017` tới `docdb-sg`.

## 8. Test kết nối từ EC2

Mở SSM Session Manager vào một EC2 backend instance.

Kiểm tra CA bundle:

```bash
ls -l /etc/docdb/global-bundle.pem
```

Kiểm tra container logs:

```bash
docker logs webdating-backend --tail 100
```

Expected log:

```text
MongoDB Connected: <docdb-cluster-endpoint>
Server is running on port 3000
```

Kiểm tra API DB health qua ALB:

```bash
curl http://<alb-dns-name>/api/health/db
```

## 9. Failover check

Trong DocumentDB Console:

1. Chọn cluster `webdating-docdb`.
2. Chọn Actions -> Failover.
3. Chờ reader replica được promote.
4. Gọi lại:

```bash
curl http://<alb-dns-name>/api/health
curl http://<alb-dns-name>/api/health/db
```

Kỳ vọng có gián đoạn ngắn trong lúc failover, sau đó cluster endpoint tự remap tới primary mới và backend kết nối lại.

## 10. Vận hành

Theo dõi CloudWatch metrics:

- `CPUUtilization`
- `DatabaseConnections`
- `FreeableMemory`
- `DBClusterReplicaLagMaximum`
- `ReadIOPS`, `WriteIOPS`

Tạo alarm tối thiểu:

- Primary CPU cao liên tục.
- Replica lag vượt ngưỡng nhiều datapoints.
- Freeable memory thấp.
- Backup hoặc cluster status bất thường.
