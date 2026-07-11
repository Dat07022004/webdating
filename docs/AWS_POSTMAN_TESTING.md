# AWS Postman Testing Guide

Tài liệu này dùng để kiểm tra backend sau khi deploy lên AWS EC2 + ALB + DocumentDB.

## 1. Postman environment

Tạo environment `WebDating AWS` với variables:

| Variable | Example |
| --- | --- |
| `base_url` | `https://api.example.com/api` hoặc `http://<alb-dns-name>/api` |
| `clerk_token` | JWT lấy từ Clerk production user session |
| `admin_clerk_token` | JWT của user có role `admin` trong DB |
| `manager_clerk_token` | JWT của user có role `manager` hoặc `admin` |
| `test_email` | `aws-postman-user@example.com` |

Production không dùng header `x-clerk-id`; header fallback này chỉ hoạt động khi `NODE_ENV` không phải `production`.

Header mặc định cho protected endpoints:

```text
Authorization: Bearer {{clerk_token}}
Content-Type: application/json
```

## 2. Smoke test ALB và backend

### GET health

Request:

```http
GET {{base_url}}/health
```

Expected:

- Status: `200`
- Body:

```json
{
  "message": "OK"
}
```

Nếu fail:

- Target group health check path phải là `/api/health`.
- EC2 container phải listen port `3000`.
- `webdating-ec2-backend-sg` inbound `3000` phải cho phép từ `webdating-alb-sg`.

## 3. Test kết nối DocumentDB

### GET DB health

Request:

```http
GET {{base_url}}/health/db
```

Expected:

- Status: `200`
- Body có:

```json
{
  "message": "Database connection is healthy",
  "state": "connected",
  "database": "webdating"
}
```

Nếu status `503`:

- `DATABASE_URL` sai endpoint, username/password, hoặc password chưa URL-encode.
- Thiếu `tlsCAFile=/etc/docdb/global-bundle.pem`.
- EC2 security group chưa được phép kết nối `docdb-sg:27017`.
- DocumentDB cluster/instances chưa `Available`.

## 4. Test auth failure có chủ đích

### GET current user without token

Request:

```http
GET {{base_url}}/users/me
```

Không gửi `Authorization`.

Expected:

- Status: `401`
- Body có message unauthorized.

Mục đích: xác nhận production không dùng dev fallback `x-clerk-id`.

## 5. Test user onboarding và DB write/read

### POST onboarding

Request:

```http
POST {{base_url}}/users/onboarding
Authorization: Bearer {{clerk_token}}
Content-Type: application/json
```

Body mẫu:

```json
{
  "email": "{{test_email}}",
  "firstName": "AWS",
  "lastName": "Tester",
  "imageUrl": "https://example.com/avatar.jpg",
  "birthday": "1998-05-20",
  "gender": "male",
  "lookingFor": "female",
  "location": "Ho Chi Minh City",
  "interests": ["music", "travel"],
  "bio": "Testing AWS EC2 and DocumentDB deployment",
  "photos": [
    {
      "url": "https://example.com/photo1.jpg",
      "publicId": "aws-test-photo-1",
      "isPrimary": true
    }
  ]
}
```

Expected:

- Status: `200` hoặc `201`, tùy controller hiện tại.
- Response có thông tin user.

Nếu bị `401`, kiểm tra Clerk production token và `CLERK_SECRET_KEY`.

### GET current user

Request:

```http
GET {{base_url}}/users/me?email={{test_email}}
Authorization: Bearer {{clerk_token}}
```

Expected:

- Status: `200`.
- Response trả về user vừa tạo/cập nhật.

Mục đích: xác nhận backend vừa write vừa read được từ DocumentDB.

## 6. Test protected business endpoints

### GET discover

```http
GET {{base_url}}/users/discover
Authorization: Bearer {{clerk_token}}
```

Expected:

- Status: `200`.
- Body là danh sách hoặc object dữ liệu discover.

### GET notifications

```http
GET {{base_url}}/notifications
Authorization: Bearer {{clerk_token}}
```

Expected:

- Status: `200`.

### GET premium status

```http
GET {{base_url}}/premium/status
Authorization: Bearer {{clerk_token}}
```

Expected:

- Status: `200`.
- Body có trạng thái premium plan.

## 7. Test role authorization

### Admin endpoint bằng user thường

```http
GET {{base_url}}/admin/users
Authorization: Bearer {{clerk_token}}
```

Expected:

- Status: `403` nếu user không có role `admin`.

### Admin endpoint bằng admin token

```http
GET {{base_url}}/admin/users
Authorization: Bearer {{admin_clerk_token}}
```

Expected:

- Status: `200`.

Nếu admin token vẫn `403`, kiểm tra document `User` trong DocumentDB có `role: "admin"` và `clerkId` khớp user trong Clerk.

## 8. Test ALB phân tải 2 EC2

Gọi health nhiều lần:

```bash
for i in {1..10}; do curl -s http://<alb-dns-name>/api/health; echo; done
```

Trong CloudWatch hoặc Docker logs trên 2 EC2, cả hai instances nên nhận traffic. Nếu chỉ một instance nhận traffic:

- Kiểm tra Auto Scaling desired capacity là `2`.
- Kiểm tra target group có 2 healthy targets.
- Kiểm tra app subnets nằm ở 2 AZ khác nhau.

## 9. Checklist pass trước khi bàn giao

- `GET /api/health` trả `200`.
- Target group có 2 healthy EC2 targets.
- `GET /api/health/db` trả `200`.
- Log backend có `MongoDB Connected`.
- Request thiếu token trả `401`.
- Request user thường vào admin trả `403`.
- Onboarding hoặc profile flow ghi/read được dữ liệu.
- DocumentDB security group chỉ mở `27017` từ EC2 backend security group.
