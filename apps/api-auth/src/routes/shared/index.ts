import { FastifyInstance } from 'fastify';

export async function sharedRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/auth/me
  app.get('/auth/me', async (request, reply) => {
    return reply.send({
      user: request.user,
    });
  });

  // GET /api/notifications
  app.get('/notifications', async (request, reply) => {
    return reply.send({
      notifications: [
        { id: '1', type: 'MATCH', title: 'New Match Available', content: 'A new role matches your profile at 94%', read: false, createdAt: new Date() },
        { id: '2', type: 'MESSAGE', title: 'Concierge Message', content: 'Sarah Jenkins sent you a message', read: false, createdAt: new Date() },
      ],
    });
  });
}