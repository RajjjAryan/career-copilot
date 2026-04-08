# scan.md — Portal Scanner

> **Trigger**: User asks to scan for new job postings.
> **Input**: Configured portals in `config/portals.yml`.
> **Output**: New offers added to `data/pipeline.md`, deduped against history.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="config/portals.yml")
view(path="data/scan-history.tsv")
view(path="data/applications.md")
view(path="data/pipeline.md")
```

---

## Portal Configuration (portals.yml)

Expected format in `config/portals.yml`:

```yaml
portals:
  - name: "Company Careers"
    url: "https://company.com/careers"
    type: "careers-page"        # careers-page | greenhouse | lever | workday | custom
    filters:
      positive_keywords:
        - "senior"
        - "backend"
        - "engineer"
      negative_keywords:
        - "intern"
        - "junior"
        - "manager"

scan_settings:
  max_results_per_portal: 20
  dedup_window_days: 30
```

---

## Scanning Strategy (3 Levels)

### Level 1 — Direct Careers Page Scrape

For portals with type `careers-page`:

```
web_fetch(url="{portal.url}")
```

Parse the page content to extract:
- Job titles
- Job URLs
- Location (if visible)
- Date posted (if visible)

### Level 2 — Structured API (Greenhouse, Lever)

For portals with type `greenhouse` or `lever`:

```
web_fetch(url="https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs")
web_fetch(url="https://api.lever.co/v0/postings/{company}?mode=json")
```

Parse JSON response to extract job listings with full metadata.

### Level 3 — Broad Discovery via Web Search

For portals with type `custom` or as a supplement:

```
web_search("{company name} {positive_keywords} open positions {current year}")
```

Extract relevant URLs from search results.

---

## Filtering Pipeline

### Step 1 — Title Filtering

For each discovered job:

1. Check title against `positive_keywords` — must match at least one
2. Check title against `negative_keywords` — must match none
3. Titles are case-insensitive matched

### Step 2 — Deduplication

Check each URL against three sources:

1. `data/scan-history.tsv` — previously scanned URLs
2. `data/applications.md` — already evaluated/applied
3. `data/pipeline.md` — already in the pipeline

If URL matches any source, skip it.

### Step 3 — Link Verification

For each new (non-duplicate) URL:

```
web_fetch(url="{job_url}")
```

Verify:
- The page loads (not 404/expired)
- The job posting is still active
- The content matches expected role type

---

## Output Actions

### Step 4 — Add to Pipeline

For each verified new offer, add to `data/pipeline.md` under the "Pending" section:

```markdown
- [ ] [{Company} — {Role Title}]({URL}) | Found: {YYYY-MM-DD} | Source: {portal name}
```

### Step 5 — Update Scan History

Append to `data/scan-history.tsv`:

```
{YYYY-MM-DD}\t{URL}\t{Company}\t{Role Title}\t{Status: new|duplicate|expired|filtered}
```

Register ALL discovered URLs — including filtered and duplicate ones — for future dedup.

### Step 6 — Summary

```markdown
---
## 🔍 Scan Complete

| Portal | Discovered | New | Duplicate | Filtered | Expired |
|--------|-----------|-----|-----------|----------|---------|
| {portal 1} | {n} | {n} | {n} | {n} | {n} |
| {portal 2} | {n} | {n} | {n} | {n} | {n} |
| **Total** | **{n}** | **{n}** | **{n}** | **{n}** | **{n}** |

### New Offers Added to Pipeline
1. [{Company} — {Role}]({URL})
2. ...

### Next Steps
- Run `pipeline` mode to evaluate pending offers
- Run `batch` mode to evaluate all at once
---
```
