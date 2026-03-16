const express = require('express');
const { generateJobReady } = require('../services/jobReadyEngine');
const { requireAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const { syncUserState } = require('../lib/cloudSync');
const router = express.Router();

router.use(requireAuth);

router.post('/job-ready-package', async (req, res) => {
  try {
    const result = await generateJobReady(req.body || {});
    const entry = {
      id: `pkg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: result.roleTitle,
      companyName: result.companyName,
      payload: req.body || {},
      result,
      exportArtifacts: result.exportArtifacts || []
    };
    req.userData.resumeVersions.unshift(entry);
    req.userData.resumeVersions = req.userData.resumeVersions.slice(0, 50);
    req.userData.exportLibrary = req.userData.exportLibrary || [];
    for (const artifact of entry.exportArtifacts) {
      req.userData.exportLibrary.unshift({
        id: `exp-${Date.now()}-${artifact.fileName}`,
        createdAt: entry.createdAt,
        packageId: entry.id,
        targetRole: result.roleTitle,
        companyName: result.companyName,
        ...artifact
      });
    }
    req.userData.exportLibrary = req.userData.exportLibrary.slice(0, 100);
    saveState();
    await syncUserState(req.user, req.userData, 'job_ready_package', entry, entry.id);
    return res.json({ ...result, packageId: entry.id });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Job-ready package generation failed.' });
  }
});

router.get('/job-ready-package/history', (req, res) => {
  const history = (req.userData.resumeVersions || []).filter((item) => item.id && String(item.id).startsWith('pkg-'));
  return res.json(history);
});

router.get('/export-library', (req, res) => {
  return res.json(req.userData.exportLibrary || []);
});

module.exports = router;
