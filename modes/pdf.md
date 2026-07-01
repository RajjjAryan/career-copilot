# pdf.md — ATS-Optimized PDF Generation

## Full Pipeline

1. Read `cv.md` as the source of truth.
2. Ask the user for the JD if it is not already in context, as text or URL.
3. Extract 15-20 keywords from the JD.
4. Detect the JD language and choose the CV language, defaulting to `en`.
   - Load section labels from `templates/cv-i18n.yml`.
   - Supported locales: `en`, `de`, `es`, `fr`, `hi`, `ja`, `pt`.
5. Detect company location and choose paper format:
   - US/Canada: `letter`
   - Rest of world: `a4`
6. Detect the role archetype and adapt framing.
7. Rewrite the Professional Summary with JD keywords plus the exit narrative bridge: "Built and sold a business. Now applying systems thinking to [JD domain]."
8. Select the 3-4 projects most relevant to the role.
9. Reorder experience bullets by relevance to the JD.
10. Build a competency grid from JD requirements with 6-8 keyword phrases.
11. Inject keywords naturally into existing achievements. Never invent experience.
12. Generate complete HTML from the template and tailored content.
13. Write HTML to `/tmp/cv-candidate-{company}.html`.
14. Run: `node generate-pdf.mjs /tmp/cv-candidate-{company}.html output/cv-candidate-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}`.
15. Report the PDF path, page count, and keyword coverage percentage.

## ATS Rules

- Use a single-column layout without sidebars or parallel columns.
- Use standard headers: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects".
- Do not put text inside images or SVGs.
- Do not put critical information in PDF headers or footers; ATS tools often ignore them.
- Use UTF-8 selectable text, not rasterized text.
- Avoid nested tables.
- Distribute JD keywords naturally: top five in Summary, first bullet of each role, and Skills section.

## PDF Design

- **Fonts**: Space Grotesk for headings, DM Sans for body text
- **Self-hosted fonts**: `fonts/`
- **Header**: name in Space Grotesk 24px bold, 2px gradient rule, contact row
- **Section headers**: Space Grotesk 13px, uppercase, letter-spacing 0.05em, cyan primary color
- **Body**: DM Sans 11px, line-height 1.5
- **Company names**: accent purple `hsl(270,70%,45%)`
- **Margins**: 0.6in
- **Background**: pure white

## Section Order

Optimized for a six-second recruiter scan:

1. Header with large name, gradient rule, contact, and portfolio link
2. Professional Summary, 3-4 keyword-dense lines
3. Core Competencies, 6-8 keyword phrases in a flex grid
4. Work Experience, reverse chronological
5. Projects, top 3-4 most relevant
6. Education and Certifications
7. Skills, including languages and technical skills

## Keyword Injection Strategy

Legitimate rewrites:

- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" → rewrite as "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" → rewrite as "MLOps and observability: evals, error handling, cost monitoring"
- JD says "stakeholder management" and CV says "collaborated with team" → rewrite as "stakeholder management across engineering, operations, and business"

Never add skills the candidate does not have. Only reframe real experience using the JD's vocabulary.

## HTML Template

Use `templates/cv-template.html`. Replace `{{...}}` placeholders with tailored content:

