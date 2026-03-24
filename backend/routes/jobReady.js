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

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extractTopKeywords(jobDescription = '') {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'you',
    'your',
    'are',
    'our',
    'from',
    'will',
    'have',
    'has',
    'not',
    'but',
    'all',
    'can',
    'who',
    'their',
    'they',
    'them',
    'into',
    'about',
    'role',
    'work',
    'team',
    'job',
    'position',
    'company',
    'candidate',
    'experience',
    'years',
    'year',
    'must',
    'should',
    'able',
    'using',
    'workplace',
    'required',
    'preferred',
  ]);

  const counts = new Map();

  String(jobDescription)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      if (word.length < 4) return;
      if (stopWords.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

function detectThemes(jobDescription = '') {
  const text = String(jobDescription || '').toLowerCase();

  return {
    leadership:
      /\blead|leadership|manage|manager|ownership|supervis/i.test(text),
    communication:
      /\bcommunicat|presentation|stakeholder|client|collaborat/i.test(text),
    analytics:
      /\bdata|analytics|report|dashboard|metrics|insight/i.test(text),
    project:
      /\bproject|timeline|deliverable|milestone|coordination/i.test(text),
    operations:
      /\bprocess|operations|workflow|efficiency|systems/i.test(text),
    people:
      /\btraining|coaching|support|hr|human resources|recruit/i.test(text),
  };
}

function buildResumeSuggestions(jobDescription, roleTitle) {
  const themes = detectThemes(jobDescription);
  const suggestions = [];

  if (themes.leadership) {
    suggestions.push(
      'Add one bullet that shows leadership, ownership, or decision-making under pressure.'
    );
  }

  if (themes.communication) {
    suggestions.push(
      'Highlight stakeholder communication, cross-functional collaboration, or client-facing impact.'
    );
  }

  if (themes.analytics) {
    suggestions.push(
      'Include measurable outcomes, reports, dashboards, or data-driven improvements.'
    );
  }

  if (themes.project) {
    suggestions.push(
      'Show how you planned, coordinated, or delivered projects against deadlines.'
    );
  }

  if (themes.operations) {
    suggestions.push(
      'Emphasize workflow improvement, process optimization, or operational efficiency.'
    );
  }

  if (themes.people) {
    suggestions.push(
      'Add examples of coaching, people support, hiring, onboarding, or HR-related contribution.'
    );
  }

  if (!suggestions.length) {
    suggestions.push(
      `Tailor your resume summary and top bullets specifically for the ${roleTitle || 'target'} role.`
    );
    suggestions.push('Use stronger action verbs and quantify results where possible.');
    suggestions.push('Mirror the employer’s most important keywords naturally.');
  }

  return suggestions.slice(0, 6);
}

function buildInterviewFocus(jobDescription, roleTitle, companyName) {
  const themes = detectThemes(jobDescription);
  const focus = [
    `Tell me about yourself and why you fit the ${roleTitle || 'role'}.`,
    `Why do you want to work at ${companyName || 'this company'}?`,
  ];

  if (themes.leadership) {
    focus.push('Describe a time you led a decision, project, or team outcome.');
  }

  if (themes.communication) {
    focus.push('Tell me about a time you handled stakeholder communication well.');
  }

  if (themes.analytics) {
    focus.push('Describe how you used data or reporting to improve a result.');
  }

  if (themes.project) {
    focus.push('Walk me through a project you delivered under pressure.');
  }

  if (themes.operations) {
    focus.push('Tell me about a process you improved and the impact it had.');
  }

  return [...new Set(focus)].slice(0, 5);
}

function buildCoverLetterGuidance(roleTitle, companyName, keywords) {
  return {
    opening:
      `Open with a direct statement of interest in the ${roleTitle || 'target'} role${companyName ? ` at ${companyName}` : ''} and one sentence on why you fit.`,
    body:
      'Use one paragraph for relevant strengths and one paragraph for measurable impact that aligns with the posting.',
    closing:
      'Close with confidence, interest in discussing value you can bring, and a professional call to action.',
    priorityKeywords: keywords.slice(0, 8),
  };
}

function buildApplicationChecklist(themes) {
  const checklist = [
    'Match your resume summary to the role title and employer priorities.',
    'Align 3 to 5 key bullets with the job posting before applying.',
    'Prepare a short answer for “Why this role?” and “Why this company?”',
  ];

  if (themes.communication) {
    checklist.push('Prepare a communication or stakeholder management example.');
  }
  if (themes.analytics) {
    checklist.push('Prepare one data-driven achievement with a measurable result.');
  }
  if (themes.project) {
    checklist.push('Prepare one project-delivery story using a clear STAR structure.');
  }
  if (themes.people) {
    checklist.push('Prepare an example showing support, coaching, HR, or people impact.');
  }

  checklist.push('Review your application for consistency in title, dates, and tone.');
  return checklist.slice(0, 7);
}

function buildMockExports({ roleTitle, companyName, fileNameBase, baseUrl }) {
  return [
    {
      type: 'json',
      label: 'Job-ready package data',
      fileName: `${fileNameBase}.json`,
      downloadUrl: `${baseUrl}/downloads/${fileNameBase}.json`,
    },
    {
      type: 'docx',
      label: `${roleTitle || 'Role'} application notes`,
      fileName: `${fileNameBase}.docx`,
      downloadUrl: `${baseUrl}/downloads/${fileNameBase}.docx`,
      note: `Use this as a structured coaching draft for ${companyName || 'the target employer'}.`,
    },
  ];
}

router.post('/job-ready-package', async (req, res) => {
  try {
    ensureGeneratedDir();

    const roleTitle = normalizeText(req.body?.roleTitle, 'Target Role');
    const companyName = normalizeText(req.body?.companyName, 'Target Company');
    const jobDescription = normalizeText(req.body?.jobDescription, '');
    const resumeText = normalizeText(req.body?.resumeText, '');
    const selectedTone = normalizeText(req.body?.tone, 'professional');

    const createdAt = new Date().toISOString();
    const stamp = Date.now();
    const roleSlug = slugify(roleTitle) || 'role';
    const companySlug = slugify(companyName) || 'company';
    const fileNameBase = `${roleSlug}-${companySlug}-${stamp}`;
    const packageId = `pkg-${stamp}`;

    const keywords = extractTopKeywords(jobDescription);
    const themes = detectThemes(jobDescription);
    const resumeSuggestions = buildResumeSuggestions(jobDescription, roleTitle);
    const interviewFocus = buildInterviewFocus(
      jobDescription,
      roleTitle,
      companyName
    );
    const coverLetterGuidance = buildCoverLetterGuidance(
      roleTitle,
      companyName,
      keywords
    );
    const applicationChecklist = buildApplicationChecklist(themes);

    const packagePayload = {
      ok: true,
      packageId,
      createdAt,
      roleTitle,
      companyName,
      tone: selectedTone,
      summary: `Job-ready package created for ${roleTitle} at ${companyName}.`,
      nextMilestone:
        'Strengthen the resume alignment, prepare 2-3 spoken interview stories, and tailor the final application before submitting.',
      roleSignals: {
        keywords,
        themes,
      },
      resumeSuggestions,
      interviewFocus,
      coverLetterGuidance,
      applicationChecklist,
      exportArtifacts: [],
      inputs: {
        hasJobDescription: Boolean(jobDescription),
        hasResumeText: Boolean(resumeText),
        jobDescriptionLength: jobDescription.length,
        resumeTextLength: resumeText.length,
      },
    };

    const jsonPath = path.join(GENERATED_DIR, `${fileNameBase}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(packagePayload, null, 2), 'utf8');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    packagePayload.exportArtifacts = buildMockExports({
      roleTitle,
      companyName,
      fileNameBase,
      baseUrl,
    });

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

    return res.status(200).json({
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

    return res.status(200).json({
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