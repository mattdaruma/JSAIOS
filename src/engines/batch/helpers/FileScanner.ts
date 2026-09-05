/**
 * JSAIOS - Single-purpose helper: FileScanner
 * Scans directories recursively for target files matching pattern regex and extension filters.
 */

import fs from 'fs';
import path from 'path';

export function scanCandidateFiles(
  targetDir: string,
  patternFilter?: string,
  fileExtensions?: string[]
): string[] {
  if (!fs.existsSync(targetDir)) return [];

  const candidateFiles: string[] = [];
  const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
  const extSet = fileExtensions && fileExtensions.length > 0
    ? new Set(fileExtensions.map(e => e.toLowerCase().replace(/^\./, '')))
    : null;

  function traverse(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
        if (extSet && !extSet.has(ext)) continue;

        if (regex) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (!regex.test(content) && !regex.test(entry.name)) continue;
          } catch {
            continue;
          }
        }

        candidateFiles.push(fullPath);
      }
    }
  }

  traverse(targetDir);
  return candidateFiles;
}
