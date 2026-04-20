const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { generateGrowthPlan, generateFinancialPlan } = require('../services/growthEngine');

const growthRouter = express.Router();
growthRouter.use(optionalAuth);

growthRouter.post('/plan', async (req, res) => {
  try {
    const plan = await generateGrowthPlan(req.body || {});
    return res.json(plan);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not generate growth plan.' });
  }
});

growthRouter.post('/financial-plan', async (req, res) => {
  try {
    const plan = await generateFinancialPlan(req.body || {});
    return res.json(plan);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not generate financial plan.' });
  }
});

module.exports = { growthRouter };
