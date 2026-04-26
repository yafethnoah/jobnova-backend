const panelProfiles = {
  recruiter: {
    name: 'Recruiter',
    style: 'structured, concise, people-aware',
    focus: 'communication, clarity, fit, professionalism',
  },
  hiring_manager: {
    name: 'Hiring Manager',
    style: 'practical, direct, role-specific',
    focus: 'execution, ownership, trade-offs, problem solving',
  },
  director: {
    name: 'Director',
    style: 'strategic, high-level, demanding',
    focus: 'leadership, judgment, business impact, stakeholder influence',
  },
};

function buildPanelPrompt(member, context = {}) {
  const profile = panelProfiles[member] || panelProfiles.recruiter;

  return `You are the ${profile.name} in a panel interview. Your style is ${profile.style}. Your focus is ${profile.focus}. Ask one concise question at a time. Do not repeat what previous panelists already covered unless there is a gap. Challenge vague answers. Stay natural and realistic. Target role: ${context.role || 'General role'}. Seniority: ${context.level || 'mid'}.`;
}

module.exports = {
  panelProfiles,
  buildPanelPrompt,
};
