# Architecture

## System Overview

```
                    ┌─────────────────────────────────┐
                    │      GitHub Copilot CLI Agent    │
                    │ (reads copilot-instructions.md   │
                    │        + modes/*.md)             │
                    └──────────┬──────────────────────┘
                               │
            ┌──────────────────┼──────────────────────┐
            │                  │                       │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌───────────▼────────┐
     │ Single Eval  │   │ Portal Scan │   │   Batch Process    │
     │ (auto-pipe)  │   │  (scan.md)  │   │   (batch.md)       │
     └──────┬──────┘   └──────┬──────┘   └───────────┬────────┘
            │                  │                       │
            │           ┌──────▼──────┐          ┌────▼─────┐
            │           │ pipeline.md │          │ N workers│
            │           │ (URL inbox) │          │ (task tool)
            │           └─────────────┘          └────┬─────┘
            │                                          │
     ┌──────▼──────────────────────────────────────────▼──────┐
     │                    Output Pipeline                      │
     │  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
     │  │ Report.md│  │  PDF (HTML  │  │ Tracker TSV       │  │
     │  │ (A-F eval)│  │  → Playwright)│  │ (merge-tracker)  │  │
     │  └──────────┘  └────────────┘  └───────────────────┘  │
     └────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  data/applications.md │
                    │  (canonical tracker)  │
                    └──────────────────────┘
```

## Evaluation Flow (Single Offer)

1. **Input**: User pastes JD text or URL
2. **Extract**: `web_fetch` tool extracts JD from URL
3. **Classify**: Detect archetype (Backend/Systems, Frontend, AI/ML, DevOps/SRE, PM, Solutions Architect)
4. **Evaluate**: 6 blocks (A-F):
   - A: Role summary
   - B: CV match (gaps + mitigation)
   - C: Level strategy
   - D: Comp research (web_search)
   - E: CV personalization plan
   - F: Interview prep (STAR stories)
5. **Score**: Weighted average across dimensions (1-5)
6. **Report**: Save as `reports/{num}-{company}-{date}.md`
7. **PDF**: Generate ATS-optimized CV (`generate-pdf.mjs`)
8. **Track**: Write TSV to `batch/tracker-additions/`, auto-merged

## Batch Processing

The batch system processes multiple offers in parallel using the `task` tool:

```
data/pipeline.md    →  batch mode     →  N × task agents
(URL inbox)            (modes/batch.md)   (general-purpose)
                           │
                    tracker-additions/
                    (TSV per evaluation)
```

Each worker is a `general-purpose` task agent that receives the batch-prompt.md as context. Workers produce:
- Report .md
- PDF
- Tracker TSV line

## Data Flow

```
cv.md                       →  Evaluation context
article-digest.md           →  Proof points for matching
config/profile.yml          →  Candidate identity
portals.yml                 →  Scanner configuration
templates/states.yml        →  Canonical status values
templates/cv-template.html  →  PDF generation template
```

## File Naming Conventions

- Reports: `{###}-{company-slug}-{YYYY-MM-DD}.md` (3-digit zero-padded)
- PDFs: `cv-candidate-{company-slug}-{YYYY-MM-DD}.pdf`
- Tracker TSVs: `batch/tracker-additions/{id}.tsv`

## Pipeline Integrity

Scripts maintain data consistency:

| Script | Purpose |
|--------|---------|
| `merge-tracker.mjs` | Merges batch TSV additions into applications.md |
| `verify-pipeline.mjs` | Health check: statuses, duplicates, links |
| `dedup-tracker.mjs` | Removes duplicate entries by company+role |
| `normalize-statuses.mjs` | Maps status aliases to canonical values |
| `cv-sync-check.mjs` | Validates setup consistency |
| `check-liveness.mjs` | Checks if job URLs are still active |
| `doctor.mjs` | Validates all prerequisites |
| `test-all.mjs` | Runs all validation scripts |

## Tool Mapping (Copilot CLI)

| Capability | Tool |
|-----------|------|
| Read files | `view` |
| Write files | `create` / `edit` |
| Web fetch | `web_fetch` |
| Web search | `web_search` |
| Run scripts | `bash` |
| Sub-agents | `task` (general-purpose) |
| Ask user | `ask_user` |
