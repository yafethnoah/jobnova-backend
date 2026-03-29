
const fs = require('fs');
const path = require('path');
const { getOpenAI, transcribeAudio, synthesizeSpeech } = require('./openai');

const GENERATED_AUDIO_DIR = path.join(__dirname, '..', 'data', 'generated', 'live-interview');
fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    const jsonBlock = String(value || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonBlock) {
      try {
        return JSON.parse(jsonBlock[1]);
      } catch {}
    }
    const obj = String(value || '').match(/\{[\s\S]*\}/);
    if (obj) {
      try {
        return JSON.parse(obj[0]);
      } catch {}
    }
    return fallback;
  }
}

function voiceStyleHint(voice) {
  const map = {
    verse: 'balanced, polished recruiter tone',
    alloy: 'clear, executive recruiter tone',
    sage: 'warm, experienced recruiter tone',
    ash: 'crisp, high-accountability recruiter tone',
  };
  return map[cleanText(voice, 'verse')] || map.verse;
}

function buildSystemPrompt(session) {
  const turnsText = (session.turns || [])
    .slice(-4)
    .map((turn, index) => `Turn ${index + 1}\nQuestion: ${turn.question}\nAnswer: ${turn.answerText}\nCoach reply: ${turn.coachReply}`)
    .join('\n\n');

  return `You are JobNova's senior recruiter interviewer.

Act like a realistic human recruiter, not a chatbot. Keep the flow warm, direct, professional, and role-specific.
You are conducting a multi-question mock interview for a candidate.

Your goals:
- Ask one strong recruiter-style question at a time.
- React first like a human interviewer, then coach briefly.
- Use short natural phrases such as "That helps.", "Good example.", "I want to go deeper there." when appropriate.
- Sound natural, concise, and credible.
- Push for evidence, ownership, judgement, and business impact.
- If the answer is weak, explain the gap clearly without being rude.
- If the answer is strong, explain exactly why it works.
- Make the next question feel like a natural follow-up in the same interview.

Return ONLY valid JSON with this exact shape:
{
  "coachReply": "string",
  "nextQuestion": "string",
  "isComplete": false,
  "feedback": {
    "clarity": 1,
    "structure": 1,
    "relevance": 1,
    "strength": "string",
    "improvements": ["string"],
    "strongerSampleAnswer": "string",
    "confidenceHint": "string"
  }
}

Rules:
- clarity, structure, relevance must be integers 1 to 10
- keep coachReply short and recruiter-like, maximum 2 concise recruiter-style paragraphs
- strongerSampleAnswer must sound like a real spoken answer, not textbook jargon
- improvements must be concrete and actionable
- confidenceHint should be one short delivery cue
- if the interview is complete, set isComplete true and nextQuestion to an empty string

Interview context:
- targetRole: ${session.targetRole}
- companyName: ${session.companyName || 'Not provided'}
- interviewType: ${session.interviewType}
- difficulty: ${session.difficulty}
- coachTone: ${session.coachTone}
- recruiterVoice: ${session.recruiterVoice}
- voiceStyleHint: ${voiceStyleHint(session.recruiterVoice)}
- currentTurn: ${(session.turns || []).length + 1}
- totalQuestions: ${session.totalQuestions}
- adapt difficulty up when answers are consistently strong, and probe gently when answers are weak
- if interviewType is panel, speak as a panel chair summarizing what the panel wants to hear
- if interviewType is technical, probe process, tools, risk, and accuracy
- if interviewType is situational, ask future-facing judgement questions
- if interviewType is competency, focus on leadership, ownership, teamwork, and judgement

Recent turns:
${turnsText || 'No prior turns yet.'}`.trim();
}

