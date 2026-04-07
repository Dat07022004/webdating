# Workflow Chi Tiết: GitHub Actions → GHCR → Sevalla Deploy

## Phase 1: GitHub Actions (Tự động)

### Quy trình Build - Test - Deploy

```
Push code to main
       ↓
GitHub Actions trigger
       ↓
Job Build: npm ci + npm run build
       ↓
Job Test: npm run test:coverage (backend + frontend)
       ↓
Job Deploy chạy chỉ khi Test xanh:
  - Đăng nhập GHCR bằng GITHUB_TOKEN
  - Build backend image → push ghcr.io/dat07022004/webdating-backend:latest
  - Build frontend image → push ghcr.io/dat07022004/webdating-frontend:latest
  ↓
Images lưu tại GHCR (công khai hoặc private tùy cấu hình)
✅ GitHub Actions xong
```

### Chi tiết từng Job

#### Build Job

- **Name:** Build
- **Runs on:** ubuntu-latest
- **Steps:**
  1. Checkout Code (lấy source từ GitHub)
  2. Setup Node.js 20 (setup runtime)
  3. Backend - Install & Build (cd backend → npm ci → npm run build)
  4. Frontend - Install & Build (cd frontend → npm ci với 3 env vars từ GitHub Secrets → npm run build)
- **Output:** frontend/dist folder được tạo, sẵn sàng đóng gói vào image

#### Test Job

