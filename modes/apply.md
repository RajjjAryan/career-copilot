# apply.md — Application Form Assistant

> **Trigger**: User is filling out an application form and needs help with answers.
> **Input**: Offer URL/description + form questions.
> **Output**: Personalized, copy-paste-ready answers for each question.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
view(path="data/article-digest.md")
```

---

## Step 1 — Detect Offer

Identify which offer the user is applying to:

- **If URL provided**: `web_fetch(url="{URL}")` to get JD details
- **If company/role mentioned**: Search `data/applications.md` for a matching entry
- **If ambiguous**: Ask user to clarify which offer

### Find Matching Report

```
view(path="data/applications.md")
```

Search for the company/role to find the report path. If a report exists:

```
view(path="reports/{matching-report}.md")
```

If no report exists, run a quick evaluation first (Blocks A–C from `modes/evaluate.md`).

---

## Step 2 — Load Context

Gather all context needed for personalized answers:

1. **Report**: Full evaluation (archetype, score, match table, comp data, company intel)
2. **CV**: `data/cv.md` — all experience, metrics, achievements
3. **Profile**: `modes/_profile.md` — exit narrative, cross-cutting advantage, targets
4. **Articles**: `data/article-digest.md` — published work for credibility signals

---

## Step 3 — Analyze Form Questions

Common application questions and their strategies:

| Question Type | Strategy | Sources |
|--------------|----------|---------|
| "Why this company?" | Specific company research + personal alignment | Report Block D + _profile.md narrative |
| "Why this role?" | Role-to-CV match + career trajectory | Report Block B + _profile.md targets |
| "Tell us about yourself" | Professional summary adapted to role | cv.md + archetype framing |
| "Salary expectations" | Use _profile.md negotiation scripts | _profile.md comp targets + Report Block D |
| "What's your biggest achievement?" | Top STAR story from Report Block F | cv.md + report |
| "Describe a challenge" | STAR story mapped to role requirements | cv.md + report Block F |
| "Why are you leaving?" | Exit narrative from _profile.md | _profile.md |
| "What are your strengths?" | CV-backed skills aligned to JD | cv.md + report Block B |
| "Cover letter" | Full personalized letter | All sources |
| Custom questions | Analyze intent, map to CV evidence | cv.md + report |

---

## Step 4 — Generate Answers

### Tone: "I'm Choosing You"

Every answer should convey:
- **Confidence**: "I bring X" not "I think I could maybe help with X"
- **Specificity**: Reference exact company details, not generic statements
- **Selectivity**: "I'm drawn to {company} because of {specific thing}" — implies you have options
- **Evidence**: Every claim backed by a cv.md metric or achievement

### Do NOT:
- Sound desperate ("I would love the opportunity to...")
- Be generic ("I'm passionate about technology...")
- Over-qualify ("I believe my experience might be relevant...")
- Name-drop without purpose
- Use corporate-speak (see banned phrases in `_shared.md`)

### Answer Format

For each question, generate:

```markdown
### Q: {Question text}

**Answer** ({word count} words):

{Generated answer}

---
*Sources: cv.md L{XX}, report Block {X}, _profile.md*
```

### Length Guidelines

| Question Type | Target Length |
|--------------|-------------|
| Short answer (text field) | 50–100 words |
| Medium answer (text area) | 150–250 words |
| Cover letter | 250–400 words |
| "Tell us about yourself" | 200–300 words |
| "Why this company?" | 150–200 words |
| Salary expectations | 1–2 sentences |

---

## Step 5 — Present for Copy-Paste

Format all answers cleanly for easy copy-paste:

```markdown
---
## 📝 Application Answers: {Company} — {Role}

### Q1: {question}
{answer}

---

### Q2: {question}
{answer}

---

### Q3: {question}
{answer}

---

**Prepared for**: {Company} — {Role}
**Score**: {X.X}/5
**Report**: reports/{filename}
**Date**: {YYYY-MM-DD}
---
```

---

## Step 6 — Post-Apply Actions

After user confirms they've submitted the application:

1. **Update tracker status**:

```
edit(path="data/applications.md",
  old_str="| {###} | {Company} | {Role} | {Score} | {CurrentStatus} |",
  new_str="| {###} | {Company} | {Role} | {Score} | Applied |")
```

2. **Suggest next steps**:
   - Run `contact` mode for LinkedIn outreach to hiring manager
   - Run `interview-prep` mode to start prepping for interviews
   - Set a reminder to check back in 1 week (mark as Ghosted if no response in 2 weeks)
