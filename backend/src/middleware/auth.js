import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export async function authenticate(req, reply) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return reply.code(401).send({ detail: 'Missing auth' });
  }
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET);
  } catch {
    return reply.code(401).send({ detail: 'Invalid token' });
  }
}
