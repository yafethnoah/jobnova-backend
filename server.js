
require('dotenv').config();
const { env, getRuntimeWarnings } = require('./config/env');

const express = require('express');
const cors = require('cors');

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
const { requestContext } = require('./middleware/requestContext');
const { trackError } = require('./lib/telemetry');
const { toSafeError } = require('./lib/errors');
const { healthcheck } = require('./lib/db');
const { listJobs } = require('./lib/jobQueue');
const { redisHealthcheck } = require('./lib/redis');
const { jobsRouter } = require('./routes/jobs');

const app = express();
const corsOrigin = env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }));
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);
app.use('/downloads', express.static(require('path').join(__dirname, 'data', 'generated')));

app.get('/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  res.json({
    ok: true,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    db,
    redis,
    queueDepth: listJobs().filter((job) => job.status === 'queued' || job.status === 'processing').length
  });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/career-path', careerPathRoutes);
app.use('/applications', applicationsRoutes);
app.use('/resources', resourcesRoutes);
app.use('/resume', resumeRoutes);
app.use('/assets', jobReadyRoutes);
app.use('/linkedin', linkedinRoutes);
app.use('/interview', interviewRoutes);
app.use('/email', emailRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ats', atsRouter);
app.use('/exports', exportRouter);
app.use('/interview/realtime', interviewRealtimeRouter);
app.use('/jobs', jobsRouter);

app.use((err, req, res, _next) => {
  const safe = toSafeError(err);
  trackError(req, safe, { details: safe.details || null });
  res.status(safe.statusCode || 500).json({
    message: safe.message || 'Unexpected server error.',
    requestId: req.requestId,
    details: safe.details || undefined
  });
});

const PORT = env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  const warnings = getRuntimeWarnings();
  console.log(`JobNova backend running on http://0.0.0.0:${PORT}`);
  if (warnings.length) {
    console.warn('Runtime warnings:');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
});
