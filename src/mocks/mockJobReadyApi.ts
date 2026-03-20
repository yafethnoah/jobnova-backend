import { mockDelay } from '@/src/lib/mockDelay';
import { mockResumeApi } from '@/src/mocks/mockResumeApi';
import type { JobReadyInput, JobReadyPackage, ExportArtifact, ExportFormat, ResumeThemeId, LayoutMode } from '@/src/features/resume/jobReady.types';

function recommendResumeTemplate(role: string, resumeText = ''): string {
  const normalized = `${role} ${resumeText}`.toLowerCase();
  if (/(director|manager|lead|head)/.test(normalized)) return 'executive-clean';
  if (/(nonprofit|program|student|education|community|research)/.test(normalized)) return 'nonprofit-academic-friendly';
  if (/(hr|human resources|administration|coordinator|support|assistant|healthcare)/.test(normalized)) return 'classic-canadian-professional';
  return 'modern-minimal';
}

function recommendCoverLetterTemplate(role: string): string {
  const normalized = role.toLowerCase();
  if (/(director|manager|lead|head)/.test(normalized)) return 'executive-letter';
  if (/(nonprofit|student|education|community|program|academic)/.test(normalized)) return 'mission-letter';
  if (/(startup|marketing|brand|product|growth|design)/.test(normalized)) return 'modern-header-letter';
  return 'canadian-standard-letter';
}

function pushArtifacts(items: ExportArtifact[], type: ExportArtifact['type'], format: ExportFormat, role: string, company: string, label: string) {
  const base = `${role.replace(/\s+/g, '_')}_${company.replace(/\s+/g, '_')}`;
  if (format === 'docx' || format === 'both') {
    items.push({ type, format: 'docx', label: `${label} Word`, fileName: `${base}_${label.replace(/\s+/g, '_')}.docx`, targetRole: role, companyName: company });
  }
  if (format === 'pdf' || format === 'both') {
    items.push({ type, format: 'pdf', label: `${label} PDF`, fileName: `${base}_${label.replace(/\s+/g, '_')}.pdf`, targetRole: role, companyName: company });
  }
}

function makeArtifacts(role: string, company: string, resumeFormat: ExportFormat, coverFormat: ExportFormat, recruiterFormat: ExportFormat): ExportArtifact[] {
  const items: ExportArtifact[] = [];
  pushArtifacts(items, 'resume', resumeFormat, role, company, 'Resume');
  pushArtifacts(items, 'cover-letter', coverFormat, role, company, 'Cover_Letter');
  pushArtifacts(items, 'recruiter-email', recruiterFormat, role, company, 'Recruiter_Email');
  return items;
}

function themeBlurb(theme: ResumeThemeId, layout: LayoutMode) {
  const themeMap: Record<ResumeThemeId, string> = {
    'modern-minimal': 'a sleek modern hierarchy',
    'classic-canadian-professional': 'a conservative Canadian business structure',
    'executive-clean': 'an executive-ready leadership-forward presentation',
    'nonprofit-academic-friendly': 'a mission-aware nonprofit and academic-friendly presentation'
  };
  return `${themeMap[theme]} with a true ${layout} ATS layout`;
}

