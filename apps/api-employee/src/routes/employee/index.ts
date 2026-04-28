import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import '@hiremebharat/backend-core';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  headline: z.string().max(200).optional(),
  location: z.string().max(120).optional(),
  openToRelocation: z.boolean().optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  skills: z.array(z.string().min(1).max(50)).max(100).optional(),
  experience: z.array(z.object({
    title: z.string().min(1).max(120),
    company: z.string().min(1).max(120),
    years: z.number().int().min(0).max(60),
  })).max(50).optional(),
  compensation: z.object({
    current: z.number().min(0),
    expected: z.number().min(0),
    currency: z.string().min(3).max(8),
  }).optional(),
});

const matchesQuerySchema = z.object({
  status: z.enum(['ALL', 'NEW', 'SAVED', 'INTERESTED', 'APPLIED', 'INTERVIEW', 'DECLINED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const messagePostSchema = z.object({
  content: z.string().min(1).max(4000),
});

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function employeeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('EMPLOYEE'));

  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      db.collection('users').createIndex({ uid: 1 }, { unique: true }),
      db.collection('candidate_profiles').createIndex({ userId: 1 }, { unique: true }),
      db.collection('employee_matches').createIndex({ employeeUid: 1, status: 1, updatedAt: -1 }),
      db.collection('employee_conversations').createIndex({ employeeUid: 1 }, { unique: true }),
      db.collection('employee_messages').createIndex({ conversationId: 1, timestamp: 1 }),
      db.collection('notifications').createIndex({ userUid: 1, read: 1, createdAt: -1 }),
    ]);
  });

  // GET /api/employee/profile
  app.get('/profile', async (request, reply) => {
    const uid = request.user!.uid;
    const email = request.user!.email;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const users = db.collection('users');
    const profiles = db.collection('candidate_profiles');
    const userDoc = await users.findOne({ uid });
    const profileDoc = await profiles.findOne({ userId: uid });

    const fallbackDisplayName = request.user!.displayName || email?.split('@')[0] || 'User';
    const result = {
      uid,
      email,
      displayName: userDoc?.displayName || fallbackDisplayName,
      role: userDoc?.role || 'EMPLOYEE',
      photoURL: userDoc?.photoURL || null,
      headline: profileDoc?.headline || '',
      location: profileDoc?.location || '',
      openToRelocation: Boolean(profileDoc?.openToRelocation),
      yearsExperience: profileDoc?.yearsExperience || 0,
      skills: Array.isArray(profileDoc?.skills) ? profileDoc!.skills : [],
      experience: Array.isArray(profileDoc?.experience) ? profileDoc!.experience : [],
      compensation: profileDoc?.compensation || { current: 0, expected: 0, currency: 'USD' },
      updatedAt: toIso(profileDoc?.updatedAt || userDoc?.updatedAt),
    };

    return reply.send({ profile: result });
  });

  // PATCH /api/employee/profile
  app.patch('/profile', async (request, reply) => {
    const parsed = profileUpdateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const payload = parsed.data;
    const now = new Date();

    await db.collection('candidate_profiles').updateOne(
      { userId: uid },
      {
        $set: { ...payload, updatedAt: now },
        $setOnInsert: {
          userId: uid,
          skills: [],
          experience: [],
          compensation: { current: 0, expected: 0, currency: 'USD' },
          createdAt: now,
        },
      },
      { upsert: true }
    );

    if (payload.displayName) {
      await db.collection('users').updateOne(
        { uid },
        { $set: { displayName: payload.displayName, updatedAt: now } }
      );
    }

    return reply.send({ ok: true });
  });

  // GET /api/employee/matches
  app.get('/matches', async (request, reply) => {
    const parsed = matchesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    }
    const { status, limit, offset } = parsed.data;
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const matches = db.collection('employee_matches');
    const filter: Record<string, unknown> = { employeeUid: uid };
    const existingAny = await matches.countDocuments({ employeeUid: uid }, { limit: 1 });
    if (!existingAny) {
      const now = new Date();
      await matches.insertMany([
        {
          employeeUid: uid,
          requisitionId: `seed-${uid}-1`,
          title: 'VP of Product Engineering',
          company: 'Stealth AI Startup',
          location: 'San Francisco · Hybrid',
          salaryRange: '$240k - $300k + Equity',
          tags: ['AI/ML', 'Scale-ups', 'Platform'],
          score: 94,
          status: 'NEW',
          createdAt: now,
          updatedAt: now,
        },
        {
          employeeUid: uid,
          requisitionId: `seed-${uid}-2`,
          title: 'Head of AI Infrastructure',
          company: 'NextGen Robotics',
          location: 'New York · Remote',
          salaryRange: '$220k - $280k',
          tags: ['ML Ops', 'Distributed Systems', 'Leadership'],
          score: 91,
          status: 'NEW',
          createdAt: now,
          updatedAt: now,
        },
        {
          employeeUid: uid,
          requisitionId: `seed-${uid}-3`,
          title: 'Director of Engineering',
          company: 'Enterprise SaaS',
          location: 'Seattle · Hybrid',
          salaryRange: '$210k - $260k',
          tags: ['SaaS', 'Kubernetes'],
          score: 85,
          status: 'SAVED',
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    if (status && status !== 'ALL') filter.status = status;

    const docs = await matches.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await matches.countDocuments(filter);

    return reply.send({
      matches: docs.map((doc) => ({
        id: String(doc._id),
        title: doc.title,
        company: doc.company,
        score: doc.score,
        status: doc.status,
        salaryRange: doc.salaryRange || '',
        location: doc.location || '',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  async function updateMatchStatus(request: any, reply: any, status: 'INTERESTED' | 'SAVED' | 'DECLINED') {
    const uid = request.user!.uid;
    const id = request.params?.id;
    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid match id' });
    }
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    const result = await db.collection('employee_matches').updateOne(
      { _id: new ObjectId(id), employeeUid: uid },
      { $set: { status, updatedAt: now, updatedByUid: uid } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Match not found' });
    await db.collection('notifications').insertOne({
      userUid: uid,
      type: 'MATCH',
      title: 'Match updated',
      content: `You marked a match as ${status.toLowerCase()}.`,
      read: false,
      createdAt: now,
    });
    return reply.send({ ok: true, status });
  }

  app.post('/matches/:id/interest', async (request, reply) => updateMatchStatus(request, reply, 'INTERESTED'));
  app.post('/matches/:id/save', async (request, reply) => updateMatchStatus(request, reply, 'SAVED'));
  app.post('/matches/:id/decline', async (request, reply) => updateMatchStatus(request, reply, 'DECLINED'));

  // GET /api/employee/concierge/messages
  app.get('/concierge/messages', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
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
    const messages = await messagesCol.find({ conversationId: String(convo!._id) }).sort({ timestamp: 1 }).limit(200).toArray();
    return reply.send({
      concierge: {
        name: convo!.conciergeName,
        title: convo!.conciergeTitle,
        initials: convo!.conciergeInitials || 'SJ',
        online: Boolean(convo!.conciergeOnline),
      },
      messages: messages.map((m) => ({
        id: String(m._id),
        from: m.senderUid === uid ? 'user' : 'concierge',
        content: m.content,
        timestamp: toIso(m.timestamp),
      })),
    });
  });

  // POST /api/employee/concierge/messages
  app.post('/concierge/messages', async (request, reply) => {
    const parsed = messagePostSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
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

    const inserted = await messagesCol.insertOne({
      conversationId: String(convo!._id),
      senderUid: uid,
      content: parsed.data.content,
      timestamp: now,
    });
    await conversations.updateOne({ _id: convo!._id }, { $set: { updatedAt: now, lastMessage: parsed.data.content } });
    return reply.code(201).send({
      message: {
        id: String(inserted.insertedId),
        from: 'user',
        content: parsed.data.content,
        timestamp: now.toISOString(),
      },
    });
  });

  // GET /api/employee/notifications
  app.get('/notifications', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const docs = await db.collection('notifications')
      .find({ userUid: uid })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return reply.send({
      notifications: docs.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        content: n.content,
        read: Boolean(n.read),
        createdAt: toIso(n.createdAt),
      })),
    });
  });

  // POST /api/employee/notifications/:id/read
  app.post('/notifications/:id/read', async (request, reply) => {
    const uid = request.user!.uid;
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid notification id' });
    }
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const result = await db.collection('notifications').updateOne(
      { _id: new ObjectId(id), userUid: uid },
      { $set: { read: true } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Notification not found' });
    return reply.send({ ok: true });
  });

  // GET /api/employee/dashboard-summary
  app.get('/dashboard-summary', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const [activeMatches, interviews, unreadNotifications] = await Promise.all([
      db.collection('employee_matches').countDocuments({ employeeUid: uid, status: { $in: ['NEW', 'SAVED', 'INTERESTED', 'APPLIED'] } }),
      db.collection('employee_matches').countDocuments({ employeeUid: uid, status: 'INTERVIEW' }),
      db.collection('notifications').countDocuments({ userUid: uid, read: false }),
    ]);
    return reply.send({
      summary: {
        activeMatches,
        interviews,
        unreadNotifications,
      },
    });
  });
}

