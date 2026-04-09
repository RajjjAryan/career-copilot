# scan.md — Portal Scanner (Job Discovery)

> **Trigger**: User asks to scan for new job postings.
> **Input**: Configured portals in `portals.yml` (root) or `templates/portals.example.yml`.
> **Output**: New offers added to `data/pipeline.md`, deduped against history.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
```

Read portal config:
```
view(path="portals.yml")           # user config (preferred)
view(path="templates/portals.example.yml")  # fallback if portals.yml doesn't exist
```

Read dedup sources:
```
view(path="data/scan-history.tsv")   # if exists
view(path="data/applications.md")
view(path="data/pipeline.md")
```

---

## Scanning Strategy (3 Levels)

### Level 1 — Playwright MCP Direct (PRINCIPAL, most reliable)

For each company in `tracked_companies` with `careers_url`:

Use Playwright MCP tools to scrape the careers page with a real browser (handles SPAs like Ashby, Lever, Workday):

```
browser_navigate(url="{careers_url}")
browser_snapshot()
```

The snapshot returns a structured accessibility tree with all job listings, links, and text. Parse it to extract `{title, url, company}` for each job.

**Why this is better than web_fetch:** Most modern career pages (Ashby, Lever, Workday) are JavaScript SPAs. `web_fetch` only gets raw HTML without JS rendering. Playwright MCP renders the full page with a real Chromium browser, waits for dynamic content, and returns structured data the agent can directly parse.

**Pagination:** If the page has "Next" or "Load More" buttons, use `browser_click(ref="{button_ref}")` followed by `browser_snapshot()` to get additional pages.

**Fallback**: If Playwright MCP is not available, fall back to `web_fetch` for static pages, or use the Greenhouse API (Level 2) for Greenhouse-hosted boards.

### Level 2 — Structured API (Greenhouse, Lever)

For companies with `api:` field:

```
web_fetch(url="https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
```

Parse JSON response — no browser needed. Fast and structured.

### Level 3 — Broad Discovery via Web Search

For `search_queries` in portals.yml:

```
web_search("{query}")
```

Extract `{title, url, company}` from results. Results may be stale — verify with browse.mjs before adding to pipeline.

**Priority:** Level 1 → Level 2 → Level 3 (all additive, results merged and deduped).

---

## Filtering Pipeline

### Step 1 — Title Filtering

Using `title_filter` from portals.yml:

1. At least 1 keyword from `positive` must appear in the title (case-insensitive)
2. 0 keywords from `negative` must appear
3. `seniority_boost` keywords give priority but are not required

### Step 2 — Deduplication

Check each URL against 3 sources:

1. `data/scan-history.tsv` — URL already scanned
2. `data/applications.md` — company + role already evaluated
3. `data/pipeline.md` — URL already in pipeline

### Step 3 — Liveness Verification (Level 3 results only)

WebSearch results can be stale. For each new URL from Level 3:

```
browser_navigate(url="{url}")
browser_snapshot()
```

Check the snapshot for:
- **Active**: Job title visible, description present, Apply/Submit button exists
- **Expired**: Contains "job no longer available", "position has been filled", "this job has expired", "page not found", or URL has `?error=true`

Discard expired postings. Level 1 and Level 2 results are inherently real-time — skip this step for them.

---

## Output

### Step 4 — Add to Pipeline

For each verified new offer:

```markdown
- [ ] [{Company} — {Role Title}]({URL}) | Found: {YYYY-MM-DD} | Source: {portal name}
```

### Step 5 — Update Scan History

Append to `data/scan-history.tsv`:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby	PM AI	Acme	added
https://...	2026-02-10	Greenhouse	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	WebSearch	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch	PM AI	ClosedCo	skipped_expired
```

Register ALL discovered URLs — including filtered, duplicate, and expired — for future dedup.

### Step 6 — Summary

```markdown
---
## 🔍 Scan Complete — {YYYY-MM-DD}

| Source | Discovered | New | Duplicate | Filtered | Expired |
|--------|-----------|-----|-----------|----------|---------|
| Playwright | {n} | {n} | {n} | {n} | — |
| Greenhouse API | {n} | {n} | {n} | {n} | — |
| WebSearch | {n} | {n} | {n} | {n} | {n} |
| **Total** | **{n}** | **{n}** | **{n}** | **{n}** | **{n}** |

### New Offers Added to Pipeline
1. [{Company} — {Role}]({URL})
2. ...

### Next Steps
- Run `pipeline` mode to evaluate pending offers
- Run `batch` mode to evaluate all at once
---
```

---

## careers_url Management

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **Custom:** Company's own careers page

If `careers_url` returns 404 or redirect:
1. Note in scan summary
2. Try `scan_query` as fallback
3. Mark for manual URL update
