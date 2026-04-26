const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { buildDashboard } = require('../lib/dashboard');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  return res.json(buildDashboard(req.user, req.userData));
});

module.exports = router;
