try {
  require('dotenv').config();
} catch (_) {
  // Render injects env vars directly in production
}

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
const { initSentry, getSentry } = require('./lib/sentry');

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

initSentry();

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
app.use(
  '/api/downloads',
  express.static(path.join(__dirname, 'data', 'generated'))
);

/**
 * --------------------------------------------------------------------------
 * LIVE INTERVIEW IN-MEMORY STORE
 * --------------------------------------------------------------------------
 * This unblocks the mobile/web interview flow immediately.
 * Later you can move this into DB / Redis / Supabase.
 */
const liveInterviewSessions = new Map();

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function pickFirstQuestion({ interviewType, targetRole, companyName, difficulty }) {
  const role = targetRole || 'this role';
  const company = companyName || 'our company';

  const banks = {
    behavioral: [
      `Tell me about yourself and why you are a strong fit for ${role}.`,
      `Describe a time you handled pressure successfully in a professional setting.`,
      `Tell me about a situation where you solved a difficult problem with limited resources.`,
      `Give an example of how you managed competing priorities.`,
      `Why do you want to work at ${company}?`,
    ],
    hr: [
      `Walk me through your background and how it prepares you for ${role}.`,
      `What is your greatest professional strength, and how would it help you in this role?`,
      `Tell me about a time you worked with a difficult colleague or stakeholder.`,
      `How do you handle feedback from managers or team members?`,
      `Why should we hire you for ${role}?`,
    ],
    technical: [
      `Explain a challenging technical problem you solved and how you approached it.`,
      `How do you troubleshoot a process or system that is failing unexpectedly?`,
      `Describe a project where you had to learn something quickly to deliver results.`,
      `How do you ensure accuracy and quality in technical work?`,
      `Tell me about a time you improved a process or workflow.`,
    ],
    newcomer_confidence: [
      `Tell me about yourself and the experience you bring that is most relevant to this position.`,
      `How has your international or cross-cultural experience prepared you for work in Canada?`,
      `Describe a time you adapted quickly to a new environment.`,
      `What strengths would you bring to a Canadian workplace?`,
      `Why are you confident you can succeed in this role?`,
    ],
    salary: [
      `Before we discuss salary, tell me what value you believe you would bring to this role.`,
      `How do you evaluate a compensation package beyond salary alone?`,
      `Describe a time you negotiated professionally and respectfully.`,
      `What motivates you most besides compensation?`,
      `What are your expectations for growth in this role?`,
    ],
  };

  const key = banks[interviewType] ? interviewType : 'behavioral';
  const questions = banks[key];

  if (difficulty === 'hard') return questions[0];
  if (difficulty === 'easy') return questions[0];
  return questions[0];
}

function buildNextQuestion(session) {
  const role = session.targetRole || 'this role';
  const company = session.companyName || 'our company';

  const questionBanks = {
    behavioral: [
      `Describe a time you solved a problem under pressure.`,
      `Tell me about a time you had to prioritize multiple deadlines.`,
      `Give an example of a conflict you handled professionally.`,
      `Why do you want to join ${company}?`,
      `What makes you the right fit for ${role}?`,
    ],
    hr: [
      `What is your greatest strength for this role?`,
      `Describe a challenge you faced at work and how you handled it.`,
      `How do you respond to constructive criticism?`,
      `Why are you interested in ${company}?`,
      `Why should we hire you?`,
    ],
    technical: [
      `Describe a workflow or system you improved.`,
      `How do you diagnose a recurring issue when the cause is unclear?`,
      `Tell me about a time you learned a new tool or process quickly.`,
      `How do you balance speed and accuracy in your work?`,
      `What technical accomplishment are you most proud of?`,
    ],
    newcomer_confidence: [
      `Tell me about a time you adapted to a completely new environment.`,
      `How do your international experiences help you in this role?`,
      `What strengths would you bring to a diverse Canadian workplace?`,
      `How have you built confidence while transitioning into a new job market?`,
      `Why are you a strong match for this opportunity?`,
    ],
    salary: [
      `How do you define a fair compensation package for yourself?`,
      `How would you communicate your salary expectations professionally?`,
      `What matters to you most besides pay?`,
      `How do you balance compensation with long-term growth opportunities?`,
      `What would make this opportunity attractive to you overall?`,
    ],
  };

  const questions = questionBanks[session.interviewType] || questionBanks.behavioral;
  return questions[session.turns.length] || `Do you have any final thoughts on why you are a strong fit for ${role}?`;
}

function buildCoachReply(answerText, session, turnNumber) {
  const tone = session.coachTone || 'realistic';
  const trimmed = normalizeString(answerText);

  if (!trimmed) {
    return `Try giving a more complete answer using a clear structure: a short context, your actions, and the result. Keep the tone confident and specific.`;
  }

  if (tone === 'supportive') {
    return `Good start. Your answer has potential. Make it stronger by adding one specific example, one measurable result, and a more confident closing sentence.`;
  }

  if (tone === 'strict') {
    return `Your answer needs more precision. Be more direct, avoid vague wording, and give a concrete example with a clear outcome.`;
  }

  if (turnNumber === 1) {
    return `Solid opening. Now make your answer more memorable by adding one achievement and linking it directly to the role.`;
  }

  return `Your answer is relevant. To improve it, tighten the structure, add one clear example, and end with the value you would bring to the employer.`;
}

