/**
 * JSAIOS - ChatEngine Orchestration Engine
 * Pure platform-agnostic Chat Engine orchestrator using IChatSessionStorage driver.
 */

import { ChatSession } from './helpers/ChatSession';
import { mergeChatOptions, buildTextGenRequest } from './helpers/chatOptions';
import { sanitizeSessionId } from './helpers/sanitizeId';
import type { ChatTurnParams, ChatSessionOptions, IChatSessionStorage } from './helpers/types';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { AIService } from '../../services/ai/AIService';

export class ChatEngine {
  private kernel: HoneyKernel;
  private storage?: IChatSessionStorage;
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId?: string;
  private designatedDefaultSessionId?: string;

  constructor(kernel: HoneyKernel, storage?: IChatSessionStorage) {
    this.kernel = kernel;
    this.storage = storage;
    this.initSessionsFromStorage();
  }

  public getStorage(): IChatSessionStorage | undefined {
    return this.storage;
  }

  public getDesignatedDefaultSessionId(): string | undefined {
    return this.designatedDefaultSessionId;
  }

  private initSessionsFromStorage(): void {
    if (!this.storage) return;

    const loaded = (this.storage.loadSessions() || []) as ChatSession[];
    if (Array.isArray(loaded)) {
      loaded.sort((a, b) => b.updatedAt - a.updatedAt);
      for (const session of loaded) this.sessions.set(session.id, session);

      const settings = (this.storage.loadSettings ? this.storage.loadSettings() : {}) as any;
      if (settings?.defaultSessionId && this.sessions.has(settings.defaultSessionId)) {
        this.designatedDefaultSessionId = settings.defaultSessionId;
        this.activeSessionId = settings.defaultSessionId;
      } else if (loaded.length > 0) {
        this.activeSessionId = loaded[0].id;
        this.designatedDefaultSessionId = loaded[0].id;
      }
    }
  }

  private persistSession(session: ChatSession): void {
    if (this.storage) this.storage.saveSession(session);
  }

  private persistSettings(): void {
    if (this.storage?.saveSettings) {
      this.storage.saveSettings({ defaultSessionId: this.designatedDefaultSessionId });
    }
  }

  public createSession(
    name: string,
    providerId: string = 'ollama',
    model: string = 'llama3',
    systemDirective?: string,
    options?: ChatSessionOptions
  ): ChatSession {
    const id = sanitizeSessionId(name);
    const session = new ChatSession(id, name, providerId, model, systemDirective, options);
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;

    if (!this.designatedDefaultSessionId) {
      this.designatedDefaultSessionId = session.id;
      this.persistSettings();
    }

    this.persistSession(session);
    return session;
  }

  public updateSessionConfig(
    idOrName: string,
    updates: {
      providerId?: string;
      model?: string;
      systemDirective?: string;
      options?: Partial<ChatSessionOptions>;
    }
  ): ChatSession {
    const id = sanitizeSessionId(idOrName);
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session '${idOrName}' not found.`);

    if (updates.providerId) session.providerId = updates.providerId;
    if (updates.model) session.model = updates.model;
    if (updates.systemDirective !== undefined) session.setSystemDirective(updates.systemDirective);
    if (updates.options) session.options = mergeChatOptions(session.options, updates.options);

    session.updatedAt = Date.now();
    this.persistSession(session);
    return session;
  }

  public getActiveSession(): ChatSession | null {
    if (!this.activeSessionId && this.sessions.size > 0) {
      this.activeSessionId = this.designatedDefaultSessionId && this.sessions.has(this.designatedDefaultSessionId)
        ? this.designatedDefaultSessionId
        : Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    }
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  public setActiveSession(idOrName: string): boolean {
    const id = sanitizeSessionId(idOrName);
    const session = this.sessions.get(id) || Array.from(this.sessions.values()).find((s) => s.name.toLowerCase() === idOrName.toLowerCase());

    if (session) {
      this.activeSessionId = session.id;
      this.designatedDefaultSessionId = session.id;
      session.updatedAt = Date.now();
      this.persistSession(session);
      this.persistSettings();
      return true;
    }
    return false;
  }

  public deleteSession(idOrName: string): boolean {
    const id = sanitizeSessionId(idOrName);
    if (this.sessions.has(id)) {
      this.sessions.delete(id);
      if (this.storage) this.storage.deleteSession(id);

      if (this.designatedDefaultSessionId === id) {
        const remaining = Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        this.designatedDefaultSessionId = remaining.length > 0 ? remaining[0].id : undefined;
        this.activeSessionId = this.designatedDefaultSessionId;
        this.persistSettings();
      } else if (this.activeSessionId === id) {
        const remaining = Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        this.activeSessionId = remaining.length > 0 ? remaining[0].id : undefined;
      }
      return true;
    }
    return false;
  }

  public listSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async executeTurn(params: ChatTurnParams): Promise<string> {
    const session = this.sessions.get(params.sessionId) || this.getActiveSession();
    if (!session) throw new Error('No active chat session found. Create a session with "chat new <name>".');

    session.addMessage('user', params.userPrompt, params.images);
    this.persistSession(session);

    const providerId = session.providerId || 'ollama';
    const aiService = this.kernel.getService<AIService>(providerId);
    if (!aiService) throw new Error(`AI Service provider '${providerId}' is not registered or active in HoneyKernel.`);

    const systemMsg = session.messages.find((m) => m.role === 'system');
    const nonSystemMsgs = session.messages.filter((m) => m.role !== 'system');
    const mergedOptions = mergeChatOptions(session.options, params.turnOptions);

    let turnHistory = nonSystemMsgs;
    const historyLimit = mergedOptions.maxHistory;
    if (historyLimit !== undefined && historyLimit !== null && historyLimit >= 0) {
      turnHistory = nonSystemMsgs.slice(Math.max(0, nonSystemMsgs.length - historyLimit));
    }

    const conversationTurns = turnHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const req = buildTextGenRequest(
      session.model,
      conversationTurns,
      systemMsg?.content,
      mergedOptions,
      params.images
    );

    let assistantResponse = '';
    const response = await aiService.generateText(req, (chunk) => {
      assistantResponse += chunk;
      if (params.onChunk) params.onChunk(chunk);
    });

    const finalText = response.text || assistantResponse;
    session.addMessage('assistant', finalText);
    this.persistSession(session);

    return finalText;
  }
}
