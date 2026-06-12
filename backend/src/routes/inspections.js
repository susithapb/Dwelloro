import { v4 as uuid } from 'uuid';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Inspection from '../models/Inspection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { recomputeRiskScore } from '../services/risk.js';
import { summarizeInspection } from '../services/ai.js';
import { strip, now } from '../utils/helpers.js';
import { ROOM_CHECKS } from '../config/constants.js';

const VALID_STATUSES = new Set(['ok', 'minor', 'major', 'na']);
const ROOM_CHECKS_SET = new Set(ROOM_CHECKS);

function defaultRooms(property) {
  const names = ['Living Room', 'Kitchen', 'Laundry', 'Exterior'];
  for (let i = 0; i < (property.bedrooms || 0); i++) names.push(`Bedroom ${i + 1}`);
  for (let i = 0; i < (property.bathrooms || 0); i++) names.push(`Bathroom ${i + 1}`);
  return names.map((name) => ({
    id: uuid(),
    name,
    checklist: ROOM_CHECKS.map((key) => ({ key, status: 'na' })),
    notes: '',
    photo_paths: [],
  }));
}

// Fetch inspection and verify caller has access to its property.
// Returns the inspection on success, or sends 404/403 and returns null.
async function resolveInspectionAccess(req, reply, inspectionId) {
  const inspection = await Inspection.findOne({ id: inspectionId });
  if (!inspection) {
    reply.code(404).send({ detail: 'Not found' });
    return null;
  }
  const property = await Property.findOne({ id: inspection.property_id });
  const { role, sub } = req.user;
  let allowed = false;
  if (role === 'property_manager') allowed = property?.manager_id === sub;
  else if (role === 'landlord') allowed = property?.landlord_id === sub;
  else if (role === 'inspector') allowed = inspection.inspector_id === sub;
  else if (role === 'tenant') allowed = property?.tenant_id === sub;
  if (!allowed) {
    reply.code(403).send({ detail: 'Forbidden' });
    return null;
  }
  return inspection;
}

