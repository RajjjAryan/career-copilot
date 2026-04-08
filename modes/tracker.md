# tracker.md — Application Tracker

> **Trigger**: User asks to see application status, stats, or update an entry.
> **Input**: `data/applications.md`
> **Output**: Formatted table, statistics, and status update capability.

---

## Prerequisites

```
view(path="modes/_shared.md")
view(path="data/applications.md")
```

---

## Tracker Format

`data/applications.md` expected structure:

```markdown
# Application Tracker

| # | Company | Role | Score | Status | Date | Report | PDF | URL |
|---|---------|------|-------|--------|------|--------|-----|-----|
| 001 | Acme Corp | Senior Backend Engineer | 4.3 | Applied | 2024-01-15 | reports/001-acme-2024-01-15.md | output/cv-acme-2024-01-15.pdf | https://... |
| 002 | BigCo | Staff ML Engineer | 4.7 | Interview | 2024-01-16 | reports/002-bigco-2024-01-16.md | output/cv-bigco-2024-01-16.pdf | https://... |
```

### Valid Statuses

| Status | Meaning |
|--------|---------|
| `Evaluated` | JD evaluated, report generated |
| `PDF Generated` | Tailored CV created |
| `Applied` | Application submitted |
| `Interview` | Interview process started |
| `Offer` | Received an offer |
| `Rejected` | Application rejected |
| `Declined` | Candidate declined |
| `Ghosted` | No response after 2+ weeks |

---

## Display Modes

### Full Table

Display the complete tracker table as-is from `data/applications.md`.

### Statistics Dashboard

Calculate and display:

```markdown
## 📊 Application Statistics

### Overview
- **Total Applications**: {count}
- **Active Pipeline**: {count of Evaluated + PDF Generated + Applied + Interview}
- **Offers**: {count}
- **Closed**: {count of Rejected + Declined + Ghosted}

### By Status
| Status | Count | % of Total |
|--------|-------|-----------|
| Evaluated | {n} | {%} |
| PDF Generated | {n} | {%} |
| Applied | {n} | {%} |
| Interview | {n} | {%} |
| Offer | {n} | {%} |
| Rejected | {n} | {%} |
| Declined | {n} | {%} |
| Ghosted | {n} | {%} |

### Quality Metrics
- **Average Score**: {X.X}/5
- **Highest Score**: {X.X}/5 — {Company} ({Role})
- **Lowest Score**: {X.X}/5 — {Company} ({Role})
- **Score Distribution**:
  - Strong (4.5+): {n} ({%})
  - Good (4.0–4.4): {n} ({%})
  - Decent (3.5–3.9): {n} ({%})
  - Weak (<3.5): {n} ({%})

### Completeness
- **With Report**: {n}/{total} ({%})
- **With PDF**: {n}/{total} ({%})
- **With Both**: {n}/{total} ({%})

### Conversion Funnel
- Evaluated → Applied: {%}
- Applied → Interview: {%}
- Interview → Offer: {%}
- Overall (Evaluated → Offer): {%}

### Timeline
- **First Application**: {date}
- **Most Recent**: {date}
- **Applications This Week**: {n}
- **Applications This Month**: {n}
```

---

## Status Updates

When user asks to update a status:

1. Identify the entry by company name, number, or role
2. Confirm the current status
3. Update to the new status:

```
edit(path="data/applications.md",
  old_str="| {###} | {Company} | {Role} | {Score} | {OldStatus} |",
  new_str="| {###} | {Company} | {Role} | {Score} | {NewStatus} |")
```

4. Confirm the update

### Bulk Updates

If user provides multiple updates:

```
"Mark 003, 005, and 008 as Ghosted"
```

Process each update sequentially with `edit`, then confirm all changes.

---

## Queries

Support natural language queries:

- "Show me all offers scoring above 4.0" → Filter and display
- "Which applications are still pending?" → Filter by Active statuses
- "What's my interview pipeline?" → Filter by Interview status
- "Show timeline of last 2 weeks" → Filter by date range
- "Which companies ghosted me?" → Filter by Ghosted status

---

## Output

Always present:
1. The requested data (table, stats, or query result)
2. Quick action suggestions (what the user might want to do next)
