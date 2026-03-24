function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function toInt(value, fallback) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toStringValue(value, fallback = '') {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s === '' ? fallback : s;
}

function oneOf(value, allowed, fallback) {
  const s = toStringValue(value, fallback);
  return allowed.includes(s) ? s : fallback;
}

const raw = { ...process.env };

const env = {
  PORT: toInt(raw.PORT, 4000),
  NODE_ENV: oneOf(raw.NODE_ENV, ['development', 'test', 'production'], 'development'),
  CORS_ORIGIN: toStringValue(raw.CORS_ORIGIN, '*'),

  OPENAI_API_KEY: toStringValue(raw.OPENAI_API_KEY, ''),
  OPENAI_MODEL: toStringValue(raw.OPENAI_MODEL, 'gpt-4o-mini'),
  OPENAI_REALTIME_MODEL: toStringValue(raw.OPENAI_REALTIME_MODEL, 'gpt-4o-realtime-preview'),
  OPENAI_TIMEOUT_MS: toStringValue(raw.OPENAI_TIMEOUT_MS, ''),
  OPENAI_TRANSCRIBE_TIMEOUT_MS: toStringValue(raw.OPENAI_TRANSCRIBE_TIMEOUT_MS, ''),
  OPENAI_TTS_TIMEOUT_MS: toStringValue(raw.OPENAI_TTS_TIMEOUT_MS, ''),

  SUPABASE_URL: toStringValue(raw.SUPABASE_URL, ''),
  SUPABASE_SERVICE_ROLE_KEY: toStringValue(raw.SUPABASE_SERVICE_ROLE_KEY, ''),
  SUPABASE_ANON_KEY: toStringValue(raw.SUPABASE_ANON_KEY, ''),
  SUPABASE_STORAGE_BUCKET: toStringValue(raw.SUPABASE_STORAGE_BUCKET, 'exports'),
  STORAGE_BUCKET: toStringValue(raw.STORAGE_BUCKET, 'resumes'),

  DATABASE_URL: toStringValue(raw.DATABASE_URL, ''),
  PGSSL: toStringValue(raw.PGSSL, ''),
  PG_CONNECT_TIMEOUT_MS: toStringValue(raw.PG_CONNECT_TIMEOUT_MS, ''),
  PG_IDLE_TIMEOUT_MS: toStringValue(raw.PG_IDLE_TIMEOUT_MS, ''),
  PG_POOL_MAX: toStringValue(raw.PG_POOL_MAX, ''),

  REDIS_URL: toStringValue(raw.REDIS_URL, ''),

  RESEND_API_KEY: toStringValue(raw.RESEND_API_KEY, ''),
  EMAIL_FROM: toStringValue(raw.EMAIL_FROM, ''),
  SMTP_HOST: toStringValue(raw.SMTP_HOST, ''),

  ENABLE_QUEUE_WORKER: toStringValue(raw.ENABLE_QUEUE_WORKER, 'false'),
  ALLOW_LOCAL_FALLBACK: toStringValue(raw.ALLOW_LOCAL_FALLBACK, ''),
  STRICT_PERSISTENCE: toStringValue(raw.STRICT_PERSISTENCE, ''),
  DISABLE_LOCAL_AUTH: toStringValue(raw.DISABLE_LOCAL_AUTH, ''),

  JWT_SECRET: toStringValue(raw.JWT_SECRET, 'change_this_to_a_long_random_string'),
  JWT_EXPIRES_IN: toStringValue(raw.JWT_EXPIRES_IN, '7d'),
  APP_VERSION: toStringValue(raw.APP_VERSION, '14.0.0'),

  OCR_ENABLED: toStringValue(raw.OCR_ENABLED, 'true'),
  OCR_LANGUAGES: toStringValue(raw.OCR_LANGUAGES, 'eng'),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: toStringValue(raw.GOOGLE_APPLICATION_CREDENTIALS_JSON, ''),

  JOB_BROWSER_EXTRACTION_ENABLED: toStringValue(raw.JOB_BROWSER_EXTRACTION_ENABLED, 'true'),
  JOB_EXTRACTION_LOCALE: toStringValue(raw.JOB_EXTRACTION_LOCALE, 'en-US,en;q=0.9'),
  PUPPETEER_EXECUTABLE_PATH: toStringValue(raw.PUPPETEER_EXECUTABLE_PATH, ''),

  SENTRY_DSN: toStringValue(raw.SENTRY_DSN, ''),
  SENTRY_TRACES_SAMPLE_RATE: toStringValue(raw.SENTRY_TRACES_SAMPLE_RATE, ''),

  API_RATE_LIMIT_WINDOW_MS: toStringValue(raw.API_RATE_LIMIT_WINDOW_MS, '900000'),
  API_RATE_LIMIT_MAX: toStringValue(raw.API_RATE_LIMIT_MAX, '120'),
  AUTH_RATE_LIMIT_MAX: toStringValue(raw.AUTH_RATE_LIMIT_MAX, '30'),
  UPLOAD_RATE_LIMIT_MAX: toStringValue(raw.UPLOAD_RATE_LIMIT_MAX, '20'),
};

