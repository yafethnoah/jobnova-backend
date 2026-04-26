const { askOpenAI } = require('../lib/openai');
const {
  analyzeAnswerForInterruptions,
  buildInterruptionPrompt,
} = require('./recruiterInterruptionEngine');

function safeJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? String(fenced[1] || '').trim() : raw;
    const match = candidate.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : candidate);
  } catch {
    return null;
  }
}

function clamp(value, min = 0, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function average(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function splitIntoTurns(events = []) {
  const normalized = events
    .filter(Boolean)
    .map((item) => ({
      speaker: item.speaker,
      text: String(item.text || '').trim(),
      createdAt: item.createdAt || '',
    }))
    .filter((item) => item.text);

  const turns = [];
  let current = null;

  for (const item of normalized) {
    if (item.speaker === 'ai') {
      if (current) turns.push(current);
      current = {
        questionId: `q${turns.length + 1}`,
        recruiterPrompt: item.text,
        candidateAnswer: '',
        followUps: [],
      };
      continue;
    }

    if (!current) {
      current = {
        questionId: `q${turns.length + 1}`,
        recruiterPrompt: 'Opening candidate response',
        candidateAnswer: item.text,
        followUps: [],
      };
      continue;
    }

    current.candidateAnswer = current.candidateAnswer
      ? `${current.candidateAnswer} ${item.text}`.trim()
      : item.text;
  }

  if (current) turns.push(current);
  return turns;
}

function evaluateEmotionalIntelligence(answer = '') {
  const text = String(answer || '').toLowerCase();

  const selfAwareness = /learned|realized|reflected|would do differently|improved/.test(text) ? 82 : 58;
  const empathy = /team|stakeholder|employee|client|customer|manager|colleague/.test(text) ? 80 : 56;
  const composure = /calm|stayed focused|handled pressure|de-escalated|managed/.test(text) ? 80 : 57;
  const accountability = /i took responsibility|my mistake|i owned|i should have|i was accountable/.test(text) ? 82 : 58;
  const stakeholderSensitivity = /impact on others|concerns|trust|communication|buy-in/.test(text) ? 80 : 56;

  return {
    selfAwareness,
    empathy,
    composure,
    accountability,
    stakeholderSensitivity,
  };
}

function scoreAnswer(answer = '', prompt = '') {
  const text = `${prompt} ${answer}`.trim();
  const words = String(answer || '').trim().split(/\s+/).filter(Boolean);
  const fillerMatches = answer.match(/\b(um|uh|like|you know|basically|actually|sort of|kind of)\b/gi) || [];
  const resultMatches = answer.match(/\b(result|outcome|improved|reduced|increased|saved|delivered|completed|achieved|grew|raised)\b/gi) || [];
  const actionMatches = answer.match(/\b(I|we)\s+(led|built|created|implemented|organized|coordinated|managed|resolved|improved|launched|delivered|designed|supported|prepared|negotiated|trained)\b/gi) || [];
  const metricMatches = answer.match(/\b\d+(?:\.\d+)?%?|\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi) || [];
  const starSignals = answer.match(/\b(situation|task|action|result)\b/gi) || [];
  const ownershipSignals = answer.match(/\b(I |my |I\'d |I\s)\b/gi) || [];
  const interruption = analyzeAnswerForInterruptions(answer);
  const emotionalIntelligence = evaluateEmotionalIntelligence(answer);

  const clarity = clamp(68 + Math.min(12, words.length / 12) + Math.min(8, actionMatches.length * 2) - Math.min(14, fillerMatches.length * 2));
  const structure = clamp(64 + Math.min(12, starSignals.length * 3) + Math.min(8, resultMatches.length * 2) - (words.length > 220 ? 10 : 0));
  const specificity = clamp(60 + Math.min(10, metricMatches.length * 3) + Math.min(10, resultMatches.length * 2));
  const relevance = clamp(68 + Math.min(10, /team|stakeholder|customer|employee|candidate|project|deadline|policy|compliance|operations|service/i.test(text) ? 8 : 0));
  const ownership = clamp(60 + Math.min(14, ownershipSignals.length * 2) + Math.min(10, actionMatches.length * 2));
  const impact = clamp(58 + Math.min(14, resultMatches.length * 3) + Math.min(12, metricMatches.length * 2));
  const confidence = clamp((clarity + ownership + impact) / 3 - Math.min(10, fillerMatches.length * 2));

  return {
    clarity,
    structure,
    specificity,
    relevance,
    ownership,
    impact,
    confidence,
    fillerCount: fillerMatches.length,
    interruption,
    emotionalIntelligence,
  };
}

function decisionFromSignals({
  averageScore = 0,
  ownership = 0,
  specificity = 0,
  impact = 0,
  confidence = 0,
  weakAnswers = 0,
}) {
  if (
    averageScore >= 80 &&
    ownership >= 72 &&
    specificity >= 72 &&
    impact >= 72 &&
    confidence >= 72 &&
    weakAnswers <= 1
  ) {
    return {
      decision: 'Hire',
      confidence: 'High',
      rationale: 'The candidate demonstrated strong ownership, specific examples, measurable outcomes, and consistent communication quality.',
    };
  }

  if (
    averageScore >= 68 &&
    ownership >= 62 &&
    specificity >= 62 &&
    confidence >= 62
  ) {
    return {
      decision: 'Leaning Hire',
      confidence: 'Moderate',
      rationale: 'The candidate showed credible capability, but some answers still lacked depth, precision, or measurable impact.',
    };
  }

  if (
    averageScore >= 54 &&
    ownership >= 52 &&
    confidence >= 52
  ) {
    return {
      decision: 'Leaning No Hire',
      confidence: 'Moderate',
      rationale: 'The candidate showed some promising signals, but the answers were not consistently strong enough for a confident hire recommendation.',
    };
  }

  return {
    decision: 'No Hire',
    confidence: 'High',
    rationale: 'The candidate did not provide enough ownership, evidence, structure, or business impact to support a positive hiring decision.',
  };
}

function buildPanelSummary(recruiterStyle = 'corporate', role = 'the role', answerScores = []) {
  const avgOwnership = average(answerScores.map((turn) => turn.score.ownership));
  const avgImpact = average(answerScores.map((turn) => turn.score.impact));
  const avgConfidence = average(answerScores.map((turn) => turn.score.confidence));

  return {
    recruiter: avgConfidence >= 70
      ? 'Strong communication and professionalism in the screening conversation.'
      : 'Communication was credible, but delivery would benefit from tighter structure and cleaner proof points.',
    hiringManager: avgOwnership >= 70
      ? `The candidate sounded capable of executing in ${role} with visible ownership.`
      : `Execution proof for ${role} was mixed and would need sharper examples in a next-round interview.`,
    director: avgImpact >= 70 || recruiterStyle === 'executive'
      ? 'There are signs of meaningful business judgment and stakeholder awareness.'
      : 'Strategic impact was not consistently proven strongly enough for a senior decision-maker.',
  };
}

function computeHeuristicMetrics(events = [], options = {}) {
  const turns = splitIntoTurns(events);
  const answerScores = turns
    .map((turn) => ({ ...turn, score: scoreAnswer(turn.candidateAnswer, turn.recruiterPrompt) }))
    .filter((turn) => turn.candidateAnswer);
  const fallbackTranscript = events
    .map((item) => `${String(item.speaker || '').toUpperCase()}: ${String(item.text || '')}`)
    .join('\n');

  if (!answerScores.length) {
    return {
      overallScore: 40,
      clarityScore: 40,
      structureScore: 40,
      relevanceScore: 40,
      confidenceScore: 40,
      executivePresenceScore: 40,
      recruiterReadinessScore: 40,
      hireSignal: 'strong_no',
      recruiterImpression: 'There was not enough usable candidate speech to support a hiring recommendation.',
      recruiterSummary: 'The transcript did not contain enough finalized answers to evaluate reliably.',
      strengths: ['Complete a full live interview session so the system can evaluate actual answers.'],
      weaknesses: ['The session did not capture enough final transcript to score the interview credibly.'],
      improvedAnswer: 'Start with the situation, explain the action you personally took, and end with the measurable result.',
      nextActions: ['Reconnect and complete a full answer.', 'Use a clear STAR structure.', 'Include one measurable result in each example.'],
      transcript: fallbackTranscript,
      fillerWordCount: 0,
      turnBreakdown: [],
      strongestAnswer: null,
      weakestAnswer: null,
      recruiterFollowUps: [],
      hireDecision: decisionFromSignals({ averageScore: 40 }),
      emotionalIntelligence: {
        selfAwareness: 40,
        empathy: 40,
        composure: 40,
        accountability: 40,
        stakeholderSensitivity: 40,
      },
      panelSummary: buildPanelSummary(options.recruiterStyle, options.role, []),
      pressureSummary: 'Not enough answers were captured to evaluate pressure handling.',
      interruptionSummary: 'The live session did not capture enough final answers to judge interruption timing or answer recovery.',
    };
  }

  const avg = (key) => clamp(average(answerScores.map((turn) => turn.score[key])));
  const clarity = avg('clarity');
  const structure = avg('structure');
  const relevance = avg('relevance');
  const confidence = avg('confidence');
  const specificity = avg('specificity');
  const ownership = avg('ownership');
  const impact = avg('impact');
  const executivePresenceScore = clamp((ownership + impact + confidence) / 3);
  const recruiterReadinessScore = clamp((clarity + structure + relevance + confidence + executivePresenceScore) / 5);
  const overall = recruiterReadinessScore;
  const strongestTurn = answerScores.reduce((best, current) => (!best || current.score.confidence + current.score.impact > best.score.confidence + best.score.impact ? current : best), null);
  const weakestTurn = answerScores.reduce((worst, current) => (!worst || current.score.structure + current.score.specificity < worst.score.structure + worst.score.specificity ? current : worst), null);
  const fillerWordCount = answerScores.reduce((sum, turn) => sum + turn.score.fillerCount, 0);
  const weakAnswerCount = answerScores.filter((turn) => turn.score.specificity < 62 || turn.score.impact < 62 || turn.score.ownership < 62).length;
  const interruptionReasons = answerScores
    .filter((turn) => turn.score.interruption.shouldInterrupt)
    .map((turn) => turn.score.interruption.reason)
    .filter(Boolean);

  const strengths = [];
  if (ownership >= 74) strengths.push('You sounded accountable for the work instead of describing it from a distance.');
  if (impact >= 72) strengths.push('You tied several answers to outcomes, which improves recruiter confidence.');
  if (structure >= 72) strengths.push('Your answers were reasonably structured and easier to follow under interview pressure.');
  if (!strengths.length) strengths.push('Your answers stayed generally relevant to the target role.');

  const weaknesses = [];
  if (specificity < 66) weaknesses.push('Several answers still need more concrete detail, examples, or measurable proof.');
  if (structure < 66) weaknesses.push('Your stories need a cleaner beginning, action, and result sequence.');
  if (fillerWordCount >= 4) weaknesses.push('Filler words reduced delivery strength and executive presence.');
  if (!weaknesses.length) weaknesses.push('Push each answer to a sharper business result to become more recruiter-ready.');

  const recruiterFollowUps = [];
  if (ownership < 70) recruiterFollowUps.push('What exactly did you do personally?');
  if (impact < 70) recruiterFollowUps.push('What changed because of your work?');
  if (specificity < 70) recruiterFollowUps.push('Can you give one measurable example?');
  if (interruptionReasons.includes('too_vague')) recruiterFollowUps.push(buildInterruptionPrompt('too_vague'));

  const nextActions = [
    'Practice two answers out loud using a 60-to-90 second STAR structure.',
    'Add one measurable result to each story before the session ends.',
    'Lead with the action you personally took, then close with impact.',
  ];

  const hireSignal = recruiterReadinessScore >= 86 ? 'strong_yes' : recruiterReadinessScore >= 76 ? 'yes' : recruiterReadinessScore >= 64 ? 'mixed' : recruiterReadinessScore >= 52 ? 'no' : 'strong_no';
  const recruiterImpression = hireSignal === 'strong_yes'
    ? 'You sounded like a candidate who has done the work before and can explain it with ownership, clarity, and impact.'
    : hireSignal === 'yes'
      ? 'You created a positive recruiter impression, though a few answers still need sharper specifics or stronger outcomes.'
      : hireSignal === 'mixed'
        ? 'The interview showed promise, but a recruiter would still have concerns about depth, ownership, or measurable impact.'
        : 'A recruiter would likely hesitate because the answers did not consistently prove ownership, judgment, and business impact.';

  const recruiterSummary = `Hire signal: ${hireSignal.replace(/_/g, ' ')}. Candidate clarity ${clarity}/100, structure ${structure}/100, relevance ${relevance}/100, confidence ${confidence}/100. The interview showed ${ownership >= 72 ? 'credible ownership' : 'gaps in ownership evidence'} and ${impact >= 72 ? 'usable impact proof' : 'limited measurable impact proof'}.`;
  const improvedAnswer = 'In that situation, I first clarified the priority and aligned expectations with the people involved. Then I took ownership of the plan, executed the key actions personally, and stayed close to the stakeholders until the issue was resolved. The result was a smoother process, stronger trust, and a measurable improvement for the team.';

  const emotionalIntelligence = {
    selfAwareness: clamp(average(answerScores.map((turn) => turn.score.emotionalIntelligence.selfAwareness))),
    empathy: clamp(average(answerScores.map((turn) => turn.score.emotionalIntelligence.empathy))),
    composure: clamp(average(answerScores.map((turn) => turn.score.emotionalIntelligence.composure))),
    accountability: clamp(average(answerScores.map((turn) => turn.score.emotionalIntelligence.accountability))),
    stakeholderSensitivity: clamp(average(answerScores.map((turn) => turn.score.emotionalIntelligence.stakeholderSensitivity))),
  };

  const pressureSummary = weakAnswerCount >= 3
    ? 'Under pressure, the candidate still showed some composure, but repeated weak answers would likely trigger sharper recruiter follow-ups in a real interview.'
    : 'The candidate handled follow-up pressure reasonably well and did not collapse when pushed for more detail.';
  const interruptionSummary = interruptionReasons.length
    ? `The answer pattern would likely trigger recruiter interruptions for ${[...new Set(interruptionReasons)].join(', ')}.`
    : 'The answer pacing was mostly controlled enough that a strong recruiter would not need to interrupt often.';

  return {
    overallScore: overall,
    clarityScore: clarity,
    structureScore: structure,
    relevanceScore: relevance,
    confidenceScore: confidence,
    executivePresenceScore,
    recruiterReadinessScore,
    hireSignal,
    recruiterImpression,
    recruiterSummary,
    strengths,
    weaknesses,
    improvedAnswer,
    nextActions,
    transcript: fallbackTranscript,
    fillerWordCount,
    strongestAnswer: strongestTurn ? strongestTurn.candidateAnswer : null,
    weakestAnswer: weakestTurn ? weakestTurn.candidateAnswer : null,
    recruiterFollowUps,
    hireDecision: decisionFromSignals({
      averageScore: overall,
      ownership,
      specificity,
      impact,
      confidence,
      weakAnswers: weakAnswerCount,
    }),
    emotionalIntelligence,
    panelSummary: buildPanelSummary(options.recruiterStyle, options.role, answerScores),
    pressureSummary,
    interruptionSummary,
    turnBreakdown: answerScores.map((turn) => ({
      questionId: turn.questionId,
      recruiterPrompt: turn.recruiterPrompt,
      candidateAnswer: turn.candidateAnswer,
      score: turn.score,
    })),
  };
}

async function scoreRealtimeInterview({ role, mode, level, tone, transcript, events, recruiterStyle = 'corporate', pressureLevel = 'medium', followUpStrictness = 'standard', interviewMode = 'single' }) {
  const heuristic = computeHeuristicMetrics(events || [], { recruiterStyle, role, interviewMode });
  const prompt = [
    'You are a senior interview assessor producing a recruiter-grade voice interview evaluation.',
    'Return strict JSON only.',
    'Required keys: overallScore, clarityScore, structureScore, relevanceScore, confidenceScore, executivePresenceScore, recruiterReadinessScore, hireSignal, recruiterImpression, recruiterSummary, strengths, weaknesses, improvedAnswer, nextActions, strongestAnswer, weakestAnswer, recruiterFollowUps, hireDecision, emotionalIntelligence, panelSummary, pressureSummary, interruptionSummary.',
    'Scores must be integers from 0 to 100.',
    'hireSignal must be one of: strong_no, no, mixed, yes, strong_yes.',
    'hireDecision must include decision, confidence, rationale.',
    `Role: ${role || 'Target role'}`,
    `Mode: ${mode || 'behavioral'}`,
    `Level: ${level || 'mid'}`,
    `Tone: ${tone || 'realistic'}`,
    `Recruiter style: ${recruiterStyle}`,
    `Pressure level: ${pressureLevel}`,
    `Follow-up strictness: ${followUpStrictness}`,
    `Interview mode: ${interviewMode}`,
    'Evaluate the transcript like a recruiter deciding whether to move the candidate forward. Judge clarity, STAR structure, ownership, specificity, role relevance, executive presence, emotional intelligence, and how convincing the candidate sounds on follow-up.',
    'Use the transcript below:',
    transcript || heuristic.transcript || '(empty transcript)',
  ].join('\n');

  try {
    const aiText = await askOpenAI(prompt, { maxOutputTokens: 1800, temperature: 0.2, timeoutMs: 20000 });
    const parsed = safeJson(aiText);
    if (parsed) {
      return {
        overallScore: clamp(parsed.overallScore, 0, 100) || heuristic.overallScore,
        clarityScore: clamp(parsed.clarityScore, 0, 100) || heuristic.clarityScore,
        structureScore: clamp(parsed.structureScore, 0, 100) || heuristic.structureScore,
        relevanceScore: clamp(parsed.relevanceScore, 0, 100) || heuristic.relevanceScore,
        confidenceScore: clamp(parsed.confidenceScore, 0, 100) || heuristic.confidenceScore,
        executivePresenceScore: clamp(parsed.executivePresenceScore, 0, 100) || heuristic.executivePresenceScore,
        recruiterReadinessScore: clamp(parsed.recruiterReadinessScore, 0, 100) || heuristic.recruiterReadinessScore,
        hireSignal: ['strong_no', 'no', 'mixed', 'yes', 'strong_yes'].includes(String(parsed.hireSignal || '')) ? parsed.hireSignal : heuristic.hireSignal,
        recruiterImpression: String(parsed.recruiterImpression || '').trim() || heuristic.recruiterImpression,
        recruiterSummary: String(parsed.recruiterSummary || '').trim() || heuristic.recruiterSummary,
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths.slice(0, 4) : heuristic.strengths,
        weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length ? parsed.weaknesses.slice(0, 4) : heuristic.weaknesses,
        improvedAnswer: String(parsed.improvedAnswer || '').trim() || heuristic.improvedAnswer,
        nextActions: Array.isArray(parsed.nextActions) && parsed.nextActions.length ? parsed.nextActions.slice(0, 4) : heuristic.nextActions,
        strongestAnswer: String(parsed.strongestAnswer || '').trim() || heuristic.strongestAnswer,
        weakestAnswer: String(parsed.weakestAnswer || '').trim() || heuristic.weakestAnswer,
        recruiterFollowUps: Array.isArray(parsed.recruiterFollowUps) && parsed.recruiterFollowUps.length ? parsed.recruiterFollowUps.slice(0, 4) : heuristic.recruiterFollowUps,
        hireDecision: parsed.hireDecision && typeof parsed.hireDecision === 'object' ? {
          decision: parsed.hireDecision.decision || heuristic.hireDecision.decision,
          confidence: parsed.hireDecision.confidence || heuristic.hireDecision.confidence,
          rationale: parsed.hireDecision.rationale || heuristic.hireDecision.rationale,
        } : heuristic.hireDecision,
        emotionalIntelligence: parsed.emotionalIntelligence && typeof parsed.emotionalIntelligence === 'object' ? {
          selfAwareness: clamp(parsed.emotionalIntelligence.selfAwareness, 0, 100) || heuristic.emotionalIntelligence.selfAwareness,
          empathy: clamp(parsed.emotionalIntelligence.empathy, 0, 100) || heuristic.emotionalIntelligence.empathy,
          composure: clamp(parsed.emotionalIntelligence.composure, 0, 100) || heuristic.emotionalIntelligence.composure,
          accountability: clamp(parsed.emotionalIntelligence.accountability, 0, 100) || heuristic.emotionalIntelligence.accountability,
          stakeholderSensitivity: clamp(parsed.emotionalIntelligence.stakeholderSensitivity, 0, 100) || heuristic.emotionalIntelligence.stakeholderSensitivity,
        } : heuristic.emotionalIntelligence,
        panelSummary: parsed.panelSummary && typeof parsed.panelSummary === 'object' ? {
          recruiter: parsed.panelSummary.recruiter || heuristic.panelSummary.recruiter,
          hiringManager: parsed.panelSummary.hiringManager || heuristic.panelSummary.hiringManager,
          director: parsed.panelSummary.director || heuristic.panelSummary.director,
        } : heuristic.panelSummary,
        pressureSummary: String(parsed.pressureSummary || '').trim() || heuristic.pressureSummary,
        interruptionSummary: String(parsed.interruptionSummary || '').trim() || heuristic.interruptionSummary,
        transcript: heuristic.transcript,
        fillerWordCount: heuristic.fillerWordCount,
        turnBreakdown: heuristic.turnBreakdown,
      };
    }
  } catch {
    // fall back to deterministic heuristic scoring
  }

  return heuristic;
}

module.exports = { scoreRealtimeInterview };
