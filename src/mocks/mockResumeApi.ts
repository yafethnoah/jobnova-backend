import { mockDelay } from '@/src/lib/mockDelay';
import type {
  AtsCheckPayload,
  AtsCheckResponse,
  ResumeRewritePayload,
  ResumeRewriteResponse
} from '@/src/features/resume/resume.types';

const SKILL_LIBRARY = [
  'hris', 'workday', 'payroll', 'onboarding', 'recruitment', 'employee relations', 'benefits',
  'compliance', 'scheduling', 'customer service', 'project coordination', 'excel', 'reporting',
  'stakeholder management', 'data entry', 'training', 'policy', 'interviewing', 'calendar management',
  'communication', 'leadership', 'coordination', 'analysis', 'service delivery', 'documentation',
  'budgeting', 'case management', 'client service', 'microsoft office', 'administration', 'supervision',
  'team leadership', 'process improvement', 'vendor management', 'customer support', 'data analysis',
  'quality assurance', 'safety', 'operations', 'supply chain', 'research', 'community outreach'
];

const WEAK_PHRASES = [
  'responsible for',
  'helped with',
  'worked on',
  'tasked with',
  'assisted with'
];

const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'that', 'from', 'this', 'have', 'will', 'your', 'you', 'our', 'their', 'they', 'them',
  'into', 'while', 'where', 'when', 'were', 'was', 'are', 'role', 'position', 'candidate', 'ability', 'skills', 'skill',
  'using', 'used', 'years', 'year', 'plus', 'must', 'preferred', 'required', 'requirement', 'requirements', 'including',
  'include', 'across', 'through', 'within', 'ensure', 'ensuring', 'support', 'supported', 'experience', 'professional',
  'work', 'working', 'strong', 'excellent', 'good', 'knowledge', 'understanding', 'develop', 'developed', 'maintain',
  'maintained', 'provide', 'provided', 'manage', 'managed', 'team', 'teams', 'company', 'organization', 'job', 'resume',
  'summary', 'profile', 'education', 'certifications', 'languages', 'projects', 'volunteer'
]);

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s+-]/g, ' ');
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tokenize(text: string) {
  return normalize(text)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !STOPWORDS.has(item));
}

function extractDynamicKeywords(text: string) {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);

  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (!STOPWORDS.has(tokens[i]) && !STOPWORDS.has(tokens[i + 1])) bigrams.push(phrase);
  }
  for (const item of bigrams) counts.set(item, (counts.get(item) || 0) + 1);

  return Array.from(counts.entries())
    .filter(([term, count]) => count > 1 || term.includes(' ') || SKILL_LIBRARY.includes(term))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([term]) => term)
    .slice(0, 24);
}

function extractKeywords(text: string) {
  const normalized = normalize(text);
  return uniq([
    ...SKILL_LIBRARY.filter((skill) => normalized.includes(skill)),
    ...extractDynamicKeywords(text)
  ]);
}

function hasFormattingRisks(text: string, fileName?: string) {
  const risks: string[] = [];
  if (/\|/.test(text) || /table/i.test(text)) risks.push('Possible table-style formatting detected');
  if (/header|footer/i.test(text)) risks.push('Header or footer text may confuse ATS parsing');
  if (/•|●|▪/.test(text) && text.split('\n').length < 5) risks.push('Dense symbol-heavy formatting may parse poorly');
  if (fileName?.toLowerCase().endsWith('.pdf')) risks.push('PDF resumes can parse less reliably than DOCX in some ATS tools');
  if (!/experience|education|skills|summary|profile/i.test(text)) risks.push('Standard section headings are weak or missing');
  return risks;
}

function roleKeywords(targetRole?: string, jobDescription?: string) {
  return uniq([
    ...extractKeywords(targetRole ?? ''),
    ...extractKeywords(jobDescription ?? '')
  ]).slice(0, 14);
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function tokenizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•▪●\s]+/, '').trim())
    .filter(Boolean);
}

function extractSection(lines: string[], heading: RegExp, stopHeadings: RegExp): string[] {
  const start = lines.findIndex((line) => heading.test(line.toLowerCase()));
  if (start === -1) return [];
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (stopHeadings.test(line.toLowerCase()) && collected.length) break;
    collected.push(line);
  }
  return collected;
}

function inferTopLines(lines: string[], limit = 8) {
  return lines.filter((line) => /[a-z]/i.test(line) && line.length > 20).slice(0, limit);
}

