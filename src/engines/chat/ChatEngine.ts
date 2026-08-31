/**
 * JSAIOS - Single-purpose class: ChatEngine
 * High-level business logic engine that manages active chat sessions and orchestrates multi-turn chat interactions with HoneyKernel AI providers.
 */

import { HoneyKernel } from '../../kernel/HoneyKernel';
import { ChatSession } from './helpers/ChatSession';
import type { ChatTurnParams, ChatSessionOptions } from './helpers/types';
import type { AIService } from '../../services/ai/AIService';
import { saveSessionToDisk, loadSessionsFromDisk, deleteSessionFromDisk } from './helpers/persistence';
import { loadEngineSettings, saveEngineSettings } from './helpers/settingsPersistence';
import { sanitizeSessionId } from './helpers/sanitizeId';
import { mergeChatOptions, buildTextGenRequest } from './helpers/chatOptions';

export class ChatEngine {
  private kernel: HoneyKernel;
  private storageDir: string;
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId?: string;
  private designatedDefaultSessionId?: string;

  constructor(kernel: HoneyKernel, storageDir: string = 'chat-sessions') {
    this.kernel = kernel;
    this.storageDir = storageDir;
    this.initSessionsFromDisk();
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  public getDesignatedDefaultSessionId(): string | undefined {
    return this.designatedDefaultSessionId;
  }

  private initSessionsFromDisk(): void {
    const loaded = loadSessionsFromDisk(this.storageDir);
    loaded.sort((a, b) => b.updatedAt - a.updatedAt);

    for (const session of loaded) {
      this.sessions.set(session.id, session);
    }

    const settings = loadEngineSettings(this.storageDir);
    if (settings.defaultSessionId && this.sessions.has(settings.defaultSessionId)) {
      this.designatedDefaultSessionId = settings.defaultSessionId;
      this.activeSessionId = settings.defaultSessionId;
    } else if (loaded.length > 0) {
      this.activeSessionId = loaded[0].id;
    }
  }

  public setDefaultSession(idOrName?: string): boolean {
    const target = idOrName || this.activeSessionId;
    if (!target) return false;

    const id = sanitizeSessionId(target);
    if (this.sessions.has(id)) {
      this.designatedDefaultSessionId = id;
      this.activeSessionId = id;
      saveEngineSettings(this.storageDir, { defaultSessionId: id });
      return true;
    }

    const match = Array.from(this.sessions.values()).find((s) => s.name.toLowerCase() === target.toLowerCase());
    if (match) {
      this.designatedDefaultSessionId = match.id;
      this.activeSessionId = match.id;
      saveEngineSettings(this.storageDir, { defaultSessionId: match.id });
      return true;
    }

    return false;
  }

  public createSession(
    name: string = 'default',
    providerId: string = 'ollama',
    model: string = 'llama3',
    systemDirective?: string,
    initialOptions?: Partial<ChatSessionOptions>
  ): ChatSession {
    const id = sanitizeSessionId(name);
    let session = this.sessions.get(id);

    if (session) {
      session.providerId = providerId;
      session.model = model;
      if (systemDirective) session.setSystemDirective(systemDirective);
      if (initialOptions) session.updateOptions(initialOptions);
      session.updatedAt = Date.now();
    } else {
      session = new ChatSession(id, name, providerId, model, systemDirective, initialOptions);
      this.sessions.set(id, session);
    }

    this.activeSessionId = id;
    saveSessionToDisk(this.storageDir, session);

    if (!this.designatedDefaultSessionId) {
      this.setDefaultSession(id);
    }

    return session;
  }

  public updateSessionConfig(
    sessionId: string,
    updates: {
      providerId?: string;
      model?: string;
      systemDirective?: string;
      options?: Partial<ChatSessionOptions>;
    }
  ): ChatSession {
    const session = this.sessions.get(sessionId) || this.getActiveSession();
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    if (updates.providerId) session.providerId = updates.providerId;
    if (updates.model) session.model = updates.model;
    if (updates.systemDirective) session.setSystemDirective(updates.systemDirective);
    if (updates.options) session.updateOptions(updates.options);

    session.updatedAt = Date.now();
    saveSessionToDisk(this.storageDir, session);
    return session;
  }

  public getActiveSession(): ChatSession | null {
    if (!this.activeSessionId && this.sessions.size > 0) {
      if (this.designatedDefaultSessionId && this.sessions.has(this.designatedDefaultSessionId)) {
        this.activeSessionId = this.designatedDefaultSessionId;
      } else {
        const sorted = Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        this.activeSessionId = sorted[0].id;
      }
    }
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  public setActiveSession(idOrName: string): boolean {
    const id = sanitizeSessionId(idOrName);
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      const s = this.sessions.get(id);
      if (s) {
        s.updatedAt = Date.now();
        saveSessionToDisk(this.storageDir, s);
      }
      return true;
    }

    const match = Array.from(this.sessions.values()).find((s) => s.name.toLowerCase() === idOrName.toLowerCase());
    if (match) {
      this.activeSessionId = match.id;
      match.updatedAt = Date.now();
      saveSessionToDisk(this.storageDir, match);
      return true;
    }
    return false;
  }

  public deleteSession(idOrName: string): boolean {
    const id = sanitizeSessionId(idOrName);
    if (this.sessions.has(id)) {
      this.sessions.delete(id);
      deleteSessionFromDisk(this.storageDir, id);

      if (this.designatedDefaultSessionId === id) {
        this.designatedDefaultSessionId = undefined;
        saveEngineSettings(this.storageDir, { defaultSessionId: undefined });
      }

      if (this.activeSessionId === id) {
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
    if (!session) {
      throw new Error('No active chat session found. Create a session with "chat new <name>".');
    }

    session.addMessage('user', params.userPrompt, params.images);
    saveSessionToDisk(this.storageDir, session);

    const providerId = session.providerId || 'ollama';
    const aiService = this.kernel.getService<AIService>(providerId);
    if (!aiService) {
      throw new Error(`AI Service provider '${providerId}' is not registered or active in HoneyKernel.`);
    }

    const systemMsg = session.messages.find((m) => m.role === 'system');
    const conversationTurns = session.messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const mergedOptions = mergeChatOptions(session.options, params.turnOptions);
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
    saveSessionToDisk(this.storageDir, session);

    return finalText;
  }
}
