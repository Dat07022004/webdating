# CI/CD Guide for Web Dating

## 1. Workflow structure

Use **one** GitHub Actions workflow file with **3 jobs**:

- `build`
- `test`
- `deploy`

Actual workflow file in this repo:

- [.github/workflows/Build-test-deploy.yml](.github/workflows/Build-test-deploy.yml)

Why one file:

- Easier to read in grading.
- Build/Test/Deploy dependencies are explicit with `needs`.
- The Actions history stays in one place.

Use separate YAML files only if you want different triggers or different owners for each pipeline.

## 2. What each job does

### Build

- Installs dependencies with `npm ci`
- Runs frontend build
- Verifies the app can compile before tests

### Test

- Runs backend coverage tests
- Runs frontend coverage tests
- Uploads coverage artifacts

### Deploy

- Runs only on push to `main`
- Logs in to GHCR
- Builds and pushes backend/frontend Docker images
- Tags images with `latest` and the commit SHA

### Pipeline summary for the report

- Tool used: GitHub Actions
- Pipeline style: single YAML with three dependent jobs
- Build job purpose: verify both backend and frontend can install dependencies and compile
- Test job purpose: run backend coverage tests and frontend coverage tests in isolated test mode
- Deploy job purpose: build Docker images and push them to GitHub Container Registry

## 3. Local testing commands

### Backend unit/integration coverage

```bash
cd backend
npm ci
npm run test:coverage
```

### Frontend unit coverage

```bash
cd frontend
npm ci
npm run test:coverage
```

### Build check

```bash
cd frontend
npm run build
```

If you want to validate the backend container locally:

```bash
cd backend
docker build -t webdating-backend:local .
docker run --rm -p 3000:3000 webdating-backend:local
```

If you want to validate the frontend container locally:

```bash
cd frontend
docker build -t webdating-frontend:local .
docker run --rm -p 8080:80 webdating-frontend:local
```

## 4. GitHub Actions run order

### On pull request

- `build`
- `test`
- `deploy` does not run

### On push to main

- `build`
- `test`
- `deploy`

### On other branches

- `build`
- `test`
- `deploy` does not run

## 5. GHCR output

GHCR means **GitHub Container Registry**. It is the place where GitHub Actions stores Docker images after the deploy job builds them.

The deploy job pushes these images:

- `ghcr.io/<owner>/webdating-backend:latest`
- `ghcr.io/<owner>/webdating-backend:<sha>`
- `ghcr.io/<owner>/webdating-frontend:latest`
- `ghcr.io/<owner>/webdating-frontend:<sha>`

GHCR does **not** store runtime secrets for your app. The container image is only the package. The real production environment variables are attached later in the platform that runs the container, for example Sevalla.

### Production env placement

- Frontend build-time public values can stay in the workflow because Vite needs them during `npm run build`.
- Backend runtime secrets should be set in Sevalla's environment settings, not hard-coded in the image.
- If Sevalla asks for env vars, enter them there as plain values or secrets depending on the platform UI.

### What you likely need to fill

| Variable                     | Example value                                  | GitHub Secrets                        | Sevalla runtime env |
| ---------------------------- | ---------------------------------------------- | ------------------------------------- | ------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` or your existing publishable key | `FRONTEND_VITE_CLERK_PUBLISHABLE_KEY` | No                  |
| `VITE_API_URL`               | `https://your-backend-domain`                  | `FRONTEND_VITE_API_URL`               | No                  |
| `VITE_SOCKET_URL`            | `https://your-backend-domain`                  | `FRONTEND_VITE_SOCKET_URL`            | No                  |
| `CLERK_PUBLISHABLE_KEY`      | production Clerk key                           | No                                    | Yes                 |
| `CLERK_SECRET_KEY`           | production Clerk secret                        | No                                    | Yes                 |
| `DATABASE_URL`               | production MongoDB URI                         | No                                    | Yes                 |
| `INNGEST_SIGNING_KEY`        | production signing key                         | No                                    | Yes                 |
| `CLOUDINARY_API_KEY`         | production Cloudinary key                      | No                                    | Yes                 |
| `CLOUDINARY_API_SECRET`      | production Cloudinary secret                   | No                                    | Yes                 |
| `CLOUDINARY_CLOUD_NAME`      | production cloud name                          | No                                    | Yes                 |
| `MOMO_PARTNER_CODE`          | production MoMo partner code                   | No                                    | Yes                 |
| `MOMO_ACCESS_KEY`            | production MoMo access key                     | No                                    | Yes                 |
| `MOMO_SECRET_KEY`            | production MoMo secret key                     | No                                    | Yes                 |

### GitHub Secrets to create

Add these in GitHub repo settings under `Settings > Secrets and variables > Actions`:

- `FRONTEND_VITE_CLERK_PUBLISHABLE_KEY`
- `FRONTEND_VITE_API_URL`
- `FRONTEND_VITE_SOCKET_URL`

## 6. Checklist for the assignment screenshots

### Screenshot 1: Failure state

Capture one workflow run that fails on purpose or from the old broken version.

- Open the repo on GitHub
- Go to Actions
- Click the workflow run
- Show at least one red failed job

### Screenshot 2: Success state

Capture one workflow run where Build, Test, and Deploy succeed.

- Show green checkmarks for jobs
- Show the run summary and timestamp
- Show coverage/artifact upload if available

### Screenshot 3: History state

Capture the Actions history page.

- Show multiple runs
- Show at least one failed and one successful run in the list
- Make sure the workflow name is visible

## 7. What to mention in the report

