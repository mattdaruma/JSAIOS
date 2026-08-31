/**
 * JSAIOS - Single-purpose CLI handler: handleChatCLI
 * Handles subcommands and option flags for ChatEngine interactive terminal chat.
 */

import fs from 'fs';
import path from 'path';
import { ChatEngine } from '../../../engines/chat/ChatEngine';
import { loadLocalImageBase64 } from '../../../services/ai/ollama/helpers/loadImage';
import { parseChatCLIArgs } from '../../../engines/chat/helpers/chatOptions';
import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../../kernel/types';

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
        { flag: '--temp <num>, -t', description: 'Set generation temperature (e.g. 0.7)' },
        { flag: '--max-tokens <num>', description: 'Set max token response limit' },
        { flag: '--system "<prompt>", -s', description: 'Set sticky system directive prompt' }
      ]
    },
    {
      command: 'chat config [options]',
      description: 'Alter active session settings (provider, model, temperature, etc.) mid-session',
      options: [
        { flag: '--provider <name>, -p', description: 'Switch AI provider (e.g. ollama, copilot)' },
        { flag: '--model <name>, -m', description: 'Switch model for active session' },
        { flag: '--temp <num>, -t', description: 'Update generation temperature' },
        { flag: '--system "<prompt>", -s', description: 'Update sticky system directive' },
        { flag: '--ollama-think [true|false]', description: 'Set Ollama reasoning mode (Ollama provider only)' }
      ]
    },
    { command: 'chat list', description: 'List all active chat sessions' },
    { command: 'chat switch <session_id>', description: 'Switch active chat session' },
    { command: 'chat delete <session_id>', description: 'Delete a chat session from memory and disk' },
    { command: 'chat system "<prompt>"', description: 'Set or update sticky system directive for active session' },
    {
      command: 'chat send [options] <text>',
      description: 'Send a message turn to active session (supports single-turn option overrides)',
      options: [
        { flag: '--temp <num>, -t', description: 'One-off temperature override for prompt' },
        { flag: '--image <path>, -i', description: 'Attach local image for multimodal model' }
      ]
    },
    { command: 'chat history [page] [limit] [--all]', description: 'View paginated turn log for active session' }
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
      // Fallback
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
    const sessions = engine.listSessions(), storageDir = engine.getStorageDir();

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
    const optsStr = Object.entries(active.options).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join(', ');

    return [
      '=== JSAIOS ChatEngine Status ===',
      `Active Session : ${active.name} (ID: ${active.id})`,
      `Provider       : ${active.providerId}`,
      `Model          : ${active.model}`,
      `Messages Count : ${active.messages.length} message(s) (${active.messages.filter((m) => m.role === 'user').length} user, ${active.messages.filter((m) => m.role === 'assistant').length} assistant)`,
      `System Context : ${sys ? `"${sys.content}"` : 'None'}`,
      `Session Options : ${optsStr || 'Default Defaults'}`,
      `Total Sessions : ${sessions.length} active session(s)`,
      `Storage Engine : Disk Persisted (${storageDir}/)`
    ].join('\n');
  }

  if (sub === 'new' || sub === 'create') {
    const parsed = parseChatCLIArgs(args.slice(1));
    const name = parsed.cleanTextParts.join(' ').trim() || 'default';
    const session = engine.createSession(name, parsed.providerId || 'ollama', parsed.model || 'llama3', parsed.systemDirective, parsed.options);
    return `Created new chat session '${session.name}' (ID: ${session.id}) using provider '${session.providerId}' (Model: ${session.model}).`;
  }

  if (sub === 'config' || sub === 'set') {
    const active = engine.getActiveSession();
    if (!active) return 'No active chat session found. Create one with "chat new <name>".';

    const parsed = parseChatCLIArgs(args.slice(1), active.providerId);
    const updated = engine.updateSessionConfig(active.id, {
      providerId: parsed.providerId,
      model: parsed.model,
      systemDirective: parsed.systemDirective,
      options: parsed.options
    });
    return `Updated settings for active chat session '${updated.name}' (Provider: ${updated.providerId}, Model: ${updated.model}).`;
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
    const messages = active.messages;
    if (messages.length === 0) return `Chat session '${active.name}' has no messages log yet.`;

    if (args.includes('--all') || args.includes('-a')) {
      return [
        `=== Full Chat History Log: '${active.name}' (${messages.length} messages) ===`,
        ...messages.map((m) => `[${m.role.toUpperCase()}${m.sticky ? ' (STICKY)' : ''}] ${m.content}${m.images ? ` [${m.images.length} image(s)]` : ''}`)
      ].join('\n');
    }

    let page = 1, limit = 10;
    const nums = args.slice(1).filter((a) => !a.startsWith('-')).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (nums.length >= 1) page = Math.floor(nums[0]);
    if (nums.length >= 2) limit = Math.floor(nums[1]);

    const total = messages.length, totalPages = Math.max(1, Math.ceil(total / limit)), effPage = Math.min(page, totalPages);
    const paged = messages.slice(Math.max(0, total - effPage * limit), total - (effPage - 1) * limit);

    return [
      `=== Chat History Log: '${active.name}' (Page ${effPage} of ${totalPages}, ${total} messages total) ===`,
      ...paged.map((m) => `[${m.role.toUpperCase()}${m.sticky ? ' (STICKY)' : ''}] ${m.content}${m.images ? ` [${m.images.length} image(s)]` : ''}`),
      totalPages > 1 ? `\n[Page ${effPage} of ${totalPages} | Use "chat history ${effPage + 1 <= totalPages ? effPage + 1 : totalPages}" for previous page | "chat history --all" for full log]` : ''
    ].filter(Boolean).join('\n');
  }

  if (sub === 'send' || sub === 'ask') {
    let active = engine.getActiveSession();
    if (!active) active = engine.createSession('default', 'ollama', 'llama3');

    const parsed = parseChatCLIArgs(args.slice(1), active.providerId);
    const images: string[] = [], promptParts: string[] = [];

    for (let i = 0; i < parsed.cleanTextParts.length; i++) {
      const token = parsed.cleanTextParts[i];
      if (token === '--image' || token === '-i') {
        const imgPath = parsed.cleanTextParts[++i];
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
        turnOptions: parsed.options,
        onChunk: onStreamChunk
      });
    } catch (err: any) {
      return `Chat engine error: ${err.message || err}`;
    }
  }

  return `Unknown chat command '${sub}'. Type "chat help" for available commands.`;
}
