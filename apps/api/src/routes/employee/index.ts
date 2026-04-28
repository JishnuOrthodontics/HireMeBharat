import { FastifyInstance } from 'fastify';

export async function employeeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requireRole('EMPLOYEE'));

  // GET /api/employee/profile
  app.get('/profile', async (request, reply) => {
    return reply.send({
      profile: {
        uid: request.user!.uid,
        email: request.user!.email,
        displayName: request.user!.displayName,
        skills: ['React', 'TypeScript', 'Node.js'],
        experience: [{ title: 'Senior Engineer', company: 'TechCorp', years: 5 }],
        compensation: { current: 180000, expected: 220000, currency: 'USD' },
      },
    });
  });

  // GET /api/employee/matches
  app.get('/matches', async (_request, reply) => {
    return reply.send({
      matches: [
        { id: '1', title: 'VP of Product Engineering', company: 'Stealth Mode', score: 94, status: 'PENDING', salary: '$200k - $240k' },
        { id: '2', title: 'Head of AI Infrastructure', company: 'NextGen Robotics', score: 88, status: 'PENDING', salary: '$220k - $280k' },
      ],
    });
  });

  // GET /api/employee/concierge
  app.get('/concierge', async (_request, reply) => {
    return reply.send({
      concierge: {
        name: 'Sarah Jenkins',
        title: 'Senior Talent Concierge',
        online: true,
      },
      messages: [
        { from: 'concierge', text: 'Good morning! I reviewed your updated portfolio.', time: '9:41 AM' },
        { from: 'user', text: "Yes, please. I'm particularly interested in their funding runway.", time: '9:43 AM' },
      ],
    });
  });
}

