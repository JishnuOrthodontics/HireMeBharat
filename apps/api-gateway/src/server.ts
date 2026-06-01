import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import httpProxy from '@fastify/http-proxy';
import fastifyWebsocket from '@fastify/websocket';
import admin from 'firebase-admin';
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

  // --- WebSocket Plugin Registration ---
  await app.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 } // 1MB payload limit
  });

  // Active websocket connections map: userId -> Socket[]
  const activeClients = new Map<string, any[]>();

  // --- MongoDB Change Stream for Live Notifications ---
  app.ready(async () => {
    const db = app.mongo?.db;
    if (!db) return;

    try {
      const changeStream = db.collection('notifications').watch([
        { $match: { operationType: 'insert' } }
      ]);

      changeStream.on('change', (change: any) => {
        if (change.operationType === 'insert') {
          const doc = change.fullDocument;
          const userUid = doc?.userUid;
          if (userUid) {
            const payload = {
              type: 'notification',
              notification: {
                id: String(doc._id),
                type: doc.type,
                title: doc.title,
                content: doc.content,
                read: Boolean(doc.read),
                createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
              }
            };
            
            // Broadcast live to all the target user's active sockets
            activeClients.get(userUid)?.forEach(sock => {
              if (sock.readyState === 1) { // OPEN
                sock.send(JSON.stringify(payload));
              }
            });
          }
        }
      });

      app.log.info('🔔 Live Notifications MongoDB Change Stream observer successfully initialized');
    } catch (err) {
      app.log.warn('⚠️ Replica Change Stream not enabled or blocked locally. Live notifications fallback active.');
    }
  });

  // --- WebSocket Connection Upgrade Handler ---
  app.route({
    method: 'GET',
    url: '/api/ws',
    handler: async (request, reply) => {
      return reply.code(400).send({ error: 'Bad Request', message: 'WebSocket connection expected' });
    },
    wsHandler: async (connection, req) => {
      const token = (req.query as any)?.token;
      if (!token) {
        connection.socket.close(1008, 'Token is required');
        return;
      }

      let uid = '';
      let role = 'EMPLOYEE';
      let displayName = 'User';

      try {
        if (process.env.NODE_ENV === 'development' && token.startsWith('dev_')) {
          const parts = token.split('_');
          uid = parts[1] || 'dev-user';
          role = (parts[2] || 'EMPLOYEE').toUpperCase();
          displayName = 'Dev User';
        } else {
          const decoded = await admin.auth().verifyIdToken(token);
          uid = decoded.uid;
          
          const db = app.mongo?.db;
          const userDoc = db ? await db.collection('users').findOne({ $or: [{ uid }, { firebaseUid: uid }] }) : null;
          role = userDoc?.role || 'EMPLOYEE';
          displayName = userDoc?.displayName || 'User';
        }
      } catch (err) {
        connection.socket.close(1008, 'Authentication failed');
        return;
      }

      if (!activeClients.has(uid)) {
        activeClients.set(uid, []);
      }
      activeClients.get(uid)!.push(connection.socket);
      app.log.info(`WebSocket connected for user ${uid} (${role})`);

      connection.socket.on('close', () => {
        const list = activeClients.get(uid) || [];
        const index = list.indexOf(connection.socket);
        if (index !== -1) {
          list.splice(index, 1);
        }
        if (list.length === 0) {
          activeClients.delete(uid);
        }
        app.log.info(`WebSocket disconnected for user ${uid}`);
      });

      connection.socket.on('message', async (messageBuffer: any) => {
        try {
          const data = JSON.parse(messageBuffer.toString());
          const db = app.mongo?.db;
          if (!db) return;

          if (data.type === 'concierge_message') {
            const content = data.content;
            if (!content || !content.trim()) return;

            const conversations = db.collection('employee_conversations');
            const messagesCol = db.collection('employee_messages');
            const now = new Date();

            let convo = await conversations.findOne({ employeeUid: uid });
            if (!convo) {
              const insert = await conversations.insertOne({
                employeeUid: uid,
                conciergeName: 'Sarah Jenkins',
                conciergeTitle: 'Senior Talent Concierge',
                conciergeInitials: 'SJ',
                conciergeOnline: true,
                createdAt: now,
                updatedAt: now,
              });
              convo = await conversations.findOne({ _id: insert.insertedId });
            }

            const insertedUserMsg = await messagesCol.insertOne({
              conversationId: String(convo!._id),
              senderUid: uid,
              content: content,
              timestamp: now,
            });

            await conversations.updateOne({ _id: convo!._id }, { $set: { updatedAt: now, lastMessage: content } });

            const userMsgPayload = {
              type: 'concierge_message',
              message: {
                id: String(insertedUserMsg.insertedId),
                from: 'user',
                content: content,
                timestamp: now.toISOString(),
              }
            };

            activeClients.get(uid)?.forEach(sock => {
              if (sock.readyState === 1) {
                sock.send(JSON.stringify(userMsgPayload));
              }
            });

            setTimeout(async () => {
              const botResponses = [
                `Hi there! Thanks for reaching out. I'm currently reviewing your profile and matches to ensure you're positioned perfectly for top roles.`,
                `Hello! HireMeBharat's premium platform matches professionals with elite teams. Let's schedule an intro call soon!`,
                `Got it! I am indexing fresh positions fitting your skills and desired CTC bounds. I will share highlights directly.`
              ];
              const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
              const botNow = new Date();

              const insertedBotMsg = await messagesCol.insertOne({
                conversationId: String(convo!._id),
                senderUid: 'concierge-uid',
                content: randomResponse,
                timestamp: botNow,
              });

              await conversations.updateOne({ _id: convo!._id }, { $set: { updatedAt: botNow, lastMessage: randomResponse } });

              const botMsgPayload = {
                type: 'concierge_message',
                message: {
                  id: String(insertedBotMsg.insertedId),
                  from: 'concierge',
                  content: randomResponse,
                  timestamp: botNow.toISOString(),
                }
              };

              activeClients.get(uid)?.forEach(sock => {
                if (sock.readyState === 1) {
                  sock.send(JSON.stringify(botMsgPayload));
                }
              });
            }, 1500);
          }

          if (data.type === 'chat_message') {
            const { recipientUid, content } = data;
            if (!recipientUid || !content || !content.trim()) return;

            const chatMessages = db.collection('direct_messages');
            const now = new Date();

            const inserted = await chatMessages.insertOne({
              senderUid: uid,
              recipientUid,
              content,
              timestamp: now,
            });

            const chatMsgPayload = {
              type: 'chat_message',
              message: {
                id: String(inserted.insertedId),
                senderUid: uid,
                recipientUid,
                content,
                timestamp: now.toISOString(),
              }
            };

            activeClients.get(uid)?.forEach(sock => {
              if (sock.readyState === 1) sock.send(JSON.stringify(chatMsgPayload));
            });

            activeClients.get(recipientUid)?.forEach(sock => {
              if (sock.readyState === 1) sock.send(JSON.stringify(chatMsgPayload));
            });
          }

          if (data.type === 'chat_history') {
            const { partnerUid } = data;
            if (!partnerUid) return;

            const chatMessages = db.collection('direct_messages');
            const history = await chatMessages.find({
              $or: [
                { senderUid: uid, recipientUid: partnerUid },
                { senderUid: partnerUid, recipientUid: uid }
              ]
            }).sort({ timestamp: 1 }).limit(100).toArray();

            connection.socket.send(JSON.stringify({
              type: 'chat_history',
              partnerUid,
              messages: history.map(h => ({
                id: String(h._id),
                senderUid: h.senderUid,
                recipientUid: h.recipientUid,
                content: h.content,
                timestamp: h.timestamp.toISOString(),
              }))
            }));
          }
        } catch (err) {
          app.log.error(err, 'Failed to process incoming socket message');
        }
      });
    }
  });


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