# negotiate.md — Salary Negotiation

Use this mode after an interview process reaches offer or late-stage compensation discussion.

## Required Context

Read `config/profile.yml`, `modes/_profile.md`, `data/applications.md`, relevant evaluation reports, and any offer details the user provides.

## Workflow

1. Normalize the offer into base, bonus, equity, sign-on, benefits, location, and work policy.
2. Compare it against the user's target compensation and market data for the role/location.
3. Identify leverage:
   - Competing offers
   - Current compensation
   - Scarce technical fit
   - Timeline pressure
4. Draft one of three negotiation artifacts:
   - First counter
   - Second counter
   - Final clarification before accept/decline
5. Keep the tone direct, appreciative, and evidence-led. Do not bluff or invent competing offers.

## Output

Return:

- Recommended ask
- Walk-away number
- Email or call script
- Risks and fallback asks

For startup equity, run `modes/equity.md` first.
