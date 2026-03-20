import { coverLetterTemplates, resumeTemplates } from '@/src/features/resume/resumeTemplates';

export const templatesApi = {
  async listResumeTemplates() {
    return resumeTemplates;
  },
  async listCoverLetterTemplates() {
    return coverLetterTemplates;
  }
};
