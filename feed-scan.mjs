#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { parseFeedItems, filterFeedItems } from './lib/feed-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const write = args.includes('--write');
const json = args.includes('--json');
const configArg = args.find(arg => arg.startsWith('--config='));
const configPath = configArg ? configArg.slice('--config='.length) : (
  existsSync(join(__dirname, 'feeds.yml')) ? join(__dirname, 'feeds.yml') : join(__dirname, 'templates/feeds.example.yml')
);

function knownUrls() {
  const files = [join(__dirname, 'data/pipeline.md'), join(__dirname, 'data/applications.md')];
  const seen = new Set();
  for (const file of files) {
    if (!existsSync(file)) continue;
    const matches = readFileSync(file, 'utf-8').match(/https?:\/\/[^\s|)]+/g) || [];
    for (const match of matches) seen.add(match);
  }
  return seen;
}

const config = YAML.parse(readFileSync(configPath, 'utf-8'));
const feeds = config.feeds || [];
const seen = knownUrls();
const matches = [];

for (const feed of feeds.filter(feed => feed.enabled !== false)) {
  try {
    const response = await fetch(feed.url);
    if (!response.ok) {
      console.error(`Failed: ${feed.name} (${response.status})`);
      continue;
    }

    const items = parseFeedItems(await response.text()).map(item => ({
      ...item,
      company: item.company || feed.name,
      source: feed.name,
    }));
    const filtered = filterFeedItems(items, feed);
    for (const item of filtered) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      matches.push(item);
    }
  } catch (err) {
    console.error(`Failed: ${feed.name} (${err.message})`);
    continue;
  }
}

if (json) {
  console.log(JSON.stringify(matches, null, 2));
} else {
  for (const item of matches) {
    console.log(`${item.source}: ${item.title} | ${item.url}`);
  }
}

if (write && matches.length > 0) {
  const dataDir = join(__dirname, 'data');
  mkdirSync(dataDir, { recursive: true });
  const pipeline = join(dataDir, 'pipeline.md');
  if (!existsSync(pipeline)) {
    writeFileSync(pipeline, '# Pipeline\n\n## Pending\n\n## Processed\n');
  }
  const rows = matches.map(item => `- [ ] ${item.url} | ${item.company || item.source} | ${item.title}`).join('\n');
  const content = readFileSync(pipeline, 'utf-8');
  const processedIdx = content.search(/^## Processed\b/m);
  const insertion = `${rows}\n\n`;
  if (processedIdx >= 0) {
    const before = content.slice(0, processedIdx).replace(/\s*$/, '\n\n');
    const after = content.slice(processedIdx);
    writeFileSync(pipeline, before + insertion + after);
  } else {
    writeFileSync(pipeline, `${content.replace(/\s*$/, '\n\n')}${insertion}`);
  }
}
