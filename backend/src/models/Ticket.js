import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    property_id: { type: String, index: true },
    reporter_id: String,
    title: String,
    description: String,
    category: String,
    urgency: { type: String, default: 'medium' },
    status: { type: String, default: 'open' },
    assigned_contractor_id: String,
    photo_paths: { type: [String], default: [] },
    ai_analysis: Object,
    contractor_brief: String,
    quote_amount: Number,
    quote_notes: String,
    quote_submitted_at: String,
    quote_approved_at: String,
    quote_approved_by: String,
    quote_rejected_at: String,
    quote_rejection_reason: String,
    timeline: { type: [Object], default: [] },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'tickets' },
);

export default mongoose.model('Ticket', ticketSchema);
