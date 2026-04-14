# Career-Copilot — AI Agent Instructions

> AI-powered job search pipeline: offer evaluation, CV generation, pipeline tracking, portal scanning, batch processing, interview preparation.
>
> This file is the primary instruction set for **any AI coding agent** operating inside this repository.

---

## 1. Origin & Purpose

This repository is an **AI-driven career operations pipeline** designed to run entirely through **AI coding agents** (GitHub Copilot CLI, Claude Code, Gemini CLI, Cursor, Windsurf, or any compatible tool). It automates and structures the following workflows:

| Capability | Description |
|---|---|
| **Offer Evaluation** | Structured A–F scoring across 6 weighted dimensions |
| **CV Generation** | ATS-optimized, per-JD tailored PDFs via Playwright |
| **Pipeline Tracking** | Application tracker with integrity checks and canonical states |
| **Portal Scanning** | Automated scanning of 45+ company career pages |
| **Batch Processing** | Parallel evaluation of multiple offers |
| **Interview Prep** | STAR+Reflection story bank and company intelligence |
| **Company Research** | Deep-dive research on target companies |
| **LinkedIn Outreach** | Personalized outreach message drafting |
| **Course/Cert Evaluation** | ROI analysis of training opportunities |
| **Project Evaluation** | Portfolio project impact scoring |

**Philosophy:** Quality over spray-and-pray. The system strongly discourages applying to offers scoring below 4.0/5. Every application should be deliberate, well-prepared, and respectful of recruiters' time.

---

## 2. Data Contract

All files fall into exactly one of two layers. **Never violate the boundary.**

### User Layer — NEVER auto-update

These files belong to the user. The agent must **never overwrite, delete, or auto-modify** them without explicit user instruction.

| File / Path | Purpose |
|---|---|
| `cv.md` | Canonical CV — single source of truth for all generated resumes |
| `config/profile.yml` | Personal data, target roles, archetypes, compensation, location |
| `modes/_profile.md` | User-specific customizations to mode behavior |
| `article-digest.md` | Published articles, talks, proof points with URLs |
| `portals.yml` | Job portal URLs and scanning configuration |
| `data/*` | `applications.md`, `pipeline.md`, `scan-history.tsv` — user-owned tracking data |
| `reports/*` | Generated evaluation reports (user reviews and archives) |
| `output/*` | Generated PDF resumes |
| `interview-prep/*` | Story bank, company briefs, prep notes |

### System Layer — safe to auto-update

These files define system behavior. They can be updated, improved, or extended by the agent or through repository updates.

| File / Path | Purpose |
|---|---|
| `modes/_shared.md` | Shared rules, scoring dimensions, archetype definitions |
| `modes/evaluate.md` | Single-offer evaluation workflow |
| `modes/auto-pipeline.md` | Full pipeline: evaluate → PDF → track |
| `modes/compare.md` | Multi-offer comparison |
| `modes/pdf.md` | PDF generation workflow |
| `modes/scan.md` | Portal scanning workflow |
| `modes/batch.md` | Batch processing workflow |
| `modes/pipeline.md` | URL inbox processing |
| `modes/tracker.md` | Application status dashboard |
| `modes/apply.md` | Application form assistant |
| `modes/contact.md` | LinkedIn outreach drafting |
| `modes/deep.md` | Deep company research |
| `modes/interview-prep.md` | Interview preparation |
| `modes/training.md` | Course / certification evaluation |
| `modes/project.md` | Portfolio project evaluation |
| `generate-pdf.mjs` | HTML → PDF converter (Playwright + Chromium) |
| `templates/*` | CV template, canonical states, portal config examples |
| `batch/*` | Batch processing logs and tracker additions |

### The Golden Rule

> **User customizations go ONLY in `modes/_profile.md` and `config/profile.yml`.**
>
> Never scatter user preferences across system mode files. If the user wants to change scoring weights, archetype definitions, or workflow behavior — capture it in `_profile.md` so it survives system updates.

---

