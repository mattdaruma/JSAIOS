/**
 * JSAIOS - Single-purpose adapter: LocalStorageSessionStorage
 * Browser-shell-owned IChatSessionStorage persistence driver using window.localStorage.
 */

import type { IChatSessionStorage, ChatEngineSettings } from '../../../engines/chat/helpers/types';
import { ChatSession, type ChatSessionDTO } from '../../../engines/chat/helpers/ChatSession';

export class LocalStorageSessionStorage implements IChatSessionStorage {
  private keyPrefix = 'jsaios_chat_session_';
  private settingsKey = 'jsaios_chat_settings';

  public saveSession(session: any): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const dto = typeof session.toJSON === 'function' ? session.toJSON() : session;
    window.localStorage.setItem(`${this.keyPrefix}${session.id}`, JSON.stringify(dto));
  }

  public loadSessions(): ChatSession[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const sessions: ChatSession[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            const dto: ChatSessionDTO = JSON.parse(raw);
            sessions.push(ChatSession.fromJSON(dto));
          } catch {
            // Ignore malformed entry
          }
        }
      }
    }
    return sessions;
  }

  public deleteSession(sessionId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(`${this.keyPrefix}${sessionId}`);
  }

  public loadSettings(): ChatEngineSettings {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(this.settingsKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public saveSettings(settings: ChatEngineSettings): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }
}
