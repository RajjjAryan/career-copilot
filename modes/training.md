# training.md — Course & Certification Evaluation

> **Trigger**: User asks whether they should take a course, get a cert, or invest in training.
> **Input**: Course/cert name, provider, and optionally a URL.
> **Output**: 6-dimension evaluation with actionable verdict.

---

## Prerequisites

```
Read `modes/_shared.md`
Read `modes/_profile.md`
Read `data/cv.md`
```

---

## Research Phase

```
Search the web for: "{course/cert name} review {current year}"
Search the web for: "{course/cert name} worth it {target role type}"
Search the web for: "{certification name} salary impact {current year}"
Search the web for: "{certification provider} reputation"
```

If URL provided:
```
Fetch the URL: {course URL}
```

---

## Evaluation Dimensions

### Dimension 1 — North Star Alignment (Weight: 25%)

How well does this training align with the candidate's stated career goals?

| Score | Criteria |
|-------|---------|
| 5 | Directly enables target role — listed as requirement in >50% of target JDs |
| 4 | Strongly supports target role — listed as preferred/nice-to-have |
| 3 | Tangentially related — builds adjacent skills |
| 2 | Weakly related — mostly for personal interest |
| 1 | Not aligned — time would be better spent elsewhere |

Cross-reference with `_profile.md` target roles and JDs from recent evaluations.

### Dimension 2 — Recruiter Signal (Weight: 20%)

How much does this cert/course move the needle in hiring?

| Score | Criteria |
|-------|---------|
| 5 | Hard gate — many target roles require it (e.g., AWS SAA for cloud roles) |
| 4 | Strong signal — recruiters actively filter for it |
| 3 | Nice to have — won't hurt, might help in a tiebreaker |
| 2 | Negligible — recruiters don't care, but it fills a LinkedIn section |
| 1 | Negative signal — suggests candidate needs validation for basic skills |

Search the web to check how often this cert appears in target JDs.

### Dimension 3 — Time & Effort (Weight: 20%)

Is the time investment justified by the expected return?

| Score | Criteria |
|-------|---------|
| 5 | < 1 week of effort, high impact |
| 4 | 1–4 weeks, good impact |
| 3 | 1–2 months, moderate impact |
| 2 | 3–6 months, uncertain impact |
| 1 | > 6 months, low or speculative impact |

Include: estimated study hours, exam difficulty, pass rate, renewal requirements.

### Dimension 4 — Opportunity Cost (Weight: 15%)

What else could the candidate do with this time?

| Score | Criteria |
|-------|---------|
| 5 | No better alternative — this is the highest-ROI use of time |
| 4 | Best option among alternatives |
| 3 | One or two comparable alternatives exist |
| 2 | Better alternatives available (building portfolio, contributing to OSS) |
| 1 | Time would be much better spent on job applications or interview prep |

Consider: portfolio projects, OSS contributions, interview prep, networking.

### Dimension 5 — Risk (Weight: 10%)

What could go wrong?

| Score | Criteria |
|-------|---------|
| 5 | No downside — even if it doesn't help hiring, skills are valuable |
| 4 | Minimal risk — small time/money investment |
| 3 | Moderate risk — significant time commitment with uncertain payoff |
| 2 | High risk — expensive, time-consuming, or cert may lose relevance |
| 1 | Very risky — predatory provider, cert is losing market value, or locks you into niche |

Check: provider reputation, cert longevity, market trends.

### Dimension 6 — Portfolio Deliverable (Weight: 10%)

Does this training produce something you can show?

| Score | Criteria |
|-------|---------|
| 5 | Produces a capstone project that doubles as portfolio piece |
| 4 | Includes hands-on labs with shareable results |
| 3 | Provides a credential badge/cert to display |
| 2 | Theory-only — nothing tangible to show |
| 1 | No output — just another line on the resume |

---

## Scoring & Verdict

### Score Calculation

```
Weighted Score = (D1 × 0.25) + (D2 × 0.20) + (D3 × 0.20) + (D4 × 0.15) + (D5 × 0.10) + (D6 × 0.10)
```

### Verdicts

| Score Range | Verdict | Action |
|-------------|---------|--------|
| 4.0 – 5.0 | **✅ DO** | Commit to it. Include a study plan with milestones. |
| 3.0 – 3.9 | **⏱️ DO WITH TIMEBOX** | Worth doing only if you set a strict time limit. Define an exit point. |
| Below 3.0 | **❌ DON'T** | Skip it. Suggest a better alternative. |

---

## Output Format

```markdown
---
## 🎓 Training Evaluation: {Course/Cert Name}

**Provider**: {provider name}
**Cost**: {cost or free}
**Time commitment**: {estimated hours/weeks}
**URL**: {if provided}

### Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| North Star Alignment (25%) | {X}/5 | {brief justification} |
| Recruiter Signal (20%) | {X}/5 | {brief justification} |
| Time & Effort (20%) | {X}/5 | {brief justification} |
| Opportunity Cost (15%) | {X}/5 | {brief justification} |
| Risk (10%) | {X}/5 | {brief justification} |
| Portfolio Deliverable (10%) | {X}/5 | {brief justification} |
| **Weighted Total** | **{X.X}/5** | |

### Verdict: {✅ DO / ⏱️ DO WITH TIMEBOX / ❌ DON'T}

{2-3 sentences explaining the verdict}

### If DO — Study Plan
1. Week 1: {milestone}
2. Week 2: {milestone}
3. ...
4. Target completion: {date}
5. Portfolio output: {what you'll build/show}

### If DON'T — Better Alternatives
1. {alternative} — Why: {reason}, Time: {estimate}
2. {alternative} — Why: {reason}, Time: {estimate}

### If DO WITH TIMEBOX — Boundaries
- **Max time**: {X weeks/hours}
- **Exit criteria**: If {condition}, stop and switch to {alternative}
- **Minimum viable outcome**: {what you need to get out of it to justify the time}
---
```
