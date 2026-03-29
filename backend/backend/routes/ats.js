
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const { compareResumeToJob, generateTailoredResume, generateApplicationPackage } = require('../services/atsService');
const { compareSchema, rewriteSchema, parse } = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

router.post('/compare', async (req, res, next) => {
  try {
    const input = parse(compareSchema, req.body);
    const result = await compareResumeToJob(input);
    req.userData.atsResults = req.userData.atsResults || [];
    const record = {
      id: `ats-${Date.now()}`,
      createdAt: new Date().toISOString(),
      input: {
        targetRole: input.targetRole,
        companyName: input.companyName || ''
      },
      result
    };
    req.userData.atsResults.unshift(record);
    req.userData.atsResults = req.userData.atsResults.slice(0, 50);
    saveState();
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/rewrite', async (req, res, next) => {
  try {
    const input = parse(rewriteSchema, req.body);
    const result = await generateTailoredResume(input);
    req.userData.resumeVersions = req.userData.resumeVersions || [];
    const record = {
      id: `rv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: input.targetRole,
      companyName: input.companyName || '',
      result
    };
    req.userData.resumeVersions.unshift(record);
    req.userData.resumeVersions = req.userData.resumeVersions.slice(0, 50);
    saveState();
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/package', async (req, res, next) => {
  try {
    const input = parse(rewriteSchema, req.body);
    const result = await generateApplicationPackage(input);
    req.userData.autopilotPackages = req.userData.autopilotPackages || [];
    const record = {
      id: `pkg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: input.targetRole,
      companyName: input.companyName || '',
      result
    };
    req.userData.autopilotPackages.unshift(record);
    req.userData.autopilotPackages = req.userData.autopilotPackages.slice(0, 50);
    saveState();
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.get('/history', (req, res) => {
  res.json({
    atsResults: req.userData.atsResults || [],
    autopilotPackages: req.userData.autopilotPackages || []
  });
});

module.exports = { atsRouter: router };
