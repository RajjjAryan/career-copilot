#!/usr/bin/env node

/**
 * tailor-resume.mjs — PDF/LaTeX-in → tailored PDF-out with same design
 *
 * Takes an existing PDF or LaTeX resume, applies keyword modifications
 * for a target company/role, and generates a new PDF that faithfully
 * reproduces the original design (fonts, layout, spacing).
 *
 * Key features:
 *   • Preserves original design (Lato / LaTeX-style)
 *   • Only modifies keywords and bullet order — no structural redesign
 *   • Enforces 1-page output with intelligent ATS trimming
 *   • Supports .tex input for direct LaTeX source editing
 *   • Supports --to-latex to convert PDF → LaTeX → modify → compile
 *
 * Usage:
 *   node tailor-resume.mjs <input.pdf|input.tex> <company> [options]
 *
 * Options:
 *   --role=<title>           Target role title
 *   --keywords=<k1,k2,...>   Extra keywords to weave in
 *   --jd=<file>              Job description file for keyword extraction
 *   --output=<file>          Output PDF path (default: output/cv-<name>-<company>-<date>.pdf)
 *   --summary=<text>         Override summary paragraph
 *   --dry-run                Show what would change without generating PDF
 *   --to-latex               Convert PDF input to .tex first, then modify LaTeX
 */

import { execSync, execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import {
  findCompiler, parseLatex, scoreItem as scoreLatexItem,
  reorderItems as reorderLatexItems, removeWeakestItem,
  compileLatex, countPdfPages, structureToLatex,
  cleanAuxFiles,
} from './lib/latex-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Parse CLI args ────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { keywords: [], dryRun: false };

  for (const arg of args) {
    if (arg.startsWith('--role=')) opts.role = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--keywords=')) opts.keywords = arg.split('=').slice(1).join('=').split(',').map(k => k.trim());
    else if (arg.startsWith('--jd=')) opts.jdFile = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--output=')) opts.outputPdf = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--summary=')) opts.summary = arg.split('=').slice(1).join('=');
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--to-latex') opts.toLatex = true;
    else if (!opts.inputPdf) opts.inputPdf = arg;
    else if (!opts.company) opts.company = arg;
  }

  if (!opts.inputPdf || !opts.company) {
    console.error('Usage: node tailor-resume.mjs <input.pdf|input.tex> <company> [--role=...] [--keywords=...] [--jd=<file>] [--output=...] [--to-latex]');
    process.exit(1);
  }

  return opts;
}

