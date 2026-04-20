require('dotenv').config();
const { initSentry, getSentry } = require('./lib/sentry');
initSentry();
const sentry = getSentry();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env, getRuntimeWarnings, assertProductionReadiness, allowLocalFallback } = require('./config/env');
const { healthcheck } = require('./lib/db');
const { redisHealthcheck } = require('./lib/redis');
const { supabaseHealthcheck } = require('./lib/supabase');
const { listJobs } = require('./lib/jobQueue');
const { requestContext } = require('./middleware/requestContext');
const { trackError, trackRequest } = require('./lib/telemetry');
const { toSafeError } = require('./lib/errors');
const { initPersistence } = require('./data/store');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const careerPathRoutes = require('./routes/careerPath');
const applicationsRoutes = require('./routes/applications');
const resourcesRoutes = require('./routes/resources');
const resumeRoutes = require('./routes/resume');
const jobReadyRoutes = require('./routes/jobReady');
const linkedinRoutes = require('./routes/linkedin');
const interviewRoutes = require('./routes/interview');
const emailRoutes = require('./routes/email');
const dashboardRoutes = require('./routes/dashboard');
const { atsRouter } = require('./routes/ats');
const { exportRouter } = require('./routes/export');
const { interviewRealtimeRouter } = require('./routes/interviewRealtime');
const { jobsRouter } = require('./routes/jobs');
const { growthRouter } = require('./routes/growth');
const { marketRouter } = require('./routes/market');
const { coachRouter } = require('./routes/coach');

const app = express();
const api = express.Router();

// Render and similar platforms terminate SSL and forward client IPs through a trusted proxy.
// Enabling trust proxy keeps req.ip and express-rate-limit accurate in production.
app.set('trust proxy', 1);
const corsOrigin = env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin === '*' ? true : corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins }));
app.use(rateLimit({ windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000), max: Number(env.API_RATE_LIMIT_MAX || 120), standardHeaders: true, legacyHeaders: false }));
app.use('/auth', rateLimit({ windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000), max: Number(env.AUTH_RATE_LIMIT_MAX || 30), standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000), max: Number(env.AUTH_RATE_LIMIT_MAX || 30), standardHeaders: true, legacyHeaders: false }));
app.use('/resume/upload', rateLimit({ windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000), max: Number(env.UPLOAD_RATE_LIMIT_MAX || 20), standardHeaders: true, legacyHeaders: false }));
app.use('/api/resume/upload', rateLimit({ windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000), max: Number(env.UPLOAD_RATE_LIMIT_MAX || 20), standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);
if (sentry && sentry.Handlers && typeof sentry.Handlers.requestHandler === 'function') {
  app.use(sentry.Handlers.requestHandler());
}
app.use('/downloads', express.static(path.join(__dirname, 'data', 'generated')));
app.use('/api/downloads', express.static(path.join(__dirname, 'data', 'generated')));

app.get('/', (_req, res) => res.json({ ok: true, service: 'jobnova-backend', version: env.APP_VERSION, health: '/health', apiBase: '/api', endpoints: ['/resume', '/job-ready', '/interview', '/jobs'] }));
app.get('/api', (_req, res) => res.json({ ok: true, service: 'jobnova-backend', version: env.APP_VERSION, health: '/health', apiBase: '/api', endpoints: ['/api/resume', '/api/job-ready', '/api/interview', '/api/jobs'] }));
app.get('/test', (_req, res) => res.json({ ok: true, message: 'Backend working' }));
app.get('/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  const supabase = await supabaseHealthcheck();
  const openaiOk = Boolean(process.env.OPENAI_API_KEY);
  const emailOk = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const exportsOk = true;
  const persistenceMode = db?.mode || (allowLocalFallback ? 'local-fallback' : 'database-required');
  let status = 'healthy';
  if (!db.ok && allowLocalFallback) status = 'fallback';
  else if (!db.ok && !allowLocalFallback) status = 'down';
  else if ((redis.enabled && !redis.ok) || (supabase.enabled && !supabase.ok)) status = 'degraded';
  const ok = status !== 'down';
  res.status(ok ? 200 : 503).json({
    ok,
    status,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    db,
    redis,
    supabase,
    openai: { ok: openaiOk, mode: openaiOk ? 'configured' : 'missing' },
    email: { ok: emailOk, mode: emailOk ? 'configured' : 'missing' },
    exports: { ok: exportsOk, mode: 'local-generated-files' },
    persistenceMode,
    warnings: getRuntimeWarnings(),
    queueDepth: listJobs().filter((job) => job.status === 'queued' || job.status === 'processing').length,
    security: { helmet: true, rateLimit: true, sentry: Boolean(sentry) }
  });
});
app.get('/api/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  const supabase = await supabaseHealthcheck();
  const openaiOk = Boolean(process.env.OPENAI_API_KEY);
  const emailOk = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const exportsOk = true;
  const persistenceMode = db?.mode || (allowLocalFallback ? 'local-fallback' : 'database-required');
  let status = 'healthy';
  if (!db.ok && allowLocalFallback) status = 'fallback';
  else if (!db.ok && !allowLocalFallback) status = 'down';
  else if ((redis.enabled && !redis.ok) || (supabase.enabled && !supabase.ok)) status = 'degraded';
  const ok = status !== 'down';
  res.status(ok ? 200 : 503).json({
    ok,
    status,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    db,
    redis,
    supabase,
    openai: { ok: openaiOk, mode: openaiOk ? 'configured' : 'missing' },
    email: { ok: emailOk, mode: emailOk ? 'configured' : 'missing' },
    exports: { ok: exportsOk, mode: 'local-generated-files' },
    persistenceMode,
    warnings: getRuntimeWarnings(),
    queueDepth: listJobs().filter((job) => job.status === 'queued' || job.status === 'processing').length,
    security: { helmet: true, rateLimit: true, sentry: Boolean(sentry) }
  });
});

