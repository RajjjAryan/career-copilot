# evaluate.md — Single Offer Evaluation (Blocks A–F)

> **Trigger**: User pastes a JD (text or URL) and asks for evaluation.
> **Output**: Structured report with score, saved to `reports/`.

---

## Prerequisites

Before evaluating, read these files in order:

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="cv.md")
view(path="article-digest.md")
```

---

## Step 0 — JD Extraction & Archetype Detection

1. **If URL provided**: use `web_fetch(url="{JD_URL}")` to extract the job description text
2. **If text provided**: use directly
3. **Detect archetype** from the JD using the archetype table in `_shared.md`
4. **Detect JD language** — all output must be in the same language as the JD
5. **Extract metadata**: company name, role title, location, remote policy, seniority level

---

## Block A — Role Summary

Generate a structured summary:

```markdown
## A — Role Summary

| Field | Value |
|-------|-------|
| **Company** | {company name} |
| **Role** | {role title} |
| **Archetype** | {detected archetype} |
| **Domain** | {industry/vertical} |
| **Function** | {engineering, product, data, etc.} |
| **Seniority** | {junior, mid, senior, staff, principal, manager} |
| **Remote** | {remote, hybrid, on-site} |
| **Location** | {city, country} |
| **Team size** | {if mentioned} |
| **URL** | {JD URL} |

**TL;DR**: {2-sentence summary of what this role actually does and why it exists}
```

---

## Block B — CV Match

Build a requirements-to-CV mapping table:

```markdown
## B — CV Match (Score: X.X/5)

### Requirements Mapping

| # | JD Requirement | CV Evidence | Strength |
|---|---------------|-------------|----------|
| 1 | {requirement from JD} | {specific cv.md line/section} | ✅ Strong / ⚠️ Partial / ❌ Gap |
| 2 | ... | ... | ... |

### Gaps & Mitigation

| Gap | Severity | Mitigation Strategy |
|-----|----------|---------------------|
| {missing skill/exp} | High/Med/Low | {how to address: adjacent experience, quick upskill, portfolio project} |
```

**Archetype-specific adaptations:**
- **Backend/Systems**: Prioritize system design, scale metrics, reliability experience
- **AI/ML**: Prioritize model deployment, pipeline experience, research-to-prod
- **DevOps/SRE**: Prioritize infrastructure, automation, incident management
- **Frontend/Full-Stack**: Prioritize UI architecture, performance, accessibility
- **Product Manager**: Prioritize metrics impact, stakeholder management, strategy
- **Solutions Architect**: Prioritize breadth, client interaction, integration experience

---

## Block C — Level & Strategy

```markdown
## C — Level & Strategy (Score: X.X/5)

**JD Level**: {what the JD says or implies}
**Candidate Level**: {based on cv.md experience}
**Assessment**: {at-level, over-leveled, under-leveled}

### If Over-leveled (Sell Senior Plan)
- Position as: {how to frame seniority as value-add}
- Key proof points: {cv.md references showing leadership/scope}
- Risk: {potential concerns from employer — overqualified?}

### If Under-leveled (Stretch Plan)
- Bridge the gap with: {adjacent experience, growth trajectory}
- Key proof points: {cv.md references showing rapid growth}
- Risk: {what to address proactively in cover letter/interview}
```

---

## Block D — Comp & Market

```markdown
## D — Comp & Market (Score: X.X/5)
```

1. Run `web_search("{role title} salary {location} {current year}")` for market data
2. Run `web_search("{company name} engineering culture reviews")` for company intel
3. Run `web_search("{company name} {role title} interview")` for process intel

```markdown
### Market Compensation

| Metric | Value | Source |
|--------|-------|--------|
| Market P25 | ${amount} | {source} |
| Market P50 | ${amount} | {source} |
| Market P75 | ${amount} | {source} |
| Candidate Target | ${from _profile.md} | _profile.md |

### Company Intelligence

- **Reputation**: {what web_search reveals}
- **Funding/Stage**: {if applicable}
- **Glassdoor rating**: {if found}
- **Engineering blog**: {if found — indicates eng culture maturity}
- **Demand trend**: {is this role type hot/cooling in current market?}
```

---

## Block E — Personalization Plan

```markdown
## E — Personalization Plan

### Top 5 CV Customizations for This Role
1. {specific change — e.g., "Move K8s migration bullet to position 1 in Acme section"}
2. {specific change}
3. {specific change}
4. {specific change}
5. {specific change}

### Top 5 LinkedIn Optimizations
1. {specific change — e.g., "Add 'distributed systems' to headline"}
2. {specific change}
3. {specific change}
4. {specific change}
5. {specific change}
```

---

## Block F — Interview Prep

```markdown
## F — Interview Prep

### STAR+R Stories (mapped to JD requirements)

| # | JD Requirement | Story Title | Situation | Task | Action | Result | Reflection |
|---|---------------|-------------|-----------|------|--------|--------|------------|
| 1 | {requirement} | {story name} | {brief} | {brief} | {brief} | {quantified} | {lesson} |
| ... | ... | ... | ... | ... | ... | ... | ... |

Generate 6–10 stories covering the most critical JD requirements.

### Case Study Recommendation
- **Topic**: {relevant case study based on archetype}
- **Why**: {how it maps to JD}
- **Prep approach**: {key points to cover}

### Red-Flag Questions to Prepare For
1. {question an interviewer might ask about a gap or concern} — **Prep**: {how to answer}
2. ...
3. ...
```

---

## Post-Evaluation

### 1. Calculate Global Score

```
Global Score = (A_weight × A_score + B_weight × B_score + ... + F_weight × F_score)
```

Use weights from `_shared.md` scoring system.

### 2. Save Report

Determine next report number by reading `reports/` directory:

```python
# Filename format: {###}-{company-slug}-{YYYY-MM-DD}.md
# Example: 007-acme-corp-2024-03-15.md
```

Save full report to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` using `create`.

### 3. Register in Tracker

Append to `data/applications.md`:

```
| {###} | {YYYY-MM-DD} | {Company} | {Role} | {Score}/5 | Evaluated | — | [{###}](reports/{filename}) | {URL} |
```

### 4. Present Summary

```markdown
---
## 📊 Evaluation Complete

**Score**: {X.X}/5 — {Strong/Good/Decent/Weak}
**Archetype**: {detected}
**Verdict**: {1-sentence recommendation}
**Report**: reports/{filename}
**Next steps**: {suggest pdf generation, application, or pass}
---
```
