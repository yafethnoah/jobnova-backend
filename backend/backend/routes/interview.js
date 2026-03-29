const express = require('express');

const router = express.Router();

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildQuestionSet({ interviewType, targetRole, companyName }) {
  const role = targetRole || 'this role';
  const company = companyName || 'this company';

  const behavioral = [
    `Tell me about yourself and why you are a strong fit for ${role}.`,
    `Describe a time you solved a difficult problem in a role similar to ${role}.`,
    `Tell me about a time you had to manage competing priorities.`,
    `Describe an achievement that had measurable impact.`,
    `Why do you want to work for ${company}?`,
  ];

  const situational = [
    `If you joined ${company} tomorrow as ${role}, what would you focus on first?`,
    `How would you handle a sudden change in priorities with the same deadline?`,
    `What would you do if a manager challenged your recommendation?`,
    `How would you respond to a conflict between two stakeholders?`,
    `How would you improve a process that is slowing down your team?`,
  ];

  const technical = [
    `What tools or systems are most important for success in ${role}?`,
    `Walk me through a real workflow or process you managed that is relevant to ${role}.`,
    `How do you check quality and accuracy in your work?`,
    `Describe a data-driven or systems-based problem you solved.`,
    `How do you stay current in your professional field?`,
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

function scoreSampleAnswer(answerText = '') {
  const text = normalizeText(answerText, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasMetrics = /\b\d+[%]?\b/.test(text);
  const hasAction = /\b(led|managed|improved|reduced|increased|delivered|built|created|coordinated|implemented)\b/i.test(
    text
  );
  const hasStructure = /\b(first|then|because|result|situation|task|action)\b/i.test(
    text
  );

  let clarity = 5;
  let structure = 5;
  let relevance = 5;

  if (wordCount > 30) clarity += 1;
  if (wordCount > 70) clarity += 1;
  if (hasStructure) structure += 2;
  if (hasAction) relevance += 1;
  if (hasMetrics) relevance += 2;

  return {
    clarity: Math.min(10, clarity),
    structure: Math.min(10, structure),
    relevance: Math.min(10, relevance),
    strength: hasMetrics
      ? 'Strong answer foundation. You used specific evidence, which makes your answer more credible.'
      : 'Good starting point. Add measurable outcomes and clearer evidence to make the answer more persuasive.',
    strongerSampleAnswer:
      'A stronger answer should briefly explain the situation, the action you took, and the measurable result. Keep it focused on the role and end with the outcome.',
  };
}

function buildMockTranscriptQuestions({ targetRole, companyName, interviewType }) {
  const questions = buildQuestionSet({ interviewType, targetRole, companyName });

  return questions.map((question, index) => ({
    id: makeId('question'),
    order: index + 1,
    question,
  }));
}

router.post('/start', async (req, res) => {
  try {
    const targetRole = normalizeText(req.body?.targetRole, 'Target Role');
    const companyName = normalizeText(req.body?.companyName, '');
    const interviewType = normalizeText(req.body?.interviewType, 'behavioral');
    const difficulty = normalizeText(req.body?.difficulty, 'medium');
    const coachTone = normalizeText(req.body?.coachTone, 'realistic');

    const questions = buildMockTranscriptQuestions({
      targetRole,
      companyName,
      interviewType,
    });

    return res.status(200).json({
      ok: true,
      sessionId: makeId('interview'),
      targetRole,
      companyName,
      interviewType,
      difficulty,
      coachTone,
      questions,
      firstQuestion: questions[0]?.question || 'Tell me about yourself.',
      totalQuestions: questions.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not start interview.',
    });
  }
});

router.post('/score', async (req, res) => {
  try {
    const answerText = normalizeText(req.body?.answerText, '');
    const feedback = scoreSampleAnswer(answerText);

    return res.status(200).json({
      ok: true,
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not score interview answer.',
    });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const answerText = normalizeText(req.body?.answerText, '');
    const feedback = scoreSampleAnswer(answerText);

    return res.status(200).json({
      ok: true,
      summary:
        'Interview feedback generated successfully. Focus on clarity, structure, and measurable impact.',
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Could not generate interview feedback.',
    });
  }
});

router.get('/types', (_req, res) => {
  return res.status(200).json({
    ok: true,
    items: [
      { label: 'Behavioral', value: 'behavioral' },
      { label: 'Situational', value: 'situational' },
      { label: 'Mixed', value: 'mixed' },
      { label: 'Technical', value: 'technical' },
    ],
  });
});

module.exports = router;