const jwt = require('jsonwebtoken');
const { env, disableLocalAuth } = require('../config/env');
const {
  getUserByToken,
  ensureUserData,
  publicUser,
  attachExternalUser,
  preloadUser,
} = require('../data/store');
const { getSupabaseClient } = require('../lib/supabase');

function extractToken(headerValue = '') {
  const value = String(headerValue || '').trim();
  if (!value) return '';
  if (/^bearer\s+/i.test(value)) {
    return value.replace(/^bearer\s+/i, '').trim();
  }
  return value;
}

function signAppJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, authProvider: user.authProvider || 'local' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function verifyAppJwt(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function resolveLocalToken(token) {
  if (!token) return null;

  const sessionUser = await getUserByToken(token);
  if (sessionUser) {
    return {
      user: sessionUser,
      tokenType: 'local-session',
      appToken: signAppJwt(sessionUser),
    };
  }

  const decoded = verifyAppJwt(token);
  if (!decoded?.sub) return null;

  const { user } = await preloadUser(decoded.sub);
  if (user) {
    return {
      user,
      tokenType: 'app-jwt',
      appToken: token,
    };
  }

  return null;
}

async function resolveSupabaseToken(token) {
  if (!token) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) return null;

    const attached = await attachExternalUser({
      id: data.user.id,
      email: data.user.email,
      fullName:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email.split('@')[0],
      authProvider: 'supabase',
    });

    if (!attached) return null;

    return {
      user: attached,
      tokenType: 'supabase',
      appToken: signAppJwt(attached),
      supabaseUser: data.user,
    };
  } catch {
    return null;
  }
}

async function resolveBearerUser(token) {
  const local = await resolveLocalToken(token);
  if (local) return local.user;

  const supabase = await resolveSupabaseToken(token);
  if (supabase) return supabase.user;

  return null;
}

async function hydrateRequestAuth(req, options = { required: false }) {
  const token = extractToken(req.headers.authorization);

  req.auth = {
    token: token || null,
    tokenType: null,
    appToken: null,
    isAuthenticated: false,
  };

  if (!token) {
    req.user = null;
    req.userData = ensureUserData('guest');
    if (options.required) {
      return {
        ok: false,
        status: 401,
        body: { message: 'Authorization token is required.' },
      };
    }
    return { ok: true };
  }

  const local = await resolveLocalToken(token);
  if (local && !disableLocalAuth) {
    req.user = publicUser(local.user);
    req.userData = ensureUserData(local.user.id);
    req.auth = {
      token,
      tokenType: local.tokenType,
      appToken: local.appToken,
      isAuthenticated: true,
    };
    return { ok: true };
  }

  const supabase = await resolveSupabaseToken(token);
  if (supabase) {
    req.user = publicUser(supabase.user);
    req.userData = ensureUserData(supabase.user.id);
    req.auth = {
      token,
      tokenType: supabase.tokenType,
      appToken: supabase.appToken,
      isAuthenticated: true,
    };
    return { ok: true };
  }

  req.user = null;
  req.userData = ensureUserData('guest');

  if (options.required) {
    return {
      ok: false,
      status: 401,
      body: { message: 'Authentication failed or the token is no longer valid.' },
    };
  }

  return { ok: true };
}

async function requireAuth(req, res, next) {
  try {
    const result = await hydrateRequestAuth(req, { required: true });
    if (!result.ok) return res.status(result.status).json(result.body);
    return next();
  } catch (error) {
    return res.status(401).json({ message: error?.message || 'Authentication failed.' });
  }
}

async function optionalAuth(req, _res, next) {
  try {
    await hydrateRequestAuth(req, { required: false });
    return next();
  } catch {
    req.user = null;
    req.userData = ensureUserData('guest');
    req.auth = {
      token: null,
      tokenType: null,
      appToken: null,
      isAuthenticated: false,
    };
    return next();
  }
}

module.exports = {
  extractToken,
  signAppJwt,
  verifyAppJwt,
  resolveBearerUser,
  requireAuth,
  optionalAuth,
};