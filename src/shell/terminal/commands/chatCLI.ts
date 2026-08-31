/**
 * JSAIOS - Single-purpose CLI handler: handleChatCLI
 * Handles subcommands and option flags for ChatEngine interactive terminal chat.
 */

import fs from 'fs';
import path from 'path';
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
      command: 'chat status',
      description: 'View active chat session status and persistence metadata'
    },
    {
      command: 'chat new <name> [options]',
      description: 'Create a new interactive chat session',
      options: [
        { flag: '--provider <name>, -p', description: 'Set AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Set model for session (e.g. gpt-4o, llama3)' },
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
      command: 'chat delete <session_id>',
      description: 'Delete a chat session from memory and disk'
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
    let storageDir = 'chat-sessions';
    try {
      const configPath = path.join(process.cwd(), 'config', 'jsaios.config.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (parsed.engines?.chat?.storageDir) storageDir = parsed.engines.chat.storageDir;
      }
    } catch {
      // Fallback on read failure
    }
    globalChatEngine = new ChatEngine(kernel, storageDir);
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

  if (sub === 'status') {
    const active = engine.getActiveSession();
    const sessions = engine.listSessions();
    const storageDir = engine.getStorageDir();

    if (!active) {
      return [
        '=== JSAIOS ChatEngine Status ===',
        'Active Session : NONE (No active session created)',
        `Total Sessions : ${sessions.length} session(s)`,
        `Storage Engine : Disk Persisted (${storageDir}/)`,
        'Hint           : Run "chat new <name>" to start a session.'
      ].join('\n');
    }

    const sys = active.messages.find((m) => m.role === 'system');
    return [
      '=== JSAIOS ChatEngine Status ===',
      `Active Session : ${active.name} (ID: ${active.id})`,
      `Provider       : ${active.providerId}`,
      `Model          : ${active.model}`,
      `Messages Count : ${active.messages.length} message(s) (${active.messages.filter((m) => m.role === 'user').length} user, ${active.messages.filter((m) => m.role === 'assistant').length} assistant)`,
      `System Context : ${sys ? `"${sys.content}"` : 'None'}`,
      `Total Sessions : ${sessions.length} active session(s)`,
      `Storage Engine : Disk Persisted (${storageDir}/)`
    ].join('\n');
  }

  if (sub === 'new' || sub === 'create') {
    let name = 'default', provider = 'ollama', model = 'llama3', systemDirective: string | undefined = undefined;
    const rawTokens = args.slice(1), nameParts: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      if (token === '--provider' || token === '-p') provider = rawTokens[++i] || provider;
      else if (token === '--model' || token === '-m') model = rawTokens[++i] || model;
      else if (token === '--system' || token === '-s') systemDirective = rawTokens[++i];
      else nameParts.push(token);
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
      ...sessions.map((s) => ` ${s.id === active?.id ? '*' : ' '} [${s.id}] '${s.name}' (Provider: ${s.providerId}, Model: ${s.model}, Turns: ${s.messages.length})`)
    ].join('\n');
  }

  if (sub === 'switch' || sub === 'use') {
    if (!args[1]) return 'Usage: chat switch <session_id>';
    const success = engine.setActiveSession(args[1]);
    if (!success) return `Session '${args[1]}' not found. Type "chat list" to view sessions.`;
    return `Switched active chat session to '${engine.getActiveSession()?.name}' (ID: ${engine.getActiveSession()?.id}).`;
  }

  if (sub === 'delete' || sub === 'rm') {
    if (!args[1]) return 'Usage: chat delete <session_id>';
    const success = engine.deleteSession(args[1]);
    if (!success) return `Session '${args[1]}' not found. Type "chat list" to view sessions.`;
    return `Deleted chat session '${args[1]}' from memory and disk.`;
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
      ...active.messages.map((m) => `[${m.role.toUpperCase()}${m.sticky ? ' (STICKY)' : ''}] ${m.content}${m.images ? ` [${m.images.length} image(s)]` : ''}`)
    ].join('\n');
  }

  if (sub === 'send' || sub === 'ask') {
    let active = engine.getActiveSession();
    if (!active) active = engine.createSession('default', 'ollama', 'llama3');

    const rawTokens = args.slice(1), images: string[] = [], promptParts: string[] = [];
    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      if (token === '--image' || token === '-i') {
        const imgPath = rawTokens[++i];
        if (imgPath) {
          try { images.push(loadLocalImageBase64(imgPath)); }
          catch (err: any) { return `Error loading image: ${err.message || err}`; }
        }
      } else promptParts.push(token);
    }

    const userPrompt = promptParts.join(' ').trim();
    if (!userPrompt) return 'Error: Chat prompt text cannot be empty.';

    try {
      return await engine.executeTurn({
        sessionId: active.id,
        userPrompt,
        images: images.length > 0 ? images : undefined,
        onChunk: onStreamChunk
      });
    } catch (err: any) {
      return `Chat engine error: ${err.message || err}`;
    }
  }

  return `Unknown chat command '${sub}'. Type "chat help" for available commands.`;
}
