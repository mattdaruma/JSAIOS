/**
 * JSAIOS - Single-purpose helper: loadSecrets
 * Reads gitignored config/secrets.json and populates process.env on HoneyKernel boot.
 */

import fs from 'fs';
import path from 'path';

export function loadSecrets(rootDir: string = process.cwd()): Record<string, string> {
  const secretsPath = path.join(rootDir, 'config', 'secrets.json');
  if (!fs.existsSync(secretsPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(secretsPath, 'utf-8');
    const secrets = JSON.parse(raw);

    if (typeof secrets === 'object' && secrets !== null) {
      for (const [key, value] of Object.entries(secrets)) {
        if (typeof value === 'string' && value.trim()) {
          process.env[key] = value.trim();
        }
      }
      if (process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
        process.env.GH_TOKEN = process.env.GITHUB_TOKEN;
      } else if (process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
        process.env.GITHUB_TOKEN = process.env.GH_TOKEN;
      }
      return secrets;
    }
  } catch (err: any) {
    console.warn(`[SecretsLoader] Failed to parse config/secrets.json: ${err.message || err}`);
  }

  return {};
}
