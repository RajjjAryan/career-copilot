#!/usr/bin/env node

/**
 * update-system.mjs — Safe auto-updater for career-ops (Copilot CLI Edition)
 *
 * Updates ONLY system layer files (modes, scripts, templates).
 * NEVER touches user data (cv.md, profile.yml, _profile.md, data/, reports/).
 *
 * Usage:
 *   node update-system.mjs check      # Check if update available
 *   node update-system.mjs apply      # Apply update (after user confirms)
 *   node update-system.mjs rollback   # Rollback last update
 *   node update-system.mjs dismiss    # Dismiss update check
 *
 * See DATA_CONTRACT.md for the full system/user layer definitions.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// IMPORTANT: Update these after publishing to GitHub
const CANONICAL_REPO = 'https://github.com/YOUR_USERNAME/career-ops.git';
const RAW_VERSION_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/career-ops/main/VERSION';
const RELEASES_API = 'https://api.github.com/repos/YOUR_USERNAME/career-ops/releases/latest';

// System layer paths — ONLY these files get updated
const SYSTEM_PATHS = [
  'modes/_shared.md',
  'modes/_profile.template.md',
  'modes/evaluate.md',
  'modes/pdf.md',
  'modes/scan.md',
  'modes/batch.md',
  'modes/apply.md',
  'modes/auto-pipeline.md',
  'modes/contact.md',
  'modes/deep.md',
  'modes/compare.md',
  'modes/pipeline.md',
  'modes/project.md',
  'modes/tracker.md',
  'modes/training.md',
  'modes/interview-prep.md',
  '.github/copilot-instructions.md',
  'generate-pdf.mjs',
  'merge-tracker.mjs',
  'verify-pipeline.mjs',
  'dedup-tracker.mjs',
  'normalize-statuses.mjs',
  'cv-sync-check.mjs',
  'check-liveness.mjs',
  'update-system.mjs',
  'test-all.mjs',
  'doctor.mjs',
  'batch/batch-prompt.md',
  'templates/',
  'fonts/',
  'docs/',
  'examples/',
  'VERSION',
  'DATA_CONTRACT.md',
  'CONTRIBUTING.md',
  'README.md',
  'LICENSE',
  '.github/ISSUE_TEMPLATE/',
  'package.json',
];

// User layer paths — NEVER touch these (safety check)
const USER_PATHS = [
  'cv.md',
  'config/profile.yml',
  'modes/_profile.md',
  'portals.yml',
  'article-digest.md',
  'interview-prep/',
  'data/',
  'reports/',
  'output/',
  'jds/',
];

function localVersion() {
  const vPath = join(ROOT, 'VERSION');
  return existsSync(vPath) ? readFileSync(vPath, 'utf-8').trim() : '0.0.0';
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8', timeout: 30000 }).trim();
}

// ── CHECK ───────────────────────────────────────────────────────

async function check() {
  if (existsSync(join(ROOT, '.update-dismissed'))) {
    console.log(JSON.stringify({ status: 'dismissed' }));
    return;
  }

  const local = localVersion();
  let remote;

  try {
    const res = await fetch(RAW_VERSION_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    remote = (await res.text()).trim();
  } catch {
    console.log(JSON.stringify({ status: 'offline', local }));
    return;
  }

  if (compareVersions(local, remote) >= 0) {
    console.log(JSON.stringify({ status: 'up-to-date', local, remote }));
    return;
  }

  let changelog = '';
  try {
    const res = await fetch(RELEASES_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.ok) {
      const release = await res.json();
      changelog = release.body || '';
    }
  } catch {
    // No changelog available
  }

  console.log(JSON.stringify({
    status: 'update-available',
    local,
    remote,
    changelog: changelog.slice(0, 500),
  }));
}

// ── APPLY ───────────────────────────────────────────────────────

async function apply() {
  const local = localVersion();

  const lockFile = join(ROOT, '.update-lock');
  if (existsSync(lockFile)) {
    console.error('Update already in progress (.update-lock exists). Delete manually if stuck.');
    process.exit(1);
  }

  writeFileSync(lockFile, new Date().toISOString());

  try {
    // 1. Backup branch
    const backupBranch = `backup-pre-update-${local}`;
    try {
      git(`branch ${backupBranch}`);
      console.log(`Backup branch created: ${backupBranch}`);
    } catch {
      console.log(`Backup branch already exists (${backupBranch}), continuing...`);
    }

    // 2. Fetch from upstream
    console.log('Fetching latest from upstream...');
    git(`fetch ${CANONICAL_REPO} main`);

    // 3. Checkout system files only
    console.log('Updating system files...');
    const updated = [];
    for (const path of SYSTEM_PATHS) {
      try {
        git(`checkout FETCH_HEAD -- ${path}`);
        updated.push(path);
      } catch {
        // File may not exist in remote
      }
    }

    // 4. Safety: verify no user files were touched
    let userFileTouched = false;
    try {
      const status = git('status --porcelain');
      for (const line of status.split('\n')) {
        if (!line.trim()) continue;
        const file = line.slice(3);
        for (const userPath of USER_PATHS) {
          if (file.startsWith(userPath)) {
            console.error(`SAFETY VIOLATION: User file was modified: ${file}`);
            userFileTouched = true;
          }
        }
      }
    } catch {
      // git status failed
    }

    if (userFileTouched) {
      console.error('Aborting: user files were touched. Rolling back...');
      git('checkout .');
      unlinkSync(lockFile);
      process.exit(1);
    }

    // 5. Install new dependencies
    try {
      execSync('npm install --silent', { cwd: ROOT, timeout: 60000 });
    } catch {
      console.log('npm install skipped (may need manual run)');
    }

    // 6. Commit
    const remote = localVersion();
    try {
      git('add .');
      git(`commit -m "chore: auto-update system files to v${remote}"`);
    } catch {
      // Nothing to commit
    }

    // 7. Clean dismiss flag
    const dismissFile = join(ROOT, '.update-dismissed');
    if (existsSync(dismissFile)) unlinkSync(dismissFile);

    console.log(`\nUpdate complete: v${local} → v${remote}`);
    console.log(`Updated ${updated.length} system paths.`);
    console.log(`Rollback available: node update-system.mjs rollback`);

  } finally {
    if (existsSync(lockFile)) unlinkSync(lockFile);
  }
}

// ── ROLLBACK ────────────────────────────────────────────────────

function rollback() {
  try {
    const branches = git('branch --list "backup-pre-update-*"');
    const branchList = branches.split('\n').map(b => b.trim().replace('* ', '')).filter(Boolean);

    if (branchList.length === 0) {
      console.error('No backup branches found. Nothing to rollback.');
      process.exit(1);
    }

    const latest = branchList[branchList.length - 1];
    console.log(`Rolling back to: ${latest}`);

    for (const path of SYSTEM_PATHS) {
      try {
        git(`checkout ${latest} -- ${path}`);
      } catch {
        // File may not have existed in backup
      }
    }

    git('add .');
    git(`commit -m "chore: rollback system files from ${latest}"`);

    console.log(`Rollback complete. System files restored from ${latest}.`);
    console.log('Your data (CV, profile, tracker, reports) was not affected.');
  } catch (err) {
    console.error('Rollback failed:', err.message);
    process.exit(1);
  }
}

// ── DISMISS ─────────────────────────────────────────────────────

function dismiss() {
  writeFileSync(join(ROOT, '.update-dismissed'), new Date().toISOString());
  console.log('Update check dismissed. Run "node update-system.mjs check" to re-enable.');
}

// ── MAIN ────────────────────────────────────────────────────────

const cmd = process.argv[2] || 'check';

switch (cmd) {
  case 'check': await check(); break;
  case 'apply': await apply(); break;
  case 'rollback': rollback(); break;
  case 'dismiss': dismiss(); break;
  default:
    console.log('Usage: node update-system.mjs [check|apply|rollback|dismiss]');
    process.exit(1);
}
