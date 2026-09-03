/**
 * JSAIOS - OS Process Host: JSAIOSDaemon (jsaiosd)
 * Feature-flagged background OS process host managing HoneyKernel, micro-services,
 * and 3 Interfacing Gateway Modes (HTTP REST with Bearer Auth, Local Named Pipes, Direct Embedding).
 */

import http from 'http';
import net from 'net';
import fs from 'fs';
import { HoneyKernel } from '../HoneyKernel';
import { ManifestLoader } from '../ManifestLoader';
import type { DaemonConfig } from '../types';
import { DaemonLogger } from './helpers/DaemonLogger';

export class JSAIOSDaemon {
  private kernel: HoneyKernel;
  private httpServer: http.Server | null = null;
  private netServer: net.Server | null = null;
  private daemonConfig: DaemonConfig & { logging?: any };
  private logger: DaemonLogger;

  constructor(customManifestPath?: string) {
    const manifest = ManifestLoader.loadManifest(customManifestPath);
    this.daemonConfig = manifest.daemon || {
      enabled: true,
      port: 3001,
      host: '127.0.0.1',
      mode: 'http',
      pipeName: '\\\\.\\pipe\\jsaiosd',
      security: { requireAuth: true, authToken: 'jsaios-daemon-secret-token' },
      ipcGateway: true,
      logging: { level: 'info', logToConsole: true }
    };
    this.logger = new DaemonLogger(this.daemonConfig.logging);
    this.kernel = new HoneyKernel(customManifestPath);
  }

  public getKernel(): HoneyKernel {
    return this.kernel;
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
    const mode = this.daemonConfig.mode || 'http';

    if (mode === 'pipe' || mode === 'named-pipe') {
      return this.startNamedPipeServer();
    }

    if (mode === 'direct') {
      this.logger.info('Daemon active in DIRECT IN-PROCESS EMBEDDED mode (zero external sockets).');
      return Promise.resolve();
    }

    return this.startHTTPServer();
  }

  private startHTTPServer(): Promise<void> {
    return new Promise((resolve) => {
      const corsConfig = (this.daemonConfig as any).cors || {
        allowOrigin: '*',
        allowMethods: 'GET, POST, OPTIONS',
        allowHeaders: 'Content-Type, Authorization'
      };

      this.httpServer = http.createServer((req, res) => {
        // Open CORS for local OS daemon IPC
        res.setHeader('Access-Control-Allow-Origin', corsConfig.allowOrigin || '*');
        res.setHeader('Access-Control-Allow-Methods', corsConfig.allowMethods || 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', corsConfig.allowHeaders || 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Enforce Bearer Token Authentication
        if (this.daemonConfig.security?.requireAuth) {
          const authHeader = req.headers['authorization'];
          const expected = `Bearer ${this.daemonConfig.security.authToken}`;
          if (!authHeader || authHeader.trim() !== expected) {
            this.logger.warn(`Unauthorized HTTP request rejected on ${req.url}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing Bearer token' }));
            return;
          }
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

      this.httpServer.listen(this.daemonConfig.port, this.daemonConfig.host, () => {
        this.logger.info(`OS Daemon (jsaiosd) HTTP Gateway active on http://${this.daemonConfig.host}:${this.daemonConfig.port} (Bearer Auth: ${this.daemonConfig.security?.requireAuth ? 'ENABLED' : 'DISABLED'})`);
        resolve();
      });
    });
  }

  private startNamedPipeServer(): Promise<void> {
    return new Promise((resolve) => {
      const pipePath = this.daemonConfig.pipeName || (process.platform === 'win32' ? '\\\\.\\pipe\\jsaiosd' : '/tmp/jsaiosd.sock');

      if (process.platform !== 'win32' && fs.existsSync(pipePath)) {
        try { fs.unlinkSync(pipePath); } catch {}
      }

      this.netServer = net.createServer((socket) => {
        this.logger.debug('Client connected to Named Pipe gateway.');

        socket.on('data', (data) => {
          try {
            const request = JSON.parse(data.toString());
            let response = { status: 'running', kernelStatus: this.kernel.getStatus() };
            if (request.action === 'execute') {
              response = { ...response, result: 'Command executed via pipe' } as any;
            }
            socket.write(JSON.stringify(response));
          } catch {
            socket.write(JSON.stringify({ error: 'Invalid pipe payload format' }));
          }
        });
      });

      this.netServer.listen(pipePath, () => {
        this.logger.info(`OS Daemon (jsaiosd) IPC Named Pipe active on '${pipePath}'`);
        resolve();
      });
    });
  }

  public executeDirectAction(action: string, payload?: any): any {
    if (action === 'status') {
      return { status: 'running', kernelStatus: this.kernel.getStatus() };
    }
    return { status: 'running', action, payload, kernelStatus: this.kernel.getStatus() };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down OS Daemon (jsaiosd)...');
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.netServer) {
      this.netServer.close();
    }
    await this.kernel.shutdown();
    this.logger.info('Daemon host shut down cleanly.');
  }

  public getLogger(): DaemonLogger {
    return this.logger;
  }
}
