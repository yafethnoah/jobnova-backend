export type ResumeRewritePayload = {
  resumeText: string;
  jobDescription?: string;
  jobPostingUrl?: string;
  targetRole?: string;
  uploadedFileName?: string;
};

export type ResumeRewriteResponse = {
  summary: unknown;
  improvedBullets: unknown;
  optimizedSkills: unknown;
  priorityKeywords?: unknown;
  roleAlignmentNotes?: unknown;
  rewrittenResume: unknown;
  truthGuardNote: unknown;
  analyzedJobDescription?: string;
  analyzedFromUrl?: boolean;
  jobPostingTitle?: string;
  sourceQuality?: 'high' | 'medium' | 'low' | 'none';
  sourceWarning?: string;
};

export type AtsCheckPayload = {
  resumeText: string;
  jobDescription?: string;
  jobPostingUrl?: string;
  targetRole?: string;
  uploadedFileName?: string;
};

export type AtsCheckResponse = {
  score: number;
  keywordScore: number;
  skillScore: number;
  titleAlignmentScore: number;
  experienceScore: number;
  formattingScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  formattingRisks: string[];
  weakPhrases: string[];
  recommendations: string[];
  strengths: string[];
  gaps: string[];
  analyzedJobDescription?: string;
  analyzedFromUrl?: boolean;
  jobPostingTitle?: string;
  sourceQuality?: 'high' | 'medium' | 'low' | 'none';
  sourceWarning?: string;
};

export type ResumeUploadResponse = {
  ok: boolean;
  message: string;
  fileName: string;
  uploadedFileName: string;
  extractedText?: string;
  uploaded?: boolean;
  bucket?: string;
};
