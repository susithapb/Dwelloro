import { requireRoles } from '../middleware/requireRoles.js';
import PaymentTxn from '../models/PaymentTxn.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const adminOnly = requireRoles('admin');

export default async function adminRoutes(app) {
  app.get('/api/admin/metrics', { preHandler: adminOnly }, async (req, reply) => {
    const PRICES_NZD = { free: 0, starter: 79, pro: 249, enterprise: 0 };
    const users = await User.find({ role: { $ne: 'admin' } }).sort({ created_at: -1 });
    const byTier = { free: 0, starter: 0, pro: 0, enterprise: 0 };
    let mrr = 0;
    for (const u of users) {
      const tier = u.plan_tier || 'free';
      byTier[tier] = (byTier[tier] || 0) + 1;
      mrr += PRICES_NZD[tier] || 0;
    }
    const recentSignups = users.slice(0, 8).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      plan_tier: u.plan_tier || 'free',
      created_at: u.created_at,
    }));
    const recentPayments = (
      await PaymentTxn.find({}).sort({ created_at: -1 }).limit(15)
    ).map((t) => ({
      session_id: t.session_id,
      user_email: t.user_email,
      plan_tier: t.plan_tier,
      amount: t.amount,
      currency: t.currency,
      payment_status: t.payment_status,
      created_at: t.created_at,
    }));
    return {
      total_users: users.length,
      paid_users: byTier.starter + byTier.pro + byTier.enterprise,
      by_tier: byTier,
      mrr_nzd: mrr,
      arr_nzd: mrr * 12,
      recent_signups: recentSignups,
      recent_payments: recentPayments,
    };
  });

  // List all customer users (excludes admin accounts)
  app.get('/api/admin/users', { preHandler: adminOnly }, async (req, reply) => {
    const { role, plan_tier, q } = req.query || {};
    const filter = { role: { $ne: 'admin' } };
    if (role) filter.role = role;
    if (plan_tier) filter.plan_tier = plan_tier;
    let users = await User.find(filter).sort({ created_at: -1 });
    if (q) {
      const lq = q.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email || '').toLowerCase().includes(lq) ||
          (u.full_name || '').toLowerCase().includes(lq),
      );
    }
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      phone: u.phone,
      plan_tier: u.plan_tier || 'free',
      plan_started_at: u.plan_started_at,
      created_at: u.created_at,
    }));
  });

  // Update a customer user's plan tier
  app.patch('/api/admin/users/:id', { preHandler: adminOnly }, async (req, reply) => {
    const { plan_tier } = req.body || {};
    const allowed = ['free', 'starter', 'pro', 'enterprise'];
    if (plan_tier && !allowed.includes(plan_tier)) {
      return reply.code(400).send({ detail: 'Invalid plan_tier' });
    }
    const user = await User.findOne({ id: req.params.id, role: { $ne: 'admin' } });
    if (!user) return reply.code(404).send({ detail: 'User not found' });
    if (plan_tier) user.plan_tier = plan_tier;
    await user.save();
    return { id: user.id, email: user.email, plan_tier: user.plan_tier };
  });

  // List Dwelloro staff accounts
  app.get('/api/admin/staff', { preHandler: adminOnly }, async (req, reply) => {
    const staff = await User.find({ role: 'admin' }).sort({ created_at: -1 });
    return staff.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      created_at: u.created_at,
    }));
  });

  // Create a new Dwelloro admin staff account
  app.post('/api/admin/staff', { preHandler: adminOnly }, async (req, reply) => {
    const { email, password, full_name } = req.body || {};
    if (!email || !password || !full_name) {
      return reply.code(400).send({ detail: 'email, password and full_name are required' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return reply.code(400).send({ detail: 'Email already registered' });
    }
    const user = await User.create({
      email: email.toLowerCase(),
      full_name,
      role: 'admin',
      password_hash: bcrypt.hashSync(password, 10),
    });
    return { id: user.id, email: user.email, role: user.role, created_at: user.created_at };
  });
}
