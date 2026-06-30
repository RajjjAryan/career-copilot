import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyNavigationError } from '../lib/liveness.mjs';

test('classifies transient navigation failures as uncertain', () => {
  assert.deepEqual(classifyNavigationError('Timeout 30000ms exceeded'), {
    result: 'uncertain',
    reason: 'transient error: Timeout 30000ms exceeded',
  });
  assert.equal(classifyNavigationError('HTTP 429 Too Many Requests').result, 'uncertain');
  assert.equal(classifyNavigationError('ECONNRESET').result, 'uncertain');
});

test('classifies DNS resolution failures as uncertain rather than expired', () => {
  assert.equal(classifyNavigationError('net::ERR_NAME_NOT_RESOLVED at https://example.invalid').result, 'uncertain');
});

test('keeps definitive HTTP gone statuses expired', () => {
  assert.deepEqual(classifyNavigationError('HTTP 404'), {
    result: 'expired',
    reason: 'HTTP 404',
  });
  assert.equal(classifyNavigationError('HTTP 410').result, 'expired');
});
