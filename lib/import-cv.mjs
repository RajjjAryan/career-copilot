import { copyFile, mkdir, readFile, rename, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { tmpdir } from 'os';

export function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

export function normalizePdfUrl(url) {
  const value = String(url);
  const driveMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  if (/dropbox\.com/i.test(value)) return value.replace(/[?&]dl=0\b/, '?dl=1');
  return value;
}

export async function downloadPdf(url) {
  const normalized = normalizePdfUrl(url);
  const response = await fetch(normalized);
  if (!response.ok) throw new Error(`Failed to download PDF: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/pdf|octet-stream/i.test(contentType)) {
    throw new Error(`URL did not return a PDF response (${contentType})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const out = join(tmpdir(), `career-copilot-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  await writeFile(out, buffer);
  return out;
}

export async function extractPdfText(pdfPath) {
  const data = await readFile(pdfPath);
  const mod = await import('pdf-parse');

  if (typeof mod.default === 'function') {
    const result = await mod.default(data);
    return result.text || '';
  }

  if (mod.PDFParse) {
    const parser = new mod.PDFParse({ data });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy?.();
    }
  }

  throw new Error('Unsupported pdf-parse API');
}

export function textToMarkdown(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return '# CV\n\n';

  const [first, ...rest] = lines;
  const body = rest.map(line => {
    if (/^(experience|work experience|skills|education|projects|certifications|publications)$/i.test(line)) {
      return `\n## ${line}\n`;
    }
    if (/^[*-]\s+/.test(line)) return line;
    return line;
  }).join('\n\n');

  return `# ${first}\n\n${body}\n`;
}

export async function writeCvMarkdown(markdown, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  let backupPath = null;
  if (existsSync(outputPath)) {
    backupPath = `${outputPath}.bak.${Date.now()}`;
    await copyFile(outputPath, backupPath);
  }

  const tmpPath = `${outputPath}.tmp.${process.pid}`;
  await writeFile(tmpPath, markdown);
  await rename(tmpPath, outputPath);
  return { outputPath, backupPath };
}

export async function importCv(source, options = {}) {
  if (!source) throw new Error('PDF path or URL is required');

  const outputPath = options.output || join(process.cwd(), 'cv.md');
  const pdfPath = isUrl(source) ? await downloadPdf(source) : source;

  if (extname(pdfPath).toLowerCase() !== '.pdf') {
    throw new Error(`Expected a PDF file, got: ${basename(pdfPath)}`);
  }

  const text = await extractPdfText(pdfPath);
  const markdown = textToMarkdown(text);
  return writeCvMarkdown(markdown, outputPath);
}
