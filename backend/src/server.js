import { connectDB } from './config/database.js';
import { seed } from './db/seed.js';
import { buildApp } from './app.js';
import env from './config/env.js';

async function start() {
  await connectDB();
  await seed();

  const app = await buildApp();
  await app.listen({ host: '127.0.0.1', port: env.PORT });
  console.log(`Dwelloro API listening on :${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
