import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { strip } from '../utils/helpers.js';

export default async function contractorRoutes(app) {
  app.get(
    '/api/users/contractors',
    { preHandler: requireRoles('property_manager', 'inspector') },
    async () => {
      const docs = await User.find({ role: 'contractor' });
      return docs.map(strip);
    },
  );

  app.get(
    '/api/users/tenants',
    { preHandler: requireRoles('property_manager') },
    async () => {
      const docs = await User.find({ role: 'tenant' });
      return docs.map(strip);
    },
  );

  app.get(
    '/api/users/:id',
    { preHandler: authenticate },
    async (req, reply) => {
      const doc = await User.findOne({ id: req.params.id });
      if (!doc) return reply.code(404).send({ detail: 'User not found' });
      const s = strip(doc);
      return { id: s.id, full_name: s.full_name, email: s.email, phone: s.phone, role: s.role };
    },
  );

  app.get(
    '/api/contractors/metrics',
    { preHandler: authenticate },
    async (req, reply) => {
      if (!['property_manager', 'landlord', 'inspector'].includes(req.user.role)) {
        return reply.code(403).send({ detail: 'Forbidden' });
      }

      const contractors = await User.find({ role: 'contractor' });
      const metrics = [];

      for (const contractor of contractors) {
        const tickets = await Ticket.find({ assigned_contractor_id: contractor.id });
        const completed = tickets.filter((t) => t.status === 'completed');
        const inProgress = tickets.filter((t) => t.status === 'in_progress');
        const open = tickets.filter((t) =>
          ['assigned', 'open', 'awaiting_quote'].includes(t.status),
        );

        const durations = completed
          .map((t) => (new Date(t.updated_at) - new Date(t.created_at)) / 3600000)
          .filter((d) => d >= 0);
        const avgHours = durations.length
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
          : null;

        metrics.push({
          contractor_id: contractor.id,
          full_name: contractor.full_name,
          email: contractor.email,
          total: tickets.length,
          open_jobs: open.length,
          in_progress: inProgress.length,
          completed: completed.length,
          completion_rate: tickets.length
            ? Math.round((completed.length / tickets.length) * 1000) / 10
            : 0,
          avg_resolution_hours: avgHours,
        });
      }

      metrics.sort((a, b) => b.total - a.total);
      return metrics;
    },
  );
}
