// lib/adapters/greenhouse.mjs — Greenhouse Job Board API adapter
//
// Greenhouse provides a public Job Board API supporting application
// submission WITHOUT authentication for standard job board flows.
// Docs: https://developers.greenhouse.io/job-board.html

import { readFileSync } from 'fs';

const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

/**
 * Fetch job details + required questions from Greenhouse.
 */
export async function fetchJobDetails(boardToken, jobId) {
  const url = `${API_BASE}/${boardToken}/jobs/${jobId}?questions=true`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Greenhouse API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    title: data.title,
    location: data.location?.name || '',
    content: data.content || '',
    questions: (data.questions || []).map(q => ({
      id: q.fields?.[0]?.name || `question_${q.id || 'unknown'}`,
      label: q.label || q.description || '',
      required: q.required || false,
      type: q.fields?.[0]?.type || 'input_text',
      values: q.fields?.[0]?.values || [],
    })),
  };
}

/**
 * Build auto-answerable question map from profile.
 */
function buildAutoAnswers(profile, autoApplyConfig = {}) {
  const answers = new Map();
  const cand = profile.candidate || {};

  answers.set('linkedin', cand.linkedin || '');
  answers.set('github', cand.github || '');
  answers.set('portfolio', cand.portfolio_url || '');
  answers.set('website', cand.portfolio_url || '');
  answers.set('phone', cand.phone || '');
  answers.set('location', cand.location || '');
  answers.set('city', cand.location || '');
  answers.set('visa', autoApplyConfig.visa_status || '');
  answers.set('authorized', autoApplyConfig.visa_status || '');
  answers.set('sponsorship', autoApplyConfig.visa_status || '');
  answers.set('start', autoApplyConfig.start_date || '');
  answers.set('available', autoApplyConfig.start_date || '');
  answers.set('hear', autoApplyConfig.referral_source || 'Company career page');
  answers.set('source', autoApplyConfig.referral_source || 'Company career page');
  answers.set('referral', autoApplyConfig.referral_source || 'Company career page');
  answers.set('salary', autoApplyConfig.salary_expectation || '');
  answers.set('compensation', autoApplyConfig.salary_expectation || '');

  return answers;
}

function matchAnswer(label, autoAnswers) {
  const lower = label.toLowerCase();
  for (const [pattern, answer] of autoAnswers) {
    if (answer && lower.includes(pattern)) return answer;
  }
  return null;
}

/**
 * Submit application to Greenhouse.
 * @returns {{ success, message, unanswered[], job }}
 */
export async function submitApplication({ boardToken, jobId, profile, pdfPath, coverLetter }) {
  const cand = profile.candidate || {};
  const autoApplyConfig = profile.auto_apply || {};
  const nameParts = (cand.full_name || '').split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const job = await fetchJobDetails(boardToken, jobId);

  const form = new FormData();
  form.set('id', jobId);
  form.set('first_name', firstName);
  form.set('last_name', lastName);
  form.set('email', cand.email || '');
  if (cand.phone) form.set('phone', cand.phone);

  if (pdfPath) {
    const pdfBuffer = readFileSync(pdfPath);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    form.set('resume', pdfBlob, pdfPath.split('/').pop());
  }

  if (coverLetter) {
    form.set('cover_letter', coverLetter);
  }

  const autoAnswers = buildAutoAnswers(profile, autoApplyConfig);
  const unanswered = [];

  for (const q of job.questions) {
    const answer = matchAnswer(q.label, autoAnswers);
    if (answer) {
      form.set(q.id, answer);
    } else if (q.required) {
      unanswered.push({ id: q.id, label: q.label, type: q.type });
    }
  }

  if (unanswered.length > 0) {
    return {
      success: false,
      message: `Cannot auto-apply: ${unanswered.length} required question(s) need manual answers`,
      unanswered,
      job,
    };
  }

  const url = `${API_BASE}/${boardToken}/jobs/${jobId}`;
  const res = await fetch(url, { method: 'POST', body: form });

  if (res.ok || res.status === 201) {
    return {
      success: true,
      message: `Application submitted to ${job.title} at ${boardToken}`,
      job,
      unanswered: [],
    };
  }

  const errorBody = await res.text().catch(() => '');
  return {
    success: false,
    message: `Greenhouse API returned ${res.status}: ${errorBody.substring(0, 200)}`,
    unanswered: [],
    job,
  };
}
