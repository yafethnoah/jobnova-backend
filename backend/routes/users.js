const express = require('express');
const { saveState, publicUser, updateUser } = require('../data/store');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/me', (req, res) => {
  return res.json(publicUser(req.user));
});

router.put('/me', async (req, res) => {
  const user = updateUser(req.user.id, req.body || {});
  enqueueUserSync(user, req.userData, 'profile', publicUser(user), user.id);
  return res.json(publicUser(user));
});

router.post('/onboarding', async (req, res) => {
  req.userData.onboarding = { ...req.userData.onboarding, ...(req.body || {}) };
  if (req.userData.onboarding.profession) {
    updateUser(req.user.id, { targetRole: req.userData.onboarding.profession });
  }
  saveState();
  enqueueUserSync(req.user, req.userData, 'onboarding', req.userData.onboarding, req.user.id);
  return res.json({ success: true });
});

router.get('/onboarding', (req, res) => {
  return res.json(req.userData.onboarding);
});

module.exports = router;
