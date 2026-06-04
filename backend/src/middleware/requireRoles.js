import { authenticate } from './auth.js';

/**
 * Returns a preHandler that first authenticates then enforces role membership.
 * Usage: { preHandler: requireRoles('property_manager', 'inspector') }
 */
export const requireRoles =
  (...roles) =>
  async (req, reply) => {
    await authenticate(req, reply);
    if (reply.sent) return;
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }
  };
