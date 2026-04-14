#!/usr/bin/env python3
"""
extract-resume.py — Extract structured content from a PDF resume.

Usage:
    python3 extract-resume.py <input.pdf>

Outputs JSON with sections, bullet points, fonts, and layout metadata.
Designed to preserve the original resume's structure for faithful reproduction.
"""

import json
import sys
import pdfplumber
from collections import defaultdict


def extract_resume(pdf_path):
    pdf = pdfplumber.open(pdf_path)
    result = {
        "pages": len(pdf.pages),
        "width": pdf.pages[0].width,
        "height": pdf.pages[0].height,
        "fonts": [],
        "sections": [],
    }

    # Combine characters from ALL pages with y-offset for proper ordering
    chars = []
    lines_on_page = []
    page_height = pdf.pages[0].height
    for page_idx, page in enumerate(pdf.pages):
        y_offset = page_idx * page_height
        for c in page.chars:
            cc = dict(c)
            cc["top"] = c["top"] + y_offset
            cc["bottom"] = c["bottom"] + y_offset
            chars.append(cc)
        for ln in (page.lines or []):
            ll = dict(ln)
            ll["top"] = ln["top"] + y_offset
            lines_on_page.append(ll)

    # --- Detect fonts used ---
    fonts_seen = set()
    for c in chars:
        fonts_seen.add((c["fontname"], round(c["size"], 1)))
    result["fonts"] = [{"name": f, "size": s} for f, s in sorted(fonts_seen, key=lambda x: -x[1])]

    # --- Detect horizontal rules (section separators) ---
    h_rules = []
    for ln in lines_on_page:
        if abs(ln["x1"] - ln["x0"]) > 200:  # wide enough to be a separator
            h_rules.append(round(ln["top"], 1))
    h_rules.sort()

    # --- Group characters into lines by y-position ---
    line_groups = defaultdict(list)
    for c in chars:
        y_key = round(c["top"], 0)
        line_groups[y_key].append(c)

    # --- Build text lines with font metadata (with proper word spacing) ---
    text_lines = []
    for y in sorted(line_groups.keys()):
        group = sorted(line_groups[y], key=lambda c: c["x0"])
        # Reconstruct text with spaces where gaps exist between characters
        text_parts = []
        for i, c in enumerate(group):
            if i > 0:
                gap = c["x0"] - group[i - 1]["x1"]
                avg_char_width = (group[i - 1]["x1"] - group[i - 1]["x0"])
                # Insert space if gap is larger than ~30% of a character width
                if gap > max(1.5, avg_char_width * 0.3):
                    text_parts.append(" ")
            text_parts.append(c["text"])
        text = "".join(text_parts)

        primary_font = max(
            set((c["fontname"], round(c["size"], 1)) for c in group),
            key=lambda f: sum(1 for c in group if c["fontname"] == f[0] and round(c["size"], 1) == f[1]),
        )
        x0 = group[0]["x0"]
        text_lines.append({
            "y": round(y, 1),
            "x0": round(x0, 1),
            "text": text.strip(),
            "font": primary_font[0],
            "size": primary_font[1],
            "is_bold": "Bold" in primary_font[0],
            "is_italic": "Italic" in primary_font[0],
        })

    # --- Identify section boundaries ---
    # Detect font size thresholds dynamically from the document
    all_sizes = sorted(set(tl["size"] for tl in text_lines if tl["text"]), reverse=True)
    # Largest = name, second largest group = section headers, rest = body
    NAME_FONT_SIZE_MIN = all_sizes[0] - 2 if all_sizes else 20.0

    # Cluster font sizes into tiers to find the section header tier
    # Section headers are typically ALL CAPS bold text at a distinct size tier
    bold_sizes = sorted(set(tl["size"] for tl in text_lines if tl["is_bold"] and tl["text"]), reverse=True)
    # Remove the name size from consideration
    header_sizes = [s for s in bold_sizes if s < NAME_FONT_SIZE_MIN]

    # Section header detection: bold + (ALL CAPS or at the largest non-name bold size tier)
    section_header_min_size = header_sizes[0] - 0.5 if header_sizes else 11.0

    current_section = None
    sections = []

    for tl in text_lines:
        if not tl["text"]:
            continue

        # Name (largest font)
        if tl["size"] >= NAME_FONT_SIZE_MIN and tl["is_bold"]:
            current_section = {
                "type": "header",
                "name": tl["text"],
                "lines": [],
            }
            sections.append(current_section)
            continue

        # Section header (bold, at section header font size tier, OR all caps)
        is_all_caps = tl["text"] == tl["text"].upper() and len(tl["text"]) > 3
        is_section_size = tl["size"] >= section_header_min_size
        if (
            tl["is_bold"]
            and (is_all_caps or is_section_size)
            and tl["x0"] < 50  # left-aligned
            and not any(c.isdigit() for c in tl["text"][:3])  # not a date
        ):
            current_section = {
                "type": "section",
                "title": tl["text"],
                "lines": [],
            }
            sections.append(current_section)
            continue

        # Content line
        if current_section:
            BULLET_CHARS = {
                "•", "\u2022", "▪", "\u25AA", "◾", "\u25FE", "⚬", "\u26AC",
                "∘", "\u2218", "○", "\u25CB", "►", "\u25BA", "▸", "\u25B8",
                "‣", "\u2023", "⁃", "\u2043", "–", "\u2013", "—", "\u2014",
            }
            first_char = tl["text"][0] if tl["text"] else ""
            is_bullet = first_char in BULLET_CHARS
            current_section["lines"].append({
                "text": tl["text"],
                "is_bold": tl["is_bold"],
                "is_italic": tl["is_italic"],
                "is_bullet": is_bullet,
                "x0": tl["x0"],
                "size": tl["size"],
            })

    # --- Post-process: detect indentation-based bullets ---
    # If no explicit bullet characters found, detect bullets via indentation
    # and sentence-boundary heuristics (needed for HTML-generated PDFs)
    for section in sections:
        if section["type"] != "section":
            continue
        lines = section.get("lines", [])
        if not lines:
            continue

        has_bullet_chars = any(l["is_bullet"] for l in lines)
        if has_bullet_chars:
            continue  # Already have explicit bullet markers

        # Find the base left margin for this section
        x0_values = [round(l["x0"], 0) for l in lines]
        if not x0_values:
            continue
        base_x0 = min(x0_values)
        indent_threshold = base_x0 + 8  # ~8pt deeper = indented/bullet level

        for i, line in enumerate(lines):
            if round(line["x0"], 0) < indent_threshold:
                continue  # Not indented — header/role line

            # Detect bullet starts (not continuation lines):
            # 1. First indented line after a non-indented line
            prev_x0 = round(lines[i - 1]["x0"], 0) if i > 0 else 0
            is_first_indented = prev_x0 < indent_threshold

            # 2. Previous line ends with sentence-ending punctuation
            prev_text = lines[i - 1]["text"].rstrip() if i > 0 else ""
            prev_ends_sentence = prev_text.endswith((".")) or prev_text.endswith(":")

            # 3. Line starts with a common resume action verb
            words = line["text"].split()
            first_word = words[0].lower().rstrip(",.:;") if words else ""
            action_verbs = {
                "architect", "architected", "automated", "built", "conducted",
                "configured", "created", "delivered", "deployed", "designed",
                "developed", "drove", "enabled", "engineered", "established",
                "implemented", "improved", "integrated", "introduced", "launched",
                "led", "managed", "mentored", "migrated", "optimized", "orchestrated",
                "owned", "pioneered", "reduced", "refactored", "scaled", "shipped",
                "spearheaded", "streamlined", "technical",
            }
            is_action_verb = first_word in action_verbs

            if is_first_indented or prev_ends_sentence or is_action_verb:
                line["is_bullet"] = True

    # --- Post-process: merge continuation lines into bullets ---
    for section in sections:
        if section["type"] != "section":
            continue
        lines = section.get("lines", [])
        if not lines:
            continue

        base_x0 = min(round(l["x0"], 0) for l in lines)
        indent_x0 = base_x0 + 8

        merged = []
        for line in lines:
            if line["is_bullet"]:
                merged.append({**line, "text": line["text"].lstrip("•\u2022▪◾⚬∘○►▸‣⁃–— ")})
            elif line["is_bold"]:
                # Bold lines are new entries (company names, skill categories)
                merged.append(line)
            elif (merged
                  and not line["is_bold"]
                  and round(line["x0"], 0) >= indent_x0):
                # Indented non-bold continuation (deep indent = bullet continuation)
                merged[-1]["text"] += " " + line["text"]
            elif (merged
                  and not line["is_bold"]
                  and not merged[-1].get("is_bold")
                  and not merged[-1]["text"].rstrip().endswith(('.', ':', ';'))
                  # Don't merge "Category: values" lines (e.g., Skills section)
                  and not (line["text"].find(':') > 0 and line["text"].find(':') < 30
                           and line["text"][0].isupper())):
                # Same-level paragraph continuation (summary, etc.)
                merged[-1]["text"] += " " + line["text"]
            else:
                merged.append(line)
        section["lines"] = merged

    result["sections"] = sections

    # --- Extract margins (from first page only for consistency) ---
    page0_chars = [c for c in chars if c["top"] < page_height]
    if page0_chars:
        all_x0 = [c["x0"] for c in page0_chars]
        all_x1 = [c["x1"] for c in page0_chars]
        all_y0 = [c["top"] for c in page0_chars]
        all_y1 = [c["bottom"] for c in page0_chars]
    else:
        all_x0 = [c["x0"] for c in chars]
        all_x1 = [c["x1"] for c in chars]
        all_y0 = [c["top"] for c in chars]
        all_y1 = [c["bottom"] for c in chars]
    result["margins"] = {
        "left": round(min(all_x0), 1),
        "right": round(pdf.pages[0].width - max(all_x1), 1),
        "top": round(min(all_y0), 1),
        "bottom": round(page_height - max(all_y1) if max(all_y1) < page_height else 20, 1),
    }

    pdf.close()
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract-resume.py <input.pdf>", file=sys.stderr)
        sys.exit(1)

    data = extract_resume(sys.argv[1])
    print(json.dumps(data, indent=2, ensure_ascii=False))