## 3. Main Files Reference

| File | Format | Purpose | Touch Policy |
|---|---|---|---|
| `cv.md` | Markdown | Canonical CV with full work history, skills, education | User-only |
| `config/profile.yml` | YAML | Name, contact, target roles, archetypes, comp ranges | User-only |
| `config/profile.example.yml` | YAML | Template for profile.yml — copy and fill in | System |
| `modes/_profile.md` | Markdown | User-specific overrides to mode behavior | User-only |
| `modes/_shared.md` | Markdown | Scoring rubric, archetype defs, shared rules | System |
| `data/applications.md` | Markdown (TSV table) | Master application tracker | Append-only |
| `data/pipeline.md` | Markdown | URL inbox — pending and processed JD links | Agent-managed |
| `data/scan-history.tsv` | TSV | Log of portal scans with timestamps | Append-only |
| `portals.yml` | YAML | Company career page URLs for scanner | User-managed |
| `templates/cv-template.html` | HTML/CSS | ATS-optimized CV layout with Space Grotesk + DM Sans fonts | System |
| `templates/states.yml` | YAML | Canonical application statuses (Evaluated → SKIP) | System |
| `generate-pdf.mjs` | Node.js ESM | Playwright-based HTML→PDF with ATS normalization | System |
| `analyze-patterns.mjs` | Node.js ESM | Pattern analysis across applications (JSON output) | System |
| `article-digest.md` | Markdown | Published articles, talks, open-source with proof URLs | User-only |
| `interview-prep/story-bank.md` | Markdown | STAR+Reflection stories indexed by competency | User-only |
| `jds/` | Directory | Local JD files (referenced as `local:jds/{file}` in pipeline.md) | User-managed |
| `reports/` | Directory | Evaluation reports: `{num}-{slug}-{date}.md` | Generated |
| `output/` | Directory | Generated PDFs: `{num}-{slug}-{date}.pdf` | Generated |
| `batch/logs/` | Directory | Batch processing run logs | Generated |
| `batch/tracker-additions/` | Directory | TSV fragments for bulk tracker updates | Generated |

---

## 4. Update Check

On the first message of each session, run the update checker silently:

```bash
node update-system.mjs check
```

Parse the JSON output:
- `{"status": "update-available", ...}` → tell the user: "career-copilot update available (v{local} → v{remote}). Your data (CV, profile, tracker, reports) will NOT be touched. Want me to update?" If yes → `node update-system.mjs apply`. If no → `node update-system.mjs dismiss`.
- `{"status": "up-to-date"}` → say nothing
- `{"status": "dismissed"}` → say nothing
- `{"status": "offline"}` → say nothing

The user can also say "check for updates" or "update career-copilot" at any time. To rollback: `node update-system.mjs rollback`.

---

## 5. First Run Onboarding

When the user first interacts with this project, **check for required files** before doing anything else. If any are missing, guide the user through setup step by step.

### Onboarding Checklist

```
1. cv.md                — Does it exist? Is it populated?
2. config/profile.yml   — Does it exist? (copy from config/profile.example.yml if not)
3. modes/_profile.md    — Does it exist? Create with user preferences if not.
4. portals.yml          — Does it exist? Copy from templates/portals.example.yml if not.
5. data/applications.md — Does it have the header row?
6. data/pipeline.md     — Does it have the Pending/Processed sections?
```

### Onboarding Flow

**Step 1 — CV Creation**
If `cv.md` is missing, ask:
> "I don't have your CV yet. You can either:
> 1. Paste your CV here and I'll convert it to markdown
> 2. Paste your LinkedIn URL and I'll extract the key info
> 3. Tell me about your experience and I'll draft a CV for you
>
> Which do you prefer?"

Create `cv.md` from whatever they provide. Structure: Contact → Summary → Experience → Skills → Education → Certifications → Publications. Ensure metrics are concrete and quantified where possible. If they have a `resume.tex` or existing document, parse it and convert.

