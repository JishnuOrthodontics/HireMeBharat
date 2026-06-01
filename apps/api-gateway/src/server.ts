import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import httpProxy from '@fastify/http-proxy';
import {
  registerMongoPlugin,
  registerAuthPlugin,
  registerRbacPlugin,
  getBearerAuthorizationHeader,
} from '@hiremebharat/backend-core';

config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

/** Sibling microservices (Docker Compose: http://api-auth:3002, …). Defaults suit local processes on loopback. */
const UPSTREAM_AUTH = process.env.UPSTREAM_AUTH ?? 'http://127.0.0.1:3002';
const UPSTREAM_EMPLOYEE = process.env.UPSTREAM_EMPLOYEE ?? 'http://127.0.0.1:3003';
const UPSTREAM_EMPLOYER = process.env.UPSTREAM_EMPLOYER ?? 'http://127.0.0.1:3004';
const UPSTREAM_ADMIN = process.env.UPSTREAM_ADMIN ?? 'http://127.0.0.1:3005';
const UPSTREAM_JOBS = process.env.UPSTREAM_JOBS ?? 'http://127.0.0.1:3006';

/** @fastify/reply-from may drop `authorization` while handling Connection hop-by-hop headers — restore from inbound bearer (incl. X-Firebase-Authorization fallback). */
function preserveInboundAuth(originalReq: FastifyRequest, headers: Record<string, unknown>) {
  const out = { ...headers } as Record<string, string>;
  const bearer = getBearerAuthorizationHeader(originalReq);
  if (bearer) out.authorization = bearer;
  return out;
}

const forwardAuthReplyOptions = { rewriteRequestHeaders: preserveInboundAuth };

async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  // --- Plugins ---
  const frontendOrigin = process.env.FRONTEND_URL || 'https://hiremebharat.com';
  await app.register(cors, {
    origin: [frontendOrigin, 'https://hiremebharat.com', 'https://www.hiremebharat.com', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Firebase-Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await registerMongoPlugin(app);
  // Register directly on this app instance so preValidation closures
  // can always access app.authenticate/app.requireRole at runtime.
  await registerAuthPlugin(app);
  await registerRbacPlugin(app);

  // --- HTTP Proxy to microservices ---
  // Public routes (no auth required) -> api-auth
  await app.register(httpProxy as any, {
    upstream: UPSTREAM_AUTH,
    prefix: '/api/public',
    rewritePrefix: '/api/public',
    replyOptions: forwardAuthReplyOptions,
  });

  // Protected routes with RBAC -> appropriate microservice
  await app.register(httpProxy as any, {
    upstream: UPSTREAM_EMPLOYEE,
    prefix: '/api/employee',
    rewritePrefix: '/api/employee',
    replyOptions: forwardAuthReplyOptions,
    // Pre-validation hook - check authentication and role
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      const path = String((request as any).raw?.url || request.url || '');
      if (path.startsWith('/api/employee/public/')) {
        await app.requireRole('EMPLOYER', 'ADMIN')(request, reply);
      } else {
        await app.requireRole('EMPLOYEE')(request, reply);
      }
    }
  });

  await app.register(httpProxy as any, {
    upstream: UPSTREAM_EMPLOYER,
    prefix: '/api/employer',
    rewritePrefix: '/api/employer',
    replyOptions: forwardAuthReplyOptions,
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      await app.requireRole('EMPLOYER')(request, reply);
    }
  });

  await app.register(httpProxy as any, {
    upstream: UPSTREAM_ADMIN,
    prefix: '/api/admin',
    rewritePrefix: '/api/admin',
    replyOptions: forwardAuthReplyOptions,
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      await app.requireRole('ADMIN')(request, reply);
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Job Portal proxies
  // ORDER MATTERS: more-specific prefixes MUST be registered first.
  // @fastify/http-proxy matches by longest-prefix, but registration
  // order breaks ties. /api/jobs/listings (public, GET-only) is
  // registered before /api/jobs (authenticated catch-all) so that
  // unauthenticated browse requests pass through.
  // ──────────────────────────────────────────────────────────────

  // 1. Public job listings — no auth, read-only (GET / HEAD only)
  await app.register(httpProxy as any, {
    upstream: UPSTREAM_JOBS,
    prefix: '/api/jobs/listings',
    rewritePrefix: '/api/jobs/listings',
    replyOptions: forwardAuthReplyOptions,
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      // Only allow safe/read-only methods on the public endpoint
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        reply.code(405).send({ error: 'Method Not Allowed', message: 'Public listings are read-only' });
      }
    },
  });

  // 2. Authenticated /api/jobs catch-all — requires valid Firebase token
  //    and at least one platform role (EMPLOYEE, EMPLOYER, or ADMIN).
  await app.register(httpProxy as any, {
    upstream: UPSTREAM_JOBS,
    prefix: '/api/jobs',
    rewritePrefix: '/api/jobs',
    replyOptions: forwardAuthReplyOptions,
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      await app.requireRole('EMPLOYEE', 'EMPLOYER', 'ADMIN')(request, reply);
    },
  });

  // --- Health Check ---
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hiremebharat-api-gateway',
  }));

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });
    console.log(`?? HireMeBharat API Gateway running at http://${HOST}:${PORT}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();