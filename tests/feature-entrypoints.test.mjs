import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const path = (...parts) => join(root.pathname, ...parts);

test('Hindi mode files exist for core workflows', () => {
  for (const file of ['README.md', '_shared.md', 'mulyankan.md', 'aavedan.md', 'pipeline.md']) {
    assert.equal(existsSync(path('modes', 'hi', file)), true, `${file} should exist`);
  }
});

test('feature mode files exist for analytics, negotiation, equity, and feed scanning', () => {
  for (const file of ['analytics.md', 'negotiate.md', 'equity.md', 'feed-scan.md']) {
    assert.equal(existsSync(path('modes', file)), true, `${file} should exist`);
  }
});

test('PDF import and feed support have scripts, templates, and npm commands', () => {
  const pkg = JSON.parse(readFileSync(path('package.json'), 'utf-8'));
  assert.equal(existsSync(path('import-cv.mjs')), true);
  assert.equal(existsSync(path('templates', 'feeds.example.yml')), true);
  assert.equal(pkg.scripts['import-cv'], 'node import-cv.mjs');
  assert.equal(pkg.scripts['feed-scan'], 'node feed-scan.mjs');
});

test('CV i18n template exists and documents supported locales', () => {
  const content = readFileSync(path('templates', 'cv-i18n.yml'), 'utf-8');
  for (const locale of ['en:', 'de:', 'fr:', 'pt:', 'hi:']) {
    assert.match(content, new RegExp(`^${locale}`, 'm'));
  }
});

test('README contains a demo section without requiring binary assets in git', () => {
  const readme = readFileSync(path('README.md'), 'utf-8');
  assert.match(readme, /Demo/i);
  assert.match(readme, /asciinema|VHS/i);
});
