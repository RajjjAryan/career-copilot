export function parseScore(s) {
  const normalized = String(s ?? '').replace(/\*\*/g, '');
  const m = normalized.match(/(^|[^\d.-])([0-5](?:\.\d)?)\s*\/\s*5\b/);
  if (!m) return 0;

  const score = Number(m[2]);
  return Number.isFinite(score) && score >= 0 && score <= 5 ? score : 0;
}
