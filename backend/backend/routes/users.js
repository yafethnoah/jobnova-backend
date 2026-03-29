const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function normalizeBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
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

function toSafeUser(record = {}) {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    onboardingCompleted: Boolean(record.onboardingCompleted),
    onboarding: record.onboarding || null,
    preferences: record.preferences || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function getTokenFromRequest(req) {
  const authHeader = normalizeText(req.headers.authorization, '');
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

function verifyToken(token) {
  const secret =
    process.env.JWT_SECRET || 'change_this_to_a_long_random_string';
  return jwt.verify(token, secret);
}

function findAuthenticatedUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { error: 'Missing access token.', status: 401 };
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return { error: 'Invalid or expired access token.', status: 401 };
  }

  const userId = String(decoded?.sub || '');
  if (!userId) {
    return { error: 'Invalid token payload.', status: 401 };
  }

  const storeModule = getStore();
  const users = ensureUsersArray(storeModule);
  const user = users.find((item) => String(item.id) === userId);

  if (!user) {
    return { error: 'User not found.', status: 404 };
  }

  return { user, storeModule, users };
}

function buildOnboardingPayload(body = {}) {
  return {
    lifeStage: normalizeText(body.lifeStage, ''),
    targetRole: normalizeText(body.targetRole, ''),
    country: normalizeText(body.country, ''),
    province: normalizeText(body.province, ''),
    city: normalizeText(body.city, ''),
    workStatus: normalizeText(body.workStatus, ''),
    yearsOfExperience: normalizeText(body.yearsOfExperience, ''),
    industry: normalizeText(body.industry, ''),
    strengths: Array.isArray(body.strengths)
      ? body.strengths.map((item) => normalizeText(item, '')).filter(Boolean)
      : [],
    barriers: Array.isArray(body.barriers)
      ? body.barriers.map((item) => normalizeText(item, '')).filter(Boolean)
      : [],
    goals: Array.isArray(body.goals)
      ? body.goals.map((item) => normalizeText(item, '')).filter(Boolean)
      : [],
    notes: normalizeText(body.notes, ''),
  };
}

function buildPreferencesPayload(body = {}) {
  return {
    speakerMode: normalizeText(body.speakerMode, ''),
    recruiterVoice: normalizeText(body.recruiterVoice, ''),
    microphoneMode: normalizeText(body.microphoneMode, ''),
    recordingQuality: normalizeText(body.recordingQuality, ''),
    theme: normalizeText(body.theme, ''),
    notificationsEnabled: normalizeBool(body.notificationsEnabled, true),
  };
}

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const auth = findAuthenticatedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    return res.status(200).json({
      ok: true,
      user: toSafeUser(auth.user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not load user profile.',
    });
  }
});

// POST /api/users/onboarding
router.post('/onboarding', async (req, res) => {
  try {
    const auth = findAuthenticatedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    const onboarding = buildOnboardingPayload(req.body || {});
    const user = auth.user;

    user.onboarding = onboarding;
    user.onboardingCompleted = true;
    user.updatedAt = new Date().toISOString();

    persistStore(auth.storeModule);

    return res.status(200).json({
      ok: true,
      message: 'Onboarding saved successfully.',
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not save onboarding.',
    });
  }
});

// PATCH /api/users/profile
router.patch('/profile', async (req, res) => {
  try {
    const auth = findAuthenticatedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    const user = auth.user;

    const fullName = normalizeText(req.body?.fullName, user.fullName || '');
    const email = normalizeText(req.body?.email, user.email || '').toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const duplicate = auth.users.find(
      (item) =>
        String(item.id) !== String(user.id) &&
        String(item.email || '').toLowerCase() === email
    );

    if (duplicate) {
      return res.status(409).json({
        message: 'Another user already uses this email.',
      });
    }

    user.fullName = fullName || user.fullName;
    user.email = email;
    user.updatedAt = new Date().toISOString();

    persistStore(auth.storeModule);

    return res.status(200).json({
      ok: true,
      message: 'Profile updated successfully.',
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not update profile.',
    });
  }
});

// PATCH /api/users/preferences
router.patch('/preferences', async (req, res) => {
  try {
    const auth = findAuthenticatedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    const user = auth.user;
    const currentPreferences =
      user.preferences && typeof user.preferences === 'object'
        ? user.preferences
        : {};

    user.preferences = {
      ...currentPreferences,
      ...buildPreferencesPayload(req.body || {}),
    };
    user.updatedAt = new Date().toISOString();

    persistStore(auth.storeModule);

    return res.status(200).json({
      ok: true,
      message: 'Preferences updated successfully.',
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not update preferences.',
    });
  }
});

// GET /api/users/preferences
router.get('/preferences', async (req, res) => {
  try {
    const auth = findAuthenticatedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    return res.status(200).json({
      ok: true,
      preferences: auth.user.preferences || {},
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not load preferences.',
    });
  }
});

module.exports = router;