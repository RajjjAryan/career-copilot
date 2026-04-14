# pipeline.md — URL Inbox Processing

> **Trigger**: User asks to process pending offers from the pipeline.
> **Input**: Pending items in `data/pipeline.md`.
> **Output**: Each pending URL evaluated via auto-pipeline, results tracked.

---

## Prerequisites

Read the following files for context: `modes/_shared.md`, `modes/_profile.md` (if it exists), `cv.md`, `data/pipeline.md`.

---

## Pipeline Format

`data/pipeline.md` expected structure:

```markdown
# Job Pipeline

## Pending
- [ ] [Acme — Senior Backend Engineer](https://...) | Found: 2024-01-15 | Source: scan
- [ ] [BigCo — Staff ML Engineer](https://...) | Found: 2024-01-16 | Source: manual

## Processed
- [x] [StartupX — Backend Lead](https://...) | Found: 2024-01-10 | Processed: 2024-01-12 | Score: 4.2
```

---

## Processing Steps

### Step 1 — Read Pipeline

Read `data/pipeline.md`.

Extract all `- [ ]` items from the "Pending" section. For each item, parse:
- Company name
- Role title
- URL
- Date found
- Source

### Step 2 — Count & Decide Strategy

- **1–2 URLs**: Process sequentially in the current context
- **3+ URLs**: If sub-agent dispatch is available, process in parallel (up to 3 concurrent workers). Otherwise, process sequentially.

### Step 3a — Sequential Processing (1–2 URLs)

For each pending URL:

1. Extract the URL from the pipeline item
2. Run the full auto-pipeline (as defined in `modes/auto-pipeline.md`):
   - Fetch the JD (for static pages, use a simple HTTP fetch; for SPAs use browser automation if available)
   - Evaluate Blocks A–F
   - Save report
   - Generate PDF
   - Update tracker
3. After processing, update `data/pipeline.md`:
   - Move the item from "Pending" to "Processed"
   - Change `- [ ]` to `- [x]`
   - Add `Processed: {YYYY-MM-DD}` and `Score: {X.X}`

Replace the pending line:
```
- [ ] [{Company} — {Role}]({URL}) | Found: {date} | Source: {source}
```
with:
```
- [x] [{Company} — {Role}]({URL}) | Found: {date} | Processed: {YYYY-MM-DD} | Score: {X.X}
```

### Step 3b — Parallel Processing (3+ URLs)

If your tool supports sub-agent dispatch (e.g., Copilot CLI's `task()` tool), dispatch one worker per offer with full context. Otherwise, process each offer sequentially in the current session.

Each worker should receive:
- **Files to read**: `modes/_shared.md`, `modes/_profile.md`, `cv.md`, `article-digest.md`
- **JD source**: the URL to fetch from
- **Instructions**: Run the full evaluation pipeline from `modes/evaluate.md`, then generate a PDF via `modes/pdf.md`
- **Expected outputs**:
  - Company name, role, score
  - Report path (saved to `reports/`)
  - PDF path (saved to `output/`)
  - Tracker line for `data/applications.md`
- **Metadata**: URL, company, role

Dispatch up to 3 workers simultaneously. After each completes:
- Update `data/pipeline.md` (move item to Processed)
- Append tracker line to `data/applications.md`

### Step 4 — Post-Processing

After all items are processed:

1. Verify all items moved from Pending to Processed in `data/pipeline.md`
2. Verify all tracker entries added to `data/applications.md`
3. Generate summary

---

## Summary Output

```markdown
---
## 📋 Pipeline Processing Complete

| # | Company | Role | Score | Report | PDF |
|---|---------|------|-------|--------|-----|
| 1 | {company} | {role} | {X.X}/5 | ✅ | ✅ |
| 2 | {company} | {role} | {X.X}/5 | ✅ | ❌ |
| 3 | {company} | {role} | {X.X}/5 | ✅ | ✅ |

### Summary
- **Processed**: {n}/{total}
- **Average Score**: {X.X}/5
- **Top Pick**: {company} — {role} ({X.X}/5)
- **Remaining Pending**: {n}

### Next Steps
- Run `compare` mode to rank processed offers
- Review individual reports in reports/
---
```
