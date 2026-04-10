# Career-Copilot (Multi-CLI Edition)

<p align="center">
  <em>Companies use AI to filter candidates. This gives candidates AI to <strong>choose</strong> companies.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Copilot_CLI-000?style=flat&logo=github&logoColor=white" alt="Copilot CLI">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

---

AI-powered job search pipeline for **GitHub Copilot CLI, Claude Code, Gemini CLI, Cursor, and Windsurf**. Evaluate offers, generate tailored CVs, scan portals, track applications, and prepare for interviews — all from your terminal.

## What It Does

- **Evaluate** job offers with a structured A-F scoring system (6 weighted dimensions)
- **Generate** ATS-optimized, personalized CVs per job description
- **Track** your application pipeline with integrity checks
- **Scan** 45+ pre-configured company job boards
- **Batch-process** offers in parallel
- **Build** interview story banks (STAR+Reflection framework)
- **Research** companies in depth
- **Draft** LinkedIn outreach messages

> **Important: This is NOT a spray-and-pray tool.** career-copilot is a filter — it helps you find the few offers worth your time out of hundreds. The system strongly recommends against applying to anything scoring below 4.0/5. Your time is valuable, and so is the recruiter's. Always review before submitting.

> **Heads up: the first evaluations won't be great.** The system doesn't know you yet. Feed it context — your CV, your career story, your proof points, your preferences. The more you nurture it, the better it gets.

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Pipeline** | Paste a URL, get a full evaluation + PDF + tracker entry |
| **6-Block Evaluation** | Role summary, CV match, level strategy, comp research, personalization, interview prep (STAR+R) |
| **Interview Story Bank** | Accumulates STAR+Reflection stories across evaluations |
| **ATS PDF Generation** | Keyword-injected CVs with Space Grotesk + DM Sans design |
| **Portal Scanner** | 45+ companies pre-configured across Greenhouse, Ashby, Lever, Wellfound |
| **Batch Processing** | Parallel evaluation with `task` tool sub-agents |
| **Pipeline Integrity** | Automated merge, dedup, status normalization, health checks |
| **Human-in-the-Loop** | AI evaluates and recommends, you decide and act |

## Quick Start

### Prerequisites

- At least one supported AI CLI configured (GitHub Copilot CLI, Claude Code, Gemini CLI, Cursor, or Windsurf)
- Node.js >= 18 (for PDF generation)

### Setup

```bash
# Option A: One-liner setup
git clone <your-repo-url>
cd career-copilot && bash setup.sh

# Option B: Manual setup
git clone <your-repo-url>
cd career-copilot && npm install
npx playwright install chromium   # Required for PDF generation

# 2. Check setup
npm run doctor                     # Validates all prerequisites

# 3. Configure
cp config/profile.example.yml config/profile.yml  # Edit with your details
cp templates/portals.example.yml portals.yml       # Customize companies

# 4. Add your CV
# Create cv.md in the project root with your CV in markdown
# See examples/cv-example.md for reference

# 5. Generate provider instructions (recommended)
npm run generate-instructions

# 6. Start using with your CLI of choice
```

### Usage

Open the project in your terminal and start your AI CLI. The assistant reads the provider-specific instruction file (`.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/career-copilot.mdc`, `.windsurfrules`) and knows all the workflows. Just ask naturally:

```
# Evaluate a job offer
"Evaluate this job: https://jobs.lever.co/company/abc123"

# Or paste a job description directly
"Evaluate this: [paste JD text]"

# Generate a tailored CV
"Generate a PDF for this role at Google"

# Scan portals for new offers
"Scan job portals for new offers"

# Check your pipeline
"Show my application tracker"

# Compare multiple offers
"Compare my top 3 offers"

# Prep for an interview
"Prep me for my interview at Stripe for Senior Backend Engineer"

# Process pending URLs
"Process my pipeline"

# LinkedIn outreach
"Help me reach out to the hiring manager at Vercel"
```

## How It Works

```
You paste a job URL or description
        │
        ▼
┌──────────────────┐
│  Archetype       │  Classifies: Backend, Frontend, AI/ML, DevOps, PM, SA
│  Detection       │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-F Evaluation  │  Match, gaps, comp research, STAR stories
│  (reads cv.md)   │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Report  PDF  Tracker
  .md   .pdf   .tsv
```

## Project Structure

