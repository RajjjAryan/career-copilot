import { existsSync } from 'fs';
import { join } from 'path';

export const REQUIRED_FONT_FILES = [
  'space-grotesk-latin.woff2',
  'space-grotesk-latin-ext.woff2',
  'dm-sans-latin.woff2',
  'dm-sans-latin-ext.woff2',
];

export function validateFontsDir(fontsDir) {
  if (!existsSync(fontsDir)) {
    return {
      ok: false,
      missing: REQUIRED_FONT_FILES,
      message: `Fonts directory not found: ${fontsDir}`,
    };
  }

  const missing = REQUIRED_FONT_FILES.filter(font => !existsSync(join(fontsDir, font)));
  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `Missing required font files: ${missing.join(', ')}`,
    };
  }

  return { ok: true, missing: [] };
}
