# auto-apply.md — Automated Application Submission

> **Trigger**: User says "auto-apply", "submit application", or "apply to this"
> **Input**: Job URL + existing evaluation report + tailored PDF
> **Output**: Application submission result or manual-apply instructions

---

## Prerequisites

```
Read `modes/_shared.md`
Read `modes/_profile.md`
Read `config/profile.yml`
```

---

## Step 0 — Identify Target Offer

1. If URL provided: use directly
2. If company/role mentioned: search `data/applications.md` for matching entry, get URL from report
3. If ambiguous: ask user to specify

---

## Step 1 — Verify Readiness

Check these conditions before auto-applying:

1. **Score check**: Look up score in `data/applications.md` — must be >= `auto_apply.min_score` (default 4.0)
2. **PDF exists**: A tailored resume PDF must exist in `output/`
3. **Not duplicate**: Company+role must not already have status "Applied" in tracker
4. **Profile complete**: `config/profile.yml` must have `candidate.full_name` and `candidate.email`
5. **Auto-apply enabled**: `auto_apply.enabled` must not be `false` in profile

If any check fails, explain why and offer alternatives.

---

## Step 2 — Detect Platform

Use `lib/platform-detect.mjs` to identify the ATS platform from the job URL.

**Automatable platforms:**
- ✅ **Greenhouse** — via Job Board API (POST /applications)
- ✅ **Lever** — via form POST (may be blocked by reCAPTCHA)

**Manual-only platforms:**
- 🔴 **Ashby** — requires account login
- 🔴 **Workday** — heavy bot detection
- 🔴 **Workable** — future automation planned
- 🔴 **SmartRecruiters** — future automation planned
- 🔴 **Unknown** — apply manually

---

## Step 3 — Submit or Flag

### If automatable:

1. Load profile from `config/profile.yml`
2. Call `autoApply()` from `lib/apply-engine.mjs` with resume PDF and profile
3. If successful:
   - Update tracker status to `Applied`
   - Add note: `✅ Auto-applied ({platform})`
   - Show confirmation to user
4. If failed (reCAPTCHA, unanswered questions):
   - Fall back to manual mode
   - Show pre-filled answers from `modes/apply.md`

### If manual:

1. Show the direct apply URL
2. Offer to generate form answers: "Want me to prepare your application answers? Say 'help me apply'"
3. Update tracker note: `🔴 Manual apply needed ({platform} — {reason})`

---

## Step 4 — Summary

Present clear result:

```
✅ AUTO-APPLIED: [Company] — [Role]
   Platform:  Greenhouse
   Submitted: name, email, phone, resume PDF
   Status:    Applied
```

or

```
🔴 MANUAL APPLY NEEDED: [Company] — [Role]
   Platform:  Ashby (login required)
   Apply URL: https://jobs.ashbyhq.com/company/job-id
   Action:    Say "help me apply" for pre-filled answers
```

---

## Safety

- **Never** auto-apply below the score threshold without explicit user override
- **Never** apply twice to the same company+role
- **Always** show what was submitted after auto-applying
- **Max 5** auto-applications per hour (rate limited)
- **Dry-run** available: "auto-apply --dry-run" to preview without submitting
