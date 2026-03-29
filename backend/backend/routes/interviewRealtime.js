const express = require('express');
const multer = require('multer');

const interviewRealtimeRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const sessions = new Map();

function uid(prefix = 'live') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function pickArrayValue(arr, index) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr[Math.min(index, arr.length - 1)] || '';
}

function buildQuestionBank({ interviewType, targetRole, companyName }) {
  const role = targetRole || 'this role';
  const company = companyName || 'this company';

  const behavioral = [
    `Tell me about yourself and why you are a strong fit for ${role}.`,
    `Describe a time you handled competing priorities in a role related to ${role}.`,
    `Tell me about a time you had to communicate something difficult to a stakeholder.`,
    `Describe an achievement that best demonstrates your impact in a similar role.`,
    `Why do you want to work for ${company}, and what value would you add quickly?`,
  ];

  const situational = [
    `If you joined ${company} tomorrow as ${role}, what would your first 30 days look like?`,
    `How would you respond if priorities changed suddenly and deadlines stayed the same?`,
    `What would you do if a manager disagreed with your recommended approach?`,
    `How would you handle a missed deadline that affects other teams?`,
    `If you saw a process inefficiency, how would you raise and solve it?`,
  ];

  const technical = [
    `What tools, frameworks, or systems are most important for success in ${role}?`,
    `Walk me through a real process or workflow you managed that relates to ${role}.`,
    `How do you measure quality and accuracy in your work?`,
    `Describe a complex problem you solved using data, systems, or structured analysis.`,
    `How do you keep your skills current for a role like ${role}?`,
  ];

  if (interviewType === 'situational') return situational;
  if (interviewType === 'technical') return technical;
  if (interviewType === 'mixed') {
    return [
      behavioral[0],
      situational[1],
      behavioral[2],
      technical[1],
      situational[4],
    ];
  }
  return behavioral;
}

