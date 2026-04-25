import { FastifyInstance, FastifyRequest } from 'fastify';
import { UserRole } from '@hiremebharat/shared';

import './types.js';

export async function registerRbacPlugin(app: FastifyInstance) {
  const requireRole = (...roles: string[]) => {
    return async (request: FastifyRequest, reply: any) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const userRole = request.user.role;
      if (!roles.includes(userRole)) {
        app.log.warn(
          `Access denied: user ${request.user.uid} with role ${userRole} attempted to access route requiring ${roles.join(', ')}`
        );
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
      }
    };
  };

  app.decorate('requireRole', requireRole);
}
