/**
 * JSAIOS - Single-purpose CLI storage driver: FileSessionStorage
 * Manages loading, saving, and deleting ChatSession JSON files and settings on disk for CLI environment.
 */

import fs from 'fs';
import path from 'path';
import { ChatSession } from '../../../engines/chat/helpers/ChatSession';
import type { IChatSessionStorage, ChatEngineSettings } from '../../../engines/chat/helpers/types';

export class FileSessionStorage implements IChatSessionStorage {
  private storageDir: string;

  constructor(storageDir: string = 'chat-sessions') {
    this.storageDir = storageDir;
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  private ensureDirectory(): string {
    const fullPath = path.isAbsolute(this.storageDir)
      ? this.storageDir
      : path.join(process.cwd(), this.storageDir);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  public loadSessions(): ChatSession[] {
    const sessions: ChatSession[] = [];
    try {
      const dir = this.ensureDirectory();
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.id && parsed.name && Array.isArray(parsed.messages)) {
            const session = new ChatSession(
              parsed.id,
              parsed.name,
              parsed.providerId || 'ollama',
              parsed.model || 'llama3'
            );
            session.messages = parsed.messages;
            if (parsed.options) session.options = parsed.options;
            if (parsed.createdAt) session.createdAt = parsed.createdAt;
            if (parsed.updatedAt) session.updatedAt = parsed.updatedAt;
            sessions.push(session);
          }
        } catch {
          // Skip corrupt files
        }
      }
    } catch {
      // Return empty array
    }

    return sessions;
  }

  public saveSession(session: ChatSession): void {
    try {
      const dir = this.ensureDirectory();
      const filePath = path.join(dir, `${session.id}.json`);
      const data = {
        id: session.id,
        name: session.name,
        providerId: session.providerId,
        model: session.model,
        messages: session.messages,
        options: session.options,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`[FileSessionStorage] Failed to save session '${session.id}': ${err.message || err}`);
    }
  }

  public deleteSession(sessionId: string): void {
    try {
      const dir = this.ensureDirectory();
      const filePath = path.join(dir, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      console.warn(`[FileSessionStorage] Failed to delete session file '${sessionId}': ${err.message || err}`);
    }
  }

  public loadSettings(): ChatEngineSettings {
    try {
      const dir = this.ensureDirectory();
      const filePath = path.join(dir, '_settings.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Return empty
    }
    return {};
  }

  public saveSettings(settings: ChatEngineSettings): void {
    try {
      const dir = this.ensureDirectory();
      const filePath = path.join(dir, '_settings.json');
      const data = {
        defaultSessionId: settings.defaultSessionId,
        updatedAt: Date.now()
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`[FileSessionStorage] Failed to save _settings.json: ${err.message || err}`);
    }
  }
}
