import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import Stripe from 'stripe';

const checkoutSchema = z.object({
  type: z.enum(['SUBSCRIPTION', 'CREDITS', 'FEATURED_JOB', 'JOB_PACK']),
  plan: z.enum(['PRO', 'PREMIUM']).optional(),
  cycle: z.enum(['monthly', 'yearly']).optional(),
  creditsAmount: z.number().int().min(1).max(100).optional(),
  employerPlanId: z.enum(['1M', '3M', '6M']).optional(),
  jobId: z.string().optional(),
});

const EMPLOYER_JOB_PACKS: Record<'1M' | '3M' | '6M', {
  jobCredits: number;
  creditValidityDays: number;
  jobActiveDays: number;
  priceInr: number;
  label: string;
}> = {
  '1M': { jobCredits: 3, creditValidityDays: 30, jobActiveDays: 15, priceInr: 1949, label: '1 Month' },
  '3M': { jobCredits: 6, creditValidityDays: 90, jobActiveDays: 15, priceInr: 3649, label: '3 Months' },
  '6M': { jobCredits: 13, creditValidityDays: 180, jobActiveDays: 15, priceInr: 7099, label: '6 Months' },
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function billingRoutes(app: FastifyInstance) {
  // Setup stripe if key exists
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const stripe = stripeKey ? new Stripe(stripeKey) : null;
  const isSandbox = !stripe;

  app.addHook('onReady', async () => {
    const db = app.mongo?.db;
    if (!db) return;
    await Promise.all([
      db.collection('billing_subscriptions').createIndex({ userUid: 1 }, { unique: true }),
      db.collection('billing_transactions').createIndex({ userUid: 1, createdAt: -1 }),
      db.collection('employer_credits').createIndex({ employerUid: 1 }, { unique: true }),
      db.collection('employer_job_packs').createIndex({ employerUid: 1 }, { unique: true }),
    ]);
  });

  // Health route helper
  app.get('/health', async () => ({
    status: 'ok',
    mode: isSandbox ? 'sandbox' : 'stripe-active',
  }));

  // Helper to retrieve billing status & credits
  app.get('/status', async (request, reply) => {
    // Requires auth
    await app.authenticate(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const [sub, creditsDoc, jobPackDoc, userDoc] = await Promise.all([
      db.collection('billing_subscriptions').findOne({ userUid: uid }),
      db.collection('employer_credits').findOne({ employerUid: uid }),
      db.collection('employer_job_packs').findOne({ employerUid: uid }),
      db.collection('users').findOne({ uid }),
    ]);

    const activePlan = sub && new Date(sub.expiresAt) > new Date() ? sub.plan : 'FREE';
    const packExpiresAt = jobPackDoc?.packExpiresAt ? new Date(jobPackDoc.packExpiresAt) : null;
    const jobCredits =
      packExpiresAt && packExpiresAt > new Date() ? Number(jobPackDoc?.creditsRemaining || 0) : 0;

    return reply.send({
      plan: activePlan,
      expiresAt: sub ? toIso(sub.expiresAt) : null,
      cycle: sub?.cycle || null,
      credits: creditsDoc?.credits || 0,
      jobCredits,
      jobCreditsExpiresAt: packExpiresAt && packExpiresAt > new Date() ? toIso(packExpiresAt) : null,
      activeJobPackId: jobPackDoc?.lastPackId || null,
      userRole: userDoc?.role || 'EMPLOYEE',
    });
  });

  // GET /history — transaction records
  app.get('/history', async (request, reply) => {
    await app.authenticate(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const docs = await db.collection('billing_transactions')
      .find({ userUid: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return reply.send({
      transactions: docs.map(t => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        currency: t.currency || 'USD',
        description: t.description,
        status: t.status || 'SUCCESS',
        createdAt: toIso(t.createdAt),
      })),
    });
  });

  // POST /checkout — creates session link
  app.post('/checkout', async (request, reply) => {
    await app.authenticate(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const parsed = checkoutSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid payload' });
    const { type, plan, cycle, creditsAmount, jobId, employerPlanId } = parsed.data;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // If sandbox, instruct client to use simulated checkout
    if (isSandbox) {
      return reply.send({
        mode: 'sandbox',
        checkoutUrl: `${frontendUrl}/${request.user!.role.toLowerCase()}/billing?sandbox=true&type=${type}&plan=${plan || ''}&cycle=${cycle || ''}&credits=${creditsAmount || ''}&jobId=${jobId || ''}&pack=${employerPlanId || ''}`,
      });
    }

    // Stripe Flow
    try {
      let session;
      const successUrl = `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/billing/cancel`;

      if (type === 'SUBSCRIPTION') {
        let priceId = '';
        if (plan === 'PRO') {
          priceId = cycle === 'yearly' ? 'price_pro_yearly_id' : 'price_pro_monthly_id';
        } else if (plan === 'PREMIUM') {
          priceId = cycle === 'yearly' ? 'price_prem_yearly_id' : 'price_prem_monthly_id';
        }

        session = await stripe!.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userUid: uid, plan: plan!, cycle: cycle!, type },
        });
      } else if (type === 'CREDITS') {
        const credits = creditsAmount || 10;
        session = await stripe!.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'inr',
              product_data: { name: 'Recruiter Candidate Unlock Credits', description: `Pack of ${credits} candidate unlock credits` },
              unit_amount: 50000,
            },
            quantity: credits,
          }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userUid: uid, creditsAmount: String(credits), type },
        });
      } else if (type === 'JOB_PACK') {
        if (!employerPlanId || !EMPLOYER_JOB_PACKS[employerPlanId]) {
          return reply.code(400).send({ error: 'Bad Request', message: 'Valid employerPlanId is required for JOB_PACK' });
        }
        const pack = EMPLOYER_JOB_PACKS[employerPlanId];
        session = await stripe!.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'inr',
              product_data: {
                name: `Employer Job Pack — ${pack.label}`,
                description: `${pack.jobCredits} job credits · ${pack.creditValidityDays} days validity · ${pack.jobActiveDays} days active per job`,
              },
              unit_amount: pack.priceInr * 100,
            },
            quantity: 1,
          }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userUid: uid, employerPlanId, type },
        });
      } else {
        // FEATURED_JOB
        session = await stripe!.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: { name: 'Featured Job Posting Pin', description: 'Promotes your job posting to top search positions for 7 days' },
              unit_amount: 2900, // $29
            },
            quantity: 1,
          }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userUid: uid, jobId: jobId!, type },
        });
      }

      return reply.send({ mode: 'stripe', checkoutUrl: session.url });
    } catch (err: any) {
      app.log.error(err, 'Stripe checkout creation failed');
      return reply.code(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /sandbox/checkout — simulated successful checkout
  app.post('/sandbox/checkout', async (request, reply) => {
    await app.authenticate(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const parsed = checkoutSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Bad Request', message: 'Invalid payload' });
    const { type, plan, cycle, creditsAmount, jobId, employerPlanId } = parsed.data;

    const now = new Date();

    async function applyEmployerJobPack(packId: '1M' | '3M' | '6M') {
      const pack = EMPLOYER_JOB_PACKS[packId];
      const packExpiresAt = new Date(now.getTime() + pack.creditValidityDays * 24 * 60 * 60 * 1000);
      const existing = await db.collection('employer_job_packs').findOne({ employerUid: uid });
      const existingExpiry = existing?.packExpiresAt ? new Date(existing.packExpiresAt) : null;
      const existingCredits =
        existingExpiry && existingExpiry > now ? Number(existing?.creditsRemaining || 0) : 0;
      const mergedExpiry =
        existingExpiry && existingExpiry > now && existingExpiry > packExpiresAt ? existingExpiry : packExpiresAt;

      await db.collection('employer_job_packs').updateOne(
        { employerUid: uid },
        {
          $set: {
            creditsRemaining: existingCredits + pack.jobCredits,
            jobActiveDays: pack.jobActiveDays,
            packExpiresAt: mergedExpiry,
            lastPackId: packId,
            updatedAt: now,
          },
          $setOnInsert: { employerUid: uid, createdAt: now },
        },
        { upsert: true }
      );

      await db.collection('billing_transactions').insertOne({
        userUid: uid,
        type: 'JOB_PACK',
        amount: pack.priceInr,
        currency: 'INR',
        description: `Simulated Purchase: ${pack.label} (${pack.jobCredits} job credits)`,
        status: 'SUCCESS',
        createdAt: now,
      });

      await db.collection('notifications').insertOne({
        userUid: uid,
        type: 'BILLING',
        title: 'Job credits added',
        content: `${pack.jobCredits} job credits were added to your account. Use them within ${pack.creditValidityDays} days.`,
        read: false,
        createdAt: now,
      });
    }

    if (type === 'SUBSCRIPTION') {
      const expiresAt = new Date();
      if (cycle === 'yearly') {
        expiresAt.setFullYear(now.getFullYear() + 1);
      } else {
        expiresAt.setMonth(now.getMonth() + 1);
      }

      // Upsert billing subscription
      await db.collection('billing_subscriptions').updateOne(
        { userUid: uid },
        {
          $set: {
            plan: plan!,
            cycle: cycle || 'monthly',
            expiresAt,
            updatedAt: now,
          },
          $setOnInsert: { userUid: uid, createdAt: now }
        },
        { upsert: true }
      );

      // Create transaction log
      const price = plan === 'PRO' ? (cycle === 'yearly' ? 950 : 99) : (cycle === 'yearly' ? 180 : 19);
      await db.collection('billing_transactions').insertOne({
        userUid: uid,
        type: 'SUBSCRIPTION',
        amount: price,
        currency: 'USD',
        description: `Simulated Checkout: ${plan} Plan (${cycle})`,
        status: 'SUCCESS',
        createdAt: now,
      });

      // Insert brand notification
      await db.collection('notifications').insertOne({
        userUid: uid,
        type: 'BILLING',
        title: 'Premium Subscription Activated',
        content: `Your HireMeBharat ${plan} plan has been successfully activated. Enjoy full premium benefits until ${expiresAt.toLocaleDateString()}!`,
        read: false,
        createdAt: now,
      });
    } else if (type === 'CREDITS') {
      const creditsToAdd = creditsAmount || 10;
      await db.collection('employer_credits').updateOne(
        { employerUid: uid },
        {
          $inc: { credits: creditsToAdd },
          $setOnInsert: { employerUid: uid, createdAt: now }
        },
        { upsert: true }
      );

      await db.collection('billing_transactions').insertOne({
        userUid: uid,
        type: 'CREDITS',
        amount: creditsToAdd * 5,
        currency: 'USD',
        description: `Simulated Purchase: ${creditsToAdd} Unlock Credits`,
        status: 'SUCCESS',
        createdAt: now,
      });

      await db.collection('notifications').insertOne({
        userUid: uid,
        type: 'BILLING',
        title: 'Credits Added',
        content: `Successfully added ${creditsToAdd} candidate unlock credits to your account balance!`,
        read: false,
        createdAt: now,
      });
    } else if (type === 'JOB_PACK') {
      if (!employerPlanId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'employerPlanId is required for JOB_PACK' });
      }
      await applyEmployerJobPack(employerPlanId);
    } else if (type === 'FEATURED_JOB') {
      if (!jobId || !ObjectId.isValid(jobId)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Valid jobId is required for boosting' });
      }

      const jobCol = db.collection('job_listings');
      const job = await jobCol.findOne({ _id: new ObjectId(jobId) });
      if (!job) return reply.code(404).send({ error: 'Not Found', message: 'Job listing not found' });

      // Mark job as featured
      await jobCol.updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { featured: true, featuredExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }
      );

      await db.collection('billing_transactions').insertOne({
        userUid: uid,
        type: 'FEATURED_JOB',
        amount: 29,
        currency: 'USD',
        description: `Simulated Boost: Job "${job.title}" featured pin`,
        status: 'SUCCESS',
        createdAt: now,
      });

      await db.collection('notifications').insertOne({
        userUid: uid,
        type: 'BILLING',
        title: 'Job Posting Featured!',
        content: `Your job posting "${job.title}" has been successfully pinned to the top of candidate feeds for 7 days!`,
        read: false,
        createdAt: now,
      });
    }

    return reply.send({ ok: true, message: 'Simulated checkout completed successfully!' });
  });

  // POST /webhook — stripe webhook
  app.post('/webhook', async (request, reply) => {
    if (isSandbox) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Webhooks are only supported in Stripe mode' });
    }

    const sig = request.headers['stripe-signature'];
    if (!sig) return reply.code(400).send({ error: 'Bad Request', message: 'Signature missing' });

    let event;
    const body = request.body as Buffer;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      event = stripe!.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      app.log.error(err, 'Stripe webhook verification failed');
      return reply.code(400).send({ error: 'Bad Request', message: `Webhook error: ${err.message}` });
    }

    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const now = new Date();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const metadata = session.metadata;
      const uid = metadata?.userUid;
      const type = metadata?.type;

      if (uid && type === 'SUBSCRIPTION') {
        const plan = metadata.plan;
        const cycle = metadata.cycle || 'monthly';
        const expiresAt = new Date();
        if (cycle === 'yearly') {
          expiresAt.setFullYear(now.getFullYear() + 1);
        } else {
          expiresAt.setMonth(now.getMonth() + 1);
        }

        await db.collection('billing_subscriptions').updateOne(
          { userUid: uid },
          {
            $set: { plan, cycle, expiresAt, stripeSubscriptionId: session.subscription, stripeCustomerId: session.customer, updatedAt: now },
            $setOnInsert: { userUid: uid, createdAt: now }
          },
          { upsert: true }
        );

        await db.collection('billing_transactions').insertOne({
          userUid: uid,
          type: 'SUBSCRIPTION',
          amount: session.amount_total / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          description: `Stripe Checkout: ${plan} Plan (${cycle})`,
          status: 'SUCCESS',
          createdAt: now,
        });
      } else if (uid && type === 'CREDITS') {
        const credits = parseInt(metadata.creditsAmount || '10', 10);
        await db.collection('employer_credits').updateOne(
          { employerUid: uid },
          { $inc: { credits }, $setOnInsert: { employerUid: uid, createdAt: now } },
          { upsert: true }
        );

        await db.collection('billing_transactions').insertOne({
          userUid: uid,
          type: 'CREDITS',
          amount: session.amount_total / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          description: `Stripe Checkout: ${credits} Unlock Credits`,
          status: 'SUCCESS',
          createdAt: now,
        });
      } else if (uid && type === 'JOB_PACK') {
        const packId = metadata.employerPlanId as '1M' | '3M' | '6M';
        if (packId && EMPLOYER_JOB_PACKS[packId]) {
          const pack = EMPLOYER_JOB_PACKS[packId];
          const packExpiresAt = new Date(now.getTime() + pack.creditValidityDays * 24 * 60 * 60 * 1000);
          const existing = await db.collection('employer_job_packs').findOne({ employerUid: uid });
          const existingExpiry = existing?.packExpiresAt ? new Date(existing.packExpiresAt) : null;
          const existingCredits =
            existingExpiry && existingExpiry > now ? Number(existing?.creditsRemaining || 0) : 0;
          const mergedExpiry =
            existingExpiry && existingExpiry > now && existingExpiry > packExpiresAt ? existingExpiry : packExpiresAt;

          await db.collection('employer_job_packs').updateOne(
            { employerUid: uid },
            {
              $set: {
                creditsRemaining: existingCredits + pack.jobCredits,
                jobActiveDays: pack.jobActiveDays,
                packExpiresAt: mergedExpiry,
                lastPackId: packId,
                updatedAt: now,
              },
              $setOnInsert: { employerUid: uid, createdAt: now },
            },
            { upsert: true }
          );

          await db.collection('billing_transactions').insertOne({
            userUid: uid,
            type: 'JOB_PACK',
            amount: session.amount_total / 100,
            currency: session.currency?.toUpperCase() || 'INR',
            description: `Stripe Checkout: ${pack.label} job pack`,
            status: 'SUCCESS',
            createdAt: now,
          });
        }
      } else if (uid && type === 'FEATURED_JOB') {
        const jobId = metadata.jobId;
        if (jobId && ObjectId.isValid(jobId)) {
          await db.collection('job_listings').updateOne(
            { _id: new ObjectId(jobId) },
            { $set: { featured: true, featuredExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }
          );

          await db.collection('billing_transactions').insertOne({
            userUid: uid,
            type: 'FEATURED_JOB',
            amount: session.amount_total / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            description: `Stripe Checkout: Featured Job boost`,
            status: 'SUCCESS',
            createdAt: now,
          });
        }
      }
    }

    return reply.send({ received: true });
  });

  // POST /portal — Stripe Customer portal session
  app.post('/portal', async (request, reply) => {
    await app.authenticate(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    if (isSandbox) {
      return reply.send({
        portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${request.user!.role.toLowerCase()}/billing?sandbox=true`,
      });
    }

    try {
      const sub = await db.collection('billing_subscriptions').findOne({ userUid: uid });
      if (!sub?.stripeCustomerId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'No active Stripe billing session found' });
      }

      const session = await stripe!.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${request.user!.role.toLowerCase()}/settings`,
      });

      return reply.send({ portalUrl: session.url });
    } catch (err: any) {
      return reply.code(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /unlocked-candidates — lists candidate details unlocked by this employer
  app.get('/unlocked-candidates', async (request, reply) => {
    await app.authenticate(request, reply);
    await app.requireRole('EMPLOYER')(request, reply);
    const uid = request.user!.uid;
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    const docs = await db.collection('employer_unlocked_candidates').find({ employerUid: uid }).toArray();
    return reply.send({
      unlockedUids: docs.map(d => d.candidateUid),
    });
  });

  // POST /unlock-candidate — unlocks a candidate profile
  app.post('/unlock-candidate', async (request, reply) => {
    await app.authenticate(request, reply);
    await app.requireRole('EMPLOYER')(request, reply);
    const uid = request.user!.uid;
    const { candidateUid } = request.body as any;

    if (!candidateUid) return reply.code(400).send({ error: 'Bad Request', message: 'candidateUid is required' });
    const db = app.mongo?.db;
    if (!db) return reply.code(500).send({ error: 'Database unavailable' });

    // Check if already unlocked
    const existing = await db.collection('employer_unlocked_candidates').findOne({ employerUid: uid, candidateUid });
    if (existing) return reply.send({ ok: true, message: 'Already unlocked' });

    // Check if Pro Plan is active
    const sub = await db.collection('billing_subscriptions').findOne({ userUid: uid });
    const hasPro = sub && sub.plan === 'PRO' && new Date(sub.expiresAt) > new Date();

    if (hasPro) {
      // Free unlock for Pro users
      await db.collection('employer_unlocked_candidates').insertOne({
        employerUid: uid,
        candidateUid,
        createdAt: new Date(),
      });
      return reply.send({ ok: true, unlocked: true });
    }

    // Spend 1 credit
    const creditsDoc = await db.collection('employer_credits').findOne({ employerUid: uid });
    const currentCredits = creditsDoc?.credits || 0;
    if (currentCredits < 1) {
      return reply.code(402).send({ error: 'Payment Required', message: 'Insufficient unlock credits. Please buy credits or subscribe to Employer Pro.' });
    }

    // Deduct 1 credit
    await db.collection('employer_credits').updateOne(
      { employerUid: uid },
      { $inc: { credits: -1 } }
    );

    // Save unlock
    await db.collection('employer_unlocked_candidates').insertOne({
      employerUid: uid,
      candidateUid,
      createdAt: new Date(),
    });

    return reply.send({ ok: true, unlocked: true, remainingCredits: currentCredits - 1 });
  });
}
