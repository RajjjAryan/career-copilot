import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeApplications } from '../lib/analytics.mjs';

test('computes funnel counts and response rate from tracker entries', () => {
  const result = analyzeApplications([
    { date: '2026-04-01', company: 'A', role: 'Backend', status: 'Applied', score: '4.2/5', notes: '' },
    { date: '2026-04-02', company: 'B', role: 'Backend', status: 'Responded', score: '4.4/5', notes: '' },
    { date: '2026-04-03', company: 'C', role: 'Backend', status: 'Interview', score: '4.6/5', notes: '' },
    { date: '2026-04-04', company: 'D', role: 'Backend', status: 'Rejected', score: '3.8/5', notes: '' },
  ]);

  assert.equal(result.funnel.Applied, 1);
  assert.equal(result.funnel.Responded, 1);
  assert.equal(result.funnel.Interview, 1);
  assert.equal(result.funnel.Rejected, 1);
  assert.equal(result.responseRate, 0.5);
  assert.equal(result.averageScore, 4.25);
});