**Step 2 — Profile Configuration**
If `config/profile.yml` is missing, copy from `config/profile.example.yml` and ask:
> "I need a few details to personalize the system:
> - Your full name and email
> - Your location and timezone
> - What roles are you targeting? (e.g., 'Senior Backend Engineer', 'AI Product Manager')
> - Your salary target range
>
> I'll set everything up for you."

Fill in `config/profile.yml` with their answers. For archetypes and targeting narrative, store user-specific mapping in `modes/_profile.md` or `config/profile.yml` rather than editing `modes/_shared.md`.

**Step 3 — Portal Setup**
If `portals.yml` is missing:
> "I'll set up the job scanner with 45+ pre-configured companies. Want me to customize the search keywords for your target roles?"

Copy `templates/portals.example.yml` → `portals.yml`. If they gave target roles in Step 2, update `title_filter.positive` to match.

**Step 4 — Tracker Initialization**
If `data/applications.md` doesn't exist, create it:
```markdown
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
```

Verify `data/pipeline.md` has the Pending/Processed sections.

**Step 5 — Get to Know the User (important for quality)**

After the basics are set up, proactively ask for more context:
> "The basics are ready. But the system works much better when it knows you well. Can you tell me more about:
> - What makes you unique? What's your 'superpower' that other candidates don't have?
> - What kind of work excites you? What drains you?
> - Any deal-breakers? (e.g., no on-site, no startups under 20 people, no Java shops)
> - Your best professional achievement — the one you'd lead with in an interview
> - Any projects, articles, or case studies you've published?
>
> The more context you give me, the better I filter. Think of it as onboarding a recruiter — the first week I need to learn about you, then I become invaluable."

Store insights in `config/profile.yml` (under narrative), `modes/_profile.md`, or in `article-digest.md` for proof points. Never put user-specific archetypes or framing into `modes/_shared.md`.

**After every evaluation, learn.** If the user says "this score is too high, I wouldn't apply here" or "you missed that I have experience in X", update your understanding in `modes/_profile.md`, `config/profile.yml`, or `article-digest.md`. The system should get smarter with every interaction.

**Step 6 — Ready**
Once all files exist, confirm:
> "You're all set! You can now:
> - Paste a job URL to evaluate it
> - Ask me to scan your portals for new jobs
> - Ask me to batch process multiple offers
>
> Everything is customizable — just ask me to change anything."

Then suggest automation:
> "Want me to scan for new offers periodically? Just say 'scan every 3 days' and I'll remind you when it's time."

---

## 6. Skill Modes — Intent Routing

When the user sends a message, match their intent to the appropriate mode file. Read the mode file first, then execute its workflow.

| User Intent | Trigger | Mode File |
|---|---|---|
| Pastes a JD or sends a job URL | Auto-detected (URL or block of JD text) | `modes/auto-pipeline.md` |
| "Evaluate this offer" | Explicit evaluation request | `modes/evaluate.md` |
| "Compare offers" / "Compare my top N" | Multi-offer comparison | `modes/compare.md` |
| "LinkedIn outreach" / "reach out to" | Contact drafting | `modes/contact.md` |
| "Company research" / "tell me about {company}" | Deep research | `modes/deep.md` |
| "Interview prep" / "prep me for" | Interview preparation | `modes/interview-prep.md` |
| "Generate CV" / "generate PDF" / "make resume" | PDF generation | `modes/pdf.md` |
| "Evaluate course" / "evaluate cert" / "is this training worth it" | Training ROI analysis | `modes/training.md` |
| "Evaluate project" / "portfolio project" | Project impact scoring | `modes/project.md` |
| "Application status" / "tracker" / "dashboard" | Status dashboard | `modes/tracker.md` |
| "Fill application" / "apply to" | Application form assistant | `modes/apply.md` |
| "Scan portals" / "check for new jobs" | Portal scanner | `modes/scan.md` |
| "Process pipeline" / "process my URLs" | URL inbox processing | `modes/pipeline.md` |
| "Batch process" / "evaluate all" / "process batch" | Parallel batch processing | `modes/batch.md` |
| "Analyze patterns" / "rejection patterns" / "improve targeting" | Rejection pattern analysis | `modes/patterns.md` |
| "Auto-apply" / "submit application" / "apply to this" | Automated submission | `modes/auto-apply.md` |

