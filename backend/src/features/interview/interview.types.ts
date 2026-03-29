export type InterviewQuestionResponse = {
  question: string;
  role: string;
  index: number;
  total: number;
};

export type InterviewFeedbackPayload = {
  role: string;
  question: string;
  answer: string;
};

export type InterviewFeedbackResponse = {
  clarity: number;
  structure: number;
  relevance: number;
  strength: string;
  improvements: string[];
  strongerSampleAnswer: string;
};
