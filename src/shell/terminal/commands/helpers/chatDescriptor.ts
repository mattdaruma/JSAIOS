/**
 * JSAIOS - Single-purpose helper: chatDescriptor
 * Complete ServiceDescriptor definition for JSAIOS Chat Engine including full options documentation.
 */

import type { ServiceDescriptor } from '../../../../kernel/types';

export const CHAT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'chat',
  name: 'JSAIOS Chat Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['chat', 'multi-turn', 'multimodal', 'sticky-context'],
  cliCommands: [
    { command: 'chat status', description: 'View active chat session status, options, and persistence metadata' },
    {
      command: 'chat new <name> [options]',
      description: 'Create a new interactive chat session with initial settings',
      options: [
        { flag: '--provider <name>, -p', description: 'Set AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Set model for session (e.g. gpt-4o, llama3)' },
        { flag: '--system "<prompt>", -s', description: 'Set sticky system directive prompt' },
        { flag: '--temp <num>, -t', description: 'Set generation temperature (e.g. 0.7)' },
        { flag: '--top-p <num>', description: 'Set nucleus sampling top_p (e.g. 0.9)' },
        { flag: '--max-tokens <num>', description: 'Set max tokens limit' },
        { flag: '--seed <num>', description: 'Set seed for deterministic output' },
        { flag: '--think [true|false]', description: 'Enable Ollama model thinking reasoning mode (--ollama-think)' },
        { flag: '--ctx <num>', description: 'Set context window size limit (--ollama-ctx)' },
        { flag: '--keep-alive <time>', description: 'Set Ollama keep-alive duration (--ollama-keep-alive)' }
      ]
    },
    {
      command: 'chat config [options]',
      description: 'Alter active session settings (provider, model, temperature, thinking, etc.) mid-session',
      options: [
        { flag: '--provider <name>, -p', description: 'Switch AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Switch model for active session' },
        { flag: '--system "<prompt>", -s', description: 'Update sticky system directive' },
        { flag: '--temp <num>, -t', description: 'Update generation temperature' },
        { flag: '--top-p <num>', description: 'Update top_p parameter' },
        { flag: '--max-tokens <num>', description: 'Update max token response limit' },
        { flag: '--think [true|false]', description: 'Toggle model thinking reasoning mode (--ollama-think)' },
        { flag: '--ctx <num>', description: 'Update context window size limit (--ollama-ctx)' }
      ]
    },
    { command: 'chat list', description: 'List all active chat sessions' },
    { command: 'chat switch <session_id>', description: 'Switch active chat session (auto-pins default boot session)' },
    { command: 'chat delete <session_id>', description: 'Delete a chat session from memory and disk' },
    { command: 'chat system "<prompt>"', description: 'Set or update sticky system directive for active session' },
    {
      command: 'chat send [options] <text>',
      description: 'Send a message turn to active session (supports single-turn option overrides)',
      options: [
        { flag: '--temp <num>, -t', description: 'Single-turn temperature override for prompt' },
        { flag: '--top-p <num>', description: 'Single-turn top_p override for prompt' },
        { flag: '--max-tokens <num>', description: 'Single-turn max tokens override' },
        { flag: '--think [true|false]', description: 'Single-turn thinking override (--ollama-think)' },
        { flag: '--image <path>, -i', description: 'Attach local image for multimodal model' }
      ]
    },
    { command: 'chat history [page] [limit] [--all]', description: 'View paginated turn log for active session' }
  ]
};
