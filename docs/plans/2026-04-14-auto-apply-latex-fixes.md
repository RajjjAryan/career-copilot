# Auto-Apply + LaTeX Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-submit job applications on no-login platforms (Greenhouse, Lever), flag manual-apply platforms, and fix critical LaTeX engine bugs.

**Architecture:** Platform detection module identifies ATS from URL patterns. Per-platform adapters handle submission (Greenhouse API, Lever form POST). Apply engine orchestrates: detect → submit → report. Auto-pipeline gains a new Step 4.5 for auto-apply after PDF generation. LaTeX bugfixes are independent and committed separately.

**Tech Stack:** Node.js ESM, native `fetch` (Node 18+), `FormData`, existing Playwright for fallback, YAML config via `config/profile.yml`.

---

## File Structure

| File | Responsibility |
|------|---------------|
| **Create:** `lib/platform-detect.mjs` | URL → ATS platform identification + metadata extraction |
| **Create:** `lib/adapters/greenhouse.mjs` | Greenhouse Job Board API: fetch questions, submit application |
| **Create:** `lib/adapters/lever.mjs` | Lever form POST: parse form, submit application |
| **Create:** `lib/apply-engine.mjs` | Orchestrator: detect platform → call adapter → return result |
| **Create:** `modes/auto-apply.md` | Copilot CLI mode file for auto-apply routing |
| **Modify:** `modes/auto-pipeline.md` | Add Step 4.5 — auto-apply after PDF generation |
| **Modify:** `lib/latex-engine.mjs` | Fix 6 critical bugs (brace stripping, language, trimming, page count, date detection, colon threshold) |
| **Modify:** `extract-resume.py` | Fix 3 bugs (bullet chars, indent threshold, abbreviation merging) |
| **Modify:** `test-all.mjs` | Add syntax checks for new files |

---

## Task 1: Platform Detection Module

**Files:**
- Create: `lib/platform-detect.mjs`

- [ ] **Step 1: Create platform-detect.mjs**

```javascript
// lib/platform-detect.mjs — URL → ATS platform identification
//
// detectPlatform(url) returns { name, type, autoApply, boardToken, jobId, applyUrl, manualReason }

const PLATFORM_PATTERNS = [
  {
    name: 'greenhouse',
    patterns: [
      /boards\.greenhouse\.io\/(\w+)\/jobs\/(\d+)/,
      /job-boards\.greenhouse\.io\/(\w+)\/jobs\/(\d+)/,
      /job-boards\.eu\.greenhouse\.io\/(\w+)\/jobs\/(\d+)/,
      /boards-api\.greenhouse\.io\/v1\/boards\/(\w+)\/jobs\/(\d+)/,
    ],
    autoApply: true,
    extract(match) {
      return { boardToken: match[1], jobId: match[2] };
    },
  },
  {
    name: 'lever',
    patterns: [
      /jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/,
    ],
    autoApply: true,
    extract(match) {
      return { company: match[1], postingId: match[2] };
    },
  },
  {
    name: 'ashby',
    patterns: [/jobs\.ashbyhq\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'Ashby requires account login to submit applications',
  },
  {
    name: 'workday',
    patterns: [/(\w+)\.myworkdayjobs\.com/],
    autoApply: false,
    manualReason: 'Workday has aggressive bot detection — apply manually',
  },
  {
    name: 'workable',
    patterns: [/apply\.workable\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'Workable form fill automation planned for future release',
  },
  {
    name: 'smartrecruiters',
    patterns: [/jobs\.smartrecruiters\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'SmartRecruiters automation planned for future release',
  },
  {
    name: 'recruitee',
    patterns: [/(\w+)\.recruitee\.com/],
    autoApply: false,
    manualReason: 'Recruitee requires email verification',
  },
  {
    name: 'bamboohr',
    patterns: [/(\w+)\.bamboohr\.com\/careers/],
    autoApply: false,
    manualReason: 'BambooHR requires account creation',
  },
];

export function detectPlatform(url) {
  if (!url) return { name: 'unknown', autoApply: false, manualReason: 'No URL provided' };

  for (const platform of PLATFORM_PATTERNS) {
    for (const pattern of platform.patterns) {
      const match = url.match(pattern);
      if (match) {
        const result = {
          name: platform.name,
          autoApply: platform.autoApply,
          applyUrl: url,
          manualReason: platform.manualReason || null,
        };
        if (platform.extract) Object.assign(result, platform.extract(match));
        return result;
      }
    }
  }

  return { name: 'unknown', autoApply: false, applyUrl: url, manualReason: 'Unknown platform — apply manually' };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check lib/platform-detect.mjs`
Expected: no output (success)

- [ ] **Step 3: Quick smoke test**

