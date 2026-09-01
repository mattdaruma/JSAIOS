/**
 * JSAIOS - Driving Adapter: JSAIOSServerAdapter
 * Pure Node.js HTTP REST API server adapter exposing kernel & chat engine ports.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { getOrCreateChatEngine } from '../terminal/commands/chatCLI';

export class JSAIOSServerAdapter {
  private server: http.Server | null = null;

  constructor(
    private kernel: HoneyKernel,
    private port: number = 3000,
    private host: string = 'localhost'
  ) {}

  public start(): Promise<void> {
    return new Promise((resolve) => {
      const engine = getOrCreateChatEngine(this.kernel);

      this.server = http.createServer(async (req, res) => {
        // Enable CORS for development flexibility
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlParts = new URL(req.url || '/', `http://${req.headers.host}`);
        const pathname = urlParts.pathname;

        // API Endpoint Routing
        if (pathname === '/api/status' && req.method === 'GET') {
          const active = engine.getActiveSession();
          const sessions = engine.listSessions();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            kernel: this.kernel.getStatus(),
            activeSession: active ? {
              id: active.id,
              name: active.name,
              providerId: active.providerId,
              model: active.model,
              messagesCount: active.messages.length,
              options: active.options
            } : null,
            totalSessions: sessions.length
          }));
          return;
        }

        if (pathname === '/api/services' && req.method === 'GET') {
          const services = this.kernel.Registry.listDescriptors();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ services }));
          return;
        }

        if (pathname === '/api/chat/sessions' && req.method === 'GET') {
          const sessions = engine.listSessions();
          const active = engine.getActiveSession();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            activeId: active?.id || null,
            sessions: sessions.map((s) => ({
              id: s.id,
              name: s.name,
              providerId: s.providerId,
              model: s.model,
              turnsCount: s.messages.length
            }))
          }));
          return;
        }

        if (pathname === '/api/chat/sessions' && req.method === 'POST') {
          const body = await this.readRequestBody(req);
          const { name, providerId, model, systemDirective, options } = JSON.parse(body || '{}');
          const session = engine.createSession(
            name || 'default',
            providerId || 'ollama',
            model || 'llama3',
            systemDirective,
            options
          );
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ session: { id: session.id, name: session.name, providerId: session.providerId, model: session.model } }));
          return;
        }

        if (pathname === '/api/chat/history' && req.method === 'GET') {
          const sessionId = urlParts.searchParams.get('sessionId');
          const allSessions = engine.listSessions();
          const session = sessionId ? allSessions.find((s) => s.id === sessionId) : engine.getActiveSession();
          if (!session) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            sessionId: session.id,
            name: session.name,
            messages: session.messages
          }));
          return;
        }

        if (pathname === '/api/chat/send' && req.method === 'POST') {
          const body = await this.readRequestBody(req);
          const { userPrompt, sessionId, options, images } = JSON.parse(body || '{}');

          const allSessions = engine.listSessions();
          let active = sessionId ? allSessions.find((s) => s.id === sessionId) : engine.getActiveSession();
          if (!active) active = engine.createSession('default', 'ollama', 'llama3');

          // Standard HTTP Response Body Chunked Streaming
          res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
          });

          try {
            await engine.executeTurn({
              sessionId: active.id,
              userPrompt,
              images,
              turnOptions: options,
              onChunk: (chunk: string) => {
                res.write(chunk);
              }
            });
            res.end();
          } catch (err: any) {
            res.write(`\n\nChat error: ${err.message || err}`);
            res.end();
          }
          return;
        }

        // Static Web UI File Serving
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
        res.end(JSON.stringify({ error: 'Endpoint or file not found' }));
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[JSAIOSServerAdapter] HTTP REST Server listening on http://${this.host}:${this.port}`);
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

  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => resolve(body));
      req.on('error', (err) => reject(err));
    });
  }
}
