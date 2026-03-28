const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
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

function signToken(user) {
  const secret =
    process.env.JWT_SECRET || 'change_this_to_a_long_random_string';
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

function getStore() {
  return require('../data/store');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');
    const fullName = normalizeText(req.body?.fullName, '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long.',
      });
    }

    const store = getStore();

    const existingUser = await store.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const createdUser = await store.createUser({
      email,
      password,
      fullName: fullName || email.split('@')[0] || 'User',
      authProvider: 'local',
    });

    const token = signToken(createdUser);

    return res.status(201).json({
      ok: true,
      accessToken: token,
      user: toSafeUser(createdUser),
    });
  } catch (error) {
    console.error('[AUTH] register failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not register user.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const store = getStore();
    const user = await store.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const passwordOk = await store.verifyPassword(user, password);

    if (!passwordOk) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const refreshedUser = await store.updateUser(user.id, {
      updatedAt: new Date().toISOString(),
    });

    const token = signToken(refreshedUser || user);

    return res.status(200).json({
      ok: true,
      accessToken: token,
      user: toSafeUser(refreshedUser || user),
    });
  } catch (error) {
    console.error('[AUTH] login failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not sign in.',
    });
  }
});

// POST /api/auth/me
router.post('/me', async (req, res) => {
  try {
    const authHeader = normalizeText(req.headers.authorization, '');
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return res.status(401).json({
        message: 'Missing access token.',
      });
    }

    const secret =
      process.env.JWT_SECRET || 'change_this_to_a_long_random_string';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        message: 'Invalid or expired access token.',
      });
    }

    const userId = String(decoded?.sub || '');
    if (!userId) {
      return res.status(401).json({
        message: 'Invalid token payload.',
      });
    }

    const store = getStore();
    const preloadResult = await store.preloadUser(userId);
    const user = preloadResult?.user || null;

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      ok: true,
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error('[AUTH] me failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not load current user.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Signed out.',
  });
});

module.exports = router;