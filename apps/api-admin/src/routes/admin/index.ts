import { FastifyInstance } from 'fastify';
import '@hiremebharat/backend-core';

export async function adminRoutes(app: FastifyInstance) {
  // Apply auth + RBAC to all routes in this group
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('ADMIN'));

  // GET /api/admin/escalations
  app.get('/escalations', async (_request, reply) => {
    // TODO: Query escalations collection
    return reply.send({
      escalations: [
        { id: '1', type: 'MATCH_DISPUTE', status: 'OPEN', summary: 'Candidate disputes match score', createdAt: new Date() },
        { id: '2', type: 'PROFILE_REVIEW', status: 'IN_PROGRESS', summary: 'Employer profile flagged for review', createdAt: new Date() },
      ],
    });
  });

  // GET /api/admin/users
  app.get('/users', async (_request, reply) => {
    return reply.send({
      users: [
        { id: '1', email: 'admin@hiremebharat.com', role: 'ADMIN', displayName: 'System Admin' },
      ],
    });
  });

  // GET /api/admin/analytics
  app.get('/analytics', async (_request, reply) => {
    return reply.send({
      totalUsers: 1250,
      activeRequisitions: 87,
      matchesMade: 342,
      avgMatchScore: 89.4,
    });
  });
}
