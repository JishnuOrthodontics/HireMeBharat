import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { calculateMatchScore } from '@hiremebharat/backend-core';

const candidateStageSchema = z.enum(['SOURCED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']);

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

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});



const profilePatchSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  tagline: z.string().max(300).optional(),
  logoUrl: z.union([z.string().url().max(1000), z.literal('')]).optional(),
  bannerUrl: z.union([z.string().url().max(1000), z.literal('')]).optional(),
  websiteUrl: z.union([z.string().url().max(1000), z.literal('')]).optional(),
  linkedinUrl: z.union([z.string().url().max(1000), z.literal('')]).optional(),
  industry: z.string().max(120).optional(),
  companySize: z.number().int().min(1).max(1_000_000).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  location: z.string().max(160).optional(),
  fundingStage: z.string().max(120).optional(),
  fundingRaised: z.string().max(120).optional(),
  showProfileToEmployees: z.boolean().optional(),
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
      db.collection('employer_candidates').createIndex({ employerUid: 1, stage: 1, updatedAt: -1 }),
      db.collection('employer_candidates').createIndex({ employerUid: 1, requisitionId: 1, stage: 1 }),
      db.collection('employer_matches').createIndex({ employerUid: 1, score: -1 }),
      db.collection('employer_interviews').createIndex({ employerUid: 1, scheduledAt: 1 }),
      db.collection('employer_activity').createIndex({ employerUid: 1, createdAt: -1 }),
      db.collection('notifications').createIndex({ userUid: 1, read: 1, createdAt: -1 }),
    ]);
  });

  async function recalculateEmployerCandidates(db: any, employerUid: string) {
    // 1. Fetch all active job listings owned by this employer
    const activeJobs = await db.collection('job_listings').find({ employerUid, status: 'ACTIVE' }).toArray();
    if (activeJobs.length === 0) return;

    // 2. Fetch all candidate profiles
    const candidates = await db.collection('candidate_profiles').find({}).toArray();
    if (candidates.length === 0) return;

    // 3. Fetch all user accounts to resolve actual display names
    const candidateUserIds = candidates.map((c: any) => c.userId);
    const users = await db.collection('users').find({ uid: { $in: candidateUserIds } }).toArray();
    const userMap = new Map<string, any>(users.map((u: any) => [String(u.uid), u] as [string, any]));

    // 4. Fetch existing candidates to preserve active pipeline stages (SOURCED/INTERVIEW/etc.)
    const existingCandidates = await db.collection('employer_candidates').find({ employerUid }).toArray();
    const existingMap = new Map<string, any>(
      existingCandidates.map((ec: any) => [`${String(ec.requisitionId)}-${ec.employeeUid}`, ec] as [string, any])
    );


    const now = new Date();
    const activeRequisitionIds = new Set<string>();

    for (const job of activeJobs) {
      const jobIdStr = String(job._id);
      activeRequisitionIds.add(jobIdStr);

      for (const cand of candidates) {
        // Calculate match score using shared mathematical engine
        const { score, breakdown } = calculateMatchScore(cand as any, job as any);

        // Keep candidates with a match score of 50% or higher
        if (score >= 50) {
          const key = `${jobIdStr}-${cand.userId}`;
          const existing = existingMap.get(key);
          const currentStage = existing?.stage || 'SOURCED';

          const userDoc = userMap.get(cand.userId);
          const fullName = userDoc?.displayName || cand.displayName || 'Candidate';
          const initials = fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((n: string) => n.charAt(0))
            .join('')
            .toUpperCase() || 'NA';

          const candidateDoc = {
            employerUid,
            requisitionId: jobIdStr,
            jobId: jobIdStr,
            employeeUid: cand.userId,
            name: fullName,
            initials,
            title: cand.headline || 'Software Engineer',
            score,
            skills: Array.isArray(cand.skills) ? cand.skills.slice(0, 5) : [],
            compensation: cand.expectedCtc ? 
              (cand.expectedCurrency === 'INR' 
                ? `₹${Math.round(cand.expectedCtc / 100000)}L`
                : `$${Math.round(cand.expectedCtc / 1000)}k`)
              : 'Compensation TBD',
            roleTarget: cand.headline || 'Product Specialist',
            stage: currentStage,
            updatedAt: now,
            breakdown,
          };

          await db.collection('employer_candidates').updateOne(
            { employerUid, requisitionId: jobIdStr, employeeUid: cand.userId },
            {
              $set: candidateDoc,
              $setOnInsert: { createdAt: now }
            },
            { upsert: true }
          );
        }
      }
    }

    // 5. Clean up candidate associations for listings that are no longer active
    await db.collection('employer_candidates').deleteMany({
      employerUid,
      requisitionId: { $nin: Array.from(activeRequisitionIds) }
    });
  }

  // GET /api/employer/candidates
  app.get('/candidates', async (request, reply) => {
    const parsed = candidatesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const { stage, requisitionId, limit, offset } = parsed.data;

    try {
      await recalculateEmployerCandidates(db, uid);
    } catch (err) {
      app.log.error(err, 'Failed to recalculate matching candidates');
    }

    const filter: Record<string, unknown> = { employerUid: uid };
    if (stage && stage !== 'ALL') filter.stage = stage;
    if (requisitionId) filter.requisitionId = requisitionId;

    const docs = await db.collection('employer_candidates').find(filter).sort({ score: -1, updatedAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await db.collection('employer_candidates').countDocuments(filter);

    const employeeUids = docs.map(d => d.employeeUid).filter(Boolean);
    const premiumSubs = await db.collection('billing_subscriptions').find({
      userUid: { $in: employeeUids },
      plan: 'PREMIUM',
      expiresAt: { $gt: new Date() }
    }).toArray();
    const premiumUids = new Set(premiumSubs.map((s: any) => s.userUid));

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
        isPremium: premiumUids.has(doc.employeeUid),
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

    try {
      await recalculateEmployerCandidates(db, uid);
    } catch (err) {
      app.log.error(err, 'Failed to recalculate matching candidates in matches');
    }

    const docs = await db.collection('employer_candidates')
      .find({ employerUid: uid })
      .sort({ score: -1, updatedAt: -1 })
      .limit(10)
      .toArray();

    const employeeUids = docs.map(d => d.employeeUid).filter(Boolean);
    const premiumSubs = await db.collection('billing_subscriptions').find({
      userUid: { $in: employeeUids },
      plan: 'PREMIUM',
      expiresAt: { $gt: new Date() }
    }).toArray();
    const premiumUids = new Set(premiumSubs.map((s: any) => s.userUid));

    return reply.send({
      matches: docs.map((doc) => ({
        candidateId: String(doc._id),
        employeeUid: doc.employeeUid,
        requisitionId: doc.requisitionId,
        score: Number(doc.score || 0),
        status: doc.stage,
        name: doc.name,
        title: doc.title,
        skills: Array.isArray(doc.skills) ? doc.skills : [],
        compensation: doc.compensation || '',
        roleTarget: doc.roleTarget || '',
        updatedAt: toIso(doc.updatedAt),
        isPremium: premiumUids.has(doc.employeeUid),
      })),
    });
  });


  // GET /api/employer/dashboard-summary
  // Uses job_listings (single source of truth) for open roles count
  app.get('/dashboard-summary', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const jobListings = db.collection('job_listings');
    const candidates = db.collection('employer_candidates');
    const interviews = db.collection('employer_interviews');

    const [openRoles, pipelineTotal, hired, byStageAgg, avgScoreAgg, upcomingInterviews] = await Promise.all([
      jobListings.countDocuments({ employerUid: uid, status: { $in: ['ACTIVE', 'PAUSED'] } }),
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
    const parsed = activityQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { employerUid: uid };
    const docs = await db.collection('employer_activity')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('employer_activity').countDocuments(filter);

    return reply.send({
      activity: docs.map((a) => ({
        id: String(a._id),
        icon: a.icon || 'analytics',
        text: a.text || '',
        createdAt: toIso(a.createdAt),
      })),
      total,
      limit,
      offset,
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
      logoUrl: '',
      bannerUrl: '',
      websiteUrl: '',
      linkedinUrl: '',
      industry: 'Technology',
      companySize: 100,
      foundedYear: new Date().getUTCFullYear(),
      location: 'India',
      fundingStage: 'Growth',
      fundingRaised: '$0',
      showProfileToEmployees: true,
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
        logoUrl: profile?.logoUrl || defaults.logoUrl,
        bannerUrl: profile?.bannerUrl || defaults.bannerUrl,
        websiteUrl: profile?.websiteUrl || defaults.websiteUrl,
        linkedinUrl: profile?.linkedinUrl || defaults.linkedinUrl,
        industry: profile?.industry || defaults.industry,
        companySize: Number(profile?.companySize || defaults.companySize),
        foundedYear: Number(profile?.foundedYear || defaults.foundedYear),
        location: profile?.location || defaults.location,
        fundingStage: profile?.fundingStage || defaults.fundingStage,
        fundingRaised: profile?.fundingRaised || defaults.fundingRaised,
        showProfileToEmployees: Boolean(
          profile?.showProfileToEmployees === undefined
            ? defaults.showProfileToEmployees
            : profile?.showProfileToEmployees
        ),
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

  // GET /api/employer/notifications
  app.get('/notifications', async (request, reply) => {
    const parsed = notificationsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { userUid: uid };
    const docs = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('notifications').countDocuments(filter);

    return reply.send({
      notifications: docs.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        content: n.content,
        read: Boolean(n.read),
        createdAt: toIso(n.createdAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // POST /api/employer/notifications/:id/read
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

  // POST /api/employer/notifications/read-all
  app.post('/notifications/read-all', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    await db.collection('notifications').updateMany(
      { userUid: uid, read: false },
      { $set: { read: true } }
    );
    return reply.send({ ok: true });
  });
}


