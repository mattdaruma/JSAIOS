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

function parseOptionalInt(valStr: string | undefined): { val: number | undefined; present: boolean } {
  if (!valStr) return { val: undefined, present: false };
  const lower = valStr.toLowerCase();
  if (lower === 'null' || lower === 'none' || lower === 'unlimited' || lower === 'default' || lower === 'reset') {
    return { val: undefined, present: true };
  }
  const val = parseInt(valStr, 10);
  return { val: !isNaN(val) ? val : undefined, present: true };
}

function parseOptionalFloat(valStr: string | undefined): { val: number | undefined; present: boolean } {
  if (!valStr) return { val: undefined, present: false };
  const lower = valStr.toLowerCase();
  if (lower === 'null' || lower === 'none' || lower === 'unlimited' || lower === 'default' || lower === 'reset') {
    return { val: undefined, present: true };
  }
  const val = parseFloat(valStr);
  return { val: !isNaN(val) ? val : undefined, present: true };
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
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.temperature = parsedVal.val;
    } else if (token === '--top-p') {
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.topP = parsedVal.val;
    } else if (token === '--max-tokens') {
      const parsedVal = parseOptionalInt(tokens[++i]);
      if (parsedVal.present) result.options.maxTokens = parsedVal.val;
    } else if (token === '--presence-penalty') {
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.presencePenalty = parsedVal.val;
    } else if (token === '--frequency-penalty') {
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.frequencyPenalty = parsedVal.val;
    } else if (token === '--seed') {
      const parsedVal = parseOptionalInt(tokens[++i]);
      if (parsedVal.present) result.options.seed = parsedVal.val;
    } else if (token === '--stop') {
      result.options.stop = [tokens[++i]];
    } else if (token === '--max-history' || token === '--history-limit') {
      const parsedVal = parseOptionalInt(tokens[++i]);
      if (parsedVal.present) result.options.maxHistory = parsedVal.val;
    }
    // Ollama-specific options
    else if (token === '--ollama-think' || (isOllama && token === '--think')) {
      const flagVal = next && !next.startsWith('-') ? tokens[++i] : 'true';
      result.options.ollamaThink = flagVal !== 'false';
    } else if (token === '--ollama-ctx' || (isOllama && token === '--ctx')) {
      const parsedVal = parseOptionalInt(tokens[++i]);
      if (parsedVal.present) result.options.ollamaNumCtx = parsedVal.val;
    } else if (token === '--ollama-keep-alive' || (isOllama && token === '--keep-alive')) {
      result.options.ollamaKeepAlive = tokens[++i];
    } else if (token === '--ollama-repeat-penalty' || (isOllama && token === '--repeat-penalty')) {
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.ollamaRepeatPenalty = parsedVal.val;
    } else if (token === '--ollama-top-k' || (isOllama && token === '--top-k')) {
      const parsedVal = parseOptionalInt(tokens[++i]);
      if (parsedVal.present) result.options.ollamaTopK = parsedVal.val;
    } else if (token === '--ollama-min-p' || (isOllama && token === '--min-p')) {
      const parsedVal = parseOptionalFloat(tokens[++i]);
      if (parsedVal.present) result.options.ollamaMinP = parsedVal.val;
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
