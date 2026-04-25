import { FastifyInstance, FastifyRequest } from 'fastify';
import { MongoClient, Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      uid: string;
      email: string;
      role: string;
      displayName?: string;
    };
  }

  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
    };
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
    requireRole: (...roles: string[]) => (request: FastifyRequest, reply: any) => Promise<void>;
  }
}

export {};
