/**
 * JSAIOS - Output Adapter: FileSessionStorage
 * Persistent disk storage adapter for ChatEngine sessions using local JSON files.
 */

import fs from 'fs';
import path from 'path';
import type { IChatSessionStorage, StoredSessionData, StoredSettings } from '../helpers/types';

export class FileSessionStorage implements IChatSessionStorage {
  private baseDir: string;

  constructor(baseDir: string = 'chat-sessions') {
    this.baseDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
    this.ensureDirExists();
  }

  private ensureDirExists(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      // Fallback
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.baseDir, `${sessionId}.json`);
  }

  private getSettingsPath(): string {
    return path.join(this.baseDir, '_settings.json');
  }

  public saveSession(sessionData: StoredSessionData): void {
    try {
      this.ensureDirExists();
      const filePath = this.getSessionPath(sessionData.id);
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[FileSessionStorage] Failed to save session '${sessionData.id}':`, err);
    }
  }

  public loadSessions(): StoredSessionData[] {
    return this.loadAllSessions();
  }

  public loadAllSessions(): StoredSessionData[] {
    try {
      this.ensureDirExists();
      const files = fs.readdirSync(this.baseDir);
      const sessions: StoredSessionData[] = [];

      for (const file of files) {
        if (file.endsWith('.json') && file !== '_settings.json') {
          const filePath = path.join(this.baseDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          sessions.push(JSON.parse(raw));
        }
      }
      return sessions;
    } catch {
      return [];
    }
  }

  public deleteSession(sessionId: string): void {
    try {
      const filePath = this.getSessionPath(sessionId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Fallback
    }
  }

  public saveSettings(settings: StoredSettings): void {
    try {
      this.ensureDirExists();
      fs.writeFileSync(this.getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FileSessionStorage] Failed to save settings:', err);
    }
  }

  public loadSettings(): StoredSettings | null {
    try {
      const settingsPath = this.getSettingsPath();
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return null;
  }
}
