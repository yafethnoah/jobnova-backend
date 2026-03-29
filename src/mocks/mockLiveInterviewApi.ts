import type {
  LiveInterviewTurnResponse,
  VoiceInterviewReport,
  VoiceInterviewSetup,
} from '@/src/features/interview/liveInterview.types';
import { mockDelay } from '@/src/lib/mockDelay';

type StoredTurn = {
  question: string;
  answerText: string;
  coachReply: string;
  feedback: LiveInterviewTurnResponse['feedback'];
};

type StoredSession = {
  id: string;
  index: number;
  questions: string[];
  transcript: { speaker: 'coach' | 'user'; text: string }[];
  answers: string[];
  turns: StoredTurn[];
  setup: VoiceInterviewSetup;
  dynamicDepth: number;
};

const sessions = new Map<string, StoredSession>();

function normalizeText(value: string) {
  return String(value || '').trim();
}

function buildQuestionBank(payload: VoiceInterviewSetup): string[] {
  const role = payload.targetRole || 'this role';
  const company = payload.companyName || 'the company';
  const bank: Record<string, string[]> = {
    behavioral: [
      `Tell me about yourself and why you are a strong fit for ${role}.`,
      `Describe a time you handled competing priorities in a ${role} context.`,
      'Tell me about a conflict or stakeholder challenge you handled and what happened.',
      'Give me an example of improving a process, service, or workflow.',
      `Why should ${company} hire you, and what would success look like in your first 90 days?`,
    ],
    situational: [
      `If you joined ${company} as ${role}, how would you approach your first 30 days?`,
      'Suppose two urgent priorities land at the same time. How would you decide what to do first?',
      'If a manager pushed back on your recommendation, how would you respond?',
      'If a key stakeholder became frustrated late in a project, how would you reset the conversation?',
      'If you noticed a process risk that others were ignoring, what would you do?',
    ],
    technical: [
      `Walk me through a real workflow, system, or technical process you managed that relates to ${role}.`,
      'Describe a complex problem you solved using tools, systems, or structured analysis.',
      'How do you check accuracy and quality in your work?',
      'Tell me about a decision where you balanced speed, quality, and risk.',
      `What technical strengths would you bring to ${role} at ${company}?`,
    ],
    competency: [
      `What is the strongest competency you would bring to ${role}, and what example proves it?`,
      'Tell me about a time you showed leadership without formal authority.',
      'Describe a moment that tested your judgement under pressure.',
      'How have you shown accountability when outcomes were uncertain?',
      'What example best demonstrates your communication strength in a professional setting?',
    ],
    panel: [
      `Imagine you are speaking to a panel. Give us a concise introduction and explain why ${role} fits your background.`,
      'One panel member cares about delivery, another about teamwork, and another about judgement. Tell us a story that answers all three concerns.',
      'How would previous managers, peers, and stakeholders describe your working style?',
      'Tell us about a time you had to influence several people with different priorities.',
      'Why would a panel choose you over another strong candidate?',
    ],
    hr: [
      `Walk me through your background and how it prepares you for ${role}.`,
      'How do you build trust with a manager or team early on?',
      'Tell me about a difficult conversation you handled professionally.',
      'How do you stay organized when several requests arrive at once?',
      `What would make you stand out to ${company} compared with other candidates?`,
    ],
    newcomer_confidence: [
      `Tell me about yourself and the experience you bring that is most relevant to ${role}.`,
      'How do you explain your international experience in a way that helps Canadian employers understand your value?',
      'Tell me about a result that shows you can adapt quickly in a new environment.',
      'How do you build confidence when entering a new labour market?',
      `What would you want a recruiter at ${company} to remember most about you after this interview?`,
    ],
    salary: [
      `Before we discuss compensation, tell me what value you believe you would bring to ${company}.`,
      `How do you evaluate the right compensation level for a role like ${role}?`,
      'Tell me about a time you justified your value with evidence, outcomes, or scope.',
      'How would you handle a compensation conversation if the first number felt low?',
      'What total package would make this opportunity compelling for you and why?',
    ],
  };

  const questions = [...(bank[payload.interviewType] || bank.behavioral)];
  if (payload.difficulty === 'easy') return questions.slice(0, 4);
  if (payload.difficulty === 'hard') {
    questions.splice(2, 0, 'Tell me about a time your first approach did not work and how you recovered.');
    return questions.slice(0, 6);
  }
  return questions;
}

