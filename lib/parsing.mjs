/**
 * Shared parsing helpers for tracker, analytics, merge, and dedup scripts.
 */

export function stripDiacritics(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeCompany(name = '') {
  return stripDiacritics(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeRole(role = '') {
  const value = stripDiacritics(role)
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9 /+-]/g, ' ')
    .replace(/[+/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    value,
    tokens: value ? value.split(/\s+/).filter(token => token.length > 1) : [],
  };
}

export function roleFuzzyMatch(a, b) {
  const left = normalizeRole(a);
  const right = normalizeRole(b);

  if (!left.value || !right.value) return false;
  if (left.value === right.value) return true;

  if (left.tokens.length <= 2 || right.tokens.length <= 2) {
    return false;
  }

  const overlap = left.tokens.filter(token =>
    right.tokens.some(other => other.includes(token) || token.includes(other))
  );
  return overlap.length >= 2;
}

export function isValidScore(score) {
  const clean = String(score ?? '').replace(/\*\*/g, '').trim();
  if (clean === 'N/A' || clean === 'DUP') return true;
  const match = clean.match(/^(\d+(?:\.\d{1,2})?)\s*\/\s*5$/);
  if (!match) return false;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 && value <= 5;
}

export function parseScore(score) {
  if (!isValidScore(score)) return 0;
  const clean = String(score ?? '').replace(/\*\*/g, '').trim();
  if (clean === 'N/A' || clean === 'DUP') return 0;
  return Number(clean.match(/^(\d+(?:\.\d{1,2})?)\s*\/\s*5$/)[1]);
}

export function parseAppLine(line) {
  if (!line || !line.startsWith('|') || line.includes('---')) return null;

  const parts = line.split('|').map(part => part.trim());
  if (parts.length < 9) return null;

  const num = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(num) || num <= 0) return null;

  return {
    num,
    date: parts[2],
    company: parts[3],
    role: parts[4],
    score: parts[5],
    status: parts[6],
    pdf: parts[7],
    report: parts[8],
    notes: parts[9] || '',
    raw: line,
  };
}

export function parseTrackerContent(content) {
  return String(content ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(parseAppLine)
    .filter(Boolean);
}
