/**
 * JSAIOS - Adapter: DaemonClientAdapter
 * Unified client adapter supporting all 3 interfacing transport modes (Authenticated HTTP REST, Named Pipes, Direct Embedding).
 */

import net from 'net';
import type { JSAIOSDaemon } from '../../kernel/daemon/JSAIOSDaemon';

export interface DaemonClientOptions {
  mode?: 'http' | 'pipe' | 'named-pipe' | 'direct';
  endpoint?: string;
  authToken?: string;
  pipeName?: string;
  daemonInstance?: JSAIOSDaemon;
}

export class DaemonClientAdapter {
  private mode: 'http' | 'pipe' | 'direct';
  private endpoint: string;
  private authToken: string;
  private pipeName: string;
  private daemonInstance?: JSAIOSDaemon;

  constructor(options: DaemonClientOptions = {}) {
    const rawMode = options.mode || 'http';
    this.mode = rawMode === 'named-pipe' ? 'pipe' : rawMode;
    this.endpoint = options.endpoint || 'http://127.0.0.1:3001';
    this.authToken = options.authToken || 'jsaios-daemon-secret-token';
    this.pipeName = options.pipeName || (process.platform === 'win32' ? '\\\\.\\pipe\\jsaiosd' : '/tmp/jsaiosd.sock');
    this.daemonInstance = options.daemonInstance;
  }

  public async getStatus(): Promise<any> {
    if (this.mode === 'direct') {
      if (!this.daemonInstance) throw new Error('Direct mode requires daemonInstance option.');
      return this.daemonInstance.executeDirectAction('status');
    }

    if (this.mode === 'pipe') {
      return new Promise((resolve, reject) => {
        const client = net.createConnection(this.pipeName, () => {
          client.write(JSON.stringify({ action: 'status' }));
        });

        client.on('data', (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            client.end();
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });

        client.on('error', (err) => reject(err));
      });
    }

    // Default: HTTP REST mode
    const url = `${this.endpoint}/api/daemon/status`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Daemon request failed with status ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  }
}
