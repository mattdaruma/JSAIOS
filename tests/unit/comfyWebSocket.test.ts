import { describe, it, expect, vi } from 'vitest';
import { connectComfyWebSocket } from '../../src/services/ai/comfyui/helpers/connectComfyWebSocket';
import { ComfyUIService } from '../../src/services/ai/comfyui/ComfyUIService';
import { printLogAbovePrompt, setActiveReadlineInterface } from '../../src/shell/terminal/helpers/printLogAbovePrompt';

describe('ComfyUI Live WebSocket Event Stream', () => {
  it('should initialize WebSocket controller cleanly with generated client ID', () => {
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

    messageCallback(JSON.stringify({
      type: 'execution_start',
      data: { prompt_id: 'task_101' }
    }));

    messageCallback(JSON.stringify({
      type: 'progress',
      data: { value: 10, max: 20, prompt_id: 'task_101' }
    }));

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

  it('should respect enableWebSocket feature flag when disabled in ComfyUIService config', async () => {
    let wsCreated = false;
    class MockWebSocket {
      constructor() { wsCreated = true; }
      close() {}
    }

    vi.stubGlobal('WebSocket', MockWebSocket);

    const service = new ComfyUIService({ baseUrl: 'http://localhost:8188', enableWebSocket: false });
    await service.initialize();

    expect(wsCreated).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should clear line and redraw prompt when printLogAbovePrompt is called', () => {
    let promptRedrawn = false;
    let lineErased = false;

    const mockRL: any = {
      output: {
        write: (str: string) => {
          if (str.includes('\x1b[2K')) lineErased = true;
        }
      },
      prompt: (preserve: boolean) => {
        if (preserve) promptRedrawn = true;
      }
    };

    setActiveReadlineInterface(mockRL);
    printLogAbovePrompt('[Test] Background log above prompt');

    expect(lineErased).toBe(true);
    expect(promptRedrawn).toBe(true);

    setActiveReadlineInterface(null);
  });
});
