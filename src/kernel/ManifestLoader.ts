/**
 * JSAIOS - Single-purpose helper: loadManifest
 * Reads and validates declarative JSON system manifests.
 */

import fs from 'fs';
import path from 'path';
import type { JSAIOSManifest } from './types';

export function loadManifest(manifestPath?: string): JSAIOSManifest {
  const targetPath = manifestPath || path.resolve(process.cwd(), 'jsaios.config.json');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`[ManifestLoader] Manifest file not found at path: '${targetPath}'`);
  }

  const rawJson = fs.readFileSync(targetPath, 'utf-8');
  const manifest = JSON.parse(rawJson) as JSAIOSManifest;

  if (!manifest.system || !Array.isArray(manifest.services)) {
    throw new Error(`[ManifestLoader] Invalid JSAIOS manifest structure in '${targetPath}'`);
  }

  return manifest;
}
