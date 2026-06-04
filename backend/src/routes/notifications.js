import Property from '../models/Property.js';
import Compliance from '../models/Compliance.js';
import Ticket from '../models/Ticket.js';
import Inspection from '../models/Inspection.js';
import { authenticate } from '../middleware/auth.js';
import { buildAlerts } from '../services/intelligence.js';
import { strip } from '../utils/helpers.js';

export default async function notificationRoutes(app) {
  app.get('/alerts', { preHandler: authenticate }, async (req, reply) => {
    const { role, sub } = req.user;
    if (!['property_manager', 'landlord', 'inspector'].includes(role)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const query =
      role === 'property_manager'
        ? { manager_id: sub }
        : role === 'landlord'
        ? { landlord_id: sub }
        : {};

    const properties = (await Property.find(query)).map(strip);
    const pids = properties.map((p) => p.id);
    if (!pids.length) return { count: 0, alerts: [] };

    const [compliance, tickets, inspections] = await Promise.all([
      Compliance.find({ property_id: { $in: pids } }),
      Ticket.find({ property_id: { $in: pids } }),
      Inspection.find({ property_id: { $in: pids } }),
    ]);

    const alerts = buildAlerts({
      properties,
      compliance: compliance.map(strip),
      tickets: tickets.map(strip),
      inspections: inspections.map(strip),
    });

    return { count: alerts.length, alerts };
  });
}