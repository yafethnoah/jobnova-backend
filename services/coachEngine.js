const { askOpenAI } = require('../lib/openai');

function fallbackCoachSession(payload = {}) {
  const goal = payload.goal || 'find a stable job';
  const phase = payload.phase || 'job-search';
  return {
    phase,
    goal,
    diagnosis: `Your strongest path right now is to reduce uncertainty and turn ${goal} into a visible weekly system.`,
    priorities: [
      'Choose one target role and align all resume and interview work to that role for the next 7 days.',
      'Use one high-quality application plus one strong follow-up instead of spraying low-fidelity applications.',
      'Track evidence: ATS score, recruiter replies, interview conversion, and weekly momentum.'
    ],
    encouragement: 'Progress becomes easier when each next step is visible and small enough to complete today.',
    nextAction: 'Complete one tailored application, one networking message, and one interview answer practice before the day ends.'
  };
}

async function createCoachSession(payload = {}) {
  const fallback = fallbackCoachSession(payload);
  const prompt = [
    'You are JobNova\'s AI career coach for newcomers and job seekers.',
    'Return strict JSON only with keys phase, goal, diagnosis, priorities, encouragement, nextAction.',
    'Keep the tone warm, professional, and direct. No fluff. Make the next action immediately doable.',
    `Input JSON: ${JSON.stringify(payload).slice(0, 5000)}`
  ].join('\n');

  try {
    const raw = await askOpenAI(prompt, { maxOutputTokens: 900, temperature: 0.5 });
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      phase: parsed.phase || fallback.phase,
      goal: parsed.goal || fallback.goal,
      diagnosis: parsed.diagnosis ? String(parsed.diagnosis) : fallback.diagnosis,
      priorities: Array.isArray(parsed.priorities) && parsed.priorities.length ? parsed.priorities.slice(0, 4).map(String) : fallback.priorities,
      encouragement: parsed.encouragement ? String(parsed.encouragement) : fallback.encouragement,
      nextAction: parsed.nextAction ? String(parsed.nextAction) : fallback.nextAction
    };
  } catch {
    return fallback;
  }
}

module.exports = { createCoachSession, fallbackCoachSession };
