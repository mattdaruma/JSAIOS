/**
 * JSAIOS - System Terminal CLI Bootloader
 * Parses dynamic --config <path> CLI arguments or loads default JSON manifest and boots HoneyKernel.
 */

import { HoneyKernel, kernel } from '../kernel/HoneyKernel';
import { loadManifest } from '../kernel/ManifestLoader';
import { loadSecrets } from '../kernel/loadSecrets';
import { createServiceFromConfig } from '../services/ai/ServiceFactory';
import { startCLITerminal } from '../shell/terminal/cliTerminal';

export function parseConfigPathFromArgv(): string | undefined {
  const configIndex = process.argv.indexOf('--config');
  if (configIndex !== -1 && process.argv[configIndex + 1]) {
    return process.argv[configIndex + 1];
  }
  return undefined;
}

export async function bootCLISystem(customManifestPath?: string): Promise<HoneyKernel> {
  const manifestPath = customManifestPath || parseConfigPathFromArgv();
  loadSecrets();

  const manifest = loadManifest(manifestPath);
  console.log(`[Bootloader] Booting ${manifest.system?.name || 'JSAIOS'} from manifest '${manifestPath || 'config/jsaios.daemon.json'}'...`);

  if (manifest.services) {
    for (const serviceCfg of manifest.services) {
      const serviceInstance = createServiceFromConfig(serviceCfg);
      if (serviceInstance) {
        kernel.registerService(serviceInstance);
      }
    }
  }

  await kernel.boot();

  const shellCfg = Array.isArray(manifest.shells)
    ? (manifest.shells.find((s) => s.type === 'cli' && s.enabled !== false) || manifest.shells[0])
    : (manifest as any).shell;

  startCLITerminal(kernel, shellCfg?.prompt, manifestPath);

  return kernel;
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cliBootloader.ts')) {
  bootCLISystem().catch((err) => {
    console.error('[Fatal JSAIOS Boot Failure]:', err);
    process.exit(1);
  });
}