function heuristicFeedback(answerText = '', currentQuestion = '', session = {}) {
  const text = cleanText(answerText, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\b\d+[%]?\b/.test(text);
  const hasAction = /\b(led|managed|built|improved|coordinated|implemented|resolved|delivered|created|supported|launched|streamlined)\b/i.test(text);
  const hasResult = /\b(result|impact|reduced|increased|improved|delivered|achieved|completed|saved|grew)\b/i.test(text);
  const hasStructure = /\b(first|then|because|situation|task|action|result|outcome)\b/i.test(text);

  let clarity = 5 + (words > 35 ? 1 : 0) + (words > 80 ? 1 : 0);
  let structure = 5 + (hasStructure ? 2 : 0) + (hasAction && hasResult ? 1 : 0);
  let relevance = 5 + (hasAction ? 1 : 0) + (hasResult ? 1 : 0) + (hasNumbers ? 1 : 0);

  clarity = Math.max(3, Math.min(10, clarity));
  structure = Math.max(3, Math.min(10, structure));
  relevance = Math.max(3, Math.min(10, relevance));

  const role = cleanText(session.targetRole, 'this role');
  const nextBank = [
    `Give me a more specific example that shows your judgement in a ${role} situation.`,
    `What was the measurable result, and how did you know your approach worked?`,
    `If you faced that situation again, what would you do the same and what would you change?`,
    `How would you explain that example to a hiring manager who cares about business impact?`,
    `What was the hardest part of that situation, and how did you personally handle it?`,
  ];

  return {
    coachReply: hasResult
      ? 'That answer has useful substance. Now make it sharper by landing the result faster and being more direct about your decision-making.'
      : 'You have a usable example, but it still sounds broad. I need clearer action, stronger ownership, and a more explicit result.',
    nextQuestion: (session.turns || []).length + 1 >= session.totalQuestions ? '' : nextBank[(session.turns || []).length % nextBank.length],
    isComplete: (session.turns || []).length + 1 >= session.totalQuestions,
    feedback: {
      clarity,
      structure,
      relevance,
      strength: hasAction
        ? 'The answer sounds grounded in real experience, which helps credibility.'
        : 'The answer has intent, but it needs stronger ownership language to sound interview-ready.',
      improvements: [
        hasStructure ? 'Shorten the setup and move faster into your action.' : 'Use a visible STAR shape: brief context, your action, then the result.',
        hasResult ? 'Keep the result sentence shorter and more decisive.' : 'End with a concrete outcome so the impact is obvious.',
        `Connect the story more directly to what matters in ${role}.`,
      ],
      strongerSampleAnswer: 'In that situation, I first clarified the risk and immediate priority, then aligned the key stakeholders on the plan, executed the work in stages, and tracked the outcome closely. That helped me deliver a cleaner result, reduce confusion, and build trust with the people relying on my work.',
      confidenceHint: 'Slow down slightly, finish each sentence cleanly, and sound more decisive in the action step.',
    },
  };
}

async function transcribeAudioFile(filePath) {
  const client = getOpenAI();
  if (!client) return '';
  return cleanText(await transcribeAudio(filePath));
}

async function generateInterviewTurn({ session, currentQuestion, answerText }) {
  const client = getOpenAI();
  if (!client) return heuristicFeedback(answerText, currentQuestion, session);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_INTERVIEW_MODEL || 'gpt-4.1-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(session) },
      {
        role: 'user',
        content: `Current question:\n${currentQuestion}\n\nCandidate answer:\n${answerText}\n\nImportant:\n- decide whether the interview should continue\n- if continuing, ask the next best recruiter follow-up question\n- if this was the final turn, set isComplete true\n- keep the coaching highly practical\n- return JSON only`
      },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '{}';
  const parsed = safeJsonParse(text, null);
  if (!parsed) return heuristicFeedback(answerText, currentQuestion, session);

  return {
    coachReply: cleanText(parsed.coachReply, 'Good base. Tighten the structure and end with a clearer result.'),
    nextQuestion: cleanText(parsed.nextQuestion, ''),
    isComplete: Boolean(parsed.isComplete),
    feedback: {
      clarity: Math.max(1, Math.min(10, Number(parsed.feedback?.clarity || 6))),
      structure: Math.max(1, Math.min(10, Number(parsed.feedback?.structure || 6))),
      relevance: Math.max(1, Math.min(10, Number(parsed.feedback?.relevance || 6))),
      strength: cleanText(parsed.feedback?.strength, 'The answer is relevant, but it still needs tighter structure and a more explicit result.'),
      improvements: Array.isArray(parsed.feedback?.improvements)
        ? parsed.feedback.improvements.filter(Boolean).slice(0, 5)
        : ['Lead with the situation in one sentence.', 'Describe your action more directly.', 'End with a clear result.'],
      strongerSampleAnswer: cleanText(parsed.feedback?.strongerSampleAnswer, 'A stronger answer would quickly set the context, describe your actions clearly, and finish with the measurable result.'),
      confidenceHint: cleanText(parsed.feedback?.confidenceHint, 'Slow down slightly and sound more certain in the action step.'),
    },
  };
}

async function synthesizeSpeechToFile({ text, voice = 'verse', sessionId, turnNumber }) {
  if (!cleanText(text)) return null;
  const client = getOpenAI();
  if (!client) return null;

  const filename = `${sessionId}-turn-${turnNumber}-${Date.now()}.mp3`;
  const absolutePath = path.join(GENERATED_AUDIO_DIR, filename);
  await synthesizeSpeech(text, absolutePath, voice, { model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts' });

  return {
    absolutePath,
    publicUrl: `/api/downloads/live-interview/${filename}`,
  };
}

module.exports = {
  GENERATED_AUDIO_DIR,
  transcribeAudioFile,
  generateInterviewTurn,
  synthesizeSpeechToFile,
};
