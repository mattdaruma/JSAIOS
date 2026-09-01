/**
 * JSAIOS - Single-purpose adapter: InMemorySessionStorage
 * Fast in-memory IChatSessionStorage persistence driver for testing and zero-disk execution modes.
 */

import type { IChatSessionStorage, ChatEngineSettings } from '../../engines/chat/helpers/types';
import { ChatSession, type ChatSessionDTO } from '../../engines/chat/helpers/ChatSession';

export class InMemorySessionStorage implements IChatSessionStorage {
  private sessions = new Map<string, ChatSessionDTO>();
  private settings: ChatEngineSettings = {};

  public saveSession(session: ChatSession): void {
    this.sessions.set(session.id, session.toJSON());
  }

  public loadSessions(): ChatSession[] {
    const list: ChatSession[] = [];
    for (const dto of this.sessions.values()) {
      list.push(ChatSession.fromJSON(dto));
    }
    return list;
  }

  public deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public loadSettings(): ChatEngineSettings {
    return { ...this.settings };
  }

  public saveSettings(settings: ChatEngineSettings): void {
    this.settings = { ...settings };
  }
}
