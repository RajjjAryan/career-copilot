# auto-pipeline.md — Full Auto Pipeline

> **Trigger**: User pastes a JD (URL or text) without specifying a mode.
> **Behavior**: Run the complete pipeline end-to-end automatically.
> **Philosophy**: One paste → evaluation + PDF + application draft + tracker update.

---

## Prerequisites

Read in order:

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="cv.md")
view(path="article-digest.md")
```

---

## Pipeline Steps

### Step 0 — Extract JD

- **If raw text**: use the pasted text directly — no fetch needed
- **If URL**: follow this priority order to extract the JD:
  1. **Playwright (preferred):** Most job portals (Lever, Ashby, Greenhouse, Workday) are SPAs. Use `browser_navigate` + `browser_snapshot` to render and read the JD.
  2. **WebFetch (fallback):** For static pages (ZipRecruiter, WeLoveProduct, company career pages). Use `web_fetch(url="{URL}")`.
  3. **WebSearch (last resort):** Search for role title + company on secondary portals that index JDs in static HTML.
- **Validate**: confirm you have company name, role title, and requirements list
- **If no method works**: ask user to paste the JD text or share a screenshot

### Step 1 — Evaluate (Blocks A–F)

Execute the full evaluation from `modes/evaluate.md`:

1. Detect archetype
2. Generate Blocks A through F
3. Calculate global score
4. Save report to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

**Store results in context**: report path, score, archetype, company slug

### Step 2 — Save Report

The report is saved during Step 1. Confirm the save:

```
Report saved: reports/{###}-{company-slug}-{YYYY-MM-DD}.md
```

### Step 3 — Generate PDF

Execute PDF generation from `modes/pdf.md`:

1. Read `data/cv.md`
2. Use JD from Step 0
3. Detect language and paper format
4. Apply archetype-specific framing from Step 1
5. Generate tailored CV
6. Save PDF to `output/cv-{company-slug}-{YYYY-MM-DD}.pdf`

**Store result**: PDF path

### Step 4 — Draft Application Answers (Conditional)

**Only if score >= 4.5 (Strong)**:

1. Re-read the JD for application form questions (look for: "Why do you want to work here?", "Tell us about yourself", custom questions)
2. If questions can't be extracted, use these generic questions:
   - Why are you interested in this role?
   - Why do you want to work at [Company]?
   - Tell us about a relevant project or achievement
   - What makes you a good fit for this position?
   - How did you hear about this role?
3. Generate personalized answers:

**Tone — Position: "I'm choosing you."** The candidate has options and is choosing this company for concrete reasons.

| Question Framework | Approach |
|-------------------|----------|
| **Why this role?** | "Your [specific thing] maps directly to [specific thing I built]." |
| **Why this company?** | Mention something concrete. "I've been using [product] for [time/purpose]." |
| **Relevant experience?** | One quantified proof point. "Built [X] that [metric]. Sold the company in 2025." |
| **Good fit?** | "I sit at the intersection of [A] and [B], which is exactly where this role lives." |
| **How did you hear?** | Honest: "Found through [portal/scan], evaluated against my criteria, and it scored highest." |

**Tone rules:**
- Confident without arrogance — show evidence, not claims
- Specific and concrete — always reference something REAL from JD and from CV
- Direct, no fluff — 2-4 sentences per answer, no "I'm passionate about..."
- The hook is the proof, not the assertion — "I built X that does Y" not "I'm great at X"
- Language: same as the JD (EN default)

4. Present answers formatted for easy copy-paste

**If score < 4.5**: Skip this step, note in summary that application drafting was skipped due to score.

### Step 4.5 — Auto-Apply Attempt (Conditional)

**Only if**:
1. Score >= `auto_apply.min_score` from `config/profile.yml` (default 4.0)
2. `auto_apply.enabled` is not `false` in `config/profile.yml`
3. A source URL is available (not a direct text paste)
4. A tailored PDF was generated in Step 3

**Flow**:
1. Detect platform from source URL using `lib/platform-detect.mjs`
2. If automatable (Greenhouse, Lever):
   - Call `autoApply()` from `lib/apply-engine.mjs` with resume PDF and profile
   - If successful: set status to `Applied`, note = `✅ Auto-applied ({platform})`
   - If failed: set note = `🔴 Auto-apply failed ({reason}) — apply manually`
3. If manual-only platform:
   - Set note = `🔴 Manual apply needed ({platform} — {reason})`
4. Present result to user before proceeding to Step 5

**Skip conditions** (proceed directly to Step 5):
- No source URL available (pasted JD text)
- Score below threshold
- Auto-apply disabled in profile
- No PDF generated (Step 3 failed)

### Step 5 — Update Tracker

Append to `data/applications.md` with all columns populated:

```
| {###} | {YYYY-MM-DD} | {Company} | {Role} | {Score}/5 | {Status} | {PDF} | [{###}](reports/{filename}) | {Notes} |
```

**Status determination:**
- If Step 4.5 auto-applied successfully → `Applied`
- If Step 4 was executed and user confirmed manual submission → `Applied`
- Otherwise → `Evaluated`

**Notes field:**
- Include auto-apply result if Step 4.5 ran (e.g., `✅ Auto-applied (Greenhouse)` or `🔴 Manual apply needed (Ashby)`)
- Include source URL if available

---

## Error Handling

If any step fails, **continue with remaining steps**:

- Step 0 fails → abort (no JD = no pipeline)
- Step 1 fails → abort (no evaluation = no downstream)
- Step 2 fails → log error, continue to Step 3
- Step 3 fails → log error, continue to Step 4
- Step 4 fails → log error, continue to Step 4.5
- Step 4.5 fails → log error, flag as manual apply, continue to Step 5
- Step 5 fails → log error, present manual tracker line for user to add

Always present a summary showing which steps succeeded and which failed.

---

## Pipeline Summary Output

```markdown
---
## 🚀 Pipeline Complete

| Step | Status | Output |
|------|--------|--------|
| Extract JD | ✅ | {company} — {role} |
| Evaluate A–F | ✅ | Score: {X.X}/5 ({label}) |
| Save Report | ✅ | reports/{filename} |
| Generate PDF | ✅/❌ | output/{pdf-filename} |
| Application Draft | ✅/⏭️ | {drafted / skipped (score < 4.5)} |
| Auto-Apply | ✅/🔴/⏭️ | {auto-applied / manual needed / skipped} |
| Update Tracker | ✅ | Entry #{###} added |

**Archetype**: {detected}
**Score**: {X.X}/5
**Verdict**: {recommendation}
**Time**: {elapsed time}
---
```
