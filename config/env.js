const { z } = require('zod');

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-4o-realtime-preview'),
  OPENAI_TIMEOUT_MS: z.string().optional(),
  OPENAI_TRANSCRIBE_TIMEOUT_MS: z.string().optional(),
  OPENAI_TTS_TIMEOUT_MS: z.string().optional(),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('exports'),
  STORAGE_BUCKET: z.string().default('resumes'),

  DATABASE_URL: z.string().optional(),
  PGSSL: z.string().optional(),
  PG_CONNECT_TIMEOUT_MS: z.string().optional(),
  PG_IDLE_TIMEOUT_MS: z.string().optional(),
  PG_POOL_MAX: z.string().optional(),

  REDIS_URL: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),

  ENABLE_QUEUE_WORKER: z.string().default('false'),
  ALLOW_LOCAL_FALLBACK: z.string().optional(),
  STRICT_PERSISTENCE: z.string().optional(),
  DISABLE_LOCAL_AUTH: z.string().optional(),

  JWT_SECRET: z.string().min(16).default('change_this_to_a_long_random_string'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  APP_VERSION: z.string().default('13.0.0'),

  OCR_ENABLED: z.string().default('true'),
  OCR_LANGUAGES: z.string().default('eng'),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),

  JOB_BROWSER_EXTRACTION_ENABLED: z.string().default('true'),
  JOB_EXTRACTION_LOCALE: z.string().default('en-US,en;q=0.9'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),

  API_RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  API_RATE_LIMIT_MAX: z.string().default('120'),
  AUTH_RATE_LIMIT_MAX: z.string().default('30'),
  UPLOAD_RATE_LIMIT_MAX: z.string().default('20'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid backend environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';
const strictPersistence = toBool(env.STRICT_PERSISTENCE, isProduction);
const allowLocalFallback = strictPersistence ? false : toBool(env.ALLOW_LOCAL_FALLBACK, !isProduction);
const disableLocalAuth = toBool(env.DISABLE_LOCAL_AUTH, false);
const queueWorkerEnabled = toBool(env.ENABLE_QUEUE_WORKER, false);
const ocrEnabled = toBool(env.OCR_ENABLED, true);
const browserExtractionEnabled = toBool(env.JOB_BROWSER_EXTRACTION_ENABLED, true);
const sentryEnabled = Boolean(String(env.SENTRY_DSN || '').trim());

function hasOpenAI() {
  return Boolean(String(env.OPENAI_API_KEY || '').trim());
}

function hasDatabase() {
  return Boolean(String(env.DATABASE_URL || '').trim());
}

function hasRedis() {
  return Boolean(String(env.REDIS_URL || '').trim());
}

function hasSupabase() {
  return Boolean(
    String(env.SUPABASE_URL || '').trim() &&
    String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  );
}

function hasSupabaseAuth() {
  return Boolean(
    String(env.SUPABASE_URL || '').trim() &&
    String(env.SUPABASE_ANON_KEY || '').trim() &&
    String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  );
}

function hasEmailProvider() {
  return Boolean(
    String(env.RESEND_API_KEY || '').trim() ||
    String(env.SMTP_HOST || '').trim()
  );
}

function hasGoogleVision() {
  return Boolean(String(env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim());
}

function getRuntimeWarnings() {
  const warnings = [];

  if (env.JWT_SECRET === 'change_this_to_a_long_random_string') {
    warnings.push('JWT_SECRET is still using the default placeholder.');
  }
  if (!hasOpenAI()) {
    warnings.push('OPENAI_API_KEY is missing. AI generation, transcription, and TTS may be unavailable.');
  }
  if (!hasDatabase()) {
    warnings.push(
      allowLocalFallback
        ? 'DATABASE_URL is missing. Persistence will use local fallback mode.'
        : 'DATABASE_URL is missing. Persistent production storage is not configured.'
    );
  }
  if (!hasRedis()) {
    warnings.push('REDIS_URL is missing. Queue and cache flows may run in degraded mode.');
  }
  if (!hasSupabase()) {
    warnings.push('Supabase storage/admin configuration is incomplete.');
  }
  if (!hasEmailProvider()) {
    warnings.push('No email provider is configured. Outbound email flows will be unavailable.');
  }
  if (!env.EMAIL_FROM && hasEmailProvider()) {
    warnings.push('EMAIL_FROM is missing. Outbound email sending will fail until configured.');
  }
  if (queueWorkerEnabled && !hasRedis()) {
    warnings.push('Queue worker is enabled but REDIS_URL is missing.');
  }
  if (isProduction && allowLocalFallback) {
    warnings.push('Production is running with local fallback enabled.');
  }
  if (!ocrEnabled) {
    warnings.push('OCR fallback is disabled. Scanned resumes may not parse fully.');
  }
  if (ocrEnabled && !hasGoogleVision()) {
    warnings.push('Google Vision credentials are not configured. OCR will fall back to Tesseract.');
  }
  if (!browserExtractionEnabled) {
    warnings.push('Browser-rendered extraction is disabled. Dynamic job boards may parse incompletely.');
  }

  return warnings;
}

function assertProductionReadiness() {
  if (!isProduction) return;

  const hardFailures = [];

  if (env.JWT_SECRET === 'change_this_to_a_long_random_string') hardFailures.push('JWT_SECRET');
  if (!hasDatabase() && !allowLocalFallback) hardFailures.push('DATABASE_URL');
  if (!hasOpenAI()) hardFailures.push('OPENAI_API_KEY');
  if (!hasSupabase()) hardFailures.push('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
  if (disableLocalAuth && !hasSupabaseAuth()) hardFailures.push('SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY');
  if (!hasEmailProvider()) hardFailures.push('RESEND_API_KEY or SMTP_HOST');
  if (hasEmailProvider() && !env.EMAIL_FROM) hardFailures.push('EMAIL_FROM');
  if (queueWorkerEnabled && !hasRedis()) hardFailures.push('REDIS_URL');

  if (hardFailures.length) {
    throw new Error(
      `Production startup blocked because required settings are missing: ${hardFailures.join(', ')}`
    );
  }
}

module.exports = {
  env,
  isProduction,
  allowLocalFallback,
  strictPersistence,
  disableLocalAuth,
  queueWorkerEnabled,
  ocrEnabled,
  browserExtractionEnabled,
  sentryEnabled,
  hasOpenAI,
  hasDatabase,
  hasRedis,
  hasSupabase,
  hasSupabaseAuth,
  hasEmailProvider,
  hasGoogleVision,
  getRuntimeWarnings,
  assertProductionReadiness,
};