function scoreAnswer(answer: string, question: string) {
  const text = normalizeText(answer);
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const questionWords = normalizeText(question)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((item) => item.length > 4);
  const matchedIntent = questionWords.filter((item) => lower.includes(item)).length;
  const hasResult = /(result|impact|improved|reduced|increased|saved|delivered|completed|achieved)/i.test(text);
  const hasOwnership = /\b(i|my|me|led|managed|coordinated|built|resolved|delivered|implemented|created|owned|drove|guided|presented)\b/i.test(text);
  const hasStructure = /(situation|task|action|result|first|then|finally|because|so that)/i.test(text);
  const hasNumbers = /\b\d+(%|x)?\b/.test(text);
  const brevityPenalty = words.length < 18 ? 2 : 0;

  const clarity = Math.max(3, Math.min(10, 5 + (words.length >= 35 ? 1 : 0) + (words.length >= 75 ? 1 : 0) + (hasNumbers ? 1 : 0) - brevityPenalty));
  const structure = Math.max(3, Math.min(10, 5 + (hasStructure ? 2 : 0) + (hasResult ? 1 : 0) - brevityPenalty));
  const relevance = Math.max(3, Math.min(10, 5 + Math.min(matchedIntent, 2) + (hasOwnership ? 1 : 0) + (hasResult ? 1 : 0)));

  return {
    clarity,
    structure,
    relevance,
    hasResult,
    hasOwnership,
    words: words.length,
    strong: clarity >= 8 && structure >= 7 && relevance >= 7,
    weak: clarity <= 5 || structure <= 5 || relevance <= 5,
  };
}

function buildProbe(session: StoredSession, score: ReturnType<typeof scoreAnswer>) {
  const role = session.setup.targetRole || 'this role';
  if (score.weak) {
    return `Pause there. I want one tighter example. What exactly did you do, and what changed because of it in a ${role} setting?`;
  }
  if (score.strong) {
    return `Good answer. Now go one level deeper for me: what judgement call did you personally make, and why did that choice matter?`;
  }
  return `What was the measurable result, and how did you know your approach worked?`;
}

function buildCoachReply(payload: VoiceInterviewSetup, score: ReturnType<typeof scoreAnswer>, nextQuestion: string | null) {
  const tone = payload.coachTone;
  const opening = score.strong
    ? tone === 'strict'
      ? 'That answer is solid. Keep the same quality and make the result even more explicit.'
      : 'That is a strong answer. It sounds credible, specific, and recruiter-ready.'
    : score.weak
      ? tone === 'supportive'
        ? 'You have the right idea. Now tighten it so the recruiter hears your action and the result more clearly.'
        : 'That answer is still too broad. I need clearer ownership, stronger structure, and a result I can remember.'
      : 'That answer is workable. The next gain is sharper structure and a faster result statement.';

  const middle = score.hasResult
    ? 'Keep the business impact visible earlier in the answer.'
    : 'Add a concrete result before you finish so the answer lands with impact.';

  const bridge = nextQuestion
    ? `Follow-up: ${nextQuestion}`
    : 'That completes the session. I am preparing your final report.';

  return `${opening} ${middle} ${bridge}`.trim();
}

function strongerSampleAnswer(payload: VoiceInterviewSetup) {
  const role = payload.targetRole || 'the role';
  return `In a recent situation related to ${role}, I first clarified the goal and the risk, then organized the work by priority, aligned the key stakeholders, and adjusted quickly when issues appeared. That helped me deliver a stronger result, reduce confusion, and build trust with the people relying on my work.`;
}

function buildReport(session: StoredSession): VoiceInterviewReport {
  const count = Math.max(session.turns.length, 1);
  const clarity = Math.round(session.turns.reduce((sum, turn) => sum + turn.feedback.clarity, 0) / count);
  const structure = Math.round(session.turns.reduce((sum, turn) => sum + turn.feedback.structure, 0) / count);
  const relevance = Math.round(session.turns.reduce((sum, turn) => sum + turn.feedback.relevance, 0) / count);

  return {
    sessionId: session.id,
    summary: `You completed a realistic ${session.setup.interviewType} interview for ${session.setup.targetRole}. Your strongest answers sounded credible and relevant. The next step is to sharpen structure, show clearer judgement, and land the result faster.`,
    strengths: [
      'You practiced with a turn-by-turn interview flow instead of memorizing one answer.',
      'Your answers stayed tied to the target role.',
      'The interview pushed you to explain action, ownership, and impact like a real recruiter screen.',
    ],
    improvementAreas: [
      'Use a clearer STAR shape so the listener can follow the story faster.',
      'State the result earlier and with more evidence.',
      'Trim long setup sentences and move faster into your action.',
    ],
    personalizedTips: [
      'Open with one sentence of context, then move directly into your action.',
      'Use one measurable detail whenever possible.',
      'End each story with the business or team impact, not just the task completed.',
    ],
    nextPracticePlan: [
      'Repeat the same interview style once more and improve one answer at a time.',
      'Practice your best story in under 90 seconds.',
      'Rehearse one follow-up question where you explain your judgement under pressure.',
    ],
    transcript: session.transcript,
    scores: {
      clarity: clarity * 10,
      relevance: relevance * 10,
      star: structure * 10,
      confidence: Math.round(((clarity + relevance) / 2) * 10),
    },
    fillerWordCount: 0,
    suggestedImprovedAnswer: strongerSampleAnswer(session.setup),
    deliveryInsights: {
      pace: 'Aim for a calm, steady pace with a slightly shorter opening.',
      answerLength: 'Most answers should feel complete within 60 to 90 seconds.',
      starCoverage: 'Visible STAR structure will make your answers sound more recruiter-ready.',
      recruiterReadiness: 'You are building real interview readiness, not just practicing sample lines.',
      fillerPatterns: ['like', 'um', 'you know'],
    },
    momentumPlan: [
      'Re-record your strongest answer with a clearer result statement.',
      'Practice one panel-style answer where you balance delivery, teamwork, and judgement.',
      'Do one stricter round to build composure under pressure.',
    ],
  };
}

