// import "dotenv/config";
// import Fastify from "fastify";
// import cors from "@fastify/cors";
// import multipart from "@fastify/multipart";
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { v4 as uuid } from "uuid";
// import { PaymentTxn } from "./billing";

import { authenticate } from "../middleware/auth.js";
import PaymentTxn from "../models/PaymentTxn.js";
import User from "../models/User.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "manager@dwelloro.demo")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
async function requireAdmin(req, reply) {
  let email = (req.user?.email || "").toLowerCase();
  if (!email) {
    const u = await User.findOne({ id: req.user.sub });
    email = (u?.email || "").toLowerCase();
  }
  if (!ADMIN_EMAILS.includes(email)) {
    reply.code(403).send({ detail: "admin only" });
    return false;
  }
  return true;
}

export default async function adminRoutes(app) {
  try {
    app.get(
      "/api/admin/metrics",
      { preHandler: authenticate },
      async (req, reply) => {
        if (!(await requireAdmin(req, reply))) return;
        const PRICES_NZD = { free: 0, starter: 79, pro: 249, enterprise: 0 };
        const users = await User.find({}).sort({ created_at: -1 });
        const byTier = { free: 0, starter: 0, pro: 0, enterprise: 0 };
        let mrr = 0;
        for (const u of users) {
          const tier = u.plan_tier || "free";
          byTier[tier] = (byTier[tier] || 0) + 1;
          mrr += PRICES_NZD[tier] || 0;
        }
        const recentSignups = users.slice(0, 8).map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          plan_tier: u.plan_tier || "free",
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
      },
    );
  } catch (error) {
    console.log(error);
  }
}