// ─── Extract structured content from PDF via Python helper ─────────────
function extractResume(pdfPath) {
  const script = resolve(__dirname, 'extract-resume.py');
  try {
    const raw = execFileSync('python3', [script, pdfPath], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to extract resume from ${pdfPath}: ${err.message}`);
    process.exit(1);
  }
}

// ─── Extract keywords from JD file ─────────────────────────────────────
function extractJDKeywords(jdPath) {
  const text = readFileSync(jdPath, 'utf-8').toLowerCase();
  // Common technical keywords to look for
  const techTerms = [
    'observability', 'monitoring', 'alerting', 'tracing', 'distributed tracing',
    'apm', 'metrics', 'logs', 'dashboards', 'sli', 'slo', 'sla',
    'kubernetes', 'k8s', 'docker', 'containers', 'microservices',
    'golang', 'go', 'python', 'java', 'rust', 'typescript',
    'aws', 'gcp', 'azure', 'cloud', 'infrastructure',
    'ci/cd', 'terraform', 'helm', 'prometheus', 'grafana', 'datadog',
    'elasticsearch', 'kafka', 'redis', 'postgresql', 'mysql',
    'rest', 'grpc', 'graphql', 'api', 'sdk',
    'machine learning', 'ml', 'ai', 'llm', 'nlp',
    'distributed systems', 'scalability', 'high availability', 'reliability',
    'performance', 'latency', 'throughput', 'optimization',
    'security', 'authentication', 'authorization', 'oauth',
    'agile', 'scrum', 'cross-functional', 'mentoring', 'leadership',
    'open source', 'open-source', 'real-time', 'streaming',
    'webrtc', 'search', 'solr', 'lucene',
    'mcp', 'tool-calling', 'agents', 'model evaluation',
  ];

  return techTerms.filter(term => text.includes(term));
}

// ─── Company keyword profiles ──────────────────────────────────────────
const COMPANY_KEYWORDS = {
  datadog: {
    priority: ['observability', 'monitoring', 'metrics', 'distributed tracing', 'APM', 'alerting',
               'Prometheus', 'Grafana', 'StatsD', 'NewRelic', 'dashboards', 'SLI/SLO',
               'distributed systems', 'performance optimization', 'latency', 'throughput',
               'Go', 'Golang', 'Python', 'Kubernetes', 'Docker', 'AWS',
               'microservices', 'high availability', 'reliability', 'scalability'],
    boost_sections: ['observability', 'monitoring', 'metrics', 'performance', 'latency', 'distributed'],
  },
  cloudflare: {
    priority: ['distributed systems', 'edge computing', 'CDN', 'DNS', 'performance',
               'Go', 'Rust', 'Workers', 'serverless', 'networking', 'security',
               'low-latency', 'global scale', 'caching', 'HTTP', 'TLS'],
    boost_sections: ['performance', 'distributed', 'networking', 'security', 'scale'],
  },
  gitlab: {
    priority: ['DevOps', 'CI/CD', 'Git', 'Ruby', 'Go', 'Kubernetes', 'Docker',
               'open source', 'remote', 'distributed systems', 'scalability',
               'REST API', 'GraphQL', 'PostgreSQL', 'Redis'],
    boost_sections: ['devops', 'ci/cd', 'open source', 'distributed', 'api'],
  },
  openai: {
    priority: ['AI', 'ML', 'LLM', 'MCP', 'model evaluation', 'tool-calling', 'agents',
               'Python', 'Go', 'distributed systems', 'scalability', 'API',
               'real-time', 'inference', 'GPU', 'training'],
    boost_sections: ['ai', 'ml', 'mcp', 'model', 'agents', 'evaluation'],
  },
  stripe: {
    priority: ['payments', 'financial systems', 'API design', 'Ruby', 'Go', 'Java',
               'distributed systems', 'reliability', 'consistency', 'idempotency',
               'microservices', 'event-driven', 'Kafka'],
    boost_sections: ['api', 'reliability', 'distributed', 'financial', 'consistency'],
  },
  uber: {
    priority: ['distributed systems', 'Go', 'Golang', 'Java', 'Python', 'microservices',
               'Kafka', 'Redis', 'Kubernetes', 'Docker', 'AWS',
               'scalability', 'high availability', 'performance optimization',
               'REST API', 'gRPC', 'event-driven', 'real-time',
               'CI/CD', 'SQL', 'NoSQL', 'DynamoDB', 'large-scale systems',
               'mentoring', 'technical leadership', 'cross-functional'],
    boost_sections: ['distributed', 'scalability', 'microservices', 'kafka', 'performance', 'real-time', 'leadership'],
  },
  default: {
    priority: ['distributed systems', 'Go', 'Python', 'Kubernetes', 'Docker', 'AWS',
               'microservices', 'scalability', 'performance', 'reliability'],
    boost_sections: ['distributed', 'performance', 'scalability'],
  },
};

// ─── Keyword modification engine ───────────────────────────────────────
function tailorContent(data, company, opts) {
  const companyLower = company.toLowerCase();
  const profile = COMPANY_KEYWORDS[companyLower] || COMPANY_KEYWORDS.default;
  const jdKeywords = opts.jdFile ? extractJDKeywords(opts.jdFile) : [];
  const extraKeywords = [...profile.priority, ...opts.keywords, ...jdKeywords];

  const changes = [];

  // Process each section
  for (const section of data.sections) {
    if (section.type === 'header') continue;

    // Tailor summary
    if (section.title === 'Summary' && opts.summary) {
      const oldText = section.lines.map(l => l.text).join(' ');
      section.lines = [{ text: opts.summary, is_bold: false, is_italic: false, is_bullet: false, x0: 25.2, size: 10 }];
      changes.push({ section: 'Summary', type: 'replaced', old: oldText.substring(0, 80) + '...', new: opts.summary.substring(0, 80) + '...' });
    }

    // For bullet-point sections, sort bullets by relevance to target company
    if (section.lines && section.lines.some(l => l.is_bullet)) {
      const bullets = section.lines.filter(l => l.is_bullet);
      const nonBullets = section.lines.filter(l => !l.is_bullet);

      // Score each bullet by keyword relevance
      for (const bullet of bullets) {
        const textLower = bullet.text.toLowerCase();
        bullet._score = 0;
        for (const kw of extraKeywords) {
          if (textLower.includes(kw.toLowerCase())) {
            bullet._score += 2;
          }
        }
        for (const term of profile.boost_sections) {
          if (textLower.includes(term)) {
            bullet._score += 1;
          }
        }
      }

      // Sort bullets: highest relevance first
      const sorted = [...bullets].sort((a, b) => b._score - a._score);
      if (JSON.stringify(sorted.map(b => b.text)) !== JSON.stringify(bullets.map(b => b.text))) {
        changes.push({ section: section.title, type: 'reordered', detail: `Sorted ${bullets.length} bullets by ${company} relevance` });
      }

      // Reconstruct: non-bullet lines first (company/role header), then sorted bullets
      section.lines = [...nonBullets, ...sorted];
    }
  }

  return { data, changes };
}

// ─── Escape HTML ───────────────────────────────────────────────────────
function esc(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Normalize dashes for ATS
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-');
}

// ─── Generate faithful HTML from extracted + tailored content ──────────
function generateHTML(data, company, opts) {
  const fontsDir = resolve(__dirname, 'fonts');
  const header = data.sections.find(s => s.type === 'header');

  // Parse header info
  const name = header?.name || 'Unknown';
  const headerLines = header?.lines || [];
  const subtitle = headerLines.find(l => l.size >= 11)?.text || '';
  const location = headerLines.find(l => l.text.includes(',') && l.text.length < 30 && !l.text.includes('@'))?.text || '';

  // Find contact info line
  const contactLine = headerLines.find(l => l.text.includes('@') || l.text.includes('linkedin'));
  const contactText = contactLine?.text || '';

  // Parse contact parts
  const emailMatch = contactText.match(/[\w.+-]+@[\w.-]+/);
  const phoneMatch = contactText.match(/\+?\d[\d\s‐-]{7,}/);
  const linkedinMatch = contactText.match(/linkedin\.com\/in\/[\w-]+/);

  const email = emailMatch?.[0] || '';
  const phone = phoneMatch?.[0]?.replace(/‐/g, '-') || '';
  const linkedin = linkedinMatch?.[0] || '';

  const contentSections = data.sections.filter(s => s.type === 'section');

  // Build section HTML
  let sectionsHTML = '';
  for (const section of contentSections) {
    const title = esc(section.title);
    let bodyHTML = '';

    const bullets = section.lines.filter(l => l.is_bullet);
    const nonBullets = section.lines.filter(l => !l.is_bullet);

    if (section.title === 'Summary') {
      const text = section.lines.map(l => l.text).join(' ');
      bodyHTML = `<p class="summary-text">${esc(text)}</p>`;
    } else if (section.title === 'Technical Skills') {
      bodyHTML = '<div class="skills-list">';
      for (const line of section.lines) {
        const colonIdx = line.text.indexOf(':');
        if (colonIdx > 0) {
          const cat = line.text.substring(0, colonIdx);
          const vals = line.text.substring(colonIdx + 1);
          bodyHTML += `<div class="skill-row"><span class="skill-cat">${esc(cat)}:</span> ${esc(vals.trim())}</div>`;
        } else {
          bodyHTML += `<div class="skill-row">${esc(line.text)}</div>`;
        }
      }
      bodyHTML += '</div>';
    } else if (section.title === 'Education') {
      for (const line of section.lines) {
        const isBold = line.is_bold || line.text.includes('Institute') || line.text.includes('University');
        bodyHTML += `<div class="${isBold ? 'edu-school' : 'edu-degree'}">${esc(line.text)}</div>`;
      }
    } else if (section.title === 'Experience' || section.title === 'Early Experience') {
      // Group into job entries: non-bullet lines are headers, bullets are details
      let currentJob = null;
      const jobs = [];
      for (const line of section.lines) {
        if (!line.is_bullet) {
          if (currentJob && !currentJob.role) {
            currentJob.role = line.text;
          } else {
            currentJob = { company: line.text, role: '', bullets: [] };
            jobs.push(currentJob);
          }
        } else {
          if (!currentJob) { currentJob = { company: '', role: '', bullets: [] }; jobs.push(currentJob); }
          currentJob.bullets.push(line.text);
        }
      }

      for (const job of jobs) {
        // Parse company line: "Zomato Gurugram, India"
        const compParts = job.company.match(/^(.+?)\s{2,}(.+)$/) || [null, job.company, ''];
        const compName = compParts[1] || job.company;
        const compLoc = compParts[2] || '';

        // Parse role line: "Senior Software Engineer (SDE-3) Jun 2022 – Present"
        const roleParts = job.role.match(/^(.+?)\s{2,}(.+)$/) || [null, job.role, ''];
        const roleTitle = roleParts[1] || job.role;
        const rolePeriod = roleParts[2] || '';

        bodyHTML += `<div class="job">`;
        bodyHTML += `<div class="job-header"><span class="job-company">${esc(compName)}</span>`;
        if (compLoc) bodyHTML += `<span class="job-loc">${esc(compLoc)}</span>`;
        bodyHTML += `</div>`;
        if (roleTitle) {
          bodyHTML += `<div class="job-role-line"><span class="job-role">${esc(roleTitle)}</span>`;
          if (rolePeriod) bodyHTML += `<span class="job-period">${esc(rolePeriod)}</span>`;
          bodyHTML += `</div>`;
        }
        if (job.bullets.length > 0) {
          bodyHTML += '<ul>';
          for (const b of job.bullets) {
            // Bold the prefix before the colon
            const colonIdx = b.indexOf(':');
            if (colonIdx > 0 && colonIdx < 60) {
              bodyHTML += `<li><strong>${esc(b.substring(0, colonIdx))}:</strong>${esc(b.substring(colonIdx + 1))}</li>`;
            } else {
              bodyHTML += `<li>${esc(b)}</li>`;
            }
          }
          bodyHTML += '</ul>';
        }
        bodyHTML += `</div>`;
      }
    } else if (bullets.length > 0) {
      // Generic bulleted section (Achievements, etc.)
      if (nonBullets.length > 0) {
        for (const nb of nonBullets) {
          bodyHTML += `<p class="plain-line">${esc(nb.text)}</p>`;
        }
      }
      bodyHTML += '<ul>';
      for (const b of bullets) {
        bodyHTML += `<li>${esc(b.text)}</li>`;
      }
      bodyHTML += '</ul>';
    } else {
      // Plain text section
      for (const line of section.lines) {
        bodyHTML += `<p class="plain-line">${esc(line.text)}</p>`;
      }
    }

    sectionsHTML += `
    <div class="section">
      <div class="section-title">${title}</div>
      ${bodyHTML}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(name)} - Resume</title>
<style>
  @font-face { font-family: 'Lato'; src: url('file://${fontsDir}/lato-regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: 'Lato'; src: url('file://${fontsDir}/lato-bold.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
  @font-face { font-family: 'Lato'; src: url('file://${fontsDir}/lato-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body {
    font-family: 'Lato', 'Helvetica Neue', sans-serif;
    font-size: 9.8pt;
    line-height: 1.22;
    color: #000;
    background: #fff;
  }

  .page {
    width: 100%;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0;
  }

  /* ── Header ── */
  .header { text-align: center; margin-bottom: 2pt; }
  .header h1 {
    font-size: 24pt;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1pt;
  }
  .header .subtitle {
    font-size: 11pt;
    color: #333;
    margin-bottom: 0pt;
  }
  .header .location {
    font-size: 9.8pt;
    color: #555;
    margin-bottom: 1pt;
  }
  .header .contact {
    font-size: 9.8pt;
    color: #333;
  }
  .header .contact a { color: #333; text-decoration: none; }
  .header .contact .sep { margin: 0 4pt; color: #999; }

  /* ── Section titles ── */
  .section { margin-bottom: 3pt; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    border-bottom: 0.75pt solid #000;
    padding-bottom: 1pt;
    margin-bottom: 3pt;
  }

  /* ── Summary ── */
  .summary-text {
    font-size: 9.8pt;
    line-height: 1.3;
    text-align: justify;
  }

  /* ── Jobs ── */
  .job { margin-bottom: 3pt; }
  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .job-company { font-weight: 700; font-size: 9.8pt; }
  .job-loc { font-size: 9.8pt; color: #333; }
  .job-role-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .job-role { font-style: italic; font-size: 9.8pt; }
  .job-period { font-size: 9.8pt; color: #333; }
  ul {
    padding-left: 14pt;
    margin-top: 1pt;
  }
  li {
    font-size: 9.8pt;
    line-height: 1.22;
    margin-bottom: 1pt;
    text-align: justify;
  }
  li strong { font-weight: 700; }

  /* ── Skills ── */
  .skills-list { }
  .skill-row { font-size: 9.8pt; line-height: 1.35; }
  .skill-cat { font-weight: 700; }

  /* ── Education ── */
  .edu-school { font-weight: 700; font-size: 9.8pt; }
  .edu-degree { font-style: italic; font-size: 9.8pt; }

  /* ── Achievements / plain ── */
  .plain-line { font-size: 9.8pt; line-height: 1.22; margin-bottom: 1pt; }

  /* ── Print ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
  }
  .section, .job { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>${esc(name)}</h1>
    ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
    ${location ? `<div class="location">${esc(location)}</div>` : ''}
    <div class="contact">
      ${email ? `<span>${esc(email)}</span>` : ''}
      ${email && phone ? '<span class="sep">|</span>' : ''}
      ${phone ? `<span>${esc(phone)}</span>` : ''}
      ${(email || phone) && linkedin ? '<span class="sep">|</span>' : ''}
      ${linkedin ? `<a href="https://${esc(linkedin)}">${esc(linkedin)}</a>` : ''}
    </div>
  </div>

  ${sectionsHTML}

</div>
</body>
</html>`;
}

// ─── ATS impact scoring for trimming ───────────────────────────────────
function scoreBulletATS(bulletText, company) {
  const companyLower = company.toLowerCase();
  const profile = COMPANY_KEYWORDS[companyLower] || COMPANY_KEYWORDS.default;
  const textLower = bulletText.toLowerCase();
  let score = 0;

  // Keyword matches
  for (const kw of profile.priority) {
    if (textLower.includes(kw.toLowerCase())) score += 3;
  }

  // Quantified results (numbers = high ATS value)
  const numberMatches = bulletText.match(/\d+[%KMBx+]/g);
  if (numberMatches) score += numberMatches.length * 2;

  // Action verbs
  const actionVerbs = ['built', 'designed', 'architected', 'implemented', 'optimized', 'reduced',
                       'improved', 'scaled', 'led', 'owned', 'shipped', 'launched', 'managed'];
  for (const verb of actionVerbs) {
    if (textLower.includes(verb)) score += 1;
  }

  // Length penalty (very short bullets have less content)
  if (bulletText.length < 40) score -= 1;

  return score;
}

// ─── Trim content to fit 1 page ────────────────────────────────────────
function trimForOnePage(data, company) {
  const trimLog = [];

  // Collect ALL trimmable bullets across all sections with their context
  const candidates = [];
  for (const section of data.sections) {
    if (section.type !== 'section') continue;
    const bullets = section.lines.filter(l => l.is_bullet);
    if (bullets.length <= 1) continue; // Keep at least 1 bullet per section

    for (const b of bullets) {
      b._atsScore = scoreBulletATS(b.text, company);
      // Weight by text length (removing longer bullets saves more space)
      b._spaceScore = b.text.length;
      candidates.push({ bullet: b, section });
    }
  }

  if (candidates.length === 0) return trimLog;

  // Sort by ATS score ascending — remove lowest first
  // On ties, prefer removing shorter bullets (less content lost)
  candidates.sort((a, b) => {
    if (a.bullet._atsScore !== b.bullet._atsScore) return a.bullet._atsScore - b.bullet._atsScore;
    return a.bullet._spaceScore - b.bullet._spaceScore; // remove shorter first on tie
  });

  // Remove ONLY the single globally-lowest-scoring bullet
  const toRemove = candidates[0];
  const idx = toRemove.section.lines.indexOf(toRemove.bullet);
  if (idx >= 0) {
    toRemove.section.lines.splice(idx, 1);
    trimLog.push({
      section: toRemove.section.title,
      removed: toRemove.bullet.text.substring(0, 80) + (toRemove.bullet.text.length > 80 ? '...' : ''),
      atsScore: toRemove.bullet._atsScore,
      reason: `Lowest global ATS score (${toRemove.bullet._atsScore}) across all sections`,
    });
  }

  return trimLog;
}

// ─── PDF generation ────────────────────────────────────────────────────
async function generatePDF(html, outputPath, margins) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const m = margins || { top: '0.28in', right: '0.35in', bottom: '0.47in', left: '0.35in' };

    const pdfBuffer = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: m,
      preferCSSPageSize: false,
    });

    writeFileSync(outputPath, pdfBuffer);

    // Count pages
    const pdfString = pdfBuffer.toString('latin1');
    const pageCount = (pdfString.match(/\/Type\s*\/Page[^s]/g) || []).length;

    return { pageCount, size: pdfBuffer.length };
  } finally {
    await browser.close();
  }
}

// ─── ATS text normalization ────────────────────────────────────────────
function normalizeATS(html) {
  let count = 0;
  let out = html;
  out = out.replace(/\u2014/g, () => { count++; return '-'; });
  out = out.replace(/\u2013/g, () => { count++; return '-'; });
  out = out.replace(/[\u201C\u201D]/g, () => { count++; return '"'; });
  out = out.replace(/[\u2018\u2019]/g, () => { count++; return "'"; });
  out = out.replace(/\u2026/g, () => { count++; return '...'; });
  out = out.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, () => { count++; return ''; });
  out = out.replace(/\u00A0/g, () => { count++; return ' '; });
  return { html: out, count };
}

// ─── LaTeX input handler ───────────────────────────────────────────────

async function handleTexInput(texPath, company, opts) {
  const texContent = readFileSync(texPath, 'utf-8');
  const parsed = parseLatex(texContent);

  const companyLower = company.toLowerCase();
  const profile = COMPANY_KEYWORDS[companyLower] || COMPANY_KEYWORDS.default;
  const jdKeywords = opts.jdFile ? extractJDKeywords(opts.jdFile) : [];
  const keywords = [...profile.priority, ...opts.keywords, ...jdKeywords];
  const boostTerms = profile.boost_sections || [];

  const totalItems = parsed.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`\n🔍 Parsed LaTeX: ${parsed.sections.length} sections, ${totalItems} items`);
  for (const s of parsed.sections) {
    if (s.items.length) console.log(`   • ${s.title}: ${s.items.length} items`);
  }

  // Reorder items by keyword relevance
  let currentLines = texContent.split('\n');
  const { lines: reordered, changes } = reorderLatexItems(currentLines, parsed, keywords, boostTerms);
  currentLines = reordered;

  for (const c of changes) {
    console.log(`\n🎯 ${c.section}: ${c.type} — ${c.detail}`);
  }
  if (changes.length === 0) console.log('\n🎯 Items already in optimal order for target keywords');

  if (opts.dryRun) {
    console.log('\n🏁 Dry run — showing what would change');
    return;
  }

  // Determine output paths
  const datePart = new Date().toISOString().slice(0, 10);
  const outputDir = resolve(__dirname, 'output');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const outTexPath = opts.outputPdf
    ? opts.outputPdf.replace(/\.pdf$/, '.tex')
    : resolve(outputDir, `cv-${company.toLowerCase()}-${datePart}.tex`);
  const outPdfPath = outTexPath.replace(/\.tex$/, '.pdf');

  writeFileSync(outTexPath, currentLines.join('\n'));
  console.log(`\n✓ Modified LaTeX: ${outTexPath}`);

  // Copy any supporting files (.cls, .sty, images) from source dir
  const sourceDir = dirname(resolve(texPath));
  if (sourceDir !== dirname(outTexPath)) {
    const supportExts = ['.cls', '.sty', '.bst', '.bib', '.png', '.jpg', '.pdf'];
    try {
      const { readdirSync } = await import('fs');
      for (const f of readdirSync(sourceDir)) {
        if (supportExts.some(ext => f.endsWith(ext))) {
          const src = join(sourceDir, f);
          const dst = join(dirname(outTexPath), f);
          if (!existsSync(dst)) copyFileSync(src, dst);
        }
      }
    } catch { /* ignore copy failures */ }
  }

  // Compile
  const compiler = findCompiler();
  if (!compiler) {
    console.log(`\n⚠️  No LaTeX compiler found.`);
    console.log(`   Install: brew install --cask mactex-no-gui`);
    console.log(`   Then:    pdflatex ${outTexPath}`);
    console.log(`\n   The modified .tex file is ready at: ${outTexPath}`);
    return;
  }

  console.log(`\n📄 Compiling with ${compiler}...`);
  let result = compileLatex(outTexPath, { compiler });

  if (!result.success) {
    console.error(`\n❌ Compilation failed:\n${result.error}`);
    console.log(`\n   The modified .tex file is at: ${outTexPath}`);
    console.log(`   Fix compilation errors and run: ${compiler} ${basename(outTexPath)}`);
    return;
  }

  console.log(`   ✓ Pages: ${result.pageCount}, PDF: ${result.pdfPath}`);

  // Trim for 1 page if needed
  let trimAttempts = 0;
  while (result.pageCount > 1 && trimAttempts < 10) {
    trimAttempts++;
    console.log(`\n✂️  Trimming pass ${trimAttempts} (${result.pageCount} pages → targeting 1)...`);

    const reParsed = parseLatex(currentLines.join('\n'));
    const { lines: trimmed, removed } = removeWeakestItem(currentLines, reParsed, keywords, boostTerms);

    if (!removed) {
      console.log('   ⚠️  No more trimmable items — try reducing font size or margins in the .tex');
      break;
    }

    console.log(`   ✗ Removed from ${removed.section} (score ${removed.score}): "${removed.text}"`);

    currentLines = trimmed;
    writeFileSync(outTexPath, currentLines.join('\n'));
    result = compileLatex(outTexPath, { compiler });

    if (!result.success) {
      console.error(`   ❌ Compilation failed after trim: ${result.error}`);
      break;
    }

    console.log(`   → Pages: ${result.pageCount}`);
  }

  // Copy PDF to desired output path
  const finalPdf = opts.outputPdf ? resolve(opts.outputPdf) : outPdfPath;
  if (result.pdfPath && result.pdfPath !== finalPdf) {
    copyFileSync(result.pdfPath, finalPdf);
  }

  // Clean aux files
  cleanAuxFiles(outTexPath);

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  if (result.pageCount === 1) {
    console.log(`✅ Success — 1-page PDF generated (LaTeX-native)`);
  } else {
    console.log(`⚠️  PDF is ${result.pageCount} pages`);
  }
  console.log(`   PDF:  ${finalPdf}`);
  console.log(`   TEX:  ${outTexPath}`);
  if (trimAttempts > 0) console.log(`   Trim passes: ${trimAttempts}`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ─── PDF → LaTeX conversion handler ───────────────────────────────────

async function handlePdfToLatex(pdfPath, company, opts) {
  console.log('🔍 Extracting structure from PDF...');
  const data = extractResume(pdfPath);
  console.log(`   ✓ ${data.pages} page(s), ${data.sections.length} sections, ${data.fonts.length} font variants`);

  console.log('\n🔄 Converting to LaTeX...');
  const texContent = structureToLatex(data);

  const datePart = new Date().toISOString().slice(0, 10);
  const namePart = (data.sections.find(s => s.type === 'header')?.name || 'resume')
    .toLowerCase().replace(/\s+/g, '-');
  const outputDir = resolve(__dirname, 'output');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const texPath = resolve(outputDir, `cv-${namePart}-${company.toLowerCase()}-${datePart}.tex`);
  writeFileSync(texPath, texContent);
  console.log(`   ✓ LaTeX source: ${texPath}`);

  // Now run the LaTeX modification + compilation path
  await handleTexInput(texPath, company, opts);
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const inputPath = resolve(opts.inputPdf);
  const company = opts.company;
  const isTexInput = extname(inputPath).toLowerCase() === '.tex';

  console.log(`\n📋 Resume Tailor — ${isTexInput || opts.toLatex ? 'LaTeX-native' : 'PDF-preserving'} keyword optimizer`);
  console.log(`   Input:   ${inputPath}`);
  console.log(`   Company: ${company}`);
  if (opts.role) console.log(`   Role:    ${opts.role}`);
  if (opts.keywords.length) console.log(`   Extra:   ${opts.keywords.join(', ')}`);
  if (opts.jdFile) console.log(`   JD:      ${opts.jdFile}`);
  console.log();

  // Route based on input type
  if (isTexInput) {
    // Direct .tex input — modify in-place, compile
    await handleTexInput(inputPath, company, opts);
    return;
  }

  if (opts.toLatex) {
    // PDF → LaTeX → modify → compile
    await handlePdfToLatex(inputPath, company, opts);
    return;
  }

  // ─── Original PDF → HTML → PDF path ─────────────────────────────────

  // 1. Extract structured content from PDF
  console.log('🔍 Extracting content from PDF...');
  const data = extractResume(inputPath);
  console.log(`   ✓ ${data.pages} page(s), ${data.sections.length} sections, ${data.fonts.length} font variants`);

  // 2. Apply keyword tailoring
  console.log(`\n🎯 Tailoring for ${company}...`);
  const { data: tailored, changes } = tailorContent(data, company, opts);
  for (const c of changes) {
    console.log(`   • ${c.section}: ${c.type} — ${c.detail || c.new?.substring(0, 60) || ''}`);
  }
  if (changes.length === 0) console.log('   • No structural changes needed (keywords already aligned)');

  // 3. Generate HTML
  console.log('\n🔨 Generating HTML...');
  let html = generateHTML(tailored, company, opts);

  // ATS normalize
  const norm = normalizeATS(html);
  html = norm.html;
  if (norm.count > 0) console.log(`   🧹 ATS normalized ${norm.count} characters`);

  if (opts.dryRun) {
    console.log('\n🏁 Dry run — no PDF generated');
    return;
  }

  // 4. Determine output path
  const namePart = (data.sections.find(s => s.type === 'header')?.name || 'resume')
    .toLowerCase().replace(/\s+/g, '-');
  const datePart = new Date().toISOString().slice(0, 10);
  const defaultOutput = resolve(__dirname, `output/cv-${namePart}-${company.toLowerCase()}-${datePart}.pdf`);
  const outputPath = opts.outputPdf ? resolve(opts.outputPdf) : defaultOutput;
  const htmlPath = outputPath.replace(/\.pdf$/, '.html');

  writeFileSync(htmlPath, html);
  console.log(`   ✓ HTML: ${htmlPath}`);

  // 5. Generate PDF
  console.log('\n📄 Generating PDF...');

  // Use margins matching the original PDF
  const margins = {
    top: `${(data.margins?.top || 20) / 72}in`,
    right: `${(data.margins?.right || 25) / 72}in`,
    bottom: `${(data.margins?.bottom || 34) / 72}in`,
    left: `${(data.margins?.left || 25) / 72}in`,
  };

  let result = await generatePDF(html, outputPath, margins);
  console.log(`   ✓ Pages: ${result.pageCount}, Size: ${(result.size / 1024).toFixed(1)} KB`);

  // 6. If >1 page, trim and regenerate
  let trimAttempts = 0;
  while (result.pageCount > 1 && trimAttempts < 8) {
    trimAttempts++;
    console.log(`\n✂️  Trimming pass ${trimAttempts} (${result.pageCount} pages → targeting 1)...`);

    const trimLog = trimForOnePage(tailored, company);
    if (trimLog.length === 0) {
      console.log('   ⚠️  No more trimmable content — cannot reduce to 1 page');
      break;
    }

    for (const t of trimLog) {
      console.log(`   ✗ Removed (ATS score ${t.atsScore}): "${t.removed}"`);
      console.log(`     Reason: ${t.reason}`);
    }

    // Regenerate
    html = generateHTML(tailored, company, opts);
    html = normalizeATS(html).html;
    writeFileSync(htmlPath, html);
    result = await generatePDF(html, outputPath, margins);
    console.log(`   → Pages: ${result.pageCount}, Size: ${(result.size / 1024).toFixed(1)} KB`);
  }

  // 7. Summary
  console.log(`\n${'═'.repeat(60)}`);
  if (result.pageCount === 1) {
    console.log(`✅ Success — 1-page PDF generated`);
  } else {
    console.log(`⚠️  PDF is ${result.pageCount} pages (could not fit to 1)`);
  }
  console.log(`   PDF:  ${outputPath}`);
  console.log(`   HTML: ${htmlPath}`);
  if (trimAttempts > 0) {
    console.log(`   Trim passes: ${trimAttempts}`);
  }
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
