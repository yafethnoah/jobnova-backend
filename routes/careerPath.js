const express = require('express');
const { saveState, updateUser } = require('../data/store');
const { generateCareerPath } = require('../services/careerPathEngine');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.post('/generate', async (req, res) => {
  try {
    const result = await generateCareerPath(req.body || {});
    const targetRole = req.body?.profession || req.body?.targetRole || req.user?.targetRole || '';
    const updatedUser = updateUser(req.user.id, {
      onboardingCompleted: true,
      targetRole,
    });

    req.userData.careerPath = {
      id: `cp-${Date.now()}`,
      payload: req.body || {},
      result,
      createdAt: new Date().toISOString(),
    };

    await saveState();
    enqueueUserSync(
      updatedUser,
      req.userData,
      'career_path',
      req.userData.careerPath,
      req.userData.careerPath.id
    );

    return res.json({ ok: true, result, careerPath: req.userData.careerPath, user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Career path generation failed.' });
  }
});

router.get('/latest', (req, res) => {
  return res.json(req.userData.careerPath || null);
});

module.exports = router;
