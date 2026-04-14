#!/usr/bin/env node
/**
 * merge-tracker.mjs — Merge batch tracker additions into applications.md
 *
 * Handles multiple TSV formats:
 * - 9-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport\tnotes
 * - 8-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport (no notes)
 * - Pipe-delimited (markdown table row): | col | col | ... |
 *
 * Dedup: company normalized + role fuzzy match + report number match
 * If duplicate with higher score → update in-place, update report link
 * Validates status against states.yml (rejects non-canonical, logs warning)
 *
 * Run: node career-copilot/merge-tracker.mjs [--dry-run] [--verify]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync, unlinkSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CANONICAL_STATES, validateStatus, normalizeCompany as _normalizeCompany, parseScore as _parseScore } from './lib/statuses.mjs';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));
// Support both layouts: data/applications.md (boilerplate) and applications.md (original)
const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
  ? join(CAREER_OPS, 'data/applications.md')
  : join(CAREER_OPS, 'applications.md');
const ADDITIONS_DIR = join(CAREER_OPS, 'batch/tracker-additions');
const MERGED_DIR = join(ADDITIONS_DIR, 'merged');
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');

const LOCK_FILE = APPS_FILE + '.lock';
const LOCK_TIMEOUT_MS = 10000; // 10 seconds

function acquireLock() {
  const start = Date.now();
  while (existsSync(LOCK_FILE)) {
    // Check if lock is stale (older than 30 seconds)
    try {
      const lockAge = Date.now() - parseInt(readFileSync(LOCK_FILE, 'utf-8'), 10);
      if (lockAge > 30000) {
        console.warn('⚠️  Removing stale lock file');
        unlinkSync(LOCK_FILE);
        break;
      }
    } catch { /* lock file may have been removed */ }

    if (Date.now() - start > LOCK_TIMEOUT_MS) {
      console.error('❌ Could not acquire lock on applications.md — another process may be running');
      process.exit(1);
    }
    // Busy wait 100ms
    const end = Date.now() + 100;
    while (Date.now() < end) { /* spin */ }
  }
  writeFileSync(LOCK_FILE, String(Date.now()));
}
}

function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch { /* already removed */ }
}

// Canonical states imported from lib/statuses.mjs

// Use shared normalizeCompany from lib/statuses.mjs
const normalizeCompany = _normalizeCompany;

function roleFuzzyMatch(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  const wordsA = normalize(a).split(/\s+/).filter(w => w.length > 1);
  const wordsB = normalize(b).split(/\s+/).filter(w => w.length > 1);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  // For short titles (1-2 words), require exact normalized match
  if (wordsA.length <= 2 || wordsB.length <= 2) {
    return normalize(a) === normalize(b);
  }
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}

function extractReportNum(reportStr) {
  const m = reportStr.match(/\[(\d+)\]/);
  return m ? parseInt(m[1]) : null;
}

// Use shared parseScore from lib/statuses.mjs
const parseScore = _parseScore;

function parseAppLine(line) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;
  const num = parseInt(parts[1]);
  if (isNaN(num) || num === 0) return null;
  return {
    num, date: parts[2], company: parts[3], role: parts[4],
    score: parts[5], status: parts[6], pdf: parts[7], report: parts[8],
    notes: parts[9] || '', raw: line,
  };
}

/**
 * Parse a TSV file content into a structured addition object.
 * Handles: 9-col TSV, 8-col TSV, pipe-delimited markdown.
 */
function parseTsvContent(content, filename) {
  content = content.replace(/^\uFEFF/, '').trim();
  if (!content) return null;

  let parts;
  let addition;

  // Detect pipe-delimited (markdown table row)
  if (content.startsWith('|')) {
    parts = content.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 8) {
      console.warn(`⚠️  Skipping malformed pipe-delimited ${filename}: ${parts.length} fields`);
      return null;
    }
    // Format: num | date | company | role | score | status | pdf | report | notes
    addition = {
      num: parseInt(parts[0]),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      score: parts[4],
      status: validateStatus(parts[5]),
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  } else {
    // Tab-separated
    parts = content.split('\t');
    if (parts.length < 8) {
      console.warn(`⚠️  Skipping malformed TSV ${filename}: ${parts.length} fields`);
      return null;
    }

    // Detect column order: some TSVs have (status, score), others have (score, status)
    // Heuristic: if col4 looks like a score and col5 looks like a status, they're swapped
    const col4 = parts[4].trim();
    const col5 = parts[5].trim();
    const col4LooksLikeScore = /^\d+\.?\d*\/5$/.test(col4) || col4 === 'N/A' || col4 === 'DUP';
    const col5LooksLikeScore = /^\d+\.?\d*\/5$/.test(col5) || col5 === 'N/A' || col5 === 'DUP';
    const col4LooksLikeStatus = /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip|evaluada|aplicado|respondido|entrevista|oferta|rechazado|descartado|no aplicar|cerrada|duplicado|repost|condicional|hold|monitor)/i.test(col4);
    const col5LooksLikeStatus = /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip|evaluada|aplicado|respondido|entrevista|oferta|rechazado|descartado|no aplicar|cerrada|duplicado|repost|condicional|hold|monitor)/i.test(col5);

    let statusCol, scoreCol;
    if (col4LooksLikeStatus && !col4LooksLikeScore) {
      // Standard format: col4=status, col5=score
      statusCol = col4; scoreCol = col5;
    } else if (col4LooksLikeScore && col5LooksLikeStatus) {
      // Swapped format: col4=score, col5=status
      statusCol = col5; scoreCol = col4;
    } else if (col5LooksLikeScore && !col4LooksLikeScore) {
      // col5 is definitely score → col4 must be status
      statusCol = col4; scoreCol = col5;
    } else {
      // Default: standard format (status before score)
      statusCol = col4; scoreCol = col5;
    }

    addition = {
      num: parseInt(parts[0]),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      status: validateStatus(statusCol),
      score: scoreCol,
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  }

  if (isNaN(addition.num) || addition.num === 0) {
    console.warn(`⚠️  Skipping ${filename}: invalid entry number`);
    return null;
  }

  return addition;
}

