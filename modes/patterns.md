# patterns.md — Rejection Pattern Analysis

> **Trigger**: User asks to analyze rejection patterns, review application history, or identify targeting gaps.
> **Input**: `data/applications.md`, all reports in `reports/`, config files.
> **Output**: Pattern analysis report saved to `reports/pattern-analysis-{YYYY-MM-DD}.md`.

---

## Prerequisites

Before analyzing, read these files in order:

```
Read `modes/_shared.md`
Read `modes/_profile.md`
Read `data/applications.md`
Read `config/profile.yml`
```

Then read all report files:

```
# List all .md files in reports/ directory (skip .gitkeep) and read each one
```

---

## Step 1 — Load Application History & Reports

1. Read `data/applications.md` and parse every row of the tracker table
2. Read every report file in `reports/` — extract scores, gaps, matches, archetypes, and recommendations
3. If the tracker is empty or missing, stop and tell the user: "No application history found. Run some evaluations first."

---

## Step 2 — Run Structured Analysis

Run the analysis script to get machine-readable metrics:

```bash
node analyze-patterns.mjs
```

Parse the JSON output. If the script fails, fall back to manual analysis of the tracker and reports.

The script returns:

| Field | Type | Description |
|-------|------|-------------|
| `total_applications` | number | Total tracked applications |
| `by_status` | object | Count per status (Evaluated, Applied, Rejected, etc.) |
| `by_score_range` | object | Count per score bucket (4.5+, 4.0–4.4, 3.5–3.9, <3.5) |
| `by_company` | array | List of companies applied to |
| `top_gaps` | array | Most frequent gaps across all reports |
| `top_matches` | array | Most frequent strengths across all reports |
| `avg_score` | number | Average score across evaluated offers |
| `score_trend` | array | `{date, score}` pairs for trend analysis |
| `recommendations` | array | Auto-generated actionable suggestions |

---

## Step 3 — Categorize Rejections

Group non-successful outcomes by root cause. For each Rejected / Ghosted / Declined entry, read its report and classify the primary reason:

| Category | Signals in Report |
|----------|-------------------|
| **Experience Gap** | "Gap", "no evidence", "zero experience", severity: High |
| **Skill Mismatch** | Missing language/framework/tool listed as required |
| **Level Mismatch** | "under-leveled", "over-leveled", level assessment misalignment |
| **Location / Remote** | Location requirements, relocation, time zone conflicts |
| **Compensation** | Below target comp, geographic discount, equity mismatch |
| **Culture / Values** | Red flags, glassdoor, turnover signals |
| **Unknown** | Ghosted with no clear signal |

Present a breakdown:

```markdown
### Rejection Breakdown

| Category | Count | % | Example |
|----------|-------|---|---------|
| Experience Gap | {n} | {%} | {company — specific gap} |
| Skill Mismatch | {n} | {%} | {company — missing skill} |
| ... | ... | ... | ... |
```

---

## Step 4 — Archetype Performance

Cross-reference detected archetypes from reports with scores and outcomes:

```markdown
### Archetype Scoreboard

| Archetype | Apps | Avg Score | Best | Worst | Win Rate |
|-----------|------|-----------|------|-------|----------|
| Backend / Systems | {n} | {X.X} | {X.X} | {X.X} | {%} |
| AI / ML | {n} | {X.X} | {X.X} | {X.X} | {%} |
| DevOps / SRE | {n} | {X.X} | {X.X} | {X.X} | {%} |
| ... | ... | ... | ... | ... | ... |
```

**Win Rate** = (Interview + Offer) / Total for that archetype.

Identify:
- **Strongest archetype**: highest avg score and win rate
- **Weakest archetype**: lowest avg score — recommend dropping or retooling
- **Untested archetypes**: listed in `config/profile.yml` but no applications yet

---

## Step 5 — Recurring Skill Gaps

Aggregate all gaps from `top_gaps` and from manual report analysis:

```markdown
### Recurring Skill Gaps

| Skill / Area | Times Mentioned | Severity | Appears In |
|-------------|-----------------|----------|------------|
| {skill} | {n} | High/Med/Low | {report-001, report-003, ...} |
| ... | ... | ... | ... |
```

Rank by frequency. Flag anything appearing in 3+ reports as **critical**.

---

## Step 6 — Suggest Targeting Adjustments

Based on archetype performance and gap analysis, recommend changes to:

### Profile Archetypes (`config/profile.yml`)
- **Double down**: archetypes scoring 4.0+ consistently → increase search volume
- **Retool**: archetypes scoring 3.0–3.9 → address skill gaps before applying more
- **Drop**: archetypes scoring below 3.0 consistently → remove from target list

### Company Targeting (`portals.yml`)
- Companies/sectors with best match rates → add similar companies
- Companies/sectors with consistent mismatches → remove or deprioritize
- New sectors to explore based on strongest matches

---

## Step 7 — Suggest CV Improvements

Based on recurring gaps from Step 5, recommend specific CV changes:

```markdown
### CV Improvement Plan

| Priority | Gap | Recommendation | Action |
|----------|-----|----------------|--------|
| 🔴 P0 | {critical gap — 3+ mentions} | {specific suggestion} | {upskill / add project / reframe existing exp} |
| 🟡 P1 | {frequent gap — 2 mentions} | {specific suggestion} | {action} |
| 🟢 P2 | {occasional gap — 1 mention} | {specific suggestion} | {action} |
```

Each recommendation must be concrete:
- ❌ "Learn TypeScript" (too vague)
- ✅ "Build a small CLI tool in TypeScript and add to cv.md Projects section to close the TypeScript gap seen in Cloudflare (#001) and similar roles"

---

## Step 8 — Present Summary Dashboard

```markdown
---
# 📊 Pattern Analysis — {YYYY-MM-DD}

## At a Glance

| Metric | Value |
|--------|-------|
| Total Applications | {n} |
| Average Score | {X.X}/5 |
| Score Trend | {↑ improving / → flat / ↓ declining} |
| Top Archetype | {name} (avg {X.X}) |
| Bottom Archetype | {name} (avg {X.X}) |
| #1 Recurring Gap | {skill} ({n} mentions) |
| Conversion Rate | {Evaluated → Offer %} |

## 🎯 Top 3 Actions

1. **{action}** — {why, expected impact}
2. **{action}** — {why, expected impact}
3. **{action}** — {why, expected impact}

## 📈 Score Trend

{List scores chronologically to show trajectory}

---
```

---

## Post-Analysis

### 1. Save Report

Save the full analysis to:

```
reports/pattern-analysis-{YYYY-MM-DD}.md
```

Use `create` to write the file.

### 2. Present Next Steps

Suggest:
- Which CV gaps to address first (link to `modes/training.md` for upskilling)
- Which archetype to focus next applications on
- Whether to update `config/profile.yml` archetypes or `portals.yml` targets
- Run `modes/evaluate.md` on a new JD to test improvements
