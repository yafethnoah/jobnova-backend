try {
  require('dotenv').config();
} catch (_) {
  // Render injects env vars directly in production
}

const { initSentry, getSentry } = require('./lib/sentry');
initSentry();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const {
  env,
  getRuntimeWarnings,
  assertProductionReadiness,
  allowLocalFallback,
} = require('./config/env');

const { healthcheck } = require('./lib/db');
const { redisHealthcheck } = require('./lib/redis');
const { supabaseHealthcheck } = require('./lib/supabase');
const { listJobs } = require('./lib/jobQueue');
const { requestContext } = require('./middleware/requestContext');
const { trackError, trackRequest } = require('./lib/telemetry');
const { toSafeError } = require('./lib/errors');
const { initPersistence } = require('./data/store');
const {
  GENERATED_AUDIO_DIR,
  transcribeAudioFile,
  generateInterviewTurn,
  synthesizeSpeechToFile,
} = require('./lib/liveInterviewAi');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const careerPathRoutes = require('./routes/careerPath');
const applicationsRoutes = require('./routes/applications');
const resourcesRoutes = require('./routes/resources');
const resumeRoutes = require('./routes/resume');
const jobReadyRoutes = require('./routes/jobReady');
const linkedinRoutes = require('./routes/linkedin');
const interviewRoutes = require('./routes/interview');
const emailRoutes = require('./routes/email');
const dashboardRoutes = require('./routes/dashboard');
const { atsRouter } = require('./routes/ats');
const { exportRouter } = require('./routes/export');
const { interviewRealtimeRouter } = require('./routes/interviewRealtime');
const { jobsRouter } = require('./routes/jobs');

const app = express();
const sentry = getSentry();

const corsOrigin = env.CORS_ORIGIN || '*';
const allowedOrigins =
  corsOrigin === '*'
    ? true
    : corsOrigin
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const LIVE_UPLOAD_DIR = path.join(__dirname, 'data', 'uploads', 'live-interview');
fs.mkdirSync(LIVE_UPLOAD_DIR, { recursive: true });

