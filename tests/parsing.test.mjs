import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCompany,
  normalizeRole,
  roleFuzzyMatch,
  parseScore,
  parseAppLine,
} from '../lib/parsing.mjs';

test('normalizes accented company names for deduplication', () => {
  assert.equal(normalizeCompany('Credit Suisse'), normalizeCompany('Credit Suisse'));
  assert.equal(normalizeCompany('Credit Suisse AG'), normalizeCompany('Credit Suisse AG'));
  assert.equal(normalizeCompany('Societe Generale'), normalizeCompany('Societe Generale'));
});

test('normalizes company names with diacritics to the same key', () => {
  assert.equal(normalizeCompany('Crédit Suisse'), normalizeCompany('Credit Suisse'));
  assert.equal(normalizeCompany('Société Générale'), normalizeCompany('Societe Generale'));
  assert.equal(normalizeCompany('Zürich'), normalizeCompany('Zurich'));
});

test('normalizes role tokens without dropping short technical titles', () => {
  assert.deepEqual(normalizeRole('QA Lead').tokens, ['qa', 'lead']);
  assert.deepEqual(normalizeRole('PM').tokens, ['pm']);
  assert.deepEqual(normalizeRole('SRE / AI Engineer').tokens, ['sre', 'ai', 'engineer']);
});

test('matches exact short role titles and avoids broad short-title matches', () => {
  assert.equal(roleFuzzyMatch('PM', 'PM'), true);
  assert.equal(roleFuzzyMatch('QA Lead', 'QA Lead'), true);
  assert.equal(roleFuzzyMatch('QA Engineer', 'QA Lead'), false);
  assert.equal(roleFuzzyMatch('PM', 'Product Manager'), false);
});

test('matches longer role titles by meaningful overlap', () => {
  assert.equal(roleFuzzyMatch('Senior Backend Engineer', 'Backend Software Engineer'), true);
  assert.equal(roleFuzzyMatch('Data Platform Engineer', 'Mobile Engineer'), false);
});

test('parses only explicit 0-5 scores with slash-five scale', () => {
  assert.equal(parseScore('4.2/5'), 4.2);
  assert.equal(parseScore('**3.65/5**'), 3.65);
  assert.equal(parseScore('0/5'), 0);
  assert.equal(parseScore('5/5'), 5);
});

test('rejects invalid score ranges and unrelated numbers', () => {
  assert.equal(parseScore('99/5'), 0);
  assert.equal(parseScore('-1/5'), 0);
  assert.equal(parseScore('0.001/5'), 0);
  assert.equal(parseScore('Score: 4.2'), 0);
  assert.equal(parseScore('N/A'), 0);
});

test('parses canonical application tracker rows', () => {
  const app = parseAppLine('| 7 | 2026-04-10 | Acme | Backend Engineer | 4.2/5 | Evaluated | - | [007](reports/007-acme.md) | Source URL |');
  assert.deepEqual(app, {
    num: 7,
    date: '2026-04-10',
    company: 'Acme',
    role: 'Backend Engineer',
    score: '4.2/5',
    status: 'Evaluated',
    pdf: '-',
    report: '[007](reports/007-acme.md)',
    notes: 'Source URL',
    raw: '| 7 | 2026-04-10 | Acme | Backend Engineer | 4.2/5 | Evaluated | - | [007](reports/007-acme.md) | Source URL |',
  });
});
