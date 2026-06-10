import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuid(), unique: true, index: true },
    email: { type: String, unique: true, index: true },
    full_name: String,
    role: String,
    phone: String,
    trade: String,
    password_hash: String,
    plan_tier: { type: String, default: 'free' },
    plan_started_at: String,
    stripe_customer_id: String,
    stripe_session_id: String,
    reset_token: String,
    reset_token_expires: String,
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'users' },
);

export default mongoose.model('User', userSchema);
