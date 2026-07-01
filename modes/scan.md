# scan.md — Portal Scanner

Scan configured job portals, filter roles by title relevance, and add new offers to the pipeline for later evaluation.

## Recommended Execution

Run as a sub-agent when available so the main session keeps its context focused:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + user-specific data]",
    run_in_background=True
)
```

## Configuration

Read `portals.yml`, which contains:

- `search_queries`: WebSearch queries with `site:` filters for broad portal discovery
- `tracked_companies`: specific companies with `careers_url` values for direct navigation
- `title_filter`: positive, negative, and seniority-boost keywords for title filtering

## Discovery Strategy

Use three additive discovery levels. Run all enabled levels, merge the results, and deduplicate before writing to the pipeline.

### Level 1 — Direct Playwright Scan (Primary)

For each company in `tracked_companies`, navigate to its `careers_url` with browser automation when available. Read all visible job listings and extract `{title, url, company}` for each role.

This is the most reliable source because it:

- sees the live page instead of cached search results
- works with SPA job boards such as Ashby, Lever, and Workday
- detects new roles immediately
- does not depend on search engine indexing

Every tracked company should have `careers_url` in `portals.yml`. If it is missing, find it once, save it, and reuse it on future scans.

### Level 2 — Greenhouse API (Complementary)

For companies with Greenhouse boards, the JSON API at `boards-api.greenhouse.io/v1/boards/{slug}/jobs` returns clean structured data. Use it as a fast complement to Level 1. It only applies to Greenhouse.

### Level 3 — WebSearch Queries (Broad Discovery)

`search_queries` with `site:` filters cover portals across many companies, such as all Ashby or Greenhouse boards. Use them to discover new companies not yet present in `tracked_companies`. Treat results as potentially stale.

Execution priority:

1. Level 1: Playwright scan for all enabled `tracked_companies` with `careers_url`
2. Level 2: API scan for all enabled `tracked_companies` with `api`
3. Level 3: WebSearch for every enabled query

## Workflow

1. Read configuration from `portals.yml`.
2. Read history from `data/scan-history.tsv`.
3. Read deduplication sources: `data/applications.md` and `data/pipeline.md`.

4. Level 1 — Playwright scan, sequential only:
   - For each enabled company with `careers_url`, navigate to the page.
   - Read the page content and extract every visible job listing.
   - If the page has filters or departments, navigate relevant sections.
   - Extract `{title, url, company}` for each listing.
   - If results are paginated, visit additional pages.
   - If `careers_url` fails with a 404 or redirect, try `scan_query` as fallback and note that the URL needs updating.

5. Level 2 — Greenhouse APIs, parallel when possible:
   - For each enabled company with `api`, fetch the JSON API URL.
   - Extract `{title, url, company}` from every job.
   - Add results to the candidate list and deduplicate with Level 1.

6. Level 3 — WebSearch queries, parallel when possible:
   - For each enabled query, run WebSearch with the configured query.
   - Extract `{title, url, company}` from each result:
     - `title`: from the result title before ` @ ` or ` | `
     - `url`: result URL
     - `company`: from the title suffix or the domain/path
   - Add results to the candidate list and deduplicate with Levels 1 and 2.

7. Filter by title using `title_filter` from `portals.yml`:
   - At least one `positive` keyword must appear in the title, case-insensitive.
   - No `negative` keywords may appear.
   - `seniority_boost` keywords increase priority but are not required.

8. Deduplicate against three sources:
   - `data/scan-history.tsv`: exact URL already seen
   - `data/applications.md`: normalized company and role already evaluated
   - `data/pipeline.md`: exact URL already queued or processed

9. Verify Level 3 liveness before adding WebSearch results to the pipeline:
   - WebSearch can return stale pages. For every new Level 3 URL, navigate with browser automation sequentially.
   - Classify as active when the role title, role description, and apply/submit button are visible.
   - Classify as expired when any of these signals appear:
     - final URL contains `?error=true`
     - page contains "job no longer available", "no longer open", "position has been filled", "this job has expired", or "page not found"
     - only navbar/footer content is visible with no real JD content
   - If expired, write `skipped_expired` to `data/scan-history.tsv` and discard it.
   - If navigation fails because of a timeout, 403, or transient error, write `skipped_uncertain` and continue.

10. For each verified new offer that passes filters:
    - Add to `data/pipeline.md` under "Pending": `- [ ] {url} | {company} | {title}`.
    - Record in `data/scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`.

11. Record non-added offers in `data/scan-history.tsv`:
    - title-filtered roles: `skipped_title`
    - duplicates: `skipped_dup`
    - expired Level 3 roles: `skipped_expired`
    - uncertain transient failures: `skipped_uncertain`

## WebSearch Title and Company Extraction

WebSearch results often use formats such as `"Job Title @ Company"`, `"Job Title | Company"`, `"Job Title — Company"`, or `"Job Title at Company"`.

Portal examples:

- Ashby: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- Greenhouse: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- Lever: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex:

```
(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$
```

## Private URLs

If a role URL is not publicly accessible:

1. Save the JD to `jds/{company}-{role-slug}.md`.
2. Add it to `data/pipeline.md` as `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`.

## Scan History

`data/scan-history.tsv` tracks every seen URL:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	AI PM	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	AI PM	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	AI PM	ClosedCo	skipped_expired
```

## Output Summary

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries run: N
Offers found: N total
Title-filtered as relevant: N
Duplicates: N
Expired discarded: N
New offers added to data/pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Run /career-copilot pipeline to evaluate the new offers.
```

## careers_url Maintenance

Every company in `tracked_companies` should have `careers_url`, the direct URL to its job listings page.

Known platform patterns:

- Ashby: `https://jobs.ashbyhq.com/{slug}`
- Greenhouse: `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- Lever: `https://jobs.lever.co/{slug}`
- Custom: the company's own careers page, such as `https://openai.com/careers`

If `careers_url` does not exist for a company:

1. Try the known platform pattern.
2. If that fails, run a quick WebSearch: `"{company}" careers jobs`.
3. Navigate with Playwright to confirm it works.
4. Save the URL in `portals.yml` for future scans.

If a `careers_url` is broken:

1. Note it in the output summary.
2. Search for the new URL.
3. Update `portals.yml`.

## Rules

- Never apply to jobs automatically from scan mode. Only add URLs to the pipeline.
- Always deduplicate before adding.
- Always record skipped URLs in scan history so they are not rediscovered every scan.
- Always save `careers_url` when adding a new tracked company.
