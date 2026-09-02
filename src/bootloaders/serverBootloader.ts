/**
 * JSAIOS - Server Bootloader
 * Parses dynamic --config <path> CLI arguments or loads default server manifest (jsaios.server.json).
 */

import path from 'path';
import fs from 'fs';
import { HoneyKernel } from '../kernel/HoneyKernel';
import { OllamaService } from '../services/ai/ollama/OllamaService';
import { ComfyUIService } from '../services/ai/comfyui/ComfyUIService';
import { CopilotService } from '../services/ai/copilot/CopilotService';
import { JSAIOSServerAdapter } from '../shell/server/JSAIOSServerAdapter';

export function parseConfigPathFromArgv(): string | undefined {
  const configIndex = process.argv.indexOf('--config');
  if (configIndex !== -1 && process.argv[configIndex + 1]) {
    return process.argv[configIndex + 1];
  }
  return undefined;
}

export async function bootServer(customManifestPath?: string): Promise<{ kernel: HoneyKernel; serverAdapter: JSAIOSServerAdapter }> {
  console.log('=====================================================');
  console.log(' JSAIOS Server Bootloader - Data-Driven REST Server');
  console.log('=====================================================');

  const kernel = new HoneyKernel();
  let port = 3000;
  let host = '127.0.0.1';
  const serverManifestFile = customManifestPath || parseConfigPathFromArgv() || path.join(process.cwd(), 'config', 'jsaios.server.json');

  try {
    if (fs.existsSync(serverManifestFile)) {
      const config = JSON.parse(fs.readFileSync(serverManifestFile, 'utf-8'));
      if (config.port) port = config.port;
      if (config.host) host = config.host;
    }
  } catch {
    // Fallback defaults
  }

  // Register AI Micro-services
  kernel.registerService(new OllamaService());
  kernel.registerService(new ComfyUIService());
  kernel.registerService(new CopilotService());

  await kernel.boot();

  const serverAdapter = new JSAIOSServerAdapter(kernel, port, host, serverManifestFile);
  try {
    await serverAdapter.start();
  } catch (err: any) {
    console.error('\n[Server Boot Failure]:', err.message || err);
    process.exit(1);
  }

  return { kernel, serverAdapter };
}

// Auto-run if invoked directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('serverBootloader.ts')) {
  bootServer().catch((err) => {
    console.error('Fatal Server Bootloader Error:', err);
    process.exit(1);
  });
}
