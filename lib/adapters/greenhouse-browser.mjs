// lib/adapters/greenhouse-browser.mjs — Greenhouse browser-based application submission
//
// Semi-automated: fills the form with Playwright, then opens a visible
// browser so the user can solve the reCAPTCHA and click Submit.
// reCAPTCHA Enterprise on Greenhouse blocks fully automated submissions.

import { chromium } from 'playwright';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fetchJobDetails } from './greenhouse.mjs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * Launch real Chrome via CDP for visible interaction, or fall back to Playwright Chromium.
 */
async function launchBrowser(headless) {
  if (headless) {
    const browser = await chromium.launch({ headless: true });
    return { browser, chromePid: null };
  }

  // Try real Chrome via CDP for best reCAPTCHA compatibility + visibility
  try {
    const tmpProfile = mkdtempSync(join(tmpdir(), 'cc-chrome-'));
    const port = 9222 + Math.floor(Math.random() * 100);
    const chrome = spawn(CHROME_PATH, [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${tmpProfile}`,
      '--no-first-run', '--no-default-browser-check',
      '--disable-sync', '--disable-extensions',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1300,900',
    ], { stdio: 'pipe', detached: true });
    chrome.unref();

    // Wait for Chrome to start
    await new Promise(r => setTimeout(r, 3000));

    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    return { browser, chromePid: chrome.pid };
  } catch {
    // Fallback to Playwright
    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });
    return { browser, chromePid: null };
  }
}

/**
 * Pre-fill a Greenhouse application in a visible browser.
 *
 * Flow:
 *  1. Opens the job page in a headed browser
 *  2. Fills all standard fields + custom questions
 *  3. Uploads resume PDF
 *  4. Prints a console prompt for the user to solve CAPTCHA + click Apply
 *  5. Waits up to 3 minutes for submission (URL change / success element)
 *  6. Returns result
 *
 * @param {object} opts
 * @param {string} opts.boardToken - Greenhouse board token (e.g. 'gitlab')
 * @param {string} opts.jobId - Greenhouse job ID
 * @param {object} opts.profile - { candidate, auto_apply, location }
 * @param {string} [opts.pdfPath] - Absolute path to resume PDF
 * @param {string} [opts.jobUrl] - Override URL
 * @param {boolean} [opts.headless=false] - true only for testing
 * @param {number} [opts.submitTimeout=180000] - ms to wait for user submission
 * @returns {{ success: boolean, message: string, unanswered?: string[] }}
 */
export async function submitViaBrowser({
  boardToken, jobId, profile, pdfPath,
  jobUrl, headless = false, submitTimeout = 180000,
}) {
  const cand = profile.candidate || {};
  const loc = profile.location || {};
  const autoApply = profile.auto_apply || {};

  const nameParts = (cand.full_name || '').split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const url = jobUrl || `https://job-boards.greenhouse.io/${boardToken}/jobs/${jobId}`;

  let browser, chromePid;
  try {
    ({ browser, chromePid } = await launchBrowser(headless));
    const ctx = browser.contexts()[0] || await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: headless ? { width: 1280, height: 900 } : null,
    });
    const page = ctx.pages()[0] || await ctx.newPage();

    console.log(`\n📋 Opening: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#application-form', { timeout: 10000 });
    await page.waitForTimeout(1500); // let React hydrate

    // --- Fill standard fields ---
    console.log('  ✏️  Filling standard fields...');
    await safeType(page, '#first_name', firstName);
    await safeType(page, '#last_name', lastName);
    await safeType(page, '#email', cand.email || '');
    await safeType(page, '#phone', cand.phone || '');

    // Set phone country to India
    try {
      const phoneCountry = page.locator('#country[role="combobox"]').first();
      if (await phoneCountry.count() > 0) {
        await phoneCountry.click();
        await phoneCountry.fill('India');
        await page.waitForTimeout(500);
        const opt = page.locator('.select__option:has-text("India")').first();
        if (await opt.count() > 0) await opt.click();
      }
    } catch { /* phone country not found */ }

    // Upload resume
    if (pdfPath) {
      const absPath = resolve(pdfPath);
      const fileInput = page.locator('#application-form input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(absPath);
        await page.waitForTimeout(1000);
        console.log('  📎 Resume uploaded');
      }
    }

    // --- Fetch question metadata from API (GET is public) ---
    let questions = [];
    try {
      const details = await fetchJobDetails(boardToken, jobId);
      questions = details.questions || [];
    } catch { /* proceed without metadata */ }

    const answers = buildAnswerMap(cand, loc, autoApply);

    // --- Fill custom questions ---
    const unanswered = [];
    let filled = 0;

    for (const q of questions) {
      if (['first_name', 'last_name', 'email', 'phone', 'resume', 'cover_letter'].includes(q.id)) continue;

      const answer = findAnswer(q, answers);

      if (q.type === 'input_text' || q.type === 'textarea') {
        if (answer) {
          await safeType(page, `#${q.id}`, answer);
          filled++;
        } else if (q.required) {
          unanswered.push(q.label);
        }
      } else if (q.type === 'input_file') {
        continue;
      } else if (q.type.includes('select')) {
        if (answer !== null && answer !== undefined) {
          await selectReactOption(page, q, String(answer));
          filled++;
        } else if (q.required) {
          unanswered.push(q.label);
        }
      }
    }

    console.log(`  ✅ Filled ${filled} custom question(s)`);
    if (unanswered.length > 0) {
      console.log(`  ⚠️  ${unanswered.length} unanswered: ${unanswered.join(', ')}`);
    }

    // Fill optional EEOC / demographic fields
    await fillEEOCFields(page);

    // Scroll to submit area so the user sees the CAPTCHA
    const submitBtn = page.locator('button.btn--pill, button[type="submit"], #submit_app').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.scrollIntoViewIfNeeded();
    }

    // --- Prompt user ---
    // Bring Chrome to foreground on macOS
    try {
      const { execSync } = await import('child_process');
      execSync(`osascript -e 'tell application "Google Chrome" to activate'`);
      execSync(`osascript -e 'display notification "Solve CAPTCHA & click Apply" with title "Career Copilot" sound name "Glass"'`);
    } catch { /* not macOS or Chrome not found */ }

    console.log('\n🔐 Form pre-filled! Please:');
    console.log('   1. Review the answers in the browser');
    console.log('   2. Solve the reCAPTCHA checkbox');
    console.log('   3. Click "Apply"');
    console.log(`   ⏳ Waiting up to ${Math.round(submitTimeout / 60000)} min...\n`);

    // --- Wait for user to submit ---
    const startUrl = page.url();
    const result = await Promise.race([
      // Success: page navigates away or shows confirmation
      waitForSubmission(page, startUrl, submitTimeout),
      // Timeout
      new Promise(res => setTimeout(() => res({
        success: false,
        message: 'Timed out waiting for user to submit',
      }), submitTimeout)),
    ]);

    // Small delay before closing so user sees confirmation
    if (result.success) {
      console.log('  🎉 Application submitted successfully!');
      await page.waitForTimeout(2000);
    } else {
      console.log(`  ❌ ${result.message}`);
    }

    await browser.close();
    if (chromePid) try { process.kill(chromePid, 'SIGTERM'); } catch {}
    return { ...result, unanswered };

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    if (chromePid) try { process.kill(chromePid, 'SIGTERM'); } catch {}
    return {
      success: false,
      message: `Browser error: ${err.message}`,
      unanswered: [],
    };
  }
}

