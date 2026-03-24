const { askOpenAI } = require('../lib/openai');

function fallbackMarketInsights(payload = {}) {
  const role = payload.role || 'Target role';
  const city = payload.location || 'Ontario';
  return {
    role,
    location: city,
    demandLevel: 'medium',
    salaryBand: '$55,000–$75,000',
    highSignalSkills: ['stakeholder communication', 'Excel or reporting fluency', 'ATS-aligned resume language', 'customer or employee support systems'],
    marketSignals: [
      `${role} hiring tends to reward candidates who show direct evidence of execution, not only responsibilities.`,
      `Employers in ${city} often value local tools knowledge, communication clarity, and role-specific keyword alignment.`,
      'Candidates who tailor each application and follow up professionally usually outperform volume-only strategies.'
    ],
    nextMoves: [
      'Mirror the target role title and core tools more clearly in your resume headline and summary.',
      'Add two quantified outcomes to your recent experience bullets.',
      'Use your tracker to review which applications generate interviews and double down on that pattern.'
    ]
  };
}

async function getMarketInsights(payload = {}) {
  const fallback = fallbackMarketInsights(payload);
  const prompt = [
    'You are a labour-market intelligence assistant for a Canadian career app.',
    'Return strict JSON only with keys role, location, demandLevel, salaryBand, highSignalSkills, marketSignals, nextMoves.',
    'Do not claim real-time certainty. Give practical directional guidance suitable for a job seeker.',
    `Input JSON: ${JSON.stringify(payload).slice(0, 4000)}`
  ].join('\n');

  try {
    const raw = await askOpenAI(prompt, { maxOutputTokens: 1000, temperature: 0.3 });
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      role: parsed.role || fallback.role,
      location: parsed.location || fallback.location,
      demandLevel: ['low', 'medium', 'high'].includes(String(parsed.demandLevel || '').toLowerCase()) ? String(parsed.demandLevel).toLowerCase() : fallback.demandLevel,
      salaryBand: parsed.salaryBand ? String(parsed.salaryBand) : fallback.salaryBand,
      highSignalSkills: Array.isArray(parsed.highSignalSkills) && parsed.highSignalSkills.length ? parsed.highSignalSkills.slice(0, 6).map(String) : fallback.highSignalSkills,
      marketSignals: Array.isArray(parsed.marketSignals) && parsed.marketSignals.length ? parsed.marketSignals.slice(0, 4).map(String) : fallback.marketSignals,
      nextMoves: Array.isArray(parsed.nextMoves) && parsed.nextMoves.length ? parsed.nextMoves.slice(0, 4).map(String) : fallback.nextMoves
    };
  } catch {
    return fallback;
  }
}

module.exports = { getMarketInsights, fallbackMarketInsights };
