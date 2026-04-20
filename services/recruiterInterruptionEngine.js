function countWords(text = '') {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countMatches(text = '', patterns = []) {
  const lower = String(text).toLowerCase();
  return patterns.reduce((sum, pattern) => {
    const matches = lower.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function analyzeAnswerForInterruptions(answer = '') {
  const text = String(answer || '').trim();
  const wordCount = countWords(text);

  const fillerCount = countMatches(text, [
    /\bum\b/g,
    /\buh\b/g,
    /\blike\b/g,
    /\byou know\b/g,
    /\bkind of\b/g,
    /\bsort of\b/g,
  ]);

  const ownershipSignals = countMatches(text, [
    /\bi\b/g,
    /\bmy\b/g,
    /\bi led\b/g,
    /\bi owned\b/g,
    /\bi decided\b/g,
    /\bi built\b/g,
    /\bi created\b/g,
    /\bi managed\b/g,
  ]);

  const metricSignals = countMatches(text, [
    /\b\d+%/g,
    /\b\d+\b/g,
    /\bincrease\b/g,
    /\breduce\b/g,
    /\bimprove\b/g,
    /\bsaved\b/g,
    /\bgrowth\b/g,
    /\bimpact\b/g,
    /\bresults?\b/g,
    /\boutcome\b/g,
  ]);

  const vagueSignals = countMatches(text, [
    /\bhelped\b/g,
    /\bsupported\b/g,
    /\bworked on\b/g,
    /\bwas involved\b/g,
    /\bparticipated\b/g,
    /\bthings\b/g,
    /\bstuff\b/g,
  ]);

  const repeatedSignals = countMatches(text, [
    /\bbasically\b/g,
    /\bagain\b/g,
    /\bso yeah\b/g,
  ]);

  const tooLong = wordCount > 180;
  const tooVague = vagueSignals >= 3 && ownershipSignals < 3;
  const noOwnership = ownershipSignals < 2;
  const noMetrics = metricSignals < 2;
  const rambling = fillerCount >= 5 || repeatedSignals >= 3 || wordCount > 220;

  let reason = null;

  if (rambling) reason = 'rambling';
  else if (tooLong) reason = 'too_long';
  else if (tooVague) reason = 'too_vague';
  else if (noOwnership) reason = 'no_ownership';
  else if (noMetrics) reason = 'no_metrics';

  return {
    wordCount,
    fillerCount,
    ownershipSignals,
    metricSignals,
    vagueSignals,
    repeatedSignals,
    tooLong,
    tooVague,
    noOwnership,
    noMetrics,
    rambling,
    shouldInterrupt: Boolean(reason),
    reason,
  };
}

function buildInterruptionPrompt(reason) {
  switch (reason) {
    case 'rambling':
      return 'Let me stop you there for a second. Give me the concise version.';
    case 'too_long':
      return 'I want to keep this tight. What was your specific role?';
    case 'too_vague':
      return 'Can you make that more concrete with one specific example?';
    case 'no_ownership':
      return 'What did you personally do, not just the team?';
    case 'no_metrics':
      return 'What was the measurable result?';
    default:
      return null;
  }
}

module.exports = {
  analyzeAnswerForInterruptions,
  buildInterruptionPrompt,
};
