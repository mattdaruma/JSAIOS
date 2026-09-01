/**
 * JSAIOS - Kernel Daemon Class: JSAIOSDaemon
 * Orchestrates background HoneyKernel Core, registers micro-services, and manages HTTP/WebSocket IPC gateway.
 * Feature-flagged via config/jsaios.config.json.
 */

import path from 'path';
import { HoneyKernel } from '../HoneyKernel';
import { loadManifest } from '../ManifestLoader';
import { loadSecrets } from '../loadSecrets';
import { createServiceFromConfig } from '../../services/ai/ServiceFactory';
import { getOrCreateChatEngine } from '../../engines/chat/helpers/createChatEngine';
import { JSAIOSServerAdapter } from '../../shell/server/JSAIOSServerAdapter';

export class JSAIOSDaemon {
  private kernel: HoneyKernel;
  private serverAdapter?: JSAIOSServerAdapter;

  constructor() {
    this.kernel = new HoneyKernel();
  }

  public async boot(manifestPath?: string): Promise<void> {
    loadSecrets();
    const manifest = loadManifest(manifestPath);

    console.log(`[JSAIOSDaemon] Starting OS Kernel Daemon (${manifest.system.name} v${manifest.system.version})...`);

    // Register active AI micro-services
    for (const serviceCfg of manifest.services) {
      if (serviceCfg.enabled !== false) {
        const serviceInstance = createServiceFromConfig(serviceCfg);
        if (serviceInstance) {
          this.kernel.registerService(serviceInstance);
        }
      }
    }

    // Boot HoneyKernel in daemon process
    await this.kernel.boot();

    // Initialize Chat Engine
    getOrCreateChatEngine(this.kernel);

    // Check Daemon Feature Flag Configuration
    const daemonCfg = manifest.daemon;
    if (daemonCfg && daemonCfg.enabled) {
      const port = daemonCfg.port || 3001;
      const host = daemonCfg.host || '127.0.0.1';
      const routesFile = path.join(process.cwd(), 'config', 'jsaios.routes.json');

      console.log(`[JSAIOSDaemon] Feature Flag ACTIVE: Starting HTTP/WebSocket IPC Server on ${host}:${port}...`);
      this.serverAdapter = new JSAIOSServerAdapter(this.kernel, port, host, routesFile);
      await this.serverAdapter.start();
    } else {
      console.log('[JSAIOSDaemon] Feature Flag INACTIVE: Daemon HTTP IPC server disabled in configuration.');
    }
  }

  public getKernel(): HoneyKernel {
    return this.kernel;
  }

  public async shutdown(): Promise<void> {
    if (this.serverAdapter) {
      await this.serverAdapter.stop();
    }
    await this.kernel.shutdown();
  }
}