export const mockLiveInterviewApi = {
  async start(payload: VoiceInterviewSetup): Promise<{ sessionId: string; firstQuestion: string; totalQuestions: number; voiceName?: string | null }> {
    await mockDelay(180);
    const questions = buildQuestionBank(payload);
    const sessionId = `live-${Date.now()}`;
    sessions.set(sessionId, {
      id: sessionId,
      index: 0,
      questions,
      transcript: [{ speaker: 'coach', text: questions[0] }],
      answers: [],
      turns: [],
      setup: payload,
      dynamicDepth: 0,
    });
    return {
      sessionId,
      firstQuestion: questions[0],
      totalQuestions: questions.length,
      voiceName: payload.recruiterVoice || 'verse',
    };
  },

  async respond(sessionId: string, payload: { answerText?: string }): Promise<LiveInterviewTurnResponse> {
    await mockDelay(260);
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Live interview session not found. Start a new session and try again.');
    }

    const answer = normalizeText(payload.answerText || 'I recently handled a situation by clarifying the goal, aligning the stakeholders, and driving the work to a measurable result.');
    const question = session.questions[session.index] || session.questions[session.questions.length - 1];
    const score = scoreAnswer(answer, question);

    session.answers.push(answer);
    session.transcript.push({ speaker: 'user', text: answer });

    let nextQuestion: string | null = null;
    let isComplete = false;

    const canProbe = session.dynamicDepth < 1 && (score.weak || score.strong);
    if (canProbe) {
      session.dynamicDepth += 1;
      nextQuestion = buildProbe(session, score);
    } else {
      session.dynamicDepth = 0;
      session.index += 1;
      if (session.index >= session.questions.length) {
        isComplete = true;
        nextQuestion = null;
      } else {
        nextQuestion = session.questions[session.index];
      }
    }

    const feedback: LiveInterviewTurnResponse['feedback'] = {
      clarity: score.clarity,
      structure: score.structure,
      relevance: score.relevance,
      strength: score.hasOwnership
        ? 'Your answer sounds grounded in real experience, which helps credibility.'
        : 'Your answer has intent, but it needs stronger ownership language to sound interview-ready.',
      improvements: [
        score.words > 110
          ? 'Trim the opening so the strongest point lands earlier.'
          : 'Open with one short setup sentence, then move quickly into your action.',
        score.hasResult
          ? 'Keep the result sentence short and decisive.'
          : 'End with a concrete, visible result so the impact is obvious.',
        `Connect the story more directly to what matters in ${session.setup.targetRole || 'the role'}.`,
      ],
      strongerSampleAnswer: strongerSampleAnswer(session.setup),
      confidenceHint: score.strong
        ? 'Keep the same calm pace and finish your result with more certainty.'
        : 'Slow down slightly and sound more decisive in the action step.',
    };

    const coachReply = buildCoachReply(session.setup, score, nextQuestion);

    session.turns.push({
      question,
      answerText: answer,
      coachReply,
      feedback,
    });
    session.transcript.push({ speaker: 'coach', text: [coachReply, nextQuestion].filter(Boolean).join(' ') });
    sessions.set(sessionId, session);

    return {
      isComplete,
      transcribedText: answer,
      question,
      coachReply,
      nextQuestion,
      voiceName: session.setup.recruiterVoice || 'verse',
      feedback,
    };
  },

  async complete(sessionId: string, _payload: VoiceInterviewSetup): Promise<VoiceInterviewReport> {
    await mockDelay(220);
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Live interview session not found. Start a new session and try again.');
    }
    return buildReport(session);
  },
};
