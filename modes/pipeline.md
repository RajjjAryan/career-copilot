# pipeline.md — URL Inbox Processing

> **Trigger**: User asks to process pending offers from the pipeline.
> **Input**: Pending items in `data/pipeline.md`.
> **Output**: Each pending URL evaluated via auto-pipeline, results tracked.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
view(path="data/pipeline.md")
```

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

```
view(path="data/pipeline.md")
```

Extract all `- [ ]` items from the "Pending" section. For each item, parse:
- Company name
- Role title
- URL
- Date found
- Source

### Step 2 — Count & Decide Strategy

- **1–2 URLs**: Process sequentially in the current context
- **3+ URLs**: Use `task` tool to process in parallel (up to 3 concurrent workers)

### Step 3a — Sequential Processing (1–2 URLs)

For each pending URL:

1. Extract the URL from the pipeline item
2. Run the full auto-pipeline (as defined in `modes/auto-pipeline.md`):
   - Fetch JD via `web_fetch`
   - Evaluate Blocks A–F
   - Save report
   - Generate PDF
   - Update tracker
3. After processing, update `data/pipeline.md`:
   - Move the item from "Pending" to "Processed"
   - Change `- [ ]` to `- [x]`
   - Add `Processed: {YYYY-MM-DD}` and `Score: {X.X}`

```
edit(path="data/pipeline.md",
  old_str="- [ ] [{Company} — {Role}]({URL}) | Found: {date} | Source: {source}",
  new_str="- [x] [{Company} — {Role}]({URL}) | Found: {date} | Processed: {YYYY-MM-DD} | Score: {X.X}")
```

### Step 3b — Parallel Processing (3+ URLs)

Dispatch workers using the `task` tool:

```
task(
  agent_type="general-purpose",
  name="pipeline-{company-slug}",
  description="Process {company} from pipeline",
  prompt="
    Process this offer through the full auto-pipeline:

    1. Read modes/_shared.md, modes/_profile.md, data/cv.md, data/article-digest.md
    2. Fetch JD from: {url}
    3. Run full evaluation (modes/evaluate.md) → save report
    4. Generate PDF (modes/pdf.md) → save to output/
    5. Output results as:
       COMPANY: {company}
       ROLE: {role}
       SCORE: {X.X}
       REPORT: {report-path}
       PDF: {pdf-path}
       TRACKER_LINE: | {###} | {Company} | {Role} | {Score} | Evaluated | {YYYY-MM-DD} | {report} | {pdf} | {url} |

    URL: {url}
    Company: {company}
    Role: {role}
  "
)
```

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
