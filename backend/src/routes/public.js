import jwt from 'jsonwebtoken';
import Property from '../models/Property.js';
import Compliance from '../models/Compliance.js';
import Ticket from '../models/Ticket.js';
import Inspection from '../models/Inspection.js';
import { strip, now } from '../utils/helpers.js';
import env from '../config/env.js';

export default async function publicRoutes(app) {
  app.get('/api/public/property-report/:id', async (req, reply) => {
    const token = req.query.t;
    if (!token) return reply.code(401).send({ detail: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return reply.code(401).send({ detail: 'Invalid or expired link' });
    }

    if (payload.scope !== 'public_report' || payload.pid !== req.params.id) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const property = await Property.findOne({ id: req.params.id });
    if (!property) return reply.code(404).send({ detail: 'Not found' });

    const compliance = (await Compliance.find({ property_id: property.id })).map(strip);

    const tickets = (
      await Ticket.find({ property_id: property.id }).sort({ created_at: -1 }).limit(10)
    ).map((t) => {
      const s = strip(t);
      return {
        id: s.id,
        title: s.title,
        urgency: s.urgency,
        status: s.status,
        created_at: s.created_at,
        healthy_homes: s.ai_analysis?.healthy_homes_relevant || false,
      };
    });

    const inspections = (
      await Inspection.find({ property_id: property.id })
        .sort({ created_at: -1 })
        .limit(5)
    ).map((i) => {
      const s = strip(i);
      return {
        id: s.id,
        status: s.status,
        summary: s.summary,
        created_at: s.created_at,
        completed_at: s.completed_at,
        room_count: (s.rooms || []).length,
      };
    });

    return {
      property: {
        address: property.address,
        suburb: property.suburb,
        city: property.city,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        risk_score: property.risk_score,
      },
      compliance,
      tickets,
      inspections,
      generated_at: now(),
    };
  });
}
