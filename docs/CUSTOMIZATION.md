# Customization Guide

## Personalizing career-ops

career-ops is designed to be customized by the AI agent itself. Just ask it to make changes — it reads the same files it uses, so it knows exactly what to edit.

## Key Customization Points

### 1. Archetypes (`modes/_shared.md`)

The default archetypes are:
- Backend / Systems
- Frontend / UI
- AI / ML
- DevOps / SRE / Platform
- Product Management
- Solutions Architect / Sales Engineer

To change them, ask the AI: *"Change the archetypes to match data engineering roles"*

### 2. Scoring Weights (`modes/_shared.md`)

The scoring system uses weighted dimensions. You can adjust weights to prioritize what matters to you.

Ask the AI: *"I care more about remote work and less about compensation — adjust the scoring weights"*

### 3. CV Template (`templates/cv-template.html`)

The HTML template controls the look and feel of generated PDFs. Modify it for different visual styles while maintaining ATS compatibility.

### 4. Portal Scanner (`portals.yml`)

Add or remove companies from the scanner. The template includes 45+ pre-configured companies. Customize:
- `tracked_companies` — specific company career pages
- `search_queries` — job board search queries
- `title_filter` — role title keywords to match/exclude

### 5. Profile (`config/profile.yml`)

Your identity, narrative, compensation targets, and preferences. This informs how the AI evaluates offers and personalizes CVs.

### 6. Profile Overrides (`modes/_profile.md`)

Create from `modes/_profile.template.md` for fine-grained control over:
- Narrative and positioning
- Interview stories
- Target companies
- Deal-breakers

## Language

All modes are in English. To use modes in another language, ask the AI to translate the relevant mode files.

## Adding New Modes

Create a new `.md` file in `modes/` following the pattern of existing modes. The AI will automatically discover and use it when relevant.
