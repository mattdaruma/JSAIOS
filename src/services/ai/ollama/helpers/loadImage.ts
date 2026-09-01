/**
 * JSAIOS - Single-purpose helper: loadLocalImageBase64
 * Reads local image file from disk (Node environment) or passes base64 string directly for multimodal models.
 */

import fs from 'fs';
import path from 'path';

export function loadLocalImageBase64(filePath: string): string {
  if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  if (typeof process === 'undefined' || !fs || typeof fs.existsSync !== 'function') {
    throw new Error('Local filesystem image loading is only available in server Node runtime.');
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Image file not found at path '${resolvedPath}'`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  return fileBuffer.toString('base64');
}
