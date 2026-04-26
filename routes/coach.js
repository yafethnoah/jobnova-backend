const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { createCoachSession } = require('../services/coachEngine');

const coachRouter = express.Router();
coachRouter.use(optionalAuth);

coachRouter.post('/session', async (req, res) => {
  try {
    const data = await createCoachSession(req.body || {});
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not create coach session.' });
  }
});

module.exports = { coachRouter };
