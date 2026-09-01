/**
 * JSAIOS - Server Bootloader
 * Boots HoneyKernel Core, registers micro-services, and starts JSAIOSServerAdapter.
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
  console.log(' JSAIOS Server Bootloader - HTTP REST Server Mode');
  console.log('=====================================================');

  const kernel = new HoneyKernel();
  let port = 3000;
  let host = 'localhost';

  try {
    const configPath = path.join(process.cwd(), 'config', 'jsaios.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.server?.port) port = config.server.port;
      if (config.server?.host) host = config.server.host;
    }
  } catch {
    // Fallback defaults
  }

  // Register AI Micro-services
  kernel.registerService(new OllamaService());
  kernel.registerService(new ComfyUIService());
  kernel.registerService(new CopilotService());

  await kernel.boot();

  const serverAdapter = new JSAIOSServerAdapter(kernel, port, host);
  await serverAdapter.start();

  return { kernel, serverAdapter };
}

// Auto-run if invoked directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('serverBootloader.ts')) {
  bootServer().catch((err) => {
    console.error('Fatal Server Bootloader Error:', err);
    process.exit(1);
  });
}
