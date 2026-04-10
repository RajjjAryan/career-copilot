# batch.md — Batch Processing (Parallel Evaluation)

> **Trigger**: User asks to evaluate multiple offers at once.
> **Input**: URLs from `batch/batch-input.tsv`, pipeline.md, or user-provided list.
> **Output**: Individual reports + PDFs + tracker updates for each offer.

---

## Architecture

```
Copilot CLI (Conductor)
  │
  │  Reads batch-input.tsv or pipeline.md URLs
  │  Dispatches parallel sub-agents via `task` tool
  │
  ├─ task("eval-acme")    → report .md + PDF + tracker-line
  ├─ task("eval-stripe")  → report .md + PDF + tracker-line
  ├─ task("eval-vercel")  → report .md + PDF + tracker-line
  │     (up to 3 parallel)
  │
  └─ Merge: tracker-additions → applications.md + summary
```

Each worker is a `task` sub-agent with full context. The conductor only orchestrates.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="cv.md")
```

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

```
view(path="batch/batch-input.tsv")
view(path="batch/batch-state.tsv")   # if exists — skip completed items
```

### Step 2 — Fetch JDs

For each pending URL, fetch the job description:

**For SPA-hosted pages (Ashby, Lever, Workday):**
```
browser_navigate(url="{url}")
browser_snapshot()
```

Extract the JD text from the structured accessibility snapshot.

**For static pages or API-accessible URLs:**
```
web_fetch(url="{url}")
```

Save JD text to `/tmp/batch-jd-{id}.txt` for the worker.

### Step 3 — Dispatch Workers

For each pending URL, dispatch a sub-agent using the `task` tool:

```
task(
  agent_type="general-purpose",
  mode="background",
  name="eval-{company-slug}",
  description="Evaluate {company}",
  prompt="
    You are a career-copilot batch worker evaluating a job offer.

    ## Your task
    1. Read these files: cv.md, modes/_shared.md, modes/_profile.md
    2. Read the JD from: /tmp/batch-jd-{id}.txt (or fetch from {url})
    3. Follow the FULL evaluation pipeline from batch/batch-prompt.md
    4. Produce:
       a. Report → reports/{###}-{company-slug}-{YYYY-MM-DD}.md
       b. PDF → output/cv-{company-slug}-{YYYY-MM-DD}.pdf
       c. Tracker line → batch/tracker-additions/{id}.tsv

    Company: {company}
    URL: {url}
    Report number: {###}
    Date: {YYYY-MM-DD}
    Batch ID: {id}
  "
)
```

**Fallback when sub-agents are unavailable:**
- Process each pending URL sequentially in the current context.
- Reuse the exact same worker steps (`batch/batch-prompt.md`) one item at a time.
- Keep `batch-state.tsv` updated exactly as in parallel mode.

**Parallelism rules:**
- Dispatch up to **3 workers in parallel** using multiple `task` calls in one response
- Wait for all to complete before dispatching next batch of 3
- Update `batch/batch-state.tsv` after each completion

**Rate limiting:**
- Wait **2 seconds** between dispatching each batch of workers to avoid overwhelming job board APIs
- If a `web_fetch` or `browser_navigate` returns a 429 (rate limited), wait **10 seconds** then retry
- If fetching from the same domain (e.g., multiple Greenhouse URLs), space requests **3 seconds** apart
- Maximum **3 concurrent workers** — do not increase even if system resources allow it

### Step 4 — Collect Results & Retry

After each worker completes:

1. Read the worker result with `read_agent`
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

After all workers complete:

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
| JD behind login | Use `browser_navigate` first. If login wall persists → `failed` | ❌ No |
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