- **Name:** Test
- **Depends on:** Build job (needs: build)
- **Runs on:** ubuntu-latest
- **Steps:**
  1. Checkout Code
  2. Setup Node.js 20
  3. Backend - Install & Test
     - Node: NODE_ENV=test
     - Env vars: toàn bộ mock (pk_test_mock, sk_test_mock, mongodb://localhost:27017/webdating-test)
     - Command: npm run test:coverage
     - Output: backend/coverage/ folder
  4. Frontend - Install & Test
     - Node: NODE_ENV=test
     - Env vars: mock Clerk key, localhost API/Socket URL
     - Command: npm run test:coverage
     - Output: frontend/coverage/ folder
  5. Upload Coverage Report (nếu test pass hoặc fail, đều upload artifacts)
     - Artifact name: full-coverage-report
     - Paths: backend/coverage/ + frontend/coverage/
     - Retention: 7 days
- **Output:** Coverage reports tải được từ GitHub Actions

#### Deploy Job

- **Name:** Deploy
- **Depends on:** Test job (needs: test)
- **Condition:** `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
  - Chỉ chạy khi push trực tiếp vào main, không chạy trên PR hoặc nhánh khác
- **Runs on:** ubuntu-latest
- **Steps:**
  1. Checkout Code
  2. Set registry owner lowercase
     - Convert username từ Dat07022004 → dat07022004 (GHCR yêu cầu lowercase)
     - Lưu vào env var REGISTRY_OWNER
  3. Log in to GHCR
     - Registry: ghcr.io
     - Username: github.actor (tên người push)
     - Password: GITHUB_TOKEN (auto-generated token)
  4. Build and Push Backend Image
     - Context: ./backend
     - Dockerfile: ./backend/Dockerfile
     - Push: true (push lên GHCR)
     - Tags:
       - ghcr.io/dat07022004/webdating-backend:latest (cập nhật tag này mỗi lần push)
       - ghcr.io/dat07022004/webdating-backend:sha-<commit-hash> (immutable tag theo commit)
  5. Build and Push Frontend Image
     - Context: ./frontend
     - Dockerfile: ./frontend/Dockerfile
     - Build args: 3 biến Vite từ GitHub Secrets (được dùng trong RUN npm run build stage)
     - Tags:
       - ghcr.io/dat07022004/webdating-frontend:latest
       - ghcr.io/dat07022004/webdating-frontend:sha-<commit-hash>
- **Output:** Docker images sẵn sàng pull từ GHCR

---

## Phase 2: Sevalla Setup (Thủ công)

### Bước 2.1: Tạo Registry Credential trong Sevalla

1. **Mở Sevalla** → Settings hoặc Credentials section.
2. **Registry credentials** → Create new credential.
3. **Điền thông tin:**
   - Name: `GitHub Container Registry` (hoặc tên tuỳ ý)
   - Registry: `ghcr.io` (chọn từ dropdown)
   - Username: `Dat07022004` (GitHub username của bạn)
   - Password/Token: `<GitHub PAT token>`
     - PAT phải có scope `read:packages` tối thiểu
     - Khuyến cáo thêm scope `repo` để tránh lỗi quyền
4. **Bấm Save**.

**Kết quả:** Sevalla giờ sẽ biết cách authenticate vào GHCR để pull image.

---

### Bước 2.2: Tạo Backend Application trên Sevalla

1. **Vào Sevalla Dashboard** → Applications → Create application.
2. **Chọn deployment type** → Docker image.
3. **Điền Application details:**
   - Name: `webdating-backend`
   - Docker image: `ghcr.io/dat07022004/webdating-backend:latest`
   - Registry credential: Chọn credential vừa tạo ở Bước 2.1
4. **Chọn Location** → Changhua County, Taiwan (asia-east1).
5. **Chọn Resource** → 0.3 CPU / 0.3 GB RAM (free tier hoặc tùy chọn).
6. **Port settings:**
   - Web process port: `3000` (phải match EXPOSE 3000 trong backend Dockerfile)
7. **Bấm Create application** (chưa deploy vẫn, chỉ lưu cấu hình).

---

### Bước 2.3: Cấu hình Environment Variables cho Backend

1. Trong app dashboard → webdating-backend → Settings/Environment Variables.
2. **Add environment variables** (thêm từng cái một hoặc import từ .env file):

```
DATABASE_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/webdating?retryWrites=true&w=majority

CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

INNGEST_SIGNING_KEY=signsk_...

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>

MOMO_PARTNER_CODE=<your-partner-code>
MOMO_ACCESS_KEY=<your-access-key>
MOMO_SECRET_KEY=<your-secret-key>

NODE_ENV=production
PORT=3000
```

3. **Bấm Save**.

**Kết quả:** Các env var sẽ được inject vào container lúc startup.

---

### Bước 2.4: Deploy Backend trên Sevalla

1. Trong app dashboard → webdating-backend → bấm **Deploy now**.
2. **Sevalla process:**
   - Kéo image ghcr.io/dat07022004/webdating-backend:latest từ GHCR
   - Tạo container từ image
   - Inject environment variables
   - Start container, mở port 3000
3. **Kiểm tra logs** (View logs hoặc Web terminal):
   ```
   Pulling image ghcr.io/dat07022004/webdating-backend:latest...
   Image pulled successfully
   Starting container with port 3000...
   [Server started] Listening on port 3000
   Application started
   ```
4. **Status** chuyển thành ✅ Running.
5. **Kiểm tra health:**
   - Sevalla cấp URL cho backend (ví dụ: `https://webdating-backend-xxx.sevalla.app`)
   - Gọi `/health` endpoint: `curl https://webdating-backend-xxx.sevalla.app/health`
   - Expected response: `{ "status": "ok" }` hoặc tương tự

**Kết quả:** Backend đang chạy production, ready nhận requests.

---

### Bước 2.5: Tạo Frontend Application trên Sevalla

1. **Vào Sevalla Dashboard** → Applications → Create application.
2. **Chọn deployment type** → Docker image.
3. **Điền Application details:**
   - Name: `webdating-frontend`
   - Docker image: `ghcr.io/dat07022004/webdating-frontend:latest`
   - Registry credential: Chọn GHCR credential từ Bước 2.1
4. **Chọn Location** → Changhua County, Taiwan (asia-east1).
5. **Chọn Resource** → 0.3 CPU / 0.3 GB RAM.
6. **Port settings:**
   - Web process port: `80` (phải match nginx EXPOSE 80)
7. **Bấm Create application** (chưa deploy vẫn).

**Lưu ý:** Frontend không cần environment variables lúc runtime vì VITE\_\* variables đã được nhúng trong lúc build (GitHub Actions build stage).

---

### Bước 2.6: Deploy Frontend trên Sevalla

1. Trong app dashboard → webdating-frontend → bấm **Deploy now**.
2. **Sevalla process:**
   - Kéo image ghcr.io/dat07022004/webdating-frontend:latest
   - Tạo container
   - Start nginx, mở port 80
3. **Kiểm tra logs:**
   ```
   Pulling image ghcr.io/dat07022004/webdating-frontend:latest...
   Image pulled successfully
   Starting container with port 80...
   Nginx started
   Application started
   ```
4. **Status** → ✅ Running.
5. **Kiểm tra frontend:**
   - Mở URL Sevalla cấp (ví dụ: `https://webdating-frontend-xxx.sevalla.app`)
   - React app load, giao diện hiển thị
   - **Mở DevTools** → Network tab → kiểm tra network requests:
     - API calls phải gọi tới backend URL (VITE_API_URL), không phải localhost
     - Socket.io connection phải gọi tới Socket URL (VITE_SOCKET_URL)

**Kết quả:** Frontend chạy, kết nối được backend.

---

## Phase 3: Validation & Troubleshooting

### Kiểm tra Backend Health

```bash
curl https://webdating-backend-xxx.sevalla.app/health
# hoặc mở URL trong browser
```

**Expected output:** `{ "status": "ok" }` hoặc endpoint-specific response

**Nếu fail:**

- Check DATABASE_URL connectivity
- Check CLERK_SECRET_KEY hợp lệ
- Check INNGEST_SIGNING_KEY đúng
- View Sevalla logs để thấy error lý do

---

### Kiểm tra Frontend Network Requests

1. **Mở frontend app URL** trên browser.
2. **DevTools** → Network tab.
3. **Kiểm tra API requests:**
   - Tất cả fetch call phải gọi tới **backend Sevalla URL**, ví dụ: `https://webdating-backend-xxx.sevalla.app/api/users`
   - Không được gọi `localhost` hay IP cục bộ
   - Status code phải 200-300, không phải 5xx
4. **Kiểm tra Socket.io connection:**
   - Network tab filter "socket.io" hoặc "ws:"
   - Phải thấy connection upgrade từ HTTP polling → WebSocket
   - Connection status "Connected" hoặc "OPEN"

**Nếu bị 503 Frontend:**

- Kiểm tra port settings: phải là 80, không 8080
- View logs → nginx có startup không?
- Nếu cần port 8080: phải sửa nginx.conf & rebuild image

**Nếu API không connect:**

- Frontend logs sẽ show CORS error hoặc 404 "Cannot POST /api/..."
- Check VITE_API_URL đúng (phải là Sevalla backend URL)
- Check backend bình thường không có error

---

### Auto-update Image (Optional)

Deploy lại frontend/backend sau mỗi push code mới:

1. **Manual:** Bấm Deploy now lại ở Sevalla → pull latest tag
2. **Auto (nếu Sevalla hỗ trợ):** Cấu hình webhook hoặc auto-redeploy khi image push

---

## Phase 4: Production Maintenance

### Sau mỗi lần push code mới

```
Developer push code to main
         ↓
GitHub Actions auto-run (Build → Test → Deploy)
         ↓
New images push to GHCR (tagged latest + sha)
         ↓
Manual: Go to Sevalla → Deploy now (pull latest)
         ↓
Production updated
```

### Monitoring

- **Sevalla dashboard**: Check app status, logs, resource usage
- **Frontend DevTools**: Monitor network errors, console errors
- **Backend health endpoint**: Poll regularly để detect downtime

---

## Tóm tắt Workflow Chi Tiết

```
┌─────────────────────┐
│  Developer         │
│  git push main     │
└──────────┬──────────┘
           ↓
┌─────────────────────────────────────────────┐
│  GitHub Actions (Automatic)                  │
│  ├─ Build: npm ci + npm run build           │
│  ├─ Test: npm run test:coverage             │
│  └─ Deploy: build images → push to GHCR     │
└──────────┬──────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  GHCR (Container Registry)                   │
│  ├─ webdating-backend:latest                │
│  └─ webdating-frontend:latest               │
└──────────┬──────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Sevalla (Manual Deploy)                     │
│  ├─ Create Registry Credential              │
│  ├─ Create Backend App + Env Vars           │
│  ├─ Deploy Backend (pull + start)           │
│  ├─ Create Frontend App                     │
│  ├─ Deploy Frontend (pull + start)          │
│  └─ Validate via URLs + DevTools            │
└──────────┬──────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Production Running                          │
│  ├─ Backend: https://webdating-backend...   │
│  ├─ Frontend: https://webdating-frontend... │
│  └─ Connected & healthy                     │
└─────────────────────────────────────────────┘
```

---

## Checklist Xác minh

- [ ] Registry Credential tạo thành công
- [ ] Backend app created + env vars configured
- [ ] Backend deployed + health check pass
- [ ] Frontend app created
- [ ] Frontend deployed + page loads
- [ ] DevTools Network: API calls gọi tới backend Sevalla URL
- [ ] Socket.io: connection upgraded to WebSocket
- [ ] No CORS errors, no localhost requests từ frontend
- [ ] Backend logs: no error, requests received from frontend
