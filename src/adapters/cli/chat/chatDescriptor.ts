/**
 * JSAIOS - Single-purpose helper: chatDescriptor
 * ServiceDescriptor definition for JSAIOS Chat Engine CLI commands & options.
 */

import type { ServiceDescriptor } from '../../../kernel/types';

export const CHAT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'chat',
  name: 'JSAIOS Chat Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['chat', 'multi-turn', 'multimodal', 'sticky-context'],
  commands: [
    { command: 'chat status', description: 'View active chat session status, options, and persistence metadata' },
    {
      command: 'chat new <name> [options]',
      description: 'Create a new interactive chat session with initial settings',
      options: [
        { flag: '--provider <name>, -p', description: 'Set AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Set model for session (e.g. gpt-4o, llama3)' },
        { flag: '--system "<prompt>", -s', description: 'Set sticky system directive prompt' },
        { flag: '--temp <num>, -t', description: 'Set generation temperature float 0.0-2.0 (e.g. 0.7)' },
        { flag: '--top-p <num>', description: 'Set nucleus sampling top_p float 0.0-1.0 (e.g. 0.9)' },
        { flag: '--max-tokens <num>', description: 'Set max token response limit in tokens (e.g. 2048)' },
        { flag: '--max-history <num>', description: 'Set outgoing message history turn limit (0 for no history, null/unlimited default)' },
        { flag: '--seed <num>', description: 'Set integer seed for deterministic output (e.g. 42)' },
        { flag: '--think [true|false]', description: 'Toggle Ollama model thinking reasoning mode (--ollama-think)' },
        { flag: '--ctx <num>', description: 'Set context window size in tokens (--ollama-ctx, e.g. 2048, 8192)' },
        { flag: '--keep-alive <duration>', description: 'Set Ollama keep-alive duration (e.g. 5m, 1h, 0s, -1)' },
        { flag: '--repeat-penalty <num>', description: 'Set repetition penalty float multiplier (--ollama-repeat-penalty, e.g. 1.1)' },
        { flag: '--top-k <num>', description: 'Set top_k integer candidate token count (--ollama-top-k, e.g. 40)' },
        { flag: '--min-p <num>', description: 'Set min_p float probability threshold 0.0-1.0 (--ollama-min-p, e.g. 0.05)' }
      ]
    },
    {
      command: 'chat config [options]',
      description: 'Alter active session settings (provider, model, temperature, thinking, etc.) mid-session',
      options: [
        { flag: '--provider <name>, -p', description: 'Switch AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Switch model for active session' },
        { flag: '--system "<prompt>", -s', description: 'Update sticky system directive' },
        { flag: '--temp <num>, -t', description: 'Update generation temperature float 0.0-2.0 (e.g. 0.7)' },
        { flag: '--top-p <num>', description: 'Update top_p float probability 0.0-1.0 (e.g. 0.9)' },
        { flag: '--max-tokens <num>', description: 'Update max token limit in tokens (e.g. 2048)' },
        { flag: '--max-history <num>', description: 'Update outgoing message history turn limit (0 for no history, null/unlimited default)' },
        { flag: '--think [true|false]', description: 'Toggle model thinking reasoning mode (--ollama-think)' },
        { flag: '--ctx <num>', description: 'Update context window size in tokens (--ollama-ctx, e.g. 2048, 8192)' },
        { flag: '--keep-alive <duration>', description: 'Update Ollama keep-alive duration (e.g. 5m, 1h, 0s, -1)' }
      ]
    },
    { command: 'chat list', description: 'List all active chat sessions' },
    { command: 'chat switch <session_id>', description: 'Switch active chat session (auto-pins default boot session)' },
    { command: 'chat delete <session_id>', description: 'Delete a chat session from memory and disk' },
    { command: 'chat system [prompt]', description: 'View current system prompt or update sticky system directive for active session' },
    {
      command: 'chat send [options] <text>',
      description: 'Send a message turn to active session (supports single-turn option overrides)',
      options: [
        { flag: '--temp <num>, -t', description: 'Single-turn temperature override float 0.0-2.0' },
        { flag: '--top-p <num>', description: 'Single-turn top_p override float 0.0-1.0' },
        { flag: '--max-tokens <num>', description: 'Single-turn max tokens limit integer' },
        { flag: '--max-history <num>', description: 'Single-turn message history limit (0 for no history)' },
        { flag: '--think [true|false]', description: 'Single-turn thinking override (--ollama-think)' },
        { flag: '--image <path>, -i', description: 'Attach local image path for multimodal model' }
      ]
    },
    { command: 'chat history [page] [limit] [--all]', description: 'View paginated turn log for active session' }
  ]
};
