import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const complianceSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    property_id: { type: String, index: true },
    area: String,
    status: { type: String, default: 'missing_evidence' },
    notes: String,
    evidence_paths: { type: [String], default: [] },
    last_checked: String,
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'compliance' },
);

export default mongoose.model('Compliance', complianceSchema);
