import { FastifyInstance, FastifyRequest } from 'fastify';
import admin from 'firebase-admin';
import { getBearerAuthorizationHeader } from './request-auth.js';

// Extended request type with user info
import './types.js';

let firebaseInitialized = false;

/** Normalize PEM from .env (escaped \\n, optional wrapping quotes, CRLF). */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  let k = String(raw).trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).replace(/\\"/g, '"');
  }
  k = k.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
  return k.length ? k : undefined;
}

function initFirebase() {
  if (firebaseInitialized) return;

  const projectId = (process.env.FIREBASE_PROJECT_ID || 'hiremeapp2026-72a87').trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!privateKey || !clientEmail) {
      throw new Error(
        'Production requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY. Check GitHub Actions secrets and /opt/hiremebharat/.env on the VM.'
      );
    }
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY is not a valid PEM (missing BEGIN PRIVATE KEY). Regenerate the key in GitHub Secrets or fix .env — multiline keys must not be broken by shell echo; use scripts/ci/write-env-prod.cjs in CI.'
      );
    }
  }

  if (privateKey && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log(`🔐 Firebase Admin SDK initialized (service account) projectId=${projectId}`);
  } else {
    // Development: project ID only (ADC / emulator) — verifyIdToken may not work without credentials
    admin.initializeApp({
      projectId,
    });
    console.log(`🔐 Firebase Admin SDK initialized (dev mode — project ID only) projectId=${projectId}`);
  }

  firebaseInitialized = true;
}

export async function registerAuthPlugin(app: FastifyInstance) {
  initFirebase();

  const authenticate = async (request: FastifyRequest, reply: any) => {
    try {
      const authHeader = getBearerAuthorizationHeader(request);

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

/**
 * Shared Firebase Admin accessor.
 * Ensures all services/routes use the same initialized firebase-admin instance.
 */
export function getFirebaseAdmin() {
  initFirebase();
  return admin;
}

