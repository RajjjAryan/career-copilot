# contact.md — LinkedIn Outreach

> **Trigger**: User wants to reach out to someone at a target company.
> **Input**: Company name (and optionally role/URL).
> **Output**: Targeted LinkedIn message, max 300 characters.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
```

If a report exists for this company, load it:
```
view(path="reports/{matching-report}.md")
```

---

## Step 1 — Identify Targets

Use `web_search` to find 3–5 potential contacts:

```
web_search("{company name} {role area} hiring manager LinkedIn")
web_search("{company name} engineering recruiter LinkedIn")
web_search("{company name} {team/department} engineer LinkedIn")
```

### Target Priority

| Priority | Target Type | Why |
|----------|------------|-----|
| 1 | **Hiring Manager** | Direct decision maker — highest impact |
| 2 | **Recruiter / Talent Acquisition** | Controls pipeline — can fast-track |
| 3 | **Peer Engineer (same team)** | Internal referral — highest conversion rate |
| 4 | **Senior Engineer (adjacent team)** | Can introduce to hiring manager |
| 5 | **Any mutual connection** | Warm intro > cold outreach |

### Gather Intel on Each Target

For each identified target:
- Name and title
- How long at company (tenure signals influence)
- Recent posts/activity (for personalization hooks)
- Mutual connections (if discoverable)
- Published content (talks, articles, repos)

---

## Step 2 — Select Primary Target

Choose the target most likely to respond:

1. Prefer hiring managers over recruiters (more invested in filling the role)
2. Prefer active LinkedIn users (recent posts = they read messages)
3. Prefer people with mutual connections
4. Prefer people who've published content (gives you a hook)

---

## Step 3 — Generate Message

### Structure: Hook → Proof → Proposal

The message has exactly 3 sentences:

1. **Hook**: A specific insight about the company, their work, or something the target shared. NOT "I saw your job posting." Show you did your homework.

2. **Proof**: One quantified achievement from cv.md that's directly relevant to what this team does. Make it concrete and impressive.

3. **Proposal**: A specific, low-commitment ask. "15-min chat" or "quick question about the role" — NOT "I'd love to pick your brain."

### Constraints

- **Max 300 characters** (LinkedIn connection request limit)
- **No corporate-speak** (see banned phrases in `_shared.md`)
- **No "passionate about"** — ever
- **No phone number** — don't share in cold outreach
- **No attachment references** — LinkedIn doesn't support them in connection requests
- **No "Dear Sir/Madam"** — use first name
- **Language**: Same language as the JD (if available)

### Message Template

```
{First name}, {specific observation about their work/company/recent post}.

At {your company/context}, I {quantified achievement relevant to their team}.

Would you be open to a 15-min chat about {specific topic}?
```

---

## Step 4 — Generate Variants

Produce 3 message variants:

```markdown
---
## 💬 LinkedIn Outreach: {Target Name} @ {Company}

### Target Profile
- **Name**: {name}
- **Title**: {title}
- **Why them**: {reason for choosing this target}

### Variant A — Direct (recommended)
> {message — 300 chars max}

*Character count: {n}/300*

### Variant B — Referral-seeking
> {message variant — 300 chars max}

*Character count: {n}/300*

### Variant C — Content-based hook
> {message variant using their published content — 300 chars max}

*Character count: {n}/300*

### Other Targets Identified
| Name | Title | Reach-out Strategy |
|------|-------|--------------------|
| {name} | {title} | {brief strategy} |
| {name} | {title} | {brief strategy} |

### Timing
- **Best time to send**: Tuesday–Thursday, 8–10 AM target's time zone
- **Follow-up**: If no response in 5 days, try Target #2
- **Never**: Don't send on weekends or after 6 PM
---
```

---

## Rules

1. NEVER share phone number in cold outreach
2. NEVER send the same message to multiple people at the same company
3. NEVER mention salary, comp, or benefits in outreach
4. NEVER be self-deprecating or overly humble
5. NEVER use more than 300 characters (LinkedIn will truncate)
6. ALWAYS personalize — generic messages get ignored
7. ALWAYS reference something specific about the target or company
8. ALWAYS include exactly one quantified achievement
