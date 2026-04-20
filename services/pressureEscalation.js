function getPressureLabel(level = 0) {
  if (level >= 4) return 'high';
  if (level >= 2) return 'medium_high';
  return 'medium';
}

function getEscalationInstruction(level = 0) {
  if (level >= 4) {
    return 'The candidate has avoided specificity multiple times. Increase pressure. Ask sharper follow-ups. Be direct and skeptical, while still professional.';
  }

  if (level >= 2) {
    return 'The candidate has been somewhat vague. Tighten your follow-ups and ask for ownership, metrics, and judgment more directly.';
  }

  return 'Maintain a realistic recruiter tone with moderate pressure.';
}

function nextPressureState(current = {}) {
  const weakAnswers = Number(current.weakAnswers || 0) + 1;
  return {
    weakAnswers,
    pressureLabel: getPressureLabel(weakAnswers),
    escalationInstruction: getEscalationInstruction(weakAnswers),
  };
}

module.exports = {
  getPressureLabel,
  getEscalationInstruction,
  nextPressureState,
};
