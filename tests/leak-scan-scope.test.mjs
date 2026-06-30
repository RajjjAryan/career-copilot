import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldScanForPersonalData } from '../lib/test-file-scope.mjs';

test('personal data leak scan skips user-layer files and local environments', () => {
  for (const file of [
    'cv.md',
    'article-digest.md',
    'portals.yml',
    'feeds.yml',
    'modes/_profile.md',
    'interview-prep/story-bank.md',
    '.venv/lib/python3.12/site-packages/pkg/METADATA',
    'node_modules/package/index.js',
    '.git/config',
    'data/job-matches.csv',
    'reports/acme.md',
    'output/cv.pdf',
    'jds/acme.md',
  ]) {
    assert.equal(shouldScanForPersonalData(file), false, `${file} should be skipped`);
  }
});

test('personal data leak scan still covers system files', () => {
  for (const file of [
    'README.md',
    'modes/apply.md',
    'lib/parsing.mjs',
    'templates/states.yml',
    'package.json',
  ]) {
    assert.equal(shouldScanForPersonalData(file), true, `${file} should be scanned`);
  }
});
