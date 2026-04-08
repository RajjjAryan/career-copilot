#!/usr/bin/env node

/**
 * test-all.mjs — Comprehensive test suite for career-ops (Copilot CLI Edition)
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, data contract, personal data, paths, mode integrity.
 *
 * Usage:
 *   node test-all.mjs           # Run all tests
 *   node test-all.mjs --quick   # Skip Playwright check (faster)
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
  } catch {
    return null;
  }
}

function fileExists(path) { return existsSync(join(ROOT, path)); }
function readFile(path) { return readFileSync(join(ROOT, path), 'utf-8'); }

console.log('\n🧪 career-ops test suite (Copilot CLI Edition)\n');

// 1. SYNTAX CHECKS
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

// 2. SCRIPT EXECUTION
console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'cv-sync-check.mjs', allowFail: true },
  { name: 'verify-pipeline.mjs' },
  { name: 'normalize-statuses.mjs' },
  { name: 'dedup-tracker.mjs' },
  { name: 'merge-tracker.mjs' },
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

// 3. DATA CONTRACT
console.log('\n3. Data contract validation');

const systemFiles = [
  '.github/copilot-instructions.md', 'VERSION', 'DATA_CONTRACT.md',
  'modes/_shared.md', 'modes/_profile.template.md',
  'modes/evaluate.md', 'modes/pdf.md', 'modes/scan.md',
  'modes/batch.md', 'modes/auto-pipeline.md', 'modes/pipeline.md',
  'modes/tracker.md', 'modes/apply.md', 'modes/contact.md',
  'modes/deep.md', 'modes/interview-prep.md', 'modes/compare.md',
  'modes/training.md', 'modes/project.md',
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
const userFiles = ['config/profile.yml', 'modes/_profile.md', 'portals.yml'];
for (const f of userFiles) {
  const tracked = run(`git ls-files ${f}`);
  if (tracked === '' || tracked === null) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

// 4. PERSONAL DATA LEAK CHECK
console.log('\n4. Personal data leak check');

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'json'];
const allowedFiles = ['README.md', 'LICENSE', 'CITATION.cff', 'CONTRIBUTING.md',
  'package.json', '.github/FUNDING.yml', 'test-all.mjs', 'cv.md'];

// Generic check for absolute paths
const absPathResult = run(
  `grep -rn "/Users/" --include="*.mjs" --include="*.sh" --include="*.md" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v ".git/" | grep -v README.md | grep -v LICENSE | grep -v test-all.mjs | grep -v cv.md`
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// 5. MODE FILE INTEGRITY
console.log('\n5. Mode file integrity');

const expectedModes = [
  '_shared.md', '_profile.template.md', 'evaluate.md', 'pdf.md', 'scan.md',
  'batch.md', 'apply.md', 'auto-pipeline.md', 'contact.md', 'deep.md',
  'compare.md', 'pipeline.md', 'project.md', 'tracker.md', 'training.md',
  'interview-prep.md',
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
  warn('_shared.md does NOT reference _profile');
}

// 6. INSTRUCTIONS INTEGRITY
console.log('\n6. copilot-instructions.md integrity');

const instructions = readFile('.github/copilot-instructions.md');
const requiredSections = [
  'Data Contract', 'Ethical Use', 'Canonical Application States',
  'Onboarding',
];

for (const section of requiredSections) {
  if (instructions.includes(section)) {
    pass(`Instructions has section: ${section}`);
  } else {
    fail(`Instructions missing section: ${section}`);
  }
}

// 7. VERSION FILE
console.log('\n7. Version file');

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

// 8. ESSENTIAL SCRIPTS EXIST
console.log('\n8. Essential scripts');

const essentialScripts = [
  'generate-pdf.mjs', 'doctor.mjs', 'verify-pipeline.mjs',
  'merge-tracker.mjs', 'dedup-tracker.mjs', 'normalize-statuses.mjs',
  'check-liveness.mjs', 'cv-sync-check.mjs',
];

for (const script of essentialScripts) {
  if (fileExists(script)) {
    pass(`Script exists: ${script}`);
  } else {
    fail(`Missing script: ${script}`);
  }
}

// SUMMARY
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
