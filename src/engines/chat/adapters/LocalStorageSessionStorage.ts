/**
 * JSAIOS - Single-purpose adapter: LocalStorageSessionStorage
 * In-browser IChatSessionStorage persistence driver using window.localStorage.
 */

import type { IChatSessionStorage } from '../types';
import { ChatSession, type ChatSessionDTO } from '../helpers/ChatSession';

export class LocalStorageSessionStorage implements IChatSessionStorage {
  private keyPrefix = 'jsaios_chat_session_';
  private defaultKey = 'jsaios_default_session_id';

  public async saveSession(session: ChatSession): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const dto = session.toJSON();
    window.localStorage.setItem(`${this.keyPrefix}${session.id}`, JSON.stringify(dto));
  }

  public async loadSession(sessionId: string): Promise<ChatSession | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(`${this.keyPrefix}${sessionId}`);
    if (!raw) return null;
    try {
      const dto: ChatSessionDTO = JSON.parse(raw);
      return ChatSession.fromJSON(dto);
    } catch {
      return null;
    }
  }

  public async listSessions(): Promise<ChatSession[]> {
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

  public async deleteSession(sessionId: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const key = `${this.keyPrefix}${sessionId}`;
    if (window.localStorage.getItem(key)) {
      window.localStorage.removeItem(key);
      return true;
    }
    return false;
  }

  public async getDesignatedDefaultSessionId(): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(this.defaultKey);
  }

  public async setDesignatedDefaultSessionId(sessionId: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(this.defaultKey, sessionId);
  }
}
