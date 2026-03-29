export type ExportArtifact = {
  id?: string;
  label: string;
  type: 'resume' | 'cover-letter' | 'recruiter-email';
  format: 'docx' | 'pdf' | 'txt';
  fileName: string;
  downloadUrl?: string;
  createdAt?: string;
  targetRole?: string;
  companyName?: string;
};

export type ResumeThemeId = 'modern-minimal' | 'classic-canadian-professional' | 'executive-clean' | 'nonprofit-academic-friendly';
export type LayoutMode = 'one-page' | 'two-page';
export type ExportFormat = 'docx' | 'pdf' | 'both';

export type DocumentTemplate = {
  id: string;
  name: string;
  category: 'Resume' | 'Cover letter';
  atsSafety: string;
  bestFor: string;
  description: string;
  supportsThemes?: ResumeThemeId[];
  supportsLayouts?: LayoutMode[];
};

export type JobReadyInput = {
  targetRole: string;
  companyName?: string;
  fullName?: string;
  resumeText?: string;
  jobDescription?: string;
  jobPostingUrl?: string;
  selectedResumeTemplateId?: string;
  selectedCoverLetterTemplateId?: string;
  selectedResumeThemeId?: ResumeThemeId;
  selectedLayoutMode?: LayoutMode;
  selectedExportFormat?: ExportFormat;
  selectedResumeExportFormat?: ExportFormat;
  selectedCoverLetterExportFormat?: ExportFormat;
  selectedRecruiterEmailExportFormat?: ExportFormat;
};

export type JobReadyPackage = {
  packageId?: string;
  packageBundleUrl?: string;
  packageBundleFileName?: string;
  roleTitle: string;
  companyName: string;
  exportSummary?: string;
  amendedResume: unknown;
  tailoredResume?: unknown;
  coverLetter: unknown;
  coverLetterHighlights?: unknown;
  resumeMatchInsights?: unknown;
  recruiterMessage?: string;
  recruiterEmailSubject: unknown;
  recruiterEmailBody: unknown;
  thankYouEmail?: string;
  linkedinHeadline?: unknown;
  linkedinAbout?: unknown;
  atsBenchmark?: {
    overallScore: number;
    marketAverage: number;
    top10Percent: number;
    semanticMatch: number;
    recruiterFit: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    formattingRisks: string[];
    strengths: string[];
    recommendations: string[];
  };
  careerNarrative?: {
    positioningStatement: string;
    topThemes: string[];
    interviewBridge: string;
  };
  recruiterLens?: string[];
  quickWins?: string[];
  exportArtifacts: ExportArtifact[];
  selectedResumeTemplateId?: string;
  selectedCoverLetterTemplateId?: string;
  selectedResumeThemeId?: ResumeThemeId;
  selectedLayoutMode?: LayoutMode;
  selectedExportFormat?: ExportFormat;
  selectedResumeExportFormat?: ExportFormat;
  selectedCoverLetterExportFormat?: ExportFormat;
  selectedRecruiterEmailExportFormat?: ExportFormat;
  recommendedResumeTemplateId?: string;
  recommendedCoverLetterTemplateId?: string;
  exportWarning?: string;
  parsedJobPosting?: {
    title?: string;
    company?: string;
    location?: string;
    source?: string;
    extractionMethod?: string;
    warning?: string;
    finalUrl?: string;
    url?: string;
    confidence?: 'high' | 'medium' | 'low';
    sourceQuality?: 'high' | 'medium' | 'low';
  } | null;
};
