const express = require('express');
const { saveState, updateUser } = require('../data/store');
const { generateCareerPath } = require('../services/careerPathEngine');
const { syncUserState } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.post('/generate', async (req, res) => {
  try {
    const result = await generateCareerPath(req.body || {});
    const updatedUser = updateUser(req.user.id, { onboardingCompleted: true, targetRole: req.body?.profession || req.user.targetRole || '' });
    req.userData.careerPath = { id: `cp-${Date.now()}`, payload: req.body || {}, result, createdAt: new Date().toISOString() };
    saveState();
    await syncUserState(updatedUser, req.userData, 'career_path', req.userData.careerPath, req.userData.careerPath.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Career path generation failed.' });
  }
});

router.get('/latest', (req, res) => {
  return res.json(req.userData.careerPath || null);
});

module.exports = router;
