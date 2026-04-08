#!/usr/bin/env node
/**
 * normalize-statuses.mjs — Clean non-canonical states in applications.md
 *
 * Maps all non-canonical statuses to canonical ones per states.yml:
 *   Evaluated, Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP
 *
 * Also strips markdown bold (**) and dates from the status field.
 *
 * Run: node normalize-statuses.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APPS_FILE = existsSync(join(ROOT, 'data/applications.md'))
  ? join(ROOT, 'data/applications.md')
  : join(ROOT, 'applications.md');
const DRY_RUN = process.argv.includes('--dry-run');

function normalizeStatus(raw) {
  let s = raw.replace(/\*\*/g, '').trim();
  const lower = s.toLowerCase();

  if (/^(duplicado|dup)\b/i.test(s)) return { status: 'Discarded', moveToNotes: raw.trim() };
  if (/^(cerrada|cancelada|descartad[ao])$/i.test(s)) return { status: 'Discarded' };
  if (/^rechazad[ao]$/i.test(s)) return { status: 'Rejected' };
  if (/^rechazad[ao]\s+\d{4}/i.test(s)) return { status: 'Rejected' };
  if (/^aplicado\s+\d{4}/i.test(s)) return { status: 'Applied' };
  if (/^(condicional|hold|evaluar|verificar)$/i.test(s)) return { status: 'Evaluated' };
  if (/^monitor$/i.test(s)) return { status: 'SKIP' };
  if (/geo.?blocker/i.test(s)) return { status: 'SKIP' };
  if (/^repost/i.test(s)) return { status: 'Discarded', moveToNotes: raw.trim() };
  if (s === '—' || s === '-' || s === '') return { status: 'Discarded' };

  const canonical = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];
  for (const c of canonical) {
    if (lower === c.toLowerCase()) return { status: c };
  }

  const aliases = {
    'evaluada': 'Evaluated',
    'aplicado': 'Applied', 'enviada': 'Applied', 'aplicada': 'Applied', 'sent': 'Applied',
    'respondido': 'Responded',
    'entrevista': 'Interview',
    'oferta': 'Offer',
    'no aplicar': 'SKIP', 'no_aplicar': 'SKIP', 'skip': 'SKIP',
  };
  if (aliases[lower]) return { status: aliases[lower] };

  return { status: null, unknown: true };
}

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to normalize.');
  process.exit(0);
}
const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');

let changes = 0;
const unknowns = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|')) continue;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  if (parts[1] === '#' || parts[1] === '---' || parts[1] === '') continue;
  const num = parseInt(parts[1]);
  if (isNaN(num)) continue;

  const rawStatus = parts[6];
  const result = normalizeStatus(rawStatus);

  if (result.unknown) { unknowns.push({ num, rawStatus, line: i + 1 }); continue; }
  if (result.status === rawStatus) continue;

  parts[6] = result.status;
  if (result.moveToNotes) {
    const existing = parts[9] || '';
    if (!existing.includes(result.moveToNotes)) {
      parts[9] = result.moveToNotes + (existing ? '. ' + existing : '');
    }
  }
  if (parts[5]) parts[5] = parts[5].replace(/\*\*/g, '');

  lines[i] = '| ' + parts.slice(1, -1).join(' | ') + ' |';
  changes++;
  console.log(`#${num}: "${rawStatus}" → "${result.status}"`);
}

if (unknowns.length > 0) {
  console.log(`\n⚠️  ${unknowns.length} unknown statuses:`);
  for (const u of unknowns) console.log(`  #${u.num} (line ${u.line}): "${u.rawStatus}"`);
}

console.log(`\n📊 ${changes} statuses normalized`);

if (!DRY_RUN && changes > 0) {
  copyFileSync(APPS_FILE, APPS_FILE + '.bak');
  writeFileSync(APPS_FILE, lines.join('\n'));
  console.log('✅ Written to applications.md (backup: applications.md.bak)');
} else if (DRY_RUN) {
  console.log('(dry-run — no changes written)');
} else {
  console.log('✅ No changes needed');
}
