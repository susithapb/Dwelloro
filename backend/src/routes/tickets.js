import Property from '../models/Property.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { recomputeRiskScore } from '../services/risk.js';
import { generateContractorBrief } from '../services/ai.js';
import { notifyContractorAssigned } from '../services/notify.js';
import { strip, now } from '../utils/helpers.js';
import { collect, required } from '../utils/validate.js';

export default async function ticketRoutes(app) {
  app.get('/', { preHandler: authenticate }, async (req) => {
    const { role, sub } = req.user;
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.property_id) query.property_id = req.query.property_id;
    if (role === 'tenant') query.reporter_id = sub;
    else if (role === 'contractor') query.assigned_contractor_id = sub;
    else if (role === 'landlord') {
      const props = await Property.find({ landlord_id: sub }, { id: 1 });
      query.property_id = { $in: props.map((p) => p.id) };
    }
    const items = await Ticket.find(query).sort({ created_at: -1 }).limit(500);
    return items.map(strip);
  });

  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body || {};
    const err = collect(
      required(body.property_id, 'property_id'),
      required(body.title, 'title'),
      required(body.description, 'description'),
    );
    if (err) return reply.code(400).send({ detail: err });
    const property = await Property.findOne({ id: body.property_id });
    if (!property) return reply.code(404).send({ detail: 'Property not found' });

    const ticket = await Ticket.create({
      property_id: body.property_id,
      reporter_id: req.user.sub,
      title: body.title,
      description: body.description,
      category: body.category || '',
      urgency: body.urgency || 'medium',
      photo_paths: body.photo_paths || [],
      timeline: [{ at: now(), by: req.user.sub, event: 'created', note: 'Ticket created' }],
    });

    recomputeRiskScore(body.property_id).catch(() => {});
    return strip(ticket);
  });

  app.get('/:id', { preHandler: authenticate }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });
    return strip(ticket);
  });

  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });

    const body = req.body || {};
    const event = { at: now(), by: req.user.sub, event: 'updated' };
    if (body.status) { ticket.status = body.status; event.status = body.status; }
    if (body.urgency) ticket.urgency = body.urgency;
    if (body.assigned_contractor_id) {
      ticket.assigned_contractor_id = body.assigned_contractor_id;
      event.assigned_to = body.assigned_contractor_id;
    }
    if (body.note) event.note = body.note;
    ticket.timeline = [...(ticket.timeline || []), event];
    ticket.updated_at = now();
    await ticket.save();

    recomputeRiskScore(ticket.property_id).catch(() => {});
    return strip(ticket);
  });

  app.post('/:id/brief', { preHandler: authenticate }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });
    const property = await Property.findOne({ id: ticket.property_id });
    try {
      const brief = await generateContractorBrief(
        strip(ticket),
        property ? strip(property) : {},
      );
      ticket.contractor_brief = brief;
      ticket.updated_at = now();
      await ticket.save();
    } catch (e) {
      console.error('brief failed', e.message);
    }
    return strip(ticket);
  });

  app.post(
    '/:id/assign',
    { preHandler: requireRoles('property_manager', 'inspector') },
    async (req, reply) => {
      const ticket = await Ticket.findOne({ id: req.params.id });
      if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });

      const contractor = await User.findOne({
        id: req.body?.contractor_id,
        role: 'contractor',
      });
      if (!contractor) return reply.code(404).send({ detail: 'Contractor not found' });

      const event = {
        at: now(),
        by: req.user.sub,
        event: 'assigned',
        assigned_to: contractor.id,
        contractor_name: contractor.full_name,
      };
      if (req.body?.note) event.note = req.body.note;

      ticket.assigned_contractor_id = contractor.id;
      ticket.status = 'assigned';
      ticket.timeline = [...(ticket.timeline || []), event];
      ticket.updated_at = now();
      await ticket.save();

      const property = await Property.findOne({ id: ticket.property_id });
      notifyContractorAssigned(
        strip(contractor),
        strip(ticket),
        property ? strip(property) : null,
      ).catch((e) => console.error('[notify] contractor assigned:', e.message));

      return strip(ticket);
    },
  );
}
