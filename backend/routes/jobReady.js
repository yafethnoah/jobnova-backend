const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const GENERATED_DIR = path.join(__dirname, '..', 'data', 'generated');

function ensureGeneratedDir() {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function buildResumeSuggestions(jobDescription, roleTitle) {
  const base = normalizeText(jobDescription, '');
  const lowered = base.toLowerCase();

  const suggestions = [];

  if (lowered.includes('lead') || lowered.includes('leadership')) {
    suggestions.push('Emphasize leadership, ownership, and decision-making examples.');
  }

  if (lowered.includes('stakeholder')) {
    suggestions.push('Add stakeholder coordination and cross-functional collaboration examples.');
  }

  if (lowered.includes('communication')) {
    suggestions.push('Show written and verbal communication outcomes in your bullet points.');
  }

  if (lowered.includes('project')) {
    suggestions.push('Highlight planning, delivery timelines, and project execution results.');
  }

  if (lowered.includes('data') || lowered.includes('analytics')) {
    suggestions.push('Include measurable outcomes, reporting, or analysis experience.');
  }

  if (suggestions.length === 0) {
    suggestions.push(`Tailor your resume summary and bullets for the ${roleTitle || 'target'} role.`);
    suggestions.push('Use stronger action verbs and measurable outcomes.');
    suggestions.push('Mirror the most important keywords from the job description naturally.');
  }

  return suggestions;
}

router.post('/job-ready-package', async (req, res) => {
  try {
    ensureGeneratedDir();

    const roleTitle = normalizeText(req.body?.roleTitle, 'Target Role');
    const companyName = normalizeText(req.body?.companyName, 'Target Company');
    const jobDescription = normalizeText(req.body?.jobDescription, '');
    const resumeText = normalizeText(req.body?.resumeText, '');

    const createdAt = new Date().toISOString();
    const stamp = Date.now();
    const roleSlug = slugify(roleTitle) || 'role';
    const companySlug = slugify(companyName) || 'company';

    const packageId = `pkg-${stamp}`;

    const suggestions = buildResumeSuggestions(jobDescription, roleTitle);

    const packagePayload = {
      ok: true,
      packageId,
      roleTitle,
      companyName,
      createdAt,
      summary: `Job-ready package created for ${roleTitle} at ${companyName}.`,
      nextMilestone:
        'Strengthen your resume alignment so your applications start from a stronger base.',
      resumeSuggestions: suggestions,
      interviewFocus: [
        'Tell me about yourself',
        'Why this role?',
        'A project or achievement relevant to this position',
        'How you solve problems under pressure',
      ],
      exportArtifacts: [],
      inputs: {
        hasJobDescription: Boolean(jobDescription),
        hasResumeText: Boolean(resumeText),
      },
    };

    const jsonFileName = `${roleSlug}-${companySlug}-${stamp}.json`;
    const jsonPath = path.join(GENERATED_DIR, jsonFileName);

    fs.writeFileSync(jsonPath, JSON.stringify(packagePayload, null, 2), 'utf8');

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    packagePayload.exportArtifacts = [
      {
        type: 'json',
        label: 'Job-ready package data',
        fileName: jsonFileName,
        downloadUrl: `${baseUrl}/downloads/${jsonFileName}`,
      },
    ];

    return res.status(200).json(packagePayload);
  } catch (error) {
    console.error('job-ready-package error:', error);

    return res.status(500).json({
      ok: false,
      message: error?.message || 'Job-ready package generation failed.',
    });
  }
});

router.get('/job-ready-package/history', (_req, res) => {
  try {
    ensureGeneratedDir();

    const files = fs
      .readdirSync(GENERATED_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 20);

    return res.json({
      ok: true,
      items: files.map((fileName) => ({
        fileName,
        downloadUrl: `/downloads/${fileName}`,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Could not load package history.',
    });
  }
});

router.get('/export-library', (_req, res) => {
  try {
    ensureGeneratedDir();

    const files = fs
      .readdirSync(GENERATED_DIR)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 50);

    return res.json({
      ok: true,
      items: files.map((fileName) => ({
        fileName,
        url: `/downloads/${fileName}`,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Could not load export library.',
    });
  }
});

module.exports = router;