import test from 'node:test';
import assert from 'node:assert/strict';

import { parseFeedItems, filterFeedItems } from '../lib/feed-parser.mjs';

test('parses RSS feed items into title and URL records', () => {
  const xml = `<?xml version="1.0"?>
<rss><channel>
  <item><title>Senior Backend Engineer</title><link>https://jobs.example.com/1</link><pubDate>Tue, 01 Jul 2026 00:00:00 GMT</pubDate></item>
</channel></rss>`;

  assert.deepEqual(parseFeedItems(xml), [
    {
      title: 'Senior Backend Engineer',
      url: 'https://jobs.example.com/1',
      publishedAt: 'Tue, 01 Jul 2026 00:00:00 GMT',
    },
  ]);
});

test('filters feed items by positive and negative keywords', () => {
  const items = [
    { title: 'Senior Backend Engineer', url: 'https://jobs.example.com/1' },
    { title: 'Frontend Intern', url: 'https://jobs.example.com/2' },
    { title: 'Java Backend Engineer', url: 'https://jobs.example.com/3' },
  ];

  assert.deepEqual(filterFeedItems(items, { positive: ['backend'], negative: ['java'] }), [
    { title: 'Senior Backend Engineer', url: 'https://jobs.example.com/1' },
  ]);
});
