# batch.md — Batch Processing (Parallel Evaluation)

> **Trigger**: User asks to evaluate multiple offers at once.
> **Input**: URLs from `batch/batch-input.tsv`, pipeline.md, or user-provided list.
> **Output**: Individual reports + PDFs + tracker updates for each offer.

---

## Architecture

```
Conductor (main session)
  │
  │  Reads batch-input.tsv or pipeline.md URLs
  │  Dispatches parallel workers (if sub-agents available)
  │
  ├─ Worker 1 → report + PDF + tracker-line
  ├─ Worker 2 → report + PDF + tracker-line
  ├─ Worker 3 → report + PDF + tracker-line
  │     (up to 3 parallel)
  │
  └─ Merge: tracker-additions → applications.md + summary
```

Each worker processes one offer with full context. The conductor only orchestrates.

---

## Prerequisites

Read the following files for context: `modes/_shared.md`, `modes/_profile.md` (if it exists), `cv.md`.

---

## Files

```
batch/
  batch-input.tsv               # Input URLs (manual or from scan)
  batch-state.tsv               # Processing state (auto-managed, gitignored)
  batch-prompt.md               # Self-contained worker prompt
  logs/                         # Per-offer logs (gitignored)
  tracker-additions/            # Tracker lines for merge (gitignored)
```

---

## Input Format

### batch/batch-input.tsv

```
id	url	source	notes
1	https://boards.greenhouse.io/acme/jobs/123	scan	Found via portal scan
2	https://lever.co/bigco/jobs/456	linkedin	Referred by John
3	https://jobs.ashbyhq.com/startup/abc	manual	Interesting role
```

If user provides a different file, read it. Accept TSV, CSV, or one-URL-per-line formats.

---

## State Management

### batch/batch-state.tsv

Tracks processing for resumability:

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	failed	2026-...	2026-...	-	-	Timeout	1
3	https://...	pending	-	-	-	-	-	0
```

Statuses: `pending`, `in_progress`, `completed`, `failed`, `skipped`

---

## Processing Pipeline

### Step 1 — Read Input & Resume State

Read `batch/batch-input.tsv` and, if it exists, `batch/batch-state.tsv` (skip completed items).

### Step 2 — Fetch JDs

For each pending URL, fetch the job description:

**For SPA-hosted pages (Ashby, Lever, Workday):**

Navigate to the URL in a browser and read the page content. Use browser automation (e.g. Playwright) if available; otherwise try a direct URL fetch.

Extract the JD text from the page content.

**For static pages or API-accessible URLs:**

Fetch the URL directly (for static pages, use a simple HTTP fetch; for SPAs use browser automation if available).

Save the extracted JD text for the worker to use during evaluation.

### Step 3 — Dispatch Workers

For each pending URL, dispatch a worker with the following context:

If your tool supports sub-agent dispatch (e.g., Copilot CLI's `task()` tool), dispatch one worker per offer with full context. Otherwise, process each offer sequentially in the current session.

Each worker should receive:
- **Files to read**: `cv.md`, `modes/_shared.md`, `modes/_profile.md`
- **JD source**: the saved JD text for this item, or the URL to fetch it from
- **Instructions**: Follow the full evaluation pipeline from `batch/batch-prompt.md`
- **Expected outputs**:
  - Report → `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
  - PDF → `output/cv-{company-slug}-{YYYY-MM-DD}.pdf`
  - Tracker line → `batch/tracker-additions/{id}.tsv`
- **Metadata**: Company name, URL, report number, date, batch ID

**Parallelism rules:**
- Dispatch up to **3 workers in parallel** using multiple `task` calls in one response
- Wait for all to complete before dispatching next batch of 3
- Update `batch/batch-state.tsv` after each completion

**Rate limiting:**
- Wait **2 seconds** between dispatching each batch of workers to avoid overwhelming job board APIs
- If a URL fetch returns a 429 (rate limited), wait **10 seconds** then retry
- If fetching from the same domain (e.g., multiple Greenhouse URLs), space requests **3 seconds** apart
- Maximum **3 concurrent workers** — do not increase even if system resources allow it

### Step 4 — Collect Results & Retry

After each worker completes:

1. Read the worker result
2. Verify report and PDF were created
3. Update `batch/batch-state.tsv` with status, score, paths
4. Log any errors

**Retry logic for failed items:**
- After all items in the batch are processed, check `batch-state.tsv` for `failed` items
- Retry failed items up to **2 additional times** (3 total attempts)
- Increment the `retries` column in `batch-state.tsv` each attempt
- Wait **5 seconds** before each retry attempt
- If an item fails 3 times, mark it as `failed` permanently with the last error message
- Do NOT retry items that failed due to: login required, page not found (404), or job listing removed

### Step 5 — Merge Tracker

After all workers complete, run:

```bash
node merge-tracker.mjs
```

This consolidates `batch/tracker-additions/*.tsv` into `data/applications.md`.

---

## Error Handling & Retry Policy

| Error | Recovery | Retryable? |
|-------|----------|-----------|
| URL inaccessible / timeout | Wait 5s, retry up to 2 more times | ✅ Yes |
| Rate limited (429) | Wait 10s, retry | ✅ Yes |
| JD behind login | Use browser automation first. If login wall persists → `failed` | ❌ No |
| Page not found (404) | Mark `failed`, listing likely removed | ❌ No |
| Worker crashes | Mark `failed`, retry in next pass | ✅ Yes |
| PDF generation fails | Report .md saved. PDF marked as ❌ in tracker | ✅ Yes (PDF only) |
| All workers fail | Check `npm run doctor` for setup issues | — |

- **Individual failures do NOT block other items** — each URL is independent
- **Resumability**: Running batch again skips completed items, retries failed ones
- **Timeout**: If a worker exceeds 5 minutes, mark as `failed`
- **Max retries**: 3 total attempts per item (1 initial + 2 retries)
- **Backoff**: 5 second delay between retry attempts, 10 seconds after rate limit

---

## Summary Output

```markdown
---
## 📦 Batch Processing Complete

| # | Company | Role | Score | Status | Report | PDF |
|---|---------|------|-------|--------|--------|-----|
| 1 | Acme | Staff Engineer | 4.2/5 | ✅ | [001](reports/001-...) | ✅ |
| 2 | BigCo | Senior SDE | — | ❌ Failed | — | — |
| 3 | Startup | ML Engineer | 4.5/5 | ✅ | [003](reports/003-...) | ✅ |

### Summary
- **Total**: {n} offers
- **Completed**: {n} ✅
- **Failed**: {n} ❌
- **Skipped**: {n} ⏭️
- **Average Score**: {X.X}/5

### Failed Items
| URL | Error |
|-----|-------|
| {url} | {error message} |

### Next Steps
- Run `compare` mode to rank completed evaluations
- Retry failed items by running batch again
---
```
