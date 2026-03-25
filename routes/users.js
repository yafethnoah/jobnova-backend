const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { updateUser, saveState } = require('../data/store');

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

function toSafeUser(record = {}) {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    onboardingCompleted: Boolean(record.onboardingCompleted),
    onboarding: record.onboarding || null,
    preferences: record.preferences || {},
    targetRole: record.targetRole || '',
    location: record.location || '',
    summary: record.summary || '',
    authProvider: record.authProvider || 'local',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
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

router.use(requireAuth);

router.get('/me', async (req, res) => {
  return res.status(200).json({ ok: true, user: toSafeUser(req.user) });
});

router.post('/onboarding', async (req, res) => {
  try {
    const onboarding = buildOnboardingPayload(req.body || {});
    const currentUser = req.user || {};
    const userData = req.userData || {};

    userData.onboarding = onboarding;

    const updatedUser = updateUser(currentUser.id, {
      onboardingCompleted: true,
      targetRole: onboarding.targetRole || currentUser.targetRole || '',
      location: [onboarding.city, onboarding.province, onboarding.country]
        .filter(Boolean)
        .join(', '),
    });

    await saveState();

    return res.status(200).json({
      ok: true,
      message: 'Onboarding saved successfully.',
      user: toSafeUser({ ...updatedUser, onboarding }),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Could not save onboarding.' });
  }
});

router.patch('/profile', async (req, res) => {
  try {
    const currentUser = req.user || {};
    const fullName = normalizeText(req.body?.fullName, currentUser.fullName || '');
    const targetRole = normalizeText(req.body?.targetRole, currentUser.targetRole || '');
    const location = normalizeText(req.body?.location, currentUser.location || '');
    const summary = normalizeText(req.body?.summary, currentUser.summary || '');

    const updatedUser = updateUser(currentUser.id, {
      fullName: fullName || currentUser.fullName,
      targetRole,
      location,
      summary,
    });

    await saveState();

    return res.status(200).json({
      ok: true,
      message: 'Profile updated successfully.',
      user: toSafeUser({ ...updatedUser, onboarding: req.userData?.onboarding || null, preferences: req.userData?.preferences || {} }),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Could not update profile.' });
  }
});

router.patch('/preferences', async (req, res) => {
  try {
    const userData = req.userData || {};
    const currentPreferences = userData.preferences && typeof userData.preferences === 'object'
      ? userData.preferences
      : {};

    userData.preferences = {
      ...currentPreferences,
      ...buildPreferencesPayload(req.body || {}),
    };

    await saveState();

    return res.status(200).json({
      ok: true,
      message: 'Preferences updated successfully.',
      preferences: userData.preferences,
      user: toSafeUser({ ...req.user, onboarding: userData.onboarding || null, preferences: userData.preferences }),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Could not update preferences.' });
  }
});

router.get('/preferences', async (req, res) => {
  return res.status(200).json({ ok: true, preferences: req.userData?.preferences || {} });
});

module.exports = router;
