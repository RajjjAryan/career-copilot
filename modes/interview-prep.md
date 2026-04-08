# interview-prep.md — Interview Intelligence

> **Trigger**: User is preparing for an interview at a specific company and role.
> **Input**: Company name + role (and optionally interview stage).
> **Output**: Comprehensive interview prep guide saved to `interview-prep/`.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
view(path="data/article-digest.md")
view(path="interview-prep/story-bank.md")
```

If a report exists for this company, load it:
```
view(path="reports/{matching-report}.md")
```

---

## Step 1 — Research

Run targeted web searches to gather interview intelligence:

```
web_search("{company} interview process {role type} Glassdoor")
web_search("{company} interview questions {role type} Blind")
web_search("{company} coding interview LeetCode {current year}")
web_search("{company} engineering blog")
web_search("{company} {role title} interview experience {current year}")
```

**CRITICAL**: NEVER fabricate interview questions or statistics. Every question must be:
- Cited with source (Glassdoor, Blind, blog post, etc.)
- OR explicitly labeled as **[Inferred]** based on JD requirements / company tech stack

---

## Step 2 — Process Overview

```markdown
## 📋 Interview Process: {Company} — {Role}

| Aspect | Details | Source |
|--------|---------|--------|
| **Total rounds** | {n} | {source} |
| **Format** | {phone screen → technical → system design → behavioral → team fit} | {source} |
| **Duration** | {typical total timeline} | {source} |
| **Difficulty** | {Easy / Medium / Hard} | {source} |
| **Positive experience rate** | {%} | {source: Glassdoor} |
| **Known quirks** | {e.g., "They always ask about X", "Take-home project required"} | {source} |
| **Decision timeline** | {how long after final round} | {source} |
```

---

## Step 3 — Round-by-Round Breakdown

For each interview round:

```markdown
### Round {N}: {Round Name}

| Aspect | Details |
|--------|---------|
| **Duration** | {minutes} |
| **Format** | {video call, on-site, take-home, pair programming} |
| **Evaluator** | {title/role of typical interviewer} |
| **Focus** | {what they're evaluating} |

#### Likely Questions
1. {question} — *Source: {cited source}*
2. {question} — *Source: {cited source}*
3. {question} — **[Inferred]** *Based on: {JD requirement / company tech stack}*

#### Prep Actions
- [ ] {specific preparation task}
- [ ] {specific preparation task}
- [ ] {specific preparation task}
```

---

## Step 4 — Likely Questions Bank

Organize questions by category:

### Technical Questions

```markdown
| # | Question | Source | Difficulty | Prep Status |
|---|----------|--------|-----------|-------------|
| 1 | {question} | Glassdoor review, 2024-03 | Medium | ⬜ |
| 2 | {question} | Blind post | Hard | ⬜ |
| 3 | {question} | **[Inferred]** — JD requires distributed systems | Medium | ⬜ |
```

### Behavioral Questions

```markdown
| # | Question | Source | Story to Use |
|---|----------|--------|-------------|
| 1 | "Tell me about a time you dealt with ambiguity" | Glassdoor | story-bank.md: {story ref} |
| 2 | "Describe a conflict with a teammate" | Common behavioral | story-bank.md: {story ref} |
```

### Role-Specific Questions

```markdown
| # | Question | Source | Key Points |
|---|----------|--------|-----------|
| 1 | {question specific to this role/domain} | {source} | {key points to hit} |
```

### Red Flag / Background Questions

```markdown
| # | Potential Concern | Likely Question | Prepared Response |
|---|------------------|----------------|-------------------|
| 1 | {gap in CV, short tenure, career change} | "Why did you leave X?" | {prepared response using _profile.md exit narrative} |
| 2 | {missing skill from JD} | "Do you have experience with Y?" | {honest answer + adjacent experience + learning plan} |
```

---

## Step 5 — Story Bank Mapping

Map stories from `interview-prep/story-bank.md` to likely questions:

```markdown
## 📖 Story Mapping

| Story | Best For | JD Requirements Covered |
|-------|---------|------------------------|
| {story title from story-bank.md} | {question types} | {specific JD requirements} |
| {story title} | {question types} | {requirements} |

### Gaps — Stories Needed
- {JD requirement with no matching story} → **Action**: Write a STAR+R story about {topic}
- {JD requirement with no matching story} → **Action**: Write a STAR+R story about {topic}
```

---

## Step 6 — Technical Prep Checklist

Prioritized by frequency in interview reports:

```markdown
## 🔧 Technical Prep

### Must-Know (appeared in 50%+ of interviews)
- [ ] {topic — e.g., "System design: design a rate limiter"} — *{frequency/source}*
- [ ] {topic} — *{frequency/source}*

### Should-Know (appeared in 25-50% of interviews)
- [ ] {topic} — *{frequency/source}*
- [ ] {topic} — *{frequency/source}*

### Nice-to-Know (appeared occasionally)
- [ ] {topic} — *{frequency/source}*

### Recommended Practice Problems
1. {LeetCode/HackerRank problem} — Maps to: {company's known focus area}
2. {problem} — Maps to: {focus area}
3. {problem} — Maps to: {focus area}
```

---

## Step 7 — Company Signals

```markdown
## 🎯 Company Signals

### Values & Vocabulary
- They value: {list of values from careers page, blog, JD language}
- They say: {specific phrases/terminology they use — mirror these in interviews}
- They don't say: {what's conspicuously absent — may indicate what they're moving away from}

### Things to Emphasize
- {thing that aligns with their values + your cv.md evidence}
- {thing}
- {thing}

### Things to Avoid
- {topic or framing that might not land well — with reasoning}
- {topic}

### Smart Questions to Ask
1. {question that demonstrates research} — *Shows you know about: {topic}*
2. {question about team/process} — *Shows you care about: {topic}*
3. {question about challenges} — *Opens discussion about: {topic}*
4. {question about growth} — *Shows you're thinking long-term*
5. {question about recent initiative} — *Shows you follow their work*

### Questions to NEVER Ask in First Interview
- Salary/comp (unless they bring it up)
- PTO/benefits
- "What does the company do?" (shows no research)
- "Did I get the job?"
```

---

## Output

Save the complete prep guide:

```
create(path="interview-prep/{company-slug}-{role-slug}.md", file_text="{full prep content}")
```

```markdown
---
## ✅ Interview Prep Complete

**File**: interview-prep/{company-slug}-{role-slug}.md
**Company**: {company}
**Role**: {role}
**Sources cited**: {n}
**Questions cataloged**: {n} ({n} cited, {n} inferred)
**Stories mapped**: {n}/{total needed}
**Story gaps**: {n} — see "Gaps — Stories Needed" section

### Priority Actions
1. {most important prep action}
2. {second most important}
3. {third most important}
---
```
