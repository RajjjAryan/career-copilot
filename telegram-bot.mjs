#!/usr/bin/env node
/**
 * telegram-bot.mjs — Career Copilot Telegram Bot
 *
 * Gives you mobile access to your job search pipeline.
 *
 * Setup:
 *   1. Message @BotFather on Telegram → /newbot → get your token
 *   2. Set env: export TELEGRAM_BOT_TOKEN="your-token-here"
 *   3. Run:    node telegram-bot.mjs
 *
 * Commands:
 *   /start       — Welcome + help
 *   /jobs         — All evaluated jobs ranked by score
 *   /top          — Top 3 recommended jobs
 *   /report NNN   — View evaluation report (e.g., /report 007)
 *   /resume       — List available tailored PDFs
 *   /status       — Pipeline status summary
 *   /apply        — Jobs ready to apply (with direct links)
 *   /stats        — Score distribution + pipeline analytics
 */

import { Telegraf, Markup } from 'telegraf';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(ROOT, 'reports');
const OUTPUT_DIR = join(ROOT, 'output');
const CV_FILE = join(ROOT, 'cv.md');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ Set TELEGRAM_BOT_TOKEN env variable first.');
  console.error('   Get one from @BotFather on Telegram.');
  console.error('   export TELEGRAM_BOT_TOKEN="your-token"');
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// --- Helpers ---

function parseReport(filename) {
  const path = join(REPORTS_DIR, filename);
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');

  const extract = (key) => {
    for (const line of lines) {
      if (line.includes(`| **${key}**`) || line.includes(`| ${key}`)) {
        const parts = line.split('|').map(s => s.trim());
        return parts[2] || '';
      }
    }
    return '';
  };

  // Try table format first
  let company = extract('Company');
  let role = extract('Role');
  let location = extract('Location');
  let url = extract('URL');
  let scoreRaw = extract('Score');

  // Fallback: parse from header line
  if (!company) {
    const header = lines.find(l => l.startsWith('# '));
    if (header) {
      const match = header.match(/# .*?— (.+?) [·—] (.+)/);
      if (match) { company = match[1]; role = match[2]; }
    }
  }

  // Fallback: parse score from "Grade:" line
  if (!scoreRaw) {
    const gradeLine = lines.find(l => l.includes('Grade:'));
    if (gradeLine) {
      const m = gradeLine.match(/(\d+\.?\d*)\/5/);
      if (m) scoreRaw = m[1] + '/5';
    }
  }

  const scoreMatch = scoreRaw.replace(/\*/g, '').match(/(\d+\.?\d*)/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

  // Extract verdict
  let verdict = '';
  const verdictLine = lines.find(l => l.includes('Verdict:') || l.includes('verdict'));
  if (verdictLine) verdict = verdictLine.replace(/^.*Verdict:\s*/, '').replace(/\*\*/g, '').trim();

  return {
    filename, company, role, location, url,
    score, scoreRaw: scoreRaw.replace(/\*/g, ''),
    verdict,
    num: filename.match(/^(\d+)/)?.[1] || '???',
  };
}

function getAllReports() {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(parseReport)
    .sort((a, b) => b.score - a.score);
}

function getAllResumes() {
  if (!existsSync(OUTPUT_DIR)) return [];
  return readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort();
}

function scoreEmoji(score) {
  if (score >= 4.0) return '🟢';
  if (score >= 3.5) return '🔵';
  if (score >= 3.0) return '🟡';
  if (score >= 2.5) return '🟠';
  return '🔴';
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len - 1) + '…' : str;
}

// --- Commands ---

bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `🚀 *Career Copilot Bot*\n\n` +
    `Your job search pipeline, on Telegram.\n\n` +
    `*Commands:*\n` +
    `/jobs — All evaluated jobs (ranked)\n` +
    `/top — Top 3 recommendations\n` +
    `/report 007 — View specific report\n` +
    `/resume — Available tailored PDFs\n` +
    `/apply — Jobs ready to apply\n` +
    `/stats — Pipeline analytics\n` +
    `/status — Quick status summary`
  );
});

bot.command('jobs', (ctx) => {
  const reports = getAllReports();
  if (reports.length === 0) {
    return ctx.reply('No evaluations found. Run the evaluate mode first.');
  }

  let msg = '📊 *All Evaluated Jobs*\n\n';
  for (const r of reports) {
    msg += `${scoreEmoji(r.score)} *#${r.num}* ${r.company} — ${truncate(r.role, 35)}\n`;
    msg += `   Score: ${r.scoreRaw} | ${r.location}\n`;
    if (r.url) msg += `   [Apply →](${r.url})\n`;
    msg += '\n';
  }
  ctx.replyWithMarkdown(msg, { disable_web_page_preview: true });
});

bot.command('top', (ctx) => {
  const reports = getAllReports().slice(0, 3);
  if (reports.length === 0) {
    return ctx.reply('No evaluations found.');
  }

  let msg = '🏆 *Top 3 Recommendations*\n\n';
  const medals = ['🥇', '🥈', '🥉'];
  reports.forEach((r, i) => {
    msg += `${medals[i]} *${r.company}* — ${r.role}\n`;
    msg += `   Score: *${r.scoreRaw}* | ${r.location}\n`;
    if (r.verdict) msg += `   _${truncate(r.verdict, 60)}_\n`;
    if (r.url) msg += `   [Apply →](${r.url})\n`;
    msg += '\n';
  });
  ctx.replyWithMarkdown(msg, { disable_web_page_preview: true });
});

