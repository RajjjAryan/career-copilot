import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const path = (...parts) => join(root.pathname, ...parts);

test('user-facing setup docs contain copy-pasteable clone commands', () => {
  for (const file of ['README.md', 'docs/SETUP.md']) {
    const content = readFileSync(path(file), 'utf-8');
    assert.doesNotMatch(content, /<your-repo-url>/, `${file} should not contain clone placeholders`);
    assert.match(content, /github\.com\/RajjjAryan\/career-copilot/, `${file} should mention the canonical repo URL`);
  }
});

test('README project map stays aligned with shipped workflow families', () => {
  const readme = readFileSync(path('README.md'), 'utf-8');
  assert.doesNotMatch(readme, /16 workflow definitions/i);
  for (const shippedItem of ['analytics.md', 'feed-scan.md', 'negotiate.md', 'equity.md', 'import-cv.mjs']) {
    assert.match(readme, new RegExp(shippedItem.replace('.', '\\.')), `${shippedItem} should be visible in README`);
  }
});

test('README includes GitHub-renderable demo and adoption links', () => {
  const readme = readFileSync(path('README.md'), 'utf-8');
  for (const requiredLink of [
    'docs/assets/demo-preview.svg',
    'docs/assets/social-preview.svg',
    'docs/LAUNCH.md',
    'docs/SETUP.md',
  ]) {
    assert.match(readme, new RegExp(requiredLink.replaceAll('.', '\\.')), `${requiredLink} should be linked from README`);
  }
  assert.match(readme, /private fork|template repository/i);
});

test('launch assets and checklist are present', () => {
  assert.equal(existsSync(path('docs/assets/demo-preview.svg')), true, 'demo preview should exist');
  assert.equal(existsSync(path('docs/assets/social-preview.svg')), true, 'social preview should exist');

  const launch = readFileSync(path('docs/LAUNCH.md'), 'utf-8');
  for (const channel of ['GitHub', 'Hacker News', 'Reddit', 'LinkedIn', 'social-preview.svg']) {
    assert.match(launch, new RegExp(channel, 'i'), `${channel} should be covered in launch guide`);
  }
});

test('system updater uses explicit docs paths', () => {
  const updater = readFileSync(path('update-system.mjs'), 'utf-8');
  assert.doesNotMatch(updater, /['"]docs\/['"]/, 'updater should not checkout every docs/ file');

  for (const doc of [
    'docs/ARCHITECTURE.md',
    'docs/CODEX.md',
    'docs/CUSTOMIZATION.md',
    'docs/LAUNCH.md',
    'docs/SETUP.md',
    'docs/assets/demo-preview.svg',
    'docs/assets/social-preview.svg',
    'docs/evaluation-walkthrough.md',
  ]) {
    assert.match(updater, new RegExp(`['"]${doc.replaceAll('.', '\\.')}['"]`), `${doc} should be explicitly updateable`);
  }
});

test('mode files use canonical user-layer paths', () => {
  const modeDir = path('modes');
  const modeFiles = readdirSync(modeDir).filter((file) => file.endsWith('.md'));

  for (const file of modeFiles) {
    const content = readFileSync(join(modeDir, file), 'utf-8');
    assert.doesNotMatch(content, /data\/cv\.md/, `${file} should reference cv.md`);
    assert.doesNotMatch(content, /data\/article-digest\.md/, `${file} should reference article-digest.md`);
  }
});
