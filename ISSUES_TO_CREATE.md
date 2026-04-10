# Issues to Create on GitHub

This document contains all issues identified during code review. Copy each section below to create a new GitHub issue.

---

## Issue 1: Race condition in merge-tracker.mjs - Risk of data corruption

**Labels:** `bug`, `priority:high`, `data-integrity`

### Description
The `merge-tracker.mjs` script has a race condition that could lead to data corruption if multiple processes attempt to merge tracker additions simultaneously.

### Location
`merge-tracker.mjs:308-310`

### Issue
The script:
1. Reads `applications.md` into memory
2. Modifies the data
3. Writes it back to disk

Without file locking or atomic operations, if two processes run simultaneously, they could overwrite each other's changes, causing data loss.

### Impact
**High** - Data loss in application tracker

### Proposed Fix
Implement one of:
- File locking mechanism (using lockfile or similar)
- Atomic write operations (write to temp file, then rename)
- Add process locking with a lockfile similar to what `update-system.mjs` uses

### Example Implementation
```javascript
// Before write
const lockFile = join(ADDITIONS_DIR, '.merge-lock');
if (existsSync(lockFile)) {
  console.error('Another merge is in progress. Exiting.');
  process.exit(1);
}
writeFileSync(lockFile, new Date().toISOString());

try {
  // ... do merge operations
  writeFileSync(APPS_FILE, appLines.join('\n'));
} finally {
  unlinkSync(lockFile);
}
```

---

## Issue 2: Missing font validation in generate-pdf.mjs causes silent failures

**Labels:** `bug`, `priority:medium`, `pdf-generation`

### Description
The PDF generation script doesn't validate that required fonts exist before attempting to generate PDFs. This leads to silent failures where PDFs are generated with system fonts instead of the intended fonts.

### Location
`generate-pdf.mjs:112-121`

### Issue
Font path replacement uses string manipulation without validating:
- If the fonts directory exists
- If fonts are actually present
- If the specific .woff2 files needed are available

When fonts are missing, Chromium silently falls back to system fonts, producing inconsistent PDFs that may not be ATS-optimized.

### Impact
**Medium** - Silent failures in PDF generation, inconsistent output

### Proposed Fix
Add validation before generating PDF:

```javascript
// After line 112
const fontsDir = resolve(__dirname, 'fonts');
if (!existsSync(fontsDir)) {
  console.error('❌ fonts/ directory not found');
  process.exit(1);
}

const requiredFonts = ['SpaceGrotesk-Regular.woff2', 'DMSans-Regular.woff2'];
for (const font of requiredFonts) {
  if (!existsSync(join(fontsDir, font))) {
    console.error(`❌ Required font missing: ${font}`);
    process.exit(1);
  }
}
```

---

## Issue 3: Command injection potential in update-system.mjs

**Labels:** `security`, `priority:high`

### Description
The `update-system.mjs` script uses string interpolation to execute git commands, creating a potential command injection vulnerability.

### Location
`update-system.mjs:108`

### Issue
The `git()` function executes commands using `execSync` with string interpolation:

```javascript
function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8', timeout: 30000 }).trim();
}
```

While currently safe, if future code passes user input here, it's vulnerable to command injection.

### Impact
**High (potential)** - Command injection vulnerability

### Proposed Fix
Use array-based command execution or validate/escape input:

```javascript
function git(args) {
  // Validate args is array or convert string safely
  const argsArray = Array.isArray(args) ? args : args.split(' ');
  return execSync(['git', ...argsArray].join(' '),
    { cwd: ROOT, encoding: 'utf-8', timeout: 30000 }).trim();
}
```

Or use `spawn` with array arguments for true safety:
```javascript
import { spawnSync } from 'child_process';

function git(args) {
  const argsArray = Array.isArray(args) ? args : args.split(' ');
  const result = spawnSync('git', argsArray, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 30000
  });
  if (result.error) throw result.error;
  return result.stdout.trim();
}
```

---

## Issue 4: Status normalization inconsistency across scripts

**Labels:** `bug`, `priority:medium`, `data-integrity`, `refactoring`

### Description
Four different scripts implement status normalization with slightly different alias mappings, creating inconsistent data processing.

