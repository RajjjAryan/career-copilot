/**
 * lib/status.mjs — Shared status normalization for career-copilot
 *
 * Single source of truth: reads canonical states from templates/states.yml.
 * Used by: merge-tracker, verify-pipeline, normalize-statuses, dedup-tracker, analyze-patterns
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATES_FILE = join(__dirname, '..', 'templates', 'states.yml');

// Parse canonical state labels from templates/states.yml
function loadCanonicalStates() {
  const content = readFileSync(STATES_FILE, 'utf-8');
  const labels = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*label:\s*(.+)/);
    if (match) labels.push(match[1].trim());
  }
  return labels;
}

const CANONICAL = loadCanonicalStates();

// Comprehensive alias map: lowercase alias → canonical form
const ALIASES = {
  // Spanish → English
  'evaluada': 'Evaluated',
  'condicional': 'Evaluated',
  'hold': 'Evaluated',
  'evaluar': 'Evaluated',
  'verificar': 'Evaluated',
  'aplicado': 'Applied',
  'enviada': 'Applied',
  'aplicada': 'Applied',
  'applied': 'Applied',
  'sent': 'Applied',
  'respondido': 'Responded',
  'entrevista': 'Interview',
  'oferta': 'Offer',
  'rechazado': 'Rejected',
  'rechazada': 'Rejected',
  'descartado': 'Discarded',
  'descartada': 'Discarded',
  'cerrada': 'Discarded',
  'cancelada': 'Discarded',
  'no aplicar': 'SKIP',
  'no_aplicar': 'SKIP',
  'skip': 'SKIP',
  'monitor': 'SKIP',
  'geo blocker': 'SKIP',
};

// Rank for each canonical status (higher = more advanced in pipeline)
const RANK_BY_CANONICAL = {
  'SKIP': 0, 'Discarded': 0,
  'Rejected': 1,
  'Evaluated': 2,
  'Applied': 3,
  'Responded': 4,
  'Interview': 5,
  'Offer': 6,
};

/** Status advancement order — keys are lowercase. */
export const STATUS_RANK = Object.fromEntries([
  ...CANONICAL.map(s => [s.toLowerCase(), RANK_BY_CANONICAL[s] ?? 0]),
  ...Object.entries(ALIASES).map(([alias, canonical]) => [alias, RANK_BY_CANONICAL[canonical] ?? 0]),
]);

/**
 * Get all canonical status labels.
 * @returns {string[]} e.g. ['Evaluated', 'Applied', ...]
 */
export function getCanonicalStatuses() {
  return [...CANONICAL];
}

/**
 * Normalize a status string to its canonical form.
 * Handles: bold (**text**), trailing dates, Spanish aliases, case variants.
 * @param {string} raw - Raw status text from tracker
 * @returns {string|null} Canonical status or null if unrecognized
 */
export function normalizeStatus(raw) {
  if (!raw) return null;

  // Strip markdown bold and trailing dates
  const clean = raw.replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  if (!clean || clean === '\u2014' || clean === '-') return 'Discarded';

  const lower = clean.toLowerCase();

  // Exact canonical match (case-insensitive)
  for (const c of CANONICAL) {
    if (c.toLowerCase() === lower) return c;
  }

  // Alias lookup
  if (ALIASES[lower]) return ALIASES[lower];

  // Regex-based patterns
  if (/^(duplicado|dup\b|repost)/i.test(lower)) return 'Discarded';
  if (/^aplicado\s+\d{4}/i.test(clean)) return 'Applied';
  if (/^rechazad[oa]\s+\d{4}/i.test(clean)) return 'Rejected';
  if (/geo.?blocker/i.test(clean)) return 'SKIP';

  return null;
}

/**
 * Check if a status is canonical (case-insensitive).
 * Returns true for both canonical values and known aliases.
 * @param {string} status
 * @returns {boolean}
 */
export function isCanonical(status) {
  return normalizeStatus(status) !== null;
}
