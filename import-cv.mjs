#!/usr/bin/env node

import { importCv } from './lib/import-cv.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node import-cv.mjs <resume.pdf-or-url> [--output=cv.md]

Converts a local or public PDF resume into markdown and writes cv.md.
Existing cv.md is backed up before overwrite.`);
  process.exit(0);
}

const args = process.argv.slice(2);
const source = args.find(arg => !arg.startsWith('--'));
const outputArg = args.find(arg => arg.startsWith('--output='));
const output = outputArg ? outputArg.slice('--output='.length) : 'cv.md';

try {
  const result = await importCv(source, { output });
  console.log(`Imported CV: ${result.outputPath}`);
  if (result.backupPath) console.log(`Backup: ${result.backupPath}`);
} catch (err) {
  console.error(`Failed to import CV: ${err.message}`);
  process.exit(1);
}
