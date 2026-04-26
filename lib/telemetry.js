const { captureException } = require('./sentry');

function log(level, message, meta = {}) {
  const record = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
  const line = JSON.stringify(record);
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

function trackRequest(req, extra = {}) {
  log('info', 'request', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.userData?.id || req.user?.id || null,
    ...extra
  });
}

function trackError(req, error, extra = {}) {
  const payload = {
    requestId: req?.requestId,
    method: req?.method,
    path: req?.originalUrl,
    userId: req?.userData?.id || req?.user?.id || null,
    message: error?.message,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    ...extra
  };
  log('error', 'request_error', payload);
  captureException(error, payload);
}

module.exports = { log, trackRequest, trackError };
