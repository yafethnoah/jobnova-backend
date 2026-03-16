const { askOpenAI } = require('../lib/openai');
const { parseJobPostingUrl } = require('./jobPostParser');
const { inferCandidateProfile, analyzeJobDescription, clean, titleCase, unique } = require('./profileIntelligence');
const { detectRoleProfile } = require('./roleIntelligence');

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

function safeJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(text);
}

function conservativeScore(overlapCount, targetRole, headline) {
  let score = 55 + Math.min(18, overlapCount * 4);
  if (!headline || headline.length < 20) score -= 12;
  if (targetRole && !headline.toLowerCase().includes(targetRole.toLowerCase().split(' ')[0])) score -= 6;
  return Math.max(42, Math.min(92, score));
}

function fallbackLinkedIn(payload, jobDescription) {
  const profile = inferCandidateProfile(payload.resumeText, payload.targetRole, payload.targetRole);
  const roleProfile = detectRoleProfile(payload.targetRole, jobDescription, payload.resumeText);
  const job = analyzeJobDescription(jobDescription, payload.targetRole);
  const overlap = unique(job.skills.filter((skill) => profile.skills.includes(skill)));
  const missingKeywords = unique([...(roleProfile.linkedinKeywords || []), ...job.skills].filter((skill) => !profile.skills.includes(skill))).slice(0, 8);
  const targetRole = clean(payload.targetRole) || profile.targetGoalHint || profile.professionHint || roleProfile.label;
  const headlineKeywords = unique([targetRole, ...(overlap.length ? overlap : roleProfile.linkedinKeywords.slice(0, 3)).map(titleCase)]).slice(0, 4);
  const improvedHeadline = headlineKeywords.join(' | ');
  const improvedAbout = `Professionally grounded candidate targeting ${targetRole} opportunities. Background includes ${unique([...profile.roleSignals, ...profile.skills]).slice(0, 5).join(', ').toLowerCase() || roleProfile.label.toLowerCase()} with profile language tightened to reflect Canadian employer expectations, clearer business impact, and more specific role alignment.`;
  const headlineScore = conservativeScore(overlap.length, targetRole, improvedHeadline);
  const aboutScore = Math.max(48, headlineScore - 3 + Math.min(6, profile.experienceLines.length));
  return {
    scoreSummary: {
      headlineScore,
      aboutScore,
      evidenceNote: overlap.length ? 'Scores are based on visible overlap between your resume/profile signals and the target role.' : 'Scores are conservative because visible role alignment is still thin.'
    },
    keywordOverlap: overlap,
    missingKeywords,
    improvedHeadline,
    improvedAbout,
    featuredSuggestions: [
      `Put ${targetRole} or its closest accepted title directly in the headline.`,
      'Replace broad adjectives with concrete role language and stakeholder-facing responsibilities.',
      `Add evidence around ${missingKeywords.slice(0, 2).join(' and ')} only if your background truly supports it.`
    ],
    analyzedJobDescription: jobDescription,
    analyzedFromUrl: false,
    jobPostingTitle: ''
  };
}

async function optimizeLinkedIn(payload) {
  const { jobDescription, analyzedFromUrl, jobPostingTitle } = await resolveJobDescription(payload);
  const profile = inferCandidateProfile(payload.resumeText, payload.targetRole, payload.targetRole);
  const roleProfile = detectRoleProfile(payload.targetRole, jobDescription, payload.resumeText);
  const prompt = [
    'You are a senior Canadian recruiter optimizing a LinkedIn profile.',
    'Return strict JSON only with keys scoreSummary,keywordOverlap,missingKeywords,improvedHeadline,improvedAbout,featuredSuggestions.',
    'scoreSummary must include headlineScore, aboutScore, evidenceNote.',
    'Be conservative. Do not hand out fantasy scores. Low evidence should lower the score.',
    'Only use the same professional family as the candidate evidence.',
    `Role family: ${roleProfile.label}.`,
    `Target role: ${clean(payload.targetRole || '')}`,
    `Job description: ${jobDescription}`,
    `Visible candidate profile: ${JSON.stringify(profile)}`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out) return { ...safeJson(out), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
  } catch {}
  return { ...fallbackLinkedIn(payload, jobDescription), analyzedJobDescription: jobDescription, analyzedFromUrl, jobPostingTitle };
}

module.exports = { optimizeLinkedIn };
