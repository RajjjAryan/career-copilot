import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LABELS_PATH = join(__dirname, '..', 'templates', 'cv-i18n.yml');

let cache;

export function loadCvLabels() {
  if (!cache) cache = YAML.parse(readFileSync(LABELS_PATH, 'utf-8'));
  return cache;
}

export function getCvLabels(locale = 'en') {
  const labels = loadCvLabels();
  return { ...labels.en, ...(labels[locale] || {}) };
}
