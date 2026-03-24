require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

const jobReadyRoutes = require('./routes/jobReady');

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const allowedOrigins =
  CORS_ORIGIN === '*'
    ? true
    : CORS_ORIGIN.split(',')
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
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const generatedDir = path.join(__dirname, 'data', 'generated');

app.use('/downloads', express.static(generatedDir));
app.use('/api/downloads', express.static(generatedDir));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'jobnova-backend',
    message: 'Backend is running',
    health: '/health',
    apiBase: '/api',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'jobnova-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req, res) => {
  res.json({
    ok: true,
    service: 'jobnova-backend',
    apiBase: '/api',
    routes: ['/api/job-ready'],
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'jobnova-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount the route exactly where the frontend expects it:
// POST /api/job-ready/job-ready-package
app.use('/job-ready', jobReadyRoutes);
app.use('/api/job-ready', jobReadyRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((error, _req, res, _next) => {
  console.error('Server error:', error);

  res.status(500).json({
    ok: false,
    message: error?.message || 'Unexpected server error.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`JobNova backend running on http://0.0.0.0:${PORT}`);
});