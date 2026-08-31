/**
 * JSAIOS - Single-purpose helper: loadLocalImageBase64
 * Reads local image file from disk and encodes as base64 string for multimodal models.
 */

import fs from 'fs';
import path from 'path';

export function loadLocalImageBase64(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Image file not found at path '${resolvedPath}'`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  return fileBuffer.toString('base64');
}
