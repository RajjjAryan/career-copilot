#!/usr/bin/env node
// Career-Copilot Interactive Web Dashboard
// Express server that serves the dashboard UI and provides API endpoints
// for applications, pipeline, reports, and stats parsed from markdown files.

import express from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync, watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DATA_DIR = join(ROOT, 'data');
const REPORTS_DIR = join(ROOT, 'reports');
const PIPELINE_FILE = join(DATA_DIR, 'pipeline.md');
const APPLICATIONS_FILE = join(DATA_DIR, 'applications.md');

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Markdown Parsers ────────────────────────────────────────────────────────

function parseApplications() {
  if (!existsSync(APPLICATIONS_FILE)) return [];
  const content = readFileSync(APPLICATIONS_FILE, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'));
  // Skip header and separator rows
  const dataLines = lines.slice(2);
  return dataLines.map(line => {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 8) return null;
    const reportMatch = cols[7]?.match(/\[(\d+)\]\(([^)]+)\)/);
    const scoreMatch = cols[4]?.match(/([\d.]+)\/5/);
    const urlMatch = extractJobUrl(cols[0]);
    return {
      num: cols[0],
      date: cols[1],
      company: cols[2],
      role: cols[3],
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      scoreText: cols[4],
      status: cols[5],
      hasPdf: cols[6] !== '❌' && cols[6] !== '—',
      reportNum: reportMatch ? reportMatch[1] : null,
      reportPath: reportMatch ? reportMatch[2] : null,
      notes: cols[8] || '',
      jobUrl: urlMatch
    };
  }).filter(Boolean);
}

function extractJobUrl(num) {
  // Try to extract job URL from report file
  const padded = String(num).padStart(3, '0');
  const files = existsSync(REPORTS_DIR) ? readdirSync(REPORTS_DIR) : [];
  const reportFile = files.find(f => f.startsWith(padded) && f.endsWith('.md'));
  if (!reportFile) return null;
  try {
    const content = readFileSync(join(REPORTS_DIR, reportFile), 'utf-8');
    const urlMatch = content.match(/\|\s*URL\s*\|\s*(https?:\/\/[^\s|]+)/);
    return urlMatch ? urlMatch[1].trim() : null;
  } catch { return null; }
}

function parsePipeline() {
  if (!existsSync(PIPELINE_FILE)) return { evaluated: [], pending: [], tiers: [] };
  const content = readFileSync(PIPELINE_FILE, 'utf-8');
  const lines = content.split('\n');

  const evaluated = [];
  const pending = [];
  let currentTier = '';
  let currentSection = '';

  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentTier = line.replace(/^###\s*/, '').trim();
    }
    if (line.startsWith('#### ')) {
      currentSection = line.replace(/^####\s*/, '').trim();
    }
    // Evaluated entries: - [x] Company | Role | **Grade** — notes
    const evalMatch = line.match(/^- \[x\]\s*(.+?)$/);
    if (evalMatch) {
      const parts = evalMatch[1].split('|').map(s => s.trim());
      const scoreMatch = evalMatch[1].match(/\*\*([A-F][+-]?)\s*\(([\d.]+)\)\*\*/);
      evaluated.push({
        company: parts[0] || '',
        role: parts[1] || '',
        grade: scoreMatch ? scoreMatch[1] : '',
        score: scoreMatch ? parseFloat(scoreMatch[2]) : 0,
        notes: evalMatch[1].split('—').slice(1).join('—').trim(),
        tier: currentTier
      });
    }
    // Pending entries: - [ ] URL | Company | Role | Location
    const pendingMatch = line.match(/^- \[ \]\s*(.+?)$/);
    if (pendingMatch) {
      const parts = pendingMatch[1].split('|').map(s => s.trim());
      const urlMatch = parts[0]?.match(/(https?:\/\/\S+)/);
      pending.push({
        url: urlMatch ? urlMatch[1] : parts[0],
        company: parts[1] || '',
        role: parts[2] || '',
        location: parts[3] || '',
        tier: currentTier
      });
    }
  }

  return { evaluated, pending };
}

function parseReport(filename) {
  const filePath = join(REPORTS_DIR, filename);
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');

  // Extract metadata from the report table
  const fieldMatches = [...content.matchAll(/\|\s*(\w+)\s*\|\s*(.+?)\s*\|/g)];
  const fields = {};
  for (const m of fieldMatches) {
    fields[m[1].toLowerCase()] = m[2].replace(/\*\*/g, '').trim();
  }

  return {
    filename,
    raw: content,
    html: markdownToHtml(content),
    company: fields.company || '',
    role: fields.role || '',
    location: fields.location || '',
    url: fields.url || '',
    date: fields.date || '',
    score: fields.score || ''
  };
}

