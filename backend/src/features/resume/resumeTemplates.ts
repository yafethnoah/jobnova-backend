import type { DocumentTemplate } from '@/src/features/resume/jobReady.types';

export const resumeTemplates: DocumentTemplate[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'Resume',
    atsSafety: 'ATS Safe',
    bestFor: 'Corporate, client-facing, contemporary roles',
    description: 'Balanced whitespace, clean headings, and a polished modern hierarchy without confusing ATS parsers.'
  },
  {
    id: 'classic-canadian-professional',
    name: 'Classic Canadian Professional',
    category: 'Resume',
    atsSafety: 'ATS Safe+',
    bestFor: 'General Canadian applications, HR, admin, healthcare, coordination',
    description: 'Conservative recruiter-friendly structure with strong readability and familiar Canadian business styling.'
  },
  {
    id: 'executive-clean',
    name: 'Executive Clean',
    category: 'Resume',
    atsSafety: 'ATS Safe',
    bestFor: 'Manager, senior specialist, director, strategic roles',
    description: 'More premium top section with sharper emphasis on leadership summary, business impact, and decision-making scope.'
  },
  {
    id: 'nonprofit-academic-friendly',
    name: 'Nonprofit / Academic Friendly',
    category: 'Resume',
    atsSafety: 'ATS Safe+',
    bestFor: 'Nonprofit, education, student support, research-adjacent, mission-driven roles',
    description: 'Softer structure that gives more room to mission alignment, service delivery, grants, programs, and community impact.'
  }
];

export const coverLetterTemplates: DocumentTemplate[] = [
  {
    id: 'canadian-standard-letter',
    name: 'Standard Canadian Business Letter',
    category: 'Cover letter',
    atsSafety: 'ATS Safe+',
    bestFor: 'Most Canadian applications',
    description: 'The safest default: clean header, employer block, concise body, and direct closing.'
  },
  {
    id: 'modern-header-letter',
    name: 'Modern Header Letter',
    category: 'Cover letter',
    atsSafety: 'ATS Safe',
    bestFor: 'Modern corporate and startup roles',
    description: 'Pairs well with Modern Minimal and keeps the top section polished without becoming decorative nonsense.'
  },
  {
    id: 'executive-letter',
    name: 'Executive Letter',
    category: 'Cover letter',
    atsSafety: 'ATS Safe',
    bestFor: 'Senior roles',
    description: 'A stronger premium tone for leadership and strategic positions.'
  },
  {
    id: 'mission-letter',
    name: 'Mission-Aligned Letter',
    category: 'Cover letter',
    atsSafety: 'ATS Safe+',
    bestFor: 'Nonprofit, education, academic-friendly roles',
    description: 'Leans into service, community, and mission fit while keeping structure disciplined and ATS-friendly.'
  }
];