function buildScores(answerText) {
  const text = normalizeString(answerText);
  const wordCount = text ? text.split(/\s+/).length : 0;

  let clarity = 6;
  let structure = 6;
  let relevance = 6;

  if (wordCount >= 20) clarity += 1;
  if (wordCount >= 35) structure += 1;
  if (wordCount >= 50) relevance += 1;

  if (/result|improv|increase|reduce|support|manage|coordinate|lead|deliver/i.test(text)) {
    relevance += 1;
  }

  if (/because|therefore|so|first|then|finally|for example/i.test(text)) {
    structure += 1;
  }

  if (/I|my|me/i.test(text)) {
    clarity += 1;
  }

  clarity = Math.min(10, clarity);
  structure = Math.min(10, structure);
  relevance = Math.min(10, relevance);

  return { clarity, structure, relevance };
}

function buildStrongerSampleAnswer(session, question, answerText) {
  const role = session.targetRole || 'the role';
  const company = session.companyName || 'the company';
  const original = normalizeString(answerText);

  return [
    `A stronger version could be:`,
    `“One reason I am a strong fit for ${role} is my ability to adapt quickly, stay organized, and deliver results in demanding environments.`,
    `For example, in a previous role I managed multiple priorities, communicated clearly with stakeholders, and helped improve outcomes through consistent follow-through.`,
    `That experience taught me how to stay calm under pressure and focus on practical solutions, which I believe would allow me to contribute effectively to ${company}.”`,
    original ? `This version improves on your original answer by being more specific, better structured, and more employer-focused.` : '',
    question ? `It also answers the question more directly.` : '',
  ]
    .filter(Boolean)
    .join(' ');
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

/**
 * --------------------------------------------------------------------------
 * LIVE INTERVIEW ROUTES
 * --------------------------------------------------------------------------
 */

app.post('/interview/live/start', async (req, res) => {
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
      return res.status(400).json({
        error: 'targetRole is required',
      });
    }

    const totalQuestions = 5;
    const sessionId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const firstQuestion = pickFirstQuestion({
      interviewType,
      targetRole,
      companyName,
      difficulty,
    });

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
      audioUrl: null,
      recruiterVoice,
      speakerMode,
      microphoneMode,
      recordingQuality,
    });
  } catch (error) {
    console.error('live interview start error:', error);
    return res.status(500).json({
      error: 'Failed to start interview',
    });
  }
});

app.post('/api/interview/live/start', async (req, res) => {
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
      return res.status(400).json({
        error: 'targetRole is required',
      });
    }

    const totalQuestions = 5;
    const sessionId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const firstQuestion = pickFirstQuestion({
      interviewType,
      targetRole,
      companyName,
      difficulty,
    });

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
      audioUrl: null,
      recruiterVoice,
      speakerMode,
      microphoneMode,
      recordingQuality,
    });
  } catch (error) {
    console.error('api live interview start error:', error);
    return res.status(500).json({
      error: 'Failed to start interview',
    });
  }
});

app.post('/interview/live/respond/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Interview session not found',
      });
    }

    if (session.isComplete) {
      return res.status(400).json({
        error: 'Interview is already complete',
      });
    }

    const answerText = normalizeString(req.body?.answerText);
    const recruiterVoice = normalizeString(req.body?.recruiterVoice, session.recruiterVoice);
    const simulatedTranscript =
      answerText ||
      normalizeString(req.body?.transcribedText) ||
      (req.body?.audioUri ? 'Voice answer received. Transcript service is not connected yet.' : '');

    const currentQuestion = session.currentQuestion;
    const turnNumber = session.turns.length + 1;
    const isComplete = turnNumber >= session.totalQuestions;
    const coachReply = buildCoachReply(simulatedTranscript, session, turnNumber);
    const scores = buildScores(simulatedTranscript);
    const nextQuestion = isComplete ? null : buildNextQuestion(session);

    const turn = {
      turnNumber,
      question: currentQuestion,
      answerText: simulatedTranscript,
      transcribedText: simulatedTranscript,
      coachReply,
      nextQuestion,
      isComplete,
      audioUrl: null,
      feedback: {
        clarity: scores.clarity,
        structure: scores.structure,
        relevance: scores.relevance,
        strength:
          scores.relevance >= 8
            ? 'Your answer is relevant and persuasive. Keep sharpening the examples and outcomes.'
            : 'Your answer has a useful foundation, but it will be stronger with a clearer example and result.',
        strongerSampleAnswer: buildStrongerSampleAnswer(
          session,
          currentQuestion,
          simulatedTranscript
        ),
      },
      recruiterVoice,
      createdAt: new Date().toISOString(),
    };

    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();
    session.recruiterVoice = recruiterVoice;
    session.currentQuestion = nextQuestion || session.currentQuestion;
    session.isComplete = isComplete;

    liveInterviewSessions.set(sessionId, session);

    return res.status(200).json(turn);
  } catch (error) {
    console.error('live interview respond error:', error);
    return res.status(500).json({
      error: 'Failed to process interview answer',
    });
  }
});

