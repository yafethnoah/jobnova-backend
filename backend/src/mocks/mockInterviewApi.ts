import { mockDelay } from '@/src/lib/mockDelay';
import type {
  InterviewFeedbackPayload,
  InterviewFeedbackResponse,
  InterviewQuestionResponse
} from '@/src/features/interview/interview.types';

const QUESTION_BANK: Record<string, string[]> = {
  default: [
    'Tell me about yourself and why this role fits your background.',
    'Describe a time you had to manage competing priorities under pressure.',
    'Tell me about a conflict you handled with a colleague or stakeholder.',
    'Give an example of how you improved a process or solved a recurring problem.',
    'Why should we hire you, and what would success look like in your first 90 days?'
  ],
  hr: [
    'Tell me about a time you supported onboarding or employee documentation under tight timelines.',
    'Describe how you handled a sensitive employee issue while maintaining confidentiality.',
    'Give an example of coordinating multiple hiring stakeholders at once.',
    'How have you used systems, spreadsheets, or HR tools to keep work accurate?',
    'What would you focus on during your first 90 days in an HR coordinator role?'
  ]
};

function chooseSet(role: string) {
  const value = role.toLowerCase();
  return value.includes('hr') || value.includes('people') ? QUESTION_BANK.hr : QUESTION_BANK.default;
}

export const mockInterviewApi = {
  async getQuestion(role: string, index = 0): Promise<InterviewQuestionResponse> {
    await mockDelay(350);
    const questions = chooseSet(role || 'default');
    return {
      role: role || 'Target role',
      question: questions[index] ?? questions[questions.length - 1],
      index,
      total: questions.length
    };
  },

  async getFeedback(payload: InterviewFeedbackPayload): Promise<InterviewFeedbackResponse> {
    await mockDelay(450);
    const answer = payload.answer.trim();
    const length = answer.length;
    const hasResult = /result|outcome|improved|reduced|increased|completed|delivered/i.test(answer);
    const hasAction = /i\s+(led|created|organized|coordinated|resolved|implemented|managed|supported|improved)/i.test(answer);
    const hasStructure = /situation|task|action|result/i.test(answer) || (hasAction && hasResult && length > 180);

    const clarity = Math.max(5, Math.min(10, Math.round(length / 70) + (hasAction ? 1 : 0)));
    const structure = hasStructure ? 8 : length > 120 ? 6 : 5;
    const relevance = payload.role ? (new RegExp(payload.role.split(' ')[0], 'i').test(answer) ? 8 : 7) : 7;

    return {
      clarity,
      structure,
      relevance,
      strength: hasAction
        ? 'You sound like someone who actually did the work, which is the point of the ritual.'
        : 'Your answer has useful material, but it needs a clearer action spine.',
      improvements: [
        hasStructure ? 'Tighten the story so the result lands faster.' : 'Use a sharper STAR structure: situation, task, action, result.',
        hasResult ? 'Add one more concrete metric or business outcome if you genuinely have one.' : 'State the result more explicitly so the impact is obvious.',
        'Name your actions directly instead of hovering around them with vague wording.'
      ],
      strongerSampleAnswer: 'In a previous role, I had several urgent requests competing at once. I prioritized by risk and deadline, clarified expectations with stakeholders, and created a simple tracking system so nothing slipped. The result was faster turnaround, fewer follow-up issues, and better confidence from the people relying on me.'
    };
  }
};
