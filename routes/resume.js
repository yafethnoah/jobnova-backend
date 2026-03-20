const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { atsCheck, rewriteResume } = require('../services/resumeEngine');
const { getSupabaseAdmin } = require('../lib/supabase');
const { parseResumeBuffer } = require('../services/fileParser');
const { parseJobPostingUrl } = require('../services/jobPostParser');
const { saveState } = require('../data/store');
const { syncUserState } = require('../lib/cloudSync');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.use(requireAuth);

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
    await syncUserState(req.user, req.userData, 'ats_check', saved, saved.id);
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
    await syncUserState(req.user, req.userData, 'resume_rewrite', saved, saved.id);
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
    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not extract the job posting.' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(localPath, req.file.buffer);

    let extractedText = '';
    try {
      extractedText = await parseResumeBuffer({
        filePath: localPath,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer
      });
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
      userId: req.user.id,
      originalName: req.file.originalname,
      storedName: safeName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      localPath,
      extractedText,
      createdAt: new Date().toISOString()
    };
    req.userData.resumes.unshift(saved);
    req.userData.resumes = req.userData.resumes.slice(0, 50);
    saveState();
    await syncUserState(req.user, req.userData, 'resume_upload', saved, saved.id);

    return res.json({
      ok: true,
      message: extractedText ? 'File uploaded and text extracted.' : 'File uploaded, but no text could be extracted. Paste resume text manually if needed.',
      fileName: req.file.originalname,
      uploadedFileName: safeName,
      extractedText,
      ...storage
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Upload failed.' });
  }
});

module.exports = router;
