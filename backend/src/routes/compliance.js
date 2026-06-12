import Property from '../models/Property.js';
import Inspection from '../models/Inspection.js';
import Compliance from '../models/Compliance.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { recomputeRiskScore } from '../services/risk.js';
import { strip, now } from '../utils/helpers.js';

async function canReadProperty(user, propertyId) {
  const property = await Property.findOne({ id: propertyId });
  if (!property) return false;
  if (user.role === 'property_manager') return property.manager_id === user.sub;
  if (user.role === 'landlord') return property.landlord_id === user.sub;
  if (user.role === 'tenant') return property.tenant_id === user.sub;
  if (user.role === 'inspector') {
    return !!(await Inspection.exists({ property_id: propertyId, inspector_id: user.sub }));
  }
  return false;
}

export default async function complianceRoutes(app) {
  app.get('/property/:id', { preHandler: authenticate }, async (req, reply) => {
    if (!(await canReadProperty(req.user, req.params.id))) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }
    const items = await Compliance.find({ property_id: req.params.id });
    return items.map(strip);
  });

  // Only PM/landlord who own the property may update compliance records
  app.patch('/:id', { preHandler: requireRoles('property_manager', 'landlord') }, async (req, reply) => {
    const item = await Compliance.findOne({ id: req.params.id });
    if (!item) return reply.code(404).send({ detail: 'Item not found' });

    if (!(await canReadProperty(req.user, item.property_id))) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

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
