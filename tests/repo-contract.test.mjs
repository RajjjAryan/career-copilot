import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const path = (...parts) => join(root.pathname, ...parts);

function gitLsFiles() {
  return execSync('git ls-files', { cwd: root.pathname, encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
}

function readSystemPaths() {
  const updater = readFileSync(path('update-system.mjs'), 'utf-8');
  const match = updater.match(/const SYSTEM_PATHS = \[([\s\S]*?)\];/);
  assert.ok(match, 'SYSTEM_PATHS should be defined in update-system.mjs');
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

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
  for (const localeDir of ['de/', 'es/', 'fr/', 'hi/', 'ja/', 'pt/']) {
    assert.match(readme, new RegExp(localeDir.replace('/', '\\/')), `${localeDir} should be visible in README`);
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

test('system updater covers every tracked system file', () => {
  const systemPaths = readSystemPaths();
  const userExact = new Set([
    'article-digest.md',
    'config/profile.yml',
    'cv.md',
    'feeds.yml',
    'modes/_profile.md',
    'portals.yml',
  ]);
  const userPrefixes = [
    'batch/logs/',
    'batch/tracker-additions/',
    'data/',
    'interview-prep/',
    'jds/',
    'output/',
    'reports/',
  ];
  const generatedExact = new Set(['dashboard/dashboard']);

  const isCovered = (file) => systemPaths.some((entry) => (
    entry.endsWith('/') ? file.startsWith(entry) : file === entry
  ));

  const missing = gitLsFiles().filter((file) => (
    !userExact.has(file) &&
    !generatedExact.has(file) &&
    !userPrefixes.some((prefix) => file.startsWith(prefix)) &&
    !isCovered(file)
  ));

  assert.deepEqual(missing, []);
});

test('data contract documents current user and system boundaries', () => {
  const contract = readFileSync(path('DATA_CONTRACT.md'), 'utf-8');

  for (const userPath of ['feeds.yml', 'jds/*', 'batch/tracker-additions/*']) {
    assert.match(contract, new RegExp(userPath.replaceAll('*', '\\*')), `${userPath} should be documented as user-layer data`);
  }

  for (const systemPath of [
    'lib/**',
    'tests/**',
    'templates/feeds.example.yml',
    'templates/cv-i18n.yml',
    'docs/assets/*',
    'examples/*',
    'modes/{de,es,fr,hi,ja,pt}/',
  ]) {
    assert.match(contract, new RegExp(systemPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${systemPath} should be documented as system-layer data`);
  }
});

test('root-level English modes do not contain known Spanish instruction leakage', () => {
  const rootModeFiles = readdirSync(path('modes')).filter((file) => file.endsWith('.md') && !file.startsWith('_'));
  const leakedPhrases = [
    'Modo:',
    'Configuración',
    'Ejecución recomendada',
    'Leer `portals.yml`',
    'Idiomas soportados',
    'Usar el template',
    'Post-generación',
    'Para cada empresa',
  ];

  for (const file of rootModeFiles) {
    const content = readFileSync(path('modes', file), 'utf-8');
    for (const phrase of leakedPhrases) {
      assert.equal(content.includes(phrase), false, `${file} should not contain Spanish phrase: ${phrase}`);
    }
  }
});

test('root gitignore covers common Python virtual environments', () => {
  const gitignore = readFileSync(path('.gitignore'), 'utf-8');
  for (const entry of ['.venv/', 'venv/', 'env/']) {
    assert.match(gitignore, new RegExp(`^${entry.replace('.', '\\.').replace('/', '\\/')}$`, 'm'), `${entry} should be ignored`);
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
