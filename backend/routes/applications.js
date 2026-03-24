const express = require('express');
const { saveState } = require('../data/store');
const { enqueueUserSync } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => res.json(req.userData.applications));
router.get('/:id', (req, res) => {
  const item = req.userData.applications.find((app) => app.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Application not found.' });
  return res.json(item);
});
router.post('/', async (req, res) => {
  const item = { id: `app-${Date.now()}`, userId: req.user.id, createdAt: new Date().toISOString(), ...(req.body || {}) };
  req.userData.applications.unshift(item);
  saveState();
  enqueueUserSync(req.user, req.userData, 'application', item, item.id);
  return res.json(item);
});
router.patch('/:id', async (req, res) => {
  const index = req.userData.applications.findIndex((app) => app.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Application not found.' });
  req.userData.applications[index] = { ...req.userData.applications[index], ...(req.body || {}), updatedAt: new Date().toISOString() };
  saveState();
  enqueueUserSync(req.user, req.userData, 'application', req.userData.applications[index], req.userData.applications[index].id);
  return res.json(req.userData.applications[index]);
});
router.delete('/:id', async (req, res) => {
  const index = req.userData.applications.findIndex((app) => app.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Application not found.' });
  const [deleted] = req.userData.applications.splice(index, 1);
  saveState();
  enqueueUserSync(req.user, req.userData, 'application_deleted', deleted || { id: req.params.id }, req.params.id);
  return res.json({ success: true });
});

module.exports = router;
