/**
 * lib/statuses.mjs — Re-exports from lib/status.mjs + utility helpers
 *
 * Status normalization now lives in lib/status.mjs (reads templates/states.yml).
 * This module re-exports those functions and adds normalizeCompany.
 */

import { parseScore } from './score.mjs';
import {
  getCanonicalStatuses,
  normalizeStatus,
  isCanonical as _isCanonical,
  STATUS_RANK,
} from './status.mjs';

export { parseScore, STATUS_RANK };

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
