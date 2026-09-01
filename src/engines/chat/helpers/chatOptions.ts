/**
 * JSAIOS - Single-purpose helper: chatOptions
 * Parses CLI option flags, merges turn-level overrides, and builds TextGenerationRequest objects.
 */

import type { ChatSessionOptions } from './types';
import type { TextGenerationRequest } from '../../../services/ai/AIService';

export interface ParsedChatCLIResult {
  providerId?: string;
  model?: string;
  systemDirective?: string;
  cleanTextParts: string[];
  options: Partial<ChatSessionOptions>;
}

export function parseChatCLIArgs(tokens: string[], providerId: string = 'ollama'): ParsedChatCLIResult {
  const result: ParsedChatCLIResult = {
    cleanTextParts: [],
    options: {}
  };

  let activeProvider = providerId;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const isOllama = activeProvider.toLowerCase() === 'ollama';

    if (token === '--provider' || token === '-p') {
      result.providerId = tokens[++i];
      if (result.providerId) activeProvider = result.providerId;
    } else if (token === '--model' || token === '-m') {
      result.model = tokens[++i];
    } else if (token === '--system' || token === '-s') {
      result.systemDirective = tokens[++i];
    } else if (token === '--temp' || token === '-t') {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.temperature = val;
    } else if (token === '--top-p') {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.topP = val;
    } else if (token === '--max-tokens') {
      const val = parseInt(tokens[++i], 10);
      if (!isNaN(val)) result.options.maxTokens = val;
    } else if (token === '--presence-penalty') {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.presencePenalty = val;
    } else if (token === '--frequency-penalty') {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.frequencyPenalty = val;
    } else if (token === '--seed') {
      const val = parseInt(tokens[++i], 10);
      if (!isNaN(val)) result.options.seed = val;
    } else if (token === '--stop') {
      result.options.stop = [tokens[++i]];
    }
    // Ollama-specific options
    else if (token === '--ollama-think' || (isOllama && token === '--think')) {
      const flagVal = next && !next.startsWith('-') ? tokens[++i] : 'true';
      result.options.ollamaThink = flagVal !== 'false';
    } else if (token === '--ollama-ctx' || (isOllama && token === '--ctx')) {
      const val = parseInt(tokens[++i], 10);
      if (!isNaN(val)) result.options.ollamaNumCtx = val;
    } else if (token === '--ollama-keep-alive' || (isOllama && token === '--keep-alive')) {
      result.options.ollamaKeepAlive = tokens[++i];
    } else if (token === '--ollama-repeat-penalty' || (isOllama && token === '--repeat-penalty')) {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.ollamaRepeatPenalty = val;
    } else if (token === '--ollama-top-k' || (isOllama && token === '--top-k')) {
      const val = parseInt(tokens[++i], 10);
      if (!isNaN(val)) result.options.ollamaTopK = val;
    } else if (token === '--ollama-min-p' || (isOllama && token === '--min-p')) {
      const val = parseFloat(tokens[++i]);
      if (!isNaN(val)) result.options.ollamaMinP = val;
    } else {
      result.cleanTextParts.push(token);
    }
  }

  return result;
}

export function mergeChatOptions(
  base: ChatSessionOptions,
  override?: Partial<ChatSessionOptions>
): ChatSessionOptions {
  if (!override) return { ...base };
  return {
    ...base,
    ...override
  };
}

export function buildTextGenRequest(
  model: string,
  prompt: string,
  systemDirective?: string,
  options: ChatSessionOptions = {},
  images?: string[]
): TextGenerationRequest {
  const req: TextGenerationRequest = {
    model,
    prompt,
    systemDirective,
    temperature: options.temperature,
    topP: options.topP,
    maxTokens: options.maxTokens,
    presencePenalty: options.presencePenalty,
    frequencyPenalty: options.frequencyPenalty,
    seed: options.seed,
    stop: options.stop,
    images,
    stream: true
  };

  req.think = options.ollamaThink;
  req.numCtx = options.ollamaNumCtx;
  req.keepAlive = options.ollamaKeepAlive;
  req.repeatPenalty = options.ollamaRepeatPenalty;
  req.topK = options.ollamaTopK;
  req.minP = options.ollamaMinP;

  return req;
}
