/**
 * JSAIOS - Single-purpose class: ChatSession
 * Manages conversation message history log with sticky system context preservation and turn/character window trimming.
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
    options: ChatSessionOptions = { maxTurns: 20, maxChars: 12000 }
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
    this.trimHistoryLog();
    return msg;
  }

  public trimHistoryLog(): void {
    const maxTurns = this.options.maxTurns || 20;
    const maxChars = this.options.maxChars || 12000;

    const stickyMessages = this.messages.filter((m) => m.sticky || m.role === 'system');
    let dynamicMessages = this.messages.filter((m) => !m.sticky && m.role !== 'system');

    if (dynamicMessages.length > maxTurns * 2) {
      dynamicMessages = dynamicMessages.slice(dynamicMessages.length - maxTurns * 2);
    }

    let totalChars = dynamicMessages.reduce((sum, m) => sum + m.content.length, 0);
    while (dynamicMessages.length > 2 && totalChars > maxChars) {
      const removed = dynamicMessages.shift();
      if (removed) totalChars -= removed.content.length;
    }

    this.messages = [...stickyMessages, ...dynamicMessages];
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
