const express = require('express');
const {
  createUser,
  findUserByEmail,
  verifyPassword,
  issueSession,
  revokeSession,
  publicUser,
} = require('../data/store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

router.get('/provider-status', (_req, res) => {
  return res.json({
    localAuth: true,
    supabaseAuthConfigured: Boolean(
      process.env.SUPABASE_URL &&
        process.env.SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  });
});

async function handleLogin(req, res) {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const accessToken = await issueSession(user.id);
    return res.status(200).json({
      ok: true,
      accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not sign in.',
    });
  }
}

async function handleRegister(req, res) {
  try {
    const email = normalizeText(req.body?.email, '').toLowerCase();
    const password = normalizeText(req.body?.password, '');
    const fullName = normalizeText(req.body?.fullName, '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await createUser({ email, fullName, password });
    const accessToken = await issueSession(user.id);

    return res.status(201).json({
      ok: true,
      accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    const status = /already exists/i.test(String(error?.message || '')) ? 409 : 400;
    return res.status(status).json({
      message: error?.message || 'Could not create account.',
    });
  }
}

router.post('/login', handleLogin);
router.post('/sign-in', handleLogin);
router.post('/register', handleRegister);
router.post('/sign-up', handleRegister);

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json(publicUser(req.user));
});

router.post('/me', requireAuth, (req, res) => {
  return res.status(200).json(publicUser(req.user));
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await revokeSession(req.auth?.token || null);
    return res.status(200).json({
      ok: true,
      message: 'Signed out successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not sign out.',
    });
  }
});

module.exports = router;