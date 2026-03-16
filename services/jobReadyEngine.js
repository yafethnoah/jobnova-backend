const { rewriteResume, extractPriorityKeywords, extractRequirementSentences } = require('./resumeEngine');
const { createPackageFiles } = require('./exportService');
const { parseJobPostingUrl } = require('./jobPostParser');
const { askOpenAI } = require('../lib/openai');

function clean(value = '') {
  return String(value || '').trim();
}

function safeJson(raw) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}

function extractResumeStrengths(resumeText = '') {
  return Array.from(new Set((clean(resumeText).match(/\b(coordination|stakeholder communication|customer service|project coordination|documentation|onboarding|recruitment|hris|reporting|data analysis|training|compliance|scheduling|community engagement|operations)\b/gi) || [])
    .map((item) => item.toLowerCase()))).slice(0, 6);
}

async function generateRecruiterEmail({ fullName, roleTitle, company, jobDescription, amendedResume }) {
  const focus = extractPriorityKeywords(jobDescription, roleTitle).slice(0, 4);
  const prompt = [
    'You are a senior recruiter communications writer.',
    "Write a polished recruiter outreach email in the candidate's first-person voice, optimized to the supplied job description.",
    'Return strict JSON with keys subject and body.',
    'Constraints:',
    '- professional and concise',
    '- warm but not pushy',
    '- first-person voice only',
    '- mention the specific role',
    '- reflect 2 or 3 job-relevant strengths from the job description',
    '- state that a tailored resume is attached',
    '- no invented claims',
    '- never refer to the candidate in the third person',
    `Candidate name: ${clean(fullName || 'Candidate')}`,
    `Role title: ${clean(roleTitle)}`,
    `Company: ${clean(company)}`,
    `Priority strengths: ${focus.join(', ')}`,
    `Job description: ${clean(jobDescription).slice(0, 2500)}`,
    `Tailored resume excerpt: ${clean(amendedResume).slice(0, 1800)}`
  ].join('\n');
  try {
    const parsed = safeJson(await askOpenAI(prompt));
    if (parsed?.subject && parsed?.body) return parsed;
  } catch {}
  return {
    subject: `${roleTitle} application - tailored resume attached`,
    body: [
      `Hello ${company === 'the employer' ? '' : `${company} Recruitment Team`},`.trim(),
      '',
      `I am reaching out to express my interest in the ${roleTitle} opportunity. My background includes ${focus.slice(0, 3).join(', ') || 'coordination, stakeholder communication, and reliable execution'}, which align with the priorities visible in the posting.`,
      '',
      'I attached a tailored resume for easy review, and I would value the opportunity to discuss how I can support your team.',
      '',
      'Thank you for your time and consideration.',
      '',
      clean(fullName || 'Candidate')
    ].join('\n')
  };
}

async function generateOptimizedCoverLetter({ fullName, roleTitle, company, jobDescription, rewrite }) {
  const focusKeywords = extractPriorityKeywords(jobDescription, roleTitle).slice(0, 6);
  const requirementSentences = extractRequirementSentences(jobDescription).slice(0, 3);
  const visibleStrengths = Array.from(new Set([
    ...(rewrite?.optimizedSkills || []).map((item) => clean(item).toLowerCase()),
    ...extractResumeStrengths(rewrite?.rewrittenResume || '')
  ])).slice(0, 6);

  const prompt = [
    'You are a senior Canadian cover letter writer.',
    'Return strict JSON only with keys coverLetter,coverLetterHighlights,resumeMatchInsights.',
    'Write in first person, professionally warm, precise, and ATS-aware.',
    'Structure: 3 to 4 short paragraphs, no invented claims, no placeholders except company if missing.',
    'Use only strengths visible in the supplied resume rewrite or job description alignment notes.',
    'Show why the candidate fits the role by connecting job requirements to visible strengths.',
    `Candidate name: ${clean(fullName || 'Candidate')}`,
    `Role title: ${clean(roleTitle)}`,
    `Company: ${clean(company)}`,
    `Focus keywords: ${focusKeywords.join(', ')}`,
    `Priority requirements: ${requirementSentences.join(' | ')}`,
    `Visible strengths from resume: ${visibleStrengths.join(', ')}`,
    `Tailored resume excerpt: ${clean(rewrite?.rewrittenResume || '').slice(0, 3000)}`,
    `Role alignment notes: ${(rewrite?.roleAlignmentNotes || []).join(' | ')}`
  ].join('\n');

  try {
    const parsed = safeJson(await askOpenAI(prompt));
    if (parsed?.coverLetter) {
      return {
        coverLetter: parsed.coverLetter,
        coverLetterHighlights: Array.isArray(parsed.coverLetterHighlights) ? parsed.coverLetterHighlights : focusKeywords.slice(0, 3),
        resumeMatchInsights: Array.isArray(parsed.resumeMatchInsights) ? parsed.resumeMatchInsights : requirementSentences.slice(0, 3)
      };
    }
  } catch {}

  const intro = `Dear Hiring Team${company && company !== 'the employer' ? ` at ${company}` : ''},`;
  const body1 = `I am excited to apply for the ${roleTitle} opportunity${company && company !== 'the employer' ? ` at ${company}` : ''}. My background shows practical strengths in ${visibleStrengths.slice(0, 3).join(', ') || 'coordination, communication, and organized execution'}, and I am confident those strengths align well with the needs of this role.`;
  const body2 = requirementSentences[0]
    ? `What stands out to me in the posting is the need to ${requirementSentences[0].replace(/^[A-Z]/, (m) => m.toLowerCase())}. My resume reflects relevant experience and transferable evidence that support this kind of work in a clear, recruiter-friendly format.`
    : `I tailored my resume to mirror the most important priorities in the posting, especially around ${focusKeywords.slice(0, 3).join(', ') || 'service, organization, and follow-through'}.`;
  const body3 = `I would welcome the opportunity to contribute with a practical, reliable, and people-focused approach. Thank you for taking the time to review my application.`;
  const closing = `Sincerely,\n${clean(fullName || 'Candidate')}`;
  return {
    coverLetter: [intro, '', body1, '', body2, '', body3, '', closing].join('\n'),
    coverLetterHighlights: focusKeywords.slice(0, 4),
    resumeMatchInsights: requirementSentences.length ? requirementSentences : visibleStrengths.slice(0, 3).map((item) => `Visible strength highlighted: ${item}`)
  };
}