function rewriteBullet(line: string, jobTerms: string[], roleLabel: string): string {
  const clean = line.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  let rewritten = clean;

  if (WEAK_PHRASES.some((phrase) => lower.startsWith(phrase))) {
    rewritten = clean
      .replace(/^responsible for\s+/i, 'Managed ')
      .replace(/^helped with\s+/i, 'Supported ')
      .replace(/^worked on\s+/i, 'Delivered ')
      .replace(/^tasked with\s+/i, 'Executed ')
      .replace(/^assisted with\s+/i, 'Coordinated ');
  }

  if (!/^(led|managed|coordinated|delivered|improved|implemented|supported|executed|oversaw|developed|organized)/i.test(rewritten)) {
    rewritten = `Delivered ${rewritten.charAt(0).toLowerCase()}${rewritten.slice(1)}`;
  }

  const firstMissing = jobTerms.find((term) => !lower.includes(term));
  if (firstMissing && rewritten.length < 200) {
    rewritten = `${rewritten.replace(/[.;]$/, '')}, strengthening alignment with ${firstMissing} expectations for ${roleLabel}.`;
  }

  if (!/[.!?]$/.test(rewritten)) rewritten += '.';
  return rewritten;
}

function buildFullResumeRewrite(baseText: string, targetRole: string, jobTerms: string[]) {
  const lines = tokenizeLines(baseText);
  const stop = /^(experience|education|skills|summary|profile|certifications|languages|projects|volunteer|awards)$/i;
  const summarySection = extractSection(lines, /^(summary|profile)$/i, stop);
  const skillsSection = extractSection(lines, /^skills$/i, stop);
  const experienceSection = extractSection(lines, /^experience$/i, stop);
  const educationSection = extractSection(lines, /^education$/i, stop);
  const certificationsSection = extractSection(lines, /^certifications?$/i, stop);
  const languageSection = extractSection(lines, /^languages?$/i, stop);

  const sourceExperience = experienceSection.length ? experienceSection : inferTopLines(lines, 10);
  const improvedBullets = sourceExperience.slice(0, 8).map((line) => rewriteBullet(line, jobTerms, targetRole));

  const optimizedSkills = uniq([
    ...jobTerms,
    ...extractKeywords(baseText),
    ...skillsSection.flatMap((line) => extractKeywords(line))
  ]).slice(0, 12).map(sentenceCase);

  const summary = summarySection.length
    ? rewriteBullet(summarySection.join(' '), jobTerms, targetRole)
    : `Targeting ${targetRole} opportunities with a Canadian-ready resume that highlights transferable results, stronger action verbs, and employer language drawn from the role requirements.`;

  const rendered = [
    `${targetRole.toUpperCase()} TARGET RESUME`,
    '',
    'PROFESSIONAL SUMMARY',
    summary,
    '',
    'CORE SKILLS',
    ...(optimizedSkills.length ? optimizedSkills.map((item) => `• ${item}`) : ['• Communication', '• Coordination', '• Problem solving']),
    '',
    'PROFESSIONAL EXPERIENCE',
    ...improvedBullets.map((item) => `• ${item}`),
    ...(educationSection.length ? ['', 'EDUCATION', ...educationSection.map((item) => `• ${item}`)] : []),
    ...(certificationsSection.length ? ['', 'CERTIFICATIONS', ...certificationsSection.map((item) => `• ${item}`)] : []),
    ...(languageSection.length ? ['', 'LANGUAGES', ...languageSection.map((item) => `• ${item}`)] : []),
    '',
    'SOURCE NOTE',
    'This resume was rewritten from the source text without inventing titles, dates, metrics, or credentials.'
  ].join('\n');

  return { summary, improvedBullets, optimizedSkills, rendered };
}

