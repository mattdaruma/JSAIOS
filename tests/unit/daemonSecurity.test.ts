import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSAIOSDaemon } from '../../src/kernel/daemon/JSAIOSDaemon';
import { DaemonClientAdapter } from '../../src/adapters/daemon/DaemonClientAdapter';

describe('JSAIOS Daemon Security & Multi-Transport Gateway', () => {
  let daemon: JSAIOSDaemon;

  afterEach(async () => {
    if (daemon) {
      await daemon.shutdown();
    }
  });

  it('should reject unauthenticated HTTP requests when requireAuth is enabled', async () => {
    daemon = new JSAIOSDaemon();
    await daemon.boot();

    // 1. Request WITHOUT Authorization header -> expect 401
    const resUnauthorized = await fetch('http://127.0.0.1:3001/api/daemon/status');
    expect(resUnauthorized.status).toBe(401);

    // 2. Request WITH valid Bearer Token -> expect 200 OK
    const resAuthorized = await fetch('http://127.0.0.1:3001/api/daemon/status', {
      headers: { Authorization: 'Bearer jsaios-daemon-secret-token' }
    });
    expect(resAuthorized.status).toBe(200);
    const body = await resAuthorized.json();
    expect(body.status).toBe('running');
  });

  it('should support direct in-process embedded execution mode', async () => {
    daemon = new JSAIOSDaemon();
    await daemon.boot();

    const client = new DaemonClientAdapter({
      mode: 'direct',
      daemonInstance: daemon
    });

    const status = await client.getStatus();
    expect(status.status).toBe('running');
    expect(status.kernelStatus).toBeDefined();
  });
});
