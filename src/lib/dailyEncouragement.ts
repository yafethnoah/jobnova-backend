
const visitCounts = new Map<string, number>();
const usedQuotes = new Set<string>();

const openings = [
  'Small progress still counts, and today can move you closer to the work you want.',
  'Your experience still matters, even before the next employer sees its full value.',
  'A clear next step can create more momentum than a perfect long-term plan.',
  'Steady effort builds results, even when the path feels slower than expected.',
  'Every thoughtful application strengthens your direction, not just your chances.',
  'You do not need to prove everything at once; you only need to keep moving with purpose.',
  'The right opportunity can open quickly after a season of quiet preparation.',
  'What feels difficult today can still become the foundation of your next success.',
  'Your path is allowed to be gradual, strategic, and still deeply successful.',
  'Confidence grows through action, and each visit here is one more step forward.',
  'Your work has value, and the right presentation can help others recognize it faster.',
  'Consistency creates visibility, and visibility creates opportunity.',
  'A strong future is often built through calm decisions repeated many times.',
  'You are building more than documents here; you are building readiness.',
  'The next role does not define your worth, but it can benefit from everything you bring.',
  'Progress can be quiet and still be powerful.',
  'A practical plan can turn uncertainty into movement.',
  'Each refinement makes your story easier for the right employer to understand.',
  'Resilience becomes visible when you keep showing up with intention.',
  'Hope becomes stronger when it is paired with action.'
];

const closings = [
  'Keep one practical goal in focus and let the rest build from there.',
  'Trust the work you are doing today to support the opportunity that is coming next.',
  'Your next step does not need to be dramatic to be important.',
  'Let this screen help you turn effort into visible progress.',
  'Give this visit a purpose, and let that purpose carry into the rest of your day.',
  'The right fit often appears after consistent preparation, not perfect timing.',
  'Keep shaping your story with clarity, strength, and patience.',
  'Even one focused improvement today can change tomorrow’s outcome.',
  'You are allowed to move with patience and still expect meaningful progress.',
  'Use this moment to strengthen the version of your future you want to reach.',
  'A better result can begin with one stronger choice on this screen.',
  'Stay steady; the path becomes clearer as you continue.',
  'Your preparation is not wasted, even when results take time to appear.',
  'Let confidence come from preparation, not pressure.',
  'Keep choosing progress over discouragement.',
  'What you build here can support a more stable tomorrow.',
  'The next yes often comes after many quiet improvements like these.',
  'Treat this step as part of a larger success that is still unfolding.',
  'The effort you invest here is helping opportunity recognize you more clearly.',
  'Keep going with calm focus; your direction is becoming stronger.'
];

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateDailyEncouragement(screenKey: string): string {
  const count = (visitCounts.get(screenKey) || 0) + 1;
  visitCounts.set(screenKey, count);

  const baseHash = hashCode(`${screenKey}:${count}`);
  for (let i = 0; i < openings.length * closings.length; i += 1) {
    const opening = openings[(baseHash + i) % openings.length];
    const closing = closings[(Math.floor(baseHash / 7) + i) % closings.length];
    const quote = `${opening} ${closing}`;
    if (!usedQuotes.has(quote)) {
      usedQuotes.add(quote);
      return quote;
    }
  }

  return `${openings[baseHash % openings.length]} ${closings[(baseHash + count) % closings.length]}`;
}
