# pdf.md — ATS-Optimized PDF Generation

> **Trigger**: User requests a tailored CV/resume PDF for a specific role.
> **Output**: ATS-optimized PDF saved to `output/`.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="data/cv.md")
view(path="templates/cv-template.html")
```

---

## Generation Pipeline

### Step 1 — Read CV Source of Truth

```
view(path="data/cv.md")
```

This is the **only** source for experience, metrics, skills, and education. NEVER invent content.

### Step 2 — Get JD

- If JD is already in context: use it
- If URL provided: `web_fetch(url="{JD_URL}")`
- If neither: ask user for JD text or URL

### Step 3 — Extract Keywords

Extract 15–20 high-value keywords from the JD:

- **Hard skills**: programming languages, frameworks, tools, platforms
- **Soft skills**: leadership, communication (only if JD emphasizes them)
- **Domain terms**: industry-specific vocabulary
- **Action verbs**: the JD's preferred verbs (built, scaled, designed, led)

Rank keywords by frequency and prominence (title > requirements > nice-to-have).

### Step 4 — Detect JD Language

- Determine the JD's language (English, Spanish, French, German, etc.)
- The generated CV must be in the **same language** as the JD
- If JD is multilingual, use the primary language

### Step 5 — Detect Paper Format

- Extract company location from JD
- **US, Canada, Mexico, Philippines** → `letter` (8.5" × 11")
- **All other countries** → `a4` (210mm × 297mm)
- If location unclear, default to `letter`

### Step 6 — Detect Archetype & Adapt Framing

Using the archetype detected from the JD (see `_shared.md` archetype table):

| Archetype | Summary Angle | Priority Sections | Keyword Focus |
|-----------|--------------|-------------------|---------------|
| Backend/Systems | Scale, reliability, throughput | Experience (infra), Projects (systems) | distributed, scalable, latency, throughput |
| Frontend/Full-Stack | User experience, performance, accessibility | Experience (product), Projects (UI) | responsive, components, performance, a11y |
| AI/ML | Production ML, model performance, data pipelines | Experience (ML), Projects (models) | inference, training, pipeline, accuracy |
| DevOps/SRE | Reliability, automation, observability | Experience (ops), Projects (infra) | uptime, CI/CD, monitoring, IaC |
| Product Manager | Impact, strategy, cross-functional | Experience (product), Metrics | OKRs, growth, roadmap, stakeholders |
| Solutions Architect | Breadth, integration, client impact | Experience (consulting), Projects (design) | architecture, integration, migration |

Cross-reference with `_profile.md` Adaptive Framing table for user-specific overrides.

### Step 7 — Rewrite Professional Summary

Write a 3–4 sentence summary that:

1. Opens with years of experience + archetype-aligned identity
2. Weaves in 3–5 JD keywords naturally
3. Includes a quantified achievement from cv.md
4. Ends with a narrative bridge (from `_profile.md` exit narrative or cross-cutting advantage)

**Rules**: No first person ("I"). No corporate-speak. No generic claims. Every sentence must reference cv.md.

### Step 8 — Select Top Projects

From cv.md projects section, select 3–4 projects most relevant to the JD:

- Score each project by JD keyword overlap + archetype alignment
- Include: project name, one-line description, tech stack, quantified outcome
- Order by relevance to JD (not chronology)

### Step 9 — Reorder Experience Bullets

For each experience entry in cv.md:

1. Score each bullet against JD requirements
2. Reorder bullets within each role: most relevant first
3. Keep all bullets — do not remove any (but order signals priority to the 6-second recruiter scan)

### Step 10 — Build Competency Grid

From JD requirements, build a skills/competency section:

- Group by category: Languages, Frameworks, Infrastructure, Data, Tools
- Only include skills present in cv.md
- Order within each category by JD relevance
- Include proficiency indicators if cv.md supports them

### Step 11 — Inject Keywords

For each keyword from Step 3:

1. Check if it already appears in the CV content
2. If missing but truthful (skill exists in cv.md): add it naturally to the most relevant bullet
3. If missing and NOT in cv.md: **DO NOT ADD IT** — this is fabrication

Track keyword coverage: `{matched}/{total}` = `{percentage}%`

### Step 12 — Generate HTML

Read the template and populate placeholders:

```
view(path="templates/cv-template.html")
```

#### Template Placeholders

| Placeholder | Source |
|-------------|--------|
| `{{name}}` | cv.md header |
| `{{title}}` | Archetype-adapted role title |
| `{{contact}}` | cv.md contact info |
| `{{summary}}` | Step 7 output |
| `{{experience}}` | Step 9 output (reordered bullets) |
| `{{projects}}` | Step 8 output (selected projects) |
| `{{skills}}` | Step 10 output (competency grid) |
| `{{education}}` | cv.md education section |
| `{{certifications}}` | cv.md certifications (if any) |
| `{{articles}}` | From article-digest.md (if relevant to JD) |
| `{{language}}` | Step 4 output (html lang attribute) |

Write populated HTML:

```
create(path="generated_resumes/cv-{company-slug}.html", file_text="{populated HTML}")
```

### Step 13 — Generate PDF

Execute PDF generation:

```bash
node generate-pdf.mjs generated_resumes/cv-{company-slug}.html output/cv-{company-slug}-{YYYY-MM-DD}.pdf --format={letter|a4}
```

If `generate-pdf.mjs` is not available, try alternative:

```bash
./tectonic resume.tex  # LaTeX-based fallback
```

### Step 14 — Report

```markdown
---
## 📄 PDF Generated

