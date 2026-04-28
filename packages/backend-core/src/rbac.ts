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

      const userRole = String(request.user.role || '').toUpperCase();
      const allowedRoles = roles.map((r) => String(r).toUpperCase());
      if (!allowedRoles.includes(userRole)) {
        app.log.warn(
          `Access denied: user ${request.user.uid} with role ${userRole} attempted to access route requiring ${allowedRoles.join(', ')}`
        );
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        });
      }
    };
  };

  app.decorate('requireRole', requireRole);
}

