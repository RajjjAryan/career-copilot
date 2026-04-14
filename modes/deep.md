# deep.md — Deep Company Research

> **Trigger**: User wants in-depth research on a specific company before interview or application.
> **Input**: Company name (and optionally role/URL).
> **Output**: Structured research brief across 6 axes.

---

## Prerequisites

```
Read `modes/_shared.md`
Read `modes/_profile.md`
Read `data/cv.md`
```

If a report exists for this company, load it for context:
```
Read `reports/{matching-report}.md`
```

---

## Research Execution

For each axis, run targeted `web_search` queries. Cite all sources.

---

## Axis 1 — AI / Tech Strategy

```
Search the web for: `{company} AI strategy products {current year}`
Search the web for: `{company} engineering blog technology stack`
Search the web for: `{company} machine learning platform papers`
```

Research and document:

- **Core products/services**: What does the company actually build?
- **Tech stack**: Known languages, frameworks, infrastructure
- **AI/ML usage**: How are they using AI? Is it core or peripheral?
- **Engineering blog**: URL + summary of recent posts (indicates culture maturity)
- **Research papers**: Any published papers? (indicates R&D investment)
- **Open source**: Notable OSS contributions or projects

---

## Axis 2 — Recent Moves (Last 6 Months)

```
Search the web for: `{company} news last 6 months {current year}`
Search the web for: `{company} funding acquisition launch {current year}`
Search the web for: `{company} key hires leadership changes {current year}`
```

Document:

- **Funding**: Recent rounds, valuation, investors
- **Acquisitions**: Companies or teams acquired
- **Product launches**: New products, features, pivots
- **Key hires**: Notable executive or engineering hires
- **Layoffs/restructuring**: Any recent downsizing or reorgs
- **Partnerships**: Strategic partnerships or integrations

---

## Axis 3 — Engineering Culture

```
Search the web for: `{company} engineering culture Glassdoor reviews`
Search the web for: `{company} developer experience deploy cadence`
Search the web for: `{company} remote work policy {current year}`
```

Document:

- **Deploy cadence**: How often do they ship? (daily, weekly, monthly)
- **Tech stack age**: Modern or legacy? Monolith or microservices?
- **Remote policy**: Fully remote, hybrid, on-site? Any changes recently?
- **Glassdoor/Blind reviews**: Engineering-specific sentiment (summarize, don't copy)
- **Interview process**: Known interview format, difficulty, timeline
- **Team structure**: Squad model, matrix, hierarchical?
- **On-call / incident culture**: SRE practices, blameless postmortems?

---

## Axis 4 — Probable Challenges

```
Search the web for: `{company} engineering challenges scaling`
Search the web for: `{company} technical debt migration`
```

Infer probable challenges based on company stage, stack, and growth:

- **Scaling**: Are they hitting growth bottlenecks? (traffic, data, team size)
- **Reliability**: Any public incidents or outages? SLA pressures?
- **Migration**: Legacy system migrations in progress? Cloud transitions?
- **Hiring**: Are they struggling to fill roles? (many open positions = capacity issue)
- **Technical debt**: Signals from reviews, blog posts, or job descriptions
- **Regulatory**: Industry-specific compliance challenges (GDPR, SOC2, HIPAA)

---

## Axis 5 — Competitors & Differentiation

```
Search the web for: `{company} competitors market position`
Search the web for: `{company} vs {likely competitor}`
```

Document:

- **Direct competitors**: Who are they competing with?
- **Differentiation**: What's their moat? (technology, market position, data, brand)
- **Market position**: Leader, challenger, niche player?
- **Threats**: What could disrupt them? (new entrants, tech shifts, regulation)
- **Advantages**: What do they do better than competitors?

---

## Axis 6 — Candidate Angle

This is the most important axis — it connects the research to **you**.

```
Read `data/cv.md`
Read `modes/_profile.md`
```

Document:

- **Unique value**: What do you bring that other candidates don't?
- **Relevant projects**: Which cv.md projects map to their challenges?
- **Interview story**: What narrative should you tell in the interview?
  - Opening: How you found them + why they interest you (specific, not generic)
  - Middle: How your experience maps to their challenges
  - Close: What you'd do in the first 90 days
- **Questions to ask them**: 5 smart questions that demonstrate your research
- **Things to avoid**: Topics, opinions, or framing that might not land well

---

## Output Format

```markdown
---
## 🔍 Deep Research: {Company}

**Generated**: {YYYY-MM-DD}
**Role context**: {role title, if applicable}
**Sources**: {count} web searches conducted

### 1. AI / Tech Strategy
{findings}

### 2. Recent Moves (Last 6 Months)
{findings with dates}

### 3. Engineering Culture
{findings}

### 4. Probable Challenges
{inferred challenges with evidence}

### 5. Competitors & Differentiation
{market analysis}

### 6. Your Angle
{personalized strategy}

#### Questions to Ask
1. {smart question}
2. {smart question}
3. {smart question}
4. {smart question}
5. {smart question}

---
**Confidence level**: {High/Medium/Low — based on data availability}
**Key gap**: {what you couldn't find that matters}
---
```

Save research to `reports/deep-{company-slug}-{YYYY-MM-DD}.md`.
