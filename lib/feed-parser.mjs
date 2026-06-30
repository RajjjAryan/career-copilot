import { XMLParser } from 'fast-xml-parser';

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'object') return value['#text'] || value['@_href'] || '';
  return String(value);
}

export function parseFeedItems(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);

  const rssItems = asArray(parsed?.rss?.channel?.item);
  const atomItems = asArray(parsed?.feed?.entry);
  const items = rssItems.length > 0 ? rssItems : atomItems;

  return items.map(item => ({
    title: text(item.title).trim(),
    url: text(item.link?.['@_href'] ? item.link : item.link).trim(),
    publishedAt: text(item.pubDate || item.published || item.updated).trim(),
  })).filter(item => item.title && item.url);
}

export function filterFeedItems(items, filter = {}) {
  const positives = (filter.positive || filter.filter || []).map(s => String(s).toLowerCase());
  const negatives = (filter.negative || []).map(s => String(s).toLowerCase());

  return items.filter(item => {
    const title = item.title.toLowerCase();
    if (positives.length > 0 && !positives.some(keyword => title.includes(keyword))) return false;
    if (negatives.some(keyword => title.includes(keyword))) return false;
    return true;
  });
}
