const express = require('express');
const router = express.Router();

const { saveState, updateUser } = require('../data/store');
const { generateCareerPath } = require('../services/careerPathEngine');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/generate', async (req, res) => {
  try {
    const payload = {
      lifeStage: req.body?.lifeStage || '',
      profession: req.body?.profession || req.body?.targetRole || '',
      yearsExperience: req.body?.yearsExperience || '',
      educationLevel: req.body?.educationLevel || '',
      englishLevel: req.body?.englishLevel || '',
      frenchLevel: req.body?.frenchLevel || '',
      hasCanadianExperience: req.body?.hasCanadianExperience || false,
      targetGoal: req.body?.targetGoal || '',
      urgencyLevel: req.body?.urgencyLevel || 'medium',
    };

    let result;

    try {
      result = await generateCareerPath(payload);
    } catch (aiError) {
      console.error('AI FAILED → using fallback:', aiError.message);

      result = {
        summary: `Start with bridge roles aligned with ${payload.profession}. Build Canadian experience and transition to your target role.`,
        steps: [
          'Apply to entry/bridge roles',
          'Gain Canadian experience',
          'Upskill with certifications',
          'Network and transition to target role',
        ],
      };
    }

    const updatedUser = updateUser(req.user.id, {
      onboardingCompleted: true,
      targetRole: payload.profession,
    });

    req.userData.careerPath = {
      id: `cp-${Date.now()}`,
      payload,
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

    return res.json({
      ok: true,
      result,
      careerPath: req.userData.careerPath,
      user: updatedUser,
    });
  } catch (error) {
    console.error('FATAL ERROR:', error);
    return res.status(500).json({
      ok: false,
      message: 'Career path generation failed',
      error: error.message,
    });
  }
});

router.get('/latest', (req, res) => {
  return res.json(req.userData.careerPath || null);
});

module.exports = router;