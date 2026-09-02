/**
 * JSAIOS - OS Process Host: JSAIOSDaemon (jsaiosd)
 * Feature-flagged background OS process host managing HoneyKernel, micro-services, and HTTP/WebSocket IPC.
 */

import http from 'http';
import { HoneyKernel } from '../HoneyKernel';
import { ManifestLoader } from '../helpers/ManifestLoader';
import type { DaemonConfig } from '../types';

export class JSAIOSDaemon {
  private kernel: HoneyKernel;
  private server: http.Server | null = null;
  private daemonConfig: DaemonConfig;

  constructor(customManifestPath?: string) {
    const manifest = ManifestLoader.loadManifest(customManifestPath);
    this.daemonConfig = manifest.daemon || {
      enabled: true,
      port: 3001,
      host: '127.0.0.1',
      ipcGateway: true
    };
    this.kernel = new HoneyKernel(customManifestPath);
  }

  public async boot(): Promise<void> {
    if (!this.daemonConfig.enabled) {
      console.log('[JSAIOSDaemon] Daemon feature flag disabled in manifest. Skipping daemon startup.');
      return;
    }

    await this.kernel.boot();

    if (this.daemonConfig.ipcGateway) {
      await this.startIPCServer();
    }
  }

  private startIPCServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        // Open CORS for local OS daemon IPC
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === '/api/daemon/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'running', kernelStatus: this.kernel.getStatus() }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Daemon route not found' }));
      });

      this.server.listen(this.daemonConfig.port, this.daemonConfig.host, () => {
        console.log(`[JSAIOSDaemon] OS Daemon (jsaiosd) IPC Gateway active on http://${this.daemonConfig.host}:${this.daemonConfig.port}`);
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
    await this.kernel.shutdown();
    console.log('[JSAIOSDaemon] Daemon host shut down cleanly.');
  }
}
