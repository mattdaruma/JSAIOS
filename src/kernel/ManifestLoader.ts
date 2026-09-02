/**
 * JSAIOS - Single-purpose helper: ManifestLoader
 * Centralized declarative JSON manifest configuration loader for HoneyKernel.
 */

import fs from 'fs';
import path from 'path';
import type { JSAIOSManifest } from './types';

export class ManifestLoader {
  public static loadManifest(customPath?: string): JSAIOSManifest {
    const targetPath = customPath || path.join(process.cwd(), 'config', 'default.daemon.json');
    return this.loadJsonConfig<JSAIOSManifest>(targetPath, {
      system: { name: 'JSAIOS', version: '1.0.0', environment: 'daemon' },
      daemon: { enabled: true, port: 3001, host: '127.0.0.1', ipcGateway: true },
      engines: [],
      services: [],
      shells: []
    });
  }

  public static loadJsonConfig<T>(targetPath: string, fallback: T): T {
    try {
      if (fs.existsSync(targetPath)) {
        const rawContent = fs.readFileSync(targetPath, 'utf-8');
        return JSON.parse(rawContent) as T;
      }
    } catch {
      // Fallback on read or parse error
    }
    return fallback;
  }
}
