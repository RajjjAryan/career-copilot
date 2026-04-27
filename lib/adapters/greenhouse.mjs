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

// Standard Greenhouse form fields — already set via form.set(), skip in question loop
const STANDARD_FIELDS = new Set([
  'first_name', 'last_name', 'email', 'phone', 'resume', 'cover_letter',
]);

/**
 * Build auto-answerable question map from profile.
 * Returns Map<keyword, { text: string, selectMatch?: string }>
 */
function buildAutoAnswers(profile, autoApplyConfig = {}) {
  const answers = new Map();
  const cand = profile.candidate || {};
  const loc = profile.location || {};

  // Text answers
  answers.set('linkedin', { text: cand.linkedin || '' });
  answers.set('github', { text: cand.github || '' });
  answers.set('gitlab', { text: cand.github || '' });
  answers.set('portfolio', { text: cand.portfolio_url || '' });
  answers.set('website', { text: cand.portfolio_url || '' });
  answers.set('phone', { text: cand.phone || '' });
  answers.set('location', { text: cand.location || '' });
  answers.set('city', { text: cand.location || '' });
  answers.set('preferred', { text: (cand.full_name || '').split(/\s+/)[0] || '' });
  answers.set('preferred name', { text: (cand.full_name || '').split(/\s+/)[0] || '' });
  answers.set('nickname', { text: (cand.full_name || '').split(/\s+/)[0] || '' });

  // Visa / sponsorship — text + select matching
  answers.set('visa', { text: autoApplyConfig.visa_status || 'No', selectMatch: 'no' });
  answers.set('authorized', { text: 'Yes', selectMatch: 'yes' });
  answers.set('sponsorship', { text: 'No', selectMatch: 'no' });
  answers.set('require sponsorship', { text: 'No', selectMatch: 'no' });
  answers.set('sponsor you', { text: 'No', selectMatch: 'no' });
  answers.set('sponsor', { text: 'No', selectMatch: 'no' });

  // Start date / availability
  answers.set('start', { text: autoApplyConfig.start_date || '30 days notice period' });
  answers.set('available', { text: autoApplyConfig.start_date || '30 days notice period' });
  answers.set('notice period', { text: autoApplyConfig.start_date || '30 days' });

  // Referral / source
  answers.set('hear about', { text: autoApplyConfig.referral_source || 'Company career page' });
  answers.set('how did you', { text: autoApplyConfig.referral_source || 'Company career page' });
  answers.set('source', { text: autoApplyConfig.referral_source || 'Company career page' });
  answers.set('referral', { text: autoApplyConfig.referral_source || 'Company career page' });

  // Salary
  answers.set('salary', { text: autoApplyConfig.salary_expectation || 'Competitive, based on role' });
  answers.set('compensation', { text: autoApplyConfig.salary_expectation || 'Competitive, based on role' });

  // Employment restrictions
  answers.set('employment agreement', { text: 'No', selectMatch: 'no' });
  answers.set('post-employment', { text: 'No', selectMatch: 'no' });
  answers.set('non-compete', { text: 'No', selectMatch: 'no' });
  answers.set('restrictive covenant', { text: 'No', selectMatch: 'no' });

  // Country of residence
  answers.set('country of residence', { text: loc.country || 'India', selectMatch: loc.country || 'india' });
  answers.set('current country', { text: loc.country || 'India', selectMatch: loc.country || 'india' });
  answers.set('where are you located', { text: loc.country || 'India', selectMatch: loc.country || 'india' });
  answers.set('country where you currently reside', { text: loc.country || 'India', selectMatch: loc.country || 'india' });
  answers.set('anticipate working in', { text: loc.country || 'India', selectMatch: loc.country || 'india' });
  answers.set('country', { text: loc.country || 'India', selectMatch: loc.country || 'india' });

  // Work authorization
  answers.set('legally authorized', { text: 'Yes', selectMatch: 'yes' });
  answers.set('work authorization', { text: 'Yes', selectMatch: 'yes' });
  answers.set('right to work', { text: 'Yes', selectMatch: 'yes' });
  answers.set('eligible to work', { text: 'Yes', selectMatch: 'yes' });

  // Years of experience
  answers.set('years of experience', { text: '4', selectMatch: '3-5' });
  answers.set('experience', { text: '4 years' });
  answers.set('over 5 years', { text: 'No', selectMatch: 'no' });
  answers.set('5 years of professional', { text: 'No', selectMatch: 'no' });

  // Current employer details (from profile narrative/proof_points)
  answers.set('current firm', { text: 'Zomato Limited' });
  answers.set('current company', { text: 'Zomato Limited' });
  answers.set('current employer', { text: 'Zomato Limited' });
  answers.set('previous employer', { text: 'Zomato Limited' });
  answers.set('current title', { text: 'Software Development Engineer II' });
  answers.set('current or previous job title', { text: 'Software Development Engineer II' });
  answers.set('previous job title', { text: 'Software Development Engineer II' });

  // Education
  answers.set('school', { text: 'Indian Institute of Information Technology, Nagpur' });
  answers.set('most recent school', { text: 'Indian Institute of Information Technology, Nagpur' });
  answers.set('university', { text: 'Indian Institute of Information Technology, Nagpur' });
  answers.set('degree', { text: 'BTech in Computer Science & Engineering' });
  answers.set('most recent degree', { text: 'BTech in Computer Science & Engineering' });

  // Previously worked at company X? → No
  answers.set('previously worked', { text: 'No', selectMatch: 'no' });
  answers.set('have you ever been employed', { text: 'No', selectMatch: 'no' });
  answers.set('have you previously worked', { text: 'No', selectMatch: 'no' });
  answers.set('do you currently work for', { text: 'No', selectMatch: 'no' });
  answers.set('currently or have you previously', { text: 'No', selectMatch: 'no' });
  answers.set('been involved in procurement', { text: 'No', selectMatch: 'no' });

  // Do you live in sanctioned country? → No
  answers.set('belarus, cuba', { text: 'No', selectMatch: 'no' });
  answers.set('sanctioned', { text: 'No', selectMatch: 'no' });
  answers.set('citizenship one of the following', { text: 'No', selectMatch: 'no' });
  answers.set('permanent residency in one of', { text: 'No', selectMatch: 'no' });

  // Acknowledge / confirm
  answers.set('i acknowledge', { text: 'I acknowledge', selectMatch: 'i acknowledge' });
  answers.set('acknowledge', { text: 'I acknowledge', selectMatch: 'i acknowledge' });
  answers.set('privacy policy', { text: 'I acknowledge', selectMatch: 'i acknowledge' });
  answers.set('confidential information', { text: 'I acknowledge', selectMatch: 'i acknowledge' });

  // Opt-in for comms
  answers.set('opt-in', { text: 'Yes', selectMatch: 'yes' });
  answers.set('whatsapp', { text: 'Yes', selectMatch: 'yes' });

  // Do you live in location? → Yes
  answers.set('do you currently live', { text: 'Yes', selectMatch: 'yes' });
  answers.set('this role is open to candidates', { text: 'Yes', selectMatch: 'yes' });

  // Remote work
  answers.set('plan to work from', { text: 'No', selectMatch: 'no' });
  answers.set('plan to work remotely', { text: 'Yes', selectMatch: 'yes' });
  answers.set('work remotely', { text: 'Yes', selectMatch: 'yes' });
  answers.set('intend to work', { text: 'Yes', selectMatch: 'yes' });

  // Commercial experience questions
  answers.set('commercial experience using go', { text: 'Yes', selectMatch: 'yes' });
  answers.set('commercial experience using kubernetes', { text: 'Yes', selectMatch: 'yes' });
  answers.set('hands-on experience', { text: 'Yes', selectMatch: 'yes' });
  answers.set('production experience', { text: 'Yes', selectMatch: 'yes' });

  // Skill ratings
  answers.set('rate your level of skill', { text: 'Intermediate', selectMatch: 'intermediate' });
  answers.set('level of skill programming', { text: 'Intermediate', selectMatch: 'intermediate' });

  // How did you hear / learn about
  answers.set('how did you learn', { text: 'Company career page', selectMatch: 'career' });
  answers.set('learn about this job', { text: 'Company career page', selectMatch: 'career' });
  answers.set('how did you hear', { text: 'Company career page', selectMatch: 'career' });
  answers.set('hear about', { text: 'Company career page', selectMatch: 'career' });

  // Conditional follow-ups ("if you answered yes/selected above")
  answers.set('if you answered', { text: 'N/A', selectMatch: 'none' });
  answers.set('if you selected', { text: 'N/A', selectMatch: 'none' });
  answers.set('select all that apply', { text: 'N/A', selectMatch: 'none' });

  // AI tools
  answers.set('ai tools', { text: 'GitHub Copilot for daily coding, ChatGPT for research and brainstorming, and custom AI pipelines for job search automation.' });

  return answers;
}