export const mockResumeApi = {
  async rewrite(payload: ResumeRewritePayload): Promise<ResumeRewriteResponse> {
    await mockDelay(700);
    const baseText = payload.resumeText.trim();
    const targetRole = payload.targetRole?.trim() || 'target role';
    const jobTerms = roleKeywords(payload.targetRole, payload.jobDescription);
    const rewritten = buildFullResumeRewrite(baseText, targetRole, jobTerms);

    return {
      summary: `Full resume rewrite completed for ${targetRole}. The summary, skills, and experience sections were reworked together so the full resume aligns more directly with the job language instead of only tweaking a few bullets.`,
      improvedBullets: rewritten.improvedBullets,
      optimizedSkills: rewritten.optimizedSkills,
      priorityKeywords: jobTerms,
      roleAlignmentNotes: [
        'The professional summary was tightened around the target role and Canadian employer language.',
        'Experience bullets were rewritten with clearer action verbs and stronger evidence wording.',
        'Priority keywords from the job description were blended into truthful phrasing across the full resume.'
      ],
      rewrittenResume: rewritten.rendered,
      truthGuardNote: 'Truth Guard: metrics, titles, dates, and credentials were not invented. Review every line and keep only facts you can defend in an interview.'
    };
  },

  async atsCheck(payload: AtsCheckPayload): Promise<AtsCheckResponse> {
    await mockDelay(650);
    const resumeText = payload.resumeText.trim();
    const jobTerms = roleKeywords(payload.targetRole, payload.jobDescription);
    const normalizedResume = normalize(resumeText);
    const resumeTerms = extractKeywords(resumeText);
    const matchedKeywords = jobTerms.filter((term) => normalizedResume.includes(term));
    const missingKeywords = jobTerms.filter((term) => !normalizedResume.includes(term));
    const weakPhrases = WEAK_PHRASES.filter((phrase) => normalizedResume.includes(phrase));
    const formattingRisks = hasFormattingRisks(resumeText, payload.uploadedFileName);

    const keywordCoverage = jobTerms.length ? matchedKeywords.length / jobTerms.length : 0.45;
    const keywordScore = Math.max(6, Math.min(40, Math.round(keywordCoverage * 40)));
    const skillScore = Math.max(5, Math.min(20, Math.round(uniq(resumeTerms).length * 1.25)));
    const titleAlignmentScore = payload.targetRole
      ? (normalizedResume.includes(normalize(payload.targetRole))
        ? 10
        : Math.min(8, Math.max(3, Math.round(tokenize(payload.targetRole).filter((term) => normalizedResume.includes(term)).length * 3))))
      : 5;
    const evidenceSignals = /improved|increased|reduced|managed|led|coordinated|delivered|implemented|supported/i.test(resumeText) ? 1 : 0;
    const experienceScore = Math.max(4, Math.min(15, 7 + evidenceSignals * 3 + Math.min(4, Math.floor(resumeText.length / 550)) - weakPhrases.length * 2));
    const formattingScore = Math.max(3, 15 - formattingRisks.length * 3);
    const score = Math.max(25, Math.min(98, keywordScore + skillScore + titleAlignmentScore + experienceScore + formattingScore));

    const strengths = [
      matchedKeywords.length ? `Matched ${matchedKeywords.length} role-specific keyword${matchedKeywords.length === 1 ? '' : 's'}.` : 'Resume shows transferable value but weak direct keyword overlap.',
      titleAlignmentScore >= 8 ? 'Target role language is clearly visible in the resume.' : 'Target role wording can be stronger in the summary and skills section.',
      formattingRisks.length === 0 ? 'Layout appears relatively ATS-safe.' : 'The resume is readable, but formatting cleanup would improve parse reliability.'
    ];

    const gaps = [
      ...missingKeywords.slice(0, 5).map((item) => `Missing or weak keyword: ${sentenceCase(item)}`),
      ...weakPhrases.slice(0, 2).map((item) => `Weak phrasing detected: “${item}”`),
      ...(formattingRisks[0] ? [formattingRisks[0]] : [])
    ];

    const recommendations = [
      missingKeywords[0] ? `Mirror the posting language more directly, starting with ${sentenceCase(missingKeywords[0])}.` : 'Keep the strongest job-description keywords in the summary, skills, and most relevant bullets.',
      weakPhrases.length ? 'Replace vague phrases like “responsible for” with action verbs plus outcomes.' : 'Add one or two measurable business outcomes to strengthen evidence.',
      formattingRisks.length ? 'Flatten tables, headers, icons, and decorative sections into a standard ATS-friendly layout.' : 'Export a clean Word version for maximum ATS compatibility.'
    ];

    return {
      score,
      keywordScore,
      skillScore,
      titleAlignmentScore,
      experienceScore,
      formattingScore,
      matchedKeywords,
      missingKeywords,
      formattingRisks,
      weakPhrases,
      recommendations,
      strengths,
      gaps,
      analyzedJobDescription: payload.jobDescription?.trim() || undefined,
      analyzedFromUrl: Boolean(payload.jobPostingUrl?.trim())
    };
  }
};
