#!/usr/bin/env node

/**
 * browse.mjs — Playwright-based page scraper for Copilot CLI
 *
 * Bridges the gap between Copilot CLI's `web_fetch` (HTTP-only) and
 * Claude Code's `browser_navigate`/`browser_snapshot` (full Playwright).
 *
 * web_fetch cannot render JavaScript SPAs (Ashby, Lever, Workday).
 * This script uses Playwright to:
 *   1. Navigate to a URL with a real Chromium browser
 *   2. Wait for content to render (SPAs, dynamic pages)
 *   3. Extract text content, links, or specific selectors
 *   4. Return structured JSON output
 *
 * Usage:
 *   node browse.mjs <url>                          # Get full page text
 *   node browse.mjs <url> --links                  # Extract all links
 *   node browse.mjs <url> --selector "div.job-list" # Extract specific element
 *   node browse.mjs <url> --jobs                   # Extract job listings (auto-detect portal)
 *   node browse.mjs <url> --screenshot out.png     # Take screenshot
 *   node browse.mjs <url> --check-alive            # Check if job posting is still active
 *   node browse.mjs <url> --html                   # Return raw HTML
 *
 * Options:
 *   --wait <ms>        Wait time after load (default: 3000)
 *   --timeout <ms>     Navigation timeout (default: 30000)
 *   --max-length <n>   Max text output chars (default: 50000)
 *
 * Output: JSON to stdout with { ok, url, data, error }
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));

if (!url) {
  console.error('Usage: node browse.mjs <url> [options]');
  process.exit(1);
}

const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
};

const WAIT = parseInt(getArg('--wait') || '3000', 10);
const TIMEOUT = parseInt(getArg('--timeout') || '30000', 10);
const MAX_LENGTH = parseInt(getArg('--max-length') || '50000', 10);

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto(url, { timeout: TIMEOUT, waitUntil: 'networkidle' });
    await page.waitForTimeout(WAIT);

    const finalUrl = page.url();

    // --check-alive: determine if a job posting is still active
    if (flags.has('--check-alive')) {
      const text = await page.textContent('body') || '';
      const lowerText = text.toLowerCase();
      const expired = [
        'job no longer available', 'no longer open', 'position has been filled',
        'this job has expired', 'page not found', '404', 'not found',
        'no longer accepting applications', 'this position is closed',
        'role has been filled', 'job has been removed',
      ].some(s => lowerText.includes(s));

      const hasErrorParam = finalUrl.includes('?error=true') || finalUrl.includes('error=true');
      const tooShort = text.trim().length < 300;

      const alive = !expired && !hasErrorParam && !tooShort;
      output({ ok: true, url: finalUrl, data: { alive, expired, hasErrorParam, contentLength: text.trim().length } });
      return;
    }

    // --screenshot: save screenshot
    if (flags.has('--screenshot')) {
      const outPath = getArg('--screenshot') || '/tmp/browse-screenshot.png';
      await page.screenshot({ path: outPath, fullPage: true });
      output({ ok: true, url: finalUrl, data: { screenshot: outPath } });
      return;
    }

    // --links: extract all links
    if (flags.has('--links')) {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.textContent?.trim().slice(0, 200) || '',
          href: a.href,
        })).filter(l => l.href && !l.href.startsWith('javascript:'));
      });
      output({ ok: true, url: finalUrl, data: { links: links.slice(0, 500) } });
      return;
    }

    // --jobs: auto-detect portal type and extract job listings
    if (flags.has('--jobs')) {
      const jobs = await extractJobs(page, finalUrl);
      output({ ok: true, url: finalUrl, data: { jobs, count: jobs.length } });
      return;
    }

    // --selector: extract specific element
    if (flags.has('--selector')) {
      const selector = getArg('--selector');
      const el = await page.$(selector);
      if (el) {
        const text = await el.textContent() || '';
        output({ ok: true, url: finalUrl, data: { text: text.slice(0, MAX_LENGTH) } });
      } else {
        output({ ok: false, url: finalUrl, error: `Selector not found: ${selector}` });
      }
      return;
    }

    // --html: return raw HTML
    if (flags.has('--html')) {
      const html = await page.content();
      output({ ok: true, url: finalUrl, data: { html: html.slice(0, MAX_LENGTH) } });
      return;
    }

    // Default: full page text
    const text = await page.textContent('body') || '';
    output({ ok: true, url: finalUrl, data: { text: text.slice(0, MAX_LENGTH) } });

  } catch (err) {
    output({ ok: false, url, error: err.message });
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

async function extractJobs(page, pageUrl) {
  // Detect portal type from URL
  const isAshby = pageUrl.includes('ashbyhq.com');
  const isGreenhouse = pageUrl.includes('greenhouse.io');
  const isLever = pageUrl.includes('lever.co');
  const isWorkable = pageUrl.includes('workable.com');

  return await page.evaluate(({ isAshby, isGreenhouse, isLever, isWorkable }) => {
    const jobs = [];

    if (isAshby) {
      // Ashby renders job cards with links
      document.querySelectorAll('a[href*="/jobs/"]').forEach(a => {
        const title = a.textContent?.trim();
        if (title && title.length > 3 && title.length < 200) {
          jobs.push({ title, url: a.href, company: '' });
        }
      });
    } else if (isGreenhouse) {
      // Greenhouse: structured job board
      document.querySelectorAll('.opening a, .job-post a, [data-mapped="true"] a').forEach(a => {
        const title = a.textContent?.trim();
        if (title && title.length > 3) {
          jobs.push({ title, url: a.href, company: '' });
        }
      });
    } else if (isLever) {
      // Lever: posting links
      document.querySelectorAll('.posting-title a, a[href*="/jobs/"]').forEach(a => {
        const title = a.textContent?.trim();
        if (title && title.length > 3) {
          jobs.push({ title, url: a.href, company: '' });
        }
      });
    } else if (isWorkable) {
      document.querySelectorAll('a[href*="/j/"]').forEach(a => {
        const title = a.textContent?.trim();
        if (title && title.length > 3) {
          jobs.push({ title, url: a.href, company: '' });
        }
      });
    } else {
      // Generic: find links that look like job postings
      document.querySelectorAll('a').forEach(a => {
        const href = a.href || '';
        const title = a.textContent?.trim();
        if (title && title.length > 5 && title.length < 200 &&
            (href.includes('/job') || href.includes('/career') ||
             href.includes('/position') || href.includes('/opening'))) {
          jobs.push({ title, url: href, company: '' });
        }
      });
    }

    // Deduplicate by URL
    const seen = new Set();
    return jobs.filter(j => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });
  }, { isAshby, isGreenhouse, isLever, isWorkable });
}

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

main();
