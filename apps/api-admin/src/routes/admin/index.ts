import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import '@hiremebharat/backend-core';

const userRoleSchema = z.enum(['ADMIN', 'EMPLOYEE', 'EMPLOYER']);
const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW']);
const escalationStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const escalationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const escalationTypeSchema = z.enum(['MATCH_DISPUTE', 'PROFILE_REVIEW', 'COMPLIANCE', 'OTHER']);

const usersQuerySchema = z.object({
  role: userRoleSchema.or(z.literal('ALL')).optional(),
  status: userStatusSchema.or(z.literal('ALL')).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const escalationsQuerySchema = z.object({
  status: escalationStatusSchema.or(z.literal('ALL')).optional(),
  priority: escalationPrioritySchema.or(z.literal('ALL')).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const patchUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided',
  });

const patchEscalationSchema = z
  .object({
    status: escalationStatusSchema.optional(),
    priority: escalationPrioritySchema.optional(),
    assignedToUid: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be provided',
  });

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function adminRoutes(app: FastifyInstance) {
  // Apply auth + RBAC to all routes in this group
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('ADMIN'));

  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      db.collection('users').createIndex({ role: 1, createdAt: -1 }),
      db.collection('users').createIndex({ status: 1, createdAt: -1 }),
      db.collection('users').createIndex({ email: 1 }),
      db.collection('admin_escalations').createIndex({ status: 1, priority: -1, createdAt: -1 }),
      db.collection('admin_escalations').createIndex({ assignedToUid: 1, status: 1 }),
      db.collection('admin_audit_logs').createIndex({ actorUid: 1, createdAt: -1 }),
      db.collection('admin_audit_logs').createIndex({ targetType: 1, targetId: 1, createdAt: -1 }),
      db.collection('system_health_checks').createIndex({ component: 1, checkedAt: -1 }),
    ]);
  });

  async function writeAuditLog(entry: {
    actorUid: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }) {
    const db = app.mongo?.db;
    if (!db) return;
    await db.collection('admin_audit_logs').insertOne({
      ...entry,
      createdAt: new Date(),
    });
  }

  async function ensureEscalationsSeeded() {
    const db = app.mongo?.db;
    if (!db) return;
    const escalations = db.collection('admin_escalations');
    const hasData = await escalations.countDocuments({}, { limit: 1 });
    if (hasData) return;
    const now = new Date();
    await escalations.insertMany([
      {
        type: 'MATCH_DISPUTE',
        priority: 'HIGH',
        status: 'OPEN',
        summary: 'Candidate salary expectations mismatch',
        entityType: 'candidate',
        entityId: 'seed-candidate-1',
        assignedToUid: '',
        notes: 'Reported by employer panel',
        createdAt: now,
        updatedAt: now,
      },
      {
        type: 'PROFILE_REVIEW',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        summary: 'Employer profile requires manual verification',
        entityType: 'employer',
        entityId: 'seed-employer-1',
        assignedToUid: '',
        notes: 'Auto-flagged by moderation checks',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 60 * 60 * 1000),
      },
    ]);
  }

  // GET /api/admin/summary
  app.get('/summary', async (_request, reply) => {
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    await ensureEscalationsSeeded();

    const users = db.collection('users');
    const requisitions = db.collection('employer_requisitions');
    const escalations = db.collection('admin_escalations');
    const candidates = db.collection('employer_candidates');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      employees,
      employers,
      admins,
      usersLast24h,
      activeRequisitions,
      openEscalations,
      inProgressEscalations,
      matchesLast24h,
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ role: 'EMPLOYEE' }),
      users.countDocuments({ role: 'EMPLOYER' }),
      users.countDocuments({ role: 'ADMIN' }),
      users.countDocuments({ createdAt: { $gte: since } }),
      requisitions.countDocuments({ status: { $in: ['ACTIVE', 'PAUSED'] } }),
      escalations.countDocuments({ status: 'OPEN' }),
      escalations.countDocuments({ status: 'IN_PROGRESS' }),
      candidates.countDocuments({ createdAt: { $gte: since } }),
    ]);

    return reply.send({
      summary: {
        window: '24h',
        totalUsers,
        usersByRole: { ADMIN: admins, EMPLOYEE: employees, EMPLOYER: employers },
        usersLast24h,
        activeRequisitions,
        escalationsOpen: openEscalations,
        escalationsInProgress: inProgressEscalations,
        matchesLast24h,
      },
    });
  });

  // GET /api/admin/escalations
  app.get('/escalations', async (request, reply) => {
    const parsed = escalationsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    await ensureEscalationsSeeded();

    const { status, priority, limit, offset } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (status && status !== 'ALL') filter.status = status;
    if (priority && priority !== 'ALL') filter.priority = priority;

    const escalations = db.collection('admin_escalations');
    const docs = await escalations.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await escalations.countDocuments(filter);

    return reply.send({
      escalations: docs.map((doc) => ({
        id: String(doc._id),
        type: doc.type || 'OTHER',
        status: doc.status || 'OPEN',
        priority: doc.priority || 'LOW',
        summary: doc.summary || '',
        entityType: doc.entityType || 'other',
        entityId: doc.entityId || '',
        assignedToUid: doc.assignedToUid || '',
        notes: doc.notes || '',
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // GET /api/admin/users
  app.get('/users', async (request, reply) => {
    const parsed = usersQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const { role, status, search, limit, offset } = parsed.data;
    const andFilters: Record<string, unknown>[] = [];
    if (role && role !== 'ALL') andFilters.push({ role });
    if (status && status !== 'ALL') andFilters.push({ status });
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      andFilters.push({
        $or: [{ email: searchRegex }, { displayName: searchRegex }, { uid: searchRegex }],
      } as unknown as Record<string, unknown>);
    }
    const filter = andFilters.length ? ({ $and: andFilters } as Record<string, unknown>) : {};

    const users = db.collection('users');
    const docs = await users.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await users.countDocuments(filter);

    return reply.send({
      users: docs.map((doc) => ({
        id: String(doc._id),
        uid: String(doc.uid || doc.firebaseUid || ''),
        email: doc.email || '',
        displayName: doc.displayName || '',
        role: doc.role || 'EMPLOYEE',
        status: doc.status || 'ACTIVE',
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // PATCH /api/admin/users/:id
  app.patch('/users/:id', async (request, reply) => {
    const id = (request.params as any)?.id;
    const parsed = patchUserSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const users = db.collection('users');
    const lookupFilter = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { $or: [{ uid: id }, { firebaseUid: id }, { email: id }] };
    const before = await users.findOne(lookupFilter as any);
    if (!before) return reply.code(404).send({ error: 'Not Found', message: 'User not found' });

    const now = new Date();
    const updatePayload = { ...parsed.data, updatedAt: now };
    const result = await users.updateOne({ _id: before._id }, { $set: updatePayload });
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'User not found' });

    await writeAuditLog({
      actorUid: request.user!.uid,
      action: 'admin.user.patch',
      targetType: 'user',
      targetId: String(before._id),
      before: { role: before.role || 'EMPLOYEE', status: before.status || 'ACTIVE' },
      after: { role: parsed.data.role || before.role || 'EMPLOYEE', status: parsed.data.status || before.status || 'ACTIVE' },
    });

    return reply.send({ ok: true });
  });

  // PATCH /api/admin/escalations/:id
  app.patch('/escalations/:id', async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid escalation id' });
    const parsed = patchEscalationSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const escalations = db.collection('admin_escalations');
    const before = await escalations.findOne({ _id: new ObjectId(id) });
    if (!before) return reply.code(404).send({ error: 'Not Found', message: 'Escalation not found' });

    const now = new Date();
    const result = await escalations.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...parsed.data, updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Escalation not found' });

    await writeAuditLog({
      actorUid: request.user!.uid,
      action: 'admin.escalation.patch',
      targetType: 'escalation',
      targetId: id,
      before: {
        status: before.status || 'OPEN',
        priority: before.priority || 'LOW',
        assignedToUid: before.assignedToUid || '',
      },
      after: {
        status: parsed.data.status || before.status || 'OPEN',
        priority: parsed.data.priority || before.priority || 'LOW',
        assignedToUid: parsed.data.assignedToUid || before.assignedToUid || '',
      },
    });

    return reply.send({ ok: true });
  });

  // GET /api/admin/system-health
  app.get('/system-health', async (_request, reply) => {
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const checks = db.collection('system_health_checks');
    const components = ['api', 'database', 'auth', 'matching'];
    const latest = await Promise.all(
      components.map((component) =>
        checks.find({ component }).sort({ checkedAt: -1 }).limit(1).toArray().then((rows) => rows[0] || null)
      )
    );
    const byComponent = new Map(latest.filter(Boolean).map((row: any) => [String(row.component), row]));
    const now = new Date().toISOString();

    return reply.send({
      services: components.map((component) => {
        const row: any = byComponent.get(component);
        return {
          component,
          status: row?.status || 'HEALTHY',
          message: row?.message || (component === 'matching' ? 'Monitoring latency' : 'Operational'),
          checkedAt: toIso(row?.checkedAt) || now,
        };
      }),
    });
  });

  // GET /api/admin/analytics
  app.get('/analytics', async (_request, reply) => {
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const users = db.collection('users');
    const requisitions = db.collection('employer_requisitions');
    const candidates = db.collection('employer_candidates');
    const [totalUsers, activeRequisitions, matchesMade, avgScoreRows] = await Promise.all([
      users.countDocuments({}),
      requisitions.countDocuments({ status: { $in: ['ACTIVE', 'PAUSED'] } }),
      candidates.countDocuments({}),
      candidates.aggregate([{ $group: { _id: null, avg: { $avg: '$score' } } }]).toArray(),
    ]);
    return reply.send({
      totalUsers,
      activeRequisitions,
      matchesMade,
      avgMatchScore: Number(avgScoreRows[0]?.avg || 0),
    });
  });
}