async function generateJobReady(payload) {
  let mergedJobDescription = payload.jobDescription || '';
  let parsedPosting = null;
  if (payload.jobPostingUrl) {
    try {
      parsedPosting = await parseJobPostingUrl(payload.jobPostingUrl);
      mergedJobDescription = [parsedPosting.text, mergedJobDescription].filter(Boolean).join('\n\n');
    } catch {
      parsedPosting = null;
    }
  }

  const rewrite = await rewriteResume({ ...payload, jobDescription: mergedJobDescription });
  const roleTitle = payload.targetRole || parsedPosting?.title || 'Target Role';
  const company = payload.companyName || parsedPosting?.company || 'the employer';
  const selectedResumeTemplateId = payload.selectedResumeTemplateId || 'classic-canadian-professional';
  const selectedResumeThemeId = payload.selectedResumeThemeId || selectedResumeTemplateId;
  const selectedLayoutMode = payload.selectedLayoutMode || 'one-page';
  const selectedCoverLetterTemplateId = payload.selectedCoverLetterTemplateId || 'canadian-standard-letter';
  const selectedExportFormat = payload.selectedExportFormat || 'both';

  const coverPackage = await generateOptimizedCoverLetter({
    fullName: payload.fullName,
    roleTitle,
    company,
    jobDescription: mergedJobDescription,
    rewrite
  });

  const recruiterEmail = await generateRecruiterEmail({
    fullName: payload.fullName,
    roleTitle,
    company,
    jobDescription: mergedJobDescription,
    amendedResume: rewrite.rewrittenResume
  });

  const exportArtifacts = await createPackageFiles({
    roleTitle,
    companyName: company,
    amendedResume: rewrite.rewrittenResume,
    tailoredResume: rewrite.rewrittenResume,
    coverLetter: coverPackage.coverLetter,
    recruiterEmail: `Subject: ${recruiterEmail.subject}\n\n${recruiterEmail.body}`,
    selectedExportFormat,
    resumeThemeId: selectedResumeThemeId,
    layoutMode: selectedLayoutMode,
    resumeTemplateId: selectedResumeTemplateId,
    coverTemplateId: selectedCoverLetterTemplateId
  });

  return {
    roleTitle,
    companyName: company,
    exportSummary: `Created a recruiter-ready package for ${roleTitle} at ${company} using the ${selectedResumeThemeId} theme with a true ${selectedLayoutMode} ATS layout, plus a stronger cover letter and recruiter outreach draft optimized to the posting.`,
    amendedResume: rewrite.rewrittenResume,
    tailoredResume: rewrite,
    coverLetter: coverPackage.coverLetter,
    coverLetterHighlights: coverPackage.coverLetterHighlights,
    resumeMatchInsights: coverPackage.resumeMatchInsights,
    recruiterMessage: recruiterEmail.body,
    recruiterEmailSubject: recruiterEmail.subject,
    recruiterEmailBody: recruiterEmail.body,
    thankYouEmail: `Thank you for your time and consideration regarding the ${roleTitle} opportunity. I appreciated the chance to share my background and remain very interested in contributing to ${company}.`,
    linkedinHeadline: `${roleTitle} | Employer-ready resume | Canadian market alignment`,
    linkedinAbout: `Professionally grounded candidate targeting ${roleTitle} roles in Canada with a practical focus on communication, operational support, and stakeholder coordination.`,
    recommendedResumeTemplateId: selectedResumeTemplateId,
    recommendedCoverLetterTemplateId: selectedCoverLetterTemplateId,
    selectedResumeTemplateId,
    selectedCoverLetterTemplateId,
    selectedResumeThemeId,
    selectedLayoutMode,
    selectedExportFormat,
    exportFiles: exportArtifacts.map((file) => file.fileName),
    exportArtifacts,
    parsedJobPosting: parsedPosting ? {
      title: parsedPosting.title,
      company: parsedPosting.company,
      location: parsedPosting.location,
      source: parsedPosting.source,
      url: parsedPosting.url
    } : null
  };
}

module.exports = { generateJobReady };