### Location
- `analyze-patterns.mjs:30-42`
- `verify-pipeline.mjs:37-46`
- `merge-tracker.mjs:43-54`
- `normalize-statuses.mjs:26-84`

### Issue
Each script has its own status normalization logic with subtle differences in alias handling. This can lead to:
- Data being classified differently by different scripts
- Maintenance burden when adding new status aliases
- Inconsistent behavior across the application

### Impact
**Medium** - Inconsistent data processing, maintenance burden

### Proposed Fix
Extract status normalization to a shared module:

1. Create `lib/status-utils.mjs`:
```javascript
export const CANONICAL_STATUSES = [
  'Evaluated', 'Applied', 'Responded', 'Interview',
  'Offer', 'Rejected', 'Discarded', 'SKIP'
];

export const STATUS_ALIASES = {
  'evaluada': 'Evaluated',
  'aplicado': 'Applied',
  // ... all aliases
};

export function normalizeStatus(raw) {
  const clean = raw.replace(/\*\*/g, '').trim().toLowerCase();
  const statusOnly = clean.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();

  if (STATUS_ALIASES[statusOnly]) {
    return STATUS_ALIASES[statusOnly];
  }

  // Check canonical statuses
  for (const canonical of CANONICAL_STATUSES) {
    if (canonical.toLowerCase() === statusOnly) {
      return canonical;
    }
  }

  return null; // Invalid status
}
```

2. Update all scripts to import from this module

---

## Issue 5: Score parsing doesn't validate range

**Labels:** `bug`, `priority:low`, `data-integrity`

### Description
Score parsing functions accept any numeric value, including invalid scores outside the 0-5 range.

### Location
- `merge-tracker.mjs:81-84`
- `dedup-tracker.mjs:72-75`

### Issue
The `parseScore` function uses regex `/(\d+\.?\d*)/` which matches any number:

```javascript
function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}
```

This would accept invalid scores like "99/5" or "0.1/5" when valid range is 0-5.

### Impact
**Low** - Invalid score comparisons

### Proposed Fix
Add validation:

```javascript
function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)/);
  if (!m) return 0;

  const score = parseFloat(m[1]);
  if (isNaN(score) || score < 0 || score > 5) {
    console.warn(`Invalid score: ${s} (must be 0-5)`);
    return 0;
  }

  return score;
}
```

---

## Issue 6: Duplicate detection fails for short role titles

**Labels:** `bug`, `priority:medium`, `duplicate-detection`

### Description
The fuzzy role matching algorithm requires at least 2 overlapping words longer than 3 characters, which fails for short role titles.

### Location
`merge-tracker.mjs:68-74`, `dedup-tracker.mjs:65-70`

### Issue
```javascript
function roleFuzzyMatch(a, b) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}
```

This fails for:
- Short titles: "PM", "Tech Lead", "SRE"
- Different wording: "Backend Engineer" vs "Server Developer"
- Single-word roles: "Architect", "Designer"

### Impact
**Medium** - Fails to detect duplicates with short or single-word titles

### Proposed Fix
Option 1: Lower the word length threshold and overlap requirement:
```javascript
function roleFuzzyMatch(a, b) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));

  // Require at least 1 overlap, or 50% of words
  const minOverlap = Math.min(1, Math.ceil(Math.min(wordsA.length, wordsB.length) * 0.5));
  return overlap.length >= minOverlap;
}
```

Option 2: Use Levenshtein distance for better fuzzy matching.

---

## Issue 7: Off-by-one error in report numbering

**Labels:** `bug`, `priority:low`, `numbering`

### Description
The report numbering logic in merge-tracker has a potential gap-creation bug.

### Location
`merge-tracker.mjs:282-283`

### Issue
```javascript
const entryNum = addition.num > maxNum ? addition.num : ++maxNum;
if (addition.num > maxNum) maxNum = addition.num;
```

If `addition.num > maxNum`, then `maxNum` gets updated but `++maxNum` was never executed in the ternary, potentially creating gaps in numbering.

### Impact
**Low** - Non-sequential numbering

### Proposed Fix
Simplify the logic:
```javascript
maxNum = Math.max(maxNum, addition.num);
const entryNum = maxNum;
```