const liveInterviewUpload = multer({
  dest: LIVE_UPLOAD_DIR,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.API_RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/auth',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.AUTH_RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/api/auth',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.AUTH_RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/resume/upload',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.UPLOAD_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/api/resume/upload',
  rateLimit({
    windowMs: Number(env.API_RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(env.UPLOAD_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);

app.use((req, _res, next) => {
  trackRequest(req);
  next();
});

if (sentry) {
  app.use(
    sentry.Handlers
      ? sentry.Handlers.requestHandler()
      : (_req, _res, next) => next()
  );
}

app.use('/downloads', express.static(path.join(__dirname, 'data', 'generated')));
app.use('/api/downloads', express.static(path.join(__dirname, 'data', 'generated')));

const liveInterviewSessions = new Map();

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function pickFirstQuestion({ interviewType, targetRole, companyName }) {
  const role = targetRole || 'this role';
  const company = companyName || 'the company';

  const banks = {
    behavioral: `Tell me about yourself and why you are a strong fit for ${role}.`,
    hr: `Walk me through your background and how it prepares you for ${role}.`,
    technical: `Explain a challenging technical or operational problem you solved and how you approached it.`,
    newcomer_confidence: `Tell me about yourself and the experience you bring that is most relevant to ${role}.`,
    salary: `Before we discuss compensation, tell me what value you believe you would bring to ${company}.`,
  };

  return banks[interviewType] || banks.behavioral;
}

function sessionPublicShape(session) {
  return {
    sessionId: session.sessionId,
    targetRole: session.targetRole,
    companyName: session.companyName,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
    coachTone: session.coachTone,
    recruiterVoice: session.recruiterVoice,
    speakerMode: session.speakerMode,
    microphoneMode: session.microphoneMode,
    recordingQuality: session.recordingQuality,
    totalQuestions: session.totalQuestions,
    currentQuestion: session.currentQuestion,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    isComplete: session.isComplete,
    turns: session.turns,
  };
}

function normalizeScore10To100(value) {
  const safe = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(safe * 10)));
}

function buildLiveInterviewReport(session) {
  const turns = Array.isArray(session.turns) ? session.turns : [];
  const avg = (key) => {
    if (!turns.length) return 0;
    const total = turns.reduce((sum, item) => sum + Number(item.feedback?.[key] || 0), 0);
    return Math.round((total / turns.length) * 10) / 10;
  };

  const clarityAvg = avg('clarity');
  const structureAvg = avg('structure');
  const relevanceAvg = avg('relevance');
  const latestTurn = turns[turns.length - 1] || null;

  const transcript = [];
  for (const turn of turns) {
    if (turn.question) transcript.push({ speaker: 'coach', text: turn.question });
    if (turn.answerText) transcript.push({ speaker: 'user', text: turn.answerText });
    if (turn.coachReply) transcript.push({ speaker: 'coach', text: turn.coachReply });
  }

  const strengths = turns.length
    ? [
        clarityAvg >= 7 ? 'Your answers were generally clear and easy to follow.' : 'You showed relevant experience that can become much stronger with cleaner delivery.',
        relevanceAvg >= 7 ? 'Your examples stayed aligned with the role and sounded believable.' : 'Your examples had useful substance and can be made more role-specific.',
        'You completed a realistic recruiter-style practice flow instead of isolated one-off questions.',
      ]
    : ['No interview answers have been submitted yet.'];

  const improvementAreas = turns.length
    ? [
        structureAvg >= 7 ? 'Keep ending answers with a sharper business result.' : 'Tighten your STAR structure so the listener can follow the story faster.',
        'Use at least one measurable result or specific outcome in your strongest stories.',
        'Trim long setup sentences and move faster into your action.',
      ]
    : ['Start a live interview session to generate actionable improvement areas.'];

  const personalizedTips = turns.length
    ? [
        `For ${session.targetRole}, lead with one sentence of context, then spend most of the answer on your action and result.`,
        'When the recruiter asks a behavioral question, avoid generic claims and name the exact task, stakeholders, and result.',
        'Practice two versions of your strongest story: a 45-second version and a 90-second version.',
      ]
    : ['Add a target role and complete one recruiter simulation to unlock personalized tips.'];

  const nextPracticePlan = turns.length
    ? [
        'Redo one weak answer and make the result sentence much stronger.',
        'Practice one conflict story using a strict STAR structure.',
        'Record one concise tell me about yourself answer and listen for pacing.',
      ]
    : ['Start with a five-question recruiter simulation.'];

  const answerWordCounts = turns
    .map((turn) => String(turn.answerText || '').trim().split(/\s+/).filter(Boolean).length)
    .filter(Boolean);
  const fillerPatternMap = {};
  const fillerWordCount = turns.reduce((count, turn) => {
    const text = String(turn.answerText || '').toLowerCase();
    const matches = text.match(/\b(um|uh|like|you know|actually|basically)\b/g);
    (matches || []).forEach((item) => {
      fillerPatternMap[item] = (fillerPatternMap[item] || 0) + 1;
    });
    return count + (matches ? matches.length : 0);
  }, 0);
  const avgAnswerWords = answerWordCounts.length
    ? Math.round(answerWordCounts.reduce((sum, item) => sum + item, 0) / answerWordCounts.length)
    : 0;
  const starHeavyTurns = turns.filter((turn) => /\b(situation|task|action|result|first|then|outcome)\b/i.test(String(turn.answerText || ''))).length;
  const deliveryInsights = {
    pace:
      avgAnswerWords >= 120
        ? 'Detailed but at risk of running long; tighten the opening and land the result sooner.'
        : avgAnswerWords >= 70
          ? 'Healthy interview pace with enough context for a recruiter.'
          : 'Concise pace; add a little more evidence so the answer feels complete.',
    answerLength: avgAnswerWords ? `${avgAnswerWords} words on average per answer` : 'No answer length yet',
    starCoverage: turns.length ? `${starHeavyTurns}/${turns.length} answers showed visible STAR-like structure` : 'No STAR signals yet',
    recruiterReadiness:
      clarityAvg >= 7 && structureAvg >= 7 && relevanceAvg >= 7
        ? 'Ready for a realistic recruiter screen. The next gain is sharper executive polish.'
        : 'Good practice foundation, but one more focused rehearsal would noticeably improve recruiter confidence.',
    fillerPatterns: Object.entries(fillerPatternMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word, count]) => `${word} (${count})`),
  };

  return {
    sessionId: session.sessionId,
    summary: turns.length
      ? `You completed a ${session.targetRole} recruiter simulation. Your answers have real substance, and the next gain comes from tighter structure, stronger result statements, and more direct recruiter-ready phrasing.`
      : 'No interview answers have been submitted yet.',
    strengths,
    improvementAreas,
    personalizedTips,
    nextPracticePlan,
    transcript,
    scores: {
      clarity: normalizeScore10To100(clarityAvg),
      relevance: normalizeScore10To100(relevanceAvg),
      star: normalizeScore10To100(structureAvg),
      confidence: normalizeScore10To100((clarityAvg + relevanceAvg) / 2),
    },
    fillerWordCount,
    suggestedImprovedAnswer:
      latestTurn?.feedback?.strongerSampleAnswer ||
      'Use a concise STAR structure: brief context, clear action, and a concrete result.',
    deliveryInsights,
    momentumPlan: [
      'Re-record your strongest answer with a 15-second shorter opening.',
      'Add one measurable outcome to the story you would most likely use in a real screen interview.',
      'Practice one follow-up question where you defend your decision-making under pressure.'
    ],
    raw: {
      totalQuestions: session.totalQuestions,
      completedTurns: turns.length,
      averages: {
        clarity: clarityAvg,
        structure: structureAvg,
        relevance: relevanceAvg,
      },
    },
  };
}

function completeLiveInterviewHandler(req, res) {
  try {
    const sessionId = normalizeString(req.body?.sessionId || req.params?.sessionId);
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    return res.status(200).json(buildLiveInterviewReport(session));
  } catch (error) {
    console.error('live interview complete error:', error);
    return res.status(500).json({ error: 'Failed to generate interview report' });
  }
}

async function startLiveInterviewHandler(req, res) {
  try {
    const targetRole = normalizeString(req.body?.targetRole);
    const companyName = normalizeString(req.body?.companyName);
    const interviewType = normalizeString(req.body?.interviewType, 'behavioral');
    const difficulty = normalizeString(req.body?.difficulty, 'medium');
    const coachTone = normalizeString(req.body?.coachTone, 'realistic');
    const recruiterVoice = normalizeString(req.body?.recruiterVoice, 'verse');
    const speakerMode = normalizeString(req.body?.speakerMode, 'auto');
    const microphoneMode = normalizeString(req.body?.microphoneMode, 'voice_preferred');
    const recordingQuality = normalizeString(req.body?.recordingQuality, 'high');

    if (!targetRole) {
      return res.status(400).json({ error: 'targetRole is required' });
    }

    const sessionId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalQuestions = 5;
    const firstQuestion = pickFirstQuestion({
      interviewType,
      targetRole,
      companyName,
    });

    let audioUrl = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const speech = await synthesizeSpeechToFile({
          text: firstQuestion,
          voice: recruiterVoice,
          sessionId,
          turnNumber: 0,
        });
        audioUrl = speech?.publicUrl || null;
      } catch (error) {
        console.error('TTS start question failed:', error.message);
      }
    }

    const session = {
      sessionId,
      targetRole,
      companyName,
      interviewType,
      difficulty,
      coachTone,
      recruiterVoice,
      speakerMode,
      microphoneMode,
      recordingQuality,
      totalQuestions,
      currentQuestion: firstQuestion,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isComplete: false,
      turns: [],
    };

    liveInterviewSessions.set(sessionId, session);

    return res.status(200).json({
      sessionId,
      firstQuestion,
      totalQuestions,
      audioUrl,
      recruiterVoice,
      speakerMode,
      microphoneMode,
      recordingQuality,
    });
  } catch (error) {
    console.error('live interview start error:', error);
    return res.status(500).json({ error: 'Failed to start interview' });
  }
}

