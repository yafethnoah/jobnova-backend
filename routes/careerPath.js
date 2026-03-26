const express = require('express');
const { saveState, updateUser } = require('../data/store');
const { generateCareerPath } = require('../services/careerPathEngine');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/generate', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication failed or the token is no longer valid.',
      });
    }

    const payload = req.body || {};
    const result = await generateCareerPath(payload);

    const updatedUser = updateUser(req.user.id, {
      onboardingCompleted: true,
      targetRole: payload.profession || req.user.targetRole || '',
    });

    req.userData.careerPath = {
      id: `cp-${Date.now()}`,
      payload,
      result,
      createdAt: new Date().toISOString(),
    };

    saveState();

    enqueueUserSync(
      updatedUser,
      req.userData,
      'career_path',
      req.userData.careerPath,
      req.userData.careerPath.id
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Career path generation failed.',
    });
  }
});

router.get('/latest', (req, res) => {
  return res.json(req.userData.careerPath || null);
});

module.exports = router;