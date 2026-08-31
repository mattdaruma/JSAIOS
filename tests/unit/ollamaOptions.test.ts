import { describe, it, expect } from 'vitest';
import { generateOllamaText } from '../../src/services/ai/ollama/helpers/generateText';

describe('Ollama Text Generation Options', () => {
  it('should format payload with all native Ollama model options and parameters', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ response: 'mocked response', done: true }), { status: 200 });
    }) as any;

    try {
      const res = await generateOllamaText('http://localhost:11434', {
        model: 'llama3',
        prompt: 'hello world',
        think: false,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        minP: 0.05,
        seed: 42,
        numCtx: 8192,
        repeatPenalty: 1.1,
        systemDirective: 'You are an AI assistant.',
        maxTokens: 500,
        stop: ['\nUser:'],
        format: 'json',
        raw: true,
        keepAlive: '10m',
        stream: false
      });

      expect(res.text).toBe('mocked response');
      expect(capturedUrl).toBe('http://localhost:11434/api/generate');

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.model).toBe('llama3');
      expect(body.prompt).toBe('hello world');
      expect(body.think).toBe(false);
      expect(body.system).toBe('You are an AI assistant.');
      expect(body.format).toBe('json');
      expect(body.raw).toBe(true);
      expect(body.keep_alive).toBe('10m');
      expect(body.options).toEqual({
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        seed: 42,
        num_ctx: 8192,
        repeat_penalty: 1.1,
        num_predict: 500,
        stop: ['\nUser:']
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
