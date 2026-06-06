
import Stripe from 'stripe';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY || 'sk_test_DUMMY-KEY-REPLACE-ME';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-me-in-production';

const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2024-12-18.acacia' });

const hasRealKey = () =>
  STRIPE_API_KEY && STRIPE_API_KEY.startsWith('sk_') && !STRIPE_API_KEY.includes('DUMMY') && STRIPE_API_KEY !== 'sk_test_emergent';

export const PLANS = {
  starter: { name: 'Starter', nzd: 79.0, aud: 69.0, max_properties: 25 },
  pro: { name: 'Pro', nzd: 249.0, aud: 229.0, max_properties: 100 },
};

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
const PaymentTxn = mongoose.models.PaymentTxn || mongoose.model('PaymentTxn', paymentTxnSchema);
export { PaymentTxn };

function getUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), JWT_SECRET); } catch { return null; }
}

export default async function billingRoutes(app, { User }) {
  app.get('/billing/plans', async () => ({
    free: { name: 'Free', nzd: 0, aud: 0, max_properties: 3 },
    starter: { ...PLANS.starter },
    pro: { ...PLANS.pro },
    enterprise: { name: 'Enterprise', nzd: null, aud: null, max_properties: null },
  }));

  app.post('/billing/create-checkout-session', async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ detail: 'Missing token' });
    const { plan_tier, currency, origin_url } = req.body || {};
    if (!PLANS[plan_tier]) return reply.code(400).send({ detail: 'Invalid plan' });
    const cur = (currency || '').toLowerCase();
    if (!['nzd', 'aud'].includes(cur)) return reply.code(400).send({ detail: 'Invalid currency' });
    if (!origin_url) return reply.code(400).send({ detail: 'Missing origin_url' });

    if (!hasRealKey()) {
      return reply.code(503).send({
        detail: 'Stripe checkout disabled — set STRIPE_API_KEY in backend-node/.env to enable. Visit https://dashboard.stripe.com/test/apikeys to get a test key.',
      });
    }

    const plan = PLANS[plan_tier];
    const amount = plan[cur];
    const origin = origin_url.replace(/\/$/, '');
    const success_url = `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/pricing?canceled=1`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: cur,
            product_data: { name: `PropIntel ${plan.name} plan` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        success_url,
        cancel_url,
        customer_email: user.email,
        metadata: {
          user_id: user.sub,
          user_email: user.email || '',
          plan_tier,
          source: 'propintel_pricing_page',
        },
      });

      await PaymentTxn.create({
        session_id: session.id,
        user_id: user.sub,
        user_email: user.email || '',
        plan_tier,
        amount,
        currency: cur,
        status: 'initiated',
        payment_status: 'pending',
        metadata: session.metadata,
      });

      return { url: session.url, session_id: session.id };
    } catch (e) {
      console.error('[billing] create session failed:', e.message);
      return reply.code(502).send({ detail: 'Payment provider error' });
    }
  });

  app.get('/billing/status/:session_id', async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ detail: 'Missing token' });
    const { session_id } = req.params;
    const txn = await PaymentTxn.findOne({ session_id });
    if (!txn) return reply.code(404).send({ detail: 'Transaction not found' });
    if (txn.user_id !== user.sub) return reply.code(403).send({ detail: 'Forbidden' });

    if (['paid', 'failed', 'expired'].includes(txn.payment_status)) {
      return {
        payment_status: txn.payment_status,
        status: txn.status,
        plan_tier: txn.plan_tier,
        amount: txn.amount,
        currency: txn.currency,
      };
    }

    if (!hasRealKey()) {
      return reply.code(503).send({ detail: 'Stripe disabled' });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      txn.status = session.status || txn.status;
      txn.payment_status = session.payment_status || txn.payment_status;
      txn.updated_at = new Date().toISOString();
      await txn.save();

      if (session.payment_status === 'paid') {
        const u = await User.findOne({ id: txn.user_id });
        if (u && u.plan_tier !== txn.plan_tier) {
          u.plan_tier = txn.plan_tier;
          u.plan_started_at = new Date().toISOString();
          u.stripe_session_id = session_id;
          await u.save();
        }
      }

      return {
        payment_status: session.payment_status,
        status: session.status,
        plan_tier: txn.plan_tier,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency,
      };
    } catch (e) {
      console.error('[billing] retrieve session failed:', e.message);
      return reply.code(502).send({ detail: 'Payment provider error' });
    }
  });

  app.post('/billing/webhook', { config: { rawBody: true } }, async (req, reply) => {
    if (!hasRealKey() || !STRIPE_WEBHOOK_SECRET) return { ok: false, reason: 'not configured' };
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      console.warn('[billing] webhook verify failed:', e.message);
      return reply.code(400).send({ detail: 'Invalid signature' });
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      await PaymentTxn.updateOne(
        { session_id: s.id },
        { $set: { payment_status: s.payment_status, status: 'completed', updated_at: new Date().toISOString() } }
      );
    }
    return { ok: true };
  });
}
