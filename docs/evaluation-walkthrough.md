# Evaluation Walkthrough

> A step-by-step example of how career-copilot evaluates a job offer, showing what each block produces and how the scoring works.

---

## Starting the Evaluation

Paste a job URL into Copilot CLI:

```
Evaluate this: https://boards.greenhouse.io/example/jobs/12345
```

career-copilot reads your `cv.md`, `config/profile.yml`, `modes/_profile.md`, and `modes/_shared.md`, then runs the full A-F evaluation pipeline.

---

## Block A — Role Summary

The AI extracts structured metadata from the JD:

```markdown
## A — Role Summary

| Field | Value |
|-------|-------|
| **Company** | Acme Corp |
| **Role** | Senior Backend Engineer |
| **Archetype** | AI Platform / LLMOps |
| **Domain** | Developer Tools |
| **Function** | Engineering |
| **Seniority** | Senior |
| **Remote** | Hybrid (NYC, 3 days/week) |
| **Location** | New York, USA |
| **Team size** | 8-person platform team |
| **URL** | https://boards.greenhouse.io/example/jobs/12345 |

**TL;DR**: Build and maintain the AI inference platform serving 10M+ daily requests.
The team owns model deployment, observability, and cost optimization.
```

The **archetype** classification determines which scoring weights and profile sections apply.

---

## Block B — CV Match (Score: 4.2/5)

A requirement-by-requirement comparison against your CV:

```markdown
## B — CV Match (Score: 4.2/5)

### Requirements Mapping

| # | JD Requirement | CV Evidence | Strength |
|---|---------------|-------------|----------|
| 1 | 5+ years backend engineering | 7 years across 3 companies | ✅ Strong |
| 2 | Kubernetes & container orchestration | Led K8s migration for 200-service platform | ✅ Strong |
| 3 | ML model serving (TensorFlow Serving, Triton) | Deployed PyTorch models via custom pipeline | ⚠️ Partial |
| 4 | Observability (Datadog, Prometheus) | Built Grafana dashboards, Prometheus alerting | ✅ Strong |
| 5 | Cost optimization at scale | No direct evidence | ❌ Gap |

### Gaps & Mitigation

| Gap | Severity | Mitigation Strategy |
|-----|----------|---------------------|
| ML serving frameworks (Triton) | Medium | Adjacent: custom serving pipeline + quick Triton ramp-up |
| Cloud cost optimization | Low | Portfolio project on spot instance optimization |
```

**How scoring works**: Each requirement is weighted by how prominently it appears in the JD. Strong matches contribute fully, partial matches at 50%, gaps at 0%. The weighted average gives the block score.

---

## Block C — Level & Strategy (Score: 4.0/5)

Compares your seniority to what the JD expects:

```markdown
## C — Level & Strategy (Score: 4.0/5)

**JD Level**: Senior (IC4-IC5 equivalent)
**Candidate Level**: Senior-to-Staff trajectory
**Assessment**: At-level to slightly over-leveled

### Positioning Strategy
- Lead with: Platform ownership and cross-team impact
- Key proof points: Led K8s migration (cv.md §3), mentored 4 engineers (cv.md §5)
- Risk: None — strong at-level match with growth headroom
```

---

## Block D — Comp & Market (Score: 3.8/5)

Market research via web search:

```markdown
## D — Comp & Market (Score: 3.8/5)

### Market Compensation
| Source | Range |
|--------|-------|
| levels.fyi | $180K-$240K (Senior, NYC) |
| Glassdoor | $170K-$220K |
| H1B data | $195K (median, similar roles) |

### JD Stated Comp
$175K-$210K base + equity (if mentioned)

### Assessment
Slightly below market median for NYC Senior Backend. Equity could compensate.
Negotiate toward $200K+ base if offer comes in.
```

---

## Block E — Red Flags & Cultural Signals (Score: 4.5/5)

Proactive detection of concerns:

```markdown
## E — Red Flags & Cultural Signals (Score: 4.5/5)

### 🟢 Positive Signals
- Clear team structure and reporting line mentioned
- Concrete technical challenges (not vague "fast-paced")
- Remote flexibility (hybrid, not forced 5-day)

### 🟡 Watch
- "Startup mentality" in a 500-person company — could mean under-resourced

### 🔴 Red Flags
- None detected
```

---

## Block F — Final Verdict

The weighted global score and recommendation:

```markdown
## F — Final Verdict

| Dimension | Score | Weight |
|-----------|-------|--------|
| CV Match | 4.2 | 30% |
| Level & Strategy | 4.0 | 20% |
| Comp & Market | 3.8 | 20% |
| Cultural Signals | 4.5 | 15% |
| North Star Alignment | 4.0 | 15% |

### Global Score: 4.1 / 5 — Grade: B+

**Recommendation**: Good match, worth applying. Strong technical alignment
with moderate comp upside. The platform ownership scope matches your
growth trajectory.

### Suggested Next Steps
1. Apply with tailored CV (run `generate PDF` mode)
2. Prepare STAR stories for system design and K8s migration
3. Research the team lead on LinkedIn for culture fit signals
```

---

## Score Interpretation

| Score Range | Grade | Meaning |
|------------|-------|---------|
| 4.5+ | A | Strong match — apply immediately |
| 4.0–4.4 | B | Good match — worth applying |
| 3.5–3.9 | C | Decent but not ideal — apply only with specific reason |
| Below 3.5 | D-F | Recommend against applying |

---

## Output Files

After evaluation, career-copilot creates:

| File | Location | Content |
|------|----------|---------|
| Evaluation report | `reports/001-acme-corp-2026-04-10.md` | Full A-F analysis |
| Tailored PDF | `output/cv-acme-corp-2026-04-10.pdf` | ATS-optimized resume |
| Tracker entry | `data/applications.md` | Pipeline row with score and status |

---

## Try It Yourself

```bash
# 1. Setup (if not done)
bash setup.sh

# 2. Open Copilot CLI in this directory

# 3. Paste any job URL
# "Evaluate this: https://boards.greenhouse.io/company/jobs/123456"

# 4. For batch evaluation, add URLs to batch/batch-input.tsv and run:
# "Process the batch"
```
