const express = require('express');
const path = require('path');
const { generateJobReady } = require('../services/jobReadyEngine');
const { createPackageBundle, GENERATED_DIR } = require('../services/exportService');
const { optionalAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const { enqueueUserSync } = require('../lib/cloudSync');
const { normalizeArtifactArray } = require('../lib/normalize');

const router = express.Router();

function canRespond(req, res) {
  return !req.requestTimedOut && !res.headersSent;
}

function ensureArray(value) {
  return normalizeArtifactArray(value);
}

function ensureUserData(req) {
  req.userData = req.userData || {};
  req.userData.resumeVersions = Array.isArray(req.userData.resumeVersions)
    ? req.userData.resumeVersions
    : [];
  req.userData.exportLibrary = Array.isArray(req.userData.exportLibrary)
    ? req.userData.exportLibrary
    : [];
}

router.use(optionalAuth);

router.post('/job-ready-package', async (req, res) => {
  try {
    const result = await generateJobReady(req.body || {});
    if (!canRespond(req, res)) return;

    ensureUserData(req);

    const entry = {
      id: `pkg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: result.roleTitle,
      companyName: result.companyName,
      payload: req.body || {},
      result,
      exportArtifacts: ensureArray(result.exportArtifacts),
    };

    req.userData.resumeVersions.unshift(entry);
    req.userData.resumeVersions = req.userData.resumeVersions.slice(0, 50);

    for (const artifact of ensureArray(entry.exportArtifacts)) {
      req.userData.exportLibrary.unshift({
        id: `exp-${Date.now()}-${artifact.fileName}`,
        createdAt: entry.createdAt,
        packageId: entry.id,
        targetRole: result.roleTitle,
        companyName: result.companyName,
        ...artifact,
      });
    }

    req.userData.exportLibrary = req.userData.exportLibrary.slice(0, 100);

    saveState();

    setImmediate(() => {
      enqueueUserSync(req.user, req.userData, 'job_ready_package', entry, entry.id);
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const exportArtifacts = ensureArray(result.exportArtifacts).map((artifact) => ({
      ...artifact,
      downloadUrl: artifact.downloadUrl || `${baseUrl}/downloads/${artifact.fileName}`,
    }));

    let packageBundleUrl;
    let packageBundleFileName;

    if (exportArtifacts.length) {
      const bundle = await createPackageBundle(
        result.roleTitle,
        result.companyName,
        exportArtifacts.map((artifact) => ({
          path: path.join(GENERATED_DIR, artifact.fileName),
        }))
      );

      if (!canRespond(req, res)) return;

      packageBundleUrl = `${baseUrl}/downloads/${bundle.fileName}`;
      packageBundleFileName = bundle.fileName;
    }

    if (!canRespond(req, res)) return;

    return res.json({
      ...result,
      exportArtifacts,
      packageId: entry.id,
      packageBundleUrl,
      packageBundleFileName,
    });
  } catch (error) {
    if (!canRespond(req, res)) return;

    return res.status(500).json({
      message: error.message || 'Job-ready package generation failed.',
    });
  }
});

router.get('/job-ready-package/history', (req, res) => {
  ensureUserData(req);

  const history = req.userData.resumeVersions.filter(
    (item) => item.id && String(item.id).startsWith('pkg-')
  );

  return res.json(history);
});

router.get('/export-library', (req, res) => {
  ensureUserData(req);
  return res.json(req.userData.exportLibrary);
});

module.exports = router;