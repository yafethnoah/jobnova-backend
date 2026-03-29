const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'change_this_to_a_long_random_string';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    secret,
    { expiresIn }
  );
}

function toSafeUser(record = {}) {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    onboardingCompleted: Boolean(record.onboardingCompleted),
    targetRole: record.targetRole || '',
    location: record.location || '',
    summary: record.summary || '',
    authProvider: record.authProvider || 'local',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function getStore() {
  try {
    return require('../data/store');
  } catch {
    return null;
  }
}

async function registerUser({ email, password, fullName }) {
  const store = getStore();
  if (!store?.createUser || !store?.issueSession) {
    throw new Error('Store layer is not available.');
  }

  const existing = await store.findUserByEmail(email);
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const user = await store.createUser({
    email,
    password,
    fullName,
    authProvider: 'local',
  });
  const accessToken = signToken(user);
  await store.issueSession(user.id);

  return {
    ok: true,
    accessToken,
    user: toSafeUser(user),
  };
}

async function loginUser({ email, password }) {
  const store = getStore();
  if (!store?.findUserByEmail || !store?.verifyPassword || !store?.issueSession) {
    throw new Error('Store layer is not available.');
  }

  const user = await store.findUserByEmail(email);
  const passwordOk = Boolean(user?.passwordHash) && store.verifyPassword(password, user.passwordHash);

  if (!user || !passwordOk) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = signToken(user);
  await store.issueSession(user.id);

  return {
    ok: true,
    accessToken,
    user: toSafeUser(user),
  };
}

async function meFromToken(token) {
  const store = getStore();
  if (!store?.getUserByToken) {
    throw new Error('Store layer is not available.');
  }

  const user = await store.getUserByToken(token);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ok: true,
    user: toSafeUser(user),
  };
}

router.post('/register', async (req, res) => {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');
    const fullName = normalizeText(req.body?.fullName, '');

    if (!email || !password || !fullName) {
      return res.status(400).json({ ok: false, message: 'Full name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters long.' });
    }

    const payload = await registerUser({ email, password, fullName });
    return res.status(201).json(payload);
  } catch (error) {
    console.error('auth register error:', error);
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Could not register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password are required.' });
    }

    const payload = await loginUser({ email, password });
    return res.status(200).json(payload);
  } catch (error) {
    console.error('auth login error:', error);
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Could not sign in.' });
  }
});

router.post('/me', async (req, res) => {
  try {
    const authHeader = normalizeText(req.headers.authorization, '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ ok: false, message: 'Missing access token.' });
    }

    const secret = process.env.JWT_SECRET || 'change_this_to_a_long_random_string';
    try {
      jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ ok: false, message: 'Invalid or expired access token.' });
    }

    const payload = await meFromToken(token);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('auth me error:', error);
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Could not load current user.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = normalizeText(req.headers.authorization, '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const store = getStore();
    if (token && store?.revokeSession) {
      await store.revokeSession(token);
    }
    return res.status(200).json({ ok: true, message: 'Signed out.' });
  } catch (error) {
    console.error('auth logout error:', error);
    return res.status(500).json({ ok: false, message: 'Could not sign out.' });
  }
});

module.exports = router;
