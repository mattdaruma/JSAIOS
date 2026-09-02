/**
 * JSAIOS - Server Bootloader
 * Boots HoneyKernel Core, registers micro-services, and starts data-driven JSAIOSServerAdapter.
 */

import path from 'path';
import fs from 'fs';
import { HoneyKernel } from '../kernel/HoneyKernel';
import { OllamaService } from '../services/ai/ollama/OllamaService';
import { ComfyUIService } from '../services/ai/comfyui/ComfyUIService';
import { CopilotService } from '../services/ai/copilot/CopilotService';
import { JSAIOSServerAdapter } from '../shell/server/JSAIOSServerAdapter';

export async function bootServer(): Promise<{ kernel: HoneyKernel; serverAdapter: JSAIOSServerAdapter }> {
  console.log('=====================================================');
  console.log(' JSAIOS Server Bootloader - Data-Driven REST Server');
  console.log('=====================================================');

  const kernel = new HoneyKernel();
  let port = 3000;
  let host = '127.0.0.1';
  let serverManifestFile = path.join(process.cwd(), 'config', 'jsaios.server.json');

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
