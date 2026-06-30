#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { analyzeApplications } from './lib/analytics.mjs';
import { parseTrackerContent } from './lib/parsing.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPS_FILE = existsSync(join(__dirname, 'data/applications.md'))
  ? join(__dirname, 'data/applications.md')
  : join(__dirname, 'applications.md');

function renderMarkdown(result) {
  return `# Pipeline Analytics

## Funnel

| Status | Count |
|---|---:|
${Object.entries(result.funnel).map(([status, count]) => `| ${status} | ${count} |`).join('\n')}

## Metrics

- Response rate: ${(result.responseRate * 100).toFixed(1)}%
- Offer rate: ${(result.offerRate * 100).toFixed(1)}%
- Average score: ${result.averageScore}/5
`;
}

const entries = existsSync(APPS_FILE)
  ? parseTrackerContent(readFileSync(APPS_FILE, 'utf-8'))
  : [];
const result = analyzeApplications(entries);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const markdown = renderMarkdown(result);
  console.log(markdown);

  if (process.argv.includes('--write')) {
    const today = new Date().toISOString().slice(0, 10);
    const reportsDir = join(__dirname, 'reports');
    mkdirSync(reportsDir, { recursive: true });
    const out = join(reportsDir, `analytics-${today}.md`);
    writeFileSync(out, markdown);
    console.log(`\nSaved: ${out}`);
  }
}
