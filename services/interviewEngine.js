const { askOpenAI } = require('../lib/openai');
const { detectRoleProfile } = require('./roleIntelligence');
const { clean } = require('./profileIntelligence');

const QUESTION_BANK = {
  default: [
    'Tell me about yourself and why this role fits your background.',
    'Describe a time you had to manage competing priorities under pressure.',
    'Tell me about a conflict you handled with a colleague or stakeholder.',
    'Give an example of how you improved a process or solved a recurring problem.',
    'Why should we hire you, and what would success look like in your first 90 days?'
  ]
};

function getQuestion(role, index = 0) {
  const questions = QUESTION_BANK.default;
  return { role: role || 'Target role', question: questions[index] ?? questions[questions.length - 1], index, total: questions.length };
}

function safeJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(text);
}

async function getFeedback(payload) {
  const roleProfile = detectRoleProfile(payload.role, payload.question, payload.answer);
  const prompt = [
    'You are an interview coach.',
    'Return strict JSON with keys clarity,structure,relevance,strength,improvements,strongerSampleAnswer.',
    'Be direct, specific, and evidence-based.',
    `Role family: ${roleProfile.label}`,
    `Question: ${payload.question}`,
    `Answer: ${payload.answer}`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out) return safeJson(out);
  } catch {}
  const answer = (payload.answer || '').trim();
  const length = answer.length;
  const hasResult = /result|outcome|improved|reduced|increased|completed|delivered/i.test(answer);
  const hasAction = /i\s+(led|created|organized|coordinated|resolved|implemented|managed|supported|improved|maintained|prepared)/i.test(answer);
  const hasStructure = /situation|task|action|result/i.test(answer) || (hasAction && hasResult && length > 180);
  const clarity = Math.max(5, Math.min(10, Math.round(length / 70) + (hasAction ? 1 : 0)));
  const structure = hasStructure ? 8 : length > 120 ? 6 : 5;
  const relevance = 7 + (clean(payload.role) ? 1 : 0);
  return {
    clarity,
    structure,
    relevance,
    strength: hasAction ? 'Your answer sounds grounded in real work, which helps credibility.' : 'There is usable material here, but the action you took still needs a clearer spine.',
    improvements: [
      hasStructure ? 'Tighten the story so the result lands earlier.' : 'Use a sharper STAR structure: situation, task, action, result.',
      hasResult ? 'Keep one concrete result near the end of the answer.' : 'State the result more clearly so the impact is obvious.',
      `Bring in more ${roleProfile.interviewFocus[0] || 'role-relevant'} language where it fits truthfully.`
    ],
    strongerSampleAnswer: 'In a previous role, I handled multiple priorities by ranking work by risk and deadline, aligning expectations early, and tracking progress visibly. That kept delivery reliable, reduced follow-up issues, and improved confidence from the people relying on me.'
  };
}

async function generateFirstQuestion(payload) {
  const roleProfile = detectRoleProfile(payload.targetRole, payload.companyName, payload.interviewType);
  const prompt = [
    'You are acting as a recruiter conducting a realistic live interview.',
    'Return only the first interview question as plain text.',
    `Target role: ${payload.targetRole || roleProfile.label}`,
    `Company: ${payload.companyName || 'Unknown company'}`,
    `Interview type: ${payload.interviewType || 'behavioral'}`,
    `Difficulty: ${payload.difficulty || 'medium'}`,
    `Tone: ${payload.coachTone || 'realistic'}`,
    `Role focus: ${roleProfile.interviewFocus.join(', ')}`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out && out.trim()) return out.trim().replace(/^"|"$/g, '');
  } catch {}
  return `Tell me about yourself and why ${payload.targetRole || roleProfile.label} is the right next step for you.`;
}

async function startLiveSession(payload) {
  const firstQuestion = await generateFirstQuestion(payload);
  return {
    sessionId: `live-${Date.now()}`,
    payload,
    status: 'active',
    questionIndex: 0,
    totalQuestions: 5,
    currentQuestion: firstQuestion,
    transcript: [{ speaker: 'coach', text: firstQuestion }],
    answers: []
  };
}