```
career-copilot/
├── .github/
│   ├── copilot-instructions.md   # AI agent instructions (the brain)
│   └── ISSUE_TEMPLATE/           # Bug report & feature request
├── modes/                         # 16 workflow definitions
│   ├── _shared.md                # System rules, scoring, archetypes
│   ├── _profile.template.md      # User customization template
│   ├── evaluate.md               # Single offer evaluation (A-F)
│   ├── auto-pipeline.md          # Full pipeline (eval + PDF + track)
│   ├── pdf.md                    # ATS-optimized PDF generation
│   ├── compare.md                # Multi-offer comparison
│   ├── scan.md                   # Portal scanner
│   ├── batch.md                  # Batch processing
│   ├── pipeline.md               # URL inbox processing
│   ├── tracker.md                # Application status dashboard
│   ├── apply.md                  # Application form assistant
│   ├── contact.md                # LinkedIn outreach
│   ├── deep.md                   # Deep company research
│   ├── interview-prep.md         # Interview intelligence
│   ├── training.md               # Course/cert evaluation
│   └── project.md                # Portfolio project evaluation
├── config/
│   └── profile.example.yml       # Profile template
├── templates/
│   ├── cv-template.html          # ATS-optimized CV template
│   ├── states.yml                # Canonical application statuses
│   └── portals.example.yml       # Portal scanner config (45+ companies)
├── fonts/                         # Space Grotesk + DM Sans (.woff2)
├── batch/
│   └── batch-prompt.md           # Self-contained batch worker prompt
├── docs/
│   ├── ARCHITECTURE.md           # System architecture with diagrams
│   ├── SETUP.md                  # Full setup guide
│   └── CUSTOMIZATION.md          # Customization guide
├── examples/
│   ├── cv-example.md             # Sample CV
│   ├── sample-report.md          # Sample evaluation report
│   └── article-digest-example.md # Sample proof points
├── data/                          # Your application data (gitignored)
├── reports/                       # Evaluation reports (gitignored)
├── output/                        # Generated PDFs (gitignored)
├── jds/                          # Saved job descriptions (gitignored)
├── interview-prep/               # Interview prep files (gitignored)
├── cv.md                         # Your canonical CV (create this)
├── generate-pdf.mjs              # HTML→PDF via Playwright
├── doctor.mjs                    # Setup validation
├── verify-pipeline.mjs           # Pipeline health check
├── merge-tracker.mjs             # Merge batch tracker additions
├── dedup-tracker.mjs             # Remove duplicate entries
├── normalize-statuses.mjs        # Normalize status aliases
├── check-liveness.mjs            # Job URL liveness checker
├── cv-sync-check.mjs             # Config consistency check
├── test-all.mjs                  # Full test suite
├── CONTRIBUTING.md               # Contribution guidelines
├── LEGAL_DISCLAIMER.md           # Legal disclaimer & acceptable use
├── DATA_CONTRACT.md              # User vs system data boundary
├── LICENSE                       # MIT license
└── package.json                  # Node.js dependencies & scripts
```

## Pipeline Integrity Scripts

```bash
npm run doctor       # Setup validation
npm run verify       # Pipeline health check
npm run merge        # Merge batch tracker additions
npm run dedup        # Remove duplicate entries
npm run normalize    # Normalize status aliases
npm run sync-check   # Config consistency check
npm run liveness     # Check if job URLs are still active
npm test             # Run full test suite
```

## Data Contract

| Layer | Files | Rule |
|-------|-------|------|
| **User** (never auto-updated) | cv.md, config/profile.yml, modes/_profile.md, data/*, reports/*, output/* | Your data, your control |
| **System** (safe to update) | modes/_shared.md, modes/*.md (except _profile.md), templates/*, *.mjs | Improves with updates |

See [DATA_CONTRACT.md](DATA_CONTRACT.md) for full details.

## Customization

The system is designed to be customized by the AI agent. Just ask:

- "Change the archetypes to data engineering roles"
- "Update my profile"
- "Add these companies to my portals"
- "Adjust the scoring weights"
- "Change the CV template design"

See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for details.

## Disclaimer

**career-copilot is a local, open-source tool — NOT a hosted service.** By using this software, you acknowledge:

1. **You control your data.** Your CV, contact info, and personal data stay on your machine and are sent directly to the AI provider you choose. We do not collect any data.
2. **You control the AI.** The default prompts instruct the AI not to auto-submit applications. Always review AI-generated content before submitting.
3. **You comply with third-party ToS.** Use this tool in accordance with the Terms of Service of career portals you interact with.
4. **No guarantees.** Evaluations are recommendations, not truth. AI models may hallucinate.

See [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) for full details.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Check out the [good first issues](https://github.com/RajjjAryan/career-copilot/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to get started.

## Contributors

<a href="https://github.com/RajjjAryan/career-copilot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=RajjjAryan/career-copilot" />
</a>

## Star History

<a href="https://star-history.com/#RajjjAryan/career-copilot&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=RajjjAryan/career-copilot&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=RajjjAryan/career-copilot&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=RajjjAryan/career-copilot&type=Date" />
 </picture>
</a>

## License

MIT — see [LICENSE](LICENSE).
