# Auto-Apply System — Design Spec

> Automatically submit job applications on platforms that support no-login submission.
> Flag the user clearly: "applied for you" vs "you need to apply manually."

## Problem

After evaluating an offer and generating a tailored PDF, the user must manually visit each portal and fill forms. This is tedious for high-scoring offers where the answer is obviously "apply." Many ATS platforms (Greenhouse, Lever) accept applications via API or form POST without requiring login — we should leverage this.

## Architecture

```
Evaluate → Generate PDF → Detect Platform → Auto-Apply?
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Greenhouse       Lever         Manual Flag
              (API POST)    (Form POST)    (Ashby, Workday, etc.)
                    │              │              │
                    ▼              ▼              ▼
              ✅ Applied       ✅ Applied    🔴 Manual Needed
              (auto)          (auto)        (URL + pre-filled answers)
                    │              │              │
                    └──────────────┴──────────────┘
                                   │
                              Update Tracker
                              Notify User
```

### Components

1. **`lib/platform-detect.mjs`** — URL → platform identification
2. **`lib/adapters/greenhouse.mjs`** — Greenhouse Job Board API adapter
3. **`lib/adapters/lever.mjs`** — Lever form POST adapter
4. **`lib/apply-engine.mjs`** — Orchestrator: detect → adapt → submit → report
5. **`modes/auto-apply.md`** — Mode file for Copilot CLI routing
6. **Updated `modes/auto-pipeline.md`** — Step 4.5: auto-apply after PDF generation

## Platform Detection

URL patterns → platform mapping:

| Pattern | Platform | Method |
|---------|----------|--------|
| `boards.greenhouse.io/{company}` | Greenhouse | API |
| `boards-api.greenhouse.io` | Greenhouse | API |
| `job-boards.greenhouse.io/{company}` | Greenhouse | API |
| `job-boards.eu.greenhouse.io/{company}` | Greenhouse | API |
| `{company}.greenhouse.io` | Greenhouse | API |
| `jobs.lever.co/{company}` | Lever | Form POST |
| `jobs.ashbyhq.com/{company}` | Ashby | Manual |
| `{company}.myworkdayjobs.com` | Workday | Manual |
| `apply.workable.com/{company}` | Workable | Manual (future: Playwright) |
| `{company}.recruitee.com` | Recruitee | Manual |
| `*.smartrecruiters.com` | SmartRecruiters | Manual (future: Playwright) |
| Everything else | Unknown | Manual |

## Greenhouse Adapter — API Submission

**Endpoint**: `POST https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}`

**Flow**:
1. Parse URL → extract `board_token` and `job_id`
2. `GET /v1/boards/{board_token}/jobs/{job_id}` → fetch required questions
3. Build multipart form: `first_name`, `last_name`, `email`, `phone`, `resume` (PDF), `cover_letter` (optional), custom question answers
4. `POST /v1/boards/{board_token}/jobs/{job_id}` with form data
5. Parse response: 200 = success, 4xx = validation error, 5xx = retry

**Custom Questions**: Greenhouse jobs may have custom questions (dropdown, text, file). The adapter will:
- Auto-answer common questions (visa status, start date, location) from `config/profile.yml`
- Flag unanswerable custom questions for user review
- If any required question can't be auto-answered → fall back to manual mode

## Lever Adapter — Form POST

**Endpoint**: `POST https://jobs.lever.co/{company}/{posting_id}/apply`

**Flow**:
1. Parse URL → extract `company` and `posting_id`
2. Fetch the job page to detect form fields and any hidden tokens
3. Build multipart form: `name`, `email`, `phone`, `org` (current company), `urls[LinkedIn]`, `urls[GitHub]`, `resume` (PDF file), `comments` (cover letter text)
4. POST to `/apply` endpoint
5. Parse response: redirect to thank-you = success, error page = failure

**Limitations**: Some Lever portals have reCAPTCHA. If detected → fall back to manual.

## Manual Flagging

