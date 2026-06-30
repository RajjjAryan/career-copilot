# Launch Guide

Use this checklist when publishing or sharing Career-Copilot. Keep claims tied to workflows that ship in this repository.

## Assets

- README demo preview: `docs/assets/demo-preview.svg`
- Social card source: `docs/assets/social-preview.svg`
- Terminal recording: `docs/demo.cast`

GitHub repository social previews must be uploaded in repository settings. Use `docs/assets/social-preview.svg` as the source, or export it to PNG first if the UI requires a bitmap.

## Repository Checklist

- Enable the repository as a GitHub template so users can create a private copy before adding personal files.
- Keep issues enabled and label beginner-friendly tasks with `good first issue` or `up-for-grabs`.
- Keep Discussions enabled for setup questions and workflow ideas that are not bugs.
- Pin the README demo, setup guide, data contract, and contribution guide in any release announcement.

## Launch Channels

- **GitHub**: publish a release with the demo preview, installation path, and links to open beginner issues.
- **Hacker News**: lead with the candidate-side AI angle and the fact that the workflow runs locally with user-owned files.
- **Reddit**: share in career, job search, resume, and open-source communities with a transparent demo and no automation-spam framing.
- **LinkedIn**: show the visual demo and explain the evaluation-first workflow for candidates who want fewer, better applications.

## Suggested Copy

Career-Copilot is an open-source job search pipeline for AI coding agents. Paste a job URL, evaluate fit against your actual CV, generate an ATS-ready PDF, and track the application without turning your search into spray-and-pray automation.

## Safety Notes

- Tell users to use a private fork or template-generated private repository before adding `cv.md`, `config/profile.yml`, or tracker data.
- Do not market this as a bot that mass-submits applications.
- Keep the data-contract boundary visible in setup docs and launch posts.
