import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const propertySchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    manager_id: String,
    landlord_id: String,
    tenant_id: String,
    address: String,
    suburb: String,
    city: String,
    postcode: String,
    bedrooms: Number,
    bathrooms: Number,
    notes: String,
    risk_score: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'properties' },
);

export default mongoose.model('Property', propertySchema);