| Placeholder | Content |
|-------------|---------|
| `{{LANG}}` | Locale such as `en`, `de`, `es`, `fr`, `hi`, `ja`, or `pt` |
| `{{PAGE_WIDTH}}` | `8.5in` for letter or `210mm` for A4 |
| `{{NAME}}` | from profile.yml |
| `{{EMAIL}}` | from profile.yml |
| `{{LINKEDIN_URL}}` | from profile.yml |
| `{{LINKEDIN_DISPLAY}}` | from profile.yml |
| `{{PORTFOLIO_URL}}` | from profile.yml, adjusted for locale if configured |
| `{{PORTFOLIO_DISPLAY}}` | from profile.yml, adjusted for locale if configured |
| `{{LOCATION}}` | from profile.yml |
| `{{SECTION_SUMMARY}}` | localized section label |
| `{{SUMMARY_TEXT}}` | tailored summary with keywords |
| `{{SECTION_COMPETENCIES}}` | localized section label |
| `{{COMPETENCIES}}` | `<span class="competency-tag">keyword</span>` repeated 6-8 times |
| `{{SECTION_EXPERIENCE}}` | localized section label |
| `{{EXPERIENCE}}` | HTML for jobs with reordered bullets |
| `{{SECTION_PROJECTS}}` | localized section label |
| `{{PROJECTS}}` | HTML for top relevant projects |
| `{{SECTION_EDUCATION}}` | localized section label |
| `{{EDUCATION}}` | education HTML |
| `{{SECTION_CERTIFICATIONS}}` | localized section label |
| `{{CERTIFICATIONS}}` | certification HTML |
| `{{SECTION_SKILLS}}` | localized section label |
| `{{SKILLS}}` | skills HTML |

For non-English locales, use `templates/cv-i18n.yml` as the label source. If a label is missing, fall back to the `en` value.

## Canva CV Generation (Optional)

If `config/profile.yml` has `canva_resume_design_id` set, offer the user a choice before generating:

- **HTML/PDF (fast, ATS-optimized)**: existing flow above
- **Canva CV (visual, design-preserving)**: flow below

If the user has no `canva_resume_design_id`, skip this prompt and use the HTML/PDF flow.

### Canva Workflow

#### Step 1 — Duplicate the base design

1. `export-design` the base design from `canva_resume_design_id` as PDF and capture the download URL.
2. `import-design-from-url` using that download URL to create a new editable duplicate.
3. Record the new `design_id`.

#### Step 2 — Read the design structure

1. Run `get-design-content` on the duplicate to read all text elements.
2. Map text elements to CV sections:
   - candidate name → header
   - "Summary" or "Professional Summary" → summary
   - company names from `cv.md` → experience
   - degree or school names → education
   - skill keywords → skills
3. If mapping fails, show the detected elements and ask the user for guidance.

#### Step 3 — Generate tailored content

Use the same content generation as the HTML flow:

- Rewrite Professional Summary with JD keywords and the exit narrative.
- Reorder experience bullets by JD relevance.
- Select top competencies from JD requirements.
- Inject keywords naturally without inventing experience.

Character budget rule: each replacement text should stay within approximately +/-15% of the original text length. Canva designs use fixed-size text boxes, so longer text can overlap neighboring elements. Count the original characters and condense tailored content when needed.

#### Step 4 — Apply edits

1. `start-editing-transaction` on the duplicate design.
2. `perform-editing-operations` with `find_and_replace_text` for each mapped section.
3. Reflow layout after replacements:
   - Read updated element positions and dimensions.
   - For each work experience section, calculate the bullet box end position.
   - Move the next section's date, company name, role title, and bullet elements to preserve the original gap.
   - Repeat for all work experience sections.
4. Verify layout before committing:
   - Run `get-design-thumbnail` with the transaction ID and page index.
   - Inspect for overlapping text, uneven spacing, cut-off text, or tiny text.
   - Adjust with `position_element`, `resize_element`, or `format_text` until clean.
5. Show the final preview and ask for approval.
6. Commit the editing transaction only after approval.

#### Step 5 — Export and download PDF

1. `export-design` the duplicate as PDF using A4 or letter based on JD location.
2. Immediately download the PDF:

   ```bash
   curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
   ```

3. Verify the download:

   ```bash
   file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
   ```

   It must report a PDF document. If it reports XML or HTML, the URL expired; re-export and retry.

4. Report the PDF path, file size, and Canva design URL for manual tweaking.

## Error Handling

- If `import-design-from-url` fails, fall back to the HTML/PDF pipeline and explain why.
- If text elements cannot be mapped, show what was found and ask for manual mapping.
- If `find_and_replace_text` finds no matches, try broader substring matching.
- Always provide the Canva design URL so the user can edit manually if auto-edit fails.

## Post-Generation

If the offer is already tracked, update the tracker PDF status from missing to present through the normal tracker workflow.