async function createLiveTurnFeedback(session, answerText) {
  const currentQuestion = session.currentQuestion || session.transcript.filter((t) => t.speaker === 'coach').slice(-1)[0]?.text || 'Tell me about yourself.';
  const detailed = await getFeedback({ role: session.payload?.targetRole || '', question: currentQuestion, answer: answerText || '' });
  const roleProfile = detectRoleProfile(session.payload?.targetRole, currentQuestion, answerText);
  const isLast = session.questionIndex + 1 >= session.totalQuestions;
  let nextQuestion = null;
  let coachReply = 'Thanks. Let me push you a bit further.';

  if (!isLast) {
    const prompt = [
      'You are a recruiter in a live interview.',
      'Return strict JSON only with keys coachReply and nextQuestion.',
      'coachReply should briefly coach the candidate based on the last answer, then transition naturally.',
      'nextQuestion should be a realistic next interview question in the same interview.',
      `Target role: ${session.payload?.targetRole || roleProfile.label}`,
      `Interview type: ${session.payload?.interviewType || 'behavioral'}`,
      `Role focus: ${roleProfile.interviewFocus.join(', ')}`,
      `Previous question: ${currentQuestion}`,
      `Candidate answer: ${answerText}`,
      `Feedback summary: ${JSON.stringify(detailed)}`
    ].join('\n');
    try {
      const out = await askOpenAI(prompt);
      if (out) {
        const parsed = safeJson(out);
        coachReply = parsed.coachReply || coachReply;
        nextQuestion = parsed.nextQuestion || null;
      }
    } catch {}
    if (!nextQuestion) nextQuestion = `Give me an example that shows your ${roleProfile.interviewFocus[1] || 'problem solving'} in action.`;
    if (!coachReply || coachReply.length < 10) coachReply = `Good start. Tighten the result and make your ${roleProfile.interviewFocus[0] || 'role-relevant'} impact clearer.`;
    session.currentQuestion = nextQuestion;
  } else {
    coachReply = 'Good. We have enough material to generate your final coaching report.';
    session.status = 'completed';
    session.currentQuestion = null;
  }

  session.answers.push({ question: currentQuestion, answer: answerText || '', feedback: detailed });
  session.transcript.push({ speaker: 'user', text: answerText || '' });
  session.transcript.push({ speaker: 'coach', text: coachReply });
  if (nextQuestion) session.transcript.push({ speaker: 'coach', text: nextQuestion });
  session.questionIndex += 1;

  return {
    isComplete: isLast,
    transcribedText: answerText || '',
    question: currentQuestion,
    coachReply,
    nextQuestion,
    feedback: detailed
  };
}

async function completeLiveSession(sessionId, payload = {}, existingSession = null) {
  const transcript = existingSession?.transcript || payload.transcript || [];
  const answers = existingSession?.answers || [];
  const scoresFromAnswers = answers.length ? {
    clarity: Math.round(answers.reduce((sum, item) => sum + item.feedback.clarity * 10, 0) / answers.length),
    relevance: Math.round(answers.reduce((sum, item) => sum + item.feedback.relevance * 10, 0) / answers.length),
    star: Math.round(answers.reduce((sum, item) => sum + item.feedback.structure * 10, 0) / answers.length),
    confidence: Math.max(60, Math.round((answers.reduce((sum, item) => sum + item.feedback.clarity + item.feedback.relevance, 0) / (answers.length * 2)) * 10))
  } : { clarity: 78, relevance: 84, star: 66, confidence: 80 };
  const combinedAnswer = answers.map((item) => item.answer).join(' ');
  const fillerWordCount = (combinedAnswer.match(/\b(um|uh|like|you know|basically|actually)\b/gi) || []).length;
  return {
    sessionId,
    summary: `You completed a live recruiter-style interview for ${payload.targetRole || 'the target role'}. Your answers were strongest when you described your direct actions and weakest when the results stayed vague or too delayed.`,
    strengths: ['You sounded grounded in real work rather than memorized script.', 'Your role motivation was visible.', 'You responded to coaching across turns, which is exactly how real interview improvement works.'],
    improvementAreas: ['Lead with your action earlier.', 'Make the result line more explicit in every answer.', 'Use one specific example for each competency instead of staying broad.'],
    personalizedTips: ['Open with the action you took, not the background scenery.', 'Mention one measurable or observable outcome whenever possible.', 'Use the employer’s role language only where it truthfully matches your experience.'],
    nextPracticePlan: ['Rehearse a two-minute Tell me about yourself answer.', 'Practice one conflict story using STAR.', 'Record one success story with a clear outcome and replay it once.'],
    transcript,
    scores: scoresFromAnswers,
    fillerWordCount,
    suggestedImprovedAnswer: answers[0]?.feedback?.strongerSampleAnswer || 'In my previous role, I handled multiple priorities by ranking work by risk and deadline, aligning stakeholders early, and creating a simple tracker. That helped me keep delivery reliable and communication clear.'
  };
}

module.exports = { getQuestion, getFeedback, startLiveSession, completeLiveSession, createLiveTurnFeedback };


async function getLiveInterviewFeedback(payload = {}) {
  const transcriptText = Array.isArray(payload.transcript)
    ? payload.transcript.map((item) => `${item.speaker || 'user'}: ${item.text || ''}`).join('\n')
    : String(payload.transcript || '');
  return {
    overallScore: 79,
    clarityScore: 80,
    structureScore: 74,
    relevanceScore: 82,
    confidenceScore: 77,
    strengths: ['Clear intent', 'Role-aware examples', 'Strong professional tone'],
    weaknesses: ['Results need more detail', 'A tighter STAR arc would help'],
    improvedAnswer: 'Lead with the action you took, then land the result earlier so the story feels more decisive.',
    nextActions: ['Practice one prioritization story.', 'Practice one conflict story with a measurable outcome.'],
    transcript: transcriptText
  };
}

module.exports.getLiveInterviewFeedback = getLiveInterviewFeedback;
