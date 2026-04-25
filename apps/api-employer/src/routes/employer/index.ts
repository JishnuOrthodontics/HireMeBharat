import { FastifyInstance } from 'fastify';
import '@hiremebharat/backend-core';

export async function employerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('EMPLOYER'));

  // GET /api/employer/requisitions
  app.get('/requisitions', async (_request, reply) => {
    return reply.send({
      requisitions: [
        { id: '1', title: 'VP Product Strategy', status: 'ACTIVE', candidatesInPipeline: 3, featured: true },
        { id: '2', title: 'Director of Data Science', status: 'ACTIVE', candidatesInPipeline: 0, featured: false },
      ],
    });
  });

  // POST /api/employer/requisitions
  app.post('/requisitions', async (request, reply) => {
    const body = request.body as any;
    return reply.code(201).send({
      message: 'Requisition created',
      requisition: { id: 'new-1', ...body, status: 'DRAFT', createdAt: new Date() },
    });
  });

  // GET /api/employer/candidates
  app.get('/candidates', async (_request, reply) => {
    return reply.send({
      candidates: [
        {
          id: '1', name: 'E. Thompson', title: 'SVP Engineering Candidate', score: 94,
          skills: ['Machine Learning', 'Scale-ups', 'M&A Experience'],
          compensation: { benchmark: '$280k - $320k', expectation: '$310k + Equity' },
        },
      ],
    });
  });

  // GET /api/employer/matches
  app.get('/matches', async (_request, reply) => {
    return reply.send({
      matches: [
        { candidateId: '1', requisitionId: '1', score: 94, status: 'PENDING' },
      ],
    });
  });
}
