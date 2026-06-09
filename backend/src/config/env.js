import 'dotenv/config';

const env = {
  PORT: parseInt(process.env.NODE_PORT || '8002', 10),
  MONGO_URL: process.env.MONGO_URL,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  APP_NAME: process.env.APP_NAME || 'maintainiq',
  EMERGENT_KEY: process.env.EMERGENT_LLM_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL || '',
  AWS_REGION: 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: 'propintel-202029085297-ap-southeast-2-an',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'sk-ant-DUMMY-KEY-REPLACE-ME',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
};

export default env;
