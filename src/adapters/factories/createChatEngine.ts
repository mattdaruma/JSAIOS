/**
 * JSAIOS - Adapter Factory: createChatEngine
 * Factory function for creating or retrieving singleton ChatEngine instances with storage configuration.
 */

import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { ChatEngine } from '../../engines/chat/ChatEngine';
import { FileSessionStorage } from '../storage/FileSessionStorage';
import type { ContextEngine } from '../../engines/context/ContextEngine';
import type { ChainEngine } from '../../engines/chain/ChainEngine';

let globalChatEngine: ChatEngine | null = null;

export function resetChatEngineForTesting(engine?: ChatEngine | null): void {
  globalChatEngine = engine || null;
}

export function getOrCreateChatEngine(
  kernel: HoneyKernel,
  contextEngine?: ContextEngine,
  chainEngine?: ChainEngine
): ChatEngine {
  if (!globalChatEngine) {
    let storageDir = 'chat-sessions';
    try {
      const configPath = path.join(process.cwd(), 'config', 'default.daemon.json');
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
    globalChatEngine = new ChatEngine(kernel, storageDriver, contextEngine, chainEngine);
  } else {
    globalChatEngine.setDependencies(contextEngine, chainEngine);
  }
  return globalChatEngine;
}
