// lib/adapters/lever.mjs — Lever form POST adapter
//
// Lever job pages have a standard form at /company/posting-id/apply.
// Accepts: name, email, phone, org, urls, resume, comments.
// Some portals add reCAPTCHA — we detect and bail to manual if so.

import { readFileSync } from 'fs';

const LEVER_BASE = 'https://jobs.lever.co';

/**
 * Fetch job page and check for reCAPTCHA/login requirements.
 */
export async function checkJobPage(company, postingId) {
  const pageUrl = `${LEVER_BASE}/${company}/${postingId}`;
  const res = await fetch(pageUrl);
  if (!res.ok) {
    throw new Error(`Lever page returned ${res.status}`);
  }
  const html = await res.text();

  const titleMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Position';

  const hasRecaptcha = html.includes('recaptcha') || html.includes('g-recaptcha');
  const requiresLogin = html.includes('Sign in to apply') || html.includes('login-required');

  return {
    title,
    hasRecaptcha,
    requiresLogin,
    applyUrl: `${pageUrl}/apply`,
  };
}

/**
 * Submit application to Lever.
 * @returns {{ success, message, job }}
 */
export async function submitApplication({ company, postingId, profile, pdfPath, coverLetter }) {
  const cand = profile.candidate || {};

  const jobPage = await checkJobPage(company, postingId);

  if (jobPage.hasRecaptcha) {
    return {
      success: false,
      message: `Lever portal has reCAPTCHA — apply manually at ${jobPage.applyUrl}`,
      job: { title: jobPage.title },
    };
  }

  if (jobPage.requiresLogin) {
    return {
      success: false,
      message: `Lever portal requires login — apply manually at ${jobPage.applyUrl}`,
      job: { title: jobPage.title },
    };
  }

  const form = new FormData();
  form.set('name', cand.full_name || '');
  form.set('email', cand.email || '');
  if (cand.phone) form.set('phone', cand.phone);
  if (cand.linkedin) form.set('urls[LinkedIn]', cand.linkedin.startsWith('http') ? cand.linkedin : `https://${cand.linkedin}`);
  if (cand.github) form.set('urls[GitHub]', cand.github.startsWith('http') ? cand.github : `https://${cand.github}`);
  if (cand.portfolio_url) form.set('urls[Portfolio]', cand.portfolio_url);
  if (coverLetter) form.set('comments', coverLetter);

  if (pdfPath) {
    const pdfBuffer = readFileSync(pdfPath);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    form.set('resume', pdfBlob, pdfPath.split('/').pop());
  }

  const applyUrl = `${LEVER_BASE}/${company}/${postingId}/apply`;
  const res = await fetch(applyUrl, {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });

  // Lever redirects to thank-you page on success
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (location.includes('thanks') || location.includes('thank') || location.includes('success')) {
      return {
        success: true,
        message: `Application submitted to ${jobPage.title} at ${company} (Lever)`,
        job: { title: jobPage.title },
      };
    }
  }

  if (res.ok) {
    return {
      success: true,
      message: `Application submitted to ${jobPage.title} at ${company} (Lever)`,
      job: { title: jobPage.title },
    };
  }

  return {
    success: false,
    message: `Lever returned ${res.status} — apply manually at ${applyUrl}`,
    job: { title: jobPage.title },
  };
}
