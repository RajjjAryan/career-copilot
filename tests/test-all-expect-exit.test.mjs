import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['test-all.mjs', '--self-test-expect-exit'],
  { encoding: 'utf8' },
);

assert.equal(result.status, 0, result.stdout + result.stderr);
assert.match(result.stdout, /expectExit self-test passed/);
