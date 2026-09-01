/**
 * JSAIOS - Single-purpose helper: parseComfyOptions
 * Parses CLI option flags for ComfyUI media generation prompt commands.
 */

import type { MediaGenerationRequest } from '../../AIService';

export interface ParsedComfyPrompt {
  request: MediaGenerationRequest;
  error?: string;
}

export function parseComfyOptions(rawTokens: string[]): ParsedComfyPrompt {
  let negativePrompt: string | undefined = undefined;
  let steps: number | undefined = undefined;
  let cfg: number | undefined = undefined;
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;
  let seed: number | undefined = undefined;
  let samplerName: string | undefined = undefined;
  let checkpoint: string | undefined = undefined;
  const promptParts: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];

    if (token === '--neg') {
      negativePrompt = rawTokens[++i];
    } else if (token.startsWith('--neg=')) {
      negativePrompt = token.split('=').slice(1).join('=');
    } else if (token === '--steps') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) steps = val;
    } else if (token === '--cfg') {
      const val = parseFloat(rawTokens[++i]);
      if (!isNaN(val)) cfg = val;
    } else if (token === '--width') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) width = val;
    } else if (token === '--height') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) height = val;
    } else if (token === '--seed') {
      const val = parseInt(rawTokens[++i], 10);
      if (!isNaN(val)) seed = val;
    } else if (token === '--sampler') {
      samplerName = rawTokens[++i];
    } else if (token === '--ckpt') {
      checkpoint = rawTokens[++i];
    } else {
      promptParts.push(token);
    }
  }

  const promptText = promptParts.join(' ');
  if (!promptText) return { request: {} as any, error: 'Error: Prompt text cannot be empty after options flags.' };

  return {
    request: {
      prompt: promptText,
      negativePrompt,
      steps,
      cfg,
      width,
      height,
      seed,
      samplerName,
      checkpoint
    }
  };
}
