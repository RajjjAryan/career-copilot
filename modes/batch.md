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
    You are a career-ops batch worker evaluating a job offer.

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

**Parallelism rules:**
- Dispatch up to **3 workers in parallel** using multiple `task` calls in one response
- Wait for all to complete before dispatching next batch of 3
- Update `batch/batch-state.tsv` after each completion

### Step 4 — Collect Results

After each worker completes:

1. Read the worker result with `read_agent`
2. Verify report and PDF were created
3. Update `batch/batch-state.tsv` with status, score, paths
4. Log any errors

### Step 5 — Merge Tracker

After all workers complete:

```bash
node merge-tracker.mjs
```

This consolidates `batch/tracker-additions/*.tsv` into `data/applications.md`.

---

## Error Handling

| Error | Recovery |
|-------|----------|
| URL inaccessible | Worker fails → conductor marks `failed`, continues |
| JD behind login | Use `browser_navigate` to render page, extract JD from snapshot. If login required → `failed` |
| Worker crashes | Mark `failed`, continue. Re-run batch to retry failed items |
| PDF generation fails | Report .md saved. PDF marked as ❌ in tracker |
| All workers fail | Check `npm run doctor` for setup issues |

- **Individual failures do NOT block other items** — each URL is independent
- **Resumability**: Running batch again skips completed items, retries failed ones
- **Timeout**: If a worker exceeds 5 minutes, mark as `failed`

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
