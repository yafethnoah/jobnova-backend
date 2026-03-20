const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const { realtimeSessionSchema, realtimeEventSchema, parse } = require('../lib/validation');
const { enqueue } = require('../lib/jobQueue');

const router = express.Router();
router.use(requireAuth);

async function createRealtimeSessionToken(input) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
        modalities: ['audio', 'text'],
        instructions: `You are JobNova's recruiter-style interview coach. Conduct a realistic interview for the role ${input.role}. Keep feedback direct, supportive, and concise.`,
        voice: input.voice || 'alloy'
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const ephemeralKey = data?.client_secret?.value || data?.client_secret || data?.ephemeral_key || null;
    if (!ephemeralKey) return null;
    return {
      sessionId: data?.id || null,
      ephemeralKey,
      transport: 'openai-realtime',
      model: data?.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview'
    };
  } catch {
    return null;
  }
}

router.post('/session', async (req, res, next) => {
  try {
    const input = parse(realtimeSessionSchema, req.body);
    const id = `live_${Date.now()}`;
    req.userData.liveSessions = req.userData.liveSessions || {};
    req.userData.liveSessions[id] = {
      id,
      role: input.role,
      mode: input.mode,
      level: input.level,
      createdAt: new Date().toISOString(),
      events: [],
      status: 'live'
    };
    await saveState();
    const liveToken = await createRealtimeSessionToken(input);
    if (liveToken) {
      return res.json({
        sessionId: id,
        ephemeralKey: liveToken.ephemeralKey,
        transport: liveToken.transport,
        model: liveToken.model,
        providerSessionId: liveToken.sessionId,
        note: 'Realtime session created successfully.'
      });
    }
    res.json({
      sessionId: id,
      ephemeralKey: `mock-rt-${crypto.randomBytes(12).toString('hex')}`,
      transport: 'mock',
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      note: 'Realtime provider token could not be created. Falling back to mock mode.'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/event', async (req, res, next) => {
  try {
    const input = parse(realtimeEventSchema, req.body);
    const session = req.userData.liveSessions?.[req.params.id];
    if (!session) return res.status(404).json({ message: 'Live session not found.' });
    session.events.push({
      id: `evt-${Date.now()}`,
      speaker: input.speaker,
      text: input.text,
      timestamp: new Date().toISOString()
    });
    await saveState();
    res.json({ ok: true, count: session.events.length });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/end', async (req, res, next) => {
  try {
    const session = req.userData.liveSessions?.[req.params.id];
    if (!session) return res.status(404).json({ message: 'Live session not found.' });
    session.status = 'ended';
    const transcript = session.events.map((evt) => `${evt.speaker.toUpperCase()}: ${evt.text}`).join('\n');
    const feedbackJob = await enqueue('interview-score', {
      role: session.role,
      mode: session.mode,
      level: session.level,
      transcript
    });
    const feedback = {
      overallScore: 78,
      clarityScore: 81,
      structureScore: 74,
      relevanceScore: 80,
      confidenceScore: 75,
      strengths: ['Clear intent', 'Role-focused examples', 'Good professional tone'],
      weaknesses: ['Results need more specificity', 'STAR transitions can be tighter'],
      improvedAnswer: 'Use a tighter STAR flow with a concrete result and one measurable outcome.',
      nextActions: ['Practice one conflict question.', 'Practice one prioritization question.'],
      transcript,
      queueJobId: feedbackJob.id
    };
    req.userData.interviewSessions = req.userData.interviewSessions || [];
    req.userData.interviewSessions.unshift({
      id: session.id,
      role: session.role,
      mode: session.mode,
      level: session.level,
      createdAt: session.createdAt,
      endedAt: new Date().toISOString(),
      feedback
    });
    req.userData.interviewSessions = req.userData.interviewSessions.slice(0, 50);
    await saveState();
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/feedback', (req, res) => {
  const record = (req.userData.interviewSessions || []).find((item) => item.id === req.params.id);
  if (!record) return res.status(404).json({ message: 'Interview feedback not found.' });
  res.json(record.feedback);
});

module.exports = { interviewRealtimeRouter: router };
