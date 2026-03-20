import type { LiveInterviewTurnResponse, VoiceInterviewReport, VoiceInterviewSetup } from '@/src/features/interview/liveInterview.types';
import { mockDelay } from '@/src/lib/mockDelay';

const QUESTION_BANK = [
  'Tell me about yourself and why this role fits your background.',
  'Describe a time you handled multiple priorities under pressure.',
  'Tell me about a conflict you handled with a colleague or stakeholder.',
  'Give an example of improving a process or solving a recurring problem.',
  'Why should we hire you, and what would success look like in your first 90 days?'
];

const sessions = new Map<string, { index: number; transcript: Array<{ speaker: 'coach' | 'user'; text: string }>; answers: string[] }>();

export const mockLiveInterviewApi = {
  async start(_payload: VoiceInterviewSetup): Promise<{ sessionId: string; firstQuestion: string; totalQuestions: number }> {
    await mockDelay(300);
    const sessionId = `live-${Date.now()}`;
    sessions.set(sessionId, { index: 0, transcript: [{ speaker: 'coach', text: QUESTION_BANK[0] }], answers: [] });
    return { sessionId, firstQuestion: QUESTION_BANK[0], totalQuestions: QUESTION_BANK.length };
  },
  async respond(sessionId: string, payload: { answerText?: string }): Promise<LiveInterviewTurnResponse> {
    await mockDelay(500);
    const session = sessions.get(sessionId) || { index: 0, transcript: [{ speaker: 'coach', text: QUESTION_BANK[0] }], answers: [] };
    const answer = payload.answerText?.trim() || 'This is a spoken mock answer from the user.';
    const question = QUESTION_BANK[session.index] || QUESTION_BANK[QUESTION_BANK.length - 1];
    session.answers.push(answer);
    session.transcript.push({ speaker: 'user', text: answer });
    session.index += 1;
    const isComplete = session.index >= QUESTION_BANK.length;
    const nextQuestion = isComplete ? null : QUESTION_BANK[session.index];
    const coachReply = isComplete ? 'Session complete. I am generating your final report.' : `Good start. Sharpen the result and keep the structure tighter. Next question: ${nextQuestion}`;
    session.transcript.push({ speaker: 'coach', text: coachReply });
    sessions.set(sessionId, session);
    return {
      isComplete,
      transcribedText: answer,
      question,
      coachReply,
      nextQuestion,
      feedback: {
        clarity: 8,
        structure: 7,
        relevance: 8,
        strength: 'Your answer sounds grounded and relevant.',
        improvements: ['State the result earlier.', 'Name your action more directly.', 'Add one concrete business outcome.'],
        strongerSampleAnswer: 'I ranked the priorities by risk and deadline, aligned stakeholders on what moved first, and used a simple tracker to keep execution visible. That helped the team deliver on time with fewer surprises.'
      }
    };
  },
  async complete(sessionId: string, payload: VoiceInterviewSetup): Promise<VoiceInterviewReport> {
    await mockDelay(700);
    const role = payload.targetRole || 'target role';
    const company = payload.companyName || 'the employer';
    const session = sessions.get(sessionId);
    return {
      sessionId,
      summary: `You handled the ${role} mock interview with useful experience and decent composure, but several answers still need sharper outcomes and cleaner STAR structure for ${company}.`,
      strengths: [
        'Strong motivation and role fit came through clearly.',
        'Examples sounded grounded in real work rather than résumé confetti.',
        'Tone was professional and coachable.'
      ],
      improvementAreas: [
        'Several answers described actions without measurable results.',
        'Conflict examples need a clearer result sentence.',
        'Some responses wandered before reaching the main point.'
      ],
      personalizedTips: [
        'Start behavioral answers with one-sentence context, then move fast into your action.',
        'Use at least one metric or concrete outcome in half your answers.',
        'Name the exact tool, stakeholder, or process you worked with when relevant.'
      ],
      nextPracticePlan: [
        'Rehearse a two-minute Tell me about yourself answer.',
        'Practice one conflict story using STAR.',
        'Practice one success story with a measurable result.'
      ],
      transcript: session?.transcript || [
        { speaker: 'coach', text: `Tell me why you are interested in this ${role} role.` },
        { speaker: 'user', text: `I am interested in this ${role} role because it aligns with my background and I want to contribute in a more focused Canadian context.` }
      ],
      scores: {
        clarity: 78,
        relevance: 84,
        star: 66,
        confidence: 80
      },
      fillerWordCount: 7,
      suggestedImprovedAnswer: `In my previous role, I coordinated several urgent priorities at once by ranking them by risk and deadline, aligning stakeholders on what had to move first, and creating a simple follow-up tracker. As a result, deadlines were met more consistently and communication became much clearer for everyone involved.`
    };
  }
};
