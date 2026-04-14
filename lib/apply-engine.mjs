// lib/apply-engine.mjs — Auto-apply orchestrator
//
// Detects platform from URL, calls the appropriate adapter, returns
// a structured result: { status: 'applied'|'manual'|'failed', ... }

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { detectPlatform } from './platform-detect.mjs';
import { submitApplication as submitGreenhouse } from './adapters/greenhouse.mjs';
import { submitApplication as submitLever } from './adapters/lever.mjs';

const recentSubmissions = [];
const MAX_PER_HOUR = 5;

function checkRateLimit() {
  const cutoff = Date.now() - 3600000;
  const recent = recentSubmissions.filter(t => t > cutoff);
  recentSubmissions.length = 0;
  recentSubmissions.push(...recent);
  return recent.length < MAX_PER_HOUR;
}

function recordSubmission() {
  recentSubmissions.push(Date.now());
}

/**
 * Simple YAML parser for profile.yml — extracts candidate.* and auto_apply.* fields.
 */
function loadProfile(profilePath) {
  const content = readFileSync(profilePath, 'utf-8');
  const profile = { candidate: {}, auto_apply: {} };
  let currentSection = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      const secMatch = trimmed.match(/^(\w[\w_]*)\s*:/);
      if (secMatch) currentSection = secMatch[1];
      continue;
    }

    if (indent > 0 && currentSection) {
      const kvMatch = trimmed.match(/^(\w[\w_]*)\s*:\s*"?([^"]*)"?\s*$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const val = kvMatch[2].trim();
        if (currentSection === 'candidate') profile.candidate[key] = val;
        else if (currentSection === 'auto_apply') profile.auto_apply[key] = val;
      }
    }
  }

  return profile;
}

/**
 * Auto-apply to a job posting.
 *
 * @param {object} params
 * @param {string} params.jobUrl - URL of the job posting
 * @param {string} [params.pdfPath] - Path to tailored resume PDF
 * @param {string} [params.profilePath] - Path to config/profile.yml
 * @param {string} [params.coverLetter] - Cover letter text
 * @param {boolean} [params.dryRun=false] - Preview without submitting
 * @returns {{ status: 'applied'|'manual'|'failed'|'rate-limited'|'dry-run', platform, message, ... }}
 */
export async function autoApply({ jobUrl, pdfPath, profilePath, coverLetter, dryRun = false }) {
  const platform = detectPlatform(jobUrl);

  if (!platform.autoApply) {
    return {
      status: 'manual',
      platform: platform.name,
      applyUrl: platform.applyUrl || jobUrl,
      message: platform.manualReason,
    };
  }

  if (!dryRun && !checkRateLimit()) {
    return {
      status: 'rate-limited',
      platform: platform.name,
      message: `Rate limit: max ${MAX_PER_HOUR} auto-applications per hour. Try again later.`,
    };
  }

  const profile = loadProfile(profilePath || resolve('config/profile.yml'));

  if (profile.auto_apply.enabled === 'false') {
    return {
      status: 'manual',
      platform: platform.name,
      applyUrl: jobUrl,
      message: 'Auto-apply disabled in profile.yml (auto_apply.enabled: false)',
    };
  }

  const cand = profile.candidate;
  if (!cand.full_name || !cand.email) {
    return {
      status: 'failed',
      platform: platform.name,
      message: 'Missing required profile fields: full_name and email in config/profile.yml',
    };
  }

  if (dryRun) {
    return {
      status: 'dry-run',
      platform: platform.name,
      message: `Would auto-apply to ${platform.name} (${jobUrl}) with resume ${pdfPath || 'none'}`,
    };
  }

  try {
    let result;

    if (platform.name === 'greenhouse') {
      result = await submitGreenhouse({
        boardToken: platform.boardToken,
        jobId: platform.jobId,
        profile,
        pdfPath,
        coverLetter,
      });
    } else if (platform.name === 'lever') {
      result = await submitLever({
        company: platform.company,
        postingId: platform.postingId,
        profile,
        pdfPath,
        coverLetter,
      });
    } else {
      return {
        status: 'manual',
        platform: platform.name,
        applyUrl: jobUrl,
        message: `No adapter for ${platform.name} — apply manually`,
      };
    }

    if (result.success) {
      recordSubmission();
      return {
        status: 'applied',
        platform: platform.name,
        message: result.message,
        job: result.job,
      };
    }

    return {
      status: result.unanswered?.length > 0 ? 'manual' : 'failed',
      platform: platform.name,
      applyUrl: jobUrl,
      message: result.message,
      unanswered: result.unanswered || [],
      job: result.job,
    };
  } catch (err) {
    return {
      status: 'failed',
      platform: platform.name,
      message: `Auto-apply error: ${err.message}`,
    };
  }
}

export { detectPlatform, loadProfile };