Or if new entries should always increment:
```javascript
if (addition.num > maxNum) {
  maxNum = addition.num;
}
const entryNum = ++maxNum;
```

---

## Issue 8: Unbounded memory usage in analyze-patterns.mjs

**Labels:** `performance`, `priority:medium`

### Description
The pattern analyzer loads all reports into memory at once, which could cause out-of-memory errors for users with hundreds of applications.

### Location
`analyze-patterns.mjs:219-239`

### Issue
```javascript
const enriched = entries.map(e => {
  const reportMatch = e.report.match(/\]\(([^)]+)\)/);
  const reportPath = reportMatch ? join(CAREER_OPS, reportMatch[1]) : null;
  const reportData = reportPath ? parseReport(reportPath) : null;
  // ...
});
```

All reports are loaded and parsed in a single map operation without pagination or streaming.

### Impact
**Medium** - Crashes for large datasets (100+ applications)

### Proposed Fix
Process reports in batches:

```javascript
const BATCH_SIZE = 50;
const enriched = [];

for (let i = 0; i < entries.length; i += BATCH_SIZE) {
  const batch = entries.slice(i, i + BATCH_SIZE);
  const batchEnriched = batch.map(e => {
    // ... existing logic
  });
  enriched.push(...batchEnriched);
}
```

---

## Issue 9: Missing error handling for Playwright installation

**Labels:** `bug`, `priority:medium`, `dx`, `pdf-generation`

### Description
The PDF generation script doesn't check if Playwright is properly installed before attempting to launch Chromium, leading to cryptic errors.

### Location
`generate-pdf.mjs:132`

### Issue
```javascript
const browser = await chromium.launch({ headless: true });
```

On fresh clones or incomplete installations, this fails with unhelpful error messages like:
```
browserType.launch: Executable doesn't exist at /path/to/chromium
```

### Impact
**Medium** - Poor developer experience, difficult troubleshooting

### Proposed Fix
Add pre-flight check:

```javascript
// Before launching browser
try {
  const execPath = chromium.executablePath();
  if (!existsSync(execPath)) {
    console.error('❌ Playwright Chromium not installed');
    console.error('   Run: npx playwright install chromium');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Playwright not properly configured');
  console.error('   Run: npm install && npx playwright install chromium');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
```

---

## Issue 10: Regex escaping issue in check-liveness.mjs

**Labels:** `bug`, `priority:low`, `correctness`

### Description
An expired page detection regex has an unescaped period that should match a literal apostrophe in "doesn't".

### Location
`check-liveness.mjs:30`

### Issue
```javascript
/the page you are looking for doesn.t exist/i
```

The `.` before `t` matches any character, not specifically the apostrophe in "doesn't". While this works in practice (even matching "doesnt"), it's semantically incorrect.

### Impact
**Negligible** - Works but imprecise

### Proposed Fix
```javascript
/the page you are looking for doesn't exist/i
```

Or to be more flexible:
```javascript
/the page you are looking for doesn['']?t exist/i
```

---

## Issue 11: Missing timeout handling in check-liveness.mjs

**Labels:** `bug`, `priority:medium`, `reliability`

### Description
The URL liveness checker has a navigation timeout but no timeout for page evaluation, potentially causing indefinite hangs.

### Location
`check-liveness.mjs:58-102`

### Issue
The function has:
- Navigation timeout: 30s (TIMEOUT_MS)
- waitForTimeout: 2s (no timeout)
- page.evaluate: no timeout

If a page hangs during JavaScript execution, it could block indefinitely.

### Impact
**Medium** - Script hangs on malformed pages

### Proposed Fix
Wrap the entire check in a timeout:

```javascript
async function checkUrl(page, url) {
  return Promise.race([
    checkUrlImpl(page, url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Overall timeout')), TIMEOUT_MS)
    )
  ]).catch(err => ({
    result: 'expired',
    reason: `timeout or error: ${err.message}`
  }));
}

async function checkUrlImpl(page, url) {
  // existing logic here
}
```

---

## Issue 12: Missing usage examples in scripts

**Labels:** `enhancement`, `priority:low`, `dx`, `documentation`