export const mockJobReadyApi = {
  async generate(payload: JobReadyInput): Promise<JobReadyPackage> {
    await mockDelay(800);
    const role = payload.targetRole || 'Target Role';
    const company = payload.companyName || 'the organization';
    const resumeTemplateId = payload.selectedResumeTemplateId || recommendResumeTemplate(role, payload.resumeText);
    const coverTemplateId = payload.selectedCoverLetterTemplateId || recommendCoverLetterTemplate(role);
    const exportFormat = payload.selectedExportFormat || 'both';
    const resumeExportFormat = payload.selectedResumeExportFormat || exportFormat;
    const coverExportFormat = payload.selectedCoverLetterExportFormat || exportFormat;
    const recruiterExportFormat = payload.selectedRecruiterEmailExportFormat || exportFormat;
    const resumeThemeId = payload.selectedResumeThemeId || (resumeTemplateId as ResumeThemeId);
    const layoutMode = payload.selectedLayoutMode || 'one-page';
    const recruiterEmailSubject = `${role} application - tailored resume attached`;
    const rewritten = await mockResumeApi.rewrite({
      resumeText: payload.resumeText || 'Base resume text was not provided.',
      jobDescription: payload.jobDescription,
      jobPostingUrl: payload.jobPostingUrl,
      targetRole: role,
      uploadedFileName: undefined
    });
    const recruiterEmailBody = `Hello ${company} Recruitment Team,

I am reaching out regarding the ${role} opportunity. I prepared a tailored application package for this position, and my attached resume is aligned to the role's focus on coordination, communication, and reliable execution.

I would welcome the opportunity to speak further about how I can support your team.

Thank you for your time and consideration.

${payload.fullName || 'Candidate'}`;

    return {
      packageId: `mock-${Date.now()}`,
      packageBundleFileName: `JobNova_${role.replace(/\s+/g, '_')}_Package.zip`,
      roleTitle: role,
      companyName: company,
      exportSummary: `Generated a recruiter-ready package for ${role} at ${company} using ${themeBlurb(resumeThemeId, layoutMode)}. In mock mode, the app prepares Word-friendly and print-friendly fallback documents on device when a live backend file is unavailable.`,
      amendedResume: rewritten.rewrittenResume,
      tailoredResume: rewritten.rewrittenResume,
      coverLetter: `Dear Hiring Team,

I am excited to apply for the ${role} opportunity at ${company}. My background aligns strongly with the role's focus on coordination, communication, and practical execution. This package uses ${themeBlurb(resumeThemeId, layoutMode)} and the ${coverTemplateId} letter structure.

Highlights I would bring to this role include:
• Clear communication with stakeholders and candidates
• Reliable follow-through on scheduling, documentation, and service delivery
• A resume package tailored to the posting language without exaggerating claims

Sincerely,
${payload.fullName || 'Candidate'}`,
      coverLetterHighlights: rewritten.roleAlignmentNotes,
      resumeMatchInsights: [
        `Priority keywords emphasized: ${Array.isArray(rewritten.priorityKeywords) ? rewritten.priorityKeywords.slice(0, 5).join(', ') : 'communication, coordination, results'}.`,
        'The tailored resume was rewritten section by section to improve ATS relevance.',
        'Truth Guard remained active to avoid fake titles, credentials, or metrics.'
      ],
      recruiterMessage: recruiterEmailBody,
      recruiterEmailSubject,
      recruiterEmailBody,
      thankYouEmail: `Thank you for the opportunity to discuss the ${role} role. I appreciated learning more about the team and the priorities of the position. Our conversation strengthened my interest in contributing to ${company}.`,
      linkedinHeadline: `${role} | Coordination | Employer & Stakeholder Relations | Service Delivery`,
      linkedinAbout: `I am pursuing ${role} opportunities where coordination, communication, and service quality matter. My background includes multi-stakeholder work, organized execution, and mission-driven results, and I am focused on bringing those strengths into a strong Canadian employer context.`,
      recommendedResumeTemplateId: recommendResumeTemplate(role, payload.resumeText),
      recommendedCoverLetterTemplateId: recommendCoverLetterTemplate(role),
      selectedResumeTemplateId: resumeTemplateId,
      selectedCoverLetterTemplateId: coverTemplateId,
      selectedResumeThemeId: resumeThemeId,
      selectedLayoutMode: layoutMode,
      selectedExportFormat: exportFormat,
      selectedResumeExportFormat: resumeExportFormat,
      selectedCoverLetterExportFormat: coverExportFormat,
      selectedRecruiterEmailExportFormat: recruiterExportFormat,
      exportArtifacts: makeArtifacts(role, company, resumeExportFormat, coverExportFormat, recruiterExportFormat),
      exportWarning: 'Live server-generated DOCX and PDF files were not returned, so the app will create Word-friendly or print-friendly fallbacks on your device.'
    };
  }
};