// ---- Main ----

// Read applications.md
if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to merge into.');
  process.exit(0);
}
const appContent = readFileSync(APPS_FILE, 'utf-8');
const appLines = appContent.split(/\r?\n/);
const existingApps = [];
let maxNum = 0;

for (const line of appLines) {
  if (line.startsWith('|') && !line.includes('---') && !line.includes('Empresa')) {
    const app = parseAppLine(line);
    if (app) {
      existingApps.push(app);
      if (app.num > maxNum) maxNum = app.num;
    }
  }
}

console.log(`📊 Existing: ${existingApps.length} entries, max #${maxNum}`);

// Read tracker additions
if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}

const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
if (tsvFiles.length === 0) {
  console.log('✅ No pending additions to merge.');
  process.exit(0);
}

// Sort files numerically for deterministic processing
tsvFiles.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, '')) || 0;
  const numB = parseInt(b.replace(/\D/g, '')) || 0;
  return numA - numB;
});

console.log(`📥 Found ${tsvFiles.length} pending additions`);

let added = 0;
let updated = 0;
let skipped = 0;
const newLines = [];

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf-8').trim();
  const addition = parseTsvContent(content, file);
  if (!addition) { skipped++; continue; }

  // Check for duplicate by:
  // 1. Exact report number match
  // 2. Company + role fuzzy match
  const reportNum = extractReportNum(addition.report);
  let duplicate = null;

  if (reportNum) {
    // Check if this report number already exists
    duplicate = existingApps.find(app => {
      const existingReportNum = extractReportNum(app.report);
      return existingReportNum === reportNum;
    });
  }

  if (!duplicate) {
    // Exact entry number match
    duplicate = existingApps.find(app => app.num === addition.num);
  }

  if (!duplicate) {
    // Company + role fuzzy match
    const normCompany = normalizeCompany(addition.company);
    duplicate = existingApps.find(app => {
      if (normalizeCompany(app.company) !== normCompany) return false;
      return roleFuzzyMatch(addition.role, app.role);
    });
  }

  if (duplicate) {
    const newScore = parseScore(addition.score);
    const oldScore = parseScore(duplicate.score);

    if (newScore > oldScore) {
      console.log(`🔄 Update: #${duplicate.num} ${addition.company} — ${addition.role} (${oldScore}→${newScore})`);
      const lineIdx = appLines.indexOf(duplicate.raw);
      if (lineIdx >= 0) {
        const updatedLine = `| ${duplicate.num} | ${addition.date} | ${addition.company} | ${addition.role} | ${addition.score} | ${duplicate.status} | ${duplicate.pdf} | ${addition.report} | Re-eval ${addition.date} (${oldScore}→${newScore}). ${addition.notes} |`;
        appLines[lineIdx] = updatedLine;
        updated++;
      }
    } else {
      console.log(`⏭️  Skip: ${addition.company} — ${addition.role} (existing #${duplicate.num} ${oldScore} >= new ${newScore})`);
      skipped++;
    }
  } else {
    // New entry — use the number from the TSV
    const entryNum = addition.num > maxNum ? addition.num : ++maxNum;
    if (addition.num > maxNum) maxNum = addition.num;

    const newLine = `| ${entryNum} | ${addition.date} | ${addition.company} | ${addition.role} | ${addition.score} | ${addition.status} | ${addition.pdf} | ${addition.report} | ${addition.notes} |`;
    newLines.push(newLine);
    added++;
    console.log(`➕ Add #${entryNum}: ${addition.company} — ${addition.role} (${addition.score})`);
  }
}

// Append new lines at end of table (chronological order)
if (newLines.length > 0) {
  // Find the last table row (last line starting with |)
  let insertIdx = -1;
  for (let i = appLines.length - 1; i >= 0; i--) {
    if (appLines[i].startsWith('|') && !appLines[i].includes('---')) {
      insertIdx = i + 1;
      break;
    }
  }
  // Fallback: insert after header separator
  if (insertIdx < 0) {
    for (let i = 0; i < appLines.length; i++) {
      if (appLines[i].includes('---') && appLines[i].startsWith('|')) {
        insertIdx = i + 1;
        break;
      }
    }
  }
  if (insertIdx >= 0) {
    appLines.splice(insertIdx, 0, ...newLines);
  }
}

// Write back
if (!DRY_RUN) {
  acquireLock();
  try {
    // Atomic write: write to temp file, then rename
    const tmpFile = APPS_FILE + `.tmp.${process.pid}`;
    writeFileSync(tmpFile, appLines.join('\n'));
    renameSync(tmpFile, APPS_FILE);
    // Move processed files to merged/
    if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
    for (const file of tsvFiles) {
      renameSync(join(ADDITIONS_DIR, file), join(MERGED_DIR, file));
    }
  } finally {
    releaseLock();
  }
  console.log(`\n✅ Moved ${tsvFiles.length} TSVs to merged/`);
}

console.log(`\n📊 Summary: +${added} added, 🔄${updated} updated, ⏭️${skipped} skipped`);
if (DRY_RUN) console.log('(dry-run — no changes written)');

// Optional verify
if (VERIFY && !DRY_RUN) {
  console.log('\n--- Running verification ---');
  const { execSync } = await import('child_process');
  try {
    execSync(`node ${join(CAREER_OPS, 'verify-pipeline.mjs')}`, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}
