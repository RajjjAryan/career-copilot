export const PERSONAL_DATA_SCAN_EXTENSIONS = ['md', 'yml', 'yaml', 'html', 'mjs', 'js', 'sh', 'go', 'json'];

const SKIPPED_EXACT_PATHS = new Set([
  'config/profile.yml',
  'cv.md',
  'article-digest.md',
  'portals.yml',
  'feeds.yml',
  'modes/_profile.md',
  'package-lock.json',
]);

const SKIPPED_PREFIXES = [
  '.git/',
  '.venv/',
  'node_modules/',
  'data/',
  'reports/',
  'output/',
  'jds/',
  'interview-prep/',
];

const SKIPPED_EXTENSIONS = [
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function shouldScanForPersonalData(filePath) {
  const cleanPath = normalizePath(filePath);
  const extension = cleanPath.includes('.') ? cleanPath.split('.').pop().toLowerCase() : '';

  if (SKIPPED_EXACT_PATHS.has(cleanPath)) return false;
  if (SKIPPED_PREFIXES.some((prefix) => cleanPath.startsWith(prefix))) return false;
  if (SKIPPED_EXTENSIONS.some((suffix) => cleanPath.toLowerCase().endsWith(suffix))) return false;

  return PERSONAL_DATA_SCAN_EXTENSIONS.includes(extension);
}
