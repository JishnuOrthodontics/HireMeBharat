import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import '@hiremebharat/backend-core';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  headline: z.string().max(200).optional(),
  about: z.string().max(8000).optional(),
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
  openToWork: z.boolean().optional(),
  openToWorkVisibility: z.enum(['RECRUITERS_ONLY', 'PRIVATE']).optional(),
  expectedCtc: z.number().min(0).optional(),
  expectedCurrency: z.string().min(3).max(8).optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  publicProfileSlug: z.string().trim().min(3).max(120).optional(),
  photoURL: z.string().max(2_500_000).optional(),
  bannerUrl: z.string().max(2_500_000).optional(),
  education: z.array(z.object({
    degree: z.string().min(1).max(160),
    institution: z.string().min(1).max(200),
    yearEnd: z.number().int().min(1950).max(2035).optional(),
  })).max(20).optional(),
  linkedinUrl: z.string().max(500).optional(),
  portfolioUrl: z.string().max(500).optional(),
});

const matchesQuerySchema = z.object({
  status: z.enum(['ALL', 'NEW', 'SAVED', 'INTERESTED', 'APPLIED', 'INTERVIEW', 'DECLINED']).optional(),
  showMismatched: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const visibilityPatchSchema = z.object({
  openToWork: z.boolean().optional(),
  openToWorkVisibility: z.enum(['RECRUITERS_ONLY', 'PRIVATE']).optional(),
  publicProfileSlug: z.string().trim().min(3).max(120).optional(),
});

const salaryExpectationsPatchSchema = z.object({
  expectedCtc: z.number().min(0),
  expectedCurrency: z.string().min(3).max(8),
  noticePeriodDays: z.number().int().min(0).max(365),
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

function parseSalaryRangeUsd(value: string): { min: number; max: number } | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').toLowerCase();
  const kMatches = Array.from(normalized.matchAll(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*k/g)).map((m) => Number(m[1]) * 1000);
  if (kMatches.length >= 2) return { min: Math.min(kMatches[0], kMatches[1]), max: Math.max(kMatches[0], kMatches[1]) };
  const rawMatches = Array.from(normalized.matchAll(/\$?\s*([0-9]+(?:\.[0-9]+)?)/g)).map((m) => Number(m[1]));
  if (rawMatches.length >= 2) return { min: Math.min(rawMatches[0], rawMatches[1]), max: Math.max(rawMatches[0], rawMatches[1]) };
  return null;
}

function buildProfileStrength(input: {
  headline?: string;
  about?: string;
  skills?: string[];
  experience?: Array<{ years?: number }>;
  education?: Array<{ degree?: string }>;
  expectedCtc?: number;
  expectedCurrency?: string;
  noticePeriodDays?: number;
  openToWork?: boolean;
  openToWorkVisibility?: string;
}) {
  let score = 0;
  const suggestions: string[] = [];
  if ((input.headline || '').trim().length >= 12) score += 15;
  else suggestions.push('Add a stronger headline to summarize your expertise.');

  const skillsCount = (input.skills || []).filter(Boolean).length;
  if (skillsCount >= 8) score += 20;
  else {
    score += Math.min(20, Math.round((skillsCount / 8) * 20));
    suggestions.push('Add at least 8 skills to improve discoverability.');
  }

  const experienceYears = (input.experience || []).reduce((sum, exp) => sum + Number(exp?.years || 0), 0);
  if ((input.experience || []).length >= 2 && experienceYears >= 4) score += 25;
  else {
    score += Math.min(25, Math.round((experienceYears / 4) * 25));
    suggestions.push('Add more detailed work experience entries.');
  }

  const summaryText = `${(input.headline || '').trim()} ${(input.about || '').trim()}`.trim();
  if (summaryText.length >= 30) score += 15;
  else suggestions.push('Expand your profile summary with role goals and domain focus.');

  if (Number(input.expectedCtc || 0) > 0 && (input.expectedCurrency || '').trim().length >= 3 && Number(input.noticePeriodDays) >= 0) {
    score += 15;
  } else suggestions.push('Set expected CTC, currency, and notice period.');

  if (input.openToWork && String(input.openToWorkVisibility || '') === 'RECRUITERS_ONLY') score += 10;
  else suggestions.push('Enable open-to-work for recruiter visibility.');

  if (!(input.education || []).filter((e) => String(e?.degree || '').trim()).length) {
    suggestions.push('Add your education (degree and institution).');
  }

  return { score: Math.max(0, Math.min(100, score)), suggestions };
}

export async function employeeRoutes(app: FastifyInstance) {
  app.get(
    '/public/:uid',
    { preHandler: [app.authenticate, app.requireRole('EMPLOYER', 'ADMIN')] },
    async (request, reply) => {
      const uid = String((request.params as any)?.uid || '').trim();
      if (!uid) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid uid' });
      const db = app.mongo?.db;
      if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

      const [userDoc, profileDoc] = await Promise.all([
        db.collection('users').findOne({ uid, role: 'EMPLOYEE' }),
        db.collection('candidate_profiles').findOne({ userId: uid }),
      ]);
      if (!userDoc) return reply.code(404).send({ error: 'Not Found', message: 'Employee not found' });

      const visibility = String(profileDoc?.openToWorkVisibility || 'RECRUITERS_ONLY');
      const openToWork = Boolean(profileDoc?.openToWork) && visibility === 'RECRUITERS_ONLY';
      return reply.send({
        profile: {
          uid,
          displayName: userDoc.displayName || 'Employee',
          photoURL: userDoc.photoURL || null,
          bannerUrl: profileDoc?.bannerUrl || null,
          headline: profileDoc?.headline || '',
          about: profileDoc?.about || '',
          location: profileDoc?.location || '',
          yearsExperience: Number(profileDoc?.yearsExperience || 0),
          skills: Array.isArray(profileDoc?.skills) ? profileDoc.skills : [],
          experience: Array.isArray(profileDoc?.experience) ? profileDoc.experience : [],
          education: Array.isArray(profileDoc?.education) ? profileDoc.education : [],
          linkedinUrl: profileDoc?.linkedinUrl || '',
          portfolioUrl: profileDoc?.portfolioUrl || '',
          openToWork,
          expectedCtc: Number(profileDoc?.expectedCtc || 0),
          expectedCurrency: profileDoc?.expectedCurrency || 'USD',
          noticePeriodDays: Number(profileDoc?.noticePeriodDays || 0),
          publicProfileUrl: `/employee/view/${uid}`,
          updatedAt: toIso(profileDoc?.updatedAt || userDoc?.updatedAt),
        },
      });
    }
  );

  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('EMPLOYEE'));

  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      db.collection('users').createIndex({ uid: 1 }, { unique: true }),
      db.collection('candidate_profiles').createIndex({ userId: 1 }, { unique: true }),
      db.collection('candidate_profiles').createIndex({ publicProfileSlug: 1 }),
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
    const aboutStored = profileDoc?.about;
    const headlineVal = profileDoc?.headline || '';
    const result = {
      uid,
      email,
      displayName: userDoc?.displayName || fallbackDisplayName,
      role: userDoc?.role || 'EMPLOYEE',
      photoURL: userDoc?.photoURL || null,
      bannerUrl: profileDoc?.bannerUrl || null,
      headline: headlineVal,
      about: aboutStored != null && aboutStored !== '' ? aboutStored : '',
      location: profileDoc?.location || '',
      openToRelocation: Boolean(profileDoc?.openToRelocation),
      yearsExperience: profileDoc?.yearsExperience || 0,
      skills: Array.isArray(profileDoc?.skills) ? profileDoc!.skills : [],
      experience: Array.isArray(profileDoc?.experience) ? profileDoc!.experience : [],
      education: Array.isArray(profileDoc?.education) ? profileDoc!.education : [],
      linkedinUrl: profileDoc?.linkedinUrl || '',
      portfolioUrl: profileDoc?.portfolioUrl || '',
      compensation: profileDoc?.compensation || { current: 0, expected: 0, currency: 'USD' },
      openToWork: Boolean(profileDoc?.openToWork),
      openToWorkVisibility: profileDoc?.openToWorkVisibility || 'RECRUITERS_ONLY',
      expectedCtc: Number(profileDoc?.expectedCtc || 0),
      expectedCurrency: profileDoc?.expectedCurrency || 'USD',
      noticePeriodDays: Number(profileDoc?.noticePeriodDays || 0),
      publicProfileSlug: profileDoc?.publicProfileSlug || uid,
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

    const { displayName, photoURL, ...profilePayload } = payload;
    const profileUpdate = Object.fromEntries(
      Object.entries(profilePayload).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;

    await db.collection('candidate_profiles').updateOne(
      { userId: uid },
      {
        $set: { ...profileUpdate, updatedAt: now },
        $setOnInsert: {
          userId: uid,
          skills: [],
          experience: [],
          compensation: { current: 0, expected: 0, currency: 'USD' },
          openToWork: false,
          openToWorkVisibility: 'RECRUITERS_ONLY',
          expectedCtc: 0,
          expectedCurrency: 'USD',
          noticePeriodDays: 0,
          publicProfileSlug: uid,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const userSet: Record<string, unknown> = { updatedAt: now };
    if (displayName !== undefined) userSet.displayName = displayName;
    if (photoURL !== undefined) userSet.photoURL = photoURL;
    if (Object.keys(userSet).length > 1) {
      await db.collection('users').updateOne({ uid }, { $set: userSet });
    }

    return reply.send({ ok: true });
  });

  app.get('/profile-strength', async (request, reply) => {
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const profileDoc = await db.collection('candidate_profiles').findOne({ userId: uid });
    const strength = buildProfileStrength({
      headline: profileDoc?.headline,
      about: profileDoc?.about,
      skills: Array.isArray(profileDoc?.skills) ? profileDoc.skills : [],
      experience: Array.isArray(profileDoc?.experience) ? profileDoc.experience : [],
      education: Array.isArray(profileDoc?.education) ? profileDoc.education : [],
      expectedCtc: Number(profileDoc?.expectedCtc || 0),
      expectedCurrency: profileDoc?.expectedCurrency,
      noticePeriodDays: Number(profileDoc?.noticePeriodDays || 0),
      openToWork: Boolean(profileDoc?.openToWork),
      openToWorkVisibility: String(profileDoc?.openToWorkVisibility || 'RECRUITERS_ONLY'),
    });
    return reply.send({ profileStrength: strength.score, suggestions: strength.suggestions });
  });

  app.patch('/profile-visibility', async (request, reply) => {
    const parsed = visibilityPatchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: 'Bad Request', message: 'At least one field is required' });
    }
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    await db.collection('candidate_profiles').updateOne(
      { userId: uid },
      {
        $set: { ...parsed.data, updatedAt: now },
        $setOnInsert: { userId: uid, createdAt: now, expectedCurrency: 'USD', publicProfileSlug: uid },
      },
      { upsert: true }
    );
    return reply.send({ ok: true });
  });

  app.patch('/salary-expectations', async (request, reply) => {
    const parsed = salaryExpectationsPatchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });
    const now = new Date();
    await db.collection('candidate_profiles').updateOne(
      { userId: uid },
      {
        $set: { ...parsed.data, updatedAt: now },
        $setOnInsert: { userId: uid, createdAt: now, openToWorkVisibility: 'RECRUITERS_ONLY', publicProfileSlug: uid },
      },
      { upsert: true }
    );
    return reply.send({ ok: true });
  });

  // GET /api/employee/matches
  app.get('/matches', async (request, reply) => {
    const parsed = matchesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    }
    const { status, showMismatched, limit, offset } = parsed.data;
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

    const [profileDoc, allDocs] = await Promise.all([
      db.collection('candidate_profiles').findOne({ userId: uid }),
      matches.find(filter).sort({ updatedAt: -1 }).toArray(),
    ]);
    const expectedCtc = Number(profileDoc?.expectedCtc || 0);
    const mismatchThreshold = expectedCtc > 0 ? expectedCtc * 0.8 : 0;

    const enriched = allDocs.map((doc) => {
      const parsedSalary = parseSalaryRangeUsd(String(doc.salaryRange || ''));
      const isMismatched = Boolean(expectedCtc > 0 && parsedSalary && parsedSalary.max < mismatchThreshold);
      return { doc, isMismatched };
    });
    const filtered = showMismatched ? enriched : enriched.filter((item) => !item.isMismatched);
    const total = filtered.length;
    const docs = filtered.slice(offset, offset + limit);

    return reply.send({
      matches: docs.map(({ doc, isMismatched }) => ({
        id: String(doc._id),
        title: doc.title,
        company: doc.company,
        score: doc.score,
        status: doc.status,
        salaryRange: doc.salaryRange || '',
        location: doc.location || '',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        isSalaryMismatched: isMismatched,
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
      showMismatched,
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

