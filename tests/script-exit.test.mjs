import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateScriptExit } from '../lib/script-exit.mjs';

test('expected exit code is enforced even when failures are otherwise allowed', () => {
  assert.deepEqual(
    evaluateScriptExit({ name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true }, 0),
    { level: 'fail', message: 'cv-sync-check.mjs exited with 0, expected 1' },
  );
});

test('matching expected exit code passes', () => {
  assert.deepEqual(
    evaluateScriptExit({ name: 'verify-pipeline.mjs', expectExit: 0 }, 0),
    { level: 'pass', message: 'verify-pipeline.mjs exited with expected code 0' },
  );
  assert.deepEqual(
    evaluateScriptExit({ name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true }, 1),
    { level: 'pass', message: 'cv-sync-check.mjs exited with expected code 1' },
  );
});

test('allowFail only downgrades unexpected nonzero exits when no expectExit is set', () => {
  assert.deepEqual(
    evaluateScriptExit({ name: 'optional.mjs', allowFail: true }, 2),
    { level: 'warn', message: 'optional.mjs exited with error (expected without user data)' },
  );
});
