
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateJobReady } = require('../services/jobReadyEngine');

const router = express.Router();
router.use(requireAuth);

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

router.post('/job-ready-package', async (req, res) => {
  try {
    const payload = {
      fullName: normalizeText(req.body?.fullName, 'Candidate'),
      targetRole: normalizeText(req.body?.targetRole || req.body?.roleTitle, 'Target Role'),
      roleTitle: normalizeText(req.body?.roleTitle || req.body?.targetRole, 'Target Role'),
      companyName: normalizeText(req.body?.companyName, 'Target Company'),
      jobDescription: normalizeText(req.body?.jobDescription),
      jobPostingUrl: normalizeText(req.body?.jobPostingUrl),
      resumeText: normalizeText(req.body?.resumeText),
      selectedExportFormat: normalizeText(req.body?.selectedExportFormat, 'both'),
      selectedResumeExportFormat: normalizeText(req.body?.selectedResumeExportFormat, 'both'),
      selectedCoverLetterExportFormat: normalizeText(req.body?.selectedCoverLetterExportFormat, 'both'),
      selectedRecruiterEmailExportFormat: normalizeText(req.body?.selectedRecruiterEmailExportFormat, 'both'),
      selectedResumeThemeId: normalizeText(req.body?.selectedResumeThemeId, 'classic-canadian-professional'),
      selectedLayoutMode: normalizeText(req.body?.selectedLayoutMode, 'one-page'),
      selectedResumeTemplateId: normalizeText(req.body?.selectedResumeTemplateId, 'classic-canadian-professional'),
      selectedCoverLetterTemplateId: normalizeText(req.body?.selectedCoverLetterTemplateId, 'canadian-standard-letter'),
    };

    if (!payload.resumeText) {
      return res.status(400).json({ message: 'resumeText is required.' });
    }

    if (!payload.jobDescription && !payload.jobPostingUrl) {
      return res.status(400).json({ message: 'Provide either a job description or a job posting URL.' });
    }

    const result = await generateJobReady(payload);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[JOB READY] package failed:', error);
    return res.status(500).json({ message: error?.message || 'Could not generate job-ready package.' });
  }
});

router.get('/job-ready-package/history', async (_req, res) => {
  return res.status(200).json({ ok: true, items: [] });
});

router.get('/export-library', async (_req, res) => {
  return res.status(200).json({ ok: true, items: [] });
});

module.exports = router;
