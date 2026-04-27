/**
 * lib/statuses.mjs — Re-exports from lib/status.mjs + utility helpers
 *
 * Status normalization now lives in lib/status.mjs (reads templates/states.yml).
 * This module re-exports those functions and adds normalizeCompany / parseScore.
 */

import {
  getCanonicalStatuses,
  normalizeStatus,
  isCanonical as _isCanonical,
  STATUS_RANK,
} from './status.mjs';

export { STATUS_RANK };

export const CANONICAL_STATES = getCanonicalStatuses();

/**
 * Validate and normalize a status string to its canonical form.
 * @param {string} status - Raw status string
 * @returns {string} Canonical status (defaults to 'Evaluated' if unrecognized)
 */
export function validateStatus(status) {
  const result = normalizeStatus(status);
  if (result) return result;
  console.warn(`⚠️  Non-canonical status "${status}" → defaulting to "Evaluated"`);
  return 'Evaluated';
}

/**
 * Check if a status string is canonical (case-insensitive).
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export function isCanonical(status) {
  return _isCanonical(status);
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
