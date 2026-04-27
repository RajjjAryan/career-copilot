#!/usr/bin/env node
// apply-jobs.mjs — Semi-automated Greenhouse job application CLI
//
// Usage:
//   node apply-jobs.mjs --board=gitlab --jobs=8481922002,8488966002
//   node apply-jobs.mjs --board=gitlab --jobs=8481922002 --resume=output/cv-raj-aryan.pdf
//   node apply-jobs.mjs --csv=~/Desktop/raj-aryan-job-matches.csv --top=5
//
// The script opens a visible browser, pre-fills the application form,
// then waits for you to solve the reCAPTCHA and click Apply.

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { submitViaBrowser, batchApply } from './lib/adapters/greenhouse-browser.mjs';

// ── Parse profile.yml (same as apply-engine.mjs) ──────────────────────
function loadProfile() {
  const raw = readFileSync('config/profile.yml', 'utf8');
  const profile = { candidate: {}, auto_apply: {}, location: {} };
  let section = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^candidate\s*:/.test(trimmed)) { section = 'candidate'; continue; }
    if (/^auto_apply\s*:/.test(trimmed)) { section = 'auto_apply'; continue; }
    if (/^location\s*:/.test(trimmed)) { section = 'location'; continue; }
    if (/^\S/.test(line)) { section = null; continue; }
    if (!section) continue;
    const m = trimmed.match(/^(\w[\w_]*):\s*(.+)/);
    if (m) profile[section][m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return profile;
}

// ── Parse CLI args ──────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || 'true'];
    })
);

if (args.help || (!args.board && !args.csv)) {
  console.log(`
Semi-Automated Greenhouse Job Applicator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
  node apply-jobs.mjs --board=<token> --jobs=<id1,id2,...> [--resume=<path>]
  node apply-jobs.mjs --csv=<path> [--top=N] [--resume=<path>]

Options:
  --board     Greenhouse board token (e.g. gitlab, databricks)
  --jobs      Comma-separated job IDs
  --csv       Path to job matches CSV (reads board + job ID from apply_url column)
  --top       When using --csv, apply to top N jobs (default: 5)
  --resume    Path to resume PDF (default: first match in output/)
  --timeout   Seconds to wait for user submission per job (default: 180)
  --help      Show this help

The browser opens in visible mode. After auto-fill:
  1. Review the pre-filled answers
  2. Solve the reCAPTCHA
  3. Click "Apply"
`);
  process.exit(0);
}

const profile = loadProfile();

// Find resume PDF
let resumePath = args.resume;
if (!resumePath) {
  const outputDir = resolve('output');
  if (existsSync(outputDir)) {
    const files = readFileSync !== undefined
      ? (await import('fs/promises')).then(m => m.readdir(outputDir))
      : [];
    const pdfFiles = (await files).filter(f => f.endsWith('.pdf')).sort().reverse();
    if (pdfFiles.length > 0) {
      resumePath = join(outputDir, pdfFiles[0]);
      console.log(`📄 Using resume: ${resumePath}`);
    }
  }
}
if (resumePath && !existsSync(resumePath)) {
  console.error(`❌ Resume not found: ${resumePath}`);
  process.exit(1);
}

const timeout = (parseInt(args.timeout) || 180) * 1000;

// ── Collect jobs to apply ──────────────────────────────────────────────
let jobs = []; // [{ boardToken, jobId }]

if (args.csv) {
  const csvPath = resolve(args.csv.replace('~', process.env.HOME || ''));
  if (!existsSync(csvPath)) {
    console.error(`❌ CSV not found: ${csvPath}`);
    process.exit(1);
  }
  const lines = readFileSync(csvPath, 'utf8').split('\n');
  const header = lines[0].split(',');
  const urlIdx = header.indexOf('apply_url');
  if (urlIdx < 0) {
    console.error('❌ CSV must have an apply_url column');
    process.exit(1);
  }
  const top = parseInt(args.top) || 5;
  for (const line of lines.slice(1, top + 1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const applyUrl = cols[urlIdx]?.trim();
    const m = applyUrl?.match(/greenhouse\.io\/(\w+)\/jobs\/(\d+)/);
    if (m) jobs.push({ boardToken: m[1], jobId: m[2] });
  }
} else if (args.board && args.jobs) {
  jobs = args.jobs.split(',').map(id => ({
    boardToken: args.board,
    jobId: id.trim(),
  }));
}

if (jobs.length === 0) {
  console.error('❌ No jobs to apply to. Use --board + --jobs, or --csv');
  process.exit(1);
}

// ── Apply ──────────────────────────────────────────────────────────────
console.log(`\n🚀 Applying to ${jobs.length} job(s)...\n`);

const results = [];
for (let i = 0; i < jobs.length; i++) {
  const { boardToken, jobId } = jobs[i];
  console.log(`\n━━━ [${i + 1}/${jobs.length}] ${boardToken}/jobs/${jobId} ━━━`);

  const r = await submitViaBrowser({
    boardToken,
    jobId,
    profile,
    pdfPath: resumePath,
    submitTimeout: timeout,
  });

  results.push({ boardToken, jobId, ...r });

  if (i < jobs.length - 1 && r.success) {
    console.log('  ⏭️  Next job in 3 seconds...\n');
    await new Promise(res => setTimeout(res, 3000));
  }
}

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n━━━ Summary ━━━');
const succeeded = results.filter(r => r.success);
const failed = results.filter(r => !r.success);
console.log(`  ✅ Submitted: ${succeeded.length}`);
console.log(`  ❌ Failed:    ${failed.length}`);
for (const r of failed) {
  console.log(`     - ${r.boardToken}/jobs/${r.jobId}: ${r.message}`);
}
console.log('');
