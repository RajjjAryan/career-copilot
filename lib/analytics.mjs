import { normalizeStatus } from './status.mjs';
import { isValidScore, parseScore } from './parsing.mjs';

export function analyzeApplications(entries) {
  const canonical = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];
  const funnel = Object.fromEntries(canonical.map(status => [status, 0]));
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const entry of entries) {
    const status = normalizeStatus(entry.status) || 'Evaluated';
    funnel[status] = (funnel[status] || 0) + 1;

    if (isValidScore(entry.score) && !['N/A', 'DUP'].includes(String(entry.score).trim())) {
      const score = parseScore(entry.score);
      scoreTotal += score;
      scoreCount++;
    }
  }

  const responded = funnel.Responded + funnel.Interview + funnel.Offer;
  const responseDenominator = funnel.Applied + funnel.Responded + funnel.Interview + funnel.Offer + funnel.Rejected;

  return {
    funnel,
    responseRate: responseDenominator === 0 ? 0 : Number((responded / responseDenominator).toFixed(4)),
    offerRate: responseDenominator === 0 ? 0 : Number((funnel.Offer / responseDenominator).toFixed(4)),
    averageScore: scoreCount === 0 ? 0 : Number((scoreTotal / scoreCount).toFixed(2)),
  };
}
