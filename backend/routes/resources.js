const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', (req, res) => res.json(req.userData.resources));
module.exports = router;
