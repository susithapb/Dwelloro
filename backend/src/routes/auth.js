import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { strip } from '../utils/helpers.js';
import env from '../config/env.js';

const sign = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '72h' });

export default async function authRoutes(app) {
  app.post('/register', async (req, reply) => {
    const { email, password, full_name, role, phone } = req.body || {};
    if (role === 'admin') {
      return reply.code(400).send({ detail: 'Invalid role' });
    }
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

  app.post('/login', async (req, reply) => {
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
}
