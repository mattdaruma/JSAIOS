/**
 * JSAIOS - Driving Adapter: JSAIOSServerAdapter
 * Pure Data-Driven HTTP REST API Server Adapter. Reads route target mappings and CORS rules from declarative JSON manifests.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { getOrCreateChatEngine } from '../../engines/chat/helpers/createChatEngine';
import { dispatchServerAction, type RouteTargetConfig } from './helpers/serverActionDispatcher';

export interface CorsConfig {
  enabled: boolean;
  allowOrigin: string;
  allowMethods: string;
  allowHeaders: string;
}

export class JSAIOSServerAdapter {
  private server: http.Server | null = null;
  private routes: RouteTargetConfig[] = [];
  private cors: CorsConfig = {
    enabled: true,
    allowOrigin: '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type, Authorization'
  };

  constructor(
    private kernel: HoneyKernel,
    private port: number = 3000,
    private host: string = '127.0.0.1',
    routesManifestPath?: string
  ) {
    this.loadConfiguration(routesManifestPath);
  }

  private loadConfiguration(customManifestPath?: string): void {
    try {
      const manifestPath = customManifestPath || path.join(process.cwd(), 'config', 'jsaios.routes.json');
      if (fs.existsSync(manifestPath)) {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (parsed.routes) this.routes = parsed.routes;
        if (parsed.cors) this.cors = { ...this.cors, ...parsed.cors };
      }
    } catch {
      // Fallback
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const engine = getOrCreateChatEngine(this.kernel);
      const targetMap: Record<string, any> = {
        kernel: this.kernel,
        chatEngine: engine
      };

      this.server = http.createServer(async (req, res) => {
        // Apply Declarative CORS Rules
        if (this.cors.enabled) {
          res.setHeader('Access-Control-Allow-Origin', this.cors.allowOrigin);
          res.setHeader('Access-Control-Allow-Methods', this.cors.allowMethods);
          res.setHeader('Access-Control-Allow-Headers', this.cors.allowHeaders);
        }

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlParts = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = urlParts.pathname;
        const method = (req.method || 'GET').toUpperCase();

        // Declarative Route Dispatcher
        const matchedRoute = this.routes.find(
          (r) => r.path === pathname && r.method.toUpperCase() === method
        );

        if (matchedRoute) {
          await dispatchServerAction(matchedRoute, req, res, urlParts, targetMap);
          return;
        }

        // Static Web UI File Serving Fallback
        const distDir = path.join(process.cwd(), 'dist', 'browser');
        let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
          };
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Route '${method} ${pathname}' not found in server manifest` }));
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use by another process. Please terminate the process on port ${this.port} or update 'server.port' in config/jsaios.config.json.`));
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[JSAIOSServerAdapter] Data-Driven Server listening on http://${this.host}:${this.port} (${this.routes.length} declarative routes registered)`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[JSAIOSServerAdapter] HTTP Server stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
