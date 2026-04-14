/**
 * lib/statuses.mjs — Shared status normalization for career-copilot
 *
 * Single source of truth for canonical states and aliases.
 * Used by: merge-tracker, verify-pipeline, normalize-statuses, dedup-tracker, analyze-patterns
 */

export const CANONICAL_STATES = [
  'Evaluated', 'Applied', 'Responded', 'Interview',
  'Offer', 'Rejected', 'Discarded', 'SKIP',
];

const ALIASES = {
  // Spanish → English
  'evaluada': 'Evaluated', 'condicional': 'Evaluated', 'hold': 'Evaluated', 'evaluar': 'Evaluated', 'verificar': 'Evaluated',
  'aplicado': 'Applied', 'enviada': 'Applied', 'aplicada': 'Applied', 'applied': 'Applied', 'sent': 'Applied',
  'respondido': 'Responded',
  'entrevista': 'Interview',
  'oferta': 'Offer',
  'rechazado': 'Rejected', 'rechazada': 'Rejected',
  'descartado': 'Discarded', 'descartada': 'Discarded', 'cerrada': 'Discarded', 'cancelada': 'Discarded',
  'no aplicar': 'SKIP', 'no_aplicar': 'SKIP', 'skip': 'SKIP', 'monitor': 'SKIP',
  'geo blocker': 'SKIP',
};

// Status advancement order (higher = more advanced in pipeline)
export const STATUS_RANK = {
  'skip': 0, 'discarded': 0,
  'rejected': 1,
  'evaluated': 2,
  'applied': 3,
  'responded': 4,
  'interview': 5,
  'offer': 6,
  // Spanish aliases
  'no_aplicar': 0, 'no aplicar': 0, 'descartado': 0, 'descartada': 0,
  'rechazado': 1, 'rechazada': 1,
  'evaluada': 2,
  'aplicado': 3,
  'respondido': 4,
  'entrevista': 5,
  'oferta': 6,
};

/**
 * Validate and normalize a status string to its canonical form.
 * Strips markdown bold and trailing dates.
 * @param {string} status - Raw status string
 * @returns {string} Canonical status
 */
export function validateStatus(status) {
  const clean = status.replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const lower = clean.toLowerCase();

  for (const valid of CANONICAL_STATES) {
    if (valid.toLowerCase() === lower) return valid;
  }

  if (ALIASES[lower]) return ALIASES[lower];

  // DUPLICADO/Repost → Discarded
  if (/^(duplicado|dup|repost)/i.test(lower)) return 'Discarded';

  console.warn(`⚠️  Non-canonical status "${status}" → defaulting to "Evaluated"`);
  return 'Evaluated';
}

/**
 * Check if a status string is canonical (case-insensitive).
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export function isCanonical(status) {
  const clean = status.replace(/\*\*/g, '').trim().toLowerCase();
  const statusOnly = clean.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  return CANONICAL_STATES.some(s => s.toLowerCase() === statusOnly) || ALIASES[statusOnly] !== undefined;
}

/**
 * Normalize a company name for dedup comparisons.
 * Applies NFD normalization to handle accented characters.
 * @param {string} name - Company name
 * @returns {string} Normalized name
 */
export function normalizeCompany(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse a score string, validating 0-5 range.
 * @param {string} s - Score string (e.g., "4.2/5")
 * @returns {number} Parsed score (0 if invalid)
 */
export function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)\/5/);
  if (!m) {
    const fallback = s.replace(/\*\*/g, '').match(/([\d.]+)/);
    return fallback ? Math.min(parseFloat(fallback[1]), 5) : 0;
  }
  const val = parseFloat(m[1]);
  return (val >= 0 && val <= 5) ? val : 0;
}
