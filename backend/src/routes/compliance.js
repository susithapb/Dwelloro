import Compliance from '../models/Compliance.js';
import { authenticate } from '../middleware/auth.js';
import { recomputeRiskScore } from '../services/risk.js';
import { strip, now } from '../utils/helpers.js';

export default async function complianceRoutes(app) {
  app.get('/property/:id', { preHandler: authenticate }, async (req) => {
    const items = await Compliance.find({ property_id: req.params.id });
    return items.map(strip);
  });

  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const item = await Compliance.findOne({ id: req.params.id });
    if (!item) return reply.code(404).send({ detail: 'Item not found' });

    const body = req.body || {};
    ['status', 'notes', 'evidence_paths', 'last_checked'].forEach((key) => {
      if (body[key] !== undefined) item[key] = body[key];
    });
    item.updated_at = now();
    await item.save();

    recomputeRiskScore(item.property_id).catch(() => {});
    return strip(item);
  });
}
