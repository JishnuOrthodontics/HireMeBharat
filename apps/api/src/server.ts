import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { registerMongoPlugin } from './plugins/mongodb.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerRbacPlugin } from './plugins/rbac.js';
import { publicRoutes } from './routes/public/index.js';
import { adminRoutes } from './routes/admin/index.js';
import { employeeRoutes } from './routes/employee/index.js';
import { employerRoutes } from './routes/employer/index.js';
import { sharedRoutes } from './routes/shared/index.js';

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

  await registerMongoPlugin(app);
  await registerAuthPlugin(app);
  await registerRbacPlugin(app);

  // --- Health Check ---
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hiremebharat-api',
  }));

  // --- Routes ---
  // Public routes (no auth required)
  await app.register(publicRoutes, { prefix: '/api/public' });

  // Protected routes with RBAC
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(employeeRoutes, { prefix: '/api/employee' });
  await app.register(employerRoutes, { prefix: '/api/employer' });
  await app.register(sharedRoutes, { prefix: '/api' });

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 HireMeBharat API running at http://${HOST}:${PORT}`);

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

