/**
 * lib/aliases.mjs — Re-exports alias map from lib/status.mjs
 *
 * Kept for backward compatibility. The canonical alias map now lives in lib/status.mjs.
 */

import { normalizeStatus, getCanonicalStatuses } from './status.mjs';

// Build the ALIASES object by testing known aliases against normalizeStatus
// This keeps the same shape for consumers that import { ALIASES }
const ALIAS_KEYS = [
  'evaluada', 'condicional', 'hold', 'evaluar', 'verificar',
  'aplicado', 'enviada', 'aplicada', 'applied', 'sent',
  'respondido',
  'entrevista',
  'oferta',
  'rechazado', 'rechazada',
  'descartado', 'descartada', 'cerrada', 'cancelada',
  'no aplicar', 'no_aplicar', 'monitor', 'geo blocker',
];

export const ALIASES = Object.fromEntries(
  ALIAS_KEYS.map(k => [k, normalizeStatus(k)]).filter(([, v]) => v !== null)
);
