
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { parseResumeBuffer } = require('../services/fileParser');
const { parseJobPostingUrl } = require('../services/jobPostParser');
const { compareResumeToJob, generateTailoredResume } = require('../services/atsService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads', 'resume');
fs.mkdirSync(uploadsDir, { recursive: true });

router.use(requireAuth);

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

router.post('/rewrite', async (req, res) => {
  try {
    const resumeText = normalizeText(req.body?.resumeText);
    const targetRole = normalizeText(req.body?.targetRole, 'Target Role');
    const jobDescription = normalizeText(req.body?.jobDescription);

    if (!resumeText) {
      return res.status(400).json({ message: 'resumeText is required.' });
    }

    const result = await generateTailoredResume({ resumeText, targetRole, jobDescription });

    return res.status(200).json({
      success: true,
      rewrittenText: result.rewrittenResume,
      summary: result.summary,
      improvedBullets: result.improvedBullets || [],
      optimizedSkills: result.optimizedSkills || [],
      truthGuardNote: result.truthGuardNote,
      suggestions: result.ats?.topImprovements || result.roleAlignmentNotes || [],
      ats: result.ats || null,
    });
  } catch (error) {
    console.error('[RESUME] rewrite failed:', error);
    return res.status(500).json({ message: error?.message || 'Resume rewrite failed.' });
  }
});

router.post('/ats-check', async (req, res) => {
  try {
    const resumeText = normalizeText(req.body?.resumeText);
    const jobDescription = normalizeText(req.body?.jobDescription);
    const targetRole = normalizeText(req.body?.targetRole);
    const companyName = normalizeText(req.body?.companyName);

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: 'resumeText and jobDescription are required.' });
    }

    const result = await compareResumeToJob({ resumeText, jobDescription, targetRole, companyName });

    return res.status(200).json({
      success: true,
      score: result.overallScore,
      overallScore: result.overallScore,
      keywordScore: result.keywordScore,
      skillsScore: result.skillsScore,
      titleScore: result.titleScore,
      experienceScore: result.experienceScore,
      formattingScore: result.formattingScore,
      seniorityScore: result.seniorityScore,
      matchedKeywords: result.matchedKeywords || [],
      missingKeywords: result.missingKeywords || [],
      formattingRisks: result.formattingRisks || [],
      weakPhrases: result.weakPhrases || [],
      recruiterConcerns: result.recruiterConcerns || [],
      topImprovements: result.topImprovements || [],
      roleSummary: result.roleSummary || '',
      sourceMode: result.sourceMode || 'content',
      suggestions: result.topImprovements || [],
    });
  } catch (error) {
    console.error('[RESUME] ats-check failed:', error);
    return res.status(500).json({ message: error?.message || 'ATS check failed.' });
  }
});

router.post('/extract-job-posting', async (req, res) => {
  try {
    const jobPostingUrl = normalizeText(req.body?.jobPostingUrl);
    if (!jobPostingUrl) {
      return res.status(400).json({ message: 'jobPostingUrl is required.' });
    }

    const parsed = await parseJobPostingUrl(jobPostingUrl);
    const responsibilities = Array.isArray(parsed.responsibilities) ? parsed.responsibilities.filter(Boolean) : [];
    const requirements = Array.isArray(parsed.requirements) ? parsed.requirements.filter(Boolean) : [];
    const skills = Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [];
    const fallbackText = [
      parsed.title ? `Role: ${parsed.title}` : '',
      parsed.company ? `Company: ${parsed.company}` : '',
      parsed.location ? `Location: ${parsed.location}` : '',
      parsed.salary ? `Compensation: ${parsed.salary}` : '',
      responsibilities.length ? 'Responsibilities:\n- ' + responsibilities.join('\n- ') : '',
      requirements.length ? 'Requirements:\n- ' + requirements.join('\n- ') : '',
      skills.length ? 'Skills:\n- ' + skills.join('\n- ') : '',
    ].filter(Boolean).join('\n\n');

    const textOutput = normalizeText(parsed.text) || fallbackText;
    const warning = !textOutput
      ? (parsed.warning || 'JobNova could not extract enough usable text from this posting. Paste the description manually for best results.')
      : (parsed.warning || (textOutput.length < 180 ? 'Extraction looks partial. Review the posting text before tailoring your resume.' : ''));

    return res.status(200).json({
      url: parsed.url || jobPostingUrl,
      sourceUrl: parsed.url || jobPostingUrl,
      finalUrl: parsed.finalUrl || jobPostingUrl,
      title: parsed.title || '',
      company: parsed.company || '',
      location: parsed.location || '',
      salary: parsed.salary || '',
      text: textOutput,
      responsibilities,
      requirements,
      skills,
      source: parsed.source || 'unknown',
      extractionMethod: parsed.extractionMethod || 'unknown',
      confidence: parsed.confidence || (textOutput.length > 400 ? 'high' : textOutput.length > 160 ? 'medium' : 'low'),
      warning,
    });
  } catch (error) {
    console.error('[RESUME] extract-job-posting failed:', error);
    return res.status(500).json({ message: error?.message || 'Could not extract job posting.' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'A resume file is required.' });
    }

    const parsed = await parseResumeBuffer({
      filePath: '',
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      includeMeta: true,
    });

    const extractionWarning = !parsed.text
      ? 'The file uploaded successfully, but JobNova could not safely extract readable text. Paste your resume text manually for best results.'
      : parsed.text.length < 180
        ? 'The resume text extraction looks partial. Review the extracted text before running ATS or rewrite tools.'
        : '';

    return res.status(200).json({
      ok: true,
      fileName: req.file.originalname,
      uploadedFileName: req.file.originalname,
      extractedText: parsed.text || '',
      extractionMode: parsed.extractionMode || 'unknown',
      usedOcr: Boolean(parsed.usedOcr),
      message: extractionWarning || `Resume attached successfully (${parsed.extractionMode || 'parsed'}).`,
      warning: extractionWarning || undefined,
    });
  } catch (error) {
    console.error('[RESUME] upload failed:', error);
    return res.status(500).json({ message: error?.message || 'Resume upload failed.' });
  }
});

router.get('/latest-upload', async (_req, res) => {
  return res.status(200).json(null);
});

module.exports = router;
