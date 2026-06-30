import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateFontsDir } from '../lib/pdf-validation.mjs';

test('font validation fails when required font files are missing', () => {
  const dir = join(tmpdir(), `career-copilot-fonts-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    const result = validateFontsDir(dir);
    assert.equal(result.ok, false);
    assert.match(result.message, /Missing required font files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('font validation passes when all bundled font files exist', () => {
  const dir = join(tmpdir(), `career-copilot-fonts-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    for (const font of ['space-grotesk-latin.woff2', 'space-grotesk-latin-ext.woff2', 'dm-sans-latin.woff2', 'dm-sans-latin-ext.woff2']) {
      writeFileSync(join(dir, font), 'font');
    }
    assert.deepEqual(validateFontsDir(dir), { ok: true, missing: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
