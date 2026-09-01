/**
 * JSAIOS - Single-purpose helper: parseOllamaOptions
 * Parses CLI option flags for Ollama prompt commands.
 */

import type { TextGenerationRequest } from '../../../../services/ai/AIService';
import { loadLocalImageBase64 } from '../../../../services/ai/ollama/helpers/loadImage';

export interface ParsedOllamaPrompt {
  request: TextGenerationRequest;
  error?: string;
}

export function parseOllamaOptions(model: string, rawTokens: string[]): ParsedOllamaPrompt {
  let think: boolean | undefined = undefined;
  let temperature: number | undefined = undefined;
  let topP: number | undefined = undefined;
  let topK: number | undefined = undefined;
  let minP: number | undefined = undefined;
  let seed: number | undefined = undefined;
  let numCtx: number | undefined = undefined;
  let repeatPenalty: number | undefined = undefined;
  let systemDirective: string | undefined = undefined;
  let maxTokens: number | undefined = undefined;
  let format: string | undefined = undefined;
  let raw: boolean | undefined = undefined;
  let keepAlive: string | undefined = undefined;
  const stop: string[] = [];
  const images: string[] = [];
  const promptParts: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];

    if (token === '--think') {
      const next = (rawTokens[i + 1] || '').toLowerCase();
      if (next === 'true' || next === '1') {
        think = true;
        i++;
      } else if (next === 'false' || next === '0') {
        think = false;
        i++;
      } else {
        think = true;
      }
    } else if (token.startsWith('--think=')) {
      const val = token.split('=')[1].toLowerCase();
      think = val === 'true' || val === '1';
    } else if (token === '--no-think') {
      think = false;
    } else if (token === '--image' || token === '-i') {
      const imgPath = rawTokens[++i];
      if (imgPath) {
        try {
          images.push(loadLocalImageBase64(imgPath));
        } catch (err: any) {
          return { request: {} as any, error: `Error loading image: ${err.message || err}` };
        }
      }
    } else if (token === '--temp' || token === '-t' || token === '--temperature') {
      const val = parseFloat(rawTokens[++i]);
      if (!isNaN(val)) temperature = val;
    } else if (token.startsWith('--temp=') || token.startsWith('--temperature=')) {
      const val = parseFloat(token.split('=')[1]);
      if (!isNaN(val)) temperature = val;
    } else if (token === '--system' || token === '-s') {
      systemDirective = rawTokens[++i];
    } else if (token.startsWith('--system=')) {
      systemDirective = token.split('=').slice(1).join('=');
    } else if (token === '--max-tokens' || token === '--num-predict') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) maxTokens = val;
    } else if (token === '--top-p') {
      const val = parseFloat(rawTokens[++i]);
      if (!isNaN(val)) topP = val;
    } else if (token === '--top-k') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) topK = val;
    } else if (token === '--min-p') {
      const val = parseFloat(rawTokens[++i]);
      if (!isNaN(val)) minP = val;
    } else if (token === '--seed') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) seed = val;
    } else if (token === '--ctx' || token === '--num-ctx') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) numCtx = val;
    } else if (token === '--repeat-penalty') {
      const val = parseFloat(rawTokens[++i]);
      if (!isNaN(val)) repeatPenalty = val;
    } else if (token === '--stop') {
      const val = rawTokens[++i];
      if (val) stop.push(val);
    } else if (token === '--format') {
      format = rawTokens[++i];
    } else if (token === '--raw') {
      raw = true;
    } else if (token === '--keep-alive') {
      keepAlive = rawTokens[++i];
    } else {
      promptParts.push(token);
    }
  }

  const promptText = promptParts.join(' ');
  if (!promptText) return { request: {} as any, error: 'Error: Prompt text cannot be empty after options flags.' };

  return {
    request: {
      model,
      prompt: promptText,
      think,
      temperature,
      topP,
      topK,
      minP,
      seed,
      numCtx,
      repeatPenalty,
      systemDirective,
      maxTokens,
      stop: stop.length > 0 ? stop : undefined,
      format,
      raw,
      keepAlive,
      images: images.length > 0 ? images : undefined,
      stream: true
    }
  };
}
