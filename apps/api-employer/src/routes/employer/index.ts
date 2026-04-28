import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import '@hiremebharat/backend-core';

const requisitionStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'CLOSED']);
const candidateStageSchema = z.enum(['SOURCED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']);

const requisitionsQuerySchema = z.object({
  status: requisitionStatusSchema.or(z.literal('ALL')).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const createRequisitionSchema = z.object({
  title: z.string().min(3).max(160),
  department: z.string().min(2).max(120),
  location: z.string().min(2).max(160),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).default('FULL_TIME'),
  description: z.string().min(10).max(5000),
  requirements: z.array(z.string().min(1).max(200)).max(50).default([]),
  salaryMin: z.number().min(0).default(0),
  salaryMax: z.number().min(0).default(0),
  salaryCurrency: z.string().min(3).max(8).default('USD'),
  status: requisitionStatusSchema.default('DRAFT'),
  featured: z.boolean().optional(),
});

const patchRequisitionSchema = createRequisitionSchema.partial().extend({
  status: requisitionStatusSchema.optional(),
});

const candidatesQuerySchema = z.object({
  stage: candidateStageSchema.or(z.literal('ALL')).optional(),
  requisitionId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const updateCandidateStageSchema = z.object({
  stage: candidateStageSchema,
  notes: z.string().max(1000).optional(),
});

const profilePatchSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  tagline: z.string().max(300).optional(),
  industry: z.string().max(120).optional(),
  companySize: z.number().int().min(1).max(1_000_000).optional(),
  location: z.string().max(160).optional(),
  fundingStage: z.string().max(120).optional(),
  fundingRaised: z.string().max(120).optional(),
  about: z.string().max(10000).optional(),
  benefits: z.array(z.string().min(1).max(120)).max(50).optional(),
});

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stageLabel(stage: string): string {
  return stage.charAt(0) + stage.slice(1).toLowerCase();
}

export async function employerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('EMPLOYER'));

  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      db.collection('users').createIndex({ uid: 1 }, { unique: true }),
      db.collection('employer_profiles').createIndex({ employerUid: 1 }, { unique: true }),
      db.collection('employer_requisitions').createIndex({ employerUid: 1, status: 1, updatedAt: -1 }),
      db.collection('employer_candidates').createIndex({ employerUid: 1, stage: 1, updatedAt: -1 }),
      db.collection('employer_candidates').createIndex({ employerUid: 1, requisitionId: 1, stage: 1 }),
      db.collection('employer_matches').createIndex({ employerUid: 1, score: -1 }),
      db.collection('employer_interviews').createIndex({ employerUid: 1, scheduledAt: 1 }),
      db.collection('employer_activity').createIndex({ employerUid: 1, createdAt: -1 }),
    ]);
  });

  async function seedEmployerData(employerUid: string) {
    const db = app.mongo?.db;
    if (!db) return;
    const requisitions = db.collection('employer_requisitions');
    const existing = await requisitions.countDocuments({ employerUid }, { limit: 1 });
    if (existing) return;
    const now = new Date();

    const requisitionDocs = [
      {
        employerUid,
        title: 'VP of Product Engineering',
        department: 'Engineering',
        location: 'San Francisco · Hybrid',
        employmentType: 'FULL_TIME',
        description: 'Lead product engineering across platform and AI teams.',
        requirements: ['Leadership', 'Distributed Systems', 'AI/ML'],
        salaryMin: 240000,
        salaryMax: 300000,
        salaryCurrency: 'USD',
        status: 'ACTIVE',
        featured: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        employerUid,
        title: 'Head of AI/ML',
        department: 'AI Research',
        location: 'New York · Remote',
        employmentType: 'FULL_TIME',
        description: 'Own AI roadmap and lead applied research.',
        requirements: ['Research', 'Team Building', 'MLOps'],
        salaryMin: 220000,
        salaryMax: 280000,
        salaryCurrency: 'USD',
        status: 'ACTIVE',
        featured: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        employerUid,
        title: 'Director of Engineering',
        department: 'Platform',
        location: 'Seattle · Hybrid',
        employmentType: 'FULL_TIME',
        description: 'Scale platform reliability and developer experience.',
        requirements: ['Kubernetes', 'SaaS', 'Leadership'],
        salaryMin: 200000,
        salaryMax: 260000,
        salaryCurrency: 'USD',
        status: 'PAUSED',
        featured: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const inserted = await requisitions.insertMany(requisitionDocs);
    const reqIds = Object.values(inserted.insertedIds).map((id) => String(id));

    await db.collection('employer_candidates').insertMany([
      {
        employerUid,
        requisitionId: reqIds[0],
        employeeUid: `seed-emp-${employerUid}-1`,
        name: 'E. Thompson',
        title: 'SVP Engineering · ex-Meta',
        initials: 'ET',
        score: 94,
        skills: ['Machine Learning', 'Scale-ups', 'M&A'],
        compensation: '$280k - $320k',
        roleTarget: 'VP Engineering',
        stage: 'INTERVIEW',
        createdAt: now,
        updatedAt: now,
      },
      {
        employerUid,
        requisitionId: reqIds[1],
        employeeUid: `seed-emp-${employerUid}-2`,
        name: 'M. Chen',
        title: 'Head of AI · ex-Google',
        initials: 'MC',
        score: 91,
        skills: ['AI/ML', 'Research', 'Team Building'],
        compensation: '$250k - $300k',
        roleTarget: 'Head of AI',
        stage: 'SCREENING',
        createdAt: now,
        updatedAt: now,
      },
      {
        employerUid,
        requisitionId: reqIds[0],
        employeeUid: `seed-emp-${employerUid}-3`,
        name: 'S. Williams',
        title: 'Director of Eng · Stripe',
        initials: 'SW',
        score: 87,
        skills: ['Payments', 'Distributed Systems', 'Go'],
        compensation: '$220k - $270k',
        roleTarget: 'Director of Engineering',
        stage: 'OFFER',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.collection('employer_matches').insertMany([
      { employerUid, requisitionId: reqIds[0], candidateName: 'E. Thompson', score: 94, status: 'INTERVIEW', createdAt: now, updatedAt: now },
      { employerUid, requisitionId: reqIds[1], candidateName: 'M. Chen', score: 91, status: 'SCREENING', createdAt: now, updatedAt: now },
    ]);

    await db.collection('employer_interviews').insertMany([
      { employerUid, candidateName: 'E. Thompson', role: 'VP Engineering', type: 'Video', scheduledAt: new Date(now.getTime() + 86400000) },
      { employerUid, candidateName: 'M. Chen', role: 'Head of AI', type: 'On-site', scheduledAt: new Date(now.getTime() + 2 * 86400000) },
    ]);

    await db.collection('employer_activity').insertMany([
      { employerUid, icon: 'person_add', text: 'E. Thompson was shortlisted for VP Engineering', createdAt: now },
      { employerUid, icon: 'event', text: 'Interview scheduled with M. Chen', createdAt: new Date(now.getTime() - 3600000) },
      { employerUid, icon: 'analytics', text: 'Monthly hiring report is ready for review', createdAt: new Date(now.getTime() - 2 * 3600000) },
    ]);
  }

  // GET /api/employer/requisitions
  app.get('/requisitions', async (request, reply) => {
    const parsed = requisitionsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await seedEmployerData(uid);

    const { status, limit, offset } = parsed.data;
    const filter: Record<string, unknown> = { employerUid: uid };
    if (status && status !== 'ALL') filter.status = status;

    const requisitions = db.collection('employer_requisitions');
    const candidates = db.collection('employer_candidates');
    const docs = await requisitions.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await requisitions.countDocuments(filter);
    const reqIds = docs.map((d) => String(d._id));
    const pipelineCounts = reqIds.length
      ? await candidates.aggregate([
        { $match: { employerUid: uid, requisitionId: { $in: reqIds } } },
        { $group: { _id: '$requisitionId', count: { $sum: 1 } } },
      ]).toArray()
      : [];
    const byReq = new Map(pipelineCounts.map((x) => [String(x._id), Number(x.count)]));

    return reply.send({
      requisitions: docs.map((doc) => ({
        id: String(doc._id),
        title: doc.title,
        department: doc.department || '',
        location: doc.location || '',
        employmentType: doc.employmentType || 'FULL_TIME',
        description: doc.description || '',
        requirements: Array.isArray(doc.requirements) ? doc.requirements : [],
        salaryMin: Number(doc.salaryMin || 0),
        salaryMax: Number(doc.salaryMax || 0),
        salaryCurrency: doc.salaryCurrency || 'USD',
        salaryLabel: `$${Math.round((doc.salaryMin || 0) / 1000)}k - $${Math.round((doc.salaryMax || 0) / 1000)}k`,
        status: doc.status,
        featured: Boolean(doc.featured),
        candidatesInPipeline: byReq.get(String(doc._id)) || 0,
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // POST /api/employer/requisitions
  app.post('/requisitions', async (request, reply) => {
    const parsed = createRequisitionSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    const doc = { ...parsed.data, employerUid: uid, createdAt: now, updatedAt: now };
    const insert = await db.collection('employer_requisitions').insertOne(doc);
    await db.collection('employer_activity').insertOne({
      employerUid: uid,
      icon: 'add_circle',
      text: `New requisition created: ${doc.title}`,
      createdAt: now,
    });
    return reply.code(201).send({
      requisition: {
        id: String(insert.insertedId),
        ...parsed.data,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  });

  // PATCH /api/employer/requisitions/:id
  app.patch('/requisitions/:id', async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid requisition id' });
    const parsed = patchRequisitionSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    const result = await db.collection('employer_requisitions').updateOne(
      { _id: new ObjectId(id), employerUid: uid },
      { $set: { ...parsed.data, updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Requisition not found' });
    return reply.send({ ok: true });
  });

  // GET /api/employer/candidates
  app.get('/candidates', async (request, reply) => {
    const parsed = candidatesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await seedEmployerData(uid);
    const { stage, requisitionId, limit, offset } = parsed.data;

    const filter: Record<string, unknown> = { employerUid: uid };
    if (stage && stage !== 'ALL') filter.stage = stage;
    if (requisitionId) filter.requisitionId = requisitionId;

    const docs = await db.collection('employer_candidates').find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await db.collection('employer_candidates').countDocuments(filter);
    return reply.send({
      candidates: docs.map((doc) => ({
        id: String(doc._id),
        requisitionId: doc.requisitionId,
        employeeUid: doc.employeeUid,
        name: doc.name,
        initials: doc.initials || 'NA',
        title: doc.title || '',
        score: Number(doc.score || 0),
        skills: Array.isArray(doc.skills) ? doc.skills : [],
        compensation: doc.compensation || '',
        roleTarget: doc.roleTarget || '',
        stage: doc.stage,
        stageLabel: stageLabel(String(doc.stage || 'SOURCED')),
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // PATCH /api/employer/candidates/:id/stage
  app.patch('/candidates/:id/stage', async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid candidate id' });
    const parsed = updateCandidateStageSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    const result = await db.collection('employer_candidates').updateOne(
      { _id: new ObjectId(id), employerUid: uid },
      { $set: { stage: parsed.data.stage, notes: parsed.data.notes, updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Candidate not found' });
    await db.collection('employer_activity').insertOne({
      employerUid: uid,
      icon: 'update',
      text: `Candidate moved to ${stageLabel(parsed.data.stage)}`,
      createdAt: now,
    });
    return reply.send({ ok: true, stage: parsed.data.stage });
  });

  // GET /api/employer/matches
  app.get('/matches', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await seedEmployerData(uid);
    const docs = await db.collection('employer_candidates')
      .find({ employerUid: uid })
      .sort({ score: -1, updatedAt: -1 })
      .limit(10)
      .toArray();
    return reply.send({
      matches: docs.map((doc) => ({
        candidateId: String(doc._id),
        requisitionId: doc.requisitionId,
        score: Number(doc.score || 0),
        status: doc.stage,
        name: doc.name,
        title: doc.title,
        skills: Array.isArray(doc.skills) ? doc.skills : [],
        compensation: doc.compensation || '',
        roleTarget: doc.roleTarget || '',
        updatedAt: toIso(doc.updatedAt),
      })),
    });
  });

  // GET /api/employer/dashboard-summary
  app.get('/dashboard-summary', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await seedEmployerData(uid);

    const requisitions = db.collection('employer_requisitions');
    const candidates = db.collection('employer_candidates');
    const interviews = db.collection('employer_interviews');

    const [openRoles, pipelineTotal, hired, byStageAgg, avgScoreAgg, upcomingInterviews] = await Promise.all([
      requisitions.countDocuments({ employerUid: uid, status: { $in: ['ACTIVE', 'PAUSED'] } }),
      candidates.countDocuments({ employerUid: uid }),
      candidates.countDocuments({ employerUid: uid, stage: 'HIRED' }),
      candidates.aggregate([
        { $match: { employerUid: uid } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]).toArray(),
      candidates.aggregate([
        { $match: { employerUid: uid } },
        { $group: { _id: null, avg: { $avg: '$score' } } },
      ]).toArray(),
      interviews.find({ employerUid: uid, scheduledAt: { $gte: new Date() } }).sort({ scheduledAt: 1 }).limit(5).toArray(),
    ]);

    const byStage: Record<string, number> = { SOURCED: 0, SCREENING: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0 };
    byStageAgg.forEach((row) => { byStage[String(row._id)] = Number(row.count || 0); });
    const avgScore = Math.round(Number(avgScoreAgg[0]?.avg || 0));

    return reply.send({
      summary: {
        openRoles,
        inPipeline: pipelineTotal,
        hired,
        avgMatchScore: avgScore,
        timeToShortlistDays: 4.2,
        costPerHire: '$0',
        byStage,
        upcomingInterviews: upcomingInterviews.map((i) => ({
          id: String(i._id),
          candidate: i.candidateName,
          role: i.role,
          type: i.type,
          scheduledAt: toIso(i.scheduledAt),
        })),
      },
    });
  });

  // GET /api/employer/activity
  app.get('/activity', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await seedEmployerData(uid);
    const docs = await db.collection('employer_activity').find({ employerUid: uid }).sort({ createdAt: -1 }).limit(20).toArray();
    return reply.send({
      activity: docs.map((a) => ({
        id: String(a._id),
        icon: a.icon || 'analytics',
        text: a.text || '',
        createdAt: toIso(a.createdAt),
      })),
    });
  });

  // GET /api/employer/profile
  app.get('/profile', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const users = db.collection('users');
    const profiles = db.collection('employer_profiles');
    const userDoc = await users.findOne({ uid });
    const now = new Date();
    const defaults = {
      employerUid: uid,
      companyName: userDoc?.displayName || 'Employer Company',
      tagline: 'Building high-performance teams',
      industry: 'Technology',
      companySize: 100,
      location: 'India',
      fundingStage: 'Growth',
      fundingRaised: '$0',
      about: 'Tell candidates about your company mission and culture.',
      benefits: ['Remote-friendly', 'Healthcare', 'Learning stipend'],
      createdAt: now,
      updatedAt: now,
    };
    await profiles.updateOne({ employerUid: uid }, { $setOnInsert: defaults }, { upsert: true });
    const profile = await profiles.findOne({ employerUid: uid });
    return reply.send({
      profile: {
        companyName: profile?.companyName || defaults.companyName,
        tagline: profile?.tagline || defaults.tagline,
        industry: profile?.industry || defaults.industry,
        companySize: Number(profile?.companySize || defaults.companySize),
        location: profile?.location || defaults.location,
        fundingStage: profile?.fundingStage || defaults.fundingStage,
        fundingRaised: profile?.fundingRaised || defaults.fundingRaised,
        about: profile?.about || defaults.about,
        benefits: Array.isArray(profile?.benefits) ? profile.benefits : defaults.benefits,
        updatedAt: toIso(profile?.updatedAt),
      },
    });
  });

  // PATCH /api/employer/profile
  app.patch('/profile', async (request, reply) => {
    const parsed = profilePatchSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    await db.collection('employer_profiles').updateOne(
      { employerUid: uid },
      {
        $set: { ...parsed.data, updatedAt: now },
        $setOnInsert: { employerUid: uid, createdAt: now },
      },
      { upsert: true }
    );
    return reply.send({ ok: true });
  });
}

