#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const templatePath = join(root, 'templates', 'instructions.template.md');

const template = readFileSync(templatePath, 'utf8');

const toolTable = `| Concept | GitHub Copilot CLI | Claude Code | Gemini CLI | Cursor | Windsurf |\n|---|---|---|---|---|---|\n| sub_agent | \`task\` | \`Task\` | Provider task/agent primitive | Agent/composer task | Cascade task/workflow |\n| web_fetch | \`web_fetch\` | \`WebFetch\` | HTTP fetch tool | Fetch/integrated browser fetch | Fetch tool |\n| web_search | \`web_search\` | \`WebSearch\` | Search tool | Web search | Web search |\n| file_read | \`view\` | \`Read\` | File read tool | File read | File read |\n| file_write | \`create\` | \`Write\` | File write tool | File create/write | File write |\n| file_edit | \`edit\` | \`Edit\` | File edit tool | File edit | File edit |\n| shell | \`bash\` | \`Bash\` | Shell tool | Terminal command | Terminal command |\n| browser_navigate/snapshot/click | \`browser_*\` (Playwright MCP) | Browser MCP tools | Browser/automation tools | Built-in browser/automation | Built-in browser/automation |`;

const providers = [
  {
    key: 'copilot',
    name: 'GitHub Copilot CLI',
    outputPath: '.github/copilot-instructions.md',
    notes: '- Native mode: use Copilot tool names directly.',
  },
  {
    key: 'claude',
    name: 'Claude Code',
    outputPath: 'CLAUDE.md',
    notes: '- Translate semantic operations to Claude tool names (`Task`, `WebFetch`, `Read`, `Write`, `Edit`, `Bash`).',
  },
  {
    key: 'gemini',
    name: 'Gemini CLI',
    outputPath: 'GEMINI.md',
    notes: '- Use Gemini-equivalent tools for each semantic concept from section 13.',
  },
  {
    key: 'cursor',
    name: 'Cursor',
    outputPath: '.cursor/rules/career-copilot.mdc',
    notes: '- Use Cursor rules/composer capabilities to map semantic tool concepts.',
  },
  {
    key: 'windsurf',
    name: 'Windsurf',
    outputPath: '.windsurfrules',
    notes: '- Use Cascade-equivalent capabilities following semantic tool concepts.',
  },
];

for (const provider of providers) {
  let content = template
    .replaceAll('{{CLI_NAME}}', provider.name)
    .replaceAll('{{TOOL_MAPPING_TABLE}}', toolTable)
    .replaceAll('{{PROVIDER_NOTES}}', provider.notes);

  const outPath = join(root, provider.outputPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, 'utf8');
  console.log(`generated ${provider.outputPath}`);
}
