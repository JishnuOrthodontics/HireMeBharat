import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import httpProxy from '@fastify/http-proxy';
import { registerAuthPlugin } from '@hiremebharat/backend-core';
import { registerRbacPlugin } from '@hiremebharat/backend-core';

config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

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
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await registerAuthPlugin(app);
  await registerRbacPlugin(app);

  // --- HTTP Proxy to microservices ---
  // Public routes (no auth required) -> api-auth
  await app.register(httpProxy, {
    upstream: 'http://localhost:3002',
    prefix: '/api/public',
    // Decode the response
    decodeResponse: false,
  });

  // Protected routes with RBAC -> appropriate microservice
  await app.register(httpProxy, {
    upstream: 'http://localhost:3003',
    prefix: '/api/employee',
    // Decode the response
    decodeResponse: false,
    // Pre-validation hook - check authentication and role
    preValidation: (request, reply, done) => {
      app.authenticate(request, reply, (err) => {
        if (err) {
          reply.send(err);
        } else {
          app.requireRole('EMPLOYEE')(request, reply, done);
        }
      });
    }
  });

  await app.register(httpProxy, {
    upstream: 'http://localhost:3004',
    prefix: '/api/employer',
    decodeResponse: false,
    preValidation: (request, reply, done) => {
      app.authenticate(request, reply, (err) => {
        if (err) {
          reply.send(err);
        } else {
          app.requireRole('EMPLOYER')(request, reply, done);
        }
      });
    }
  });

  await app.register(httpProxy, {
    upstream: 'http://localhost:3005',
    prefix: '/api/admin',
    decodeResponse: false,
    preValidation: (request, reply, done) => {
      app.authenticate(request, reply, (err) => {
        if (err) {
          reply.send(err);
        } else {
          app.requireRole('ADMIN')(request, reply, done);
        }
      });
    }
  });

  // Shared routes (require auth but no specific role) -> can go to any, let's use api-auth
  await app.register(httpProxy, {
    upstream: 'http://localhost:3002',
    prefix: '/api',
    decodeResponse: false,
    preValidation: (request, reply, done) => {
      app.authenticate(request, reply, done);
    }
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
    console.log(`🚀 HireMeBharat API Gateway running at http://${HOST}:${PORT}`);

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