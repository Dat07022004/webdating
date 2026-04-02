# CI/CD Guide for Web Dating

## 1. Workflow structure

Keep **one** GitHub Actions workflow file with **3 jobs**:

- `build`
- `test`
- `deploy`

Recommended file:

- [.github/workflows/Unit-and-Coverage-test.yml](.github/workflows/Unit-and-Coverage-test.yml)

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
