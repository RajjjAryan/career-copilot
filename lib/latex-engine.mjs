/**
 * lib/latex-engine.mjs — LaTeX resume parser, modifier, and compiler
 *
 * Surgically modifies .tex resume files: reorders bullets by keyword
 * relevance, trims low-value items for 1-page fit, compiles to PDF.
 * Preserves ALL design/formatting — only touches text content and order.
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';

// ─── Find available LaTeX compiler ─────────────────────────────────────

export function findCompiler() {
  for (const cmd of ['pdflatex', 'xelatex', 'lualatex']) {
    try {
      execFileSync('which', [cmd], { stdio: 'pipe' });
      return cmd;
    } catch { /* not found */ }
  }
  return null;
}

// ─── Escape plain text for LaTeX ───────────────────────────────────────

export function escTex(text) {
  if (!text) return '';
  const specials = {
    '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  };
  return text
    .replace(/[&%$#_{}~^]/g, ch => specials[ch] || ch)
    .replace(/\u2013/g, '--')
    .replace(/\u2014/g, '---')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "''");
}

// ─── Strip LaTeX commands to get plain text (for keyword matching) ─────

export function stripLatex(text) {
  let s = text;
  // Iteratively strip nested commands
  for (let i = 0; i < 5; i++) {
    const prev = s;
    s = s.replace(/\\(?:textbf|textit|emph|underline|textsc|textrm|textsf|texttt|mbox)\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\url\{([^{}]*)\}/g, '$1');
    if (s === prev) break;
  }
  s = s.replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?/g, ' ');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/~/g, ' ');
  s = s.replace(/\\\\/g, ' ');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

// ─── Parse LaTeX into structured sections with items ───────────────────

export function parseLatex(texContent) {
  const lines = texContent.split('\n');
  const sections = [];
  let currentSection = null;

  const sectionPattern = /\\(?:section|cvsection|part)\*?\{(.+?)\}/;

  // Item-start patterns (standard + common resume templates)
  const itemPatterns = [
    /^\s*\\item\b/,
    /^\s*\\resumeItem\b/,
    /^\s*\\cvitem\b/,
    /^\s*\\achievement\b/,
  ];

  function isItemStart(line) {
    return itemPatterns.some(p => p.test(line));
  }

  function isBlockBoundary(line) {
    const t = line.trim();
    return sectionPattern.test(t) ||
           t.startsWith('\\begin{') || t.startsWith('\\end{') ||
           t.startsWith('\\resumeSubheading') ||
           t.startsWith('\\resumeProjectHeading') ||
           t.startsWith('\\cventry');
  }

  // Track current itemize block
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect section boundaries
    const secMatch = trimmed.match(sectionPattern);
    if (secMatch) {
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      currentSection = {
        title: secMatch[1],
        startLine: i,
        endLine: -1,
        items: [],
        itemizeBlocks: [],
      };
      currentBlock = null;
      continue;
    }

    if (!currentSection) continue;

    // Track itemize/enumerate blocks
    if (trimmed.match(/\\begin\{(?:itemize|enumerate)\}/)) {
      currentBlock = { startLine: i, endLine: -1, items: [] };
      currentSection.itemizeBlocks.push(currentBlock);
    }
    if (trimmed.match(/\\end\{(?:itemize|enumerate)\}/)) {
      if (currentBlock) currentBlock.endLine = i;
      currentBlock = null;
    }

    // Detect items
    if (isItemStart(line)) {
      const itemStart = i;
      const itemLines = [line];
      i++;

      // Collect continuation lines (non-empty, non-structural, non-item)
      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (!nextTrimmed || isItemStart(lines[i]) || isBlockBoundary(lines[i])) break;
        if (nextTrimmed.startsWith('%')) { i++; continue; }
        itemLines.push(lines[i]);
        i++;
      }
      i--; // outer loop increments

      const item = {
        startLine: itemStart,
        endLine: itemStart + itemLines.length - 1,
        rawLines: [...itemLines],
        text: itemLines.join(' '),
        plainText: stripLatex(itemLines.join(' ')),
      };

      currentSection.items.push(item);
      if (currentBlock && currentBlock.endLine === -1) {
        currentBlock.items.push(item);
      }
    }
  }

  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return { lines, sections };
}

