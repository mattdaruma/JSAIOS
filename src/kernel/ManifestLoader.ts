/**
 * JSAIOS - Single-purpose helper: ManifestLoader
 * Reads and validates declarative JSON system manifests from config/ directory.
 */

import fs from 'fs';
import path from 'path';
import type { JSAIOSManifest } from './types';

export function loadManifest(customPath?: string): JSAIOSManifest {
  const defaultPath = path.resolve(process.cwd(), 'config', 'jsaios.config.json');
  const fallbackPath = path.resolve(process.cwd(), 'jsaios.config.json');
  const targetPath = customPath || (fs.existsSync(defaultPath) ? defaultPath : fallbackPath);

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

export function loadJsonConfig<T = any>(filename: string): T | null {
  try {
    const targetPath = path.resolve(process.cwd(), 'config', filename);
    if (fs.existsSync(targetPath)) {
      return JSON.parse(fs.readFileSync(targetPath, 'utf-8')) as T;
    }
  } catch {
    // Return null if unreadable
  }
  return null;
}
