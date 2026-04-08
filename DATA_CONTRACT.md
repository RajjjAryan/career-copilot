# Data Contract

This document defines the boundary between **User Data** (your personal content) and **System Data** (the pipeline's operational files).

## User Layer — NEVER auto-updated by the AI

These files belong to the user. The AI agent reads them for context but **never modifies them** without explicit user instruction.

| File | Purpose |
|------|---------|
| `cv.md` | Canonical CV — source of truth for all evaluations |
| `config/profile.yml` | Candidate identity, targets, narrative |
| `modes/_profile.md` | Personal profile overrides (created from template) |
| `article-digest.md` | Proof points from portfolio projects/articles |
| `portals.yml` | Scanner configuration (copied from template) |
| `data/applications.md` | Application tracker (modified only via merge-tracker) |
| `data/pipeline.md` | URL inbox for pending evaluations |
| `reports/*` | Evaluation reports (generated, then user-owned) |
| `output/*` | Generated PDFs (generated, then user-owned) |
| `interview-prep/*` | Story bank and interview prep files |

## System Layer — safe for automated updates

These files are part of the pipeline infrastructure. They can be updated by contributors, scripts, or the AI agent during system operations.

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Main agent instruction set |
| `modes/_shared.md` | Shared scoring rules, archetypes, tool references |
| `modes/*.md` (except `_profile.md`) | Skill mode definitions |
| `templates/cv-template.html` | ATS-optimized CV HTML template |
| `templates/states.yml` | Canonical application statuses |
| `templates/portals.example.yml` | Portal scanner template |
| `config/profile.example.yml` | Profile template |
| `*.mjs` scripts | Utility scripts |
| `batch/batch-prompt.md` | Self-contained batch worker prompt |
| `generate-pdf.mjs` | HTML → PDF generation |

## Rules

1. **Never auto-update User Layer files** — always ask the user first
2. **Tracker modifications** go through `batch/tracker-additions/*.tsv` → `merge-tracker.mjs`
3. **Reports and PDFs** are generated into `reports/` and `output/` — once created, they belong to the user
4. **Personal data** (cv.md, profile.yml, applications.md) must never be committed to a public repository
