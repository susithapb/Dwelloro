import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { strip } from '../utils/helpers.js';
import { collect, required, validEmail, minLen, oneOf } from '../utils/validate.js';
import env from '../config/env.js';
import { sendPasswordResetEmail } from '../services/notify.js';

const sign = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '72h' });

export default async function authRoutes(app) {
  app.post('/register', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email, password, full_name, role, phone } = req.body || {};
    const VALID_ROLES = ['property_manager', 'tenant', 'contractor', 'landlord', 'inspector'];
    const err = collect(
      required(full_name, 'full_name'),
      validEmail(email),
      minLen(password, 8, 'password'),
      oneOf(role, VALID_ROLES, 'role'),
    );
    if (err) return reply.code(400).send({ detail: err });
    if (await User.findOne({ email: email.toLowerCase() })) {
      return reply.code(400).send({ detail: 'Email already registered' });
    }
    const user = await User.create({
      email: email.toLowerCase(),
      full_name,
      role,
      phone,
      password_hash: bcrypt.hashSync(password, 10),
    });
    return { access_token: sign(user), token_type: 'bearer', user: strip(user) };
  });

  app.post('/login', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return reply.code(401).send({ detail: 'Invalid credentials' });
    }
    return { access_token: sign(user), token_type: 'bearer', user: strip(user) };
  });

  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await User.findOne({ id: req.user.sub });
    if (!user) return reply.code(404).send({ detail: 'User not found' });
    return strip(user);
  });

  app.patch('/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await User.findOne({ id: req.user.sub });
    if (!user) return reply.code(404).send({ detail: 'User not found' });
    const { full_name, phone, email } = req.body || {};
    if (email) {
      const emailErr = validEmail(email);
      if (emailErr) return reply.code(400).send({ detail: emailErr });
      if (email.toLowerCase() !== user.email) {
        if (await User.findOne({ email: email.toLowerCase() })) {
          return reply.code(400).send({ detail: 'Email already in use' });
        }
        user.email = email.toLowerCase();
      }
    }
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    await user.save();
    return strip(user);
  });

  app.post('/change-password', { preHandler: authenticate }, async (req, reply) => {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return reply.code(400).send({ detail: 'current_password and new_password are required' });
    }
    if (new_password.length < 8) {
      return reply.code(400).send({ detail: 'Password must be at least 8 characters' });
    }
    const user = await User.findOne({ id: req.user.sub });
    if (!user) return reply.code(404).send({ detail: 'User not found' });
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return reply.code(400).send({ detail: 'Current password is incorrect' });
    }
    user.password_hash = bcrypt.hashSync(new_password, 10);
    await user.save();
    return { detail: 'Password updated successfully' };
  });

  app.post('/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email } = req.body || {};
    // Always return 200 — don't reveal whether the email exists
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      user.reset_token = tokenHash;
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await user.save();
      const resetUrl = `${env.APP_PUBLIC_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user, resetUrl);
    }
    return { detail: 'If that email is registered you will receive a reset link shortly.' };
  });

  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return reply.code(400).send({ detail: 'Token and password are required' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ detail: 'Password must be at least 8 characters' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ reset_token: tokenHash });
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return reply.code(400).send({ detail: 'Reset link is invalid or has expired' });
    }
    user.password_hash = bcrypt.hashSync(password, 10);
    user.reset_token = undefined;
    user.reset_token_expires = undefined;
    await user.save();
    return { detail: 'Password updated successfully' };
  });
}