### Routing Rules

1. **URL detection**: If the message contains a URL that looks like a job posting (lever.co, greenhouse.io, jobs.*, careers.*, linkedin.com/jobs, etc.), trigger `auto-pipeline.md` automatically.
2. **JD text detection**: If the message contains what appears to be a pasted job description (look for "About the role", "Requirements", "Responsibilities", job title patterns), trigger `auto-pipeline.md`.
3. **Explicit mode**: If the user names a specific workflow, use that mode.
4. **Ambiguous**: If intent is unclear, ask one clarifying question before proceeding.
5. **Always read the mode file** before executing — the workflow definition lives there, not in this instructions file.
6. **Always read `modes/_shared.md`** for scoring rubric, archetype definitions, and shared rules.
7. **Always read `modes/_profile.md`** (if it exists) for user-specific overrides.

---

## 7. CV Source of Truth

### Rules

- **`cv.md` is the canonical source** for all resume content. Every generated CV must derive from it.
- **`article-digest.md`** contains proof points — published articles, conference talks, open-source contributions with URLs. Reference these to back up claims in the CV.
- **NEVER hardcode metrics.** All numbers (revenue impact, latency improvements, team sizes, scale metrics) must come from `cv.md` or `article-digest.md`. If a metric isn't documented, ask the user.
- **NEVER invent experience.** The CV must be truthful. Rephrase and emphasize — never fabricate.
- **Tailor, don't rewrite.** When generating a CV for a specific JD, select and emphasize relevant experience from `cv.md`. Don't remove entries — prioritize and reorder.
- **Template variables** in `templates/cv-template.html` use `{{PLACEHOLDER}}` syntax. The key placeholders are: `{{LANG}}`, `{{NAME}}`, `{{PAGE_WIDTH}}`, and content sections injected as HTML.

---

## 8. Ethical Use

This system exists to help the user find the **right** job, not to spam applications.

### Principles

1. **Quality over quantity.** A well-targeted application beats 50 spray-and-pray submissions.
2. **Never submit without user review.** Always present the final CV/application for approval before any submission step.
3. **Discourage low-score applications.** If an offer scores below 4.0/5, flag it clearly. Explain why it's a poor fit. Don't refuse — but make the tradeoff visible.
4. **Respect recruiters' time.** Generated outreach messages must be genuine and personalized. Never use generic templates.
5. **Honesty in CVs.** Tailor emphasis, never fabricate experience or inflate metrics.
6. **Transparency in scoring.** Always show the dimension breakdown so the user understands why an offer scored the way it did.
7. **User agency.** The user makes all final decisions. The agent advises, scores, and generates — but never acts unilaterally on applications.

---

## 9. Offer Verification — MANDATORY

**NEVER trust a simple web search or URL fetch to verify if an offer is still active.** ALWAYS navigate to the actual job posting URL in a browser:
1. Open the URL in a browser (use browser automation if available, e.g., Playwright MCP)
2. Read the page content
3. Only footer/navbar without JD = closed. Title + description + Apply button = active.

If the page loads but shows "This position has been filled" or "Job no longer available", mark as `Discarded` with note "Offer closed".

**Exception for batch/parallel workers:** Browser automation may not be available in sub-agent contexts. In that case, use a simple URL fetch as a fallback and mark the report header with `**Verification:** unconfirmed (batch mode)`. The user can verify manually later.

---

## 10. Stack & Conventions

### Technology Stack

