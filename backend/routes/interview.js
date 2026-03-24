const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { saveState } = require('../data/store');
const { getQuestion, getFeedback, startLiveSession, completeLiveSession, createLiveTurnFeedback } = require('../services/interviewEngine');
const { transcribeAudio, synthesizeSpeech } = require('../lib/openai');
const { enqueueUserSync } = require('../lib/cloudSync');
const { optionalAuth, resolveBearerUser, extractToken } = require('../middleware/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const uploadsDir = path.join(__dirname, '..', 'data', 'interview-audio');
const generatedVoiceDir = path.join(__dirname, '..', 'data', 'generated', 'voice');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(generatedVoiceDir)) fs.mkdirSync(generatedVoiceDir, { recursive: true });

function publicVoiceUrl(fileName) {
  return fileName ? `/downloads/voice/${fileName}` : null;
}

function canRespond(req, res) {
  return !req.requestTimedOut && !res.headersSent;
}

async function maybeMakeVoice(text, voiceName = 'alloy') {
  if (!process.env.OPENAI_API_KEY || !text) return { audioUrl: null, voiceName: null };
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.mp3`;
  const outPath = path.join(generatedVoiceDir, fileName);
  try {
    await synthesizeSpeech(text, outPath, voiceName);
    return { audioUrl: publicVoiceUrl(fileName), voiceName };
  } catch {
    return { audioUrl: null, voiceName: null };
  }
}

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


router.post('/question', (req, res) => {
  try {
    const { role, index } = req.body || {};
    return res.json(getQuestion(role, index));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not generate interview question.' });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const result = await getFeedback(req.body || {});
    const saved = { id: `is-${Date.now()}`, role: req.body?.role || '', question: req.body?.question || '', answer: req.body?.answer || '', result, createdAt: new Date().toISOString() };
    req.userData.interviewSessions.unshift(saved);
    req.userData.interviewSessions = req.userData.interviewSessions.slice(0, 100);
    saveState();
    enqueueUserSync(req.user, req.userData, 'interview_feedback', saved, saved.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not generate interview feedback.' });
  }
});

router.get('/history', (req, res) => res.json(req.userData.interviewSessions || []));

router.post('/live/start', async (req, res) => {
  try {
    const session = await startLiveSession(req.body || {});
    if (!canRespond(req, res)) return;
    req.userData.liveSessions[session.sessionId] = { ...session, createdAt: new Date().toISOString() };
    saveState();
    enqueueUserSync(req.user, req.userData, 'live_interview_start', req.userData.liveSessions[session.sessionId], session.sessionId);
    const voice = await maybeMakeVoice(session.currentQuestion, session.payload?.recruiterVoice || 'verse');
    if (!canRespond(req, res)) return;
    return res.json({ sessionId: session.sessionId, firstQuestion: session.currentQuestion, totalQuestions: session.totalQuestions, ...voice });
  } catch (error) {
    if (!canRespond(req, res)) return;
    return res.status(500).json({ message: error.message || 'Could not start live interview.' });
  }
});

router.post('/live/respond', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.body?.sessionId;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required.' });
    const session = req.userData.liveSessions?.[sessionId];
    if (!session) return res.status(404).json({ message: 'Live session not found.' });
    if (req.body?.recruiterVoice) session.payload = { ...(session.payload || {}), recruiterVoice: String(req.body.recruiterVoice) };

    let answerText = String(req.body?.answerText || '').trim();
    if (!answerText && req.file) {
      const audioPath = path.join(uploadsDir, `${Date.now()}-${req.file.originalname || 'voice.m4a'}`);
      fs.writeFileSync(audioPath, req.file.buffer);
      answerText = (await transcribeAudio(audioPath)) || '';
    }
    if (!answerText) return res.status(400).json({ message: 'No answer text or usable audio transcript could be processed. Try the typed fallback, or check that OPENAI_API_KEY and transcription are working on the backend.' });

    const result = await createLiveTurnFeedback(session, answerText);
    if (!canRespond(req, res)) return;
    saveState();
    enqueueUserSync(req.user, req.userData, 'live_interview_turn', { sessionId, result }, sessionId);
    const voice = await maybeMakeVoice(result.coachReply + (result.nextQuestion ? ` ${result.nextQuestion}` : ''), session.payload?.recruiterVoice || 'verse');
    if (!canRespond(req, res)) return;
    return res.json({ ...result, ...voice });
  } catch (error) {
    if (!canRespond(req, res)) return;
    return res.status(500).json({ message: error.message || 'Could not process live interview response.' });
  }
});

router.post('/live/complete', async (req, res) => {
  try {
    const { sessionId, ...payload } = req.body || {};
    const session = req.userData.liveSessions?.[sessionId];
    const result = await completeLiveSession(sessionId || `live-${Date.now()}`, payload, session || null);
    const saved = { id: sessionId || `live-${Date.now()}`, role: payload?.targetRole || '', type: 'live', result, createdAt: new Date().toISOString() };
    req.userData.interviewSessions.unshift(saved);
    req.userData.interviewSessions = req.userData.interviewSessions.slice(0, 100);
    if (sessionId && req.userData.liveSessions?.[sessionId]) delete req.userData.liveSessions[sessionId];
    saveState();
    enqueueUserSync(req.user, req.userData, 'live_interview_complete', saved, saved.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not complete live interview.' });
  }
});

module.exports = router;
