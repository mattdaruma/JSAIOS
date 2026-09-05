/**
 * JSAIOS - Single-purpose adapter: FileSessionStorage
 * IChatSessionStorage persistence driver using local Node filesystem JSON storage.
 */

import fs from 'fs';
import path from 'path';
import type { IChatSessionStorage, ChatEngineSettings } from '../../engines/chat/helpers/types';
import { ChatSession, type ChatSessionDTO } from '../../engines/chat/helpers/ChatSession';

export class FileSessionStorage implements IChatSessionStorage {
  private targetDir: string;
  private settingsFile: string;

  constructor(targetDir: string = path.join('storage', 'chat-sessions')) {
    this.targetDir = path.resolve(process.cwd(), targetDir);
    this.settingsFile = path.join(this.targetDir, '_settings.json');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }
  }

  public saveSession(session: any): void {
    this.ensureDirectory();
    const sessionId = session.id;
    const filePath = path.join(this.targetDir, `${sessionId}.json`);
    const dto = typeof session.toJSON === 'function' ? session.toJSON() : session;
    fs.writeFileSync(filePath, JSON.stringify(dto, null, 2), 'utf-8');
  }

  public loadSessions(): ChatSession[] {
    this.ensureDirectory();
    const files = fs.readdirSync(this.targetDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
    const sessions: ChatSession[] = [];

    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(this.targetDir, f), 'utf-8');
        const dto: ChatSessionDTO = JSON.parse(raw);
        sessions.push(ChatSession.fromJSON(dto));
      } catch {
        // Ignore corrupted file
      }
    }

    return sessions;
  }

  public deleteSession(sessionId: string): void {
    const filePath = path.join(this.targetDir, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  public loadSettings(): ChatEngineSettings {
    if (!fs.existsSync(this.settingsFile)) return {};
    try {
      const raw = fs.readFileSync(this.settingsFile, 'utf-8');
      return JSON.parse(raw) as ChatEngineSettings;
    } catch {
      return {};
    }
  }

  public saveSettings(settings: ChatEngineSettings): void {
    this.ensureDirectory();
    fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  }
}
