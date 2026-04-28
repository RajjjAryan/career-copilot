import { chromium } from 'playwright';
import { fetchJobDetails } from './lib/adapters/greenhouse.mjs';
import { readFileSync } from 'fs';

setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 40000);

// Load profile
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

// Import the browser adapter dynamically to test it
const { submitViaBrowser } = await import('./lib/adapters/greenhouse-browser.mjs');

const profile = loadProfile();
const r = await submitViaBrowser({
  boardToken: 'gitlab',
  jobId: '8481922002',
  profile,
  pdfPath: 'output/cv-raj-aryan-gitlab-2026-04-11.pdf',
  headless: true,
  submitTimeout: 5000, // short timeout for test
});
console.log('\nResult:', JSON.stringify(r, null, 2));