### Description
Several scripts have minimal documentation and don't print usage when called without required arguments.

### Examples
- `cv-sync-check.mjs` - runs even without arguments, could be confusing
- `normalize-statuses.mjs` - no usage help
- `dedup-tracker.mjs` - no usage help

### Impact
**Low** - Poor user experience for CLI tools

### Proposed Fix
Add usage printing pattern to all CLI scripts:

```javascript
function printUsage() {
  console.log(`
Usage: node ${basename(fileURLToPath(import.meta.url))} [options]

Options:
  --dry-run    Show what would change without making changes
  --help       Show this help message

Examples:
  node ${basename(fileURLToPath(import.meta.url))} --dry-run
  `);
}

if (process.argv.includes('--help')) {
  printUsage();
  process.exit(0);
}
```

---

## Issue 13: No unit tests

**Labels:** `enhancement`, `priority:medium`, `testing`

### Description
The repository has no unit tests. Only `test-all.mjs` which does integration-style checks.

### Impact
**Medium** - Hard to prevent regressions, difficult to refactor safely

### Proposed Fix
Add unit testing framework and tests for critical functions:

1. Add test framework:
```json
// package.json
{
  "devDependencies": {
    "vitest": "^1.0.0"
  },
  "scripts": {
    "test:unit": "vitest"
  }
}
```

2. Create test files:
- `tests/status-normalization.test.mjs`
- `tests/score-parsing.test.mjs`
- `tests/duplicate-detection.test.mjs`
- `tests/report-parsing.test.mjs`

3. Focus on testing:
- Status normalization logic
- Score parsing and validation
- Duplicate detection algorithms
- Report parsing
- File path resolution

---

## Issue 14: Duplicated code across scripts

**Labels:** `refactoring`, `priority:medium`, `maintenance`

### Description
Multiple pieces of logic are duplicated across scripts, making maintenance difficult and error-prone.

### Duplicated Logic
- **Status normalization**: 4 files
- **Score parsing**: 3 files
- **Company normalization**: 2 files
- **File path resolution** for data/ vs root: 6 files

### Impact
**Medium** - Hard to maintain, easy to introduce bugs when updating one location but not others

### Proposed Fix
Create shared utility modules:

1. `lib/status-utils.mjs` - Status normalization
2. `lib/score-utils.mjs` - Score parsing and validation
3. `lib/string-utils.mjs` - Company/role normalization
4. `lib/path-utils.mjs` - File path resolution helpers

Example structure:
```javascript
// lib/path-utils.mjs
import { existsSync, join, dirname } from 'fs';
import { fileURLToPath } from 'url';

export function getProjectRoot(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

export function getApplicationsFile(root) {
  const dataPath = join(root, 'data/applications.md');
  return existsSync(dataPath) ? dataPath : join(root, 'applications.md');
}
```

---

## Issue 15: Unicode normalization missing in duplicate detection

**Labels:** `bug`, `priority:low`, `i18n`

### Description
Company name normalization doesn't handle Unicode normalization, causing names with accents to be treated as different companies.

### Location
- `dedup-tracker.mjs:49-63`
- `merge-tracker.mjs:65-67`

### Issue
```javascript
function normalizeCompany(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
```

This doesn't handle Unicode normalization:
- "Resumé" vs "Resume" → treated as different
- "Zürich" vs "Zurich" → treated as different
- "Café" vs "Cafe" → treated as different

### Impact
**Low** - Fails to detect duplicates with accented characters

### Proposed Fix
```javascript
function normalizeCompany(name) {
  return name
    .normalize('NFD')  // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')  // Remove accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
```

---

## Issue 16: Hardcoded timeout values should be configurable

**Labels:** `enhancement`, `priority:low`, `configuration`

### Description
Timeout values are hardcoded throughout the codebase, which can cause issues on slow networks or CI environments.

### Examples
- `update-system.mjs:108` - 30000ms git timeout
- `test-all.mjs:33` - 30000ms command timeout
- `update-system.mjs:227` - 60000ms npm install timeout
- `check-liveness.mjs:56` - TIMEOUT_MS default 30000

### Impact
**Low** - Spurious failures on slow systems