function mountRoutes(router) {
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/career-path', careerPathRoutes);
  router.use('/applications', applicationsRoutes);
  router.use('/resources', resourcesRoutes);
  router.use('/resume', resumeRoutes);
  router.use('/job-ready', jobReadyRoutes);
  router.use('/assets', jobReadyRoutes);
  router.use('/linkedin', linkedinRoutes);
  router.use('/interview', interviewRoutes);
  router.use('/email', emailRoutes);
  router.use('/dashboard', dashboardRoutes);
  router.use('/ats', atsRouter);
  router.use('/exports', exportRouter);
  router.use('/interview/realtime', interviewRealtimeRouter);
  router.use('/jobs', jobsRouter);
  router.use('/growth', growthRouter);
  router.use('/market', marketRouter);
  router.use('/coach', coachRouter);
}

mountRoutes(app);
mountRoutes(api);
app.use('/api', api);

if (sentry && typeof sentry.setupExpressErrorHandler === 'function') {
  sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, _next) => {
  if (res.headersSent || req.requestTimedOut) return;
  const safe = toSafeError(err);
  trackError(req, safe, { details: safe.details || null });
  res.status(safe.statusCode || 500).json({ message: safe.message || 'Unexpected server error.', requestId: req.requestId, details: safe.details || undefined });
});

const PORT = env.PORT;
(async () => {
  try {
    assertProductionReadiness();
    await initPersistence();
  } catch (error) {
    process.stderr.write(`Startup blocked: ${error.message}\n`);
    process.exit(1);
  }
  app.listen(PORT, '0.0.0.0', () => {
    const warnings = getRuntimeWarnings();
    process.stdout.write(`JobNova backend running on http://0.0.0.0:${PORT}\n`);
    if (warnings.length) {
      process.stdout.write('Runtime warnings:\n');
      for (const warning of warnings) process.stdout.write(`- ${warning}\n`);
    }
  });
})();
