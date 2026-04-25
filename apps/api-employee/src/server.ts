import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { registerMongoPlugin, registerAuthPlugin, registerRbacPlugin } from '@hiremebharat/backend-core';
import { employeeRoutes } from './routes/employee/index.js';

config();

const PORT = parseInt(process.env.PORT || '3003', 10);
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

  await registerMongoPlugin(app);
  await app.register(registerAuthPlugin);
  await app.register(registerRbacPlugin);

  // --- Routes ---
  // Employee routes (require auth + EMPLOYEE role)
  await app.register(employeeRoutes, { prefix: '/api/employee' });

  // --- Health Check ---
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hiremebharat-api-employee',
  }));

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 HireMeBharat API Employee running at http://${HOST}:${PORT}`);

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