app.post('/api/interview/live/respond/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Interview session not found',
      });
    }

    if (session.isComplete) {
      return res.status(400).json({
        error: 'Interview is already complete',
      });
    }

    const answerText = normalizeString(req.body?.answerText);
    const recruiterVoice = normalizeString(req.body?.recruiterVoice, session.recruiterVoice);
    const simulatedTranscript =
      answerText ||
      normalizeString(req.body?.transcribedText) ||
      (req.body?.audioUri ? 'Voice answer received. Transcript service is not connected yet.' : '');

    const currentQuestion = session.currentQuestion;
    const turnNumber = session.turns.length + 1;
    const isComplete = turnNumber >= session.totalQuestions;
    const coachReply = buildCoachReply(simulatedTranscript, session, turnNumber);
    const scores = buildScores(simulatedTranscript);
    const nextQuestion = isComplete ? null : buildNextQuestion(session);

    const turn = {
      turnNumber,
      question: currentQuestion,
      answerText: simulatedTranscript,
      transcribedText: simulatedTranscript,
      coachReply,
      nextQuestion,
      isComplete,
      audioUrl: null,
      feedback: {
        clarity: scores.clarity,
        structure: scores.structure,
        relevance: scores.relevance,
        strength:
          scores.relevance >= 8
            ? 'Your answer is relevant and persuasive. Keep sharpening the examples and outcomes.'
            : 'Your answer has a useful foundation, but it will be stronger with a clearer example and result.',
        strongerSampleAnswer: buildStrongerSampleAnswer(
          session,
          currentQuestion,
          simulatedTranscript
        ),
      },
      recruiterVoice,
      createdAt: new Date().toISOString(),
    };

    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();
    session.recruiterVoice = recruiterVoice;
    session.currentQuestion = nextQuestion || session.currentQuestion;
    session.isComplete = isComplete;

    liveInterviewSessions.set(sessionId, session);

    return res.status(200).json(turn);
  } catch (error) {
    console.error('api live interview respond error:', error);
    return res.status(500).json({
      error: 'Failed to process interview answer',
    });
  }
});

app.get('/interview/live/report/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Interview session not found',
      });
    }

    const turns = Array.isArray(session.turns) ? session.turns : [];
    const avg = (key) => {
      if (!turns.length) return 0;
      const total = turns.reduce((sum, item) => sum + Number(item.feedback?.[key] || 0), 0);
      return Math.round((total / turns.length) * 10) / 10;
    };

    return res.status(200).json({
      sessionId: session.sessionId,
      targetRole: session.targetRole,
      companyName: session.companyName,
      interviewType: session.interviewType,
      difficulty: session.difficulty,
      coachTone: session.coachTone,
      isComplete: session.isComplete,
      totalQuestions: session.totalQuestions,
      completedTurns: turns.length,
      averages: {
        clarity: avg('clarity'),
        structure: avg('structure'),
        relevance: avg('relevance'),
      },
      summary:
        turns.length > 0
          ? 'You completed a recruiter-style practice interview. Focus next on stronger examples, clearer structure, and more explicit results.'
          : 'No interview answers have been submitted yet.',
      turns,
    });
  } catch (error) {
    console.error('live interview report error:', error);
    return res.status(500).json({
      error: 'Failed to fetch interview report',
    });
  }
});

app.get('/api/interview/live/report/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Interview session not found',
      });
    }

    const turns = Array.isArray(session.turns) ? session.turns : [];
    const avg = (key) => {
      if (!turns.length) return 0;
      const total = turns.reduce((sum, item) => sum + Number(item.feedback?.[key] || 0), 0);
      return Math.round((total / turns.length) * 10) / 10;
    };

    return res.status(200).json({
      sessionId: session.sessionId,
      targetRole: session.targetRole,
      companyName: session.companyName,
      interviewType: session.interviewType,
      difficulty: session.difficulty,
      coachTone: session.coachTone,
      isComplete: session.isComplete,
      totalQuestions: session.totalQuestions,
      completedTurns: turns.length,
      averages: {
        clarity: avg('clarity'),
        structure: avg('structure'),
        relevance: avg('relevance'),
      },
      summary:
        turns.length > 0
          ? 'You completed a recruiter-style practice interview. Focus next on stronger examples, clearer structure, and more explicit results.'
          : 'No interview answers have been submitted yet.',
      turns,
    });
  } catch (error) {
    console.error('api live interview report error:', error);
    return res.status(500).json({
      error: 'Failed to fetch interview report',
    });
  }
});

app.get('/api/interview/live/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveInterviewSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Interview session not found',
      });
    }

    return res.status(200).json(sessionPublicShape(session));
  } catch (error) {
    console.error('api live interview session error:', error);
    return res.status(500).json({
      error: 'Failed to fetch interview session',
    });
  }
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
app.use('/assets', jobReadyRoutes);
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