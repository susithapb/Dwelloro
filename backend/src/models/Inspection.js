import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const inspectionSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    property_id: { type: String, index: true },
    inspector_id: String,
    status: { type: String, default: 'scheduled' },
    summary: String,
    rooms: { type: [Object], default: [] },
    scheduled_at: String,
    completed_at: String,
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'inspections' },
);

export default mongoose.model('Inspection', inspectionSchema);
