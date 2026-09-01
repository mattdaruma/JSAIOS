/**
 * JSAIOS - Single-purpose CLI dispatcher: handleChatCLI
 * Routes subcommands to single-purpose chat adapter handlers.
 */

import fs from 'fs';
import path from 'path';
import { ChatEngine } from '../../../engines/chat/ChatEngine';
import { FileSessionStorage } from '../storage/FileSessionStorage';
import { CHAT_ENGINE_DESCRIPTOR } from './helpers/chatDescriptor';
import { handleChatStatus } from './chat/handleChatStatus';
import { handleChatConfig } from './chat/handleChatConfig';
import { handleChatHistory } from './chat/handleChatHistory';
import { handleChatSend } from './chat/handleChatSend';
import {
  handleChatNewSession,
  handleChatListSessions,
  handleChatSwitchSession,
  handleChatDeleteSession,
  handleChatSystemPrompt
} from './chat/handleChatSessions';
import type { HoneyKernel } from '../../../kernel/HoneyKernel';

export { CHAT_ENGINE_DESCRIPTOR };

let globalChatEngine: ChatEngine | null = null;

export function resetChatEngineForTesting(engine?: ChatEngine | null): void {
  globalChatEngine = engine || null;
}

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
    const storageDriver = new FileSessionStorage(storageDir);
    globalChatEngine = new ChatEngine(kernel, storageDriver);
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

  if (sub === 'status') return handleChatStatus(engine);
  if (sub === 'new' || sub === 'create') return handleChatNewSession(engine, args);
  if (sub === 'config' || sub === 'set') return handleChatConfig(engine, args);
  if (sub === 'list' || sub === 'ls') return handleChatListSessions(engine);
  if (sub === 'switch' || sub === 'use') return handleChatSwitchSession(engine, args);
  if (sub === 'delete' || sub === 'rm') return handleChatDeleteSession(engine, args);
  if (sub === 'system') return handleChatSystemPrompt(engine, args);
  if (sub === 'history' || sub === 'log') return handleChatHistory(engine, args);
  if (sub === 'send' || sub === 'ask') return handleChatSend(engine, args, onStreamChunk);

  return `Unknown chat command '${sub}'. Type "chat help" for available commands.`;
}
