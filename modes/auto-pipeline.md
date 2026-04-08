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
view(path="data/cv.md")
view(path="data/article-digest.md")
```

---

## Pipeline Steps

### Step 0 — Extract JD

- **If URL**: `web_fetch(url="{URL}")` → extract job description content from the page
- **If raw text**: use the pasted text directly
- **Validate**: confirm you have company name, role title, and requirements list
- **If extraction fails**: notify user and ask for text paste instead

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
2. If questions found, generate personalized answers:
   - Tone: "I'm choosing you" — confident, specific, not desperate
   - Content: map CV achievements to company needs
   - Length: concise, 150-250 words per answer
   - Include: specific company research from Block D
3. Present answers formatted for easy copy-paste

**If score < 4.5**: Skip this step, note in summary that application drafting was skipped due to score.

### Step 5 — Update Tracker

Append to `data/applications.md` with all columns populated:

```
| {###} | {Company} | {Role} | {Score} | Evaluated | {YYYY-MM-DD} | reports/{filename} | output/{pdf-filename} | {URL} |
```

If Step 4 was executed, update status to "Applied" if user confirms submission.

---

## Error Handling

If any step fails, **continue with remaining steps**:

- Step 0 fails → abort (no JD = no pipeline)
- Step 1 fails → abort (no evaluation = no downstream)
- Step 2 fails → log error, continue to Step 3
- Step 3 fails → log error, continue to Step 4
- Step 4 fails → log error, continue to Step 5
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
| Update Tracker | ✅ | Entry #{###} added |

**Archetype**: {detected}
**Score**: {X.X}/5
**Verdict**: {recommendation}
**Time**: {elapsed time}
---
```
