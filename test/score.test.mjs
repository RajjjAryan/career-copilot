import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScore } from '../lib/score.mjs';

test('parseScore accepts valid x/5 scores', () => {
  assert.equal(parseScore('5/5'), 5);
  assert.equal(parseScore('4.5/5'), 4.5);
  assert.equal(parseScore('**3.2/5**'), 3.2);
  assert.equal(parseScore('score: 0/5'), 0);
});

test('parseScore rejects invalid ranges and unrelated numbers', () => {
  assert.equal(parseScore('99/5'), 0);
  assert.equal(parseScore('-1/5'), 0);
  assert.equal(parseScore('0.001/5'), 0);
  assert.equal(parseScore('score is 7'), 0);
  assert.equal(parseScore('abc'), 0);
  assert.equal(parseScore(''), 0);
  assert.equal(parseScore(null), 0);
  assert.equal(parseScore(undefined), 0);
});