| Component | Technology | Notes |
|---|---|---|
| Scripts | Node.js (ESM / `.mjs`) | `generate-pdf.mjs` is the primary script |
| PDF Engine | Playwright (Chromium headless) | `npx playwright install chromium` for setup |
| Configuration | YAML | `config/profile.yml`, `portals.yml`, `templates/states.yml` |
| Templates | HTML + CSS | `templates/cv-template.html` with Space Grotesk + DM Sans fonts |
| Data | Markdown + TSV | Tracker tables use pipe-delimited Markdown; scan history is TSV |
| Fonts | WOFF2 | Stored in `fonts/` directory |

### Naming Conventions

| Entity | Pattern | Example |
|---|---|---|
| Report file | `{num}-{slug}-{date}.md` | `001-stripe-senior-backend-2025-04-08.md` |
| PDF file | `{num}-{slug}-{date}.pdf` | `001-stripe-senior-backend-2025-04-08.pdf` |
| Report number | Sequential, 3-digit, zero-padded | `001`, `002`, `042` |
| Slug | Lowercase, hyphenated company-role | `stripe-senior-backend` |
| Date | ISO 8601 date | `2025-04-08` |

### Report Numbering

To determine the next report number:
1. Read `data/applications.md`.
2. Find the highest existing `#` value.
3. Increment by 1 and zero-pad to 3 digits.
4. If the tracker is empty, start at `001`.

---

## 11. TSV Format for Tracker Additions

When adding a row to `data/applications.md`, use this exact format:

```
| {num} | {date} | {company} | {role} | {score}/5 | {status} | {pdf_emoji} | [{num}](reports/{num}-{slug}-{date}.md) | {note} |
```

### Field Definitions

| Field | Description | Example |
|---|---|---|
| `{num}` | 3-digit zero-padded sequential number | `007` |
| `{date}` | ISO 8601 date of evaluation | `2025-04-08` |
| `{company}` | Company name | `Stripe` |
| `{role}` | Role title (short) | `Senior Backend Engineer` |
| `{score}/5` | Overall weighted score out of 5 | `4.2/5` |
| `{status}` | Canonical state (see §10) | `Evaluated` |
| `{pdf_emoji}` | `📄` if PDF generated, `—` if not | `📄` |
| Report link | Markdown link to report file | `[007](reports/007-stripe-senior-backend-2025-04-08.md)` |
| `{note}` | Brief note or empty | `Strong IC culture` |

### Batch Tracker Additions

For batch processing, write individual TSV fragments to `batch/tracker-additions/` with filename `{num}-{slug}.tsv`. Single line, 9 tab-separated columns:

