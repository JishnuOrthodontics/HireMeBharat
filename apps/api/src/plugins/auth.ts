import { FastifyInstance, FastifyRequest } from 'fastify';
import admin from 'firebase-admin';

// Extended request type with user info
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
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
  }
}

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || 'hiremeapp2026';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (privateKey) {
    // Production: Use environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('🔐 Firebase Admin SDK initialized (service account)');
  } else {
    // Development: Initialize with project ID only (uses ADC or emulator)
    admin.initializeApp({
      projectId,
    });
    console.log('🔐 Firebase Admin SDK initialized (dev mode — project ID only)');
  }

  firebaseInitialized = true;
}

export async function registerAuthPlugin(app: FastifyInstance) {
  initFirebase();

  const authenticate = async (request: FastifyRequest, reply: any) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7);

      // Development mock — accepts dev_ tokens for testing
      if (process.env.NODE_ENV === 'development' && token.startsWith('dev_')) {
        const parts = token.split('_');
        request.user = {
          uid: parts[1] || 'dev-user',
          email: `${parts[1] || 'dev'}@hiremebharat.com`,
          role: (parts[2] || 'EMPLOYEE').toUpperCase(),
          displayName: 'Dev User',
        };
        return;
      }

      // Verify Firebase ID token
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Look up the user's role from MongoDB
        const db = (app as any).mongo?.db;
        let role = 'EMPLOYEE';

        if (db) {
          const userDoc = await db.collection('users').findOne({ uid: decodedToken.uid });
          if (userDoc) {
            role = userDoc.role;
          }
        }

        request.user = {
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          role,
          displayName: decodedToken.name || decodedToken.email || '',
        };
      } catch (verifyErr: any) {
        app.log.error({ err: verifyErr }, 'Token verification failed');
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }
    } catch (err) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Token verification failed',
      });
    }
  };

  app.decorate('authenticate', authenticate);
}