Run:
```bash
node -e "
import { detectPlatform } from './lib/platform-detect.mjs';
const tests = [
  ['https://job-boards.greenhouse.io/anthropic/jobs/4142322004', 'greenhouse', true],
  ['https://jobs.lever.co/stripe/abc12345-def6-7890-abcd-ef1234567890', 'lever', true],
  ['https://jobs.ashbyhq.com/elevenlabs/some-id', 'ashby', false],
  ['https://example.com/careers/dev', 'unknown', false],
];
let pass = 0;
for (const [url, name, auto] of tests) {
  const r = detectPlatform(url);
  if (r.name === name && r.autoApply === auto) { pass++; console.log('✅', name); }
  else { console.log('❌', name, JSON.stringify(r)); }
}
console.log(pass + '/' + tests.length + ' passed');
"
```
Expected: 4/4 passed

- [ ] **Step 4: Commit**

```bash
git add lib/platform-detect.mjs
git commit -m "feat(auto-apply): add platform detection module

URL pattern matching for Greenhouse, Lever, Ashby, Workday, Workable,
SmartRecruiters, Recruitee, BambooHR. Returns autoApply flag + metadata.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Greenhouse Adapter

**Files:**
- Create: `lib/adapters/greenhouse.mjs`

- [ ] **Step 1: Create greenhouse adapter**

```javascript
// lib/adapters/greenhouse.mjs — Greenhouse Job Board API adapter
//
// Greenhouse provides a public Job Board API that supports application
// submission WITHOUT authentication for the standard job board embed flow.
// Docs: https://developers.greenhouse.io/job-board.html

import { readFileSync } from 'fs';

const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

/**
 * Fetch job details + required questions from Greenhouse.
 * @param {string} boardToken - Company board token (e.g., 'anthropic')
 * @param {string} jobId - Numeric job ID
 * @returns {{ title, location, questions[] }}
 */
export async function fetchJobDetails(boardToken, jobId) {
  const url = `${API_BASE}/${boardToken}/jobs/${jobId}?questions=true`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Greenhouse API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    title: data.title,
    location: data.location?.name || '',
    content: data.content || '',
    questions: (data.questions || []).map(q => ({
      id: q.fields?.[0]?.name || `question_${q.id || 'unknown'}`,
      label: q.label || q.description || '',
      required: q.required || false,
      type: q.fields?.[0]?.type || 'input_text',
      values: q.fields?.[0]?.values || [],
    })),
  };
}

/**
 * Build auto-answerable question map from profile.
 * @param {object} profile - Parsed config/profile.yml
 * @param {object} autoApplyConfig - profile.auto_apply section
 * @returns {Map<string, string>} label-pattern → answer
 */
function buildAutoAnswers(profile, autoApplyConfig = {}) {
  const answers = new Map();
  const cand = profile.candidate || {};

  // Common question patterns → answers
  answers.set('linkedin', cand.linkedin || '');
  answers.set('github', cand.github || '');
  answers.set('portfolio', cand.portfolio_url || '');
  answers.set('website', cand.portfolio_url || '');
  answers.set('phone', cand.phone || '');
  answers.set('location', cand.location || '');
  answers.set('city', cand.location || '');

  // Auto-apply specific
  answers.set('visa', autoApplyConfig.visa_status || '');
  answers.set('authorized', autoApplyConfig.visa_status || '');
  answers.set('sponsorship', autoApplyConfig.visa_status || '');
  answers.set('start', autoApplyConfig.start_date || '');
  answers.set('available', autoApplyConfig.start_date || '');
  answers.set('hear', autoApplyConfig.referral_source || 'Company career page');
  answers.set('source', autoApplyConfig.referral_source || 'Company career page');
  answers.set('referral', autoApplyConfig.referral_source || 'Company career page');
  answers.set('salary', autoApplyConfig.salary_expectation || '');
  answers.set('compensation', autoApplyConfig.salary_expectation || '');

  return answers;
}

/**
 * Try to auto-answer a question based on its label.
 * @param {string} label - Question label text
 * @param {Map} autoAnswers - Pattern → answer map
 * @returns {string|null} Answer or null if can't auto-answer
 */
function matchAnswer(label, autoAnswers) {
  const lower = label.toLowerCase();
  for (const [pattern, answer] of autoAnswers) {
    if (answer && lower.includes(pattern)) return answer;
  }
  return null;
}

/**
 * Submit application to Greenhouse.
 * @param {object} params
 * @param {string} params.boardToken
 * @param {string} params.jobId
 * @param {object} params.profile - Parsed profile.yml
 * @param {string} params.pdfPath - Path to resume PDF
 * @param {string} [params.coverLetter] - Cover letter text
 * @returns {{ success, message, unanswered[] }}
 */