export default async function inspectionRoutes(app) {
  // List — each role sees only inspections for properties they own/are assigned to
  app.get('/', { preHandler: authenticate }, async (req) => {
    const { role, sub } = req.user;
    const query = {};

    if (role === 'inspector') {
      query.inspector_id = sub;
      if (req.query.property_id) query.property_id = req.query.property_id;
    } else if (role === 'landlord') {
      const props = await Property.find({ landlord_id: sub }, { id: 1 });
      const ids = props.map((p) => p.id);
      if (req.query.property_id) {
        if (!ids.includes(req.query.property_id)) return [];
        query.property_id = req.query.property_id;
      } else {
        query.property_id = { $in: ids };
      }
    } else if (role === 'property_manager') {
      const props = await Property.find({ manager_id: sub }, { id: 1 });
      const ids = props.map((p) => p.id);
      if (req.query.property_id) {
        if (!ids.includes(req.query.property_id)) return [];
        query.property_id = req.query.property_id;
      } else {
        query.property_id = { $in: ids };
      }
    } else {
      return []; // tenant / contractor have no inspection list access
    }

    const items = await Inspection.find(query).sort({ created_at: -1 }).limit(500);
    return items.map(strip);
  });

  // Inspector list for PM assignment dropdown
  app.get('/inspectors', { preHandler: requireRoles('property_manager') }, async () => {
    const inspectors = await User.find({ role: 'inspector' }).sort({ full_name: 1 });
    return inspectors.map(strip);
  });

  // Create — PM must own the property; inspectors are a service role
  app.post(
    '/',
    { preHandler: requireRoles('property_manager', 'inspector') },
    async (req, reply) => {
      const body = req.body || {};
      const property = await Property.findOne({ id: body.property_id });
      if (!property) return reply.code(404).send({ detail: 'Property not found' });

      if (req.user.role === 'property_manager' && property.manager_id !== req.user.sub) {
        return reply.code(403).send({ detail: 'Forbidden' });
      }

      const rooms = body.room_names
        ? body.room_names.map((name) => ({
            id: uuid(),
            name,
            checklist: ROOM_CHECKS.map((key) => ({ key, status: 'na' })),
            notes: '',
            photo_paths: [],
          }))
        : defaultRooms(property);

      const inspection = await Inspection.create({
        property_id: body.property_id,
        inspector_id: body.inspector_id || req.user.sub,
        status: 'scheduled',
        rooms,
        scheduled_at: body.scheduled_at,
      });
      return strip(inspection);
    },
  );

  app.get('/property/:id/timeline', { preHandler: authenticate }, async (req, reply) => {
    const property = await Property.findOne({ id: req.params.id });
    const { role, sub } = req.user;
    let allowed = false;
    if (role === 'property_manager') allowed = property?.manager_id === sub;
    else if (role === 'landlord') allowed = property?.landlord_id === sub;
    else if (role === 'inspector') {
      allowed = !!(await Inspection.exists({ property_id: req.params.id, inspector_id: sub }));
    }
    else if (role === 'tenant') allowed = property?.tenant_id === sub;
    if (!allowed) return reply.code(403).send({ detail: 'Forbidden' });

    const items = await Inspection.find({ property_id: req.params.id }).sort({ created_at: 1 });
    const timeline = {};
    for (const insp of items) {
      for (const room of insp.rooms || []) {
        if (!room.photo_paths?.length) continue;
        timeline[room.name] = timeline[room.name] || [];
        for (const path of room.photo_paths) {
          timeline[room.name].push({
            path,
            inspection_id: insp.id,
            at: insp.completed_at || insp.created_at,
          });
        }
      }
    }
    return { timeline };
  });

  app.get('/:id', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await resolveInspectionAccess(req, reply, req.params.id);
    if (!inspection) return;
    return strip(inspection);
  });

  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await resolveInspectionAccess(req, reply, req.params.id);
    if (!inspection) return;

    const body = req.body || {};
    if (body.status) {
      inspection.status = body.status;
      if (body.status === 'completed') {
        inspection.completed_at = now();
        recomputeRiskScore(inspection.property_id).catch(() => {});
      }
    }
    if (body.summary !== undefined) inspection.summary = body.summary;
    if (body.scheduled_at !== undefined) inspection.scheduled_at = body.scheduled_at;
    inspection.updated_at = now();
    await inspection.save();
    return strip(inspection);
  });

  app.patch('/:id/rooms/:roomId', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await resolveInspectionAccess(req, reply, req.params.id);
    if (!inspection) return;

    const rooms = inspection.rooms || [];
    const idx = rooms.findIndex((r) => r.id === req.params.roomId);
    if (idx < 0) return reply.code(404).send({ detail: 'Room not found' });

    const room = { ...rooms[idx] };
    const body = req.body || {};

    if (body.checklist !== undefined) {
      if (!Array.isArray(body.checklist) || body.checklist.length !== ROOM_CHECKS.length) {
        return reply.code(400).send({ detail: 'Invalid checklist' });
      }
      for (const c of body.checklist) {
        if (!ROOM_CHECKS_SET.has(c.key) || !VALID_STATUSES.has(c.status)) {
          return reply.code(400).send({ detail: `Invalid checklist item: key=${c.key} status=${c.status}` });
        }
      }
      room.checklist = body.checklist;
    }
    if (body.notes !== undefined) room.notes = body.notes;
    if (body.photo_paths !== undefined) room.photo_paths = body.photo_paths;

    rooms[idx] = room;
    inspection.rooms = rooms;
    inspection.markModified('rooms');
    inspection.updated_at = now();
    await inspection.save();
    return strip(inspection);
  });

  app.post('/:id/rooms', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await resolveInspectionAccess(req, reply, req.params.id);
    if (!inspection) return;
    const name = (req.body?.name || '').trim();
    if (!name) return reply.code(400).send({ detail: 'Room name required' });
    const room = {
      id: uuid(),
      name,
      checklist: ROOM_CHECKS.map((key) => ({ key, status: 'na' })),
      notes: '',
      photo_paths: [],
    };
    inspection.rooms = [...(inspection.rooms || []), room];
    inspection.markModified('rooms');
    inspection.updated_at = now();
    await inspection.save();
    return strip(inspection);
  });

  app.post('/:id/summarize', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await resolveInspectionAccess(req, reply, req.params.id);
    if (!inspection) return;

    const property = await Property.findOne({ id: inspection.property_id });
    const priors = await Inspection.find({
      property_id: inspection.property_id,
      id: { $ne: inspection.id },
      summary: { $ne: null, $exists: true },
    })
      .sort({ created_at: -1 })
      .limit(3);

    try {
      const summary = await summarizeInspection(
        strip(inspection),
        property ? strip(property) : {},
        priors.map((p) => p.summary).filter(Boolean),
      );
      if (summary) {
        inspection.summary = summary;
        inspection.updated_at = now();
        await inspection.save();
      }
    } catch (e) {
      console.error('summarize failed', e.message);
      return reply.code(502).send({ detail: 'AI service unavailable' });
    }
    return strip(inspection);
  });
}
