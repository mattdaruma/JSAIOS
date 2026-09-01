/**
 * JSAIOS - Single-purpose helper: formatConfigReport
 * Formats exhaustive chat session configuration report displaying explicit settings or defaults for every available option.
 */

import type { ChatSession } from './ChatSession';

export const CHAT_OPTION_DEFAULTS = {
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 2048,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  seed: 'None',
  stop: 'None',
  maxTurns: 20,
  maxChars: 12000,
  maxHistory: 'unlimited',
  ollamaThink: false,
  ollamaNumCtx: 2048,
  ollamaKeepAlive: '5m',
  ollamaRepeatPenalty: 1.1,
  ollamaTopK: 40,
  ollamaMinP: 0.05
};

export function formatConfigReport(session: ChatSession): string {
  const sys = session.messages.find((m) => m.role === 'system');
  const opts = session.options;
  const isOllama = session.providerId.toLowerCase() === 'ollama';

  const fmtOpt = (key: keyof typeof CHAT_OPTION_DEFAULTS, val: any) => {
    if (val !== undefined && val !== null) {
      const displayVal = Array.isArray(val) ? val.join(',') : String(val);
      return displayVal;
    }
    const defaultVal = CHAT_OPTION_DEFAULTS[key];
    return `${defaultVal} (default)`;
  };

  const lines: string[] = [
    `=== Active Session Configuration: '${session.name}' (ID: ${session.id}) ===`,
    `Provider            : ${session.providerId}`,
    `Model               : ${session.model}`,
    `System Context      : ${sys ? `Present (${sys.content.length} chars) | View with "chat system"` : 'None'}`,
    '',
    '-- Standard Generation Options --',
    `temperature         : ${fmtOpt('temperature', opts.temperature)}`,
    `topP                : ${fmtOpt('topP', opts.topP)}`,
    `maxTokens           : ${fmtOpt('maxTokens', opts.maxTokens)}`,
    `presencePenalty     : ${fmtOpt('presencePenalty', opts.presencePenalty)}`,
    `frequencyPenalty    : ${fmtOpt('frequencyPenalty', opts.frequencyPenalty)}`,
    `seed                : ${fmtOpt('seed', opts.seed)}`,
    `stop                : ${fmtOpt('stop', opts.stop)}`,
    `maxTurns            : ${fmtOpt('maxTurns', opts.maxTurns)}`,
    `maxChars            : ${fmtOpt('maxChars', opts.maxChars)}`,
    `maxHistory          : ${fmtOpt('maxHistory', opts.maxHistory)}`
  ];

  if (isOllama) {
    lines.push('');
    lines.push('-- Ollama Provider Options --');
    lines.push(`ollamaThink         : ${fmtOpt('ollamaThink', opts.ollamaThink)}`);
    lines.push(`ollamaNumCtx        : ${fmtOpt('ollamaNumCtx', opts.ollamaNumCtx)}`);
    lines.push(`ollamaKeepAlive     : ${fmtOpt('ollamaKeepAlive', opts.ollamaKeepAlive)}`);
    lines.push(`ollamaRepeatPenalty : ${fmtOpt('ollamaRepeatPenalty', opts.ollamaRepeatPenalty)}`);
    lines.push(`ollamaTopK          : ${fmtOpt('ollamaTopK', opts.ollamaTopK)}`);
    lines.push(`ollamaMinP          : ${fmtOpt('ollamaMinP', opts.ollamaMinP)}`);
  }

  return lines.join('\n');
}
