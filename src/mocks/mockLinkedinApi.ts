import { mockDelay } from '@/src/lib/mockDelay';
import type { LinkedInOptimizationResult } from '@/src/features/profile/linkedin.types';

function extractTerms(text: string) {
  const words = text.toLowerCase().match(/[a-z][a-z+ -]{2,}/g) || [];
  return Array.from(new Set(words.filter((w) => ['placement', 'coordinator', 'employer', 'partnership', 'student', 'recruitment', 'onboarding', 'stakeholder', 'career', 'program', 'operations', 'hr'].some((k) => w.includes(k)))));
}

export const mockLinkedinApi = {
  async optimize(payload: { url: string; targetRole?: string; jobDescription?: string; jobPostingUrl?: string; resumeText?: string }): Promise<LinkedInOptimizationResult> {
    await mockDelay(600);
    const role = payload.targetRole || 'Target Role';
    const overlap = extractTerms(`${role} ${payload.jobDescription || ''} ${payload.resumeText || ''}`);
    return {
      url: payload.url,
      headlineScore: 63,
      aboutScore: 68,
      keywordOverlap: overlap.slice(0, 5),
      missingKeywords: ['placement strategy', 'employer outreach', 'student advising'].filter((k) => !overlap.includes(k)),
      improvedHeadline: `${role} | Employer Partnerships | Student Success | Program Coordination`,
      improvedAbout: `Professionally grounded and mission-driven candidate targeting ${role} opportunities. Strong background in coordination, stakeholder relationships, and service delivery, with a focus on practical results, collaboration, and employer-facing communication.`,
      featuredSuggestions: [
        'Add one featured resume or portfolio item tailored to your target role.',
        'Pin a short accomplishment post about a project or outcome you led.',
        'List one measurable achievement in the About section.'
      ],
      skillsToAdd: overlap.slice(0, 5).map((item) => item.replace(/\b\w/g, (m) => m.toUpperCase())),
      contentIdeas: [
        `Write a short post connecting your experience to ${role}.`,
        'Share one measurable outcome from a project you led.',
        'Post a practical lesson you learned in your field.'
      ]
    };
  }
};
