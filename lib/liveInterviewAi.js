const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const GENERATED_AUDIO_DIR = path.join(__dirname, '..', 'data', 'generated', 'live-interview');
fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function voiceStyleHint(voice) {
  const map = {
    verse: 'balanced, calm, polished recruiter tone',
    alloy: 'clear, steady, executive recruiter tone',
    sage: 'warm, experienced recruiter tone',
    ash: 'crisp, direct, high-accountability recruiter tone',
  };
  return map[cleanText(voice, 'verse')] || map.verse;
}

function buildSystemPrompt(session) {
  return `You are JobNova's senior recruiter interviewer.

Your job:
- sound like a real human recruiter, never like a chatbot
- ask one interview question at a time
- respond briefly after each answer with recruiter-style coaching
- keep the interview natural, warm, concise, and role-specific
- adapt to the target role, company, interview type, difficulty, and coach tone
- if the answer is weak, explain the gap clearly without sounding harsh
- if the answer is strong, explain exactly why it works
- ask progressively stronger follow-up questions across the interview

Scoring rules:
- clarity, structure, and relevance must be integers from 1 to 10
- strongerSampleAnswer must be natural, realistic, and interview-ready
- improvements must be an array of concrete coaching points
- if the interview is complete, set isComplete to true and nextQuestion to an empty string

Style rules:
- no robotic phrasing
- no praise inflation
- no long lectures
- use recruiter language a human candidate would actually hear
- keep coachReply to 1 to 3 short paragraphs max
- prefer STAR-oriented coaching when useful

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
- voiceStyleHint: ${voiceStyleHint(session.recruiterVoice)}
- currentTurn: ${session.turns.length + 1}
- totalQuestions: ${session.totalQuestions}`.trim();
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
    temperature: 0.55,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(session) },
      {
        role: 'user',
        content: `Current question:
${currentQuestion}

Candidate answer:
${answerText}

Important:
- decide whether the interview should continue
- if continuing, ask the next best recruiter follow-up question
- if this was the final turn, set isComplete true
- keep the coaching highly practical
- return JSON only`,
      },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '{}';
  const parsed = safeJsonParse(text, null);
  if (!parsed) {
    throw new Error('Failed to parse AI interview response.');
  }

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
        : [
            'Lead with the situation in one sentence.',
            'Describe your action more directly.',
            'End with a clear result.',
          ],
      strongerSampleAnswer: cleanText(parsed.feedback?.strongerSampleAnswer, 'A stronger answer would quickly set the context, describe your actions clearly, and finish with the measurable result.'),
    },
  };
}

async function synthesizeSpeechToFile({ text, voice = 'verse', sessionId, turnNumber }) {
  if (!cleanText(text)) return null;

  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const response = await client.audio.speech.create({
    model,
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
  GENERATED_AUDIO_DIR,
  transcribeAudioFile,
  generateInterviewTurn,
  synthesizeSpeechToFile,
};
