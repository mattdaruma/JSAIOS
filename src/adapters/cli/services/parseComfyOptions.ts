/**
 * JSAIOS - Single-purpose helper: parseComfyOptions
 * Parses CLI option flags for ComfyUI media generation prompt commands.
 * Supports standard flags (--width, --steps, --ckpt) and dynamic node-qualified flags (--node2.text, --node3.clip, --ckpt_name).
 */

import type { MediaGenerationRequest } from '../../../services/ai/AIService';

export interface ParsedComfyPrompt {
  request: MediaGenerationRequest;
  error?: string;
}

export function parseComfyOptions(rawTokens: string[]): ParsedComfyPrompt {
  let workflowName: string | undefined = undefined;
  let negativePrompt: string | undefined = undefined;
  let steps: number | undefined = undefined;
  let cfg: number | undefined = undefined;
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;
  let seed: number | undefined = undefined;
  let samplerName: string | undefined = undefined;
  let checkpoint: string | undefined = undefined;
  const customNodeOptions: Record<string, any> = {};
  const promptParts: string[] = [];

  let isFirstPositional = true;

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];

    if (token === '--neg' || token === '--negative') {
      negativePrompt = rawTokens[++i];
    } else if (token === '--pos' || token === '--positive') {
      promptParts.push(rawTokens[++i]);
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
    } else if (token === '--ckpt' || token === '--ckpt_name') {
      checkpoint = rawTokens[++i];
    } else if (token.startsWith('--')) {
      const paramKey = token.slice(2);
      const paramVal = rawTokens[++i];
      if (paramVal !== undefined) {
        const num = Number(paramVal);
        customNodeOptions[paramKey] = !isNaN(num) && paramVal.trim() !== '' ? num : paramVal;
      }
    } else {
      if (isFirstPositional) {
        workflowName = token.replace(/^["']|["']$/g, '');
        isFirstPositional = false;
      } else {
        promptParts.push(token);
      }
    }
  }

  return {
    request: {
      workflowName,
      prompt: promptParts.join(' ') || 'Generation Task',
      negativePrompt,
      steps,
      cfg,
      width,
      height,
      seed,
      samplerName,
      checkpoint,
      options: customNodeOptions
    }
  };
}
