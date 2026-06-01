import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import '@hiremebharat/backend-core';

// ─── Zod Schemas ─────────────────────────────────────────────────────

const jobListingStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'CLOSED']);
const jobApplicationStatusSchema = z.enum(['PENDING', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN']);
const offerStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']);

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(120).optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'ALL']).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  skills: z.string().trim().max(500).optional(),
  sort: z.enum(['newest', 'salary_high', 'salary_low']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  department: z.string().min(2).max(120),
  location: z.string().min(2).max(200),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).default('FULL_TIME'),
  description: z.string().min(20).max(10000),
  requirements: z.array(z.string().min(1).max(300)).max(30).default([]),
  benefits: z.array(z.string().min(1).max(200)).max(30).default([]),
  salaryMin: z.number().min(0).default(0),
  salaryMax: z.number().min(0).default(0),
  salaryCurrency: z.string().min(3).max(8).default('INR'),
  experienceMin: z.number().min(0).default(0),
  experienceMax: z.number().min(0).default(0),
  skills: z.array(z.string().min(1).max(60)).max(30).default([]),
  status: jobListingStatusSchema.default('DRAFT'),
  featured: z.boolean().default(false),
  requisitionId: z.string().optional(),
});

const patchListingSchema = createListingSchema.partial().extend({
  status: jobListingStatusSchema.optional(),
});

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().max(4000).optional(),
  resumeFileName: z.string().max(255).optional(),
});

const reviewApplicationSchema = z.object({
  status: jobApplicationStatusSchema,
  notes: z.string().max(2000).optional(),
});

const makeOfferSchema = z.object({
  applicationId: z.string().min(1),
  offerDetails: z.string().min(10).max(5000),
  salary: z.number().min(0),
  salaryCurrency: z.string().min(3).max(8).default('INR'),
  startDate: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(90).default(7),
});

const respondOfferSchema = z.object({
  accept: z.boolean(),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().min(5).max(3000),
});

