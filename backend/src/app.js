import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import complianceRoutes from './routes/compliance.js';
import ticketRoutes from './routes/tickets.js';
import inspectionRoutes from './routes/inspections.js';
import uploadRoutes from './routes/uploads.js';
import contractorRoutes from './routes/contractors.js';
import intelligenceRoutes from './routes/intelligence.js';
import notificationRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';
import aiRoutes from './routes/ai.js';
import billingRoutes  from './routes/billing.js';
import adminRoutes from './routes/admin.js';

export async function buildApp() {
  const app = Fastify({ logger: false, bodyLimit: 20 * 1024 * 1024 });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) =>
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
  });

  app.get('/', async () => ({ name: 'Dwelloro', status: 'ok', backend: 'node-fastify' }));
  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: 'api/auth' });
  await app.register(propertyRoutes, { prefix: 'api/properties' });
  await app.register(complianceRoutes, { prefix: 'api/compliance' });
  await app.register(ticketRoutes, { prefix: 'api/tickets' });
  await app.register(inspectionRoutes, { prefix: 'api/inspections' });
  await app.register(uploadRoutes);
  await app.register(contractorRoutes);
  await app.register(intelligenceRoutes, { prefix: 'api/intelligence' });
  await app.register(notificationRoutes, { prefix: 'api/notifications' });
  await app.register(publicRoutes);
  await app.register(billingRoutes, { prefix: 'api/billing' })
  await app.register(adminRoutes)
  await app.register(aiRoutes, { prefix: '/api/ai' });

  return app;
}