async function respondLiveInterviewHandler(req, res) {
  let uploadedPath = null;

  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (session.isComplete) {
      return res.status(400).json({ error: 'Interview is already complete' });
    }

    uploadedPath = req.file?.path || null;

    let answerText = normalizeString(req.body?.answerText);

    if (!answerText && uploadedPath && process.env.OPENAI_API_KEY) {
      answerText = await transcribeAudioFile(uploadedPath);
    }

    if (!answerText) {
      return res.status(400).json({
        error: 'No answer provided. Send typed text or upload an audio file.',
      });
    }

    const currentQuestion = session.currentQuestion;
    const turnNumber = session.turns.length + 1;

    let aiResult;
    if (process.env.OPENAI_API_KEY) {
      aiResult = await generateInterviewTurn({
        session,
        currentQuestion,
        answerText,
      });
    } else {
      aiResult = {
        coachReply:
          'Your answer has a good foundation. Add one specific example and a measurable result.',
        nextQuestion:
          turnNumber >= session.totalQuestions
            ? ''
            : 'Can you give me a specific example that shows this strength in action?',
        isComplete: turnNumber >= session.totalQuestions,
        feedback: {
          clarity: 7,
          structure: 6,
          relevance: 7,
          strength: 'Relevant answer, but make it more structured and concrete.',
          strongerSampleAnswer:
            'A stronger answer would briefly explain the situation, describe your actions, and end with the result you achieved.',
          improvements: ['Add one concrete example.', 'Name the result more clearly.'],
          confidenceHint: 'Slow down slightly and sound more decisive in the action step.',
        },
      };
    }

    let audioUrl = null;
    const spokenText = [aiResult.coachReply, aiResult.nextQuestion].filter(Boolean).join(' ');

    if (process.env.OPENAI_API_KEY && spokenText) {
      try {
        const speech = await synthesizeSpeechToFile({
          text: spokenText,
          voice: normalizeString(req.body?.recruiterVoice, session.recruiterVoice),
          sessionId,
          turnNumber,
        });
        audioUrl = speech?.publicUrl || null;
      } catch (error) {
        console.error('TTS reply failed:', error.message);
      }
    }

    const turn = {
      turnNumber,
      question: currentQuestion,
      answerText,
      transcribedText: answerText,
      coachReply: aiResult.coachReply,
      nextQuestion: aiResult.isComplete ? null : aiResult.nextQuestion,
      isComplete: Boolean(aiResult.isComplete),
      audioUrl,
      feedback: {
        clarity: aiResult.feedback.clarity,
        structure: aiResult.feedback.structure,
        relevance: aiResult.feedback.relevance,
        strength: aiResult.feedback.strength,
        strongerSampleAnswer: aiResult.feedback.strongerSampleAnswer,
        improvements: Array.isArray(aiResult.feedback.improvements) ? aiResult.feedback.improvements : [],
        confidenceHint: typeof aiResult.feedback.confidenceHint === 'string' ? aiResult.feedback.confidenceHint : '',
      },
      recruiterVoice: normalizeString(req.body?.recruiterVoice, session.recruiterVoice),
      createdAt: new Date().toISOString(),
    };

    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();
    session.recruiterVoice = turn.recruiterVoice;
    session.currentQuestion = turn.nextQuestion || session.currentQuestion;
    session.isComplete = turn.isComplete;

    liveInterviewSessions.set(sessionId, session);

    return res.status(200).json(turn);
  } catch (error) {
    console.error('live interview respond error:', error);
    return res.status(500).json({ error: 'Failed to process interview answer' });
  } finally {
    if (uploadedPath) {
      try {
        fs.unlinkSync(uploadedPath);
      } catch (_) {}
    }
  }
}

