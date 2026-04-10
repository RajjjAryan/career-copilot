#!/usr/bin/env node

const env = process.env;

function detectCli() {
  if (env.COPILOT_AGENT_MODE || env.GITHUB_COPILOT_API_KEY) return 'copilot';
  if (env.CLAUDE_PROJECT_DIR || env.CLAUDECODE) return 'claude';
  if (env.GEMINI_API_KEY || env.GOOGLE_GENAI_USE_VERTEXAI || env.GEMINI_CLI) return 'gemini';
  if (env.CURSOR_TRACE_ID || env.CURSOR_SESSION_ID) return 'cursor';
  if (env.WINDSURF || env.CODEIUM_WIND_SURF || env.CASCADE_SESSION_ID) return 'windsurf';
  return 'copilot';
}

const provider = detectCli();
const instructionPath = {
  copilot: '.github/copilot-instructions.md',
  claude: 'CLAUDE.md',
  gemini: 'GEMINI.md',
  cursor: '.cursor/rules/career-copilot.mdc',
  windsurf: '.windsurfrules',
}[provider];

console.log(JSON.stringify({ provider, instructionPath }, null, 2));
