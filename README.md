# HireMeBharat 🚀

HireMeBharat is a premium, concierge-style recruitment and talent-matching platform. It serves three distinct users:
1. **Employees:** Professionals seeking high-quality job opportunities and curated matches.
2. **Employers:** Companies and recruiters seeking top-tier talent through a streamlined requisition process.
3. **Admins (Concierge):** Internal staff who provide white-glove mediation, matching, and support.

This project is built as a modern full-stack web application utilizing a unified monorepo structure.

## 🏗️ Architecture Stack

- **Frontend:** React, TypeScript, Vite, CSS (Glassmorphic dark UI)
- **Backend:** Node.js, Fastify, TypeScript
- **Database:** MongoDB Atlas (Cloud)
- **Authentication:** Firebase Auth (Email/Password, Google Sign-In) + Firebase Admin SDK for backend JWT validation.

## 📁 Repository Structure

```
hiremebharat/
├── apps/
│   ├── web/          # React frontend application
│   └── api/          # Fastify backend API
├── packages/
│   └── shared/       # Shared TypeScript types and constants
└── package.json      # Monorepo workspaces configuration
```

## 🔐 Environment Variables

To run the application, you must define the `.env` files for both the frontend and the backend.
*(Never commit `.env` to version control).*

### Backend (`apps/api/.env`)
```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Replace with your MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=HiremeApp
MONGODB_DB=hiremebharat

# Firebase Project Name
FIREBASE_PROJECT_ID=hiremeapp-d2496
```

### Frontend (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3001

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBy...
VITE_FIREBASE_AUTH_DOMAIN=hiremeapp-d2496.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hiremeapp-d2496
VITE_FIREBASE_STORAGE_BUCKET=hiremeapp-d2496.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=379888774094
VITE_FIREBASE_APP_ID=1:379888774094:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-7M357QKZT5
```

## 🚀 Getting Started

1. **Install dependencies:**  
   From the root folder run:
   ```bash
   npm install
   ```

2. **Start the Frontend and Backend concurrently:**  
   From the root folder run:
   ```bash
   npm run dev
   ```

   *Alternatively, run them separately:*
   - Backend: `npm run dev --workspace=apps/api`
   - Frontend: `npm run dev --workspace=apps/web`

3. **Open the browser:**  
   Navigate to `http://localhost:5173/` 

## 🛡️ Authentication & Routing

Authentication is handled on the client via `AuthContext` utilizing the Firebase SDK. Upon successful sign-in or registration through `/register`, the frontend validates the user type and automatically routes to their specific dashboard (`/employee`, `/employer`, or `/admin`).

The backend Fastify instance intercepts requests to protected routes in `src/plugins/auth.ts`, validates the incoming JWT against the Firebase Admin SDK, and fetches their corresponding MongoDB profile roles to authorize or deny access.

## 🚀 Deployment Targets

- **Frontend:** Designed for scalable frontend hosting platforms like **Cloudflare Pages**, Vercel, or Firebase Hosting.
- **Backend:** Designed to be containerized and deployed via **Google Cloud Run (GCP)** or similar serverless providers.