function reportLiveInterviewHandler(req, res) {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    return res.status(200).json(buildLiveInterviewReport(session));
  } catch (error) {
    console.error('live interview report error:', error);
    return res.status(500).json({ error: 'Failed to fetch interview report' });
  }
}

function sessionLiveInterviewHandler(req, res) {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    return res.status(200).json(sessionPublicShape(session));
  } catch (error) {
    console.error('live interview session error:', error);
    return res.status(500).json({ error: 'Failed to fetch interview session' });
  }
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    health: '/health',
    endpoints: [
      '/auth',
      '/api/auth',
      '/users',
      '/api/users',
      '/career-path',
      '/api/career-path',
      '/applications',
      '/api/applications',
      '/resources',
      '/api/resources',
      '/resume',
      '/api/resume',
      '/assets',
      '/api/job-ready',
      '/interview',
      '/api/interview',
      '/interview/realtime',
      '/api/interview/realtime',
      '/jobs',
      '/api/jobs',
      '/api/interview/live/start',
      '/api/interview/live/respond/:sessionId',
      '/api/interview/live/report/:sessionId',
      '/api/interview/live/session/:sessionId',
    ],
  });
});

app.get('/api', (_req, res) => {
  res.json({
    ok: true,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    health: '/api/health',
    apiBase: '/api',
  });
});