// ─── Score a bullet by keyword relevance ───────────────────────────────

export function scoreItem(plainText, keywords, boostTerms = []) {
  const lower = plainText.toLowerCase();
  let score = 0;

  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += 2;
  }
  for (const term of boostTerms) {
    if (lower.includes(term.toLowerCase())) score += 1;
  }

  // Quantified results (numbers = high ATS value)
  if (plainText.match(/\d+[%KMBx+]/)) score += 2;

  // Action verbs at start
  const actions = ['built', 'designed', 'architected', 'implemented', 'optimized',
                   'reduced', 'improved', 'scaled', 'led', 'owned', 'shipped',
                   'launched', 'managed', 'automated', 'developed', 'created'];
  for (const v of actions) {
    if (lower.startsWith(v) || lower.includes(' ' + v + ' ')) { score += 1; break; }
  }

  if (plainText.length < 30) score -= 1;
  return score;
}

// ─── Reorder items within each itemize block by relevance ──────────────

export function reorderItems(lines, parsed, keywords, boostTerms = []) {
  const result = [...lines];
  const changes = [];

  // Collect blocks from relevant sections
  const blocks = [];
  for (const section of parsed.sections) {
    const t = section.title.toLowerCase();
    if (!t.includes('experience') && !t.includes('project') &&
        !t.includes('achievement') && !t.includes('trabajo') &&
        !t.includes('proyecto') && !t.includes('logro')) continue;
    for (const block of section.itemizeBlocks) {
      if (block.items.length >= 2) blocks.push({ section, block });
    }
  }

  // Process in reverse line order so splicing doesn't shift earlier blocks
  blocks.sort((a, b) => b.block.startLine - a.block.startLine);

  for (const { section, block } of blocks) {
    const scored = block.items.map(item => ({
      ...item,
      score: scoreItem(item.plainText, keywords, boostTerms),
    }));

    const sorted = [...scored].sort((a, b) => b.score - a.score);

    // Check if order actually changed
    if (scored.every((s, i) => s.startLine === sorted[i].startLine)) continue;

    // Rebuild block: keep \begin{...}, any pre-item lines, sorted items, post-item lines, \end{...}
    const newBlock = [result[block.startLine]]; // \begin{itemize}

    // Pre-item content (between \begin and first item)
    if (block.items.length > 0) {
      for (let i = block.startLine + 1; i < block.items[0].startLine; i++) {
        newBlock.push(result[i]);
      }
    }

    // Sorted items
    for (const item of sorted) {
      newBlock.push(...item.rawLines);
    }

    // Post-item content (between last item and \end)
    if (block.items.length > 0) {
      const lastItem = block.items[block.items.length - 1];
      for (let i = lastItem.endLine + 1; i < block.endLine; i++) {
        newBlock.push(result[i]);
      }
    }

    newBlock.push(result[block.endLine]); // \end{itemize}

    result.splice(block.startLine, block.endLine - block.startLine + 1, ...newBlock);

    changes.push({
      section: section.title,
      type: 'reordered',
      detail: `Sorted ${block.items.length} items by relevance`,
    });
  }

  return { lines: result, changes };
}

// ─── Remove the globally lowest-scoring item (for 1-page trimming) ────

export function removeWeakestItem(lines, parsed, keywords, boostTerms = []) {
  let weakest = null;
  let weakestScore = Infinity;
  let weakestSection = null;

  for (const section of parsed.sections) {
    if (section.items.length <= 1) continue; // keep at least 1 per section

    for (const item of section.items) {
      const score = scoreItem(item.plainText, keywords, boostTerms);
      // Prefer removing longer low-scoring items (saves more space)
      const adjustedScore = score - (item.plainText.length > 100 ? 0 : 0.5);
      if (adjustedScore < weakestScore) {
        weakestScore = adjustedScore;
        weakest = item;
        weakestSection = section.title;
      }
    }
  }

  if (!weakest) return { lines, removed: null };

  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (i >= weakest.startLine && i <= weakest.endLine) continue;
    result.push(lines[i]);
  }

  return {
    lines: result,
    removed: {
      section: weakestSection,
      text: weakest.plainText.substring(0, 80) + (weakest.plainText.length > 80 ? '...' : ''),
      score: scoreItem(weakest.plainText, keywords, boostTerms),
    },
  };
}

