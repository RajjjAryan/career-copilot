# project.md — Portfolio Project Evaluation

> **Trigger**: User has a project idea and wants to know if it's worth building.
> **Input**: Project description, target audience, or problem statement.
> **Output**: 6-dimension score with verdict and interview pack guidance.

---

## Prerequisites

```
Read `modes/_shared.md`
Read `modes/_profile.md`
Read `data/cv.md`
```

---

## Research Phase

If the project involves a specific technology or domain:

```
Search the web for: "{project domain} portfolio projects {target role}"
Search the web for: "{technology} demo projects GitHub {current year}"
```

---

## Evaluation Dimensions

### Dimension 1 — Signal for Target Roles (Weight: 25%)

Does building this project send the right signal to employers?

| Score | Criteria |
|-------|---------|
| 5 | Directly demonstrates core skill for target roles — would be discussed in every interview |
| 4 | Demonstrates important adjacent skill — strong talking point |
| 3 | Shows general engineering competence — useful but not differentiating |
| 2 | Weak signal — doesn't map to what target employers care about |
| 1 | Wrong signal — might confuse or concern target employers |

Cross-reference with `_profile.md` target roles and recent JD evaluations.

### Dimension 2 — Uniqueness (Weight: 20%)

Is this project differentiated from the thousands of others?

| Score | Criteria |
|-------|---------|
| 5 | Novel concept or approach — nothing like it exists publicly |
| 4 | Existing concept with unique twist — clearly differentiated |
| 3 | Common concept but well-executed — stands out through quality |
| 2 | Very common project — yet another todo app, weather app, etc. |
| 1 | Copy-paste tutorial project — recruiters have seen 1000 of these |

Search the web to check how many similar projects exist on GitHub.

### Dimension 3 — Demo-ability (Weight: 20%)

Can you show this project in 60 seconds and impress someone?

| Score | Criteria |
|-------|---------|
| 5 | Instantly impressive — visual, interactive, "wow" factor |
| 4 | Clear and compelling demo — easy to understand and appreciate |
| 3 | Requires explanation but demo-able — needs context to appreciate |
| 2 | Hard to demo — mostly backend/infrastructure, no visible output |
| 1 | Cannot be demoed — conceptual only, or requires complex setup |

Consider: Can this be deployed as a live demo? Does it have a good README with screenshots?

### Dimension 4 — Metrics Potential (Weight: 15%)

Can you quantify the results for your resume?

| Score | Criteria |
|-------|---------|
| 5 | Multiple strong metrics — performance, scale, accuracy, users |
| 4 | 2-3 quantifiable outcomes — clear numbers to cite |
| 3 | 1-2 metrics possible — some things to measure |
| 2 | Metrics would be artificial — "processed 100 test records" |
| 1 | No meaningful metrics — nothing to quantify |

Think about: throughput, latency, accuracy, user count, data volume, cost savings.

### Dimension 5 — Time to MVP (Weight: 10%)

How quickly can you have something working and presentable?

| Score | Criteria |
|-------|---------|
| 5 | Weekend project — MVP in 1-2 days |
| 4 | One-week sprint — MVP in 5-7 days |
| 3 | Two-week project — MVP in 10-14 days |
| 2 | Month-long project — high risk of not finishing |
| 1 | Multi-month project — almost certainly won't finish during job search |

Prefer fast MVPs — you can always iterate after getting hired.

### Dimension 6 — STAR Story Potential (Weight: 10%)

Can this project fuel a compelling interview story?

| Score | Criteria |
|-------|---------|
| 5 | Rich with challenges, decisions, tradeoffs, and measurable outcomes |
| 4 | Good story arc — clear problem → solution → result |
| 3 | Decent story — but might feel like "I built a thing" |
| 2 | Weak story — straightforward build with no interesting challenges |
| 1 | No story — just followed a tutorial, nothing to discuss |

Consider: What technical decisions did you make? What tradeoffs? What did you learn?

---

## Scoring & Verdict

### Score Calculation

```
Weighted Score = (D1 × 0.25) + (D2 × 0.20) + (D3 × 0.20) + (D4 × 0.15) + (D5 × 0.10) + (D6 × 0.10)
```

### Verdicts

| Score Range | Verdict | Action |
|-------------|---------|--------|
| 4.0 – 5.0 | **🚀 BUILD** | Start immediately. Include timeline and milestones. |
| 3.0 – 3.9 | **🔄 PIVOT TO** | The core idea has value but needs a twist. Suggest a specific pivot. |
| Below 3.0 | **⏭️ SKIP** | Not worth the time. Suggest a better alternative. |

---

## Interview Pack Requirements

For every BUILD project, define the Interview Pack — three deliverables that maximize interview impact:

### 1. One-Pager (README)

A concise project summary for sharing with interviewers:

- **Problem**: What problem does this solve? (1 sentence)
- **Solution**: What did you build? (1 sentence)
- **Architecture**: System diagram (keep it simple — 5-7 boxes)
- **Key decisions**: Top 3 technical decisions and why
- **Results**: Quantified metrics (from Dimension 4)
- **Stack**: Technologies used and why each was chosen

### 2. Demo

A 60-second demonstration plan:

- **Setup**: How to run it (ideally: live URL)
- **Script**: What to show in 60 seconds (beat by beat)
- **Wow moment**: The single most impressive thing to highlight
- **Fallback**: What to do if the demo fails (screenshots, video)

### 3. Postmortem

A reflective analysis for behavioral interview questions:

- **What went well**: Top 3 things that worked
- **What didn't**: Top 3 challenges or mistakes
- **What I'd change**: If starting over, what would be different?
- **What I learned**: Key technical and process takeaways
- **Scale plan**: How would this system handle 10x/100x load?

---

## Output Format

```markdown
---
## 🏗️ Project Evaluation: {Project Name}

**Concept**: {one-sentence description}
**Target roles**: {which archetypes from _profile.md}
**Estimated MVP time**: {X days/weeks}

### Scores

| Dimension | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Signal for Target Roles | 25% | {X}/5 | {brief justification} |
| Uniqueness | 20% | {X}/5 | {brief justification} |
| Demo-ability | 20% | {X}/5 | {brief justification} |
| Metrics Potential | 15% | {X}/5 | {brief justification} |
| Time to MVP | 10% | {X}/5 | {brief justification} |
| STAR Story Potential | 10% | {X}/5 | {brief justification} |
| **Weighted Total** | | **{X.X}/5** | |

### Verdict: {🚀 BUILD / 🔄 PIVOT TO / ⏭️ SKIP}

{2-3 sentences explaining the verdict}

### If BUILD — Execution Plan
1. Day 1-2: {milestone — core functionality}
2. Day 3-4: {milestone — key feature}
3. Day 5-6: {milestone — demo polish}
4. Day 7: {milestone — deploy + README}

### Interview Pack
**One-Pager**: {outline of what to include}
**Demo Script**: {beat-by-beat 60-second script}
**Postmortem Prep**: {key questions to reflect on}

### If PIVOT TO — Suggested Pivot
**Original**: {original concept}
**Pivot**: {modified concept with higher score}
**Why**: {what changes and why it's better}

### If SKIP — Better Alternatives
1. {alternative project} — Score estimate: {X.X}/5, Time: {X days}
2. {alternative project} — Score estimate: {X.X}/5, Time: {X days}
---
```
