/**
 * JSAIOS - Single-purpose function: generateOllamaText
 * Supports generation options (think, temperature, top_p, top_k, num_predict, system directive, abort signal).
 */

import type { TextGenerationRequest, TextGenerationResponse } from '../AIService';

export async function generateOllamaText(
  baseUrl: string,
  request: TextGenerationRequest,
  onChunk?: (chunkText: string) => void,
  signal?: AbortSignal
): Promise<TextGenerationResponse> {
  const optionsObj: Record<string, any> = {};
  if (request.temperature !== undefined) optionsObj.temperature = request.temperature;
  if (request.topP !== undefined) optionsObj.top_p = request.topP;
  if (request.topK !== undefined) optionsObj.top_k = request.topK;
  if (request.maxTokens !== undefined) optionsObj.num_predict = request.maxTokens;

  const payload: Record<string, any> = {
    model: request.model,
    prompt: request.prompt,
    system: request.systemDirective,
    stream: Boolean(request.stream || onChunk),
    options: Object.keys(optionsObj).length > 0 ? optionsObj : undefined
  };

  if (request.think !== undefined) {
    payload.think = request.think;
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ollama generate failed with status ${response.status}`);
  }

  if (payload.stream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n').filter(l => l.trim() !== '');

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullText += parsed.response;
            if (onChunk) onChunk(parsed.response);
          }
        } catch {
          // Ignore non-JSON lines
        }
      }
    }

    return { text: fullText, done: true };
  } else {
    const data = await response.json();
    return { text: data.response || '', done: true };
  }
}
