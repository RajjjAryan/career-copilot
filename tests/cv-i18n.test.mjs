import test from 'node:test';
import assert from 'node:assert/strict';

import { getCvLabels } from '../lib/cv-i18n.mjs';

test('returns localized CV section labels with English fallback', () => {
  assert.equal(getCvLabels('de').experience, 'Berufserfahrung');
  assert.equal(getCvLabels('fr').skills, 'Competences');
  assert.equal(getCvLabels('unknown').experience, 'Experience');
});
