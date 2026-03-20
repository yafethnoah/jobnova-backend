const express = require('express');
const {
  createUser,
  findUserByEmail,
  verifyPassword,
  issueSession,
  revokeSession,
  publicUser
} = require('../data/store');
const { requireAuth } = require('../middleware/auth');
const { getSupabaseAdmin, getSupabaseClient } = require('../lib/supabase');

const router = express.Router();

router.get('/provider-status', (_req, res) => {
  return res.json({
    localAuth: true,
    supabaseAuthConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  if (user && verifyPassword(password, user.passwordHash)) {
    const accessToken = issueSession(user.id);
    return res.json({ accessToken, user: publicUser(user), authProvider: 'local' });
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.user) {
        let localUser = findUserByEmail(email);
        if (!localUser) {
          localUser = createUser({ email, fullName: data.user.user_metadata?.full_name || email.split('@')[0], password: password || Math.random().toString(36) });
        }
        const accessToken = issueSession(localUser.id);
        return res.json({ accessToken, user: publicUser(localUser), authProvider: 'supabase' });
      }
    } catch {
      // fall through
    }
  }

  return res.status(401).json({ message: 'Invalid email or password.' });
});

router.post('/register', async (req, res) => {
  try {
    const { email, fullName, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || '' }
        });
      } catch {
        // non-fatal fallback to local account only
      }
    }

    const user = createUser({ email, fullName, password });
    const accessToken = issueSession(user.id);
    return res.json({ accessToken, user: publicUser(user), authProvider: admin ? 'local+supabase' : 'local' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not create account.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json(publicUser(req.user));
});

router.post('/logout', requireAuth, (req, res) => {
  revokeSession(req.authToken);
  return res.json({ success: true });
});

module.exports = router;
