/**
 * JSAIOS - Single-purpose CLI handler: handleChatCLI
 * Handles subcommands and option flags for ChatEngine interactive terminal chat.
 */

import { ChatEngine } from '../../../engines/chat/ChatEngine';
import { loadLocalImageBase64 } from '../../../services/ai/ollama/helpers/loadImage';
import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../../kernel/types';

export const CHAT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'chat',
  name: 'JSAIOS Chat Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['chat', 'multi-turn', 'multimodal', 'sticky-context'],
  cliCommands: [
    {
      command: 'chat new <name> [options]',
      description: 'Create a new interactive chat session',
      options: [
        { flag: '--provider <name>, -p', description: 'Set AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Set model for session (default: llama3)' },
        { flag: '--system "<prompt>", -s', description: 'Set sticky system directive prompt' }
      ]
    },
    {
      command: 'chat list',
      description: 'List all active chat sessions'
    },
    {
      command: 'chat switch <session_id>',
      description: 'Switch active chat session'
    },
    {
      command: 'chat system "<prompt>"',
      description: 'Set or update sticky system directive for active session'
    },
    {
      command: 'chat send [options] <text>',
      description: 'Send a message turn to active session',
      options: [
        { flag: '--image <path>, -i', description: 'Attach local image for multimodal model' }
      ]
    },
    {
      command: 'chat history',
      description: 'View turn log for active session'
    }
  ]
};

let globalChatEngine: ChatEngine | null = null;

export function getOrCreateChatEngine(kernel: HoneyKernel): ChatEngine {
  if (!globalChatEngine) {
    globalChatEngine = new ChatEngine(kernel);
  }
  return globalChatEngine;
}

export async function handleChatCLI(
  kernel: HoneyKernel,
  args: string[],
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const engine = getOrCreateChatEngine(kernel);
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'new' || sub === 'create') {
    let name = 'default';
    let provider = 'ollama';
    let model = 'llama3';
    let systemDirective: string | undefined = undefined;

    const rawTokens = args.slice(1);
    const nameParts: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      if (token === '--provider' || token === '-p') {
        provider = rawTokens[++i] || provider;
      } else if (token === '--model' || token === '-m') {
        model = rawTokens[++i] || model;
      } else if (token === '--system' || token === '-s') {
        systemDirective = rawTokens[++i];
      } else {
        nameParts.push(token);
      }
    }

    if (nameParts.length > 0) name = nameParts.join(' ');

    const session = engine.createSession(name, provider, model, systemDirective);
    return `Created new chat session '${session.name}' (ID: ${session.id}) using provider '${session.providerId}' (Model: ${session.model}).`;
  }

  if (sub === 'list' || sub === 'ls') {
    const sessions = engine.listSessions();
    if (sessions.length === 0) return 'No active chat sessions found. Type "chat new <name>" to create one.';

    const active = engine.getActiveSession();
    return [
      'Active JSAIOS Chat Sessions:',
      ...sessions.map(
        (s) =>
          ` ${s.id === active?.id ? '*' : ' '} [${s.id}] '${s.name}' (Provider: ${s.providerId}, Model: ${s.model}, Turns: ${s.messages.length})`
      )
    ].join('\n');
  }

  if (sub === 'switch' || sub === 'use') {
    if (!args[1]) return 'Usage: chat switch <session_id>';
    const targetId = args[1];
    const success = engine.setActiveSession(targetId);
    if (!success) return `Session '${targetId}' not found. Type "chat list" to view sessions.`;
    const active = engine.getActiveSession();
    return `Switched active chat session to '${active?.name}' (ID: ${active?.id}).`;
  }

  if (sub === 'system') {
    const active = engine.getActiveSession();
    if (!active) return 'No active chat session. Create one with "chat new <name>".';

    const systemText = args.slice(1).join(' ').trim();
    if (!systemText) return 'Usage: chat system "<sticky system prompt text>"';

    active.setSystemDirective(systemText);
    return `Updated sticky system context for session '${active.name}'.`;
  }

  if (sub === 'history' || sub === 'log') {
    const active = engine.getActiveSession();
    if (!active) return 'No active chat session. Create one with "chat new <name>".';

    return [
      `=== Chat History Log: '${active.name}' (${active.model}) ===`,
      ...active.messages.map(
        (m) =>
          `[${m.role.toUpperCase()}${m.sticky ? ' (STICKY)' : ''}] ${m.content}${
            m.images ? ` [${m.images.length} image(s)]` : ''
          }`
      )
    ].join('\n');
  }

  if (sub === 'send' || sub === 'ask') {
    let active = engine.getActiveSession();
    if (!active) {
      active = engine.createSession('default', 'ollama', 'llama3');
    }

    const rawTokens = args.slice(1);
    const images: string[] = [];
    const promptParts: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      if (token === '--image' || token === '-i') {
        const imgPath = rawTokens[++i];
        if (imgPath) {
          try {
            images.push(loadLocalImageBase64(imgPath));
          } catch (err: any) {
            return `Error loading image: ${err.message || err}`;
          }
        }
      } else {
        promptParts.push(token);
      }
    }

    const userPrompt = promptParts.join(' ').trim();
    if (!userPrompt) return 'Error: Chat prompt text cannot be empty.';

    try {
      const result = await engine.executeTurn({
        sessionId: active.id,
        userPrompt,
        images: images.length > 0 ? images : undefined,
        onChunk: onStreamChunk
      });
      return onStreamChunk ? '' : result;
    } catch (err: any) {
      return `Chat engine error: ${err.message || err}`;
    }
  }

  return `Unknown chat command '${sub}'. Type "chat help" for available commands.`;
}