// ─── Compile LaTeX to PDF ──────────────────────────────────────────────

export function compileLatex(texPath, options = {}) {
  const compiler = options.compiler || findCompiler();
  if (!compiler) {
    return { success: false, error: 'No LaTeX compiler found. Install TeX Live: brew install --cask mactex-no-gui' };
  }

  const fullTexPath = resolve(texPath);
  const texDir = dirname(fullTexPath);
  const texFile = basename(fullTexPath);
  const pdfFile = texFile.replace(/\.tex$/, '.pdf');
  const pdfPath = join(texDir, pdfFile);

  try {
    const args = ['-interaction=nonstopmode', '-halt-on-error', texFile];

    execFileSync(compiler, args, {
      cwd: texDir,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 60000,
    });

    // Second pass for cross-references
    try {
      execFileSync(compiler, args, {
        cwd: texDir, stdio: 'pipe', encoding: 'utf-8', timeout: 60000,
      });
    } catch { /* non-fatal */ }

    if (!existsSync(pdfPath)) {
      return { success: false, error: 'Compilation produced no PDF' };
    }

    return { success: true, pdfPath, pageCount: countPdfPages(pdfPath) };
  } catch (err) {
    const logPath = join(texDir, texFile.replace(/\.tex$/, '.log'));
    let detail = err.stderr || err.message;
    if (existsSync(logPath)) {
      const log = readFileSync(logPath, 'utf-8');
      const errors = log.split('\n').filter(l => l.startsWith('!')).slice(0, 5);
      if (errors.length) detail = errors.join('\n');
    }
    return { success: false, error: detail };
  }
}

// ─── Count pages in a PDF ──────────────────────────────────────────────