app.get('/test', (_req, res) => {
  res.json({
    ok: true,
    message: 'Backend working',
  });
});

app.get('/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  const supabase = await supabaseHealthcheck();
  const openaiOk = Boolean(process.env.OPENAI_API_KEY);
  const emailOk = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const exportsOk = true;

  const persistenceMode =
    db?.mode || (allowLocalFallback ? 'local-fallback' : 'database-required');

  let status = 'healthy';
  if (!db.ok && allowLocalFallback) status = 'fallback';
  else if (!db.ok && !allowLocalFallback) status = 'down';
  else if ((redis.enabled && !redis.ok) || (supabase.enabled && !supabase.ok)) {
    status = 'degraded';
  }

  const ok = status !== 'down';

  res.status(ok ? 200 : 503).json({
    ok,
    status,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    db,
    redis,
    supabase,
    openai: { ok: openaiOk, mode: openaiOk ? 'configured' : 'missing' },
    email: { ok: emailOk, mode: emailOk ? 'configured' : 'missing' },
    exports: { ok: exportsOk, mode: 'local-generated-files' },
    persistenceMode,
    warnings: getRuntimeWarnings(),
    queueDepth: listJobs().filter(
      (job) => job.status === 'queued' || job.status === 'processing'
    ).length,
    security: {
      helmet: true,
      rateLimit: true,
      sentry: Boolean(sentry),
    },
  });
});

app.get('/api/health', async (_req, res) => {
  const db = await healthcheck();
  const redis = await redisHealthcheck();
  const supabase = await supabaseHealthcheck();
  const openaiOk = Boolean(process.env.OPENAI_API_KEY);
  const emailOk = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const exportsOk = true;

  const persistenceMode =
    db?.mode || (allowLocalFallback ? 'local-fallback' : 'database-required');

  let status = 'healthy';
  if (!db.ok && allowLocalFallback) status = 'fallback';
  else if (!db.ok && !allowLocalFallback) status = 'down';
  else if ((redis.enabled && !redis.ok) || (supabase.enabled && !supabase.ok)) {
    status = 'degraded';
  }

  const ok = status !== 'down';

  res.status(ok ? 200 : 503).json({
    ok,
    status,
    service: 'jobnova-backend',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    db,
    redis,
    supabase,
    openai: { ok: openaiOk, mode: openaiOk ? 'configured' : 'missing' },
    email: { ok: emailOk, mode: emailOk ? 'configured' : 'missing' },
    exports: { ok: exportsOk, mode: 'local-generated-files' },
    persistenceMode,
    warnings: getRuntimeWarnings(),
    queueDepth: listJobs().filter(
      (job) => job.status === 'queued' || job.status === 'processing'
    ).length,
    security: {
      helmet: true,
      rateLimit: true,
      sentry: Boolean(sentry),
    },
  });
});

