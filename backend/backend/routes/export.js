
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const { generateExportBundle } = require('../services/atsService');
const { createExportTestBundle } = require('../services/exportService');
const { exportSchema, parse } = require('../lib/validation');
const { enqueue } = require('../lib/jobQueue');

const router = express.Router();
router.use(requireAuth);

router.post('/resume', async (req, res, next) => {
  try {
    const input = parse(exportSchema, req.body);
    const job = await enqueue('resume-export', { userId: req.user?.id || null, targetRole: input.targetRole });
    const bundle = await generateExportBundle(input);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const files = bundle.files.map((file) => ({
      ...file,
      url: `${baseUrl}/downloads/${file.fileName}`
    }));
    req.userData.exportLibrary = req.userData.exportLibrary || [];
    const record = {
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: input.targetRole,
      companyName: input.companyName || '',
      config: {
        theme: input.resumeThemeId,
        layout: input.layoutMode,
        exportType: input.selectedExportFormat
      },
      queueJobId: job.id,
      files
    };
    req.userData.exportLibrary.unshift(record);
    req.userData.exportLibrary = req.userData.exportLibrary.slice(0, 50);
    saveState();
    res.json({ ...record, packageResult: bundle.packageResult });
  } catch (error) {
    next(error);
  }
});


router.get('/test', async (req, res, next) => {
  try {
    const theme = String(req.query.theme || process.env.EXPORT_TEST_THEME || 'classic-canadian-professional');
    const layout = String(req.query.layout || process.env.EXPORT_TEST_LAYOUT || 'one-page');
    const files = await createExportTestBundle({ theme, layout });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      ok: true,
      theme,
      layout,
      files: files.map((file) => ({ ...file, url: `${baseUrl}/downloads/${file.fileName}` }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/library', (req, res) => {
  res.json(req.userData.exportLibrary || []);
});

module.exports = { exportRouter: router };