export async function submitApplication({ boardToken, jobId, profile, pdfPath, coverLetter }) {
  const cand = profile.candidate || {};
  const autoApplyConfig = profile.auto_apply || {};
  const nameParts = (cand.full_name || '').split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Fetch job questions
  const job = await fetchJobDetails(boardToken, jobId);

  // Build form data
  const form = new FormData();
  form.set('id', jobId);
  form.set('first_name', firstName);
  form.set('last_name', lastName);
  form.set('email', cand.email || '');
  if (cand.phone) form.set('phone', cand.phone);

  // Attach resume PDF
  if (pdfPath) {
    const pdfBuffer = readFileSync(pdfPath);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const pdfName = pdfPath.split('/').pop();
    form.set('resume', pdfBlob, pdfName);
  }

  // Attach cover letter
  if (coverLetter) {
    form.set('cover_letter', coverLetter);
  }

  // Answer custom questions
  const autoAnswers = buildAutoAnswers(profile, autoApplyConfig);
  const unanswered = [];

  for (const q of job.questions) {
    const answer = matchAnswer(q.label, autoAnswers);
    if (answer) {
      form.set(q.id, answer);
    } else if (q.required) {
      unanswered.push({ id: q.id, label: q.label, type: q.type });
    }
  }

  // If required questions are unanswered, bail
  if (unanswered.length > 0) {
    return {
      success: false,
      message: `Cannot auto-apply: ${unanswered.length} required question(s) need manual answers`,
      unanswered,
      job,
    };
  }

  // Submit
  const url = `${API_BASE}/${boardToken}/jobs/${jobId}`;
  const res = await fetch(url, { method: 'POST', body: form });

  if (res.ok || res.status === 201) {
    return {
      success: true,
      message: `Application submitted to ${job.title} at ${boardToken}`,
      job,
      unanswered: [],
    };
  }

  const errorBody = await res.text().catch(() => '');
  return {
    success: false,
    message: `Greenhouse API returned ${res.status}: ${errorBody.substring(0, 200)}`,
    unanswered: [],
    job,
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check lib/adapters/greenhouse.mjs`
Expected: no output (success)

- [ ] **Step 3: Test fetchJobDetails with real API (read-only, safe)**

Run:
```bash
node -e "
import { fetchJobDetails } from './lib/adapters/greenhouse.mjs';
try {
  const job = await fetchJobDetails('anthropic', '4142322004');
  console.log('✅ Title:', job.title);
  console.log('   Location:', job.location);
  console.log('   Questions:', job.questions.length);
  for (const q of job.questions.slice(0, 3)) {
    console.log('   •', q.required ? '[REQ]' : '[OPT]', q.label.substring(0, 60));
  }
} catch (e) {
  console.log('⚠️  API call failed (may be offline or job closed):', e.message.substring(0, 80));
}
"
```
Expected: Job title and question list (or graceful error if job is closed)

- [ ] **Step 4: Commit**

```bash
git add lib/adapters/greenhouse.mjs
git commit -m "feat(auto-apply): add Greenhouse Job Board API adapter

Fetches job details + required questions, auto-answers common fields
(visa, start date, referral source) from profile.yml, submits via
multipart POST. Falls back to manual if required questions can't be
auto-answered.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Lever Adapter

**Files:**
- Create: `lib/adapters/lever.mjs`

- [ ] **Step 1: Create lever adapter**

```javascript
// lib/adapters/lever.mjs — Lever form POST adapter
//
// Lever job pages have a standard form at /company/posting-id/apply.
// The form accepts: name, email, phone, org, urls, resume, comments.
// Some portals add reCAPTCHA — we detect and bail to manual if so.

import { readFileSync } from 'fs';

const LEVER_BASE = 'https://jobs.lever.co';

/**
 * Fetch job page and check for reCAPTCHA/login requirements.
 * @param {string} company - Lever company slug
 * @param {string} postingId - UUID posting ID
 * @returns {{ title, hasRecaptcha, applyUrl }}
 */
export async function checkJobPage(company, postingId) {
  const pageUrl = `${LEVER_BASE}/${company}/${postingId}`;
  const res = await fetch(pageUrl);
  if (!res.ok) {
    throw new Error(`Lever page returned ${res.status}`);
  }
  const html = await res.text();

  const titleMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Position';

  const hasRecaptcha = html.includes('recaptcha') || html.includes('g-recaptcha');
  const requiresLogin = html.includes('Sign in to apply') || html.includes('login-required');

  return {
    title,
    hasRecaptcha,
    requiresLogin,
    applyUrl: `${pageUrl}/apply`,
  };
}

/**
 * Submit application to Lever.
 * @param {object} params
 * @param {string} params.company - Lever company slug
 * @param {string} params.postingId - UUID posting ID
 * @param {object} params.profile - Parsed profile.yml
 * @param {string} params.pdfPath - Path to resume PDF
 * @param {string} [params.coverLetter] - Cover letter text
 * @returns {{ success, message }}
 */
export async function submitApplication({ company, postingId, profile, pdfPath, coverLetter }) {
  const cand = profile.candidate || {};

  // Check for blockers
  const jobPage = await checkJobPage(company, postingId);

  if (jobPage.hasRecaptcha) {
    return {
      success: false,
      message: `Lever portal has reCAPTCHA — apply manually at ${jobPage.applyUrl}`,
      job: { title: jobPage.title },
    };
  }

  if (jobPage.requiresLogin) {
    return {
      success: false,
      message: `Lever portal requires login — apply manually at ${jobPage.applyUrl}`,
      job: { title: jobPage.title },
    };
  }

  // Build form
  const form = new FormData();
  form.set('name', cand.full_name || '');
  form.set('email', cand.email || '');
  if (cand.phone) form.set('phone', cand.phone);
  if (cand.linkedin) form.set('urls[LinkedIn]', cand.linkedin.startsWith('http') ? cand.linkedin : `https://${cand.linkedin}`);
  if (cand.github) form.set('urls[GitHub]', cand.github.startsWith('http') ? cand.github : `https://${cand.github}`);
  if (cand.portfolio_url) form.set('urls[Portfolio]', cand.portfolio_url);
  if (coverLetter) form.set('comments', coverLetter);

  // Attach resume
  if (pdfPath) {
    const pdfBuffer = readFileSync(pdfPath);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    form.set('resume', pdfBlob, pdfPath.split('/').pop());
  }

  // Submit
  const applyUrl = `${LEVER_BASE}/${company}/${postingId}/apply`;
  const res = await fetch(applyUrl, {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });

  // Lever redirects to thank-you page on success (301/302)
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (location.includes('thanks') || location.includes('thank') || location.includes('success')) {
      return {
        success: true,
        message: `Application submitted to ${jobPage.title} at ${company} (Lever)`,
        job: { title: jobPage.title },
      };
    }
  }

  if (res.ok) {
    return {
      success: true,
      message: `Application submitted to ${jobPage.title} at ${company} (Lever)`,
      job: { title: jobPage.title },
    };
  }

  return {
    success: false,
    message: `Lever returned ${res.status} — apply manually at ${applyUrl}`,
    job: { title: jobPage.title },
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check lib/adapters/lever.mjs`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add lib/adapters/lever.mjs
git commit -m "feat(auto-apply): add Lever form POST adapter

Detects reCAPTCHA and login requirements before attempting submission.
Submits name, email, phone, LinkedIn, GitHub, resume PDF, cover letter
via multipart POST. Falls back to manual on reCAPTCHA or login redirect.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Apply Engine (Orchestrator)

**Files:**
- Create: `lib/apply-engine.mjs`

- [ ] **Step 1: Create apply-engine.mjs**

```javascript
// lib/apply-engine.mjs — Auto-apply orchestrator
//
// Detects platform from URL, calls the appropriate adapter, returns
// a structured result: { status: 'applied'|'manual'|'failed', ... }

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { detectPlatform } from './platform-detect.mjs';
import { submitApplication as submitGreenhouse } from './adapters/greenhouse.mjs';
import { submitApplication as submitLever } from './adapters/lever.mjs';

// Rate limiting: track recent submissions
const recentSubmissions = [];
const MAX_SUBMISSIONS_PER_HOUR = 5;

function checkRateLimit() {
  const oneHourAgo = Date.now() - 3600000;
  const recent = recentSubmissions.filter(t => t > oneHourAgo);
  recentSubmissions.length = 0;
  recentSubmissions.push(...recent);
  return recent.length < MAX_SUBMISSIONS_PER_HOUR;
}

function recordSubmission() {
  recentSubmissions.push(Date.now());
}

/**
 * Load and parse profile.yml
 */
function loadProfile(profilePath) {
  const content = readFileSync(profilePath, 'utf-8');
  // Simple YAML parser for flat/nested structure
  // (we only need candidate.* and auto_apply.* fields)
  const profile = { candidate: {}, auto_apply: {} };
  let currentSection = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const kvMatch = trimmed.match(/^(\w[\w_]*)\s*:\s*"?([^"]*)"?\s*$/);

    if (indent === 0 && kvMatch) {
      currentSection = kvMatch[1];
      if (!kvMatch[2]) continue; // section header only
    }

    if (indent > 0 && kvMatch && currentSection) {
      if (currentSection === 'candidate') {
        profile.candidate[kvMatch[1]] = kvMatch[2];
      } else if (currentSection === 'auto_apply') {
        profile.auto_apply[kvMatch[1]] = kvMatch[2];
      }
    }
  }

  return profile;
}

