const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-4o-realtime-preview'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('exports'),
  STORAGE_BUCKET: z.string().default('resumes'),
  DATABASE_URL: z.string().optional(),
  PGSSL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ENABLE_QUEUE_WORKER: z.string().default('false'),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('change_this_to_a_long_random_string'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  APP_VERSION: z.string().default('8.1.0')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid backend environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

function getRuntimeWarnings() {
  const warnings = [];
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'change_this_to_a_long_random_string') {
    warnings.push('JWT_SECRET is still using the default placeholder. Replace it before production use.');
  }
  if (env.NODE_ENV === 'production' && !env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY is missing. AI endpoints will not behave like production.');
  }
  if (env.NODE_ENV === 'production' && !env.SUPABASE_URL) {
    warnings.push('SUPABASE_URL is missing. Cloud storage and synced persistence will be incomplete.');
  }
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    warnings.push('DATABASE_URL is missing. The backend will fall back to local JSON instead of real production persistence.');
  }
  if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY is missing. Recruiter email generation/send flows will be incomplete.');
  }
  if (env.NODE_ENV === 'production' && !env.EMAIL_FROM) {
    warnings.push('EMAIL_FROM is missing. Outbound email sending will fail until it is configured.');
  }
  return warnings;
}

module.exports = { env, getRuntimeWarnings };