```
{num}\t{date}\t{company}\t{role}\t{status}\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

**Column order note:** In TSV fragments, `status` comes BEFORE `score`. In `data/applications.md`, `score` comes BEFORE `status`. The `merge-tracker.mjs` script handles this column swap automatically.

### Pipeline Integrity Rules

1. **No duplicate entries.** Before adding a row, check if the company+role combination already exists in the tracker.
2. **Sequential numbering.** Never skip numbers. Never reuse numbers.
3. **Status consistency.** Only use canonical states from `templates/states.yml`.
4. **Report linkage.** Every tracker row with status `Evaluated` or beyond must link to an existing report file.
5. **Date accuracy.** Use the actual date of evaluation, not the date the JD was posted.

---

## 12. Canonical Application States

Defined in `templates/states.yml`. The `Status` field in `data/applications.md` must contain **exactly one** of these values. No markdown bold, no dates, no extra text in the status field.

| State | Description | Typical Transition |
|---|---|---|
| `Evaluated` | Offer evaluated with report, pending decision | → Applied, Discarded, SKIP |
| `Applied` | Application submitted | → Responded, Interview, Rejected |
| `Responded` | Company responded (not yet interview stage) | → Interview, Rejected |
| `Interview` | Active interview process | → Offer, Rejected |
| `Offer` | Offer received | → Applied (accepted), Discarded |
| `Rejected` | Rejected by company | Terminal |
| `Discarded` | Discarded by candidate or offer closed | Terminal |
| `SKIP` | Doesn't fit, don't apply | Terminal |

### State Transition Rules

- States flow generally left-to-right (Evaluated → Applied → Responded → Interview → Offer).
- Terminal states (`Rejected`, `Discarded`, `SKIP`) are final — no further transitions.
- A row can jump states (e.g., `Evaluated` → `SKIP` is valid).
- When updating status, also update the `Notes` field with context (e.g., "Rejected after phone screen").

---

## 13. Agent Capabilities Reference

This section maps tasks to the capabilities your AI tool should use. The exact tool names may vary between AI coding agents — use whatever equivalent your tool provides.

### Research & External Data

| Task | Capability | Details |
|---|---|---|
| Company research | Web search | Search for company info, culture, funding, tech stack |
| Compensation data | Web search | Search for salary ranges, Glassdoor data, Levels.fyi |
| LinkedIn contacts | Web search | Find hiring managers, recruiters, team leads |
| Extract JD from URL | URL fetch | Fetch job posting page, parse JD content |
| Navigate to SPA page | Browser automation | Open JS-rendered pages (Ashby, Lever, Workday). Use Playwright or browser tools if available |
| Read page state | Browser automation | Read the rendered page content after JavaScript execution |
| Interact with page | Browser automation | Click buttons, fill forms on the page |
| Check if job is active | Browser automation | Navigate to URL, check if posting content exists or shows expired |
| Verify company claims | URL fetch | Check company blog posts, press releases |
| Latest news about company | Web search | Recent funding, layoffs, product launches |

> **Browser automation vs URL fetch:**
> - URL fetch is fast and lightweight — use for static pages, APIs, JSON endpoints, and simple HTML
> - Browser automation (Playwright MCP, browser tools, etc.) uses a real browser — use for SPAs (Ashby, Lever, Workday), JS-rendered content, login-gated pages, and interactive forms
> - If a URL fetch returns empty/broken content, the page is likely a SPA — try browser automation instead
> - Browser automation setup varies by tool. For Playwright MCP, see `.vscode/mcp.json` (included in this project)

### File Operations

| Task | Capability | Details |
|---|---|---|
| Read CV content | Read file | Read `cv.md` |
| Read user profile | Read file | Read `config/profile.yml` |
| Read profile overrides | Read file | Read `modes/_profile.md` |
| Read proof points | Read file | Read `article-digest.md` |
| Read mode workflow | Read file | Read the relevant `modes/*.md` file |
| Read CV template | Read file | Read `templates/cv-template.html` |
| Read canonical states | Read file | Read `templates/states.yml` |
| Read application tracker | Read file | Read `data/applications.md` |
| Read pipeline inbox | Read file | Read `data/pipeline.md` |
| Read portals config | Read file | Read `portals.yml` |
| Create evaluation report | Create file | Write new report to `reports/{num}-{slug}-{date}.md` |
| Create generated HTML | Create file | Write tailored HTML to `output/{num}-{slug}-{date}.html` |
| Update tracker | Update file | Append new row to `data/applications.md` |
| Update pipeline | Update file | Move URL from Pending to Processed in `data/pipeline.md` |
| Update scan history | Update file | Append scan results to `data/scan-history.tsv` |
| Create profile from template | Create file | Copy and fill `config/profile.yml` from example |
| Create story bank entry | Update file | Add STAR story to `interview-prep/story-bank.md` |

### Code Execution

| Task | Capability | Details |
|---|---|---|
| Generate PDF from HTML | Run command | `node generate-pdf.mjs output/{file}.html output/{file}.pdf --format=a4` |
| Analyze patterns | Run command | `node analyze-patterns.mjs` — outputs JSON with rejection patterns, score trends, gaps |
| Install dependencies | Run command | `npm install` or `npx playwright install chromium` |
| Check for updates | Run command | `node update-system.mjs check` |
| Git operations | Run command | Commit, status, diff (always use `--no-pager`) |

### Search & Discovery

| Task | Capability | Details |
|---|---|---|
| Find files by name | File search | Search for files matching patterns like `reports/*.md` |
| Search file contents | Text search | Search for text in reports, tracker, CV |
| Find highest report number | Text search | Search `data/applications.md` for existing numbers |
| Check for duplicate entries | Text search | Search tracker for company+role combination |

### Batch & Parallel Processing

| Task | Capability | Details |
|---|---|---|
| Batch evaluation workers | Sub-agent dispatch | If your tool supports dispatching parallel sub-agents (e.g., Copilot CLI's `task()` tool), use one worker per offer. Otherwise, process offers sequentially in the current session. |
| Parallel research | Sub-agent dispatch | If available, dispatch independent research threads in parallel. Otherwise, research sequentially. |
| Batch status tracking | Session state | Track batch item progress (use session database/state if available) |

---

## 14. Personalization

The agent can customize the system based on user requests. All personalization follows the data contract — user preferences go in `modes/_profile.md` and `config/profile.yml`.

### What Can Be Customized

| Area | How | Where |
|---|---|---|
| **Archetypes** | Redefine role archetypes (e.g., switch from backend to data engineering) | `config/profile.yml` → `target_roles.archetypes` |
| **Scoring weights** | Adjust dimension weights for offer evaluation | `modes/_profile.md` |
| **Target companies** | Add/remove companies from portal scanner | `portals.yml` |
| **CV template** | Modify layout, fonts, colors, sections | `templates/cv-template.html` |
| **Language** | Translate mode prompts and output language | `modes/_profile.md` (set `language: es`) |
| **Compensation ranges** | Update target salary/equity ranges | `config/profile.yml` → `compensation` |
| **Dealbreakers** | Define non-negotiables (remote, visa, industry) | `modes/_profile.md` |
| **Interview style** | Adjust STAR story format, add competency frameworks | `modes/_profile.md` |
| **Report format** | Customize evaluation report sections and depth | `modes/_profile.md` |

### Customization Workflow

1. User asks for a change (e.g., "Focus on DevOps roles instead of backend").
2. Agent reads current `config/profile.yml` and `modes/_profile.md`.
3. Agent proposes the specific changes and confirms with user.
4. Agent applies changes to the appropriate file(s).
5. Agent confirms the update and explains any downstream effects.

---

## 15. Language Modes

Default modes are in `modes/` (English). The system supports additional language-specific mode directories:

- Place translated modes in `modes/{lang}/` (e.g., `modes/de/`, `modes/fr/`, `modes/es/`)
- Each language directory should contain its own `_shared.md` and relevant mode files
- Set `language.modes_dir: modes/de` in `config/profile.yml` to use a specific language by default

**When to switch:** If the user is targeting jobs in a non-English market, lives in a region where another language dominates, or explicitly asks for translated output — use the corresponding language directory. If the user applies to English-language roles (even at non-English companies), use the default English modes.

**To create modes in a new language:** Ask the agent to translate the mode files. Store translations in the appropriate `modes/{lang}/` directory.

---

## 16. Workflow Quick Reference

### Auto-Pipeline (JD → Report → PDF → Track)

```
1. Extract JD (fetch from URL, or parse pasted text)
2. Read cv.md, config/profile.yml, modes/_profile.md
3. Read modes/auto-pipeline.md for workflow steps
4. Score across 6 dimensions → overall weighted score
5. Generate evaluation report → reports/{num}-{slug}-{date}.md
6. If score >= 4.0: generate tailored HTML → PDF
7. Append row to data/applications.md
8. Present summary to user
```

### Batch Processing

```
1. Read modes/batch.md for workflow
2. Collect list of URLs/JDs to process
3. For each offer, process each offer (use parallel sub-agents if available) with full context
4. Track progress in session SQL database
5. Collect results, merge tracker additions
6. Present batch summary to user
```

### Portal Scanning

```
1. Read portals.yml for target company URLs
2. Read data/scan-history.tsv for last scan dates
3. For each portal, fetch the careers page (use browser automation for SPAs)
4. Parse job listings, filter by relevance to archetypes
5. Present new matches to user
6. Add selected URLs to data/pipeline.md
7. Update data/scan-history.tsv
```

### Pattern Analysis

```
1. Read modes/patterns.md for workflow
2. Run node analyze-patterns.mjs for structured data
3. Analyze rejection reasons, score distributions, skill gaps
4. Cross-reference with config/profile.yml archetypes
5. Generate actionable recommendations
6. Save pattern analysis report to reports/pattern-analysis-{date}.md
7. Suggest profile/targeting updates to user
```

---

## 17. Error Handling & Edge Cases

| Scenario | Action |
|---|---|
| JD URL returns 403/404 | Tell user the URL is inaccessible. Ask them to paste the JD text instead. |
| CV is empty or missing | Trigger onboarding (§4). Do not proceed with evaluation. |
| Duplicate company+role in tracker | Warn user. Ask if they want to update the existing entry or create a new one. |
| PDF generation fails | Check that Playwright/Chromium is installed. Run `npx playwright install chromium`. Show full error. |
| Score is exactly 4.0 | Treat as borderline — generate PDF but flag the tradeoffs clearly. |
| User wants to apply to <4.0 offer | Allow it but add a clear warning in the report. Note the override in tracker. |
| Mode file doesn't exist | Fall back to `modes/_shared.md` rules and use best judgment. Inform user the mode file is missing. |
| Profile not configured | Trigger onboarding. Critical fields: name, target roles, location. |
| Batch worker fails | Log the failure in `batch/logs/`. Continue with remaining items. Report failures in summary. |
| Network unavailable | Skip web search and URL fetch steps. Use only local data. Inform user of limitations. |

---

## 18. Session Startup Checklist

Every time a new session begins, before processing any user request:

1. **Run update check** — `node update-system.mjs check` silently. Notify user only if an update is available (see §4).
2. **Check onboarding status** — verify `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml` exist.
3. **Read profile** — load `config/profile.yml` to understand user context.
4. **Read shared rules** — load `modes/_shared.md` for scoring and archetype definitions.
5. **Read user overrides** — load `modes/_profile.md` if it exists.
6. **Check tracker** — glance at `data/applications.md` to know the current report count and recent activity.
7. **Route intent** — match user message to the appropriate mode (§6).

If any critical file is missing, guide the user through onboarding before proceeding.

---

## 19. Report & Output File Structure

### Evaluation Report (`reports/{num}-{slug}-{date}.md`)

```markdown
# {num} — {Company} — {Role Title}

**Date:** {date}
**Source:** {url or "Direct paste"}
**Score:** {score}/5

## Dimension Scores
| Dimension | Score | Weight | Notes |
|---|---|---|---|
| ... | ... | ... | ... |

## Role Summary
...

## Fit Analysis
...

## Pros & Cons
...

## Recommendation
...
```

### Generated HTML/PDF

- HTML is written to `output/{num}-{slug}-{date}.html`
- PDF is generated from HTML via: `node generate-pdf.mjs output/{file}.html output/{file}.pdf`
- The HTML uses `templates/cv-template.html` as the base, with content injected from `cv.md` tailored to the specific JD.

---

## 20. Important Reminders

- **Read mode files before executing.** This instructions file defines routing and conventions. The actual workflow logic lives in each `modes/*.md` file.
- **Never modify user-layer files without being asked.** This includes `cv.md`, `config/profile.yml`, and everything in `data/`, `reports/`, `output/`.
- **Always use canonical states.** Don't invent new statuses.
- **Always zero-pad report numbers.** `007`, not `7`.
- **Always use ISO 8601 dates.** `2025-04-08`, not `April 8, 2025`.
- **Always check for duplicates** before adding tracker rows.
- **Always present results to the user** before considering a task complete.
- **Use `--no-pager`** with all git commands.
- **ATS normalization** is handled by `generate-pdf.mjs` — it converts smart quotes, em-dashes, and zero-width characters automatically.
- **Font paths** are resolved relative to the `fonts/` directory. The PDF generator handles path rewriting.
