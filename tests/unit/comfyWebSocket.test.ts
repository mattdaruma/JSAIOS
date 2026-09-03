import { describe, it, expect, vi } from 'vitest';
import { connectComfyWebSocket } from '../../src/services/ai/comfyui/helpers/connectComfyWebSocket';

describe('ComfyUI Live WebSocket Event Stream', () => {
  it('should initialize WebSocket controller cleanly with generated client ID', () => {
    // Mock globalThis.WebSocket
    class MockWebSocket {
      public onopen: any;
      public onmessage: any;
      public onerror: any;
      public onclose: any;
      constructor(public url: string) {}
      close() {}
    }

    vi.stubGlobal('WebSocket', MockWebSocket);

    const controller = connectComfyWebSocket('http://localhost:8188');

    expect(controller).not.toBeNull();
    expect(controller?.clientId).toMatch(/^jsaios_/);

    vi.unstubAllGlobals();
  });

  it('should invoke event callback when WebSocket receives ComfyUI execution frames', () => {
    let messageCallback: any;

    class MockWebSocket {
      public onopen: any;
      public onmessage: any;
      constructor(public url: string) {
        messageCallback = (dataStr: string) => {
          if (this.onmessage) this.onmessage({ data: dataStr });
        };
      }
      close() {}
    }

    vi.stubGlobal('WebSocket', MockWebSocket);

    const events: Array<{ type: string; data: any }> = [];
    const controller = connectComfyWebSocket('http://localhost:8188', (type, data) => {
      events.push({ type, data });
    });

    expect(controller).not.toBeNull();

    // Simulate ComfyUI execution_start frame
    messageCallback(JSON.stringify({
      type: 'execution_start',
      data: { prompt_id: 'task_101' }
    }));

    // Simulate ComfyUI progress frame
    messageCallback(JSON.stringify({
      type: 'progress',
      data: { value: 10, max: 20, prompt_id: 'task_101' }
    }));

    // Simulate ComfyUI execution_success frame
    messageCallback(JSON.stringify({
      type: 'execution_success',
      data: { prompt_id: 'task_101' }
    }));

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('execution_start');
    expect(events[1].data.value).toBe(10);
    expect(events[2].type).toBe('execution_success');

    vi.unstubAllGlobals();
  });
});
