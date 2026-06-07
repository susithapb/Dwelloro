import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const paymentTxnSchema = new mongoose.Schema({
  id: { type: String, default: () => uuid(), unique: true, index: true },
  user_id: String,
  user_email: String,
  session_id: { type: String, unique: true, index: true },
  plan_tier: String,
  amount: Number,
  currency: String,
  status: { type: String, default: 'initiated' },
  payment_status: { type: String, default: 'pending' },
  metadata: Object,
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() },
}, { collection: 'payment_transactions' });

export default mongoose.model('PaymentTxn', paymentTxnSchema);