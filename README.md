# HireMeBharat 🚀

*(This directory is the Git repository root when you clone **HireMeBharat**.)*

HireMeBharat is a premium, concierge-style recruitment and talent-matching platform. It serves three distinct users:
1. **Employees:** Professionals seeking high-quality job opportunities and curated matches.
2. **Employers:** Companies and recruiters seeking top-tier talent through a streamlined requisition process.
3. **Admins (Concierge):** Internal staff who provide white-glove mediation, matching, and support.

This project is built as a modern full-stack web application utilizing a unified monorepo structure with a microservices-based backend.

## 🏗️ Architecture Stack

- **Frontend:** React, TypeScript, Vite, CSS (Glassmorphic dark UI)
- **Backend:** Microservices-based Node.js, Fastify, TypeScript
- **Database:** MongoDB Atlas (Cloud)
- **Authentication:** Firebase Auth (Email/Password, Google Sign-In) + Firebase Admin SDK for backend JWT validation.
- **Orchestration:** Docker & Docker Compose
- **CI/CD:** GitHub Actions (Path-based incremental deployments)

## 📁 Repository Structure

```
hiremebharat/
├── apps/
│   ├── web/              # React frontend application
│   ├── api-gateway/      # Entry point with JWT validation & routing
│   ├── api-auth/         # Handles registration & user syncing
│   ├── api-employee/     # Employee-specific microservice
│   ├── api-employer/     # Employer-specific microservice
│   └── api-admin/        # Admin-specific microservice
├── packages/
│   ├── shared/           # Shared TypeScript types and constants
│   └── backend-core/     # Common backend logic (DB, Auth, RBAC)
├── .github/workflows/    # CI/CD pipelines (Cloudflare & GCP)
└── docker-compose.yml    # Orchestration for local development
```

## 🔐 Environment Variables

Each microservice and the frontend requires specific environment variables. 
*(Never commit `.env` to version control).*

### Backend Services (apps/api-*)
Most services require:
- `MONGODB_URI`: MongoDB Atlas Connection String
- `FIREBASE_PROJECT_ID`: `hiremeapp2026-72a87` (must match frontend Firebase project)
- `PORT`: Service-specific port (3001-3005)

### Frontend (apps/web/.env)
```env
VITE_API_URL=http://localhost:3001 # Points to the Gateway
VITE_FIREBASE_API_KEY=AIzaSyBy...
...
```

## 🚀 Getting Started

### Local Development (with Docker)

1. **Install dependencies:**  
   ```bash
   npm install
   ```

2. **Start the entire stack:**  
   ```bash
   docker-compose up --build
   ```
   This will spin up the Gateway, all Microservices, and the Frontend.

### Manual Dev Mode
- Backend (Gateway): `npm run dev --workspace=apps/api-gateway`
- Frontend: `npm run dev --workspace=apps/web`

## 🛡️ Authentication & Routing

Authentication is handled on the client via `AuthContext` utilizing the Firebase SDK. The **API Gateway** acts as the security shield, validating Firebase JWTs before proxying requests to any internal microservice.

- **Gateway (Port 3001):** Validates tokens and routes to sub-services. Proxies use **`rewritePrefix`** so upstream services still receive full paths such as **`/api/public/register`** (`@fastify/http-proxy` otherwise strips the route prefix). In Docker Compose, upstream URLs are set via **`UPSTREAM_AUTH`**, **`UPSTREAM_EMPLOYEE`**, **`UPSTREAM_EMPLOYER`**, **`UPSTREAM_ADMIN`** (defaults: `127.0.0.1` ports 3002–3005 for local processes; prod compose uses **`http://api-auth:3002`** and sibling DNS names).
- **Auth Service (Port 3002):** Handles `/public` endpoints.
- **Employee Service (Port 3003):** Handles `/employee` endpoints.
- **Employer Service (Port 3004):** Handles `/employer` endpoints.
- **Admin Service (Port 3005):** Handles `/admin` endpoints.

## 🔄 Fresh GCP VM / secrets reset

Operational scripts live under [`scripts/`](scripts/):

1. **GCP cleanup:** [`scripts/gcp/teardown.sh`](scripts/gcp/teardown.sh) (dry-run by default; `--execute` deletes instances after confirmation).
2. **Firewall:** [`scripts/gcp/provision-vm-firewall.sh`](scripts/gcp/provision-vm-firewall.sh) — SSH `22` + registry `5000`.
3. **VM bootstrap:** [`scripts/vm-bootstrap.sh`](scripts/vm-bootstrap.sh) — Docker + `/opt/hiremebharat` (run on the VM with `sudo`).
4. **GitHub Actions secret names:** [`scripts/github-actions-secrets.env.example`](scripts/github-actions-secrets.env.example).
5. **Cloudflare checklist:** [`scripts/cloudflare/setup-notes.sh`](scripts/cloudflare/setup-notes.sh).
6. **First backend deploy:** GitHub → Actions → **Build and Deploy Backend** → **Run workflow** (`workflow_dispatch` runs full-stack deploy). Then verify with [`scripts/verify-deployment.sh`](scripts/verify-deployment.sh).

