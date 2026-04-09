#!/usr/bin/env node

/**
 * test-all.mjs — Comprehensive test suite for career-ops (Copilot CLI Edition)
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, dashboard, data contract, personal data, paths, mode integrity.
 *
 * Usage:
 *   node test-all.mjs           # Run all tests
 *   node test-all.mjs --quick   # Skip dashboard build (faster)
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const QUICK = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warnings++; }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function fileExists(path) { return existsSync(join(ROOT, path)); }
function readFile(path) { return readFileSync(join(ROOT, path), 'utf-8'); }

console.log('\n🧪 career-ops test suite (Copilot CLI Edition)\n');

// ── 1. SYNTAX CHECKS ────────────────────────────────────────────

console.log('1. Syntax checks');

const mjsFiles = readdirSync(ROOT).filter(f => f.endsWith('.mjs'));
for (const f of mjsFiles) {
  const result = run(`node --check ${f}`);
  if (result !== null) {
    pass(`${f} syntax OK`);
  } else {
    fail(`${f} has syntax errors`);
  }
}

// ── 2. SCRIPT EXECUTION ─────────────────────────────────────────

console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true },
  { name: 'verify-pipeline.mjs', expectExit: 0 },
  { name: 'normalize-statuses.mjs', expectExit: 0 },
  { name: 'dedup-tracker.mjs', expectExit: 0 },
  { name: 'merge-tracker.mjs', expectExit: 0 },
  { name: 'update-system.mjs check', expectExit: 0 },
];

for (const { name, allowFail } of scripts) {
  const result = run(`node ${name} 2>&1`);
  if (result !== null) {
    pass(`${name} runs OK`);
  } else if (allowFail) {
    warn(`${name} exited with error (expected without user data)`);
  } else {
    fail(`${name} crashed`);
  }
}

// ── 3. DASHBOARD BUILD ──────────────────────────────────────────

if (!QUICK) {
  console.log('\n3. Dashboard build');
  if (fileExists('dashboard/go.mod')) {
    const goBuild = run('cd dashboard && go build -o /tmp/career-dashboard-test . 2>&1');
    if (goBuild !== null) {
      pass('Dashboard compiles');
    } else {
      warn('Dashboard build failed (Go may not be installed)');
    }
  } else {
    warn('Dashboard directory missing — skipping build test');
  }
} else {
  console.log('\n3. Dashboard build (skipped --quick)');
}

// ── 4. DATA CONTRACT ────────────────────────────────────────────

console.log('\n4. Data contract validation');

const systemFiles = [
  '.github/copilot-instructions.md', 'VERSION', 'DATA_CONTRACT.md',
  'modes/_shared.md', 'modes/_profile.template.md',
  'modes/evaluate.md', 'modes/pdf.md', 'modes/scan.md',
  'modes/batch.md', 'modes/auto-pipeline.md',
  'templates/states.yml', 'templates/cv-template.html',
  'config/profile.example.yml',
];

for (const f of systemFiles) {
  if (fileExists(f)) {
    pass(`System file exists: ${f}`);
  } else {
    fail(`Missing system file: ${f}`);
  }
}

// Check user files are NOT tracked (gitignored)
const userFiles = [
  'config/profile.yml', 'modes/_profile.md', 'portals.yml',
];
for (const f of userFiles) {
  const tracked = run(`git ls-files ${f}`);
  if (tracked === '' || tracked === null) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

// ── 5. PERSONAL DATA LEAK CHECK ─────────────────────────────────

console.log('\n5. Personal data leak check');

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'go', 'json'];
const allowedFiles = ['README.md', 'LICENSE', 'CITATION.cff', 'CONTRIBUTING.md',
  'package.json', '.github/FUNDING.yml', '.github/copilot-instructions.md',
  'go.mod', 'test-all.mjs', 'AGENTS.md'];

// Check for absolute paths as personal data indicator
let leakFound = false;
const absResult = run(
  `grep -rn "/Users/" --include="*.mjs" --include="*.sh" --include="*.md" --include="*.go" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v ".git/"`,
);
if (absResult) {
  for (const line of absResult.split('\n').filter(Boolean)) {
    const file = line.split(':')[0].replace('./', '');
    if (allowedFiles.some(a => file.includes(a))) continue;
    if (file.includes('go.sum')) continue;
    warn(`Possible personal data (absolute path) in ${file}`);
    leakFound = true;
  }
}
if (!leakFound) {
  pass('No personal data leaks outside allowed files');
}

// ── 6. ABSOLUTE PATH CHECK ──────────────────────────────────────

console.log('\n6. Absolute path check');

const absPathResult = run(
  `grep -rn "/Users/" --include="*.mjs" --include="*.sh" . 2>/dev/null | grep -v node_modules | grep -v ".git/" | grep -v test-all.mjs`
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// ── 7. MODE FILE INTEGRITY ──────────────────────────────────────

console.log('\n7. Mode file integrity');

const expectedModes = [
  '_shared.md', '_profile.template.md', 'evaluate.md', 'pdf.md', 'scan.md',
  'batch.md', 'apply.md', 'auto-pipeline.md', 'contact.md', 'deep.md',
  'compare.md', 'pipeline.md', 'project.md', 'tracker.md', 'training.md',
  'interview-prep.md', 'patterns.md',
];

for (const mode of expectedModes) {
  if (fileExists(`modes/${mode}`)) {
    pass(`Mode exists: ${mode}`);
  } else {
    fail(`Missing mode: ${mode}`);
  }
}

// Check _shared.md references _profile.md
const shared = readFile('modes/_shared.md');
if (shared.includes('_profile')) {
  pass('_shared.md references _profile');
} else {
  fail('_shared.md does NOT reference _profile');
}

// ── 8. COPILOT INSTRUCTIONS INTEGRITY ───────────────────────────

console.log('\n8. copilot-instructions.md integrity');

const instructions = readFile('.github/copilot-instructions.md');
const requiredSections = [
  'Data Contract', 'Update Check', 'Ethical Use',
  'Offer Verification', 'Canonical', 'TSV Format',
  'Onboarding',
];

for (const section of requiredSections) {
  if (instructions.includes(section)) {
    pass(`Instructions has section: ${section}`);
  } else {
    fail(`Instructions missing section: ${section}`);
  }
}

// ── 9. VERSION FILE ─────────────────────────────────────────────

console.log('\n9. Version file');

if (fileExists('VERSION')) {
  const version = readFile('VERSION').trim();
  if (/^\d+\.\d+\.\d+$/.test(version)) {
    pass(`VERSION is valid semver: ${version}`);
  } else {
    fail(`VERSION is not valid semver: "${version}"`);
  }
} else {
  fail('VERSION file missing');
}

// ── 10. ESSENTIAL SCRIPTS ───────────────────────────────────────

console.log('\n10. Essential scripts');

const essentialScripts = [
  'generate-pdf.mjs', 'doctor.mjs', 'verify-pipeline.mjs',
  'merge-tracker.mjs', 'dedup-tracker.mjs', 'normalize-statuses.mjs',
  'check-liveness.mjs', 'cv-sync-check.mjs', 'update-system.mjs',
  'analyze-patterns.mjs',
];

for (const script of essentialScripts) {
  if (fileExists(script)) {
    pass(`Script exists: ${script}`);
  } else {
    fail(`Missing script: ${script}`);
  }
}

// ── SUMMARY ─────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);

if (failed > 0) {
  console.log('🔴 TESTS FAILED — do NOT push/merge until fixed\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('🟡 Tests passed with warnings — review before pushing\n');
  process.exit(0);
} else {
  console.log('🟢 All tests passed — safe to push/merge\n');
  process.exit(0);
}
