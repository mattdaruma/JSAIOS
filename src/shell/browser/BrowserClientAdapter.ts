/**
 * JSAIOS - Driving Adapter: BrowserClientAdapter
 * Client API bridge connecting Browser UI component events to HTTP REST endpoints over chunked HTTP streaming.
 */

export class BrowserClientAdapter {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  public async fetchStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/status`);
    return await res.json();
  }

  public async fetchHistory(sessionId?: string): Promise<any> {
    const url = sessionId ? `${this.baseUrl}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}` : `${this.baseUrl}/api/chat/history`;
    const res = await fetch(url);
    return await res.json();
  }

  public async executeCommandStream(
    input: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });

    if (!res.body) {
      const text = await res.text();
      onChunk(text);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const chunkStr = decoder.decode(value, { stream: true });
        onChunk(chunkStr);
      }
    }
  }

  public async sendPromptStream(
    userPrompt: string,
    onChunk: (chunk: string) => void,
    sessionId?: string
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt, sessionId })
    });

    if (!res.body) {
      const text = await res.text();
      onChunk(text);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const chunkStr = decoder.decode(value, { stream: true });
        onChunk(chunkStr);
      }
    }
  }
}
