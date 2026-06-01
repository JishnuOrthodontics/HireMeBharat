import { FastifyInstance } from 'fastify';
import { MongoClient, Db } from 'mongodb';

import { registerAuthPlugin } from './auth.js';
import { registerRbacPlugin } from './rbac.js';
import './types.js';

export async function registerMongoPlugin(app: FastifyInstance) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'hiremebharat';

  const client = new MongoClient(uri, {
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '30000', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    app.log.info(`Connected to MongoDB database: ${dbName}`);

    app.decorate('mongo', { client, db });

    app.addHook('onClose', async () => {
      await client.close();
      app.log.info('MongoDB connection closed');
    });
  } catch (err) {
    app.log.error({ err }, 'Failed to connect to MongoDB');
    // Don't crash — allow server to start for development without DB
    const db = null as unknown as Db;
    app.decorate('mongo', { client, db });
  }
}