/**
 * Match a question label to an auto-answer.
 * For select-type questions, find the best matching option value.
 */
function matchAnswer(label, autoAnswers, question = null) {
  const lower = label.toLowerCase();
  for (const [pattern, answer] of autoAnswers) {
    if (!lower.includes(pattern)) continue;

    // For select questions, find the matching option
    if (question && question.type.includes('select') && question.values?.length > 0) {
      const target = (answer.selectMatch || answer.text || '').toLowerCase();
      if (!target) continue;

      // Exact label match first
      const exact = question.values.find(v => v.label.toLowerCase() === target);
      if (exact) return exact.value;

      // Partial match
      const partial = question.values.find(v => v.label.toLowerCase().includes(target));
      if (partial) return partial.value;

      // Try matching "No" / "Yes" for boolean-like selects
      if (['yes', 'no'].includes(target)) {
        const boolMatch = question.values.find(v => v.label.toLowerCase() === target);
        if (boolMatch) return boolMatch.value;
      }

      // For multi_value_multi_select: look for "none of the above" or "N/A"
      if (question.type === 'multi_value_multi_select') {
        const noneOpt = question.values.find(v => {
          const vl = v.label.toLowerCase();
          return vl.includes('none of the above') || vl.includes('n/a') ||
                 vl.includes('not applicable') || vl.includes('none');
        });
        if (noneOpt) return noneOpt.value;

        // For acknowledge/confirm multi-selects, pick the first/only option
        if (target.includes('acknowledge') || target.includes('confirm')) {
          return question.values[0]?.value;
        }
      }

      continue; // selectMatch didn't find an option
    }

    // Text answer
    if (answer.text) return answer.text;
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
    // Skip standard fields already handled above
    if (STANDARD_FIELDS.has(q.id)) continue;

    const answer = matchAnswer(q.label, autoAnswers, q);
    if (answer !== null && answer !== undefined) {
      form.set(q.id, String(answer));
    } else if (q.required) {
      unanswered.push({ id: q.id, label: q.label, type: q.type, values: q.values?.slice(0, 5) });
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