### Proposed Fix
Make timeouts configurable via environment variables:

```javascript
const GIT_TIMEOUT = parseInt(process.env.GIT_TIMEOUT_MS, 10) || 30000;
const NPM_TIMEOUT = parseInt(process.env.NPM_TIMEOUT_MS, 10) || 60000;
const PAGE_TIMEOUT = parseInt(process.env.PAGE_TIMEOUT_MS, 10) || 30000;
```

Document in README:
```markdown
## Environment Variables

- `GIT_TIMEOUT_MS` - Timeout for git operations (default: 30000)
- `NPM_TIMEOUT_MS` - Timeout for npm install (default: 60000)
- `PAGE_TIMEOUT_MS` - Timeout for page loads (default: 30000)
```

---

## Issue 17: Sequential report processing in analyze-patterns is slow

**Labels:** `performance`, `priority:low`

### Description
Reports are parsed sequentially, which is slow for large datasets when it could be parallelized.

### Location
`analyze-patterns.mjs:219-239`

### Issue
```javascript
const enriched = entries.map(e => {
  const reportData = reportPath ? parseReport(reportPath) : null;
  // ...
});
```

Synchronous file reads in a map operation process reports one at a time.

### Impact
**Low** - Slow analysis for 100+ applications

### Proposed Fix
Use parallel processing with chunking:

```javascript
async function enrichEntries(entries) {
  const CHUNK_SIZE = 10;
  const enriched = [];

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const chunkEnriched = await Promise.all(
      chunk.map(async e => {
        const reportMatch = e.report.match(/\]\(([^)]+)\)/);
        const reportPath = reportMatch ? join(CAREER_OPS, reportMatch[1]) : null;
        const reportData = reportPath ? await parseReportAsync(reportPath) : null;
        // ... rest of logic
        return enrichedEntry;
      })
    );
    enriched.push(...chunkEnriched);
  }

  return enriched;
}
```

---

## Issue 18: No YAML validation in doctor.mjs

**Labels:** `bug`, `priority:medium`, `dx`

### Description
The profile validation only checks for tabs and required field names using regex, but doesn't actually parse the YAML to catch syntax errors.

### Location
`doctor.mjs:113-132`

### Issue
```javascript
if (content.includes('\t')) {
  return { pass: false, label: 'config/profile.yml contains tabs' };
}
const requiredFields = ['name', 'target_role'];
const missing = requiredFields.filter(f => !new RegExp(`^${f}\\s*:`, 'm').test(content));
```

Invalid YAML syntax won't be caught until runtime when the agent tries to use it.

### Impact
**Medium** - Late failure detection, poor DX

### Proposed Fix
Install and use a YAML parser:

```json
// package.json
{
  "dependencies": {
    "yaml": "^2.3.4"
  }
}
```

```javascript
import YAML from 'yaml';

function checkProfile() {
  // ... existing checks ...

  try {
    const parsed = YAML.parse(content);

    // Validate required fields exist and have values
    if (!parsed.name || parsed.name === 'Jane Smith') {
      return {
        pass: false,
        label: 'config/profile.yml has placeholder data for name'
      };
    }

    return { pass: true, label: 'config/profile.yml valid' };
  } catch (err) {
    return {
      pass: false,
      label: `config/profile.yml has invalid YAML: ${err.message}`
    };
  }
}
```

---

## Summary

Total issues identified: **18**

### By Priority
- **High**: 3 issues (race condition, command injection potential, status inconsistency)
- **Medium**: 9 issues
- **Low**: 6 issues

### By Category
- **Bug**: 11 issues
- **Performance**: 3 issues
- **Security**: 1 issue
- **Enhancement**: 3 issues

### Recommended Action Order
1. Issue 1: Race condition (data loss risk)
2. Issue 3: Command injection (security)
3. Issue 4: Status normalization inconsistency (refactoring needed)
4. Issue 2: Font validation (silent failures)
5. Issue 9: Playwright error handling (DX)
6. Issue 6: Duplicate detection (functionality)
7. Issue 13: Add unit tests (testing infrastructure)
8. Issue 14: Code duplication (refactoring)
9. Remaining issues by priority/impact
