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
  try {
    return require('../data/store');
  } catch {
    return {};
  }
}

function getUsersArrayFromStore(storeModule) {
  if (!storeModule) return [];

  if (Array.isArray(storeModule.users)) return storeModule.users;
  if (storeModule.state && Array.isArray(storeModule.state.users)) {
    return storeModule.state.users;
  }
  if (
    typeof storeModule.getState === 'function' &&
    Array.isArray(storeModule.getState()?.users)
  ) {
    return storeModule.getState().users;
  }

  return [];
}

function ensureUsersArray(storeModule) {
  if (!storeModule) return [];

  if (Array.isArray(storeModule.users)) return storeModule.users;

  if (storeModule.state) {
    if (!Array.isArray(storeModule.state.users)) storeModule.state.users = [];
    return storeModule.state.users;
  }

  if (typeof storeModule.getState === 'function') {
    const state = storeModule.getState();
    if (!Array.isArray(state.users)) state.users = [];
    return state.users;
  }

  storeModule.users = [];
  return storeModule.users;
}

function persistStore(storeModule) {
  try {
    if (typeof storeModule.saveState === 'function') {
      storeModule.saveState();
    }
  } catch {}
}

function makeUser({
  email,
  password,
  fullName,
}) {
  const now = new Date().toISOString();

  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    email,
    password,
    fullName: normalizeText(fullName, email.split('@')[0] || 'User'),
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
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

    const storeModule = getStore();
    const users = ensureUsersArray(storeModule);

    const existing = users.find(
      (user) => String(user.email || '').toLowerCase() === email
    );

    if (existing) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const newUser = makeUser({
      email,
      password,
      fullName,
    });

    users.unshift(newUser);
    persistStore(storeModule);

    const token = signToken(newUser);

    return res.status(201).json({
      ok: true,
      accessToken: token,
      user: toSafeUser(newUser),
    });
  } catch (error) {
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

    const storeModule = getStore();
    const users = getUsersArrayFromStore(storeModule);

    const user = users.find(
      (item) =>
        String(item.email || '').toLowerCase() === email &&
        String(item.password || '') === password
    );

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    user.updatedAt = new Date().toISOString();
    persistStore(storeModule);

    const token = signToken(user);

    return res.status(200).json({
      ok: true,
      accessToken: token,
      user: toSafeUser(user),
    });
  } catch (error) {
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

    const storeModule = getStore();
    const users = getUsersArrayFromStore(storeModule);
    const user = users.find((item) => String(item.id) === userId);

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
    return res.status(500).json({
      message: error?.message || 'Could not load current user.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Signed out successfully.',
  });
});

module.exports = router;