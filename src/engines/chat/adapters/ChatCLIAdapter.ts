/**
 * JSAIOS - Single-purpose adapter: ChatCLIAdapter
 * CLI command entry point and subcommand dispatcher for ChatEngine.
 */

import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import { getOrCreateChatEngine, resetChatEngineForTesting } from '../helpers/createChatEngine';
import { handleChatStatus } from '../helpers/handleChatStatus';
import { handleChatConfig } from '../helpers/handleChatConfig';
import { handleChatSessions } from '../helpers/handleChatSessions';
import { handleChatSend } from '../helpers/handleChatSend';
import { handleChatHistory } from '../helpers/handleChatHistory';
import { CHAT_ENGINE_DESCRIPTOR } from '../helpers/chatDescriptor';

export { CHAT_ENGINE_DESCRIPTOR, getOrCreateChatEngine, resetChatEngineForTesting };

export async function handleChatCLI(
  kernel: HoneyKernel,
  args: string[],
  onStreamChunk?: (chunkText: string) => void
): Promise<string> {
  const engine = getOrCreateChatEngine(kernel);
  const sub = (args[0] || '').toLowerCase();

  switch (sub) {
    case 'status':
    case '':
      return handleChatStatus(engine);

    case 'config':
      return handleChatConfig(engine, args.slice(1));

    case 'new':
    case 'list':
    case 'switch':
    case 'delete':
    case 'system':
      return handleChatSessions(engine, sub, args.slice(1));

    case 'send':
      return handleChatSend(engine, args.slice(1), onStreamChunk);

    case 'history':
    case 'log':
      return handleChatHistory(engine, args.slice(1));
  }

  // Fallback direct text prompt submission
  return handleChatSend(engine, args, onStreamChunk);
}