/**
 * Run semi-auto apply on a batch of jobs, one at a time.
 */
export async function batchApply({ boardToken, jobIds, profile, pdfPath, submitTimeout }) {
  const results = [];
  for (let i = 0; i < jobIds.length; i++) {
    const jobId = jobIds[i];
    console.log(`\n━━━ Job ${i + 1}/${jobIds.length}: ${boardToken}/jobs/${jobId} ━━━`);
    const r = await submitViaBrowser({ boardToken, jobId, profile, pdfPath, submitTimeout });
    results.push({ jobId, ...r });
    if (i < jobIds.length - 1) {
      console.log('  ⏭️  Next job in 2 seconds...');
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  return results;
}

// --- Internal helpers ---

/** Wait for the page to navigate or show a success element after form submit. */
async function waitForSubmission(page, startUrl, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    // Check URL change (most Greenhouse boards redirect after submit)
    const currentUrl = page.url();
    if (currentUrl !== startUrl && !currentUrl.includes('/error')) {
      return { success: true, message: 'Redirected to confirmation page' };
    }
    // Check for success element on same page
    const success = await page.$('.application--success, .thank-you, [data-test="confirmation"], .flash--success');
    if (success) {
      return { success: true, message: 'Confirmation element detected' };
    }
    // Check for error
    const err = await page.$('.application--error, .error-message');
    if (err) {
      const text = await err.textContent().catch(() => 'Unknown error');
      return { success: false, message: `Form error: ${text.substring(0, 200)}` };
    }
    await page.waitForTimeout(1000);
  }
  return { success: false, message: 'Submission wait timed out' };
}

// --- Helpers ---

async function safeType(page, selector, value) {
  try {
    const el = page.locator(selector);
    if (await el.count() > 0) {
      await el.fill(value);
    }
  } catch { /* field not found, skip */ }
}

/**
 * Handle React-Select dropdowns used by Greenhouse.
 * The combobox input has the same ID as the question (e.g. "question_35900439002")
 * with role="combobox". Options render in .select__option elements.
 */
async function selectReactOption(page, question, answerValue) {
  const values = question.values || [];
  const matchingOpt = values.find(o => String(o.value) === answerValue);
  if (!matchingOpt) return;

  const labelText = matchingOpt.label;
  const qId = question.id || '';

  try {
    // The React-Select combobox input has id=qId and role="combobox"
    const combobox = page.locator(`#${qId}[role="combobox"], input#${qId}.select__input`).first();
    if (await combobox.count() > 0) {
      await combobox.click();
      await combobox.fill(labelText.substring(0, 25));
      await page.waitForTimeout(600);
      const opt = page.locator(`.select__option:has-text("${labelText.substring(0, 40)}")`).first();
      if (await opt.count() > 0) {
        await opt.click();
        return;
      }
    }

    // Fallback: find the .select__control near this question's field-wrapper
    const wrapper = page.locator(`.field-wrapper:has(#${qId})`).first();
    if (await wrapper.count() > 0) {
      const control = wrapper.locator('.select__control').first();
      if (await control.count() > 0) {
        await control.click();
        await page.waitForTimeout(400);
        const opt = page.locator(`.select__option:has-text("${labelText.substring(0, 40)}")`).first();
        if (await opt.count() > 0) await opt.click();
      }
    }
  } catch { /* dropdown interaction failed, skip */ }
}

/**
 * Fill EEOC / demographic fields that aren't in API questions.
 * These are optional — select "Decline to self-identify" when available.
 */
async function fillEEOCFields(page) {
  const eeocFields = ['gender', 'hispanic_ethnicity', 'veteran_status', 'disability_status'];
  for (const fieldId of eeocFields) {
    try {
      const combobox = page.locator(`#${fieldId}[role="combobox"]`).first();
      if (await combobox.count() === 0) continue;
      await combobox.click();
      await page.waitForTimeout(300);
      // Prefer "Decline" option
      const decline = page.locator('.select__option:has-text("Decline")').first();
      if (await decline.count() > 0) {
        await decline.click();
      } else {
        // Close dropdown if no decline option
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(200);
    } catch { /* skip */ }
  }
}

function buildAnswerMap(cand, loc, autoApply) {
  return {
    // Standard info
    linkedin: cand.linkedin || '',
    github: cand.github || '',
    gitlab: cand.github || '',
    portfolio: cand.portfolio_url || '',
    website: cand.portfolio_url || '',
    phone: cand.phone || '',
    location: cand.location || '',
    preferred: (cand.full_name || '').split(/\s+/)[0] || '',

    // Employer
    current_company: 'Zomato Limited',
    current_title: 'Software Development Engineer II',
    employer: 'Zomato Limited',
    school: 'Indian Institute of Information Technology, Nagpur',
    degree: 'BTech in Computer Science & Engineering',

    // Country
    country: loc.country || 'India',

    // Visa / sponsorship
    visa: 'No',
    sponsorship: 'No',
    authorized: 'Yes',

    // Experience
    experience_years: '4',
    over_5_years: 'No',
    go_experience: 'Yes',
    kubernetes_experience: 'Yes',
    hands_on: 'Yes',

    // Misc
    previously_worked: 'No',
    sanctioned_country: 'No',
    opt_in: 'Yes',
    work_remotely: 'Yes',

    // Source
    hear_about: autoApply.referral_source || 'Company career page',
    salary: autoApply.salary_expectation || 'Competitive, based on role and location',
    start_date: autoApply.start_date || '30 days notice period',

    // AI tools
    ai_tools: 'GitHub Copilot for daily coding, ChatGPT for research, custom AI pipelines for job search.',
  };
}

function findAnswer(question, answers) {
  const label = (question.label || '').toLowerCase();
  const id = (question.id || '').toLowerCase();
  const isSelect = question.type?.includes('select');
  const values = question.values || [];

  // --- Pattern matching (label → answer key → value) ---
  const patterns = [
    // Standard
    [/linkedin/i, answers.linkedin],
    [/github/i, answers.github],
    [/gitlab/i, answers.gitlab],
    [/portfolio|website/i, answers.portfolio],
    [/preferred.*name|name.*prefer/i, answers.preferred],

    // Employer / Education
    [/current firm|current company|current.*employer|previous employer|who is your/i, answers.current_company],
    [/current.*title|previous.*job title|job title/i, answers.current_title],
    [/most recent school|school.*attended|university/i, answers.school],
    [/most recent degree|degree.*obtained/i, answers.degree],

    // Country / Location
    [/country.*reside|current country|country of residence|country where you/i, () => selectValue(values, 'India')],
    [/anticipate working in|work.*country/i, () => selectValue(values, 'India')],
    [/currently live in|open to candidates/i, () => selectValue(values, 'Yes')],

    // Visa / Sponsorship
    [/sponsor|work permit/i, () => selectValue(values, 'No')],
    [/authorized to work|legally authorized|right to work|eligible to work/i, () => selectValue(values, 'Yes')],
    [/visa/i, () => selectValue(values, 'No')],

    // Employment agreements / restrictions
    [/employment agreement|post-employment|non-compete|restrictive covenant/i, () => selectValue(values, 'No')],

    // Employment history
    [/previously worked|ever been employed|have you previously|do you currently work for|currently.*previously/i, () => selectValue(values, 'No')],
    [/procurement.*contract/i, () => selectValue(values, 'No')],

    // Sanctioned countries
    [/belarus.*cuba|sanctions|sanctioned/i, () => selectValue(values, 'No')],
    [/citizenship one of/i, () => selectValue(values, 'No')],
    [/permanent residency.*one of/i, () => selectValue(values, 'No')],

    // Acknowledge / Privacy
    [/acknowledge|privacy policy|confidential information/i, () => selectValue(values, 'I acknowledge') || selectFirst(values)],

    // Remote work
    [/plan to work remotely|work remotely/i, () => selectValue(values, 'Yes')],
    [/plan to work from.*different/i, () => selectValue(values, 'No')],

    // Experience
    [/over 5 years/i, () => selectValue(values, 'No')],
    [/commercial experience.*go|experience.*golang/i, () => selectValue(values, 'Yes')],
    [/commercial experience.*kubernetes/i, () => selectValue(values, 'Yes')],
    [/hands-on.*experience|production experience/i, () => selectValue(values, 'Yes')],
    [/operated.*kubernetes|cluster.*level|kubernetes.*cluster/i, () => selectValue(values, 'Yes')],
    [/built.*helm|maintained.*helm|helm.*chart/i, () => selectValue(values, 'Yes')],
    [/built.*terraform|terraform.*module/i, () => selectValue(values, 'No')],
    [/rate.*skill.*ruby/i, () => selectValue(values, 'Beginner') || selectValue(values, 'Intermediate') || selectFirst(values)],
    [/rate.*skill.*python/i, () => selectValue(values, 'Intermediate') || selectValue(values, 'Advanced') || selectFirst(values)],

    // Opt-in
    [/opt.in|whatsapp/i, () => selectValue(values, 'Yes')],

    // How did you hear
    [/how did you (hear|learn)|hear about|learn about this job/i, () => selectValue(values, 'career') || selectValue(values, 'Company') || selectValue(values, 'website') || selectFirst(values)],

    // AI tools
    [/ai tools|using.*ai/i, answers.ai_tools],

    // Start date / availability
    [/start date|available|notice period/i, answers.start_date],

    // Salary
    [/salary|compensation/i, answers.salary],

    // Catch-all for "if you selected/answered" follow-ups
    [/if you (answered|selected).*above/i, () => selectValue(values, 'None') || selectValue(values, 'N/A') || selectFirst(values)],
    [/select all that apply/i, () => selectValue(values, 'None') || selectValue(values, 'N/A') || selectFirst(values)],
  ];

  for (const [regex, resolver] of patterns) {
    if (regex.test(label)) {
      if (typeof resolver === 'function') {
        const val = resolver();
        if (val !== null && val !== undefined) return val;
      } else if (resolver) {
        if (isSelect) {
          const v = selectValue(values, resolver);
          if (v !== null) return v;
        }
        return resolver;
      }
    }
  }

  return null;
}

function selectValue(values, target) {
  if (!values?.length || !target) return null;
  const t = target.toLowerCase();
  // Exact match
  const exact = values.find(v => v.label?.toLowerCase() === t);
  if (exact) return exact.value;
  // Partial match
  const partial = values.find(v => v.label?.toLowerCase().includes(t));
  if (partial) return partial.value;
  return null;
}

function selectFirst(values) {
  return values?.[0]?.value ?? null;
}
