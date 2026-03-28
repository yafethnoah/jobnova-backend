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

function buildQuestionBank({ interviewType, targetRole, companyName, coachTone }) {
  const role = targetRole || 'this role';
  const company = companyName || 'this company';

  const behavioral = [
    `Tell me about yourself and why you are a strong fit for ${role}.`,
    `Tell me about a time you handled competing priorities in work related to ${role}.`,
    `Describe a time you had to deal with a difficult stakeholder or colleague. What did you do?`,
    `Give me an example of a problem you solved that improved a process, service, or outcome.`,
    `Why do you want to join ${company}, and what value would you add in your first 90 days?`,
  ];

  const hr = [
    `Walk me through your background and how it prepares you for ${role}.`,
    `Tell me about a time you supported employee issues, people coordination, or sensitive communication.`,
    `Describe how you have handled onboarding, documentation, scheduling, or compliance-related tasks.`,
    `Tell me about a time you had to balance accuracy, confidentiality, and service at the same time.`,
    `If you joined ${company}, how would you build trust quickly with managers, staff, and candidates?`,
  ];

  const technical = [
    `What tools, systems, workflows, or technical processes are most important for success in ${role}?`,
    `Walk me through a real technical or operational problem you solved and how you approached it.`,
    `How do you measure accuracy, quality, and reliability in your work?`,
    `Tell me about a time you used data, systems, or structured analysis to make a better decision.`,
    `What would you need to learn fastest to perform strongly in ${role} at ${company}?`,
  ];

  const newcomerConfidence = [
    `Tell me about yourself and the experience you bring that is most relevant to ${role}.`,
    `How do you explain the value of your international experience to a Canadian employer?`,
    `Tell me about a time you adapted quickly to a new environment, team, or system.`,
    `How do you respond when an employer asks about Canadian experience?`,
    `What would make a recruiter confident that you can succeed quickly in ${role}?`,
  ];

  const salary = [
    `Before we discuss compensation, tell me what value you believe you would bring to ${company}.`,
    `How do you usually evaluate whether a role is the right fit beyond salary alone?`,
    `Tell me about a time you delivered value that justified trust, responsibility, or advancement.`,
    `If we could not meet your ideal number immediately, what factors would still matter to you?`,
    `What would make this opportunity worth accepting for you professionally and financially?`,
  ];

  const mixed = [
    behavioral[0],
    hr[2],
    technical[1],
    newcomerConfidence[2],
    salary[4],
  ];

  const banks = {
    behavioral,
    hr,
    technical,
    newcomer_confidence: newcomerConfidence,
    salary,
    mixed,
  };

  const baseBank = banks[interviewType] || behavioral;

  if (coachTone === 'strict') {
    return baseBank.map((q, index) =>
      index === 0 ? q : `${q} Be specific, concise, and outcome-focused.`
    );
  }

  if (coachTone === 'supportive') {
    return baseBank.map((q, index) =>
      index === 0 ? q : `${q} Take your time and focus on a real example.`
    );
  }

  return baseBank;
}

