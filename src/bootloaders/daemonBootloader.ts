/**
 * JSAIOS - Kernel Daemon Bootloader
 * Entry point for running JSAIOSDaemon as a background OS process.
 */

import { JSAIOSDaemon } from '../kernel/daemon/JSAIOSDaemon';

export function parseConfigPathFromArgv(): string | undefined {
  const configIndex = process.argv.indexOf('--config');
  if (configIndex !== -1 && process.argv[configIndex + 1]) {
    return process.argv[configIndex + 1];
  }
  return undefined;
}

export async function bootDaemon(customManifestPath?: string): Promise<JSAIOSDaemon> {
  console.log('=====================================================');
  console.log(' JSAIOS OS Micro-Kernel Daemon (jsaiosd)');
  console.log('=====================================================');

  const manifestPath = customManifestPath || parseConfigPathFromArgv();
  const daemon = new JSAIOSDaemon(manifestPath);
  await daemon.boot();

  const handleExit = async (signalName: string) => {
    console.log(`\n[jsaiosd] Intercepted signal '${signalName}'. Shutting down daemon...`);
    await daemon.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT (CTRL+C)'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));

  return daemon;
}

// Auto-run if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('daemonBootloader.ts')) {
  bootDaemon().catch((err) => {
    console.error('Fatal Daemon Boot Failure:', err);
    process.exit(1);
  });
}
