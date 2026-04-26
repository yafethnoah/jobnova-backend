const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { atsCheck, rewriteResume } = require('../services/resumeEngine');
const { getSupabaseAdmin } = require('../lib/supabase');
const { parseResumeBuffer } = require('../services/fileParser');
const { parseJobPostingUrl } = require('../services/jobPostParser');
const { saveState } = require('../data/store');
const { enqueueUserSync } = require('../lib/cloudSync');
const { optionalAuth, resolveBearerUser, extractToken } = require('../middleware/auth');
const router = express.Router();
const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp'
]);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.use(optionalAuth);

router.use(async (req, _res, next) => {
  try {
    if (req.user) return next();
    const token = extractToken(req.headers.authorization);
    if (!token) return next();
    const user = await resolveBearerUser(token);
    if (user) req.user = user;
    return next();
  } catch {
    return next();
  }
});


router.post('/ats-check', async (req, res) => {
  try {
    const result = await atsCheck(req.body || {});
    const saved = {
      id: `ats-${Date.now()}`,
      type: 'ats-check',
      createdAt: new Date().toISOString(),
      payload: req.body || {},
      result
    };
    req.userData.resumes.unshift(saved);
    req.userData.resumes = req.userData.resumes.slice(0, 50);
    saveState();
    enqueueUserSync(req.user, req.userData, 'ats_check', saved, saved.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'ATS check failed.' });
  }
});

router.post('/rewrite', async (req, res) => {
  try {
    const result = await rewriteResume(req.body || {});
    const saved = {
      id: `rv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetRole: req.body?.targetRole || '',
      uploadedFileName: req.body?.uploadedFileName || '',
      result
    };
    req.userData.resumeVersions.unshift(saved);
    req.userData.resumeVersions = req.userData.resumeVersions.slice(0, 50);
    saveState();
    enqueueUserSync(req.user, req.userData, 'resume_rewrite', saved, saved.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Resume rewrite failed.' });
  }
});

router.get('/versions', (req, res) => {
  return res.json(req.userData.resumeVersions || []);
});

router.get('/latest-upload', (req, res) => {
  const latest = (req.userData.resumes || []).find((item) => item.type !== 'ats-check' && item.extractedText);
  return res.json(latest || null);
});

router.post('/extract-job-posting', async (req, res) => {
  try {
    const jobPostingUrl = String(req.body?.jobPostingUrl || '').trim();
    if (!jobPostingUrl) return res.status(400).json({ message: 'Job posting URL is required.' });
    const parsed = await parseJobPostingUrl(jobPostingUrl);
    if (!parsed?.text?.trim()) return res.status(422).json({ message: 'The link loaded, but no usable job description text could be extracted.' });
    return res.json({
      sourceUrl: jobPostingUrl,
      finalUrl: parsed.finalUrl || jobPostingUrl,
      title: parsed.title || '',
      company: parsed.company || '',
      location: parsed.location || '',
      salary: parsed.salary || '',
      text: parsed.text || '',
      source: parsed.source || '',
      extractionMethod: parsed.extractionMethod || parsed.source || 'static-html',
      confidence: parsed.confidence || 'medium',
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      warning: parsed.warning || ''
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not extract the job posting.' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    if (!ALLOWED_RESUME_TYPES.has(req.file.mimetype || '')) {
      return res.status(415).json({ message: 'Unsupported file type. Upload PDF, DOCX, DOC, or plain text.' });
    }

    const originalName = req.file.originalname || 'resume';
    const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(localPath, req.file.buffer);

    let extractedText = '';
    try {
      const parsedResume = await parseResumeBuffer({
        filePath: localPath,
        fileName: originalName,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        includeMeta: true
      });
      extractedText = parsedResume.text || '';
      req.parsedResumeMeta = parsedResume;
    } catch {
      extractedText = '';
    }

    let storage = { uploaded: false };
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucket = process.env.STORAGE_BUCKET || 'resumes';
      const { error } = await supabase.storage.from(bucket).upload(safeName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (!error) storage = { uploaded: true, bucket, fileName: safeName };
    }

    const saved = {
      id: `file-${Date.now()}`,
      userId: req.user?.id || 'guest',
      originalName,
      fileName: originalName,
      storedName: safeName,
      uploadedFileName: safeName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      localPath,
      extractedText,
      extractionMode: req.parsedResumeMeta?.extractionMode || 'unknown',
      usedOcr: Boolean(req.parsedResumeMeta?.usedOcr),
      createdAt: new Date().toISOString()
    };
    req.userData.resumes.unshift(saved);
    req.userData.resumes = req.userData.resumes.slice(0, 50);
    saveState();
    enqueueUserSync(req.user, req.userData, 'resume_upload', saved, saved.id);

    const message = extractedText
      ? 'File uploaded and text extracted successfully.'
      : 'File uploaded, but the parser could not recover enough text. Paste the resume text manually if needed.';

    return res.json({
      ok: true,
      message,
      fileName: originalName,
      uploadedFileName: safeName,
      extractedText,
      extractionMode: req.parsedResumeMeta?.extractionMode || 'unknown',
      usedOcr: Boolean(req.parsedResumeMeta?.usedOcr),
      extractionSucceeded: Boolean(extractedText),
      ...storage
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Upload failed.' });
  }
});

module.exports = router;
