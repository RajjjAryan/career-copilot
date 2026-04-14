# compare.md — Multi-Offer Comparison

> **Trigger**: User asks to compare 2+ evaluated offers.
> **Input**: Report numbers, company names, or URLs of previously evaluated offers.
> **Output**: Weighted scoring matrix with final ranking and recommendation.

---

## Prerequisites

```
Read `modes/_shared.md`
Read `modes/_profile.md`
```

Then read each report being compared:

```
Read `reports/{report-file-1}.md`
Read `reports/{report-file-2}.md`
# ... for each offer
```

---

## Scoring Matrix

### 10 Weighted Dimensions

| # | Dimension | Weight | Description | How to Score |
|---|-----------|--------|-------------|-------------|
| 1 | **North Star Alignment** | 25% | Does this role advance stated career goals? | From `_profile.md` targets vs. JD |
| 2 | **CV Match** | 15% | How well does experience map to requirements? | From Block B score |
| 3 | **Level (Senior+)** | 15% | Is this at or above candidate's current level? | From Block C assessment |
| 4 | **Estimated Comp** | 10% | How does comp compare to market + targets? | From Block D + `_profile.md` comp targets |
| 5 | **Growth Trajectory** | 10% | Where does this role lead in 2–3 years? | Infer from company stage, role scope, team size |
| 6 | **Remote Quality** | 5% | How well does remote policy match preferences? | From `_profile.md` location policy vs. JD |
| 7 | **Company Reputation** | 5% | Brand value, stability, engineering culture | From Block D web search results |
| 8 | **Tech Stack Modernity** | 5% | Is the stack current, growing, or legacy? | From JD tech requirements |
| 9 | **Speed to Offer** | 5% | How fast is the hiring process? | From interview process intel, company reviews |
| 10 | **Cultural Signals** | 5% | Values alignment, diversity, work-life balance | From JD language, Glassdoor, reviews |

### Scoring Scale

Each dimension scored 1–5:

| Score | Meaning |
|-------|---------|
| 5 | Exceptional — best possible outcome |
| 4 | Strong — clearly positive |
| 3 | Neutral — acceptable, no strong signal |
| 2 | Weak — concerning but not disqualifying |
| 1 | Poor — significant negative signal |

---

## Comparison Process

### Step 1 — Load Reports

For each offer to compare:

1. Read the evaluation report from `reports/`
2. Extract: company, role, archetype, global score, per-block scores
3. If a report doesn't exist, run `modes/evaluate.md` first

### Step 2 — Score Each Dimension

For each offer, score all 10 dimensions. Where data is available from the report, use it. For missing data, search the web to fill gaps.

### Step 3 — Build Comparison Table

```markdown
## Scoring Matrix

| Dimension (Weight) | {Company A} | {Company B} | {Company C} |
|--------------------|-------------|-------------|-------------|
| North Star (25%) | {score}/5 | {score}/5 | {score}/5 |
| CV Match (15%) | {score}/5 | {score}/5 | {score}/5 |
| Level (15%) | {score}/5 | {score}/5 | {score}/5 |
| Comp (10%) | {score}/5 | {score}/5 | {score}/5 |
| Growth (10%) | {score}/5 | {score}/5 | {score}/5 |
| Remote (5%) | {score}/5 | {score}/5 | {score}/5 |
| Reputation (5%) | {score}/5 | {score}/5 | {score}/5 |
| Tech Stack (5%) | {score}/5 | {score}/5 | {score}/5 |
| Speed (5%) | {score}/5 | {score}/5 | {score}/5 |
| Culture (5%) | {score}/5 | {score}/5 | {score}/5 |
| **Weighted Total** | **{X.XX}** | **{X.XX}** | **{X.XX}** |
```

### Step 4 — Generate Ranking

```markdown
## 🏆 Final Ranking

| Rank | Company | Role | Weighted Score | Key Strength | Key Risk |
|------|---------|------|---------------|-------------|---------|
| 1 | {company} | {role} | {X.XX}/5 | {top dimension} | {lowest dimension} |
| 2 | {company} | {role} | {X.XX}/5 | {top dimension} | {lowest dimension} |
| 3 | {company} | {role} | {X.XX}/5 | {top dimension} | {lowest dimension} |
```

### Step 5 — Recommendation

```markdown
## 💡 Recommendation

**Top Pick**: {Company} — {Role}

**Why**: {2-3 sentences explaining the recommendation, referencing specific dimension scores}

**Time-to-Offer Consideration**: {If the #1 pick is slow to hire but #2 is fast, note the tradeoff.
 A bird in hand may be worth more than a higher-scoring offer that takes 3 months.}

**Negotiation Leverage**: {If candidate has multiple offers, note how to use them in negotiation.
 "Company B's offer at $X strengthens your position with Company A."}

### Decision Framework

If offers are within 0.3 points of each other, they are effectively tied. In that case:
1. Prioritize the role with stronger North Star alignment
2. If still tied, prioritize the one with faster time-to-offer
3. If STILL tied, prioritize the one with better comp
```

---

## Output

Save comparison to `reports/compare-{YYYY-MM-DD}.md` and present the full analysis inline.
