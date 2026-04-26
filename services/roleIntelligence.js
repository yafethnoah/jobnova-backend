const { clean, unique } = require('./profileIntelligence');

const ROLE_PROFILES = {
  pharmacy: {
    label: 'Pharmacy',
    cues: [/pharmac/i, /medication/i, /dispens/i, /drug store/i, /patient/i],
    linkedinKeywords: ['pharmacy operations', 'medication safety', 'dispensing support', 'inventory control', 'patient service', 'documentation'],
    resumeKeywords: ['medication safety', 'dispensing support', 'inventory accuracy', 'documentation', 'customer service', 'confidentiality'],
    careerPrimary: 'Pharmacy Assistant → Pharmacy Technician → Licensed Pharmacist',
    careerBridge: 'Pharmacy Assistant / Medical Office Support / Clinic Administration',
    interviewFocus: ['accuracy', 'confidentiality', 'patient communication', 'process discipline']
  },
  hr: {
    label: 'Human Resources',
    cues: [/\bhr\b/i, /human resources/i, /recruit/i, /onboarding/i, /employee relations/i, /payroll/i],
    linkedinKeywords: ['hr coordination', 'employee lifecycle support', 'recruitment administration', 'hris', 'stakeholder communication', 'documentation accuracy'],
    resumeKeywords: ['HRIS', 'onboarding', 'employee documentation', 'recruitment coordination', 'compliance', 'stakeholder support'],
    careerPrimary: 'HR Coordinator → HR Generalist → HR Business Partner',
    careerBridge: 'Administrative Assistant / Recruiting Assistant / Payroll Support',
    interviewFocus: ['confidentiality', 'coordination', 'accuracy', 'stakeholder communication']
  },
  placement: {
    label: 'Placement & Employer Partnerships',
    cues: [/placement/i, /student success/i, /employer outreach/i, /career support/i, /employer partnerships/i],
    linkedinKeywords: ['placement coordination', 'employer partnerships', 'student success', 'stakeholder engagement', 'program coordination', 'career support'],
    resumeKeywords: ['employer outreach', 'student placements', 'stakeholder engagement', 'program coordination', 'documentation', 'relationship building'],
    careerPrimary: 'Placement Coordinator → Employer Partnerships Specialist → Student Success / Program Leadership',
    careerBridge: 'Program Assistant / Career Services Support / Administrative Coordination',
    interviewFocus: ['relationship building', 'stakeholder management', 'student support', 'documentation']
  },
  admin: {
    label: 'Administration & Operations',
    cues: [/admin/i, /office/i, /operations/i, /coordinator/i, /scheduling/i, /calendar/i],
    linkedinKeywords: ['administrative coordination', 'operations support', 'scheduling', 'documentation', 'reporting', 'stakeholder support'],
    resumeKeywords: ['scheduling', 'reporting', 'documentation', 'customer service', 'data entry', 'process support'],
    careerPrimary: 'Administrative Coordinator → Operations Coordinator → Office / Program Manager',
    careerBridge: 'Administrative Assistant / Customer Service / Office Support',
    interviewFocus: ['prioritization', 'organization', 'accuracy', 'service mindset']
  },
  nonprofit: {
    label: 'Program & Community Services',
    cues: [/program/i, /community/i, /nonprofit/i, /case management/i, /service delivery/i, /humanitarian/i],
    linkedinKeywords: ['program coordination', 'service delivery', 'stakeholder engagement', 'documentation', 'community partnerships', 'operations'],
    resumeKeywords: ['program coordination', 'service delivery', 'stakeholder engagement', 'documentation', 'reporting', 'community support'],
    careerPrimary: 'Program Coordinator → Program Manager → Operations / Community Services Leadership',
    careerBridge: 'Program Support / Administrative Coordination / Client Services Support',
    interviewFocus: ['impact', 'service delivery', 'stakeholder management', 'problem solving']
  }
};

function detectRoleProfile(...inputs) {
  const text = clean(inputs.filter(Boolean).join(' ')).toLowerCase();
  for (const [key, profile] of Object.entries(ROLE_PROFILES)) {
    if (profile.cues.some((re) => re.test(text))) return { key, ...profile };
  }
  return { key: 'admin', ...ROLE_PROFILES.admin };
}

function roleSpecificKeywords(profile, base = []) {
  return unique([...(base || []), ...(profile?.resumeKeywords || [])]);
}

module.exports = { ROLE_PROFILES, detectRoleProfile, roleSpecificKeywords };
