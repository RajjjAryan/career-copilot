# Setup Guide

## Prerequisites

- One supported AI CLI installed and configured (GitHub Copilot CLI, Claude Code, Gemini CLI, Cursor, or Windsurf)
- Node.js 18+ (for PDF generation and utility scripts)

## Quick Start (5 steps)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd career-copilot
npm install
npx playwright install chromium   # Required for PDF generation + browser tools
```

### 1b. Playwright MCP (recommended)

The project includes a `.vscode/mcp.json` that configures the **Playwright MCP server** — this gives the AI agent native browser tools (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) for scraping SPA career pages like Ashby, Lever, and Workday.

If using VS Code / Copilot Agent Mode, this works automatically. For other MCP-compatible clients, add:

```json
{
  "mcp": {
    "servers": {
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
      }
    }
  }
}
```

### 2. Check setup

```bash
npm run doctor                     # Validates all prerequisites
```

### 3. Configure your profile

```bash
cp config/profile.example.yml config/profile.yml
```

Edit `config/profile.yml` with your personal details: name, email, target roles, narrative, proof points.

### 4. Add your CV

Create `cv.md` in the project root with your full CV in markdown format. This is the source of truth for all evaluations and PDFs.

See `examples/cv-example.md` for a reference CV format.

(Optional) Create `article-digest.md` with proof points from your portfolio projects/articles. See `examples/article-digest-example.md`.

### 5. Configure portals

```bash
cp templates/portals.example.yml portals.yml
```

Edit `portals.yml`:
- Update `title_filter.positive` with keywords matching your target roles
- Add companies you want to track in `tracked_companies`
- Customize `search_queries` for your preferred job boards

### 6. Generate provider-specific instructions

```bash
npm run generate-instructions
npm run detect-cli         # Optional: see detected provider + instruction file path
```

This generates:
- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.cursor/rules/career-copilot.mdc`
- `.windsurfrules`

### 7. Start using

Open your AI CLI in this directory. Then paste a job offer URL or description. The auto-pipeline will evaluate it, generate a report, create a tailored PDF, and track it.

## Available Actions

| Action | How |
|--------|-----|
| Evaluate an offer | Paste a URL or JD text |
| Search for offers | Ask to "scan portals" |
| Process pending URLs | Ask to "process pipeline" |
| Generate a PDF | Ask to "generate PDF" |
| Batch evaluate | Ask to "run batch" |
| Check tracker status | Ask for "tracker status" |
| Fill application form | Ask to "help apply" |

## Verify Setup

```bash
npm run doctor          # Check prerequisites
npm run sync-check      # Check configuration consistency
npm run verify          # Check pipeline integrity
npm test                # Run full test suite
```
