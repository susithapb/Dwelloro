import { v4 as uuid } from 'uuid';
import Property from '../models/Property.js';
import Inspection from '../models/Inspection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { recomputeRiskScore } from '../services/risk.js';
import { summarizeInspection } from '../services/ai.js';
import { strip, now } from '../utils/helpers.js';
import { ROOM_CHECKS } from '../config/constants.js';

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

export default async function inspectionRoutes(app) {
  app.get('/', { preHandler: authenticate }, async (req) => {
    const query = {};
    if (req.query.property_id) query.property_id = req.query.property_id;
    if (req.user.role === 'inspector') query.inspector_id = req.user.sub;
    else if (req.user.role === 'landlord') {
      const props = await Property.find({ landlord_id: req.user.sub }, { id: 1 });
      query.property_id = { $in: props.map((p) => p.id) };
    }
    const items = await Inspection.find(query).sort({ created_at: -1 }).limit(500);
    return items.map(strip);
  });

  app.post(
    '/',
    { preHandler: requireRoles('property_manager', 'inspector') },
    async (req, reply) => {
      const body = req.body || {};
      const property = await Property.findOne({ id: body.property_id });
      if (!property) return reply.code(404).send({ detail: 'Property not found' });

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
        inspector_id: req.user.sub,
        rooms,
        scheduled_at: body.scheduled_at,
      });
      return strip(inspection);
    },
  );

  app.get('/property/:id/timeline', { preHandler: authenticate }, async (req) => {
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
    const inspection = await Inspection.findOne({ id: req.params.id });
    if (!inspection) return reply.code(404).send({ detail: 'Inspection not found' });
    return strip(inspection);
  });

  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await Inspection.findOne({ id: req.params.id });
    if (!inspection) return reply.code(404).send({ detail: 'Not found' });

    const body = req.body || {};
    if (body.status) {
      inspection.status = body.status;
      if (body.status === 'completed') inspection.completed_at = now();
    }
    if (body.summary !== undefined) inspection.summary = body.summary;
    if (body.scheduled_at !== undefined) inspection.scheduled_at = body.scheduled_at;
    inspection.updated_at = now();
    await inspection.save();
    return strip(inspection);
  });

  app.patch('/:id/rooms/:roomId', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await Inspection.findOne({ id: req.params.id });
    if (!inspection) return reply.code(404).send({ detail: 'Not found' });

    const rooms = inspection.rooms || [];
    const idx = rooms.findIndex((r) => r.id === req.params.roomId);
    if (idx < 0) return reply.code(404).send({ detail: 'Room not found' });

    const room = { ...rooms[idx] };
    const body = req.body || {};
    if (body.checklist !== undefined) room.checklist = body.checklist;
    if (body.notes !== undefined) room.notes = body.notes;
    if (body.photo_paths !== undefined) room.photo_paths = body.photo_paths;

    rooms[idx] = room;
    inspection.rooms = rooms;
    inspection.markModified('rooms');
    inspection.updated_at = now();
    await inspection.save();

    recomputeRiskScore(inspection.property_id).catch(() => {});
    return strip(inspection);
  });

  app.post('/:id/summarize', { preHandler: authenticate }, async (req, reply) => {
    const inspection = await Inspection.findOne({ id: req.params.id });
    if (!inspection) return reply.code(404).send({ detail: 'Not found' });

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
