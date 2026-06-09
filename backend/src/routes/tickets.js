import Property from '../models/Property.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { recomputeRiskScore } from '../services/risk.js';
import { generateContractorBrief } from '../services/ai.js';
import { notifyContractorAssigned, notifyTicketStatusUpdate, notifyQuoteSubmitted, notifyQuoteDecision } from '../services/notify.js';
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
    const oldStatus = ticket.status;
    const event = { at: now(), by: req.user.sub, event: 'updated' };
    let changed = false;
    if (body.status && body.status !== ticket.status) { ticket.status = body.status; event.status = body.status; changed = true; }
    if (body.urgency && body.urgency !== ticket.urgency) { ticket.urgency = body.urgency; changed = true; }
    if (body.assigned_contractor_id && body.assigned_contractor_id !== ticket.assigned_contractor_id) {
      ticket.assigned_contractor_id = body.assigned_contractor_id;
      event.assigned_to = body.assigned_contractor_id;
      changed = true;
    }
    if (body.note) { event.note = body.note; changed = true; }
    if (changed) ticket.timeline = [...(ticket.timeline || []), event];
    ticket.updated_at = now();
    await ticket.save();

    recomputeRiskScore(ticket.property_id).catch(() => {});

    if (body.status && body.status !== oldStatus && ['assigned', 'completed', 'closed'].includes(body.status)) {
      const [reporter, property] = await Promise.all([
        User.findOne({ id: ticket.reporter_id }),
        Property.findOne({ id: ticket.property_id }),
      ]);
      notifyTicketStatusUpdate(
        reporter ? strip(reporter) : null,
        strip(ticket),
        property ? strip(property) : null,
        body.status,
      ).catch((e) => console.error('[notify] status update:', e.message));
    }

    return strip(ticket);
  });

  app.post('/:id/quote', { preHandler: requireRoles('contractor') }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });
    if (ticket.assigned_contractor_id !== req.user.sub) {
      return reply.code(403).send({ detail: 'Not assigned to this ticket' });
    }
    if (['completed', 'closed'].includes(ticket.status)) {
      return reply.code(400).send({ detail: 'Cannot quote on a completed ticket' });
    }

    const amount = Number(req.body?.amount);
    if (!req.body?.amount || isNaN(amount) || amount <= 0) {
      return reply.code(400).send({ detail: 'A valid quote amount (NZD) is required' });
    }

    ticket.quote_amount = amount;
    ticket.quote_notes = req.body?.notes || '';
    ticket.quote_submitted_at = now();
    ticket.quote_approved_at = null;
    ticket.quote_approved_by = null;
    ticket.quote_rejected_at = null;
    ticket.quote_rejection_reason = null;
    ticket.status = 'awaiting_quote';
    ticket.timeline = [
      ...(ticket.timeline || []),
      { at: now(), by: req.user.sub, event: 'quote_submitted', note: `Quote submitted: NZD ${amount.toFixed(2)}` },
    ];
    ticket.updated_at = now();
    await ticket.save();

    const [property, contractor] = await Promise.all([
      Property.findOne({ id: ticket.property_id }),
      User.findOne({ id: req.user.sub }),
    ]);
    const manager = property?.manager_id ? await User.findOne({ id: property.manager_id }) : null;
    const landlord = property?.landlord_id ? await User.findOne({ id: property.landlord_id }) : null;
    const recipient = manager || landlord;
    if (recipient) {
      notifyQuoteSubmitted(strip(recipient), strip(ticket), property ? strip(property) : null, contractor ? strip(contractor) : null)
        .catch((e) => console.error('[notify] quote submitted:', e.message));
    }

    return strip(ticket);
  });

  app.post('/:id/quote/approve', { preHandler: requireRoles('property_manager', 'landlord') }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });
    if (ticket.status !== 'awaiting_quote') {
      return reply.code(400).send({ detail: 'No pending quote to approve' });
    }

    ticket.quote_approved_at = now();
    ticket.quote_approved_by = req.user.sub;
    ticket.quote_rejected_at = null;
    ticket.quote_rejection_reason = null;
    ticket.status = 'in_progress';
    ticket.timeline = [
      ...(ticket.timeline || []),
      { at: now(), by: req.user.sub, event: 'quote_approved', note: `Quote approved: NZD ${(ticket.quote_amount || 0).toFixed(2)}` },
    ];
    ticket.updated_at = now();
    await ticket.save();

    recomputeRiskScore(ticket.property_id).catch(() => {});

    const [contractor, property] = await Promise.all([
      User.findOne({ id: ticket.assigned_contractor_id }),
      Property.findOne({ id: ticket.property_id }),
    ]);
    if (contractor) {
      notifyQuoteDecision(strip(contractor), strip(ticket), property ? strip(property) : null, 'approved', null)
        .catch((e) => console.error('[notify] quote approved:', e.message));
    }

    return strip(ticket);
  });

  app.post('/:id/quote/reject', { preHandler: requireRoles('property_manager', 'landlord') }, async (req, reply) => {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return reply.code(404).send({ detail: 'Ticket not found' });
    if (ticket.status !== 'awaiting_quote') {
      return reply.code(400).send({ detail: 'No pending quote to reject' });
    }

    const reason = req.body?.reason || '';
    ticket.quote_rejected_at = now();
    ticket.quote_rejection_reason = reason;
    ticket.status = 'assigned';
    ticket.timeline = [
      ...(ticket.timeline || []),
      { at: now(), by: req.user.sub, event: 'quote_rejected', note: reason ? `Quote rejected: ${reason}` : 'Quote rejected' },
    ];
    ticket.updated_at = now();
    await ticket.save();

    const [contractor, property] = await Promise.all([
      User.findOne({ id: ticket.assigned_contractor_id }),
      Property.findOne({ id: ticket.property_id }),
    ]);
    if (contractor) {
      notifyQuoteDecision(strip(contractor), strip(ticket), property ? strip(property) : null, 'rejected', reason)
        .catch((e) => console.error('[notify] quote rejected:', e.message));
    }

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
