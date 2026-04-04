# WebDating API Test Sheet

Base URL:

`http://localhost:3000/api`

## Auth For Postman

Trong môi trường local/dev hiện tại, backend đã hỗ trợ fallback bằng header:

`x-clerk-id: <clerkId trong MongoDB>`

Nếu bạn test production hoặc muốn đi theo luồng Clerk thật, dùng:

`Authorization: Bearer <clerk token hợp lệ>`

## 1. Health

### GET `/health`

Không cần auth.

## 2. Users

### POST `/users/onboarding`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "email": "user@example.com",
  "firstName": "An",
  "lastName": "Nguyen",
  "imageUrl": "https://example.com/avatar.jpg",
  "birthday": "1998-05-20",
  "gender": "male",
  "lookingFor": "female",
  "location": "Ho Chi Minh City",
  "interests": ["music", "travel"],
  "bio": "Hello, this is my profile",
  "photos": [
    {
      "url": "https://example.com/photo1.jpg",
      "publicId": "photo1",
      "isPrimary": true
    }
  ]
}
```

### POST `/users/photos/upload`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: multipart/form-data`

Form-data:

- `photos` = file, có thể gửi nhiều file

### GET `/users/me`

Headers:

- `x-clerk-id: clerk_xxx`

Query tuỳ chọn:

- `email=user@example.com`

### PUT `/users/me`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "email": "user@example.com",
  "bio": "Updated bio",
  "location": "Hanoi",
  "gender": "male",
  "lookingFor": "female",
  "interests": ["coffee", "gym"]
}
```

### GET `/users/discover`

Headers:

- `x-clerk-id: clerk_xxx`

### POST `/users/action`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "targetUserId": "507f1f77bcf86cd799439011",
  "action": "like"
}
```

`action` chỉ nhận `like` hoặc `pass`.

### GET `/users/connections`

Headers:

- `x-clerk-id: clerk_xxx`

## 3. Chat

### GET `/chat/conversations`

Headers:

- `x-clerk-id: clerk_xxx`

### GET `/chat/conversations/:conversationId/messages`

Headers:

- `x-clerk-id: clerk_xxx`

Query:

- `page=1`
- `limit=50`

### POST `/chat/conversations`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "targetUserId": "507f1f77bcf86cd799439011"
}
```

### PATCH `/chat/conversations/:conversationId/seen`

Headers:

- `x-clerk-id: clerk_xxx`

## 4. Notifications

### GET `/notifications`

Headers:

- `x-clerk-id: clerk_xxx`

### GET `/notifications/unread-counts`

Headers:

- `x-clerk-id: clerk_xxx`

### PATCH `/notifications/:id/read`

Headers:

- `x-clerk-id: clerk_xxx`

### PATCH `/notifications/read-all`

Headers:

- `x-clerk-id: clerk_xxx`

## 5. Premium

### POST `/premium/create-payment`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "plan": "monthly"
}
```

### GET `/premium/status`

Headers:

- `x-clerk-id: clerk_xxx`

### POST `/premium/momo-ipn`

Không cần auth.

Body: MoMo callback payload.

### POST `/premium/momo-return`

Không cần auth.

Body hoặc query: payload callback từ MoMo.

## 6. Upload

### POST `/upload/image`

Headers:

- `x-clerk-id: clerk_xxx`
- `Content-Type: multipart/form-data`

Form-data:

- `image` = file ảnh

## 7. Admin

### GET `/admin/users`

Headers:

- `x-clerk-id: clerk_admin`

Lưu ý: `clerk_admin` phải trỏ tới user có role `admin` trong DB.

### POST `/admin/users/:userId/ban`

Headers:

- `x-clerk-id: clerk_admin`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "reason": "violation",
  "durationDays": 7
}
```

### DELETE `/admin/users/:userId`

Headers:

- `x-clerk-id: clerk_admin`

### PUT `/admin/users/:userId/role`

Headers:

- `x-clerk-id: clerk_admin`
- `Content-Type: application/json`

Body mẫu:

```json
{
  "role": "manager"
}
```

## 8. Revenue

### GET `/revenue/overview`

Headers:

- `x-clerk-id: clerk_manager`

`clerk_manager` phải trỏ tới user có role `manager` hoặc `admin`.

### GET `/revenue/transactions`

Headers:

- `x-clerk-id: clerk_manager`

Query tuỳ chọn ví dụ:

- `status=success`
- `page=1`

## Ghi chú nhanh

- Nếu gọi `/users/*`, `/chat/*`, `/notifications/*`, `/premium/*`, `/upload/*` mà vẫn bị `401`, kiểm tra trước xem `x-clerk-id` có đúng với document `User.clerkId` trong MongoDB không.
- Nếu gọi `/admin/*` hoặc `/revenue/*`, user tương ứng phải có role đúng (`admin`, `manager`).
- `POST /premium/create-payment` còn phụ thuộc biến môi trường MoMo, nên nếu chưa cấu hình keys thì sẽ trả lỗi cấu hình.