function listReports() {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.md') && f !== '.gitkeep')
    .sort()
    .map(f => {
      const match = f.match(/^(\d+)-(.+?)-(\d{4}-\d{2}-\d{2})\.md$/);
      return {
        filename: f,
        num: match ? match[1] : '',
        slug: match ? match[2] : f,
        date: match ? match[3] : ''
      };
    });
}

function computeStats(apps) {
  const total = apps.length;
  const byStatus = {};
  let totalScore = 0;
  let topScore = 0;
  let withPdf = 0;

  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    totalScore += a.score;
    if (a.score > topScore) topScore = a.score;
    if (a.hasPdf) withPdf++;
  }

  const avgScore = total > 0 ? (totalScore / total).toFixed(2) : 0;

  // Score distribution
  const strong = apps.filter(a => a.score >= 4.5).length;
  const good = apps.filter(a => a.score >= 4.0 && a.score < 4.5).length;
  const decent = apps.filter(a => a.score >= 3.5 && a.score < 4.0).length;
  const weak = apps.filter(a => a.score < 3.5).length;

  return {
    total,
    byStatus,
    avgScore: parseFloat(avgScore),
    topScore,
    withPdf,
    distribution: { strong, good, decent, weak }
  };
}

// Simple markdown → HTML converter
function markdownToHtml(md) {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return ''; // separator row
      const tag = 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Unordered lists
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Paragraphs (lines not already converted)
    .split('\n')
    .map(line => {
      if (line.startsWith('<') || line.trim() === '') return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  // Wrap consecutive <tr> in <table>
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  return html;
}

// ─── API Routes ──────────────────────────────────────────────────────────────

app.get('/api/applications', (_req, res) => {
  res.json(parseApplications());
});

app.get('/api/pipeline', (_req, res) => {
  res.json(parsePipeline());
});

app.get('/api/reports', (_req, res) => {
  res.json(listReports());
});

app.get('/api/reports/:filename', (req, res) => {
  const report = parseReport(req.params.filename);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

app.get('/api/stats', (_req, res) => {
  const apps = parseApplications();
  const pipeline = parsePipeline();
  const stats = computeStats(apps);
  stats.pipelinePending = pipeline.pending.length;
  stats.pipelineEvaluated = pipeline.evaluated.length;
  res.json(stats);
});

// Add URL to pipeline
app.post('/api/pipeline', (req, res) => {
  const { url, company, role, location } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  if (!existsSync(PIPELINE_FILE)) {
    return res.status(500).json({ error: 'pipeline.md not found' });
  }

  const content = readFileSync(PIPELINE_FILE, 'utf-8');
  const entry = `- [ ] ${url}${company ? ` | ${company}` : ''}${role ? ` | ${role}` : ''}${location ? ` | ${location}` : ''}`;

  // Find "Not yet evaluated" section and add after it
  const insertPoint = content.indexOf('#### Not yet evaluated');
  if (insertPoint !== -1) {
    const nextLineEnd = content.indexOf('\n', insertPoint);
    const updated = content.slice(0, nextLineEnd + 1) + entry + '\n' + content.slice(nextLineEnd + 1);
    writeFileSync(PIPELINE_FILE, updated, 'utf-8');
  } else {
    // Append at end
    writeFileSync(PIPELINE_FILE, content + '\n' + entry + '\n', 'utf-8');
  }

  res.json({ success: true, message: 'Added to pipeline' });
});

// Update application status
app.patch('/api/applications/:num', (req, res) => {
  const { status } = req.body;
  const num = req.params.num;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const content = readFileSync(APPLICATIONS_FILE, 'utf-8');
  const lines = content.split('\n');
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|') && lines[i].includes(`| ${num} |`)) {
      const cols = lines[i].split('|').filter(Boolean);
      if (cols.length >= 6) {
        cols[5] = ` ${status} `;
        lines[i] = '|' + cols.join('|') + '|';
        updated = true;
        break;
      }
    }
  }

  if (!updated) return res.status(404).json({ error: 'Application not found' });
  writeFileSync(APPLICATIONS_FILE, lines.join('\n'), 'utf-8');
  res.json({ success: true });
});

// ─── Server Start ────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3737', 10);

app.listen(PORT, () => {
  console.log(`\n  🚀 Career-Copilot Dashboard`);
  console.log(`  ───────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Data:    ${DATA_DIR}`);
  console.log(`  Reports: ${REPORTS_DIR}\n`);
});
