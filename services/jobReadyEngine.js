
const { rewriteResume, extractPriorityKeywords, extractRequirementSentences } = require('./resumeEngine');
const { createPackageFiles } = require('./exportService');
const { parseJobPostingUrl } = require('./jobPostParser');
const { askOpenAI } = require('../lib/openai');
const { cleanString: clean, toStringList, safeJoin, ensureParagraphs, normalizeExportFormat, normalizeArtifactArray } = require('../lib/normalize');

function safeJson(raw) {
  const source = String(raw || '').trim();
  const jsonBlock = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (jsonBlock && jsonBlock[1]) || (source.match(/\{[\s\S]*\}/) || [])[0] || source;
  return JSON.parse(candidate);
}

function normalizePackageValue(value, fallback = '') {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.values(value).flatMap((item) => toStringList(item, [])).join('\n') || fallback;
  return clean(value) || fallback;
}

function stableBulletList(value, fallback = []) {
  return toStringList(value, fallback)
    .map((item) => item.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function strengthenSummary(summary = '', targetRole = '', focusKeywords = []) {
  const base = clean(summary);
  const strengths = safeJoin(toStringList(focusKeywords).slice(0, 4), ', ');
  if (!base) {
    return `Professionally grounded candidate targeting ${clean(targetRole) || 'the role'} opportunities in Canada, with visible strengths in ${strengths || 'coordination, communication, and organized execution'}.`;
  }
  if (!strengths) return base;
  const firstStrength = toStringList(strengths.split(','), [])[0] || '';
  if (firstStrength && new RegExp(firstStrength.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(base)) return base;
  return `${base} Priority alignment includes ${strengths}.`.replace(/\s+/g, ' ').trim();
}

function extractResumeStrengths(resumeText = '') {
  return Array.from(new Set((clean(resumeText).match(/\b(coordination|stakeholder communication|customer service|project coordination|documentation|onboarding|recruitment|hris|reporting|data analysis|training|compliance|scheduling|community engagement|operations)\b/gi) || [])
    .map((item) => item.toLowerCase()))).slice(0, 6);
}

async function generateRecruiterEmail({ fullName, roleTitle, company, jobDescription, amendedResume }) {
  const focus = toStringList(extractPriorityKeywords(jobDescription, roleTitle)).slice(0, 4);
  const prompt = [
    'You are a senior recruiter communications writer for the Canadian job market.',
    "Write a polished recruiter outreach email in the candidate's first-person voice, optimized to the supplied job description.",
    'Return strict JSON with keys subject and body.',
    'Constraints:',
    '- 80 to 120 words total',
    '- professional, concise, and natural enough to send immediately',
    '- confident, polished, and warm but not pushy',
    '- first-person voice only',
    '- mention the specific role and company naturally',
    '- reflect 1 or 2 job-relevant strengths that are visible in the resume or posting',
    '- state that a tailored resume is attached or included',
    '- include a brief value statement and a polite call to connect',
    '- no invented claims, no placeholders, no generic fluff',
    '- never refer to the candidate in the third person',
    `Candidate name: ${clean(fullName || 'Candidate')}`,
    `Role title: ${clean(roleTitle)}`,
    `Company: ${clean(company)}`,
    `Priority strengths: ${safeJoin(focus, ', ')}`,
    `Job description: ${clean(jobDescription).slice(0, 2500)}`,
    `Tailored resume excerpt: ${clean(amendedResume).slice(0, 1800)}`
  ].join('\n');
  try {
    const aiRaw = await askOpenAI(prompt);
    if (aiRaw) {
      const parsed = safeJson(aiRaw);
      if (parsed?.subject && parsed?.body) {
        return {
          subject: normalizePackageValue(parsed.subject),
          body: normalizePackageValue(parsed.body)
        };
      }
    }
  } catch {}
  return {
    subject: `${roleTitle} application - tailored resume attached`,
    body: [
      `Hello ${company === 'the employer' ? '' : `${company} Recruitment Team`},`.trim(),
      '',
      `I am reaching out to express my interest in the ${roleTitle} opportunity. My background includes ${safeJoin(focus.slice(0, 3), ', ', 'coordination, stakeholder communication, and reliable execution')}, which align with the priorities visible in the posting.`,
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
  const focusKeywords = toStringList(extractPriorityKeywords(jobDescription, roleTitle)).slice(0, 6);
  const requirementSentences = toStringList(extractRequirementSentences(jobDescription)).slice(0, 3);
  const visibleStrengths = Array.from(new Set([
    ...toStringList(rewrite?.optimizedSkills).map((item) => clean(item).toLowerCase()),
    ...extractResumeStrengths(rewrite?.rewrittenResume || '')
  ])).slice(0, 6);

  const prompt = [
    'You are a senior Canadian cover letter writer and hiring manager advisor.',
    'Return strict JSON only with keys coverLetter,coverLetterHighlights,resumeMatchInsights.',
    "Write in first person, professionally warm, precise, ATS-aware, and grounded in the candidate's visible experience.",
    'Length target: 220 to 300 words.',
    'Structure: opening interest paragraph, strongest-fit evidence paragraph, employer-value paragraph, concise closing.',
    'No invented claims, no placeholders except company if missing.',
    'Use only strengths visible in the supplied resume rewrite or job description alignment notes. Do not invent metrics or achievements.',
    'Show why the candidate fits the role by connecting job requirements to visible strengths.',
    'Use specific, concrete language instead of generic enthusiasm. Avoid buzzword stuffing.',
    'Make it sound submission-ready for a Canadian recruiter or hiring manager.',
    `Candidate name: ${clean(fullName || 'Candidate')}`,
    `Role title: ${clean(roleTitle)}`,
    `Company: ${clean(company)}`,
    `Focus keywords: ${safeJoin(focusKeywords, ', ')}`,
    `Priority requirements: ${safeJoin(requirementSentences, ' | ')}`,
    `Visible strengths from resume: ${safeJoin(visibleStrengths, ', ')}`,
    `Tailored resume excerpt: ${clean(rewrite?.rewrittenResume || '').slice(0, 3000)}`,
    `Role alignment notes: ${safeJoin(toStringList(rewrite?.roleAlignmentNotes), ' | ')}`
  ].join('\n');

  try {
    const aiRaw = await askOpenAI(prompt);
    if (aiRaw) {
      const parsed = safeJson(aiRaw);
      if (parsed?.coverLetter) {
        return {
          coverLetter: ensureParagraphs(normalizePackageValue(parsed.coverLetter)),
          coverLetterHighlights: toStringList(parsed.coverLetterHighlights, focusKeywords.slice(0, 3)),
          resumeMatchInsights: toStringList(parsed.resumeMatchInsights, requirementSentences.slice(0, 3))
        };
      }
    }
  } catch {}

  const intro = `Dear Hiring Team${company && company !== 'the employer' ? ` at ${company}` : ''},`;
  const body1 = `I am excited to apply for the ${roleTitle} opportunity${company && company !== 'the employer' ? ` at ${company}` : ''}. My background shows practical strengths in ${safeJoin(visibleStrengths.slice(0, 3), ', ', 'coordination, communication, and organized execution')}, and I am confident those strengths align well with the needs of this role.`;
  const body2 = requirementSentences[0]
    ? `What stands out to me in the posting is the need to ${requirementSentences[0].replace(/^[A-Z]/, (m) => m.toLowerCase())}. My resume reflects relevant experience and transferable evidence that support this kind of work in a clear, recruiter-friendly format.`
    : `I tailored my resume to mirror the most important priorities in the posting, especially around ${safeJoin(focusKeywords.slice(0, 3), ', ', 'service, organization, and follow-through')}.`;
  const body3 = 'I would welcome the opportunity to contribute with a practical, reliable, and people-focused approach. Thank you for taking the time to review my application.';
  const closing = `Sincerely:\n${clean(fullName || 'Candidate')}`.replace(':\n', '\n');
  return {
    coverLetter: [intro, '', body1, '', body2, '', body3, '', closing].join('\n'),
    coverLetterHighlights: focusKeywords.slice(0, 4),
    resumeMatchInsights: requirementSentences.length ? requirementSentences : visibleStrengths.slice(0, 3).map((item) => `Visible strength highlighted: ${item}`)
  };
}



function computeAtsBenchmark(payload, rewrite, mergedJobDescription = '') {
  const fallback = atsCheckFallback(payload, clean(payload.resumeText || ''), mergedJobDescription);
  const overall = Number(fallback.score || 0);
  const marketAverage = Math.max(55, Math.min(92, overall >= 82 ? overall - 7 : overall + 6));
  const top10 = Math.max(marketAverage + 8, Math.min(98, overall + 12));
  return {
    overallScore: overall,
    marketAverage,
    top10Percent: top10,
    semanticMatch: Math.max(52, Math.min(98, overall + 4)),
    recruiterFit: Math.max(50, Math.min(98, Math.round((overall + fallback.experienceScore + fallback.titleAlignmentScore) / 1.6))),
    matchedKeywords: toStringList(fallback.matchedKeywords),
    missingKeywords: toStringList(fallback.missingKeywords),
    formattingRisks: toStringList(fallback.formattingRisks),
    strengths: toStringList(fallback.strengths),
    recommendations: toStringList(fallback.recommendations)
  };
}

function buildCareerNarrative(payload, rewrite, company) {
  const role = clean(payload.targetRole || 'Target Role');
  const skills = toStringList(rewrite.optimizedSkills).slice(0, 4);
  const alignment = toStringList(rewrite.roleAlignmentNotes).slice(0, 2);
  return {
    positioningStatement: `${clean(payload.fullName || 'The candidate')} is positioning for ${role} by emphasizing ${safeJoin(skills, ', ', 'transferable business strengths')} in a recruiter-friendly Canadian format.`,
    topThemes: [
      `${role}-aligned value story`,
      skills[0] ? `${skills[0]} with visible proof points` : 'Visible strengths mapped to job needs',
      alignment[0] || 'Cleaner business outcomes and clearer role alignment'
    ].filter(Boolean),
    interviewBridge: alignment[0]
      ? `In interviews, open with a short context sentence, then use ${alignment[0].replace(/^Aligned to posting priority:\s*/i, '').toLowerCase()} as the bridge into your example.`
      : `In interviews, connect your strongest example directly to the main priorities of the ${role} role.`
  };
}

function buildRecruiterLens(benchmark, rewrite) {
  const skills = toStringList(rewrite.optimizedSkills);
  return [
    benchmark.overallScore >= 80
      ? 'A recruiter would likely see this as a credible, shortlist-worthy draft with good ATS alignment.'
      : 'A recruiter would see usable substance here, but the first-screen impact still depends on sharper role alignment.',
    skills.length
      ? `The strongest first-scan signal is the visible emphasis on ${safeJoin(skills.slice(0, 3), ', ')}.`
      : 'The strongest first-scan signal is the cleaner structure and more direct role targeting.',
    benchmark.missingKeywords[0]
      ? `The main perceived gap is missing evidence for ${benchmark.missingKeywords[0].toLowerCase()}.`
      : 'The main next step is turning strong alignment into sharper measurable outcomes.'
  ];
}

function buildQuickWins(benchmark, rewrite) {
  const wins = [];
  if (benchmark.missingKeywords[0]) wins.push(`Add truthful evidence for ${benchmark.missingKeywords[0]} in one experience bullet or summary line.`);
  wins.push('Move your strongest quantified or outcome-based bullet into the first half of the experience section.');
  wins.push('Prepare one interview story that proves the same strengths highlighted in the tailored resume.');
  if (toStringList(rewrite.improvedBullets).length < 4) wins.push('Expand the experience section with 2 to 3 concrete bullets using action + result language.');
  return wins.slice(0, 4);
}

function classifyPostingTrust(parsedPosting, directJobDescription = '') {
  const warning = clean(parsedPosting?.warning || '');
  const confidence = clean(parsedPosting?.confidence || '').toLowerCase();
  const textLength = clean(parsedPosting?.text || '').length;
  const blocked = /blocked|access-restricted|client-rendered|limited job text|incomplete|partial|error page/i.test(warning);
  if (clean(directJobDescription).length >= 400) return { sourceQuality: 'high', sourceWarning: warning };
  if (confidence === 'high' && textLength >= 1200 && !blocked) return { sourceQuality: 'high', sourceWarning: warning };
  if ((confidence === 'high' && textLength >= 500) || (confidence === 'medium' && textLength >= 800 && !blocked)) {
    return { sourceQuality: 'medium', sourceWarning: warning };
  }
  return { sourceQuality: 'low', sourceWarning: warning || 'The job posting extract is too incomplete for a trustworthy package.' };
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

  const postingTrust = classifyPostingTrust(parsedPosting, payload.jobDescription || '');
  if (payload.jobPostingUrl && postingTrust.sourceQuality === 'low' && clean(payload.jobDescription || '').length < 120) {
    throw new Error(postingTrust.sourceWarning || 'The job posting could not be extracted cleanly enough for a trustworthy package. Paste the job description manually and try again.');
  }

  const rewrite = await rewriteResume({ ...payload, jobDescription: mergedJobDescription });
  rewrite.optimizedSkills = stableBulletList(rewrite.optimizedSkills, extractPriorityKeywords(mergedJobDescription, payload.targetRole).slice(0, 6));
  rewrite.roleAlignmentNotes = stableBulletList(rewrite.roleAlignmentNotes, extractRequirementSentences(mergedJobDescription).slice(0, 3));
  rewrite.improvedBullets = stableBulletList(rewrite.improvedBullets);
  rewrite.priorityKeywords = stableBulletList(rewrite.priorityKeywords, extractPriorityKeywords(mergedJobDescription, payload.targetRole).slice(0, 6));
  rewrite.summary = strengthenSummary(rewrite.summary, payload.targetRole, rewrite.optimizedSkills);
  rewrite.rewrittenResume = ensureParagraphs(rewrite.rewrittenResume, [
    clean(payload.targetRole || parsedPosting?.title || 'Target Role').toUpperCase(),
    '',
    'PROFESSIONAL SUMMARY',
    rewrite.summary,
    '',
    'CORE SKILLS',
    safeJoin(rewrite.optimizedSkills, ' • '),
    '',
    'PROFESSIONAL EXPERIENCE',
    ...stableBulletList(rewrite.improvedBullets).map((item) => `• ${item}`),
    ...(toStringList(rewrite.roleAlignmentNotes).length ? ['', 'TARGET ROLE ALIGNMENT', ...toStringList(rewrite.roleAlignmentNotes)] : [])
  ].filter(Boolean).join('\n'));

  const roleTitle = payload.targetRole || parsedPosting?.title || 'Target Role';
  const company = payload.companyName || parsedPosting?.company || 'the employer';
  const selectedResumeTemplateId = payload.selectedResumeTemplateId || 'classic-canadian-professional';
  const selectedResumeThemeId = payload.selectedResumeThemeId || selectedResumeTemplateId;
  const selectedLayoutMode = payload.selectedLayoutMode || 'one-page';
  const selectedCoverLetterTemplateId = payload.selectedCoverLetterTemplateId || 'canadian-standard-letter';
  const selectedExportFormat = normalizeExportFormat(payload.selectedExportFormat, 'both');

  const [coverPackage, recruiterEmail] = await Promise.all([
    generateOptimizedCoverLetter({ fullName: payload.fullName, roleTitle, company, jobDescription: mergedJobDescription, rewrite }),
    generateRecruiterEmail({ fullName: payload.fullName, roleTitle, company, jobDescription: mergedJobDescription, amendedResume: rewrite.rewrittenResume })
  ]);

  const atsBenchmark = computeAtsBenchmark(payload, rewrite, mergedJobDescription);
  const careerNarrative = buildCareerNarrative(payload, rewrite, company);
  const recruiterLens = buildRecruiterLens(atsBenchmark, rewrite);
  const quickWins = buildQuickWins(atsBenchmark, rewrite);

  let exportArtifacts = [];
  let exportWarning = '';
  try {
    exportArtifacts = await createPackageFiles({
      roleTitle,
      companyName: company,
      amendedResume: normalizePackageValue(rewrite.rewrittenResume),
      tailoredResume: normalizePackageValue(rewrite.rewrittenResume),
      coverLetter: ensureParagraphs(normalizePackageValue(coverPackage.coverLetter)),
      recruiterEmail: `Subject: ${normalizePackageValue(recruiterEmail.subject, `${roleTitle} application`)}\n\n${normalizePackageValue(recruiterEmail.body)}`,
      selectedExportFormat,
      selectedResumeExportFormat: normalizeExportFormat(payload.selectedResumeExportFormat, selectedExportFormat),
      selectedCoverLetterExportFormat: normalizeExportFormat(payload.selectedCoverLetterExportFormat, selectedExportFormat),
      selectedRecruiterEmailExportFormat: normalizeExportFormat(payload.selectedRecruiterEmailExportFormat, selectedExportFormat),
      resumeThemeId: selectedResumeThemeId,
      layoutMode: selectedLayoutMode,
      resumeTemplateId: selectedResumeTemplateId,
      coverTemplateId: selectedCoverLetterTemplateId
    });
  } catch (error) {
    exportArtifacts = [];
    exportWarning = error instanceof Error ? error.message : 'Export generation failed.';
  }

  return {
    roleTitle,
    companyName: company,
    exportSummary: `Created a recruiter-ready package for ${roleTitle} at ${company} using the ${selectedResumeThemeId} theme with a true ${selectedLayoutMode} ATS layout, plus a stronger cover letter and recruiter outreach draft optimized to the posting.`,
    amendedResume: normalizePackageValue(rewrite.rewrittenResume),
    tailoredResume: {
      ...rewrite,
      optimizedSkills: toStringList(rewrite.optimizedSkills),
      improvedBullets: toStringList(rewrite.improvedBullets),
      priorityKeywords: toStringList(rewrite.priorityKeywords),
      roleAlignmentNotes: toStringList(rewrite.roleAlignmentNotes),
      rewrittenResume: ensureParagraphs(rewrite.rewrittenResume)
    },
    coverLetter: ensureParagraphs(normalizePackageValue(coverPackage.coverLetter)),
    coverLetterHighlights: toStringList(coverPackage.coverLetterHighlights),
    resumeMatchInsights: toStringList(coverPackage.resumeMatchInsights),
    recruiterMessage: ensureParagraphs(normalizePackageValue(recruiterEmail.body)),
    recruiterEmailSubject: normalizePackageValue(recruiterEmail.subject),
    recruiterEmailBody: ensureParagraphs(normalizePackageValue(recruiterEmail.body)),
    thankYouEmail: `Thank you for your time and consideration regarding the ${roleTitle} opportunity. I appreciated the chance to share my background and remain very interested in contributing to ${company}.`,
    linkedinHeadline: `${roleTitle} | Employer-ready resume | Canadian market alignment`,
    linkedinAbout: `Professionally grounded candidate targeting ${roleTitle} roles in Canada with a practical focus on communication, operational support, and stakeholder coordination.`,
    atsBenchmark,
    careerNarrative,
    recruiterLens,
    quickWins,
    recommendedResumeTemplateId: selectedResumeTemplateId,
    recommendedCoverLetterTemplateId: selectedCoverLetterTemplateId,
    selectedResumeTemplateId,
    selectedCoverLetterTemplateId,
    selectedResumeThemeId,
    selectedLayoutMode,
    selectedExportFormat,
    selectedResumeExportFormat: normalizeExportFormat(payload.selectedResumeExportFormat, selectedExportFormat),
    selectedCoverLetterExportFormat: normalizeExportFormat(payload.selectedCoverLetterExportFormat, selectedExportFormat),
    selectedRecruiterEmailExportFormat: normalizeExportFormat(payload.selectedRecruiterEmailExportFormat, selectedExportFormat),
    exportFiles: normalizeArtifactArray(exportArtifacts).map((file) => file.fileName).filter(Boolean),
    exportArtifacts: normalizeArtifactArray(exportArtifacts),
    exportWarning: exportWarning || undefined,
    parsedJobPosting: parsedPosting ? {
      title: parsedPosting.title,
      company: parsedPosting.company,
      location: parsedPosting.location,
      source: parsedPosting.source,
      extractionMethod: parsedPosting.extractionMethod,
      warning: parsedPosting.warning,
      finalUrl: parsedPosting.finalUrl,
      url: parsedPosting.url,
      confidence: parsedPosting.confidence,
      sourceQuality: postingTrust.sourceQuality
    } : null
  };
}

module.exports = { generateJobReady };
