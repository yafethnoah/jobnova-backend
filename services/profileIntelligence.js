function clean(value = '') {
  return String(value || '').replace(/\r/g, '').trim();
}

function lines(text = '') {
  return clean(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(arr = []) {
  return Array.from(new Set(arr.filter(Boolean)));
}

const SECTION_HINTS = {
  summary: [/summary/i, /profile/i, /about/i, /objective/i],
  experience: [/experience/i, /employment/i, /work history/i, /professional experience/i],
  education: [/education/i, /academic/i, /qualification/i],
  skills: [/skills/i, /core competencies/i, /technical skills/i],
  certifications: [/certification/i, /license/i, /licence/i],
  languages: [/languages?/i, /language proficiency/i],
  volunteer: [/volunteer/i, /community involvement/i],
  contact: [/email/i, /phone/i, /linkedin/i, /address/i]
};

function splitSections(text = '') {
  const rawLines = lines(text);
  const sections = { summary: [], experience: [], education: [], skills: [], certifications: [], languages: [], volunteer: [], contact: [], other: [] };
  let current = 'other';
  for (const line of rawLines) {
    const matched = Object.entries(SECTION_HINTS).find(([, patterns]) => patterns.some((pattern) => pattern.test(line) && line.length < 50));
    if (matched) {
      current = matched[0];
      continue;
    }
    sections[current].push(line);
  }
  return sections;
}

function detectEmail(text = '') {
  return clean(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function detectPhone(text = '') {
  return clean(text).match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
}

function detectLinkedIn(text = '') {
  return clean(text).match(/https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9\-_/]+/i)?.[0] || '';
}

function titleCase(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/Hris/g, 'HRIS')
    .replace(/Crm/g, 'CRM')
    .replace(/Bi/g, 'BI');
}

const KNOWN_LANGUAGES = ['English', 'French', 'Arabic', 'Spanish', 'Urdu', 'Hindi', 'Punjabi', 'Mandarin', 'Cantonese', 'Tagalog', 'Farsi'];

const SKILL_LIBRARY = [
  'hris', 'workday', 'payroll', 'onboarding', 'recruitment', 'employee relations', 'benefits',
  'compliance', 'scheduling', 'customer service', 'project coordination', 'excel', 'reporting',
  'stakeholder management', 'data entry', 'training', 'policy', 'interviewing', 'calendar management',
  'crm', 'salesforce', 'power bi', 'data analysis', 'case management', 'talent acquisition',
  'program coordination', 'employer outreach', 'student placements', 'partnerships', 'operations',
  'inventory', 'dispensing', 'pharmacy', 'medication safety', 'quality assurance', 'documentation'
];

function normalize(text = '') {
  return clean(text).toLowerCase().replace(/[^a-z0-9\s+/-]/g, ' ');
}

function extractKnownSkills(text = '') {
  const base = normalize(text);
  return SKILL_LIBRARY.filter((skill) => base.includes(skill));
}


function extractLanguages(text = '') {
  const base = clean(text).toLowerCase();
  return KNOWN_LANGUAGES.filter((language) => base.includes(language.toLowerCase()));
}

function firstMeaningfulLines(block = [], limit = 4) {
  return block.filter((line) => line.length > 18).slice(0, limit);
}

function detectRoleSignals(text = '') {
  const base = normalize(text);
  const signals = [];
  const mappings = [
    [/pharmac|dispens|medication/, 'Pharmacy'],
    [/hr|human resources|recruit|payroll|employee relations/, 'Human Resources'],
    [/placement|student placements|employer outreach|career support/, 'Student Success'],
    [/project|program|operations|stakeholder/, 'Program Operations'],
    [/data|reporting|power bi|excel/, 'Data & Reporting'],
    [/admin|administrative|office/, 'Administration']
  ];
  for (const [pattern, label] of mappings) if (pattern.test(base)) signals.push(label);
  return unique(signals);
}

function inferCandidateProfile(resumeText = '', profession = '', targetGoal = '') {
  const sections = splitSections(resumeText);
  const header = lines(resumeText).slice(0, 8).join(' ');
  const knownSkills = unique([
    ...extractKnownSkills(resumeText),
    ...sections.skills.flatMap((line) => extractKnownSkills(line))
  ]).map(titleCase);
  const experienceLines = firstMeaningfulLines(sections.experience.length ? sections.experience : sections.other, 8);
  const educationLines = firstMeaningfulLines(sections.education, 3);
  const summaryLines = firstMeaningfulLines(sections.summary, 3);
  const certifications = firstMeaningfulLines(sections.certifications, 5);
  const languageLines = firstMeaningfulLines(sections.languages, 4);
  const volunteerLines = firstMeaningfulLines(sections.volunteer, 4);
  const detectedLanguages = unique([...extractLanguages(resumeText), ...extractLanguages(languageLines.join(' '))]);
  const roleSignals = detectRoleSignals(`${profession} ${targetGoal} ${resumeText}`);
  return {
    email: detectEmail(header),
    phone: detectPhone(header),
    linkedin: detectLinkedIn(header),
    summaryLines,
    experienceLines,
    educationLines,
    certifications,
    languages: detectedLanguages.length ? detectedLanguages : languageLines,
    volunteerLines,
    skills: knownSkills,
    roleSignals,
    professionHint: clean(profession),
    targetGoalHint: clean(targetGoal)
  };
}

function analyzeJobDescription(jobDescription = '', targetRole = '') {
  const text = `${targetRole}\n${jobDescription}`;
  const skills = extractKnownSkills(text).map(titleCase);
  const verbs = unique((clean(jobDescription).match(/\b(manage|coordinate|support|lead|analyze|build|maintain|develop|deliver|improve|collaborate|prepare|track|report)\b/gi) || []).map((v) => v.toLowerCase()));
  return { skills, verbs, raw: clean(jobDescription) };
}

module.exports = {
  clean,
  lines,
  unique,
  titleCase,
  normalize,
  splitSections,
  inferCandidateProfile,
  analyzeJobDescription,
  extractKnownSkills,
  detectRoleSignals
};
