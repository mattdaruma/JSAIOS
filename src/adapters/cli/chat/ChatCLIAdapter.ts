/**
 * JSAIOS - CLI Adapter: ChatCLIAdapter
 * Translates CLI subcommand arguments into ChatEngine operations via single-purpose handlers.
 */

import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../../kernel/types';
import { getOrCreateChatEngine, resetChatEngineForTesting } from '../../factories/createChatEngine';
import { handleChatSessions } from './handleChatSessions';
import { handleChatHistory } from './handleChatHistory';
import { handleChatSend } from './handleChatSend';
import { handleChatConfig } from './handleChatConfig';
import { handleChatStatus } from './handleChatStatus';

export { resetChatEngineForTesting };

export const CHAT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'chat',
  name: 'JSAIOS Chat Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['multi-turn-chat', 'session-persistence', 'sticky-context', 'stream-tokens'],
  commands: [
    {
      command: 'chat new <session_name>',
      description: 'Create a new interactive chat session',
      options: [
        { flag: '-p, --provider <id>', description: 'AI provider ID (ollama, copilot, comfyui)' },
        { flag: '-m, --model <name>', description: 'Target model name (llama3, gpt-4o, etc.)' }
      ]
    },
    {
      command: 'chat send <user_prompt>',
      description: 'Send a prompt turn to the active chat session',
      options: [
        { flag: '-s, --session <id>', description: 'Target session ID' },
        { flag: '--temp <number>', description: 'Temperature override (0.0 to 1.0)' },
        { flag: '--think <boolean>', description: 'Enable deep thinking mode' },
        { flag: '--image <path>', description: 'Attach image file for multimodal prompt' }
      ]
    },
    {
      command: 'chat list',
      description: 'List active and persisted chat sessions'
    },
    {
      command: 'chat history [session_id]',
      description: 'Display message history for a session'
    },
    {
      command: 'chat status',
      description: 'Display active session status and config'
    },
    {
      command: 'chat config [options]',
      description: 'View or update active session parameters'
    }
  ]
};

export async function handleChatCLI(
  kernel: HoneyKernel,
  args: string[],
  onChunk?: (chunkText: string) => void
): Promise<string> {
  const engine = getOrCreateChatEngine(kernel);
  const subCmd = args[0]?.toLowerCase();

  switch (subCmd) {
    case 'new':
    case 'list':
    case 'switch':
    case 'delete':
    case 'system':
      return handleChatSessions(engine, subCmd, args.slice(1));

    case 'history':
      return handleChatHistory(engine, args.slice(1));

    case 'send':
      return handleChatSend(engine, args.slice(1), onChunk);

    case 'config':
      return handleChatConfig(engine, args);

    case 'status':
      return handleChatStatus(engine);

    default:
      return [
        'JSAIOS Chat Engine Commands:',
        '  • chat new <name> [-p provider] [-m model] - Create new session',
        '  • chat send [--temp N] [--image path] <text> - Send prompt to session',
        '  • chat list                                - List active sessions',
        '  • chat history [session_id]                - Display turn history',
        '  • chat status                              - Display session status & config',
        '  • chat config [options]                    - Update session options'
      ].join('\n');
  }
}
