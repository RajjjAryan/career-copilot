#!/usr/bin/env node

// Career-Copilot CLI Setup
// Detects which AI coding tool instruction files are present and shows status.

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOOLS = [
  { name: 'Canonical',          file: 'INSTRUCTIONS.md',                  required: true },
  { name: 'GitHub Copilot CLI', file: '.github/copilot-instructions.md',  required: false },
  { name: 'Claude Code',        file: 'CLAUDE.md',                        required: false },
  { name: 'Cursor',             file: '.cursorrules',                      required: false },
  { name: 'Windsurf',           file: '.windsurfrules',                    required: false },
  { name: 'Gemini CLI',         file: 'GEMINI.md',                        required: false },
  { name: 'Codex / Agents',     file: 'AGENTS.md',                        required: false },
];

const PREREQS = [
  { name: 'cv.md',              file: 'cv.md' },
  { name: 'config/profile.yml', file: 'config/profile.yml' },
  { name: 'portals.yml',        file: 'portals.yml' },
  { name: 'node_modules/',      file: 'node_modules' },
];

console.log('\n\x1b[1m📋 Career-Copilot — Setup Status\x1b[0m\n');

// Check instruction files
console.log('\x1b[36mInstruction files:\x1b[0m');
let allPresent = true;
for (const tool of TOOLS) {
  const exists = existsSync(join(__dirname, tool.file));
  const icon = exists ? '\x1b[32m✅\x1b[0m' : (tool.required ? '\x1b[31m❌\x1b[0m' : '\x1b[33m⬚\x1b[0m');
  console.log(`  ${icon}  ${tool.name.padEnd(20)} ${tool.file}`);
  if (tool.required && !exists) allPresent = false;
}

// Check prerequisites
console.log('\n\x1b[36mPrerequisites:\x1b[0m');
for (const prereq of PREREQS) {
  const exists = existsSync(join(__dirname, prereq.file));
  const icon = exists ? '\x1b[32m✅\x1b[0m' : '\x1b[33m⬚\x1b[0m';
  console.log(`  ${icon}  ${prereq.name}`);
}

// Summary
console.log('');
if (!allPresent) {
  console.log('\x1b[31m❌ INSTRUCTIONS.md is missing! This is the canonical instruction file.\x1b[0m');
  console.log('   Run the project setup or check the repository.\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ All entry-point files reference INSTRUCTIONS.md.\x1b[0m');
  console.log('   Your AI coding tool will read the instructions automatically.\n');
}

console.log('\x1b[36mSupported tools:\x1b[0m Copilot CLI, Claude Code, Cursor, Windsurf, Gemini CLI');
console.log('\x1b[36mSetup guide:\x1b[0m    docs/SETUP.md\n');
