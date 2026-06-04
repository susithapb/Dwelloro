import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
  await mongoose.connect(env.MONGO_URL, { dbName: env.DB_NAME });
  console.log(`Connected to MongoDB (${env.DB_NAME})`);
}