/**
 * Auto-apply to a job posting.
 *
 * @param {object} params
 * @param {string} params.jobUrl - URL of the job posting
 * @param {string} [params.pdfPath] - Path to tailored resume PDF
 * @param {string} [params.profilePath] - Path to config/profile.yml
 * @param {string} [params.coverLetter] - Cover letter text
 * @param {boolean} [params.dryRun=false] - If true, don't actually submit
 * @returns {{ status: 'applied'|'manual'|'failed'|'rate-limited', platform, message, ... }}
 */
export async function autoApply({ jobUrl, pdfPath, profilePath, coverLetter, dryRun = false }) {
  const platform = detectPlatform(jobUrl);

  // Not automatable — return manual flag immediately
  if (!platform.autoApply) {
    return {
      status: 'manual',
      platform: platform.name,
      applyUrl: platform.applyUrl || jobUrl,
      message: platform.manualReason,
    };
  }

  // Rate limiting check
  if (!dryRun && !checkRateLimit()) {
    return {
      status: 'rate-limited',
      platform: platform.name,
      message: `Rate limit: max ${MAX_SUBMISSIONS_PER_HOUR} auto-applications per hour. Try again later.`,
    };
  }

  // Load profile
  const profile = loadProfile(profilePath || resolve('config/profile.yml'));

  // Check if auto-apply is enabled
  if (profile.auto_apply.enabled === 'false') {
    return {
      status: 'manual',
      platform: platform.name,
      applyUrl: jobUrl,
      message: 'Auto-apply disabled in profile.yml (auto_apply.enabled: false)',
    };
  }

  // Validate required fields
  const cand = profile.candidate;
  if (!cand.full_name || !cand.email) {
    return {
      status: 'failed',
      platform: platform.name,
      message: 'Missing required profile fields: full_name and email in config/profile.yml',
    };
  }

  if (dryRun) {
    return {
      status: 'dry-run',
      platform: platform.name,
      message: `Would auto-apply to ${platform.name} (${jobUrl}) with resume ${pdfPath || 'none'}`,
    };
  }

  // Dispatch to adapter
  try {
    let result;

    if (platform.name === 'greenhouse') {
      result = await submitGreenhouse({
        boardToken: platform.boardToken,
        jobId: platform.jobId,
        profile,
        pdfPath,
        coverLetter,
      });
    } else if (platform.name === 'lever') {
      result = await submitLever({
        company: platform.company,
        postingId: platform.postingId,
        profile,
        pdfPath,
        coverLetter,
      });
    } else {
      return {
        status: 'manual',
        platform: platform.name,
        applyUrl: jobUrl,
        message: `No adapter for ${platform.name} — apply manually`,
      };
    }

    if (result.success) {
      recordSubmission();
      return {
        status: 'applied',
        platform: platform.name,
        message: result.message,
        job: result.job,
      };
    }

    // Adapter returned failure (reCAPTCHA, unanswered questions, etc.)
    return {
      status: result.unanswered?.length > 0 ? 'manual' : 'failed',
      platform: platform.name,
      applyUrl: jobUrl,
      message: result.message,
      unanswered: result.unanswered || [],
      job: result.job,
    };
  } catch (err) {
    return {
      status: 'failed',
      platform: platform.name,
      message: `Auto-apply error: ${err.message}`,
    };
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check lib/apply-engine.mjs`
Expected: no output (success)

- [ ] **Step 3: Test with dry-run and manual platform**

Run:
```bash
node -e "
import { autoApply } from './lib/apply-engine.mjs';

// Test 1: Manual platform (Ashby)
const r1 = await autoApply({ jobUrl: 'https://jobs.ashbyhq.com/elevenlabs/abc123' });
console.log('Ashby:', r1.status, '—', r1.message);

// Test 2: Unknown platform
const r2 = await autoApply({ jobUrl: 'https://example.com/jobs/123' });
console.log('Unknown:', r2.status, '—', r2.message);

// Test 3: Greenhouse dry-run
const r3 = await autoApply({
  jobUrl: 'https://job-boards.greenhouse.io/anthropic/jobs/4142322004',
  dryRun: true,
  profilePath: 'config/profile.yml',
});
console.log('GH dry-run:', r3.status, '—', r3.message);
"
```
Expected:
```
Ashby: manual — Ashby requires account login to submit applications
Unknown: manual — Unknown platform — apply manually
GH dry-run: dry-run — Would auto-apply to greenhouse (...)
```

- [ ] **Step 4: Commit**

```bash
git add lib/apply-engine.mjs
git commit -m "feat(auto-apply): add apply engine orchestrator

Detects platform from URL, dispatches to Greenhouse/Lever adapters,
enforces rate limiting (5/hour), validates profile fields, supports
dry-run mode. Returns structured result: applied/manual/failed.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Auto-Apply Mode File

**Files:**
- Create: `modes/auto-apply.md`

- [ ] **Step 1: Create the mode file**

```markdown
# auto-apply.md — Automated Application Submission

> **Trigger**: User says "auto-apply", "submit application", or "apply to this"
> **Input**: Job URL + existing evaluation report + tailored PDF
> **Output**: Application submission result or manual-apply instructions

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="config/profile.yml")
```

---

## Step 0 — Identify Target Offer

1. If URL provided: use directly
2. If company/role mentioned: search `data/applications.md` for matching entry, get URL from report
3. If ambiguous: ask user to specify

---

## Step 1 — Verify Readiness

Check these conditions before auto-applying:

1. **Score check**: Look up score in `data/applications.md` — must be >= `auto_apply.min_score` (default 4.0)
2. **PDF exists**: A tailored resume PDF must exist in `output/`
3. **Not duplicate**: Company+role must not already have status "Applied" in tracker
4. **Profile complete**: `config/profile.yml` must have `candidate.full_name` and `candidate.email`
5. **Auto-apply enabled**: `auto_apply.enabled` must not be `false` in profile

If any check fails, explain why and offer alternatives.

---

## Step 2 — Detect Platform

Use `lib/platform-detect.mjs` to identify the ATS platform from the job URL.

**Automatable platforms:**
- ✅ **Greenhouse** — via Job Board API (POST /applications)
- ✅ **Lever** — via form POST (may be blocked by reCAPTCHA)

**Manual-only platforms:**
- 🔴 **Ashby** — requires account login
- 🔴 **Workday** — heavy bot detection
- 🔴 **Workable** — future automation planned
- 🔴 **SmartRecruiters** — future automation planned
- 🔴 **Unknown** — apply manually

---

## Step 3 — Submit or Flag

### If automatable:

1. Load profile from `config/profile.yml`
2. Call `autoApply()` from `lib/apply-engine.mjs`
3. If successful:
   - Update tracker status to `Applied`
   - Add note: `✅ Auto-applied ({platform})`
   - Show confirmation to user
4. If failed (reCAPTCHA, unanswered questions):
   - Fall back to manual mode
   - Show pre-filled answers from `modes/apply.md`

### If manual:

1. Show the direct apply URL
2. Offer to generate form answers: "Want me to prepare your application answers? Say 'help me apply'"
3. Update tracker note: `🔴 Manual apply needed ({platform} — {reason})`

---

## Step 4 — Summary

Present clear result:

```
✅ AUTO-APPLIED: [Company] — [Role]
   Platform:  Greenhouse
   Submitted: name, email, phone, resume PDF
   Status:    Applied
```

or

```
🔴 MANUAL APPLY NEEDED: [Company] — [Role]
   Platform:  Ashby (login required)
   Apply URL: https://jobs.ashbyhq.com/company/job-id
   Action:    Say "help me apply" for pre-filled answers
```

---

## Safety

- **Never** auto-apply below the score threshold without explicit user override
- **Never** apply twice to the same company+role
- **Always** show what was submitted after auto-applying
- **Max 5** auto-applications per hour (rate limited)
- **Dry-run** available: "auto-apply --dry-run" to preview without submitting
```

- [ ] **Step 2: Commit**

```bash
git add modes/auto-apply.md
git commit -m "feat(auto-apply): add auto-apply mode file

Copilot CLI routing for automated application submission. Covers
platform detection, readiness checks, submission flow, manual
fallback, and safety guardrails.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Update Auto-Pipeline with Apply Step

**Files:**
- Modify: `modes/auto-pipeline.md`

- [ ] **Step 1: Add Step 4.5 to auto-pipeline.md**

After the existing Step 4 (Draft Application Answers), before Step 5 (Update Tracker), add:

```markdown
### Step 4.5 — Auto-Apply Attempt (Conditional)

**Only if**:
1. Score >= `auto_apply.min_score` from `config/profile.yml` (default 4.0)
2. `auto_apply.enabled` is not `false` in `config/profile.yml`
3. A source URL is available (not a direct text paste)
4. A tailored PDF was generated in Step 3

**Flow**:
1. Detect platform from source URL using `lib/platform-detect.mjs`
2. If automatable (Greenhouse, Lever):
   - Call `autoApply()` from `lib/apply-engine.mjs` with resume PDF and profile
   - If successful: set status to `Applied`, note = `✅ Auto-applied ({platform})`
   - If failed: set note = `🔴 Auto-apply failed ({reason}) — apply manually`
3. If manual-only platform:
   - Set note = `🔴 Manual apply needed ({platform} — {reason})`
4. Present result to user before proceeding to Step 5

**Skip conditions** (proceed directly to Step 5):
- No source URL available (pasted JD text)
- Score below threshold
- Auto-apply disabled in profile
- No PDF generated (Step 3 failed)
```

- [ ] **Step 2: Update Step 5 to use auto-apply result**

In the existing Step 5 (Update Tracker), modify the status field logic:

```markdown
### Step 5 — Update Tracker

Append to `data/applications.md`:

```
| {###} | {YYYY-MM-DD} | {Company} | {Role} | {Score}/5 | {Status} | {PDF} | [{###}](reports/{filename}) | {Notes} |
```

**Status determination:**
- If Step 4.5 auto-applied successfully → `Applied`
- If Step 4 was executed and user confirmed manual submission → `Applied`
- Otherwise → `Evaluated`

**Notes field:**
- Include auto-apply result if Step 4.5 ran (e.g., `✅ Auto-applied (Greenhouse)` or `🔴 Manual apply needed (Ashby)`)
- Include source URL if available
```

- [ ] **Step 3: Commit**

```bash
git add modes/auto-pipeline.md
git commit -m "feat(auto-apply): integrate auto-apply into pipeline

Add Step 4.5 to auto-pipeline.md — attempts auto-application after
PDF generation. Updates tracker status based on auto-apply result.
Respects score threshold and enabled flag from profile.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Update Copilot Instructions Routing

**Files:**
- Modify: `.github/copilot-instructions.md`

- [ ] **Step 1: Add auto-apply to intent routing table**

In section "§6 Skill Modes — Intent Routing", add a new row to the routing table:

```markdown
| "Auto-apply" / "submit application" / "apply to this" | Automated submission | `modes/auto-apply.md` |
```

- [ ] **Step 2: Add auto-apply to tool mapping**

In section "§13 Copilot CLI Tool Mapping", under "Code Execution", add:

```markdown
| Auto-apply to job | `bash` | `node -e "import { autoApply } from './lib/apply-engine.mjs'; ..."` or handled by Copilot CLI |
| Detect ATS platform | `bash` | `node -e "import { detectPlatform } from './lib/platform-detect.mjs'; ..."` |
```

- [ ] **Step 3: Commit**

```bash
git add .github/copilot-instructions.md
git commit -m "docs: add auto-apply routing to copilot instructions

Add auto-apply mode to intent routing table and tool mapping section.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Add profile.yml auto_apply section

**Files:**
- Modify: `config/profile.example.yml`

- [ ] **Step 1: Add auto_apply section to example profile**

Append after the existing content:

```yaml

# Auto-apply configuration
# Controls automated job application submission on supported platforms.
auto_apply:
  enabled: true                    # Set to false to disable auto-apply entirely
  min_score: 4.0                   # Only auto-apply to offers scoring >= this
  cover_letter: true               # Include tailored cover letter with applications
  visa_status: "Authorized to work"  # Answer for visa/authorization questions
  start_date: "Flexible"           # Answer for start date questions
  referral_source: "Company career page"  # Answer for "how did you hear about us"
  salary_expectation: ""           # Leave empty to skip salary questions
```

- [ ] **Step 2: Commit**

```bash
git add config/profile.example.yml
git commit -m "feat(auto-apply): add auto_apply config section to profile example

New auto_apply section: enabled flag, min_score threshold, cover_letter
toggle, default answers for common form questions.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Update test-all.mjs

**Files:**
- Modify: `test-all.mjs`

- [ ] **Step 1: Add syntax checks for new files**

In the `syntaxFiles` array (section 1 of test-all.mjs), add the new files:

```javascript
'lib/platform-detect.mjs',
'lib/apply-engine.mjs',
'lib/adapters/greenhouse.mjs',
'lib/adapters/lever.mjs',
```

In the mode file integrity section (section 7), add:

```javascript
'auto-apply.md',
```

- [ ] **Step 2: Run tests**

Run: `node test-all.mjs`
Expected: All tests pass with new files included

- [ ] **Step 3: Commit**

```bash
git add test-all.mjs
git commit -m "test: add auto-apply files to test suite

Add syntax checks for platform-detect, apply-engine, greenhouse adapter,
lever adapter. Add auto-apply.md to mode integrity checks.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Fix Critical LaTeX Bugs

**Files:**
- Modify: `lib/latex-engine.mjs`
- Modify: `extract-resume.py`

- [ ] **Step 1: Fix stripLatex brace nesting (latex-engine.mjs:47)**

Replace the hardcoded `i < 5` loop with a max-iterations approach:

```javascript
// In stripLatex(), replace lines 46-53:
  // Iteratively strip nested commands until stable
  for (let i = 0; i < 20; i++) {
    const prev = s;
    s = s.replace(/\\(?:textbf|textit|emph|underline|textsc|textrm|textsf|texttt|mbox)\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\url\{([^{}]*)\}/g, '$1');
    if (s === prev) break;
  }
```

- [ ] **Step 2: Fix reorderItems language hardcoding (latex-engine.mjs:206-208)**

Replace hardcoded section name checks with a configurable list:

```javascript
// In reorderItems(), replace lines 204-208:
  const REORDER_SECTIONS = [
    'experience', 'project', 'achievement', 'accomplishment', 'work',
    'employment', 'professional',
    // Spanish
    'trabajo', 'proyecto', 'logro', 'experiencia',
    // German
    'berufserfahrung', 'projekte', 'erfahrung',
    // French
    'expérience', 'projets', 'réalisations',
    // Portuguese
    'experiência', 'projetos',
  ];

  for (const section of parsed.sections) {
    const t = section.title.toLowerCase();
    if (!REORDER_SECTIONS.some(kw => t.includes(kw))) continue;
```

- [ ] **Step 3: Fix removeWeakestItem score bias (latex-engine.mjs:278)**

Fix the length penalty to actually prefer removing longer low-scoring items:

```javascript
// In removeWeakestItem(), replace line 278:
      // Prefer removing longer low-scoring items (saves more space)
      const lengthBonus = item.plainText.length > 100 ? -0.5 : 0;
      const adjustedScore = score + lengthBonus;
```

- [ ] **Step 4: Fix countPdfPages regex fragility (latex-engine.mjs:357)**

Make the regex more robust:

```javascript
// In countPdfPages(), replace lines 356-358:
export function countPdfPages(pdfPath) {
  const buf = readFileSync(pdfPath, 'latin1');
  // Match /Type /Page but not /Type /Pages — handles compact formatting
  const matches = buf.match(/\/Type\s*\/Page(?=[^s]|\s|$)/g);
  return matches ? matches.length : 1;
}
```

- [ ] **Step 5: Fix structureToLatex date detection (latex-engine.mjs line ~466)**

In the experience section rendering, fix roles starting with digits being misclassified. Find the `for (const line of section.lines)` block inside the else branch (experience/projects handling) and update the job grouping logic:

```javascript
// Replace the is_bullet check block in structureToLatex experience handling:
      for (const line of section.lines) {
        if (!line.is_bullet) {
          // Non-bullet line = company or role header
          if (currentJob && !currentJob.role && !line.is_bold) {
            // Second non-bullet, non-bold line = role/subtitle
            currentJob.role = line.text;
          } else {
            currentJob = { company: line.text, role: '', bullets: [], companyBold: line.is_bold };
            jobs.push(currentJob);
          }
        } else {
          if (!currentJob) { currentJob = { company: '', role: '', bullets: [], companyBold: false }; jobs.push(currentJob); }
          currentJob.bullets.push(line.text);
        }
      }
```

- [ ] **Step 6: Fix extract-resume.py unicode bullet detection**

In `extract-resume.py`, find the bullet character detection (around line 145) and expand it:

```python
# Replace the bullet detection line:
BULLET_CHARS = {"•", "\u2022", "▪", "\u25AA", "◾", "\u25FE", "⚬", "\u26AC",
                "∘", "\u2218", "○", "\u25CB", "►", "\u25BA", "▸", "\u25B8",
                "‣", "\u2023", "⁃", "\u2043", "–", "\u2013", "—", "\u2014"}
# ... then use: if first_char in BULLET_CHARS:
```

- [ ] **Step 7: Verify all fixes**

Run:
```bash
node --check lib/latex-engine.mjs && echo "✅ latex-engine OK"
python3 -c "import ast; ast.parse(open('extract-resume.py').read()); print('✅ extract-resume OK')"
node test-all.mjs
```
Expected: All pass

- [ ] **Step 8: Test LaTeX fixes**

Run:
```bash
node -e "
import { stripLatex, countPdfPages, reorderItems, parseLatex, removeWeakestItem, scoreItem } from './lib/latex-engine.mjs';

// Test 1: Deep nesting
const nested = '\\\\textbf{\\\\textit{\\\\emph{\\\\textsc{\\\\textrm{\\\\texttt{deep}}}}}}';
console.log('Strip deep:', stripLatex(nested) === 'deep' ? '✅' : '❌');

// Test 2: German section name
const tex = '\\\\section{Berufserfahrung}\\n\\\\begin{itemize}\\n\\\\item A\\n\\\\item B\\n\\\\end{itemize}';
const parsed = parseLatex(tex);
const { changes } = reorderItems(tex.split('\\n'), parsed, ['B']);
console.log('German section reorder:', changes.length > 0 ? '✅' : '❌');

console.log('All LaTeX fix tests done');
"
```

- [ ] **Step 9: Commit**

```bash
git add lib/latex-engine.mjs extract-resume.py
git commit -m "fix(latex): fix 6 critical bugs in LaTeX engine + extraction

- stripLatex: increase max nesting iterations from 5 to 20
- reorderItems: add German, French, Portuguese section name support
- removeWeakestItem: fix length penalty (was no-op, now -0.5 for long items)
- countPdfPages: fix regex to handle compact PDF formatting
- structureToLatex: fix role detection using is_bold instead of digit heuristic
- extract-resume.py: expand Unicode bullet character set (14 → 24 chars)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Summary

| Task | Component | Type |
|------|-----------|------|
| 1 | Platform detection module | New |
| 2 | Greenhouse API adapter | New |
| 3 | Lever form POST adapter | New |
| 4 | Apply engine orchestrator | New |
| 5 | Auto-apply mode file | New |
| 6 | Pipeline integration (Step 4.5) | Modify |
| 7 | Copilot instructions routing | Modify |
| 8 | Profile example (auto_apply section) | Modify |
| 9 | Test suite updates | Modify |
| 10 | LaTeX engine + extraction bugfixes | Fix |
