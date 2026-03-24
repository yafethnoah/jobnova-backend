try {
  require('dotenv').config();
} catch (_) {
  // Render injects env vars directly in production
}

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const {
  env,
  getRuntimeWarnings,
  assertProductionReadiness,
  allowLocalFallback,
} = require('./config/env');

const { healthcheck } = require('./lib/db');
const { redisHealthcheck } = require('./lib/redis');
const { supabaseHealthcheck } = require('./lib/supabase');
const { listJobs } = require('./lib/jobQueue');
const { requestContext } = require('./middleware/requestContext');
const { trackError, trackRequest } = require('./lib/telemetry');
const { toSafeError } = require('./lib/errors');
const { initPersistence } = require('./data/store');
const { initSentry, getSentry } = require('./lib/sentry');

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

initSentry();

const app = express();
const sentry = getSentry();

const corsOrigin = env.CORS_ORIGIN || '*';
const allowedOrigins =
  corsOrigin === '*'
    ? true
    : corsOrigin
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.API_RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/auth',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.AUTH_RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/resume/upload',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.UPLOAD_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);

app.use((req, _res, next) => {
  trackRequest(req);
  next();
});

if (sentry) {
  app.use(
    sentry.Handlers
      ? sentry.Handlers.requestHandler()
      : (_req, _res, next) => next()
  );
}

app.use('/downloads', express.static(path.join(__dirname, 'data', 'generated')));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    health: '/health',
    endpoints: [
      '/auth',
      '/api/auth',
      '/users',
      '/api/users',
      '/resume',
      '/assets',
      '/api/job-ready',
      '/interview',
      '/jobs',
    ],
  });
});

app.get('/test', (_req, res) => {
  res.json({
    ok: true,
    message: 'Backend working',
  });
});

app.get('/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  const supabase = await supabaseHealthcheck();
  const openaiOk = Boolean(process.env.OPENAI_API_KEY);
  const emailOk = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const exportsOk = true;

  const persistenceMode =
    db?.mode || (allowLocalFallback ? 'local-fallback' : 'database-required');

  let status = 'healthy';
  if (!db.ok && allowLocalFallback) status = 'fallback';
  else if (!db.ok && !allowLocalFallback) status = 'down';
  else if ((redis.enabled && !redis.ok) || (supabase.enabled && !supabase.ok))
    status = 'degraded';

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
    queueDepth: listJobs().filter(
      (job) => job.status === 'queued' || job.status === 'processing'
    ).length,
    security: {
      helmet: true,
      rateLimit: true,
      sentry: Boolean(sentry),
    },
  });
});

// AUTH
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// USERS
app.use('/users', userRoutes);
app.use('/api/users', userRoutes);

// OTHER CORE ROUTES
app.use('/career-path', careerPathRoutes);
app.use('/applications', applicationsRoutes);
app.use('/resources', resourcesRoutes);
app.use('/resume', resumeRoutes);

// JOB READY
app.use('/assets', jobReadyRoutes);
app.use('/api/job-ready', jobReadyRoutes);

// REMAINING ROUTES
app.use('/linkedin', linkedinRoutes);
app.use('/interview', interviewRoutes);
app.use('/email', emailRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ats', atsRouter);
app.use('/exports', exportRouter);
app.use('/interview/realtime', interviewRealtimeRouter);
app.use('/jobs', jobsRouter);

if (sentry && typeof sentry.setupExpressErrorHandler === 'function') {
  sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, _next) => {
  if (res.headersSent || req.requestTimedOut) return;

  const safe = toSafeError(err);
  trackError(req, safe, { details: safe.details || null });

  res.status(safe.statusCode || 500).json({
    message: safe.message || 'Unexpected server error.',
    requestId: req.requestId,
    details: safe.details || undefined,
  });
});

const PORT = env.PORT;

(async () => {
  try {
    assertProductionReadiness();
    await initPersistence();
  } catch (error) {
    console.error('Startup blocked:', error.message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    const warnings = getRuntimeWarnings();
    console.log(`JobNova backend running on http://0.0.0.0:${PORT}`);

    if (warnings.length) {
      console.warn('Runtime warnings:');
      for (const warning of warnings) {
        console.warn(`- ${warning}`);
      }
    }
  });
})();