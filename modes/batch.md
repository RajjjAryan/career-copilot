# batch.md — Batch Processing

> **Trigger**: User asks to evaluate multiple offers at once.
> **Input**: URLs from `batch/batch-input.tsv` or a user-provided file.
> **Output**: Individual reports + PDFs + tracker updates for each offer.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
```

---

## Input Format

### batch/batch-input.tsv

```
url\tcompany\tnotes
https://boards.greenhouse.io/acme/jobs/123\tAcme Corp\tReferred by John
https://lever.co/bigco/jobs/456\tBigCo\tFound on LinkedIn
```

If user provides a different file, read it instead. Accept TSV, CSV, or one-URL-per-line formats.

---

## State Management

### batch/batch-state.tsv

Tracks processing state for resumability:

```
url\tstatus\tstarted_at\tcompleted_at\treport_path\tpdf_path\terror
https://...\tcompleted\t2024-01-15T10:00:00\t2024-01-15T10:03:00\treports/007-acme-2024-01-15.md\toutput/cv-acme-2024-01-15.pdf\t
https://...\tfailed\t2024-01-15T10:00:00\t2024-01-15T10:01:30\t\t\tTimeout fetching JD
https://...\tpending\t\t\t\t\t
```

Statuses: `pending`, `in_progress`, `completed`, `failed`, `skipped`

---

## Processing Pipeline

### Step 1 — Read Input

```
view(path="batch/batch-input.tsv")
```

Or read the user-specified file.

### Step 2 — Initialize/Resume State

Check if `batch/batch-state.tsv` exists:

- **If exists**: Read it, skip items with status `completed`
- **If not exists**: Create it from the input file with all items as `pending`

```
view(path="batch/batch-state.tsv")  # if exists
```

### Step 3 — Process Each URL

For each pending/failed URL, dispatch a worker using the `task` tool:

```
task(
  agent_type="general-purpose",
  name="eval-{company-slug}",
  description="Evaluate {company} offer",
  prompt="
    You are evaluating a job offer. Follow these steps:

    1. Read modes/_shared.md, modes/_profile.md, data/cv.md, data/article-digest.md
    2. Fetch the JD from: {url}
    3. Follow modes/evaluate.md to produce a full A-F evaluation
    4. Follow modes/pdf.md to generate a tailored PDF
    5. Save report to reports/{###}-{company-slug}-{YYYY-MM-DD}.md
    6. Save PDF to output/cv-{company-slug}-{YYYY-MM-DD}.pdf
    7. Output a TSV line for the tracker:
       | {###} | {Company} | {Role} | {Score} | Evaluated | {YYYY-MM-DD} | {report-path} | {pdf-path} | {url} |

    Company: {company}
    URL: {url}
    Notes: {notes}
  "
)
```

**Parallelism rules:**
- Dispatch up to 3 workers in parallel using multiple `task` calls
- Wait for all to complete before dispatching next batch
- Update `batch/batch-state.tsv` after each completion

### Step 4 — Update State

After each worker completes (success or failure):

```
edit(path="batch/batch-state.tsv", ...)
```

Update the relevant row with:
- `status`: `completed` or `failed`
- `completed_at`: current timestamp
- `report_path`: path to generated report (if success)
- `pdf_path`: path to generated PDF (if success)
- `error`: error message (if failure)

### Step 5 — Merge Tracker

After all workers complete, merge all tracker additions into `data/applications.md`:

```
edit(path="data/applications.md", ...)
```

Append all TSV lines from completed workers.

---

## Error Handling

- **Individual failures do NOT block other items** — each URL is independent
- **Retry failed items**: If a URL fails, mark as `failed` and continue
- **Resumability**: Running batch mode again will skip completed items and retry failed ones
- **Timeout**: If a worker doesn't complete within 5 minutes, mark as `failed` with timeout error

---

## Summary Output

```markdown
---
## 📦 Batch Processing Complete

| # | Company | Role | Score | Status | Report | PDF |
|---|---------|------|-------|--------|--------|-----|
| 1 | {company} | {role} | {X.X}/5 | ✅ Completed | {report link} | {pdf link} |
| 2 | {company} | {role} | — | ❌ Failed | — | — |
| 3 | {company} | {role} | {X.X}/5 | ✅ Completed | {report link} | {pdf link} |

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
- Retry failed items by running `batch` mode again
---
```