- Tool used: GitHub Actions
- CI stages: Build, Test, Deploy
- Backend test command: `npm run test:coverage`
- Frontend test command: `npm run test:coverage`
- Build command: `npm run build`
- Deploy method: Docker image build and push to GHCR
- Container images: backend and frontend, each with `latest` and commit SHA tags

## 8. File configuration details

### Workflow YAML explanation

The workflow file [.github/workflows/Build-test-deploy.yml](.github/workflows/Build-test-deploy.yml) uses these key settings:

- `on.push.branches: ["**"]` so CI runs on every branch push.
- `on.pull_request.branches: ["main"]` so PRs into main are validated.
- `workflow_dispatch` so the pipeline can be started manually.
- `permissions.contents: read` for checkout and source access.
- `permissions.packages: write` so the deploy job can push Docker images to GHCR.
- `concurrency.cancel-in-progress: true` so a newer run cancels an older one on the same ref.
- `build` job installs with `npm ci` and runs frontend compilation.
- `test` job runs after build and executes backend plus frontend coverage.
- `deploy` job runs only on `push` to `main` and only after tests pass.

### Available libraries and versions used in config

#### Frontend

- `react` `^18.3.1`
- `react-dom` `^18.3.1`
- `react-router-dom` `^6.30.1`
- `@tanstack/react-query` `^5.83.0`
- `socket.io-client` `^4.8.3`
- `@clerk/clerk-react` `^5.59.5`
- Build tooling: `vite` `^5.4.19`, `vitest` `^4.1.0`, `typescript` `^5.8.3`

#### Backend

- `express` `^5.2.1`
- `mongoose` `^8.19.3`
- `@clerk/express` `^1.7.63`
- `cloudinary` `^2.8.0`
- `inngest` `^3.52.0`
- `multer` `^2.1.1`
- `socket.io` `^4.8.3`
- Tests: `jest` `^30.3.0`, `supertest` `^7.2.2`

### Why these versions matter

- Frontend uses React 18 and Vite, so the build job must provide Vite environment variables at build time.
- Backend uses Express 5 and Mongoose 8, so tests need to run in isolated mode without a real database connection.
- `socket.io-client` and `socket.io` must stay aligned to avoid protocol mismatch.
- Clerk packages are split between frontend and backend because the client and server use different SDKs.

## 8. Notes for Sevalla

Since the repo is not yet wired to Sevalla deployment directly, the safe baseline is:

- Build images in GitHub Actions
- Push images to GHCR
- Configure Sevalla to pull the image later

In practice, the deploy flow is:

1. GitHub Actions builds and pushes the image to GHCR.
2. Sevalla pulls that image.
3. You paste the production env vars into Sevalla's app settings.
4. Sevalla restarts the container with those env vars applied.

If Sevalla accepts direct Git/Dockerfile deployment, you can keep this workflow and point Sevalla to the GHCR image instead.

## 9. Ready-to-submit report text

### Tên tool sử dụng

GitHub Actions là công cụ CI/CD được sử dụng trong dự án. Workflow thực tế nằm tại [.github/workflows/Build-test-deploy.yml](.github/workflows/Build-test-deploy.yml).

### Chi tiết pipeline / workflow

Pipeline gồm 3 giai đoạn. Giai đoạn Build cài dependency cho backend và frontend, sau đó kiểm tra frontend có thể build được hay không. Giai đoạn Test chạy backend coverage bằng Jest và frontend coverage bằng Vitest trong môi trường test độc lập, có mock cho các dịch vụ ngoài như database, Clerk, Inngest, Cloudinary và MoMo. Giai đoạn Deploy chỉ chạy khi push trực tiếp lên nhánh `main`, đăng nhập GHCR, build Docker image cho backend và frontend, rồi push image lên GitHub Container Registry với hai tag `latest` và tag theo commit SHA.

### Chi tiết file cấu hình

File YAML dùng một workflow duy nhất để dễ theo dõi trong lịch sử Actions. `permissions.packages: write` cho phép đẩy image lên GHCR. `concurrency.cancel-in-progress: true` giúp tránh nhiều run chồng nhau trên cùng một nhánh. Job Build nhận ba biến `FRONTEND_VITE_CLERK_PUBLISHABLE_KEY`, `FRONTEND_VITE_API_URL`, `FRONTEND_VITE_SOCKET_URL` từ GitHub Secrets để nhúng vào frontend khi build image. Job Test dùng các giá trị mock như `pk_test_mock`, `sk_test_mock`, `mongodb://localhost:27017/webdating-test` để không phụ thuộc vào dịch vụ thật. Job Deploy tạo image từ `backend/Dockerfile` và `frontend/Dockerfile`, rồi đẩy lên `ghcr.io/<owner>/webdating-backend` và `ghcr.io/<owner>/webdating-frontend`.

### Thư viện áp dụng trong cấu hình

Frontend đang dùng React `^18.3.1`, React Query `^5.83.0`, React Router `^6.30.1`, Clerk `^5.59.5`, Socket.IO client `^4.8.3`, Vite `^5.4.19` và Vitest `^4.1.0`. Backend đang dùng Express `^5.2.1`, Mongoose `^8.19.3`, Clerk Express `^1.7.63`, Cloudinary `^2.8.0`, Inngest `^3.52.0`, Socket.IO `^4.8.3`, Jest `^30.3.0` và Supertest `^7.2.2`.

### 3 màn hình pipeline cần chụp

1. Ảnh trạng thái thất bại: một run có job đỏ, ví dụ lỗi build hoặc lỗi pull image.
2. Ảnh trạng thái thành công: run có Build, Test, Deploy đều xanh.
3. Ảnh lịch sử CI/CD: trang Actions hiển thị nhiều run, có cả thành công và thất bại.
