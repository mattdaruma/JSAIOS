/**
 * JSAIOS - Single-purpose class: ChatSession
 * Manages conversation message history log with sticky system context preservation.
 * Persistent session history is NEVER deleted or truncated on disk.
 */

import type { ChatMessage, ChatRole, ChatSessionData, ChatSessionOptions } from './types';

export class ChatSession {
  public readonly id: string;
  public name: string;
  public providerId: string;
  public model: string;
  public messages: ChatMessage[] = [];
  public options: ChatSessionOptions;
  public createdAt: number;
  public updatedAt: number;

  constructor(
    id: string,
    name: string,
    providerId: string = 'ollama',
    model: string = 'llama3',
    systemDirective?: string,
    options: ChatSessionOptions = {}
  ) {
    this.id = id;
    this.name = name;
    this.providerId = providerId;
    this.model = model;
    this.options = options;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    if (systemDirective) {
      this.setSystemDirective(systemDirective);
    }
  }

  public static fromJSON(data: ChatSessionData): ChatSession {
    const session = new ChatSession(
      data.id,
      data.name || data.id,
      data.providerId || 'ollama',
      data.model || 'llama3',
      undefined,
      data.options || {}
    );
    session.createdAt = data.createdAt || Date.now();
    session.updatedAt = data.updatedAt || Date.now();
    session.messages = Array.isArray(data.messages) ? data.messages : [];
    return session;
  }

  public setSystemDirective(content: string): void {
    const existingSystemIdx = this.messages.findIndex((m) => m.role === 'system' && m.sticky !== false);
    const systemMsg: ChatMessage = {
      id: existingSystemIdx >= 0 ? this.messages[existingSystemIdx].id : `sys_${Date.now()}`,
      role: 'system',
      content,
      sticky: true,
      timestamp: Date.now()
    };

    if (existingSystemIdx >= 0) {
      this.messages[existingSystemIdx] = systemMsg;
    } else {
      this.messages.unshift(systemMsg);
    }
    this.updatedAt = Date.now();
  }

  public updateOptions(newOptions: Partial<ChatSessionOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions
    };
    this.updatedAt = Date.now();
  }

  public addMessage(role: ChatRole, content: string, images?: string[], sticky: boolean = false): ChatMessage {
    const msg: ChatMessage = {
      id: `${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role,
      content,
      images,
      sticky,
      timestamp: Date.now()
    };

    this.messages.push(msg);
    this.updatedAt = Date.now();
    return msg;
  }

  public trimHistoryLog(): void {
    // Persistent history is retained 100% on disk and never deleted from memory.
  }

  public toJSON(): ChatSessionData {
    return {
      id: this.id,
      name: this.name,
      providerId: this.providerId,
      model: this.model,
      messages: this.messages,
      options: this.options,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