**File**: output/cv-{company-slug}-{YYYY-MM-DD}.pdf
**Format**: {letter|a4}
**Pages**: {count}
**Language**: {language}
**Archetype**: {detected}
**Keyword Coverage**: {matched}/{total} ({percentage}%)

### Keywords Injected
{list of keywords and where they appear}

### Keywords Skipped (not in CV)
{list of keywords that were in JD but not truthfully in cv.md}
---
```

---

## ATS Compliance Rules

These rules are **non-negotiable** for ATS compatibility:

1. **Single-column layout** — no multi-column, no sidebars
2. **Standard section headers** — Summary, Experience, Education, Skills, Projects
3. **No images** — no photos, logos, icons, or decorative graphics
4. **No tables for layout** — tables confuse ATS parsers
5. **UTF-8 encoding** — Unicode NFC normalization
6. **Standard fonts** — Space Grotesk (headings) + DM Sans (body), with system fallbacks
7. **Consistent date format** — Mon YYYY – Mon YYYY
8. **No headers/footers** — ATS may skip them; keep name + contact in body
9. **File naming** — `cv-{company}-{date}.pdf` (no spaces, no special chars)
10. **Reasonable length** — 1–2 pages for individual contributor, 2–3 for leadership

## Design Specifications

- **Heading font**: Space Grotesk, 600 weight
- **Body font**: DM Sans, 400 weight
- **Font sizes**: Name 20pt, Section headers 13pt, Body 10pt, Details 9pt
- **Margins**: 0.6in all sides (letter) / 15mm all sides (a4)
- **Colors**: Primary text #1a1a1a, Secondary text #4a4a4a, Accent #2563eb (links only)
- **Line height**: 1.4 for body text
- **Section spacing**: 16pt between sections

## Section Order (Optimized for 6-Second Scan)

1. **Name + Contact** (top, prominent)
2. **Professional Summary** (keyword-dense, archetype-aligned)
3. **Experience** (reverse chronological, bullets reordered by JD relevance)
4. **Projects** (selected and ordered by JD relevance)
5. **Skills** (competency grid, JD-relevant skills first)
6. **Education** (standard, concise)
7. **Certifications / Articles** (if relevant to JD)

## Keyword Injection Strategy

The keyword strategy is **ethical and truth-based**:

1. **Match**: Keyword exists in cv.md → ensure it appears in the PDF
2. **Synonym**: cv.md uses a synonym → add the JD's preferred term alongside
3. **Adjacent**: cv.md has related experience → mention the keyword in context
4. **Skip**: No truthful basis → do NOT include, report as gap

NEVER inject a keyword that implies experience the candidate does not have.
