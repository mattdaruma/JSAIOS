/**
 * JSAIOS - Single-purpose helper: connectComfyWebSocket
 * Establishes a persistent WebSocket connection to ComfyUI event stream (/ws?clientId=...).
 * Emits real-time notifications for task execution events (start, progress, completion, error).
 */

export interface ComfyWebSocketController {
  clientId: string;
  close: () => void;
}

export function connectComfyWebSocket(
  baseUrl: string,
  onEvent?: (eventType: string, data: any) => void,
  onLog?: (formattedMessage: string) => void
): ComfyWebSocketController | null {
  try {
    const clientId = `jsaios_${Math.random().toString(36).substring(2, 9)}`;
    const wsUrl = `${baseUrl.replace(/^http/i, 'ws')}/ws?clientId=${clientId}`;
    const WebSocketImpl = (globalThis as any).WebSocket;

    if (!WebSocketImpl) return null;

    const ws = new WebSocketImpl(wsUrl);

    const emitLog = (msg: string) => {
      if (onLog) onLog(msg);
      else console.log(msg);
    };

    ws.onopen = () => {
      emitLog(`[ComfyUIService] Event stream active on ${wsUrl}`);
    };

    ws.onmessage = (event: any) => {
      try {
        const rawData = typeof event.data === 'string' ? event.data : event.data?.toString();
        if (!rawData) return;

        const msg = JSON.parse(rawData);
        const { type, data } = msg;

        if (type === 'execution_start') {
          emitLog(`[ComfyUI] 🚀 Execution started for Task ID: ${data?.prompt_id}`);
        } else if (type === 'progress' && data?.value !== undefined && data?.max !== undefined) {
          const percent = Math.round((data.value / data.max) * 100);
          emitLog(`[ComfyUI] ⏳ Progress: ${percent}% (${data.value}/${data.max} steps)`);
        } else if (type === 'execution_success') {
          emitLog(`[ComfyUI] ✅ Task completed successfully! Task ID: ${data?.prompt_id}`);
        } else if (type === 'execution_error') {
          emitLog(`[ComfyUI] ❌ Execution error in Task ID: ${data?.prompt_id}: ${data?.exception_message || 'Unknown error'}`);
        }

        if (onEvent) onEvent(type, data);
      } catch {
        // Ignore unparseable frames
      }
    };

    ws.onerr = () => {};
    ws.onclose = () => {};

    return {
      clientId,
      close: () => {
        try { ws.close(); } catch {}
      }
    };
  } catch {
    return null;
  }
}
