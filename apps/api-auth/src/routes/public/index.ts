import { FastifyInstance } from 'fastify';
import { getBearerAuthorizationHeader, getFirebaseAdmin } from '@hiremebharat/backend-core';

export async function publicRoutes(app: FastifyInstance) {
  const firebaseAdmin = getFirebaseAdmin();
  const classifyVerifyError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('audience') || m.includes('aud claim') || m.includes('issuer') || m.includes('iss claim')) return 'project-mismatch';
    if (m.includes('expired')) return 'expired';
    if (m.includes('issued at') || m.includes('future')) return 'clock-skew';
    if (m.includes('certificate') || m.includes('kid')) return 'cert-key-mismatch';
    return 'invalid';
  };

  // --- Helper: verify token from Authorization / X-Firebase-Authorization ---
  async function verifyToken(request: any) {
    const authHeader = getBearerAuthorizationHeader(request);
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    try {
      return await firebaseAdmin.auth().verifyIdToken(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      (request as any).verifyTokenReason = classifyVerifyError(msg);
      (request as any).verifyTokenDetail = msg.slice(0, 180);
      app.log.warn({ verifyIdTokenError: msg, reason: (request as any).verifyTokenReason }, 'verifyIdToken failed');
      return null;
    }
  }

  // POST /api/public/register — Create user profile (after Firebase sign-up)
  app.post('/register', async (request, reply) => {
    const decoded = await verifyToken(request);
    if (!decoded) {
      const reason = (request as any).verifyTokenReason || 'invalid';
      const detail = (request as any).verifyTokenDetail || '';
      return reply
        .header('x-auth-debug-reason', String(reason))
        .header('x-auth-debug-detail', String(detail))
        .code(401)
        .send({ error: 'Unauthorized', message: 'Invalid token', reason, detail });
    }

    const { displayName, role, photoURL } = request.body as any;

    if (!role || !['EMPLOYEE', 'EMPLOYER'].includes(role)) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid role. Must be EMPLOYEE or EMPLOYER.',
      });
    }

    try {
      // Check if user already exists
      if (app.mongo?.db) {
        const existing = await app.mongo.db.collection('users').findOne({ uid: decoded.uid });
        if (existing) {
          return reply.code(200).send({
            message: 'User already registered',
            profile: {
              uid: existing.uid,
              email: existing.email,
              displayName: existing.displayName,
              role: existing.role,
              photoURL: existing.photoURL,
              createdAt: existing.createdAt,
            },
          });
        }

        // Create new user profile
        const userProfile = {
          uid: decoded.uid,
          email: decoded.email || '',
          displayName: displayName || decoded.name || decoded.email || 'User',
          role,
          photoURL: photoURL || decoded.picture || null,
          provider: decoded.firebase?.sign_in_provider || 'password',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await app.mongo.db.collection('users').insertOne(userProfile);

        // Set Firebase custom claims for role
        try {
          await firebaseAdmin.auth().setCustomUserClaims(decoded.uid, { role });
        } catch (claimErr) {
          app.log.warn({ err: claimErr }, 'Failed to set custom claims');
        }

        return reply.code(201).send({
          message: 'User registered successfully',
          profile: {
            uid: userProfile.uid,
            email: userProfile.email,
            displayName: userProfile.displayName,
            role: userProfile.role,
            photoURL: userProfile.photoURL,
            createdAt: userProfile.createdAt,
          },
        });
      }

      // No MongoDB — return profile from token data
      return reply.code(201).send({
        message: 'User registered (no DB)',
        profile: {
          uid: decoded.uid,
          email: decoded.email,
          displayName: displayName || decoded.name || 'User',
          role,
        },
      });
    } catch (err) {
      app.log.error({ err }, 'Registration error');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // GET /api/public/me — Fetch current user's profile
  app.get('/me', async (request, reply) => {
    const decoded = await verifyToken(request);
    if (!decoded) {
      const reason = (request as any).verifyTokenReason || 'invalid';
      const detail = (request as any).verifyTokenDetail || '';
      return reply
        .header('x-auth-debug-reason', String(reason))
        .header('x-auth-debug-detail', String(detail))
        .code(401)
        .send({ error: 'Unauthorized', message: 'Invalid token', reason, detail });
    }

    try {
      if (app.mongo?.db) {
        const userDoc = await app.mongo.db.collection('users').findOne({ uid: decoded.uid });
        if (!userDoc) {
          return reply.code(404).send({ error: 'Not Found', message: 'User profile not found' });
        }
        return reply.send({
          profile: {
            uid: userDoc.uid,
            email: userDoc.email,
            displayName: userDoc.displayName,
            role: userDoc.role,
            photoURL: userDoc.photoURL,
            createdAt: userDoc.createdAt,
          },
        });
      }

      // No MongoDB — return basic token data
      return reply.code(404).send({ error: 'Not Found', message: 'User profile not found' });
    } catch (err) {
      app.log.error({ err }, 'Fetch profile error');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // POST /api/public/contact — Landing page contact form
  app.post('/contact', async (request, reply) => {
    const { name, email, company, message } = request.body as any;

    if (!name || !email || !message) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing required fields: name, email, message',
      });
    }

    try {
      if (app.mongo?.db) {
        await app.mongo.db.collection('contacts').insertOne({
          name,
          email,
          company: company || null,
          message,
          createdAt: new Date(),
        });
      }

      return reply.code(200).send({ message: 'Message received. We will be in touch.' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // GET /api/public/stats — Platform stats for landing page
  app.get('/stats', async (_request, reply) => {
    // TODO: Pull real stats from MongoDB
    return reply.send({
      placements: 2400,
      satisfaction: 98,
      companies: 500,
      avgMatchHours: 72,
    });
  });
}

