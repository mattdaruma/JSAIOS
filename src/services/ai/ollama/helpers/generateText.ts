/**
 * JSAIOS - Single-purpose helper: generateOllamaText
 * Formats request payload and streams text generation & thinking reasoning blocks from Ollama HTTP API.
 */

import type { TextGenerationRequest, TextGenerationResponse } from '../../AIService';

export async function generateOllamaText(
  endpoint: string,
  request: TextGenerationRequest,
  onChunk?: (chunkText: string) => void
): Promise<TextGenerationResponse> {
  const optionsPayload: Record<string, any> = {};

  if (request.temperature !== undefined) optionsPayload.temperature = request.temperature;
  if (request.topP !== undefined) optionsPayload.top_p = request.topP;
  if (request.topK !== undefined) optionsPayload.top_k = request.topK;
  if (request.minP !== undefined) optionsPayload.min_p = request.minP;
  if (request.seed !== undefined) optionsPayload.seed = request.seed;
  if (request.numCtx !== undefined) optionsPayload.num_ctx = request.numCtx;
  if (request.repeatPenalty !== undefined) optionsPayload.repeat_penalty = request.repeatPenalty;
  if (request.maxTokens !== undefined) optionsPayload.num_predict = request.maxTokens;
  if (request.stop !== undefined) optionsPayload.stop = request.stop;

  const payload: Record<string, any> = {
    model: request.model,
    prompt: request.prompt,
    system: request.systemDirective,
    stream: true,
    think: request.think,
    images: request.images
  };

  if (request.format !== undefined) payload.format = request.format;
  if (request.raw !== undefined) payload.raw = request.raw;
  if (request.keepAlive !== undefined) payload.keep_alive = request.keepAlive;

  if (Object.keys(optionsPayload).length > 0) {
    payload.options = optionsPayload;
  }

  const res = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Ollama generation failed: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error('Ollama response body is empty.');
  }

  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let isInsideThinkingBlock = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // Process thinking stream field from Ollama API
        if (parsed.thinking) {
          if (!isInsideThinkingBlock) {
            isInsideThinkingBlock = true;
            const openTag = '<think>\n';
            fullText += openTag;
            if (onChunk) onChunk(openTag);
          }
          fullText += parsed.thinking;
          if (onChunk) onChunk(parsed.thinking);
        }

        // Process standard response stream field
        if (parsed.response) {
          if (isInsideThinkingBlock) {
            isInsideThinkingBlock = false;
            const closeTag = '\n</think>\n\n';
            fullText += closeTag;
            if (onChunk) onChunk(closeTag);
          }
          fullText += parsed.response;
          if (onChunk) onChunk(parsed.response);
        }
      } catch {
        // Ignore partial JSON chunks
      }
    }
  }

  if (isInsideThinkingBlock) {
    const closeTag = '\n</think>\n\n';
    fullText += closeTag;
    if (onChunk) onChunk(closeTag);
  }

  return {
    text: fullText,
    finishReason: 'stop',
    done: true
  };
}
