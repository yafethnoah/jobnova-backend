const { askOpenAI } = require('../lib/openai');

function fallbackGrowthPlan(payload = {}) {
  const role = payload.role || payload.targetRole || 'your target role';
  const strengths = Array.isArray(payload.strengths) && payload.strengths.length
    ? payload.strengths
    : ['clear motivation', 'relevant transferable experience'];
  const risks = Array.isArray(payload.risks) && payload.risks.length
    ? payload.risks
    : ['limited local proof points', 'inconsistent follow-up rhythm'];
  return {
    focusRole: role,
    first90Days: [
      'Build trust quickly by documenting responsibilities, deadlines, and stakeholder expectations during week one.',
      'Create two visible quick wins in the first 30 days by improving accuracy, response time, or team coordination.',
      'Schedule one feedback conversation with your manager before day 45 and convert it into a written improvement plan.',
      'Track measurable contributions weekly so performance reviews and promotion conversations have evidence.'
    ],
    nextYearRoadmap: [
      'Strengthen core systems knowledge and document processes others can reuse.',
      'Volunteer for one cross-functional initiative that increases visibility beyond your immediate team.',
      'Build a promotion case using outcomes, not effort alone.',
      'Refresh your resume and LinkedIn quarterly to reflect new impact.'
    ],
    riskWatch: risks,
    strengthsToAmplify: strengths,
    managerConversationPrompts: [
      'What would make me a strong performer in the next 90 days?',
      'Which outcomes matter most for this role over the next quarter?',
      'Where could I create value fastest without stepping outside role expectations?'
    ]
  };
}

function fallbackFinancialPlan(payload = {}) {
  const salary = Number(payload.monthlyNetIncome || 0);
  const essentials = salary ? Math.round(salary * 0.55) : 2200;
  const savings = salary ? Math.round(salary * 0.15) : 600;
  const growth = salary ? Math.round(salary * 0.1) : 350;
  const flexibility = Math.max(salary - essentials - savings - growth, 450);
  return {
    monthlyNetIncome: salary || null,
    buckets: [
      { label: 'Essentials', amount: essentials, guidance: 'Rent, food, transit, phone, insurance, and other fixed commitments.' },
      { label: 'Savings buffer', amount: savings, guidance: 'Protect at least one emergency fund deposit every month, even if small.' },
      { label: 'Career growth', amount: growth, guidance: 'Reserve funds for courses, credential fees, networking events, or tools.' },
      { label: 'Flexible spending', amount: flexibility, guidance: 'Use the remainder intentionally so lifestyle growth does not erase progress.' }
    ],
    actions: [
      'Automate savings the day income lands so progress does not depend on willpower.',
      'Treat credential and learning costs as career investments, not random expenses.',
      'Review recurring expenses every 30 days and cut one low-value cost at a time.'
    ],
    warning: salary && salary < 2500
      ? 'Income appears tight relative to common living costs. Prioritize emergency savings and low-risk upskilling first.'
      : 'Use steady contributions and visible progress markers to keep financial stress from disrupting your job search or new job performance.'
  };
}

async function generateGrowthPlan(payload = {}) {
  const fallback = fallbackGrowthPlan(payload);
  const prompt = [
    'You are a career growth strategist for a newcomer-focused career platform.',
    'Return strict JSON only with keys focusRole, first90Days, nextYearRoadmap, riskWatch, strengthsToAmplify, managerConversationPrompts.',
    'Each array must contain concise strings. Do not invent impossible claims. Keep recommendations practical and professional.',
    `Input JSON: ${JSON.stringify(payload).slice(0, 5000)}`
  ].join('\n');

  try {
    const raw = await askOpenAI(prompt, { maxOutputTokens: 1200, temperature: 0.4 });
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      focusRole: parsed.focusRole || fallback.focusRole,
      first90Days: Array.isArray(parsed.first90Days) && parsed.first90Days.length ? parsed.first90Days.slice(0, 6) : fallback.first90Days,
      nextYearRoadmap: Array.isArray(parsed.nextYearRoadmap) && parsed.nextYearRoadmap.length ? parsed.nextYearRoadmap.slice(0, 6) : fallback.nextYearRoadmap,
      riskWatch: Array.isArray(parsed.riskWatch) && parsed.riskWatch.length ? parsed.riskWatch.slice(0, 5) : fallback.riskWatch,
      strengthsToAmplify: Array.isArray(parsed.strengthsToAmplify) && parsed.strengthsToAmplify.length ? parsed.strengthsToAmplify.slice(0, 5) : fallback.strengthsToAmplify,
      managerConversationPrompts: Array.isArray(parsed.managerConversationPrompts) && parsed.managerConversationPrompts.length ? parsed.managerConversationPrompts.slice(0, 5) : fallback.managerConversationPrompts
    };
  } catch {
    return fallback;
  }
}

async function generateFinancialPlan(payload = {}) {
  const fallback = fallbackFinancialPlan(payload);
  const prompt = [
    'You are a financial wellness coach for job seekers and early-career professionals in Canada.',
    'Return strict JSON only with keys monthlyNetIncome, buckets, actions, warning.',
    'buckets must be an array of objects with label, amount, guidance.',
    'Keep the plan conservative, supportive, and practical.',
    `Input JSON: ${JSON.stringify(payload).slice(0, 5000)}`
  ].join('\n');

  try {
    const raw = await askOpenAI(prompt, { maxOutputTokens: 1200, temperature: 0.3 });
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      monthlyNetIncome: Number.isFinite(Number(parsed.monthlyNetIncome)) ? Number(parsed.monthlyNetIncome) : fallback.monthlyNetIncome,
      buckets: Array.isArray(parsed.buckets) && parsed.buckets.length
        ? parsed.buckets.slice(0, 6).map((item) => ({
            label: String(item.label || 'Bucket'),
            amount: Number(item.amount || 0),
            guidance: String(item.guidance || '')
          }))
        : fallback.buckets,
      actions: Array.isArray(parsed.actions) && parsed.actions.length ? parsed.actions.slice(0, 5).map(String) : fallback.actions,
      warning: parsed.warning ? String(parsed.warning) : fallback.warning
    };
  } catch {
    return fallback;
  }
}

module.exports = { generateGrowthPlan, generateFinancialPlan, fallbackGrowthPlan, fallbackFinancialPlan };
