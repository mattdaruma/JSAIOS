/**
 * JSAIOS - CLI Adapter: ChatCLIAdapter
 * Translates CLI subcommand arguments into ChatEngine operations.
 */

import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../../kernel/types';
import { getOrCreateChatEngine, resetChatEngineForTesting } from '../../factories/createChatEngine';

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
    case 'new': {
      const name = args[1] || 'default-session';
      const providerIdx = args.indexOf('-p') !== -1 ? args.indexOf('-p') : args.indexOf('--provider');
      const modelIdx = args.indexOf('-m') !== -1 ? args.indexOf('-m') : args.indexOf('--model');

      const providerId = providerIdx !== -1 && args[providerIdx + 1] ? args[providerIdx + 1] : 'ollama';
      const model = modelIdx !== -1 && args[modelIdx + 1] ? args[modelIdx + 1] : 'llama3';

      const session = engine.createSession(name, providerId, model);
      return `Created new session '${session.name}' (ID: ${session.id}) using provider '${providerId}/${model}'.`;
    }

    case 'list': {
      const sessions = engine.listSessions();
      if (sessions.length === 0) return 'No active chat sessions found.';
      return [
        'Active Chat Sessions:',
        ...sessions.map((s) => ` • [${s.id}] ${s.name} (${s.providerId}/${s.model}) - ${s.turns.length} turns`)
      ].join('\n');
    }

    case 'history': {
      const sessionId = args[1] || engine.getActiveSession()?.id;
      if (!sessionId) return 'No active session. Specify a session ID or create one using "chat new <name>".';

      const history = engine.getSessionHistory(sessionId);
      if (!history || history.length === 0) return `Session '${sessionId}' has no turns yet.`;

      return [
        `=== Chat History for Session '${sessionId}' ===`,
        ...history.map((t) => `[${t.role.toUpperCase()}]: ${t.content}`)
      ].join('\n\n');
    }

    case 'send': {
      const promptArgs = args.slice(1);
      if (promptArgs.length === 0) return 'Usage: chat send [--temp <val>] [--image <path>] <prompt text>';

      let tempOverride: number | undefined;
      const tempIdx = promptArgs.indexOf('--temp');
      if (tempIdx !== -1 && promptArgs[tempIdx + 1]) {
        tempOverride = parseFloat(promptArgs[tempIdx + 1]);
      }

      let imagePath: string | undefined;
      const imgIdx = promptArgs.indexOf('--image');
      if (imgIdx !== -1 && promptArgs[imgIdx + 1]) {
        imagePath = promptArgs[imgIdx + 1];
      }

      // Filter out flag arguments
      const cleanPrompt = promptArgs
        .filter((_, idx) => {
          if (idx === tempIdx || idx === tempIdx + 1) return false;
          if (idx === imgIdx || idx === imgIdx + 1) return false;
          return true;
        })
        .join(' ');

      if (!cleanPrompt) return 'Please provide prompt text to send.';

      const activeSession = engine.getActiveSession();
      const targetSessionId = activeSession ? activeSession.id : engine.createSession('default', 'ollama', 'llama3').id;

      return await engine.executeTurn(
        {
          sessionId: targetSessionId,
          userPrompt: cleanPrompt,
          imagePath,
          options: tempOverride !== undefined ? { temperature: tempOverride } : undefined
        },
        onChunk
      );
    }

    default:
      return [
        'Chat Engine Commands:',
        '  • chat new <name> [-p provider] [-m model] - Create new session',
        '  • chat send [--temp N] [--image path] <text> - Send prompt to session',
        '  • chat list                                - List active sessions',
        '  • chat history [session_id]                - Display turn history'
      ].join('\n');
  }
}
