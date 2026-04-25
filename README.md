# HireMeBharat 🚀

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
- `FIREBASE_PROJECT_ID`: hiremeapp-d2496
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

- **Gateway (Port 3001):** Validates tokens and routes to sub-services.
- **Auth Service (Port 3002):** Handles `/public` endpoints.
- **Employee Service (Port 3003):** Handles `/employee` endpoints.
- **Employer Service (Port 3004):** Handles `/employer` endpoints.
- **Admin Service (Port 3005):** Handles `/admin` endpoints.

## 🚀 Deployment Status

- **Frontend (Live):** Successfully hosted on **Cloudflare Pages** (`hiremebharat.com`).
- **Backend (Live):** Deployed as Dockerized microservices on a **GCP VM**.
- **CI/CD:** 
  - **Cloudflare:** Automatic rebuilds on push to `main`.
  - **GCP:** GitHub Actions with **Path Filtering** build and push *only modified* services to a private Docker registry on the VM.

## 📁 Docker & Registry
The production environment uses a private `registry:2` instance on the GCP VM for secure, high-speed image orchestration.
