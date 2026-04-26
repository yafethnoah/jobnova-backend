const { askOpenAI } = require('../lib/openai');
const { inferCandidateProfile, clean, unique } = require('./profileIntelligence');
const { detectRoleProfile } = require('./roleIntelligence');

function safeJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(text);
}

function detectRegulated(profileKey, target = '') {
  const lower = clean(target).toLowerCase();
  if (profileKey === 'pharmacy' || /pharmac/.test(lower)) return 'Pharmacists in Ontario need registration through the Ontario College of Pharmacists before full independent practice. Bridge roles should support, not replace, that regulated pathway.';
  if (/nurs/.test(lower)) return 'Nursing roles in Ontario typically require College of Nurses of Ontario registration.';
  if (/doctor|physician/.test(lower)) return 'Physician roles in Ontario require CPSO licensing and related credential review.';
  if (/teacher/.test(lower)) return 'Teaching roles in Ontario often require Ontario College of Teachers certification.';
  if (/engineer/.test(lower)) return 'Professional engineer roles in Ontario may require Professional Engineers Ontario licensing.';
  return '';
}

function fallbackPath(payload) {
  const profile = inferCandidateProfile(payload.resumeText, payload.profession, payload.targetGoal);
  const roleProfile = detectRoleProfile(payload.profession, payload.targetGoal, payload.resumeText);
  const target = clean(payload.targetGoal) || clean(payload.profession) || roleProfile.label;
  const skillsToBuild = unique([...(roleProfile.resumeKeywords || []), ...profile.skills, 'Interview practice', 'Networking']).slice(0, 8);
  return {
    primaryPath: {
      title: roleProfile.careerPrimary,
      estimatedTimeline: payload.urgencyLevel === 'high' ? '2 to 6 months for bridge entry, then 12 to 24 months toward the target track' : '4 to 12 months for bridge entry, then 12 to 24+ months toward the target track',
      steps: [
        `Build a ${roleProfile.label.toLowerCase()}-aligned resume that mirrors the target role language without inventing experience.`,
        `Apply to bridge and direct-fit ${target} roles in parallel so you build traction while protecting the long-term target.`,
        'Track which titles give you interviews, then narrow your search toward the roles that actually respond.',
        `Practice interview answers around ${roleProfile.interviewFocus.slice(0,3).join(', ')}, because those themes will likely surface early.`
      ]
    },
    bridgePath: {
      title: roleProfile.careerBridge,
      steps: [
        'Use job-specific resume versions instead of one generic document for every application.',
        'Choose roles that generate local references, process credibility, and employer-readable achievements.',
        'Translate past work into concise Canadian employer language with action + outcome framing.'
      ]
    },
    regulatedWarning: detectRegulated(roleProfile.key, target),
    officialLinks: [{ title: 'Employment Ontario', url: 'https://www.ontario.ca/page/employment-ontario' }],
    skillsToBuild,
    reasoning: `This path stays anchored to your visible background signals: ${[clean(payload.profession), clean(payload.targetGoal), ...profile.roleSignals].filter(Boolean).join(', ') || roleProfile.label}. It avoids drifting into unrelated professions.`
  };
}

async function generateCareerPath(payload) {
  const profile = inferCandidateProfile(payload.resumeText, payload.profession, payload.targetGoal);
  const roleProfile = detectRoleProfile(payload.profession, payload.targetGoal, payload.resumeText);
  const prompt = [
    'You are a Canadian career strategist for newcomers and career changers.',
    'Return strict JSON only with keys primaryPath,bridgePath,regulatedWarning,officialLinks,skillsToBuild,reasoning.',
    'The candidate must stay in the same professional family. No profession drift.',
    'primaryPath must contain title, estimatedTimeline, and steps array.',
    'bridgePath must contain title and steps array.',
    'Use only realistic, evidence-based details from the visible profile.',
    'Avoid fake precision. No invented employers, licenses, or timelines.',
    `Role profile family: ${roleProfile.label}.`,
    `Candidate profile: ${JSON.stringify({
      profession: payload.profession || '', targetGoal: payload.targetGoal || '', yearsExperience: payload.yearsExperience || '', educationLevel: payload.educationLevel || '', englishLevel: payload.englishLevel || '', urgencyLevel: payload.urgencyLevel || 'medium', profile
    })}`,
    `If regulated in Ontario for this family, explain plainly. Otherwise regulatedWarning should be an empty string.`
  ].join('\n');
  try {
    const out = await askOpenAI(prompt);
    if (out) return safeJson(out);
  } catch {}
  return fallbackPath(payload);
}

module.exports = { generateCareerPath };
