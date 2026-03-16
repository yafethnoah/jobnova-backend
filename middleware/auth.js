const { getUserByToken, ensureUserData } = require('../data/store');

function extractToken(headerValue = '') {
  const [scheme, token] = String(headerValue).split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized. Please sign in again.' });
  }
  req.authToken = token;
  req.user = user;
  req.userData = ensureUserData(user.id);
  return next();
}

module.exports = { requireAuth, extractToken };
