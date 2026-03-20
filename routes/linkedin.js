const express = require('express');
const { optimizeLinkedIn } = require('../services/linkedinEngine');
const { syncUserState } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.post('/optimize', async (req, res) => {
  try {
    const result = await optimizeLinkedIn(req.body || {});
    await syncUserState(req.user, req.userData, 'linkedin_optimization', { payload: req.body || {}, result }, `li-${Date.now()}`);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'LinkedIn optimization failed.' });
  }
});

module.exports = router;