// LIVE INTERVIEW
app.post('/interview/live/start', startLiveInterviewHandler);
app.post('/api/interview/live/start', startLiveInterviewHandler);

app.post(
  '/interview/live/respond/:sessionId',
  liveInterviewUpload.single('audio'),
  respondLiveInterviewHandler
);
app.post(
  '/api/interview/live/respond/:sessionId',
  liveInterviewUpload.single('audio'),
  respondLiveInterviewHandler
);

app.get('/interview/live/report/:sessionId', reportLiveInterviewHandler);
app.get('/api/interview/live/report/:sessionId', reportLiveInterviewHandler);

app.get('/interview/live/session/:sessionId', sessionLiveInterviewHandler);
app.get('/api/interview/live/session/:sessionId', sessionLiveInterviewHandler);

app.post('/interview/live/complete', completeLiveInterviewHandler);
app.post('/api/interview/live/complete', completeLiveInterviewHandler);

app.get('/downloads/live-interview/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  const absolutePath = path.join(GENERATED_AUDIO_DIR, filename);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  return res.sendFile(absolutePath);
});
app.get('/api/downloads/live-interview/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  const absolutePath = path.join(GENERATED_AUDIO_DIR, filename);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  return res.sendFile(absolutePath);
});

// AUTH
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// USERS
app.use('/users', userRoutes);
app.use('/api/users', userRoutes);

// CAREER PATH
app.use('/career-path', careerPathRoutes);
app.use('/api/career-path', careerPathRoutes);

// APPLICATIONS
app.use('/applications', applicationsRoutes);
app.use('/api/applications', applicationsRoutes);

// RESOURCES
app.use('/resources', resourcesRoutes);
app.use('/api/resources', resourcesRoutes);

// RESUME
app.use('/resume', resumeRoutes);
app.use('/api/resume', resumeRoutes);

// JOB READY
app.use('/job-ready', jobReadyRoutes);
app.use('/api/job-ready', jobReadyRoutes);

// LINKEDIN
app.use('/linkedin', linkedinRoutes);
app.use('/api/linkedin', linkedinRoutes);

// INTERVIEW
app.use('/interview', interviewRoutes);
app.use('/api/interview', interviewRoutes);

// INTERVIEW REALTIME
app.use('/interview/realtime', interviewRealtimeRouter);
app.use('/api/interview/realtime', interviewRealtimeRouter);

// EMAIL
app.use('/email', emailRoutes);
app.use('/api/email', emailRoutes);

// DASHBOARD
app.use('/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ATS
app.use('/ats', atsRouter);
app.use('/api/ats', atsRouter);

// EXPORTS
app.use('/exports', exportRouter);
app.use('/api/exports', exportRouter);

// JOBS
app.use('/jobs', jobsRouter);
app.use('/api/jobs', jobsRouter);

if (sentry && typeof sentry.setupExpressErrorHandler === 'function') {
  sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, _next) => {
  if (res.headersSent || req.requestTimedOut) return;

  const safe = toSafeError(err);
  trackError(req, safe, { details: safe.details || null });

  res.status(safe.statusCode || 500).json({
    message: safe.message || 'Unexpected server error.',
    requestId: req.requestId,
    details: safe.details || undefined,
  });
});

const PORT = env.PORT;

(async () => {
  try {
    assertProductionReadiness();
    await initPersistence();
  } catch (error) {
    console.error('Startup blocked:', error.message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    const warnings = getRuntimeWarnings();
    console.log(`JobNova backend running on http://0.0.0.0:${PORT}`);

    if (warnings.length) {
      console.warn('Runtime warnings:');
      for (const warning of warnings) {
        console.warn(`- ${warning}`);
      }
    }
  });
})();