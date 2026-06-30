import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProfileYaml } from '../lib/profile-validation.mjs';

test('validates profile YAML syntax before checking required fields', () => {
  const result = validateProfileYaml('candidate:\n  full_name: "Jane\n');
  assert.equal(result.ok, false);
  assert.match(result.label, /YAML syntax error/i);
});

test('accepts nested full_name and target_roles fields from the example schema', () => {
  const result = validateProfileYaml(`
candidate:
  full_name: "Raj Aryan"
target_roles:
  primary:
    - "Senior Backend Engineer"
`);
  assert.equal(result.ok, true);
});

test('rejects unfilled example profile placeholders', () => {
  const result = validateProfileYaml(`
candidate:
  full_name: "Your Name"
target_roles:
  primary:
    - "Your target role"
`);
  assert.equal(result.ok, false);
  assert.match(result.label, /example data/i);
});