function scoreAnswer(answerText = '') {
  const text = normalizeText(answerText, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasNumbers = /\b\d+[%]?\b/.test(text);
  const hasResultWords = /\b(result|impact|improved|reduced|increased|delivered|achieved|led|managed)\b/i.test(text);
  const hasStructureWords = /\b(first|then|because|therefore|situation|task|action|result)\b/i.test(text);

  let clarity = 5;
  let structure = 5;
  let relevance = 5;

  if (wordCount > 35) clarity += 1;
  if (wordCount > 70) clarity += 1;
  if (hasStructureWords) structure += 2;
  if (hasNumbers) relevance += 2;
  if (hasResultWords) relevance += 1;

  clarity = Math.min(10, clarity);
  structure = Math.min(10, structure);
  relevance = Math.min(10, relevance);

  const strength = hasNumbers
    ? 'Good use of specifics. Your answer becomes stronger because it includes evidence or measurable impact.'
    : 'Your answer is understandable, but it would feel more convincing with measurable outcomes and more concrete examples.';

  const strongerSampleAnswer =
    'A stronger answer uses a brief situation, the action you took, and a measurable result. Keep it specific, concise, and clearly tied to the role.';

  return {
    clarity,
    structure,
    relevance,
    strength,
    strongerSampleAnswer,
  };
}

function buildCoachReply({ feedback, answerText, recruiterVoice }) {
  const concise = normalizeText(answerText, '').split(/\s+/).slice(0, 18).join(' ');
  const voiceLine =
    recruiterVoice === 'nova'
      ? 'I want to hear more precision and confident ownership.'
      : recruiterVoice === 'alloy'
      ? 'Keep the answer sharper and more outcome-driven.'
      : 'Give me a clearer story with stronger results.';

  if (!concise) {
    return `I did not receive a strong spoken answer yet. ${voiceLine}`;
  }

  return `You gave a usable response. ${feedback.strength} ${voiceLine} The next version should be tighter, role-specific, and sound more decisive.`;
}

function buildSummary(session) {
  const turns = session.turns || [];
  if (!turns.length) {
    return 'No completed responses were captured in this session.';
  }

  const totals = turns.reduce(
    (acc, turn) => {
      acc.clarity += turn.feedback.clarity || 0;
      acc.structure += turn.feedback.structure || 0;
      acc.relevance += turn.feedback.relevance || 0;
      return acc;
    },
    { clarity: 0, structure: 0, relevance: 0 }
  );

  const count = turns.length;
  const avgClarity = Math.round(totals.clarity / count);
  const avgStructure = Math.round(totals.structure / count);
  const avgRelevance = Math.round(totals.relevance / count);

  return {
    overallScore: Math.round((avgClarity + avgStructure + avgRelevance) / 3),
    communicationScore: avgClarity,
    structureScore: avgStructure,
    relevanceScore: avgRelevance,
    strengths: [
      'You stayed engaged in a recruiter-style flow.',
      'You completed a live practice sequence instead of only reading scripted text.',
    ],
    improvements: [
      'Use more measurable results.',
      'Answer with tighter structure and clearer decision-making.',
      'Connect examples directly to the target role.',
    ],
    recommendedNextSteps: [
      'Repeat the interview with the same role and improve one answer at a time.',
      'Turn your strongest spoken stories into polished STAR answers.',
      'Practice with AI voice enabled so the session feels closer to a real recruiter conversation.',
    ],
  };
}

// POST /api/interview/realtime/live/start
interviewRealtimeRouter.post('/live/start', async (req, res) => {
  try {
    const targetRole = normalizeText(req.body?.targetRole, 'Target Role');
    const companyName = normalizeText(req.body?.companyName, '');
    const interviewType = normalizeText(req.body?.interviewType, 'behavioral');
    const difficulty = normalizeText(req.body?.difficulty, 'medium');
    const coachTone = normalizeText(req.body?.coachTone, 'realistic');
    const recruiterVoice = normalizeText(req.body?.recruiterVoice, 'verse');

    const questionBank = buildQuestionBank({
      interviewType,
      targetRole,
      companyName,
    });

    const sessionId = uid('session');
    const firstQuestion = pickArrayValue(questionBank, 0);

    sessions.set(sessionId, {
      sessionId,
      targetRole,
      companyName,
      interviewType,
      difficulty,
      coachTone,
      recruiterVoice,
      questionBank,
      currentIndex: 0,
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      sessionId,
      firstQuestion,
      totalQuestions: questionBank.length,
      audioUrl: null,
      targetRole,
      companyName,
      interviewType,
      difficulty,
      coachTone,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not start live interview.',
    });
  }
});

// POST /api/interview/realtime/live/respond
interviewRealtimeRouter.post(
  '/live/respond',
  upload.single('audio'),
  async (req, res) => {
    try {
      const sessionId = normalizeText(
        req.body?.sessionId || req.query?.sessionId,
        ''
      );

      if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({
          message: 'Live interview session not found.',
        });
      }

      const session = sessions.get(sessionId);
      const recruiterVoice = normalizeText(
        req.body?.recruiterVoice,
        session.recruiterVoice || 'verse'
      );

      const typedAnswer = normalizeText(req.body?.answerText, '');
      const hasAudio = Boolean(req.file?.buffer?.length);

      // Placeholder transcript behavior until real STT is connected
      const transcribedText = typedAnswer || (hasAudio ? 'Voice answer captured successfully.' : '');

      if (!transcribedText) {
        return res.status(400).json({
          message: 'No answer was provided.',
        });
      }

      const feedback = scoreAnswer(transcribedText);
      const coachReply = buildCoachReply({
        feedback,
        answerText: transcribedText,
        recruiterVoice,
      });

      const nextIndex = session.currentIndex + 1;
      const isComplete = nextIndex >= session.questionBank.length;
      const nextQuestion = isComplete
        ? undefined
        : pickArrayValue(session.questionBank, nextIndex);

      const turn = {
        id: uid('turn'),
        createdAt: new Date().toISOString(),
        question: pickArrayValue(session.questionBank, session.currentIndex),
        answerText: transcribedText,
        feedback,
        coachReply,
        nextQuestion,
        isComplete,
        audioUrl: null,
      };

      session.turns.push(turn);
      session.currentIndex = nextIndex;
      session.updatedAt = new Date().toISOString();
      session.recruiterVoice = recruiterVoice;

      sessions.set(sessionId, session);

      return res.status(200).json({
        coachReply,
        nextQuestion,
        audioUrl: null,
        transcribedText,
        isComplete,
        feedback,
      });
    } catch (error) {
      return res.status(500).json({
        message: error?.message || 'Could not process live interview response.',
      });
    }
  }
);

// POST /api/interview/realtime/live/complete
interviewRealtimeRouter.post('/live/complete', async (req, res) => {
  try {
    const sessionId = normalizeText(req.body?.sessionId, '');

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(404).json({
        message: 'Live interview session not found.',
      });
    }

    const session = sessions.get(sessionId);
    const report = buildSummary(session);

    session.completedAt = new Date().toISOString();
    session.report = report;
    sessions.set(sessionId, session);

    return res.status(200).json({
      ok: true,
      sessionId,
      summary: 'Live interview completed successfully.',
      report,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not complete live interview.',
    });
  }
});

// GET /api/interview/realtime/live/report?sessionId=...
interviewRealtimeRouter.get('/live/report', async (req, res) => {
  try {
    const sessionId = normalizeText(req.query?.sessionId, '');

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(404).json({
        message: 'Live interview session not found.',
      });
    }

    const session = sessions.get(sessionId);
    const report = session.report || buildSummary(session);

    return res.status(200).json({
      ok: true,
      sessionId,
      summary: 'Live interview report loaded successfully.',
      report,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not load live interview report.',
    });
  }
});

module.exports = { interviewRealtimeRouter };