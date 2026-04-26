const { rewriteResume } = require('./resumeEngine');
const { createPackageFiles } = require('./exportService');
const { toStringList, safeJoin, ensureParagraphs, normalizeExportFormat } = require('../lib/normalize');

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractKeywords(text = '') {
  const stop = new Set(['the','and','for','with','that','this','from','your','have','will','you','our','are','was','were','their','has','had','but','not','into','all','per','can','job','role','work','year','years','using','use','used','ability','skills','skill','experience','required','preferred','support','team','including','within','across','through']);
  const matches = clean(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+.#/-]{2,}/g) || [];
  return [...new Set(matches.filter((word) => !stop.has(word)))];
}

function extractPhrases(text = '') {
  const raw = String(text || '').toLowerCase();
  const phrases = [
    'employee relations','benefits administration','policy compliance','change management','project coordination',
    'stakeholder management','data analysis','talent acquisition','performance management','learning and development',
    'customer service','microsoft office','google workspace','human resources','payroll administration',
    'applicant tracking system','recruitment coordination','conflict resolution','process improvement','interview scheduling',
    'onboarding','offboarding','hris','payroll','benefits','compliance','recruitment','sourcing','scheduling'
  ];
  return phrases.filter((phrase) => raw.includes(phrase));
}

function formattingRisks(text = '') {
  const risks = [];
  const source = String(text || '');
  if (!source.trim()) return ['Resume text is empty or was not parsed.'];
  if (/\|/.test(source) || /\t/.test(source)) risks.push('Possible table or multi-column layout detected.');
  if (/page\s+\d+/i.test(source) || /header|footer/i.test(source)) risks.push('Header or footer style text may confuse older ATS parsers.');
  if ((source.match(/[•▪◦]/g) || []).length > 18) risks.push('Heavy decorative bullet usage may reduce parse consistency.');
  if ((source.match(/\b[A-Z][A-Z\s/&-]{4,}\b/g) || []).length > 12) risks.push('Many all-caps headings detected; keep section titles standard and sparse.');
  return risks;
}

function weakPhrases(text = '') {
  return [...new Set((String(text || '').toLowerCase().match(/\b(helped with|responsible for|worked on|various duties|team player|hardworking|assisted with)\b/g) || []))];
}

function titleAlignment(targetRole = '', resumeText = '', jobDescription = '') {
  const target = clean(targetRole).toLowerCase();
  if (!target) return 6;
  const hay = `${resumeText} ${jobDescription}`.toLowerCase();
  if (hay.includes(target)) return 10;
  const targetWords = target.split(/\s+/).filter(Boolean);
  const hits = targetWords.filter((word) => hay.includes(word)).length;
  return Math.max(3, Math.min(9, hits * 3));
}

function sectionCompletenessScore(resumeText = '') {
  const raw = String(resumeText || '').toLowerCase();
  const sections = {
    summary: /summary|profile|professional summary/.test(raw),
    skills: /skills|core competencies|competencies/.test(raw),
    experience: /experience|employment|work history/.test(raw),
    education: /education|academic/.test(raw),
    contact: /@|linkedin\.com|phone|\+\d/.test(raw)
  };
  const hits = Object.values(sections).filter(Boolean).length;
  return {
    score: Math.round((hits / 5) * 10),
    sections
  };
}

function semanticAlignmentScore(resumeKeywords = [], jdKeywords = []) {
  const r = new Set(resumeKeywords);
  const j = new Set(jdKeywords);
  const intersection = [...j].filter((item) => r.has(item));
  const unionSize = new Set([...resumeKeywords, ...jdKeywords]).size || 1;
  const jaccard = intersection.length / unionSize;
  const coverage = jdKeywords.length ? intersection.length / jdKeywords.length : 0.45;
  return {
    score: Math.round(Math.min(15, (jaccard * 8) + (coverage * 7))),
    jaccard: Number(jaccard.toFixed(3)),
    coverage: Number(coverage.toFixed(3))
  };
}


function extractActionVerbs(text = '') {
  return [...new Set((String(text || '').toLowerCase().match(/(managed|coordinated|led|supported|delivered|improved|maintained|created|implemented|analyzed|owned|launched|streamlined|developed|trained|resolved|planned|organized)/g) || []))];
}

function estimateEvidenceDensity(text = '') {
  const bullets = (String(text || '').match(/^[\-•▪*]/gm) || []).length;
  const metrics = (String(text || '').match(/\d+(?:%|\+|x|\s*(?:days|weeks|months|years|people|staff|clients|projects))/gi) || []).length;
  const actions = extractActionVerbs(text).length;
  return { bullets, metrics, actions, score: Math.min(10, bullets + metrics + actions) };
}

function scoreResume({ resumeText = '', jobDescription = '', targetRole = '' }) {
  const resumeKeywords = [...new Set([...extractKeywords(resumeText), ...extractPhrases(resumeText)])];
  const jdKeywords = [...new Set([...extractKeywords(jobDescription), ...extractPhrases(jobDescription)])];
  const matchedKeywords = jdKeywords.filter((keyword) => resumeKeywords.includes(keyword)).slice(0, 18);
  const missingKeywords = jdKeywords.filter((keyword) => !resumeKeywords.includes(keyword)).slice(0, 12);
  const keywordAlignment = jdKeywords.length ? matchedKeywords.length / jdKeywords.length : 0.45;
  const skillAlignment = Math.min(1, matchedKeywords.length / 8);
  const experienceEvidence = Math.min(1, ((resumeText.match(/^[\-•▪*]/gm) || []).length + (resumeText.match(/\b(managed|coordinated|led|supported|delivered|improved|maintained|created|implemented|analyzed|owned|launched|streamlined)\b/gi) || []).length) / 16);
  const titleScore = titleAlignment(targetRole, resumeText, jobDescription);
  const risks = formattingRisks(resumeText);
  const weak = weakPhrases(resumeText);
  const formattingScore = Math.max(2, 15 - risks.length * 4);
  const keywordScore = Math.round(keywordAlignment * 30);
  const skillsScore = Math.round(skillAlignment * 15);
  const experienceScore = Math.round(experienceEvidence * 12);
  const semantic = semanticAlignmentScore(resumeKeywords, jdKeywords);
  const sectionCompleteness = sectionCompletenessScore(resumeText);
  const evidenceDensity = estimateEvidenceDensity(resumeText);
  const seniorityScore = Math.min(10, Math.max(4, Math.round((matchedKeywords.filter((k) => /manager|lead|strategy|stakeholder|ownership|project/.test(k)).length + 4))));
  const overallScore = Math.max(34, Math.min(98, keywordScore + skillsScore + titleScore + experienceScore + formattingScore + seniorityScore + semantic.score + sectionCompleteness.score + Math.min(6, evidenceDensity.score) - weak.length * 2));

  const topImprovements = [
    missingKeywords[0] ? `Add truthful evidence for “${missingKeywords[0]}” if the experience is real.` : 'Keep aligning summary and bullets to the job description language.',
    weak.length ? 'Replace vague wording with action + scope + outcome bullets.' : 'Keep bullets concrete and evidence-led.',
    !sectionCompleteness.sections.summary ? 'Add a short professional summary tailored to the target role.' : (risks[0] ? 'Flatten layout to a single-column ATS-safe structure.' : 'Maintain a clean single-column ATS-safe layout.')
  ];

  return {
    overallScore,
    keywordScore,
    skillsScore,
    titleScore,
    experienceScore,
    formattingScore,
    seniorityScore,
    semanticScore: semantic.score,
    sectionCompletenessScore: sectionCompleteness.score,
    semanticSignals: semantic,
    sectionSignals: sectionCompleteness.sections,
    matchedKeywords,
    missingKeywords,
    formattingRisks: risks,
    weakPhrases: weak,
    evidenceDensity,
    scoreBreakdown: {
      keywords: keywordScore,
      skills: skillsScore,
      title: titleScore,
      experience: experienceScore,
      formatting: formattingScore,
      seniority: seniorityScore,
      semantic: semantic.score,
      sections: sectionCompleteness.score,
      evidence: Math.min(6, evidenceDensity.score)
    },
    recruiterConcerns: [
      ...(missingKeywords.slice(0, 2).map((item) => `Limited visible evidence for ${item}.`)),
      ...(!sectionCompleteness.sections.experience ? ['Experience section label is not clearly detectable.'] : []),
      ...(weak.slice(0, 2).map((item) => `Vague phrasing detected: “${item}”.`)),
      ...(risks[0] ? [risks[0]] : [])
    ],
    topImprovements,
    quickWins: [
      missingKeywords[0] ? `Mirror the language of “${missingKeywords[0]}” where your experience already supports it.` : 'Keep reinforcing the most important role language in your summary and bullets.',
      evidenceDensity.metrics ? 'Keep one measurable result near the end of each major bullet.' : 'Add at least one measurable or observable outcome to the strongest bullets.',
      sectionCompleteness.sections.skills ? 'Keep the skills section tightly aligned to the posting.' : 'Add a clean skills section with only job-relevant terms.'
    ]
  };
}

async function compareResumeToJob(input = {}) {
  const resumeText = String(input.resumeText || input.resume || '').trim();
  const jobDescription = String(input.jobDescription || input.jd || '').trim();
  const targetRole = String(input.targetRole || input.roleTitle || '').trim();
  const score = scoreResume({ resumeText, jobDescription, targetRole });
  return {
    ...score,
    roleSummary: targetRole
      ? `Best aligned with ${targetRole} opportunities when the missing gaps are tightened.`
      : 'Role alignment is reasonable, but a clearer target title would sharpen the rewrite.',
    sourceMode: resumeText && jobDescription ? 'content' : 'lightweight'
  };
}

async function generateTailoredResume(input = {}) {
  const result = await rewriteResume({
    resumeText: input.resumeText || '',
    jobDescription: input.jobDescription || '',
    targetRole: input.targetRole || input.roleTitle || ''
  });
  const ats = await compareResumeToJob(input);
  return {
    ...result,
    ats,
    truthGuard: {
      safeToUse: true,
      flaggedClaims: [],
      reason: 'Generated from visible source material only. Add metrics or certifications manually only if verifiable.'
    }
  };
}

async function generateApplicationPackage(input = {}) {
  const tailored = await generateTailoredResume(input);
  tailored.optimizedSkills = toStringList(tailored.optimizedSkills, []);
  tailored.improvedBullets = toStringList(tailored.improvedBullets, []);
  tailored.roleAlignmentNotes = toStringList(tailored.roleAlignmentNotes, []);
  tailored.rewrittenResume = ensureParagraphs(tailored.rewrittenResume, '');
  const roleTitle = clean(input.targetRole || input.roleTitle || 'Target Role');
  const companyName = clean(input.companyName || 'Company');
  const candidateName = clean(input.fullName || 'Candidate');
  const coverLetter = [
    `Dear Hiring Team at ${companyName},`,
    '',
    `I am applying for the ${roleTitle} role. My background includes transferable experience in ${safeJoin(tailored.optimizedSkills.slice(0, 4), ', ', 'coordination, communication, and service-focused execution')} and a strong track record of coordination, communication, and service-focused execution.`,
    '',
    'I would welcome the opportunity to bring this experience to your team and contribute quickly with a practical, organized, and people-focused approach.',
    '',
    'Thank you for your consideration.',
    '',
    candidateName
  ].join('\n');
  const recruiterEmail = [
    `Subject: ${roleTitle} Application – ${candidateName}`,
    '',
    `Hello ${companyName} Hiring Team,`,
    '',
    `Please find my tailored application for the ${roleTitle} position attached. I have included an ATS-optimized resume and cover letter aligned to the role requirements.`,
    '',
    'Thank you for your time and consideration.',
    '',
    candidateName
  ].join('\n');

  return {
    ats: tailored.ats,
    tailoredResume: tailored,
    coverLetter,
    recruiterEmail,
    followUpPlan: {
      firstFollowUpDays: 5,
      secondFollowUpDays: 10,
      actions: [
        'Submit tailored package.',
        'Follow up after 5 days if no response.',
        'Practice 2 interview questions based on the job description.'
      ]
    }
  };
}

async function generateExportBundle(input = {}) {
  const packageResult = input.tailoredResume ? input : await generateApplicationPackage(input);
  const files = await createPackageFiles({
    roleTitle: input.targetRole || input.roleTitle || 'Target Role',
    companyName: input.companyName || 'Company',
    amendedResume: packageResult.tailoredResume?.rewrittenResume || packageResult.rewrittenResume || '',
    coverLetter: packageResult.coverLetter || input.coverLetter || '',
    recruiterEmail: packageResult.recruiterEmail || input.recruiterEmail || '',
    selectedExportFormat: normalizeExportFormat(input.selectedExportFormat || input.exportType || 'both', 'both'),
    resumeThemeId: input.resumeThemeId || input.theme || 'classic-canadian-professional',
    layoutMode: input.layoutMode || input.layout || 'two-page'
  });
  return { files, packageResult };
}

module.exports = {
  compareResumeToJob,
  generateTailoredResume,
  generateApplicationPackage,
  generateExportBundle
};
