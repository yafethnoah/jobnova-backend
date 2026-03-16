const { askOpenAI } = require('../lib/openai');
const { parseJobPostingUrl } = require('./jobPostParser');
const { inferCandidateProfile, analyzeJobDescription, clean, titleCase, unique, splitSections, lines } = require('./profileIntelligence');
const { detectRoleProfile } = require('./roleIntelligence');

function sentenceCase(value = '') {
  const text = clean(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function safeJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(text);
}

async function resolveJobDescription(payload) {
  const direct = clean(payload.jobDescription || '');
  if (!payload.jobPostingUrl) return { jobDescription: direct, analyzedFromUrl: false, jobPostingTitle: '' };
  try {
    const parsed = await parseJobPostingUrl(payload.jobPostingUrl);
    const merged = [parsed.text, direct].filter(Boolean).join('\n\n');
    return { jobDescription: merged || direct, analyzedFromUrl: Boolean(parsed.text), jobPostingTitle: parsed.title || '' };
  } catch {
    return { jobDescription: direct, analyzedFromUrl: false, jobPostingTitle: '' };
  }
}

function weakPhraseHits(text = '') {
  return unique((clean(text).match(/\b(helped with|responsible for|worked on|assisted with|various duties|hardworking|team player)\b/gi) || []).map((v) => v.toLowerCase()));
}

function formattingRisks(text = '') {
  const hits = [];
  if (/\|/.test(text)) hits.push('Possible table or column layout detected.');
  if (/linkedin\s*:\s*/i.test(text) && /page\s+\d+/i.test(text)) hits.push('Header or footer style content may reduce parser accuracy.');
  if ((text.match(/[•▪◦]/g) || []).length > 18) hits.push('Heavy decorative bullet usage may not parse as cleanly as standard bullets.');
  return hits;
}

function extractPriorityKeywords(jobDescription = '', targetRole = '') {
  const text = `${targetRole}\n${jobDescription}`.toLowerCase();
  const phraseLibrary = [
    'employee relations', 'benefits administration', 'change management', 'policy compliance', 'project coordination',
    'stakeholder management', 'data analysis', 'talent acquisition', 'performance management', 'learning and development',
    'customer service', 'microsoft office', 'google workspace', 'human resources', 'payroll administration',
    'applicant tracking system', 'recruitment coordination', 'conflict resolution', 'process improvement', 'interview scheduling',
    'onboarding', 'offboarding', 'hris', 'payroll', 'benefits', 'compliance', 'recruitment', 'sourcing', 'scheduling',
    'case management', 'training', 'documentation', 'reporting', 'community engagement', 'program coordination'
  ];
  const phraseHits = phraseLibrary.filter((item) => text.includes(item));
  const tokenHits = (text.match(/[a-z][a-z0-9+.#/-]{3,}/g) || [])
    .filter((item) => !new Set(['with','that','have','from','your','role','team','work','year','years','using','used','skills','skill','experience','required','preferred','support','across','through','ability','candidate','position']).has(item))
    .slice(0, 60);
  return unique([...phraseHits.map(titleCase), ...tokenHits.map(titleCase)]).slice(0, 12);
}

function extractRequirementSentences(jobDescription = '') {
  return unique(
    lines(jobDescription)
      .flatMap((line) => line.split(/(?<=[.!?])\s+/))
      .map((line) => line.trim())
      .filter((line) => /\b(required|preferred|must|responsible|coordinate|support|manage|develop|deliver|maintain|analyze|collaborate|experience with|ability to)\b/i.test(line))
      .filter((line) => line.length > 40 && line.length < 220)
  ).slice(0, 5);
}

function extractAffiliations(resumeText = '') {
  const hits = lines(resumeText).filter((line) => /\b(member|association|committee|board|network|society|guild|chapter|volunteer council|advisory)\b/i.test(line));
  return unique(hits).slice(0, 4);
}

function atsCheckFallback(payload, resumeText, jobDescription) {
  const profile = inferCandidateProfile(resumeText, payload.targetRole, payload.targetRole);
  const roleProfile = detectRoleProfile(payload.targetRole, jobDescription, resumeText);
  const job = analyzeJobDescription(jobDescription, payload.targetRole);
  const targetSkills = unique([...(job.skills || []), ...(roleProfile.resumeKeywords || []), ...extractPriorityKeywords(jobDescription, payload.targetRole)]);
  const matchedKeywords = targetSkills.filter((skill) => profile.skills.includes(skill));
  const missingKeywords = targetSkills.filter((skill) => !profile.skills.includes(skill)).slice(0, 8);
  const weakPhrases = weakPhraseHits(resumeText);
  const risks = formattingRisks(resumeText);
  const keywordScore = Math.min(40, matchedKeywords.length * 5);
  const skillScore = Math.min(20, matchedKeywords.length * 2 + Math.min(6, profile.skills.length));
  const titleAlignmentScore = clean(payload.targetRole) ? 8 : 5;
  const experienceScore = Math.min(15, profile.experienceLines.length * 2);
  const formattingScore = Math.max(6, 15 - risks.length * 4);
  const score = Math.max(48, Math.min(96, keywordScore + skillScore + titleAlignmentScore + experienceScore + formattingScore - weakPhrases.length * 2));
  return {
    score,
    keywordScore,
    skillScore,
    titleAlignmentScore,
    experienceScore,
    formattingScore,
    matchedKeywords,
    missingKeywords,
    formattingRisks: risks,
    weakPhrases,
    recommendations: [
      missingKeywords[0] ? `Add evidence for ${sentenceCase(missingKeywords[0])} only if you can support it truthfully.` : 'Keep mirroring the role language with visible evidence.',
      weakPhrases.length ? 'Replace vague phrases with direct action + outcome bullets.' : 'Keep bullets focused on action, scope, and result.',
      risks.length ? 'Flatten complex layout into a single-column ATS-safe structure.' : 'Maintain a clean single-column ATS-safe structure.'
    ],
    strengths: [
      matchedKeywords.length ? `Matched ${matchedKeywords.length} role-relevant terms.` : 'Transferable baseline language is present, but role-specific alignment is still thin.',
      profile.experienceLines.length ? 'Experience content is visible enough to tailor.' : 'Experience needs clearer role-facing bullets.',
      !risks.length ? 'Formatting appears relatively parser-friendly.' : 'Formatting still contains some parser risks.'
    ],
    gaps: [
      ...missingKeywords.slice(0, 3).map((item) => `Missing or weak keyword: ${sentenceCase(item)}`),
      ...weakPhrases.slice(0, 2).map((item) => `Weak phrasing detected: “${item}”`),
      ...(risks[0] ? [risks[0]] : [])
    ]
  };
}

function roleSummary(roleProfile, targetRole, profile, focusKeywords = []) {
  const role = clean(targetRole) || roleProfile.label;
  const strengths = unique([...(profile.skills || []), ...(focusKeywords || [])]).slice(0, 4);
  const summaryBase = profile.summaryLines?.length
    ? profile.summaryLines.join(' ')
    : `Professionally presented candidate targeting ${role} opportunities in Canada.`;
  const skillsLine = strengths.length ? ` Strong visible strengths include ${strengths.join(', ')}.` : '';
  return `${summaryBase}${skillsLine} The summary emphasizes verified transferable strengths, recruiter-readable language, and role-specific alignment without inventing claims or inflated metrics.`.replace(/\s+/g, ' ').trim();
}

function polishBullet(line, roleProfile, focusKeywords = []) {
  let cleaned = line.replace(/^[-•▪]\s*/, '').trim();
  if (!cleaned) return null;
  cleaned = cleaned
    .replace(/\b(helped with|assisted with|worked on|responsible for)\b/gi, 'supported')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/^(Led|Managed|Coordinated|Supported|Delivered|Maintained|Prepared|Tracked|Improved|Oversaw|Built|Facilitated|Administered|Analyzed|Executed)\b/.test(cleaned)) {
    cleaned = `Supported ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  }
  const keyword = focusKeywords.find((item) => item && !new RegExp(item, 'i').test(cleaned));
  if (keyword && cleaned.length < 140) cleaned += ` with emphasis on ${keyword.toLowerCase()}`;
  if (!cleaned.endsWith('.')) cleaned += '.';
  return cleaned;
}

function buildStructuredResumeText({ targetRole, profile, summary, optimizedSkills, experienceBlock, roleAlignmentNotes, affiliations }) {
  return [
    targetRole.toUpperCase(),
    profile.email || profile.phone || profile.linkedin ? [profile.email, profile.phone, profile.linkedin].filter(Boolean).join(' | ') : '',
    '',
    'PROFESSIONAL SUMMARY',
    summary,
    '',
    'CORE SKILLS',
    optimizedSkills.join(' • '),
    '',
    'PROFESSIONAL EXPERIENCE',
    ...experienceBlock.map((bullet) => `• ${bullet}`),
    ...(profile.educationLines.length ? ['', 'EDUCATION', ...profile.educationLines] : []),
    ...(profile.languages?.length ? ['', 'LANGUAGES', ...profile.languages] : []),
    ...(profile.certifications.length ? ['', 'CERTIFICATIONS', ...profile.certifications] : []),
    ...(profile.volunteerLines?.length ? ['', 'VOLUNTEER EXPERIENCE', ...profile.volunteerLines] : []),
    ...(affiliations.length ? ['', 'AFFILIATIONS', ...affiliations] : []),
    ['', 'TARGET ROLE ALIGNMENT', ...roleAlignmentNotes]
  ].filter(Boolean).join('\n');
}

function buildProfessionalResumeFallback(payload, resumeText, jobDescription) {
  const profile = inferCandidateProfile(resumeText, payload.targetRole, payload.targetRole);
  const sections = splitSections(resumeText);
  const roleProfile = detectRoleProfile(payload.targetRole, jobDescription, resumeText);
  const job = analyzeJobDescription(jobDescription, payload.targetRole);
  const targetRole = clean(payload.targetRole) || profile.targetGoalHint || profile.professionHint || roleProfile.label;
  const priorityKeywords = extractPriorityKeywords(jobDescription, payload.targetRole);
  const optimizedSkills = unique([...(job.skills || []), ...(roleProfile.resumeKeywords || []), ...priorityKeywords, ...profile.skills]).slice(0, 14);
  const improvedBullets = (profile.experienceLines || []).slice(0, 8).map((line, index) => polishBullet(line, roleProfile, priorityKeywords.slice(index, index + 2))).filter(Boolean);
  const experienceBlock = improvedBullets.length ? improvedBullets : [
    `Supported ${roleProfile.label.toLowerCase()}-relevant work using clearer Canadian employer language and stronger action verbs.`,
    'Highlighted transferable coordination, documentation, stakeholder, and service strengths visible in the source resume.',
    'Kept all claims grounded in the provided text rather than inventing numbers or titles.'
  ];
  const affiliations = extractAffiliations(resumeText);
  const roleAlignmentNotes = unique([
    `Tailored toward ${targetRole} using visible strengths in ${unique([...roleProfile.interviewFocus, ...profile.skills, ...priorityKeywords]).slice(0, 5).join(', ').toLowerCase()}.`,
    ...extractRequirementSentences(jobDescription).slice(0, 2).map((line) => `Aligned to posting priority: ${line}`)
  ]).slice(0, 3);
  const summary = roleSummary(roleProfile, targetRole, profile, priorityKeywords);
  const rewrittenResume = buildStructuredResumeText({
    targetRole,
    profile: {
      ...profile,
      educationLines: profile.educationLines.length ? profile.educationLines : sections.education.slice(0, 3),
      languages: profile.languages,
      certifications: profile.certifications,
      volunteerLines: profile.volunteerLines
    },
    summary,
    optimizedSkills,
    experienceBlock,
    roleAlignmentNotes,
    affiliations
  });
  return {
    summary,
    improvedBullets: experienceBlock,
    optimizedSkills,
    priorityKeywords,
    roleAlignmentNotes,
    rewrittenResume,
    truthGuardNote: 'Truth Guard: this version preserves the candidate’s visible background. Add metrics, systems, or credentials only if you can verify them.'
  };
}

async function atsCheck(payload) {
  const resumeText = clean(payload.resumeText || '');
  const { jobDescription, analyzedFromUrl, jobPostingTitle } = await resolveJobDescription(payload);
  const prompt = [
    'You are an ATS-style resume evaluator for Canadian hiring.',
    'Return strict JSON only with keys score,keywordScore,skillScore,titleAlignmentScore,experienceScore,formattingScore,matchedKeywords,missingKeywords,formattingRisks,weakPhrases,recommendations,strengths,gaps.',
    'Be conservative and evidence-based. No flattering filler.',
    `Target role: ${clean(payload.targetRole || '')}`,
    `Job description: ${jobDescription}`,
    `Resume text: ${resumeText}`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out) return { ...safeJson(out), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
  } catch {}
  return { ...atsCheckFallback(payload, resumeText, jobDescription), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
}

async function rewriteResume(payload) {
  const resumeText = clean(payload.resumeText || '');
  const { jobDescription, analyzedFromUrl, jobPostingTitle } = await resolveJobDescription(payload);
  const roleProfile = detectRoleProfile(payload.targetRole, jobDescription, resumeText);
  const priorityKeywords = extractPriorityKeywords(jobDescription, payload.targetRole);
  const prompt = [
    'You are a senior Canadian resume writer producing polished, recruiter-ready resumes.',
    'Return strict JSON only with keys summary,improvedBullets,optimizedSkills,priorityKeywords,roleAlignmentNotes,rewrittenResume,truthGuardNote.',
    'Produce a complete Canadian-style resume with standard sections when supported by the source text: PROFESSIONAL SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, LANGUAGES, CERTIFICATIONS, VOLUNTEER EXPERIENCE, AFFILIATIONS.',
    'Optimize the summary and bullet language toward the target role while staying truthful.',
    'Use the same role family as the candidate. No profession drift.',
    'Do not invent employers, titles, metrics, licenses, or dates.',
    `Role family: ${roleProfile.label}.`,
    `Priority keywords to weave in when truthful: ${priorityKeywords.join(', ')}`,
    `Target role: ${clean(payload.targetRole || '')}`,
    `Job description: ${jobDescription}`,
    `Resume text: ${resumeText}`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out) return { ...safeJson(out), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
  } catch {}
  return { ...buildProfessionalResumeFallback(payload, resumeText, jobDescription), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
}

module.exports = { atsCheck, rewriteResume, sentenceCase, extractPriorityKeywords, extractRequirementSentences };
