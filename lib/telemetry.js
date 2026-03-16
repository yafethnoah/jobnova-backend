
function log(level, message, meta = {}) {
  const record = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
  const line = JSON.stringify(record);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

function trackRequest(req, extra = {}) {
  log('info', 'request', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.userData?.id || null,
    ...extra
  });
}

function trackError(req, error, extra = {}) {
  log('error', 'request_error', {
    requestId: req?.requestId,
    method: req?.method,
    path: req?.originalUrl,
    userId: req?.userData?.id || null,
    message: error?.message,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    ...extra
  });
}

module.exports = { log, trackRequest, trackError };