For non-automatable platforms, the system provides:
1. Direct URL to the application page
2. Pre-filled answers (from `modes/apply.md` workflow)
3. Clear instruction: "You need to apply manually on this platform"
4. Tracker updated with note: `Manual apply needed — {platform}`

## Apply Engine — Orchestrator

```javascript
// lib/apply-engine.mjs
export async function autoApply({ jobUrl, reportPath, pdfPath, profilePath }) {
  const platform = detectPlatform(jobUrl);
  
  if (platform.autoApplySupported) {
    const result = await platform.adapter.submit({
      jobUrl, pdfPath, profile, customAnswers
    });
    return { status: 'applied', platform: platform.name, ...result };
  }
  
  return {
    status: 'manual',
    platform: platform.name,
    applyUrl: jobUrl,
    reason: platform.manualReason
  };
}
```

## User Profile Fields Used

From `config/profile.yml`:
- `candidate.full_name` → split into first/last name
- `candidate.email`
- `candidate.phone`
- `candidate.linkedin`
- `candidate.github`
- `candidate.location`

New optional fields (added to profile):
```yaml
auto_apply:
  enabled: true
  min_score: 4.0            # Only auto-apply above this score
  cover_letter: true         # Include cover letter with applications
  visa_status: "Authorized"  # For visa-related questions
  start_date: "Immediate"    # For start date questions
  referral_source: "Company career page"
```

## Tracker Integration

### New status note patterns

| Scenario | Status | Notes |
|----------|--------|-------|
| Auto-applied via Greenhouse | `Applied` | `✅ Auto-applied (Greenhouse)` |
| Auto-applied via Lever | `Applied` | `✅ Auto-applied (Lever)` |
| Auto-apply failed (reCAPTCHA) | `Evaluated` | `🔴 Manual apply needed (Lever — reCAPTCHA)` |
| Platform needs login | `Evaluated` | `🔴 Manual apply needed (Ashby — login required)` |
| Unknown platform | `Evaluated` | `🔴 Manual apply needed (unknown platform)` |

## Pipeline Integration

Updated auto-pipeline flow:

```
Step 0: Extract JD
Step 1: Evaluate (score)
Step 2: Save report
Step 3: Generate PDF (if score >= 4.0)
Step 4: Auto-apply attempt (NEW — if score >= min_score)
  4a: Detect platform from source URL
  4b: If automatable → submit application
  4c: If not → flag as manual
Step 5: Update tracker (with auto/manual status)
Step 6: Present summary to user
```

### Summary Output Format

```
📊 Pipeline Complete: Stripe — Senior Backend Engineer

Score:     4.3/5 (Strong match)
Report:    reports/042-stripe-senior-backend-2026-04-14.md
PDF:       output/042-stripe-senior-backend-2026-04-14.pdf

🟢 APPLICATION: Auto-applied via Greenhouse API
   Submitted: name, email, phone, resume PDF, cover letter
   Confirmation: Application #12345
```

Or for manual:

```
🔴 APPLICATION: Manual apply needed (Ashby — login required)
   Apply here: https://jobs.ashbyhq.com/company/job-id
   Pre-filled answers ready — say "help me apply" to get them
```

## Safety Guardrails

1. **Score gate**: Never auto-apply below configurable threshold (default 4.0)
2. **User consent**: First-time use requires opt-in (stored in `config/profile.yml`)
3. **Dry-run default**: `--dry-run` flag shows what WOULD be submitted without actually submitting
4. **Rate limiting**: Max 5 auto-applications per hour to avoid looking like spam
5. **Dedup**: Check tracker before applying — never apply twice to same company+role
6. **Logging**: Every submission attempt logged with timestamp, platform, result
7. **No fabrication**: All form data comes from `config/profile.yml` and `cv.md` — nothing invented

## Out of Scope (Future)

- Playwright-based form filling for Workable/SmartRecruiters (stub adapters only)
- LinkedIn Easy Apply automation
- Email verification handling
- CAPTCHA solving
- Multi-resume selection (always uses the JD-tailored PDF)