function scoreAnswer(answerText = '', interviewType = 'behavioral') {
  const text = normalizeText(answerText, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasNumbers = /\b\d+[%]?\b/.test(text);
  const hasResultWords =
    /\b(result|impact|improved|reduced|increased|delivered|achieved|led|managed|resolved|saved|grew|built)\b/i.test(
      text
    );
  const hasStructureWords =
    /\b(first|then|because|therefore|situation|task|action|result|outcome|challenge)\b/i.test(
      text
    );
  const hasRoleLanguage =
    /\b(team|stakeholder|customer|candidate|employee|manager|process|system|data|project|service|communication|compliance)\b/i.test(
      text
    );

  let clarity = 5;
  let structure = 5;
  let relevance = 5;

  if (wordCount > 30) clarity += 1;
  if (wordCount > 65) clarity += 1;
  if (hasStructureWords) structure += 2;
  if (hasNumbers) relevance += 2;
  if (hasResultWords) relevance += 1;
  if (hasRoleLanguage) relevance += 1;

  if (interviewType === 'salary' && /\bvalue|scope|impact|responsibility|market|growth\b/i.test(text)) {
    relevance += 1;
  }

  clarity = Math.min(10, clarity);
  structure = Math.min(10, structure);
  relevance = Math.min(10, relevance);

  const improvements = [];
  if (!hasStructureWords) improvements.push('Use a tighter STAR structure so the recruiter can follow your story faster.');
  if (!hasNumbers) improvements.push('Add a measurable result, scope, or concrete outcome.');
  if (!hasRoleLanguage) improvements.push('Connect your answer more directly to the target role.');
  if (wordCount < 35) improvements.push('Add one more layer of evidence so the answer feels complete.');
  if (wordCount > 170) improvements.push('Tighten the opening and move faster into your action and result.');

  const strength =
    hasNumbers && hasResultWords
      ? 'This answer has stronger recruiter impact because it includes real evidence, clear action, and a visible result.'
      : 'The answer has usable substance, but it still needs more concrete proof, sharper structure, and stronger role alignment.';

  const strongerSampleAnswer =
    'A stronger answer would briefly explain the situation, state the specific action you took, and end with a concrete result that matters to the role.';

  return {
    clarity,
    structure,
    relevance,
    strength,
    strongerSampleAnswer,
    improvements: improvements.slice(0, 4),
    confidenceHint:
      structure >= 7
        ? 'Good direction. Keep the pace steady and land the result sentence with more confidence.'
        : 'Slow down slightly, reduce filler words, and make your action step sound more decisive.',
  };
}

function buildCoachReply({
  feedback,
  interviewType,
  answerText,
  coachTone,
  recruiterVoice,
}) {
  const concise = normalizeText(answerText, '').split(/\s+/).slice(0, 18).join(' ');

  const voiceStyle =
    recruiterVoice === 'alloy'
      ? 'I want to hear clearer ownership and sharper business language.'
      : recruiterVoice === 'sage'
      ? 'Keep the answer warm, polished, and grounded in results.'
      : recruiterVoice === 'ash'
      ? 'Be more direct. Cut the soft opening and get to the evidence faster.'
      : 'Keep it natural, specific, and recruiter-ready.';

  const typeAngle =
    interviewType === 'technical'
      ? 'Show your process clearly, not just the outcome.'
      : interviewType === 'hr'
      ? 'Make the people, coordination, and judgment parts more visible.'
      : interviewType === 'newcomer_confidence'
      ? 'Translate your experience into local employer language with more confidence.'
      : interviewType === 'salary'
      ? 'Anchor your value before you talk about compensation.'
      : 'Use a cleaner STAR structure and stronger result sentence.';

  if (!concise) {
    return `I did not receive a strong answer yet. ${typeAngle} ${voiceStyle}`;
  }

  if (coachTone === 'supportive') {
    return `You have a solid base to work from. ${feedback.strength} ${typeAngle} ${voiceStyle}`;
  }

  if (coachTone === 'strict') {
    return `This answer is not there yet. ${feedback.strength} ${typeAngle} ${voiceStyle}`;
  }

  return `That answer is usable, but not yet shortlist-strong. ${feedback.strength} ${typeAngle} ${voiceStyle}`;
}

function buildSummary(session) {
  const turns = session.turns || [];
  if (!turns.length) {
    return {
      sessionId: session.sessionId,
      summary: 'No completed responses were captured in this session.',
      strengths: ['No completed responses yet.'],
      improvementAreas: ['Start a full interview round to unlock feedback.'],
      personalizedTips: ['Complete one five-question session first.'],
      nextPracticePlan: ['Start another interview session and answer all questions.'],
      transcript: [],
      scores: {
        clarity: 0,
        relevance: 0,
        star: 0,
        confidence: 0,
      },
      fillerWordCount: 0,
      suggestedImprovedAnswer:
        'Use a short situation, direct action, and clear result.',
      deliveryInsights: {
        pace: 'No pace data yet.',
        answerLength: 'No answer length yet.',
        starCoverage: 'No STAR coverage yet.',
        recruiterReadiness: 'Not enough data yet.',
        fillerPatterns: [],
      },
      momentumPlan: ['Complete a full session first.'],
    };
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
  const avgClarity = Math.round((totals.clarity / count) * 10);
  const avgStructure = Math.round((totals.structure / count) * 10);
  const avgRelevance = Math.round((totals.relevance / count) * 10);

  const transcript = [];
  for (const turn of turns) {
    if (turn.question) transcript.push({ speaker: 'coach', text: turn.question });
    if (turn.answerText) transcript.push({ speaker: 'user', text: turn.answerText });
    if (turn.coachReply) transcript.push({ speaker: 'coach', text: turn.coachReply });
  }

  const fillerMap = {};
  const fillerWordCount = turns.reduce((countAcc, turn) => {
    const text = String(turn.answerText || '').toLowerCase();
    const matches = text.match(/\b(um|uh|like|you know|actually|basically)\b/g) || [];
    matches.forEach((item) => {
      fillerMap[item] = (fillerMap[item] || 0) + 1;
    });
    return countAcc + matches.length;
  }, 0);

  const answerWordCounts = turns
    .map((turn) =>
      String(turn.answerText || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    )
    .filter(Boolean);

  const avgAnswerWords = answerWordCounts.length
    ? Math.round(
        answerWordCounts.reduce((sum, item) => sum + item, 0) /
          answerWordCounts.length
      )
    : 0;

  const starHeavyTurns = turns.filter((turn) =>
    /\b(situation|task|action|result|outcome|first|then)\b/i.test(
      String(turn.answerText || '')
    )
  ).length;

  return {
    sessionId: session.sessionId,
    summary: `You completed a ${session.targetRole} interview simulation. Your strongest gains now come from tighter structure, clearer business impact, and more confident recruiter-facing phrasing.`,
    strengths: [
      avgClarity >= 70
        ? 'Your answers were generally clear and easy to follow.'
        : 'You have relevant content, and clarity will improve noticeably with tighter phrasing.',
      avgRelevance >= 70
        ? 'Your examples usually stayed connected to the role.'
        : 'Your experience has value, but it needs stronger role-facing positioning.',
      'You completed a full recruiter-style flow instead of isolated one-question practice.',
    ],
    improvementAreas: [
      avgStructure >= 70
        ? 'Keep the result sentence sharper and more memorable.'
        : 'Use a more visible STAR structure so the recruiter can track your logic quickly.',
      'Name one measurable result or concrete impact more often.',
      'Reduce soft openings and move faster into the action you personally took.',
    ],
    personalizedTips: [
      `For ${session.targetRole}, use one sentence of context, two to three sentences of action, and one strong result sentence.`,
      'If the question is behavioral, avoid abstract claims and anchor your story in one real example.',
      'When in doubt, sound simpler, more direct, and more specific.',
    ],
    nextPracticePlan: [
      'Redo your weakest answer and make it 20% shorter.',
      'Add one measurable result to your strongest story.',
      'Practice one version with a stricter recruiter tone to improve composure under pressure.',
    ],
    transcript,
    scores: {
      clarity: avgClarity,
      relevance: avgRelevance,
      star: avgStructure,
      confidence: Math.round((avgClarity + avgRelevance) / 2),
    },
    fillerWordCount,
    suggestedImprovedAnswer:
      turns[turns.length - 1]?.feedback?.strongerSampleAnswer ||
      'Use a concise STAR structure with a clear result.',
    deliveryInsights: {
      pace:
        avgAnswerWords >= 120
          ? 'Detailed, but at risk of running long. Tighten the opening and reach the result sooner.'
          : avgAnswerWords >= 70
          ? 'Healthy pace with enough detail for a recruiter.'
          : 'Concise pace. Add a little more evidence so the answer feels complete.',
      answerLength: avgAnswerWords
        ? `${avgAnswerWords} words on average per answer`
        : 'No answer length yet',
      starCoverage: `${starHeavyTurns}/${turns.length} answers showed visible STAR-like structure`,
      recruiterReadiness:
        avgClarity >= 70 && avgStructure >= 70 && avgRelevance >= 70
          ? 'Recruiter-screen ready. The next gain is sharper executive polish.'
          : 'Good base, but one more focused rehearsal would noticeably improve recruiter confidence.',
      fillerPatterns: Object.entries(fillerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word, count]) => `${word} (${count})`),
    },
    momentumPlan: [
      'Keep practicing with the same role until your answers sound shorter and stronger.',
      'Turn your best spoken answers into saved STAR stories.',
      'Repeat the interview using a stricter recruiter tone once your clarity improves.',
    ],
  };
}

interviewRealtimeRouter.post('/live/start', async (req, res) => {
  try {
    const targetRole = normalizeText(req.body?.targetRole, 'Target Role');
    const companyName = normalizeText(req.body?.companyName, '');
    const interviewType = normalizeText(req.body?.interviewType, 'behavioral');
    const difficulty = normalizeText(req.body?.difficulty, 'medium');
    const coachTone = normalizeText(req.body?.coachTone, 'realistic');
    const recruiterVoice = normalizeText(req.body?.recruiterVoice, 'verse');
    const speakerMode = normalizeText(req.body?.speakerMode, 'auto');
    const microphoneMode = normalizeText(req.body?.microphoneMode, 'voice_preferred');
    const recordingQuality = normalizeText(req.body?.recordingQuality, 'high');

    const questionBank = buildQuestionBank({
      interviewType,
      targetRole,
      companyName,
      coachTone,
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
      speakerMode,
      microphoneMode,
      recordingQuality,
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
      recruiterVoice,
      speakerMode,
      microphoneMode,
      recordingQuality,
    });
  } catch (error) {
    console.error('[INTERVIEW REALTIME] start failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not start live interview.',
    });
  }
});

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

      const transcribedText =
        typedAnswer || (hasAudio ? 'Voice answer captured successfully.' : '');

      if (!transcribedText) {
        return res.status(400).json({
          message: 'No answer was provided.',
        });
      }

      const feedback = scoreAnswer(transcribedText, session.interviewType);
      const coachReply = buildCoachReply({
        feedback,
        interviewType: session.interviewType,
        answerText: transcribedText,
        coachTone: session.coachTone,
        recruiterVoice,
      });

      const nextIndex = session.currentIndex + 1;
      const isComplete = nextIndex >= session.questionBank.length;
      const nextQuestion = isComplete
        ? null
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
      console.error('[INTERVIEW REALTIME] respond failed:', error);
      return res.status(500).json({
        message: error?.message || 'Could not process live interview response.',
      });
    }
  }
);

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

    return res.status(200).json(report);
  } catch (error) {
    console.error('[INTERVIEW REALTIME] complete failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not complete live interview.',
    });
  }
});

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

    return res.status(200).json(report);
  } catch (error) {
    console.error('[INTERVIEW REALTIME] report failed:', error);
    return res.status(500).json({
      message: error?.message || 'Could not load live interview report.',
    });
  }
});

module.exports = { interviewRealtimeRouter };