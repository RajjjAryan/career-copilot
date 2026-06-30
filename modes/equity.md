# equity.md — Startup Equity Evaluation

Use this mode when an offer includes stock options, RSUs, phantom equity, or any startup ownership component.

## Required Inputs

Ask for missing values explicitly:

- Equity type: ISO, NSO, RSU, phantom, or unknown
- Number of shares/options
- Strike price
- Latest 409A or fair market value
- Fully diluted shares outstanding
- Latest valuation and funding round
- Vesting schedule and cliff
- Exercise window
- Liquidation preferences if known

## Workflow

1. Calculate ownership: `shares offered / fully diluted shares`.
2. Estimate paper value at current valuation.
3. Model exits at 1x, 2x, 5x, and 10x valuation.
4. Apply dilution scenarios: 0%, 20%, 40%.
5. Flag risk from strike price, exercise window, tax exposure, and liquidation preferences.
6. Convert the outcome into compensation scoring guidance for `modes/evaluate.md`.

## Output

Produce a table with conservative, base, and upside cases. Include a plain-language recommendation: meaningful upside, lottery-ticket upside, or likely negligible value.

This is career planning support, not legal, tax, or investment advice.