if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
  process.stderr.write(`${JSON.stringify({ level: 'error', message: 'Invalid backend environment configuration', meta: { JWT_SECRET: ['JWT_SECRET must be at least 16 characters long.'] } })}\n`);
  process.exit(1);
}

const isProduction = env.NODE_ENV === 'production';
const strictPersistence = toBool(env.STRICT_PERSISTENCE, isProduction);
const allowLocalFallback = strictPersistence ? false : toBool(env.ALLOW_LOCAL_FALLBACK, !isProduction);
const disableLocalAuth = toBool(env.DISABLE_LOCAL_AUTH, false);
const queueWorkerEnabled = toBool(env.ENABLE_QUEUE_WORKER, false);
const ocrEnabled = toBool(env.OCR_ENABLED, true);
const browserExtractionEnabled = toBool(env.JOB_BROWSER_EXTRACTION_ENABLED, true);
const sentryEnabled = Boolean(String(env.SENTRY_DSN || '').trim());

function hasOpenAI() { return Boolean(String(env.OPENAI_API_KEY || '').trim()); }
function hasDatabase() { return Boolean(String(env.DATABASE_URL || '').trim()); }
function hasRedis() { return Boolean(String(env.REDIS_URL || '').trim()); }
function hasSupabase() { return Boolean(String(env.SUPABASE_URL || '').trim() && String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()); }
function hasSupabaseAuth() { return Boolean(String(env.SUPABASE_URL || '').trim() && String(env.SUPABASE_ANON_KEY || '').trim() && String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()); }
function hasEmailProvider() { return Boolean(String(env.RESEND_API_KEY || '').trim() || String(env.SMTP_HOST || '').trim()); }
function hasGoogleVision() { return Boolean(String(env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim()); }

function getRuntimeWarnings() {
  const warnings = [];
  if (env.JWT_SECRET === 'change_this_to_a_long_random_string') warnings.push('JWT_SECRET is still using the default placeholder.');
  if (!hasOpenAI()) warnings.push('OPENAI_API_KEY is missing. AI generation, transcription, and TTS may be unavailable.');
  if (!hasDatabase()) warnings.push(allowLocalFallback ? 'DATABASE_URL is missing. Persistence will use local fallback mode.' : 'DATABASE_URL is missing. Persistent production storage is not configured.');
  if (!hasRedis()) warnings.push('REDIS_URL is missing. Queue and cache flows may run in degraded mode.');
  if (!hasSupabase()) warnings.push('Supabase storage/admin configuration is incomplete.');
  if (!hasEmailProvider()) warnings.push('No email provider is configured. Outbound email flows will be unavailable.');
  if (!env.EMAIL_FROM && hasEmailProvider()) warnings.push('EMAIL_FROM is missing. Outbound email sending will fail until configured.');
  if (queueWorkerEnabled && !hasRedis()) warnings.push('Queue worker is enabled but REDIS_URL is missing.');
  if (isProduction && allowLocalFallback) warnings.push('Production is running with local fallback enabled.');
  if (!ocrEnabled) warnings.push('OCR fallback is disabled. Scanned resumes may not parse fully.');
  if (ocrEnabled && !hasGoogleVision()) warnings.push('Google Vision credentials are not configured. OCR will fall back to Tesseract.');
  if (!browserExtractionEnabled) warnings.push('Browser-rendered extraction is disabled. Dynamic job boards may parse incompletely.');
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
  if (hardFailures.length) throw new Error(`Production startup blocked because required settings are missing: ${hardFailures.join(', ')}`);
}

module.exports = { env, isProduction, allowLocalFallback, strictPersistence, disableLocalAuth, queueWorkerEnabled, ocrEnabled, browserExtractionEnabled, sentryEnabled, hasOpenAI, hasDatabase, hasRedis, hasSupabase, hasSupabaseAuth, hasEmailProvider, hasGoogleVision, getRuntimeWarnings, assertProductionReadiness };
