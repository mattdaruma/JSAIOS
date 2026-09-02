/**
 * JSAIOS - Single-purpose helper: createChatEngine
 * Factory function for creating or retrieving singleton ChatEngine instances with storage configuration.
 */

import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import { ChatEngine } from '../ChatEngine';
import { FileSessionStorage } from '../../../adapters/storage/FileSessionStorage';

let globalChatEngine: ChatEngine | null = null;

export function resetChatEngineForTesting(engine?: ChatEngine | null): void {
  globalChatEngine = engine || null;
}

export function getOrCreateChatEngine(kernel: HoneyKernel): ChatEngine {
  if (!globalChatEngine) {
    let storageDir = 'chat-sessions';
    try {
      const configPath = path.join(process.cwd(), 'config', 'jsaios.daemon.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (Array.isArray(parsed.engines)) {
          const chatCfg = parsed.engines.find((e: any) => e.id === 'chat');
          if (chatCfg?.storageDir) storageDir = chatCfg.storageDir;
        } else if (parsed.engines?.chat?.storageDir) {
          storageDir = parsed.engines.chat.storageDir;
        }
      }
    } catch {
      // Fallback
    }
    const storageDriver = new FileSessionStorage(storageDir);
    globalChatEngine = new ChatEngine(kernel, storageDriver);
  }
  return globalChatEngine;
}
