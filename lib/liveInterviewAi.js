const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const GENERATED_AUDIO_DIR = path.join(
  __dirname,
  '..',
  'data',
  'generated',
  'live-interview'
);

fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildSystemPrompt(session) {
  return `
You are JobNova's AI recruiter interviewer.

Your role:
- act like a realistic professional recruiter
- ask one interview question at a time
- evaluate the candidate answer
- give concise recruiter-style coaching
- generate the next best follow-up question
- keep the interview natural, warm, professional, and role-specific
- adapt to role, company, interview type, difficulty, and tone

Rules:
- never sound robotic
- do not overexplain
- ask concise questions
- feedback must be practical
- scores must be integers from 1 to 10
- strongerSampleAnswer must sound natural and interview-ready
- if the answer is weak, explain clearly how to improve it
- if the interview is complete, set isComplete to true and nextQuestion to ""

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
    "strongerSampleAnswer": "string"
  }
}

Interview context:
- targetRole: ${session.targetRole}
- companyName: ${session.companyName || 'Not provided'}
- interviewType: ${session.interviewType}
- difficulty: ${session.difficulty}
- coachTone: ${session.coachTone}
- recruiterVoice: ${session.recruiterVoice}
- currentTurn: ${session.turns.length + 1}
- totalQuestions: ${session.totalQuestions}
`.trim();
}

async function transcribeAudioFile(filePath) {
  const transcription = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe',
  });

  return cleanText(transcription.text);
}

async function generateInterviewTurn({ session, currentQuestion, answerText }) {
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_INTERVIEW_MODEL || 'gpt-4.1-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(session),
      },
      {
        role: 'user',
        content: `
Current question:
${currentQuestion}

Candidate answer:
${answerText}

Important:
- decide whether interview should continue
- if continuing, ask a stronger next question
- if this was the final turn, set isComplete true
- return JSON only
        `.trim(),
      },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '{}';
  const parsed = safeJsonParse(text, null);

  if (!parsed) {
    throw new Error('Failed to parse AI interview response.');
  }

  return {
    coachReply: cleanText(
      parsed.coachReply,
      'Good effort. Make your answer more specific and results-focused.'
    ),
    nextQuestion: cleanText(parsed.nextQuestion, ''),
    isComplete: Boolean(parsed.isComplete),
    feedback: {
      clarity: Math.max(1, Math.min(10, Number(parsed.feedback?.clarity || 6))),
      structure: Math.max(1, Math.min(10, Number(parsed.feedback?.structure || 6))),
      relevance: Math.max(1, Math.min(10, Number(parsed.feedback?.relevance || 6))),
      strength: cleanText(
        parsed.feedback?.strength,
        'Your answer has a useful base, but it needs stronger structure and a clearer result.'
      ),
      strongerSampleAnswer: cleanText(
        parsed.feedback?.strongerSampleAnswer,
        'I would answer this by giving a specific example, describing my actions clearly, and ending with the result I achieved.'
      ),
    },
  };
}

async function synthesizeSpeechToFile({
  text,
  voice = 'verse',
  sessionId,
  turnNumber,
}) {
  if (!cleanText(text)) return null;

  const response = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    voice,
    input: text,
    format: 'mp3',
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${sessionId}-turn-${turnNumber}-${Date.now()}.mp3`;
  const absolutePath = path.join(GENERATED_AUDIO_DIR, filename);

  fs.writeFileSync(absolutePath, buffer);

  return {
    absolutePath,
    publicUrl: `/api/downloads/live-interview/${filename}`,
  };
}

module.exports = {
  transcribeAudioFile,
  generateInterviewTurn,
  synthesizeSpeechToFile,
};