bot.command('report', (ctx) => {
  const num = ctx.message.text.split(' ')[1];
  if (!num) {
    return ctx.reply('Usage: /report 007\nSend the 3-digit report number.');
  }

  const padded = num.padStart(3, '0');
  const reports = readdirSync(REPORTS_DIR).filter(f => f.startsWith(padded));
  if (reports.length === 0) {
    return ctx.reply(`Report #${padded} not found.`);
  }

  const content = readFileSync(join(REPORTS_DIR, reports[0]), 'utf-8');
  // Telegram has 4096 char limit
  if (content.length > 4000) {
    const chunks = content.match(/[\s\S]{1,4000}/g);
    chunks.forEach((chunk, i) => {
      ctx.replyWithMarkdown(chunk).catch(() => ctx.reply(chunk));
    });
  } else {
    ctx.replyWithMarkdown(content).catch(() => ctx.reply(content));
  }
});

bot.command('resume', (ctx) => {
  const pdfs = getAllResumes();
  if (pdfs.length === 0) {
    return ctx.reply('No tailored resumes found in output/.');
  }

  let msg = '📄 *Tailored Resumes*\n\n';
  pdfs.forEach(pdf => {
    const match = pdf.match(/^cv-.*-(.+?)-(\d{4}-\d{2}-\d{2})\.pdf$/);
    if (match) {
      msg += `• *${match[1]}* (${match[2]})\n`;
    } else {
      msg += `• ${pdf}\n`;
    }
  });
  msg += '\nUse /sendresume {company} to get the PDF file.';
  ctx.replyWithMarkdown(msg);
});

bot.command('sendresume', async (ctx) => {
  const company = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
  if (!company) {
    return ctx.reply('Usage: /sendresume gitlab');
  }

  const pdfs = getAllResumes().filter(f => f.toLowerCase().includes(company));
  if (pdfs.length === 0) {
    return ctx.reply(`No resume found for "${company}".`);
  }

  for (const pdf of pdfs) {
    await ctx.replyWithDocument({
      source: join(OUTPUT_DIR, pdf),
      filename: pdf,
    });
  }
});

bot.command('apply', (ctx) => {
  const reports = getAllReports().filter(r => r.score >= 3.5 && r.url);
  if (reports.length === 0) {
    return ctx.reply('No jobs above 3.5/5 with apply links found.');
  }

  let msg = '🎯 *Ready to Apply* (score ≥ 3.5)\n\n';
  reports.forEach((r, i) => {
    const hasPdf = getAllResumes().some(p =>
      p.toLowerCase().includes(r.company.toLowerCase())
    );
    msg += `${i + 1}. *${r.company}* — ${r.role}\n`;
    msg += `   Score: ${r.scoreRaw} | ${r.location}\n`;
    msg += `   Resume: ${hasPdf ? '✅ Ready' : '❌ Not generated'}\n`;
    msg += `   [Apply →](${r.url})\n\n`;
  });
  msg += '_Tap Apply links to open job pages. Use /sendresume {company} to get PDFs._';
  ctx.replyWithMarkdown(msg, { disable_web_page_preview: true });
});

bot.command('stats', (ctx) => {
  const reports = getAllReports();
  if (reports.length === 0) return ctx.reply('No data yet.');

  const total = reports.length;
  const avg = (reports.reduce((s, r) => s + r.score, 0) / total).toFixed(1);
  const strong = reports.filter(r => r.score >= 3.5).length;
  const decent = reports.filter(r => r.score >= 2.5 && r.score < 3.5).length;
  const weak = reports.filter(r => r.score < 2.5).length;
  const pdfs = getAllResumes().length;
  const best = reports[0];

  let msg = '📈 *Pipeline Analytics*\n\n';
  msg += `Total evaluated: *${total}*\n`;
  msg += `Average score: *${avg}/5*\n`;
  msg += `Resumes generated: *${pdfs}*\n\n`;
  msg += `🟢 Strong (≥3.5): ${strong}\n`;
  msg += `🟡 Decent (2.5-3.4): ${decent}\n`;
  msg += `🔴 Weak (<2.5): ${weak}\n\n`;
  msg += `🏆 Best match: *${best.company}* (${best.scoreRaw})`;
  ctx.replyWithMarkdown(msg);
});

bot.command('status', (ctx) => {
  const reports = getAllReports();
  const pdfs = getAllResumes();
  const applied = reports.filter(r => r.score >= 3.5);

  let msg = '🔄 *Pipeline Status*\n\n';
  msg += `📊 ${reports.length} jobs evaluated\n`;
  msg += `📄 ${pdfs.length} tailored resumes\n`;
  msg += `🎯 ${applied.length} ready to apply (≥3.5)\n`;
  msg += `⏳ ${applied.length} pending applications\n\n`;
  msg += `Last update: ${new Date().toISOString().split('T')[0]}`;
  ctx.replyWithMarkdown(msg);
});

// Handle plain text — helpful guidance
bot.on('text', (ctx) => {
  const text = ctx.message.text.toLowerCase();
  if (text.includes('job') || text.includes('find')) {
    return ctx.reply('Use /jobs to see all evaluated positions, or /top for the best 3.');
  }
  if (text.includes('resume') || text.includes('cv')) {
    return ctx.reply('Use /resume to list PDFs, or /sendresume {company} to get one.');
  }
  if (text.includes('apply')) {
    return ctx.reply('Use /apply to see jobs ready for application with direct links.');
  }
  ctx.reply(
    '🤖 I understand these commands:\n' +
    '/jobs /top /report /resume /apply /stats /status\n\n' +
    'Type /start for full help.'
  );
});

// Launch
bot.launch()
  .then(() => console.log('🤖 Career Copilot bot is running! Send /start in Telegram.'))
  .catch(err => {
    console.error('Failed to start bot:', err.message);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
