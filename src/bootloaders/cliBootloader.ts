/**
 * JSAIOS - System Terminal CLI Bootloader
 * Reads declarative JSON manifest (`jsaios.config.json`) and boots HoneyKernel.
 */

import { HoneyKernel, kernel } from '../kernel/HoneyKernel';
import { loadManifest } from '../kernel/ManifestLoader';
import { loadSecrets } from '../kernel/loadSecrets';
import { createServiceFromConfig } from '../services/ai/ServiceFactory';
import { startCLITerminal } from '../shell/terminal/cliTerminal';

export async function bootCLISystem(manifestPath?: string): Promise<HoneyKernel> {
  // Load local secrets from gitignored config/secrets.json into process.env
  loadSecrets();

  // Load declarative JSON manifest
  const manifest = loadManifest(manifestPath);
  console.log(`[Bootloader] Booting ${manifest.system.name} v${manifest.system.version} from JSON manifest...`);

  // Dynamically instantiate services declared in JSON manifest
  for (const serviceCfg of manifest.services) {
    const serviceInstance = createServiceFromConfig(serviceCfg);
    if (serviceInstance) {
      kernel.registerService(serviceInstance);
    }
  }

  // Boot HoneyKernel
  await kernel.boot();

  // Launch terminal shell using prompt declared in JSON manifest
  const shellCfg = Array.isArray(manifest.shells)
    ? (manifest.shells.find((s) => s.type === 'cli' && s.enabled !== false) || manifest.shells[0])
    : (manifest as any).shell;

  startCLITerminal(kernel, shellCfg?.prompt);

  return kernel;
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cliBootloader.ts')) {
  bootCLISystem().catch((err) => {
    console.error('[Fatal JSAIOS Boot Failure]:', err);
    process.exit(1);
  });
}
