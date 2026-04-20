const express = require('express');
const { saveState, updateUser } = require('../data/store');
const { generateCareerPath } = require('../services/careerPathEngine');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await generateCareerPath(payload);

    const profession = typeof payload.profession === 'string' ? payload.profession.trim() : '';
    const updatedUser = updateUser(req.user.id, {
      onboardingCompleted: true,
      targetRole: profession || req.user.targetRole || '',
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

    return res.json({
      ...result,
      saved: true,
      user: {
        id: updatedUser.id,
        onboardingCompleted: Boolean(updatedUser.onboardingCompleted),
        targetRole: updatedUser.targetRole || '',
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Career path generation failed.',
    });
  }
});

router.get('/latest', requireAuth, (req, res) => {
  return res.json(req.userData.careerPath || null);
});

module.exports = router;
