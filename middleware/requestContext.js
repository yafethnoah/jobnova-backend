
const crypto = require('crypto');
const { trackRequest } = require('../lib/telemetry');

function requestContext(req, res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  trackRequest(req);
  next();
}

module.exports = { requestContext };