See [`SECURITY.md`](SECURITY.md) if credentials were exposed.

## 🚀 Deployment Status

- **Frontend (Live):** Successfully hosted on **Cloudflare Pages** (`hiremebharat.com`).
- **Backend (Live):** Deployed as Dockerized microservices on a **GCP VM**.
- **CI/CD:** 
  - **Cloudflare:** Automatic rebuilds on push to `main`.
  - **GCP:** GitHub Actions with **Path Filtering** build and push *only modified* services to a private Docker registry on the VM.

## 📁 Docker & Registry
The production environment uses a private `registry:2` instance on the GCP VM for secure, high-speed image orchestration.

## 🤖 CI/CD — GitHub Actions workflows

Secrets and variable names are also listed in [`scripts/github-actions-secrets.env.example`](scripts/github-actions-secrets.env.example). Use **Settings → Secrets and variables → Actions** (and **Variables** for non-sensitive values).

### Workflow: **Deploy Frontend to Cloudflare Pages** (`.github/workflows/deploy-frontend.yml`)

| Item | Detail |
|------|--------|
| **File** | [`deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) |
| **Triggers** | Push to `main` when paths change under `apps/web/**`, `packages/**`, `package.json`, or `package-lock.json`. |
| **Runner** | `ubuntu-latest` |
| **Steps (summary)** | Checkout → Node 20 + `npm ci` → `npm run build --workspace=@hiremebharat/web` with Vite env from secrets → deploy `apps/web/dist` with **cloudflare/pages-action** (project `hiremebharat`). |
| **Secrets used** | `VITE_API_URL`, `VITE_FIREBASE_*` (full set for the web app), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. |

Production frontend URL: **`https://hiremebharat.com`**.

---

### Workflow: **Build and Deploy Backend** (`.github/workflows/deploy-backend.yml`)

| Item | Detail |
|------|--------|
| **File** | [`deploy-backend.yml`](.github/workflows/deploy-backend.yml) |
| **Triggers** | Push to `main` when backend paths change (`apps/api-*`, `packages/backend-core`, workflow file, `deploy-full-stack.sh`), or **workflow_dispatch** (manual). |

#### Job: `meta`
Computes **`run_full_stack`**:
- **`true`** if the event is **workflow_dispatch**, **or** (on **push**) the changed paths match **only** infra: `.github/workflows/deploy-backend.yml` or `deploy-full-stack.sh`.
- **`false`** otherwise (normal code changes under `apps/api-*` / `backend-core`).

#### Job: `build-and-deploy` (matrix)
Runs when **`run_full_stack == false`** and event is **push**.

| Matrix | `api-gateway`, `api-auth`, `api-employee`, `api-employer`, `api-admin` |
|--------|--------------------------------------------------------------------------|
| **Per service** | Path filter: deploy **only if** `apps/<service/**` or `packages/backend-core/**` changed. |
| **Docker** | Before Buildx: configure **`insecure-registries`** on the runner for **`GCP_VM_IP:5000`** (VM registry is HTTP). Buildx config sets registry HTTP for push/pull. |
| **Deploy** | Build image → push to **`GCP_VM_IP:5000`** → SCP `docker-compose.prod.yml`, `.env`, `deploy-service.sh` → SSH run **`deploy-service.sh <service> <sha>`**. |

#### Job: `verify-public-api`
Runs after **`build-and-deploy`** succeeds. Runs [`scripts/ci/verify-public-api.sh`](scripts/ci/verify-public-api.sh), which curls **`${PUBLIC_API_URL}/api/health`**. Set repository **variable** (preferred) or secret **`PUBLIC_API_URL`** (e.g. `https://api.hiremebharat.com`). If unset, the script prints a notice and exits **0**.

#### Job: `full-stack-deploy`
Runs when **`run_full_stack == true`** (manual run or infra-only push).

| Step (summary) | Purpose |
|----------------|---------|
| SSH key for **appleboy** actions | Deploy key `GCP_VM_SSH_KEY`; optional `GCP_VM_SSH_KEY_PASSPHRASE`. |
| Node + `npm ci` | Same monorepo install as local. |
| **Configure Docker insecure registry** | Same as matrix — allows `docker login` / Buildx push to HTTP registry on `:5000`. |
| Docker login | Uses `REGISTRY_USER` / `REGISTRY_PASSWORD` from prepared `.env.prod` (defaults in workflow if secrets absent). |
| Build & push | All five API images tagged with **`${{ github.sha }}`**. |
| SCP | `docker-compose.prod.yml`, `.env.prod`, `deploy-full-stack.sh` → **`/opt/hiremebharat/`** on the VM. |
| SSH | **`deploy-full-stack.sh`** pulls/up services. |
| Verify on VM | Loop curl **`http://127.0.0.1:3001/api/health`** until OK. |
| Verify public | Same **`verify-public-api.sh`** against **`PUBLIC_API_URL`**. |

Production API base (via Cloudflare → Nginx on VM → gateway): **`https://api.hiremebharat.com`**.

#### CI/.env note for Firebase private key

Production deploy writes VM `.env` using [`scripts/ci/write-env-prod.cjs`](scripts/ci/write-env-prod.cjs) (instead of shell `echo`) so long PEM secrets such as `FIREBASE_PRIVATE_KEY` are preserved correctly.

In production compose, backend services load secrets through `env_file: .env` to avoid `${VAR}` interpolation edge cases with multiline keys.

#### Backend-related secrets (reference)

| Secret | Role |
|--------|------|
| `GCP_VM_IP`, `GCP_VM_USERNAME`, `GCP_VM_SSH_KEY` | SSH/SCP to VM; optional `GCP_VM_SSH_KEY_PASSPHRASE`. |
| `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` | Written into `.env` on the VM for all services. |
| `REGISTRY_USER`, `REGISTRY_PASSWORD` | Optional; htpasswd for private registry on `:5000`. |
| `PUBLIC_API_URL` | Prefer **repository variable**; used only by public HTTPS verify step. |

---

### Smoke checks after deploy

```bash
# From your laptop (same check CI runs if PUBLIC_API_URL is set):
API_URL=https://api.hiremebharat.com bash scripts/verify-deployment.sh

# Optional — explicit script:
PUBLIC_API_URL=https://api.hiremebharat.com bash scripts/ci/verify-public-api.sh
```

---

### Registration and login (production behaviour)

1. **Firebase Auth (client)** — Email/password or Google in the React app (`AuthContext`). Firebase issues an **ID token**.
2. **Backend profile** — After sign-up, the app calls **`POST /api/public/register`** on the API gateway with **`Authorization: Bearer <idToken>`** and body `{ displayName, role }` (`EMPLOYEE` or `EMPLOYER`). **`GET /api/public/me`** returns the MongoDB profile using the same token.
3. **Gateway** (`api-gateway`) validates JWTs and proxies **`/api/public/*`** to **`api-auth`**.

If a Firebase Auth user already exists but no MongoDB profile exists, the frontend now routes that user to **`/role-select`** and completes profile creation via **`POST /api/public/register`** (instead of blocking sign-in with "No account profile found").

Public, no-auth health and landing stats:

- **`GET /api/health`** — Gateway liveness (also used by CI).
- **`GET /api/public/stats`** — Static placeholder stats for the landing page.

Ensure **Firebase Console → Authentication → Settings → Authorized domains** includes **`hiremebharat.com`** (and **`localhost`** for dev).

The GitHub/backend secret **`FIREBASE_PROJECT_ID`** must be the **same Firebase project ID** as the frontend (`**VITE_FIREBASE_PROJECT_ID**` / Firebase console), for example **`hiremeapp2026-72a87`**. If it differs from the project that mints ID tokens (e.g. **`hiremeapp2026`** vs **`hiremeapp2026-72a87`**), **`verifyIdToken`** fails and **`/api/public/register`** returns **401 Invalid token**.

Also ensure `api-auth` routes and auth middleware use the same initialized Firebase Admin instance (via `@hiremebharat/backend-core`) to avoid `The default Firebase app does not exist` during token verification.

## 👑 Admin bootstrap (no public registration)

Admins are not created via the public register flow. Use workflow **Bootstrap Admin User** (`.github/workflows/bootstrap-admin.yml`) with `workflow_dispatch`.

- Input `admin_email` (required): user to promote.
- Input `create_if_missing` (default `true`): create Firebase user if absent.
- Input `admin_temp_password`: required only when creating a new Firebase user.

The workflow runs `scripts/admin/bootstrap-admin.cjs` and:

1. Finds (or creates) the Firebase Auth user.
2. Upserts MongoDB profile in `hiremebharat.users` with role `ADMIN`.
3. Sets Firebase custom claims `{ role: "ADMIN" }`.

No admin credentials are committed in code; secrets come from GitHub Actions secrets.

## Employee dashboard data APIs

Employee views now read/write real backend data through `api-employee` (role-scoped to `EMPLOYEE`):

- `GET/PATCH /api/employee/profile`
- `GET /api/employee/matches?status=ALL|NEW|SAVED|INTERESTED|APPLIED|INTERVIEW|DECLINED`
- `POST /api/employee/matches/:id/interest`
- `POST /api/employee/matches/:id/save`
- `POST /api/employee/matches/:id/decline`
- `GET /api/employee/concierge/messages`
- `POST /api/employee/concierge/messages`
- `GET /api/employee/notifications`
- `POST /api/employee/notifications/:id/read`
- `GET /api/employee/dashboard-summary`

Backed MongoDB collections/indexes:

- `candidate_profiles` (`userId` unique)
- `employee_matches` (`employeeUid`, `status`, `updatedAt`)
- `employee_conversations` (`employeeUid` unique)
- `employee_messages` (`conversationId`, `timestamp`)
- `notifications` (`userUid`, `read`, `createdAt`)

### Employee API smoke test

Use a valid Firebase ID token for an employee user:

```bash
API_URL=https://api.hiremebharat.com \
ID_TOKEN=<firebase-id-token> \
bash scripts/ci/verify-employee-api.sh
```

