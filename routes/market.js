const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { getMarketInsights } = require('../services/marketIntelligence');

const marketRouter = express.Router();
marketRouter.use(optionalAuth);

marketRouter.post('/insights', async (req, res) => {
  try {
    const data = await getMarketInsights(req.body || {});
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not generate market insights.' });
  }
});

module.exports = { marketRouter };
