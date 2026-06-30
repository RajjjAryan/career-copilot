# analytics.md — Pipeline Analytics

Use this mode when the user asks for response rates, conversion rates, score trends, or job-search funnel diagnostics.

## Inputs

Read `data/applications.md` and linked reports when available. Do not modify tracker data unless the user explicitly asks to save a report.

## Workflow

1. Run `node analytics.mjs --json` for structured funnel metrics.
2. Segment outcomes by status: Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP.
3. Compare score bands against outcomes: `<3.5`, `3.5-3.9`, `4.0-4.4`, `4.5+`.
4. If reports are linked, sample role archetype, remote policy, and hard blockers from report content.
5. Produce a concise markdown summary with:
   - Funnel counts and response rate
   - Average score by outcome bucket
   - Strongest converting role pattern
   - Clear recommendation for the next week

## Save Report

If the user asks to save it, run:

```bash
node analytics.mjs --write
```

This writes `reports/analytics-{date}.md`.
