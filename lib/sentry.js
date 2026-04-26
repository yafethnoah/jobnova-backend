const { sentryEnabled, env } = require('../config/env');

let Sentry = null;
let initialized = false;

function initSentry() {
  if (!sentryEnabled || initialized) return null;
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
    environment: env.NODE_ENV,
    release: `jobnova-backend@${env.APP_VERSION}`
  });
  initialized = true;
  return Sentry;
}

function getSentry() {
  if (!initialized) return initSentry();
  return Sentry;
}

function captureException(error, context = {}) {
  const client = getSentry();
  if (!client) return;
  client.withScope((scope) => {
    for (const [key, value] of Object.entries(context || {})) scope.setExtra(key, value);
    client.captureException(error);
  });
}

module.exports = { initSentry, getSentry, captureException };
