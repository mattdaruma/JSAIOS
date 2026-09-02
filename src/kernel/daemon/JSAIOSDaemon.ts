/**
 * JSAIOS - OS Process Host: JSAIOSDaemon (jsaiosd)
 * Feature-flagged background OS process host managing HoneyKernel, micro-services, and HTTP/WebSocket IPC.
 */

import http from 'http';
import { HoneyKernel } from '../HoneyKernel';
import { ManifestLoader } from '../ManifestLoader';
import type { DaemonConfig } from '../types';
import { DaemonLogger } from './helpers/DaemonLogger';

export class JSAIOSDaemon {
  private kernel: HoneyKernel;
  private server: http.Server | null = null;
  private daemonConfig: DaemonConfig & { logging?: any };
  private logger: DaemonLogger;

  constructor(customManifestPath?: string) {
    const manifest = ManifestLoader.loadManifest(customManifestPath);
    this.daemonConfig = manifest.daemon || {
      enabled: true,
      port: 3001,
      host: '127.0.0.1',
      ipcGateway: true,
      logging: { level: 'info', logToConsole: true }
    };
    this.logger = new DaemonLogger(this.daemonConfig.logging);
    this.kernel = new HoneyKernel(customManifestPath);
  }

  public async boot(): Promise<void> {
    if (!this.daemonConfig.enabled) {
      this.logger.warn('Daemon feature flag disabled in manifest. Skipping daemon startup.');
      return;
    }

    this.logger.info('Booting JSAIOS HoneyKernel Core inside OS Daemon container...');
    await this.kernel.boot();

    if (this.daemonConfig.ipcGateway) {
      await this.startIPCServer();
    }
  }

  private startIPCServer(): Promise<void> {
    return new Promise((resolve) => {
      const corsConfig = (this.daemonConfig as any).cors || {
        allowOrigin: '*',
        allowMethods: 'GET, POST, OPTIONS',
        allowHeaders: 'Content-Type, Authorization'
      };

      this.server = http.createServer((req, res) => {
        // Open CORS for local OS daemon IPC
        res.setHeader('Access-Control-Allow-Origin', corsConfig.allowOrigin || '*');
        res.setHeader('Access-Control-Allow-Methods', corsConfig.allowMethods || 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', corsConfig.allowHeaders || 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === '/api/daemon/status') {
          this.logger.debug('Received IPC GET /api/daemon/status request');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'running', kernelStatus: this.kernel.getStatus() }));
          return;
        }

        this.logger.warn(`Unrecognized IPC route request: ${req.method} ${req.url}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Daemon route not found' }));
      });

      this.server.listen(this.daemonConfig.port, this.daemonConfig.host, () => {
        this.logger.info(`OS Daemon (jsaiosd) IPC Gateway active on http://${this.daemonConfig.host}:${this.daemonConfig.port}`);
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down OS Daemon (jsaiosd)...');
    if (this.server) {
      this.server.close();
    }
    await this.kernel.shutdown();
    this.logger.info('Daemon host shut down cleanly.');
  }

  public getLogger(): DaemonLogger {
    return this.logger;
  }
}