const employerApplicationsQuerySchema = z.object({
  status: jobApplicationStatusSchema.or(z.literal('ALL')).optional(),
  jobId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const adminListingsQuerySchema = z.object({
  status: jobListingStatusSchema.or(z.literal('ALL')).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const basicPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});


// ─── Helpers ─────────────────────────────────────────────────────────

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function salaryLabel(min: number, max: number, currency: string): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) => currency === 'INR'
    ? `₹${Math.round(n / 100000)}L`
    : `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

// ─── Route Plugin ────────────────────────────────────────────────────

export async function jobsRoutes(app: FastifyInstance) {

  // ── Indexes ────────────────────────────────────────────────────────
  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      // Job listings
      db.collection('job_listings').createIndex({ status: 1, createdAt: -1 }),
      db.collection('job_listings').createIndex({ employerUid: 1, status: 1 }),
      db.collection('job_listings').createIndex({ skills: 1 }),
      db.collection('job_listings').createIndex(
        { title: 'text', description: 'text', company: 'text' },
        { name: 'job_listings_text' }
      ),
      // Applications
      db.collection('job_applications').createIndex({ applicantUid: 1, status: 1 }),
      db.collection('job_applications').createIndex({ jobId: 1, status: 1 }),
      db.collection('job_applications').createIndex({ employerUid: 1, status: 1 }),
      db.collection('job_applications').createIndex({ jobId: 1, applicantUid: 1 }, { unique: true }),
      // Offers
      db.collection('job_offers').createIndex({ applicantUid: 1, status: 1 }),
      db.collection('job_offers').createIndex({ employerUid: 1, status: 1 }),
      // Interviews
      db.collection('job_interviews').createIndex({ applicantUid: 1, scheduledAt: 1 }),
      db.collection('job_interviews').createIndex({ employerUid: 1, scheduledAt: 1 }),
      // Feedback
      db.collection('platform_feedback').createIndex({ userUid: 1, createdAt: -1 }),
    ]);
  });

  // ════════════════════════════════════════════════════════════════════
  //  PUBLIC ROUTES (no authentication required)
  // ════════════════════════════════════════════════════════════════════

  // GET /api/jobs/autocomplete — Suggestions for search box
  app.get('/autocomplete', async (request, reply) => {
    const q = (request.query as any)?.q;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return reply.send({ suggestions: [] });
    }

    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    // Atlas Search Autocomplete
    const pipeline = [
      {
        $search: {
          index: 'default',
          autocomplete: {
            query: q.trim(),
            path: 'title',
            fuzzy: { maxEdits: 1 }
          }
        }
      },
      {
        $limit: 15
      },
      {
        $project: {
          title: 1,
          company: 1,
          _id: 0
        }
      }
    ];

    try {
      const listings = db.collection('job_listings');
      const docs = await listings.aggregate(pipeline).toArray();
      
      const suggestionsSet = new Set<string>();
      docs.forEach(doc => {
        if (doc.title) suggestionsSet.add(doc.title);
        if (doc.company) suggestionsSet.add(doc.company);
      });

      return reply.send({
        suggestions: Array.from(suggestionsSet).slice(0, 10)
      });
    } catch (err: any) {
      // Fallback in case Atlas Search is not indexed on current collection (e.g. initial setup)
      const suggestionsSet = new Set<string>();
      try {
        const regex = new RegExp('^' + q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const docs = await db.collection('job_listings')
          .find({ status: 'ACTIVE', $or: [{ title: regex }, { company: regex }] })
          .limit(20)
          .toArray();
        docs.forEach(doc => {
          if (doc.title) suggestionsSet.add(doc.title);
          if (doc.company) suggestionsSet.add(doc.company);
        });
      } catch {}
      return reply.send({ suggestions: Array.from(suggestionsSet).slice(0, 10) });
    }
  });

  // GET /api/jobs/listings — Browse / search public job listings with Atlas Search & Facets
  app.get('/listings', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const { q, location, type, salaryMin, salaryMax, skills, sort, limit, offset } = parsed.data;

    let pipeline: any[] = [];

    // Stage 1: Native MongoDB Atlas Search Compound Operator
    if (q) {
      const searchStage: any = {
        $search: {
          index: 'default',
          compound: {
            must: [
              {
                text: {
                  query: 'ACTIVE',
                  path: 'status'
                }
              }
            ],
            should: [
              {
                text: {
                  query: q,
                  path: ['title', 'company', 'description', 'skills'],
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 1
                  }
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      };

      if (location) {
        searchStage.$search.compound.must.push({
          text: {
            query: location,
            path: 'location'
          }
        });
      }
      if (type && type !== 'ALL') {
        searchStage.$search.compound.must.push({
          text: {
            query: type,
            path: 'employmentType'
          }
        });
      }
      if (skills) {
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        skillList.forEach(s => {
          searchStage.$search.compound.must.push({
            text: {
              query: s,
              path: 'skills'
            }
          });
        });
      }

      pipeline.push(searchStage);
      
      // Project native Lucene searchScore
      pipeline.push({
        $addFields: {
          score: { $meta: 'searchScore' }
        }
      });
    } else {
      // Standard $match when no text keywords 'q' are entered
      const matchStage: any = { status: 'ACTIVE' };
      if (location) {
        matchStage.location = { $regex: location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }
      if (type && type !== 'ALL') {
        matchStage.employmentType = type;
      }
      if (skills) {
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (skillList.length) {
          matchStage.skills = { $in: skillList };
        }
      }
      pipeline.push({ $match: matchStage });
    }

    // Stage 2: Post-Search / Post-Match filters (Experience levels & Salary Range bounds)
    const rangeMatch: any = {};
    if (salaryMin) {
      rangeMatch.salaryMax = { $gte: salaryMin };
    }
    if (salaryMax) {
      rangeMatch.salaryMin = { ...(rangeMatch.salaryMin || {}), $lte: salaryMax };
    }
    if (Object.keys(rangeMatch).length > 0) {
      pipeline.push({ $match: rangeMatch });
    }

    // Determine Sort Options
    const sortStage: any = {};
    if (q && sort === 'newest') {
      sortStage.score = -1;
    } else if (sort === 'salary_high') {
      sortStage.salaryMax = -1;
    } else if (sort === 'salary_low') {
      sortStage.salaryMin = 1;
    } else {
      sortStage.createdAt = -1;
    }

    // Stage 3: Multi-Faceted Aggregation
    pipeline.push({
      $facet: {
        listings: [
          { $sort: sortStage },
          { $skip: offset },
          { $limit: limit }
        ],
        totalCount: [
          { $count: 'count' }
        ],
        locations: [
          { $group: { _id: '$location', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        skills: [
          { $unwind: '$skills' },
          { $group: { _id: '$skills', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 }
        ],
        employmentTypes: [
          { $group: { _id: '$employmentType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        salaryRanges: [
          {
            $bucket: {
              groupBy: '$salaryMax',
              boundaries: [0, 500000, 1000000, 2000000, 3000000, Infinity],
              default: 'Other',
              output: {
                count: { $sum: 1 }
              }
            }
          }
        ],
        experienceLevels: [
          {
            $bucket: {
              groupBy: '$experienceMin',
              boundaries: [0, 3, 6, Infinity],
              default: 'Other',
              output: {
                count: { $sum: 1 }
              }
            }
          }
        ]
      }
    });

    try {
      const listings = db.collection('job_listings');
      const result = await listings.aggregate(pipeline).toArray();
      const facetData = result[0] || {};

      const docs = facetData.listings || [];
      const total = facetData.totalCount?.[0]?.count || 0;

      const salaryRanges = (facetData.salaryRanges || []).map((b: any) => {
        let label = 'Other';
        if (b._id === 0) label = 'Under ₹5L';
        else if (b._id === 500000) label = '₹5L – ₹10L';
        else if (b._id === 1000000) label = '₹10L – ₹20L';
        else if (b._id === 2000000) label = '₹20L – ₹30L';
        else if (b._id === 3000000) label = '₹30L+';
        return { id: String(b._id), label, count: b.count };
      });

      const experienceLevels = (facetData.experienceLevels || []).map((b: any) => {
        let label = 'Other';
        if (b._id === 0) label = 'Entry (0-2 yrs)';
        else if (b._id === 3) label = 'Mid (3-5 yrs)';
        else if (b._id === 6) label = 'Senior (6+ yrs)';
        return { id: String(b._id), label, count: b.count };
      });

      return reply.send({
        listings: docs.map((doc: any) => ({
          id: String(doc._id),
          title: doc.title,
          company: doc.company || '',
          companyLogoUrl: doc.companyLogoUrl || '',
          department: doc.department || '',
          location: doc.location || '',
          employmentType: doc.employmentType || 'FULL_TIME',
          description: (doc.description || '').slice(0, 300),
          salaryMin: Number(doc.salaryMin || 0),
          salaryMax: Number(doc.salaryMax || 0),
          salaryCurrency: doc.salaryCurrency || 'INR',
          salaryLabel: salaryLabel(Number(doc.salaryMin || 0), Number(doc.salaryMax || 0), doc.salaryCurrency || 'INR'),
          experienceMin: Number(doc.experienceMin || 0),
          experienceMax: Number(doc.experienceMax || 0),
          skills: Array.isArray(doc.skills) ? doc.skills : [],
          featured: Boolean(doc.featured),
          applicationCount: Number(doc.applicationCount || 0),
          createdAt: toIso(doc.createdAt),
          score: doc.score !== undefined ? Number(doc.score) : undefined,
        })),
        facets: {
          locations: (facetData.locations || []).map((l: any) => ({ label: l._id, count: l.count })),
          skills: (facetData.skills || []).map((s: any) => ({ label: s._id, count: s.count })),
          employmentTypes: (facetData.employmentTypes || []).map((e: any) => ({ label: e._id, count: e.count })),
          salaryRanges,
          experienceLevels
        },
        total,
        limit,
        offset,
      });
    } catch (err: any) {
      // Robust fallback if native $search is triggered on environment with unconfigured default search index
      // Converts query gracefully to regex text search to prevent platform crashes
      const fallbackFilter: any = { status: 'ACTIVE' };
      if (q) {
        fallbackFilter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { company: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }
      if (location) {
        fallbackFilter.location = { $regex: location, $options: 'i' };
      }
      if (type && type !== 'ALL') {
        fallbackFilter.employmentType = type;
      }
      if (skills) {
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (skillList.length) fallbackFilter.skills = { $in: skillList };
      }
      if (salaryMin) {
        fallbackFilter.salaryMax = { $gte: salaryMin };
      }
      if (salaryMax) {
        fallbackFilter.salaryMin = { ...(fallbackFilter.salaryMin || {}), $lte: salaryMax };
      }

      const sortOption: Record<string, 1 | -1> = sort === 'salary_high'
        ? { salaryMax: -1 }
        : sort === 'salary_low'
          ? { salaryMin: 1 }
          : { createdAt: -1 };

      const listings = db.collection('job_listings');
      const docs = await listings.find(fallbackFilter).sort(sortOption).skip(offset).limit(limit).toArray();
      const total = await listings.countDocuments(fallbackFilter);

      return reply.send({
        listings: docs.map((doc: any) => ({
          id: String(doc._id),
          title: doc.title,
          company: doc.company || '',
          companyLogoUrl: doc.companyLogoUrl || '',
          department: doc.department || '',
          location: doc.location || '',
          employmentType: doc.employmentType || 'FULL_TIME',
          description: (doc.description || '').slice(0, 300),
          salaryMin: Number(doc.salaryMin || 0),
          salaryMax: Number(doc.salaryMax || 0),
          salaryCurrency: doc.salaryCurrency || 'INR',
          salaryLabel: salaryLabel(Number(doc.salaryMin || 0), Number(doc.salaryMax || 0), doc.salaryCurrency || 'INR'),
          experienceMin: Number(doc.experienceMin || 0),
          experienceMax: Number(doc.experienceMax || 0),
          skills: Array.isArray(doc.skills) ? doc.skills : [],
          featured: Boolean(doc.featured),
          applicationCount: Number(doc.applicationCount || 0),
          createdAt: toIso(doc.createdAt),
        })),
        facets: {
          locations: [],
          skills: [],
          employmentTypes: [],
          salaryRanges: [],
          experienceLevels: []
        },
        total,
        limit,
        offset,
      });
    }
  });

  // GET /api/jobs/listings/:id — Single job detail (public)
  app.get('/listings/:id', async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid job id' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const doc = await db.collection('job_listings').findOne({ _id: new ObjectId(id), status: 'ACTIVE' });
    if (!doc) return reply.code(404).send({ error: 'Not Found', message: 'Job listing not found' });

    // Increment view count (fire-and-forget)
    db.collection('job_listings').updateOne({ _id: new ObjectId(id) }, { $inc: { viewCount: 1 } }).catch(() => {});

    return reply.send({
      listing: {
        id: String(doc._id),
        employerUid: doc.employerUid,
        title: doc.title,
        company: doc.company || '',
        companyLogoUrl: doc.companyLogoUrl || '',
        department: doc.department || '',
        location: doc.location || '',
        employmentType: doc.employmentType || 'FULL_TIME',
        description: doc.description || '',
        requirements: Array.isArray(doc.requirements) ? doc.requirements : [],
        benefits: Array.isArray(doc.benefits) ? doc.benefits : [],
        salaryMin: Number(doc.salaryMin || 0),
        salaryMax: Number(doc.salaryMax || 0),
        salaryCurrency: doc.salaryCurrency || 'INR',
        salaryLabel: salaryLabel(Number(doc.salaryMin || 0), Number(doc.salaryMax || 0), doc.salaryCurrency || 'INR'),
        experienceMin: Number(doc.experienceMin || 0),
        experienceMax: Number(doc.experienceMax || 0),
        skills: Array.isArray(doc.skills) ? doc.skills : [],
        featured: Boolean(doc.featured),
        applicationCount: Number(doc.applicationCount || 0),
        viewCount: Number(doc.viewCount || 0),
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      },
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  JOB SEEKER ROUTES (EMPLOYEE role)
  // ════════════════════════════════════════════════════════════════════

  // POST /api/jobs/listings/:id/apply
  app.post('/listings/:id/apply', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const jobId = (request.params as any)?.id;
    if (!ObjectId.isValid(jobId)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid job id' });
    const parsed = applySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    // Check job exists and is active
    const job = await db.collection('job_listings').findOne({ _id: new ObjectId(jobId), status: 'ACTIVE' });
    if (!job) return reply.code(404).send({ error: 'Not Found', message: 'Job listing not found or no longer active' });

    // Check for duplicate application
    const existing = await db.collection('job_applications').findOne({ jobId, applicantUid: uid });
    if (existing) return reply.code(409).send({ error: 'Conflict', message: 'You have already applied to this job' });

    const now = new Date();
    const application = {
      jobId,
      applicantUid: uid,
      employerUid: job.employerUid,
      status: 'PENDING',
      coverLetter: parsed.data.coverLetter || '',
      resumeUrl: parsed.data.resumeUrl || '',
      resumeFileName: parsed.data.resumeFileName || '',
      appliedAt: now,
      updatedAt: now,
    };

    const insert = await db.collection('job_applications').insertOne(application);

    // Increment application count on listing
    await db.collection('job_listings').updateOne(
      { _id: new ObjectId(jobId) },
      { $inc: { applicationCount: 1 } }
    );

    // Notify employer
    await db.collection('notifications').insertOne({
      userUid: job.employerUid,
      type: 'JOB_APPLICATION',
      title: 'New Job Application',
      content: `A candidate has applied to "${job.title}".`,
      read: false,
      createdAt: now,
    });

    // Notify applicant
    await db.collection('notifications').insertOne({
      userUid: uid,
      type: 'JOB_APPLICATION',
      title: 'Application Submitted',
      content: `Your application for "${job.title}" at ${job.company || 'the company'} has been submitted.`,
      read: false,
      createdAt: now,
    });

    return reply.code(201).send({
      application: {
        id: String(insert.insertedId),
        jobId,
        status: 'PENDING',
        appliedAt: now.toISOString(),
      },
    });
  });

  // GET /api/jobs/applications — Employee's own applications
  app.get('/applications', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const parsed = basicPaginationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { applicantUid: uid };
    const docs = await db.collection('job_applications')
      .find(filter)
      .sort({ appliedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_applications').countDocuments(filter);

    // Fetch job details for each application
    const jobIds = [...new Set(docs.map(d => d.jobId).filter(Boolean))];
    const jobDocs = jobIds.length
      ? await db.collection('job_listings')
          .find({ _id: { $in: jobIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } })
          .toArray()
      : [];
    const jobMap = new Map(jobDocs.map(j => [String(j._id), j]));

    return reply.send({
      applications: docs.map(doc => {
        const job = jobMap.get(doc.jobId);
        return {
          id: String(doc._id),
          jobId: doc.jobId,
          jobTitle: job?.title || 'Unknown Position',
          company: job?.company || '',
          companyLogoUrl: job?.companyLogoUrl || '',
          location: job?.location || '',
          status: doc.status,
          coverLetter: doc.coverLetter || '',
          appliedAt: toIso(doc.appliedAt),
          reviewedAt: toIso(doc.reviewedAt),
          updatedAt: toIso(doc.updatedAt),
        };
      }),
      total,
      limit,
      offset,
    });
  });


  // GET /api/jobs/applications/:id — Single application detail
  app.get('/applications/:id', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid application id' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const doc = await db.collection('job_applications').findOne({ _id: new ObjectId(id), applicantUid: uid });
    if (!doc) return reply.code(404).send({ error: 'Not Found', message: 'Application not found' });

    const job = doc.jobId && ObjectId.isValid(doc.jobId)
      ? await db.collection('job_listings').findOne({ _id: new ObjectId(doc.jobId) })
      : null;

    return reply.send({
      application: {
        id: String(doc._id),
        jobId: doc.jobId,
        jobTitle: job?.title || 'Unknown Position',
        company: job?.company || '',
        location: job?.location || '',
        description: job?.description || '',
        status: doc.status,
        coverLetter: doc.coverLetter || '',
        resumeUrl: doc.resumeUrl || '',
        resumeFileName: doc.resumeFileName || '',
        appliedAt: toIso(doc.appliedAt),
        reviewedAt: toIso(doc.reviewedAt),
        updatedAt: toIso(doc.updatedAt),
      },
    });
  });

  // POST /api/jobs/applications/:id/withdraw
  app.post('/applications/:id/withdraw', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid application id' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const now = new Date();
    const result = await db.collection('job_applications').updateOne(
      { _id: new ObjectId(id), applicantUid: uid, status: { $in: ['PENDING', 'REVIEWED', 'SHORTLISTED'] } },
      { $set: { status: 'WITHDRAWN', updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Application not found or cannot be withdrawn' });

    return reply.send({ ok: true, status: 'WITHDRAWN' });
  });

  // GET /api/jobs/offers — Employee's received offers
  app.get('/offers', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const parsed = basicPaginationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { applicantUid: uid };
    const docs = await db.collection('job_offers')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_offers').countDocuments(filter);

    const jobIds = [...new Set(docs.map(d => d.jobId).filter(Boolean))];
    const jobDocs = jobIds.length
      ? await db.collection('job_listings')
          .find({ _id: { $in: jobIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } })
          .toArray()
      : [];
    const jobMap = new Map(jobDocs.map(j => [String(j._id), j]));

    return reply.send({
      offers: docs.map(doc => {
        const job = jobMap.get(doc.jobId);
        return {
          id: String(doc._id),
          applicationId: doc.applicationId,
          jobId: doc.jobId,
          jobTitle: job?.title || 'Unknown Position',
          company: job?.company || '',
          companyLogoUrl: job?.companyLogoUrl || '',
          status: doc.status,
          offerDetails: doc.offerDetails || '',
          salary: Number(doc.salary || 0),
          salaryCurrency: doc.salaryCurrency || 'INR',
          startDate: toIso(doc.startDate),
          expiresAt: toIso(doc.expiresAt),
          createdAt: toIso(doc.createdAt),
          respondedAt: toIso(doc.respondedAt),
        };
      }),
      total,
      limit,
      offset,
    });
  });


  // POST /api/jobs/offers/:id/respond — Accept or reject offer
  app.post('/offers/:id/respond', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid offer id' });
    const parsed = respondOfferSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const now = new Date();
    const newStatus = parsed.data.accept ? 'ACCEPTED' : 'REJECTED';
    const result = await db.collection('job_offers').updateOne(
      { _id: new ObjectId(id), applicantUid: uid, status: 'PENDING' },
      { $set: { status: newStatus, respondedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Offer not found or already responded' });

    // Get offer to notify employer
    const offer = await db.collection('job_offers').findOne({ _id: new ObjectId(id) });
    if (offer) {
      const job = offer.jobId && ObjectId.isValid(offer.jobId)
        ? await db.collection('job_listings').findOne({ _id: new ObjectId(offer.jobId) })
        : null;

      await db.collection('notifications').insertOne({
        userUid: offer.employerUid,
        type: 'JOB_OFFER',
        title: `Offer ${newStatus.toLowerCase()}`,
        content: `The candidate has ${newStatus.toLowerCase()} the offer for "${job?.title || 'the position'}".`,
        read: false,
        createdAt: now,
      });

      // If accepted, update application status and mark listing as filled
      if (parsed.data.accept) {
        await db.collection('job_applications').updateOne(
          { _id: new ObjectId(offer.applicationId) },
          { $set: { status: 'OFFERED', updatedAt: now } }
        );
      }
    }

    return reply.send({ ok: true, status: newStatus });
  });

  // GET /api/jobs/interviews — Employee's upcoming interviews
  app.get('/interviews', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    const parsed = basicPaginationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { applicantUid: uid, scheduledAt: { $gte: new Date() } };
    const docs = await db.collection('job_interviews')
      .find(filter)
      .sort({ scheduledAt: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_interviews').countDocuments(filter);

    const jobIds = [...new Set(docs.map(d => d.jobId).filter(Boolean))];
    const jobDocs = jobIds.length
      ? await db.collection('job_listings')
          .find({ _id: { $in: jobIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } })
          .toArray()
      : [];
    const jobMap = new Map(jobDocs.map(j => [String(j._id), j]));

    return reply.send({
      interviews: docs.map(doc => {
        const job = jobMap.get(doc.jobId);
        return {
          id: String(doc._id),
          jobId: doc.jobId,
          jobTitle: job?.title || 'Unknown Position',
          company: job?.company || '',
          type: doc.type || 'Video',
          scheduledAt: toIso(doc.scheduledAt),
          duration: doc.duration || '45 min',
          notes: doc.notes || '',
          meetingLink: doc.meetingLink || '',
        };
      }),
      total,
      limit,
      offset,
    });
  });


  // POST /api/jobs/feedback — Platform feedback (EMPLOYEE or EMPLOYER)
  app.post('/feedback', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYEE', 'EMPLOYER')],
  }, async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const role = request.user!.role;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const now = new Date();
    await db.collection('platform_feedback').insertOne({
      userUid: uid,
      userRole: role,
      rating: parsed.data.rating,
      feedback: parsed.data.feedback,
      createdAt: now,
    });

    return reply.code(201).send({ ok: true });
  });

  // ════════════════════════════════════════════════════════════════════
  //  EMPLOYER ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/jobs/employer/listings — Employer's own job listings
  app.get('/employer/listings', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const parsed = basicPaginationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { employerUid: uid };
    const docs = await db.collection('job_listings')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_listings').countDocuments(filter);

    return reply.send({
      listings: docs.map(doc => ({
        id: String(doc._id),
        title: doc.title,
        company: doc.company || '',
        companyLogoUrl: doc.companyLogoUrl || '',
        department: doc.department || '',
        location: doc.location || '',
        employmentType: doc.employmentType || 'FULL_TIME',
        description: doc.description || '',
        requirements: Array.isArray(doc.requirements) ? doc.requirements : [],
        benefits: Array.isArray(doc.benefits) ? doc.benefits : [],
        salaryMin: Number(doc.salaryMin || 0),
        salaryMax: Number(doc.salaryMax || 0),
        salaryCurrency: doc.salaryCurrency || 'INR',
        salaryLabel: salaryLabel(Number(doc.salaryMin || 0), Number(doc.salaryMax || 0), doc.salaryCurrency || 'INR'),
        experienceMin: Number(doc.experienceMin || 0),
        experienceMax: Number(doc.experienceMax || 0),
        skills: Array.isArray(doc.skills) ? doc.skills : [],
        status: doc.status || 'DRAFT',
        featured: Boolean(doc.featured),
        applicationCount: Number(doc.applicationCount || 0),
        viewCount: Number(doc.viewCount || 0),
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });


  // POST /api/jobs/listings — Create a new job listing (EMPLOYER)
  app.post('/listings', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const parsed = createListingSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    // Get employer profile for company info
    const profile = await db.collection('employer_profiles').findOne({ employerUid: uid });
    const userDoc = await db.collection('users').findOne({ uid });

    const now = new Date();
    const doc = {
      ...parsed.data,
      employerUid: uid,
      company: profile?.companyName || userDoc?.displayName || 'Company',
      companyLogoUrl: profile?.logoUrl || '',
      applicationCount: 0,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const insert = await db.collection('job_listings').insertOne(doc);

    return reply.code(201).send({
      listing: {
        id: String(insert.insertedId),
        ...parsed.data,
        company: doc.company,
        companyLogoUrl: doc.companyLogoUrl,
        applicationCount: 0,
        viewCount: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  });

  // PATCH /api/jobs/listings/:id — Update own listing (EMPLOYER)
  app.patch('/listings/:id', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid listing id' });
    const parsed = patchListingSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const now = new Date();
    const result = await db.collection('job_listings').updateOne(
      { _id: new ObjectId(id), employerUid: uid },
      { $set: { ...parsed.data, updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Listing not found' });

    return reply.send({ ok: true });
  });

  // DELETE /api/jobs/listings/:id — Delete own listing (EMPLOYER)
  app.delete('/listings/:id', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid listing id' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const listing = await db.collection('job_listings').findOne({ _id: new ObjectId(id), employerUid: uid });
    if (!listing) return reply.code(404).send({ error: 'Not Found', message: 'Listing not found' });

    await db.collection('job_listings').deleteOne({ _id: new ObjectId(id), employerUid: uid });
    return reply.send({ ok: true });
  });

  // GET /api/jobs/employer/applications — Employer's received applications
  app.get('/employer/applications', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const parsed = employerApplicationsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const { status, jobId, limit, offset } = parsed.data;
    const filter: Record<string, unknown> = { employerUid: uid };
    if (status && status !== 'ALL') filter.status = status;
    if (jobId) filter.jobId = jobId;

    const docs = await db.collection('job_applications')
      .find(filter)
      .sort({ appliedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_applications').countDocuments(filter);

    // Fetch applicant and job info
    const applicantUids = [...new Set(docs.map(d => d.applicantUid).filter(Boolean))];
    const jobIds = [...new Set(docs.map(d => d.jobId).filter(Boolean))];

    const [applicantDocs, jobDocs, profileDocs] = await Promise.all([
      applicantUids.length ? db.collection('users').find({ uid: { $in: applicantUids } }).toArray() : [],
      jobIds.length ? db.collection('job_listings').find({ _id: { $in: jobIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } }).toArray() : [],
      applicantUids.length ? db.collection('candidate_profiles').find({ userId: { $in: applicantUids } }).toArray() : [],
    ]);

    const applicantMap = new Map(applicantDocs.map(u => [u.uid, u]));
    const jobMap = new Map(jobDocs.map(j => [String(j._id), j]));
    const profileMap = new Map(profileDocs.map(p => [p.userId, p]));

    return reply.send({
      applications: docs.map(doc => {
        const applicant = applicantMap.get(doc.applicantUid);
        const job = jobMap.get(doc.jobId);
        const profile = profileMap.get(doc.applicantUid);
        return {
          id: String(doc._id),
          jobId: doc.jobId,
          jobTitle: job?.title || 'Unknown Position',
          applicantUid: doc.applicantUid,
          applicantName: applicant?.displayName || 'Unknown',
          applicantEmail: applicant?.email || '',
          applicantHeadline: profile?.headline || '',
          applicantSkills: Array.isArray(profile?.skills) ? profile.skills : [],
          applicantPhotoURL: applicant?.photoURL || '',
          status: doc.status,
          coverLetter: doc.coverLetter || '',
          resumeUrl: doc.resumeUrl || '',
          resumeFileName: doc.resumeFileName || '',
          appliedAt: toIso(doc.appliedAt),
          reviewedAt: toIso(doc.reviewedAt),
          updatedAt: toIso(doc.updatedAt),
        };
      }),
      total,
      limit,
      offset,
    });
  });

  // PATCH /api/jobs/employer/applications/:id/review — Review application (EMPLOYER)
  app.patch('/employer/applications/:id/review', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid application id' });
    const parsed = reviewApplicationSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const now = new Date();
    const result = await db.collection('job_applications').updateOne(
      { _id: new ObjectId(id), employerUid: uid },
      { $set: { status: parsed.data.status, reviewedAt: now, updatedAt: now } }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Application not found' });

    // Get application to notify applicant
    const application = await db.collection('job_applications').findOne({ _id: new ObjectId(id) });
    if (application) {
      const job = application.jobId && ObjectId.isValid(application.jobId)
        ? await db.collection('job_listings').findOne({ _id: new ObjectId(application.jobId) })
        : null;

      const statusMessages: Record<string, string> = {
        REVIEWED: 'Your application has been reviewed.',
        SHORTLISTED: 'Congratulations! You have been shortlisted.',
        INTERVIEW: 'You have been selected for an interview!',
        OFFERED: 'You have received a job offer!',
        REJECTED: 'Unfortunately, your application was not selected.',
      };

      await db.collection('notifications').insertOne({
        userUid: application.applicantUid,
        type: 'JOB_APPLICATION',
        title: `Application Update: ${job?.title || 'Job'}`,
        content: statusMessages[parsed.data.status] || `Your application status has been updated to ${parsed.data.status}.`,
        read: false,
        createdAt: now,
      });

      // If status is INTERVIEW, create an interview record
      if (parsed.data.status === 'INTERVIEW') {
        const interviewDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        await db.collection('job_interviews').insertOne({
          jobId: application.jobId,
          applicantUid: application.applicantUid,
          employerUid: uid,
          type: 'Video',
          scheduledAt: interviewDate,
          duration: '45 min',
          notes: parsed.data.notes || '',
          meetingLink: '',
          createdAt: now,
        });

        await db.collection('notifications').insertOne({
          userUid: application.applicantUid,
          type: 'JOB_INTERVIEW',
          title: 'Interview Scheduled',
          content: `An interview has been scheduled for "${job?.title || 'the position'}" on ${interviewDate.toLocaleDateString()}.`,
          read: false,
          createdAt: now,
        });
      }
    }

    return reply.send({ ok: true, status: parsed.data.status });
  });

  // POST /api/jobs/employer/offers — Make a job offer (EMPLOYER)
  app.post('/employer/offers', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const parsed = makeOfferSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid payload' });
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    // Verify application belongs to this employer
    const application = await db.collection('job_applications').findOne({
      _id: new ObjectId(parsed.data.applicationId),
      employerUid: uid,
    });
    if (!application) return reply.code(404).send({ error: 'Not Found', message: 'Application not found' });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

    const offer = {
      applicationId: parsed.data.applicationId,
      jobId: application.jobId,
      applicantUid: application.applicantUid,
      employerUid: uid,
      status: 'PENDING',
      offerDetails: parsed.data.offerDetails,
      salary: parsed.data.salary,
      salaryCurrency: parsed.data.salaryCurrency,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      expiresAt,
      createdAt: now,
      respondedAt: null,
    };

    const insert = await db.collection('job_offers').insertOne(offer);

    // Update application status
    await db.collection('job_applications').updateOne(
      { _id: new ObjectId(parsed.data.applicationId) },
      { $set: { status: 'OFFERED', updatedAt: now } }
    );

    // Notify applicant
    const job = application.jobId && ObjectId.isValid(application.jobId)
      ? await db.collection('job_listings').findOne({ _id: new ObjectId(application.jobId) })
      : null;

    await db.collection('notifications').insertOne({
      userUid: application.applicantUid,
      type: 'JOB_OFFER',
      title: '🎉 You have a job offer!',
      content: `You have received a job offer for "${job?.title || 'the position'}". Review and respond before ${expiresAt.toLocaleDateString()}.`,
      read: false,
      createdAt: now,
    });

    return reply.code(201).send({
      offer: {
        id: String(insert.insertedId),
        ...offer,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  });

  // GET /api/jobs/employer/offers — Employer's sent job offers
  app.get('/employer/offers', {
    preHandler: [app.authenticate, app.requireRole('EMPLOYER')],
  }, async (request, reply) => {
    const parsed = basicPaginationQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const { limit, offset } = parsed.data;

    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const filter = { employerUid: uid };
    const docs = await db.collection('job_offers')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    const total = await db.collection('job_offers').countDocuments(filter);

    // Fetch applicant and job info
    const applicantUids = [...new Set(docs.map(d => d.applicantUid).filter(Boolean))];
    const jobIds = [...new Set(docs.map(d => d.jobId).filter(Boolean))];

    const [applicantDocs, jobDocs] = await Promise.all([
      applicantUids.length ? db.collection('users').find({ uid: { $in: applicantUids } }).toArray() : [],
      jobIds.length ? db.collection('job_listings').find({ _id: { $in: jobIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } }).toArray() : [],
    ]);

    const applicantMap = new Map(applicantDocs.map(u => [u.uid, u]));
    const jobMap = new Map(jobDocs.map(j => [String(j._id), j]));

    return reply.send({
      offers: docs.map(doc => {
        const applicant = applicantMap.get(doc.applicantUid);
        const job = jobMap.get(doc.jobId);
        return {
          id: String(doc._id),
          applicationId: doc.applicationId,
          jobId: doc.jobId,
          jobTitle: job?.title || 'Unknown Position',
          applicantUid: doc.applicantUid,
          applicantName: applicant?.displayName || 'Unknown Candidate',
          applicantEmail: applicant?.email || '',
          status: doc.status,
          offerDetails: doc.offerDetails || '',
          salary: Number(doc.salary || 0),
          salaryCurrency: doc.salaryCurrency || 'INR',
          startDate: toIso(doc.startDate),
          expiresAt: toIso(doc.expiresAt),
          createdAt: toIso(doc.createdAt),
          respondedAt: toIso(doc.respondedAt),
        };
      }),
      total,
      limit,
      offset,
    });
  });


  // ════════════════════════════════════════════════════════════════════
  //  ADMIN ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/jobs/admin/listings — All listings for moderation
  app.get('/admin/listings', {
    preHandler: [app.authenticate, app.requireRole('ADMIN')],
  }, async (request, reply) => {
    const parsed = adminListingsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const { status, search, limit, offset } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (status && status !== 'ALL') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { company: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }

    const listings = db.collection('job_listings');
    const docs = await listings.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray();
    const total = await listings.countDocuments(filter);

    return reply.send({
      listings: docs.map(doc => ({
        id: String(doc._id),
        title: doc.title,
        company: doc.company || '',
        employerUid: doc.employerUid,
        location: doc.location || '',
        status: doc.status,
        applicationCount: Number(doc.applicationCount || 0),
        viewCount: Number(doc.viewCount || 0),
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
      })),
      total,
      limit,
      offset,
    });
  });

  // PATCH /api/jobs/admin/listings/:id — Admin moderate listing
  app.patch('/admin/listings/:id', {
    preHandler: [app.authenticate, app.requireRole('ADMIN')],
  }, async (request, reply) => {
    const id = (request.params as any)?.id;
    if (!ObjectId.isValid(id)) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid listing id' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const body = request.body as any;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body?.status && ['ACTIVE', 'PAUSED', 'CLOSED'].includes(body.status)) {
      updates.status = body.status;
    }

    const result = await db.collection('job_listings').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    if (!result.matchedCount) return reply.code(404).send({ error: 'Not Found', message: 'Listing not found' });

    return reply.send({ ok: true });
  });

  // GET /api/jobs/admin/stats — Job portal aggregate stats
  app.get('/admin/stats', {
    preHandler: [app.authenticate, app.requireRole('ADMIN')],
  }, async (_request, reply) => {
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Internal Server Error', message: 'Database unavailable' });

    const listings = db.collection('job_listings');
    const applications = db.collection('job_applications');
    const offers = db.collection('job_offers');
    const feedback = db.collection('platform_feedback');
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalListings,
      activeListings,
      totalApplications,
      applications24h,
      applications7d,
      totalOffers,
      acceptedOffers,
      pendingOffers,
      avgRatingAgg,
    ] = await Promise.all([
      listings.countDocuments({}),
      listings.countDocuments({ status: 'ACTIVE' }),
      applications.countDocuments({}),
      applications.countDocuments({ appliedAt: { $gte: since24h } }),
      applications.countDocuments({ appliedAt: { $gte: since7d } }),
      offers.countDocuments({}),
      offers.countDocuments({ status: 'ACCEPTED' }),
      offers.countDocuments({ status: 'PENDING' }),
      feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).toArray(),
    ]);

    const offerAcceptanceRate = totalOffers > 0
      ? Math.round((acceptedOffers / totalOffers) * 100)
      : 0;

    return reply.send({
      stats: {
        totalListings,
        activeListings,
        totalApplications,
        applications24h,
        applications7d,
        totalOffers,
        acceptedOffers,
        pendingOffers,
        offerAcceptanceRate,
        avgPlatformRating: Number((avgRatingAgg[0]?.avg || 0).toFixed(1)),
      },
    });
  });
}
