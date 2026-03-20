export type InterviewType = 'behavioral' | 'hr' | 'technical' | 'newcomer_confidence' | 'salary';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type CoachTone = 'supportive' | 'realistic' | 'strict';

export type RecruiterVoice = 'alloy' | 'verse' | 'sage' | 'ash';
export type SpeakerMode = 'auto' | 'ai_voice' | 'device_voice';
export type MicrophoneMode = 'voice_preferred' | 'voice_only' | 'text_fallback';
export type RecordingQuality = 'standard' | 'high';

export type VoiceInterviewSetup = {
  targetRole: string;
  companyName?: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  coachTone: CoachTone;
  recruiterVoice?: RecruiterVoice;
  speakerMode?: SpeakerMode;
  microphoneMode?: MicrophoneMode;
  recordingQuality?: RecordingQuality;
};

export type VoiceInterviewTurn = {
  speaker: 'coach' | 'user';
  text: string;
};

export type LiveInterviewTurnResponse = {
  isComplete: boolean;
  transcribedText: string;
  question: string;
  coachReply: string;
  nextQuestion: string | null;
  audioUrl?: string | null;
  voiceName?: string | null;
  feedback: {
    clarity: number;
    structure: number;
    relevance: number;
    strength: string;
    improvements: string[];
    strongerSampleAnswer: string;
  };
};

export type VoiceInterviewReport = {
  sessionId: string;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  personalizedTips: string[];
  nextPracticePlan: string[];
  transcript: VoiceInterviewTurn[];
  scores: {
    clarity: number;
    relevance: number;
    star: number;
    confidence: number;
  };
  fillerWordCount: number;
  suggestedImprovedAnswer: string;
};