export function countPdfPages(pdfPath) {
  const buf = readFileSync(pdfPath, 'latin1');
  const matches = buf.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

// ─── Clean LaTeX auxiliary files ───────────────────────────────────────

export function cleanAuxFiles(texPath) {
  const dir = dirname(resolve(texPath));
  const base = basename(texPath, '.tex');
  for (const ext of ['.aux', '.log', '.out', '.fls', '.fdb_latexmk', '.synctex.gz']) {
    const f = join(dir, base + ext);
    try { if (existsSync(f)) unlinkSync(f); } catch { /* ignore */ }
  }
}

// ─── Convert extract-resume.py JSON output to LaTeX ────────────────────

export function structureToLatex(data) {
  const parts = [];

  // Preamble
  parts.push(`%% Resume generated by career-copilot from PDF extraction`);
  parts.push(`%% Modify content freely — design is preserved on recompilation`);
  parts.push(``);
  parts.push(`\\documentclass[letterpaper,10pt]{article}`);
  parts.push(`\\usepackage[utf8]{inputenc}`);
  parts.push(`\\usepackage[T1]{fontenc}`);
  parts.push(`\\usepackage{lmodern}`);
  parts.push(`\\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}`);
  parts.push(`\\usepackage{enumitem}`);
  parts.push(`\\usepackage{titlesec}`);
  parts.push(`\\usepackage{hyperref}`);
  parts.push(``);
  parts.push(`\\setlength{\\parindent}{0pt}`);
  parts.push(`\\setlength{\\parskip}{0pt}`);
  parts.push(`\\setlist[itemize]{nosep, topsep=0pt, left=0.15in..0.35in}`);
  parts.push(`\\titleformat{\\section}{\\vspace{-4pt}\\large\\bfseries\\scshape}{}{0em}{}[\\titlerule\\vspace{-4pt}]`);
  parts.push(`\\titlespacing{\\section}{0pt}{6pt}{4pt}`);
  parts.push(`\\pagestyle{empty}`);
  parts.push(`\\hypersetup{colorlinks=true, urlcolor=blue}`);
  parts.push(``);
  parts.push(`\\begin{document}`);
  parts.push(``);

  // Header
  const header = data.sections.find(s => s.type === 'header');
  if (header) {
    parts.push(`\\begin{center}`);
    parts.push(`  {\\LARGE\\textbf{${escTex(header.name)}}} \\\\[2pt]`);

    // Contact info from header lines
    const contactParts = [];
    for (const line of (header.lines || [])) {
      const text = line.text.trim();
      if (!text) continue;
      // Skip subtitle-sized text that's not contact info
      if (line.size >= 11 && !text.includes('@') && !text.includes('+') && !text.includes('linkedin')) {
        parts.push(`  ${escTex(text)} \\\\`);
        continue;
      }
      if (text.includes('@') || text.includes('+') || text.includes('linkedin') || text.includes('github') || text.includes(',')) {
        contactParts.push(text);
      }
    }
    if (contactParts.length) {
      parts.push(`  ${escTex(contactParts.join(' | '))} \\\\`);
    }
    parts.push(`\\end{center}`);
    parts.push(``);
  }

  // Content sections
  for (const section of data.sections) {
    if (section.type !== 'section') continue;

    parts.push(`\\section{${escTex(section.title)}}`);

    if (section.title === 'Summary' || section.title === 'Professional Summary' || section.title.toLowerCase().includes('summary')) {
      const text = section.lines.map(l => l.text).join(' ');
      parts.push(escTex(text));
      parts.push(``);
    } else if (section.title === 'Technical Skills' || section.title === 'Skills' || section.title.toLowerCase().includes('skill')) {
      for (const line of section.lines) {
        const colonIdx = line.text.indexOf(':');
        if (colonIdx > 0) {
          const cat = line.text.substring(0, colonIdx);
          const vals = line.text.substring(colonIdx + 1).trim();
          parts.push(`\\textbf{${escTex(cat)}:} ${escTex(vals)} \\\\`);
        } else {
          parts.push(`${escTex(line.text)} \\\\`);
        }
      }
      parts.push(``);
    } else if (section.title === 'Education' || section.title.toLowerCase().includes('education') || section.title.toLowerCase().includes('formación')) {
      for (const line of section.lines) {
        if (line.is_bold) {
          parts.push(`\\textbf{${escTex(line.text)}} \\\\`);
        } else {
          parts.push(`\\textit{${escTex(line.text)}} \\\\`);
        }
      }
      parts.push(``);
    } else {
      // Experience / Projects / Achievements — group into job entries
      const jobs = [];
      let currentJob = null;

      for (const line of section.lines) {
        if (!line.is_bullet) {
          if (currentJob && !currentJob.role) {
            currentJob.role = line.text;
          } else {
            currentJob = { company: line.text, role: '', bullets: [], companyBold: line.is_bold };
            jobs.push(currentJob);
          }
        } else {
          if (!currentJob) { currentJob = { company: '', role: '', bullets: [], companyBold: false }; jobs.push(currentJob); }
          currentJob.bullets.push(line.text);
        }
      }

      for (const job of jobs) {
        // Parse "Company  Location" and "Role  Date" (split on double-space)
        const compParts = job.company.match(/^(.+?)\s{2,}(.+)$/) || [null, job.company, ''];
        const compName = compParts[1] || job.company;
        const compLoc = compParts[2] || '';

        const roleParts = job.role.match(/^(.+?)\s{2,}(.+)$/) || [null, job.role, ''];
        const roleTitle = roleParts[1] || job.role;
        const rolePeriod = roleParts[2] || '';

        if (compName) {
          parts.push(`\\textbf{${escTex(compName)}}${compLoc ? ' \\hfill ' + escTex(compLoc) : ''} \\\\`);
        }
        if (roleTitle) {
          parts.push(`\\textit{${escTex(roleTitle)}}${rolePeriod ? ' \\hfill ' + escTex(rolePeriod) : ''} \\\\`);
        }

        if (job.bullets.length > 0) {
          parts.push(`\\begin{itemize}`);
          for (const b of job.bullets) {
            // Bold prefix before first colon (e.g., "Platform Rebuild: ...")
            const colonIdx = b.indexOf(':');
            if (colonIdx > 0 && colonIdx < 50) {
              parts.push(`  \\item \\textbf{${escTex(b.substring(0, colonIdx))}:}${escTex(b.substring(colonIdx + 1))}`);
            } else {
              parts.push(`  \\item ${escTex(b)}`);
            }
          }
          parts.push(`\\end{itemize}`);
        }
        parts.push(``);
      }
    }
  }

  parts.push(`\\end{document}`);
  return parts.join('\n');
}
