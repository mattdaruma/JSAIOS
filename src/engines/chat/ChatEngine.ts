/**
 * JSAIOS - Core Domain Engine: ChatEngine
 * Platform-agnostic multi-turn AI chat orchestration engine with optional Context Pack and Workflow Chain associations.
 */

import { ChatSession } from './helpers/ChatSession';
import { mergeChatOptions, buildTextGenRequest } from './helpers/chatOptions';
import { sanitizeSessionId } from './helpers/sanitizeId';
import type { ChatTurnParams, ChatSessionOptions, IChatSessionStorage } from './helpers/types';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { AIService } from '../../services/ai/AIService';
import type { ContextEngine } from '../context/ContextEngine';
import type { ChainEngine } from '../chain/ChainEngine';

export class ChatEngine {
  private kernel: HoneyKernel;
  private storage?: IChatSessionStorage;
  private contextEngine?: ContextEngine;
  private chainEngine?: ChainEngine;
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId?: string;
  private designatedDefaultSessionId?: string;

  constructor(
    kernel: HoneyKernel,
    storage?: IChatSessionStorage,
    contextEngine?: ContextEngine,
    chainEngine?: ChainEngine
  ) {
    this.kernel = kernel;
    this.storage = storage;
    this.contextEngine = contextEngine;
    this.chainEngine = chainEngine;
    this.initSessionsFromStorage();
  }

  public setDependencies(contextEngine?: ContextEngine, chainEngine?: ChainEngine): void {
    if (contextEngine) this.contextEngine = contextEngine;
    if (chainEngine) this.chainEngine = chainEngine;
  }

  public getStorage(): IChatSessionStorage | undefined { return this.storage; }
  public getDesignatedDefaultSessionId(): string | undefined { return this.designatedDefaultSessionId; }

  private initSessionsFromStorage(): void {
    if (!this.storage) return;

    const loaded = (this.storage.loadSessions() || []) as any[];
    if (Array.isArray(loaded)) {
      loaded.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      for (const item of loaded) {
        const session = item instanceof ChatSession ? item : ChatSession.fromJSON(item);
        this.sessions.set(session.id, session);
      }

      const settings = (this.storage.loadSettings ? this.storage.loadSettings() : {}) as any;
      if (settings?.defaultSessionId && this.sessions.has(settings.defaultSessionId)) {
        this.designatedDefaultSessionId = settings.defaultSessionId;
        this.activeSessionId = settings.defaultSessionId;
      } else if (this.sessions.size > 0) {
        const firstId = Array.from(this.sessions.keys())[0];
        this.activeSessionId = firstId;
        this.designatedDefaultSessionId = firstId;
      }
    }
  }

  private persistSession(session: ChatSession): void { if (this.storage) this.storage.saveSession(session.toJSON()); }
  private persistSettings(): void { if (this.storage?.saveSettings) this.storage.saveSettings({ defaultSessionId: this.designatedDefaultSessionId }); }

  public createSession(
    name: string,
    providerId: string = 'ollama',
    model: string = 'llama3',
    systemDirective?: string,
    options?: ChatSessionOptions
  ): ChatSession {
    const id = sanitizeSessionId(name);
    const isUnconfigured = providerId === 'none' || providerId === 'null';
    const targetProviderId = options?.chainId || isUnconfigured ? undefined : providerId;
    const targetModel = options?.chainId || isUnconfigured ? undefined : model;
    const session = new ChatSession(id, name, targetProviderId, targetModel, systemDirective, options);
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

    if (updates.options) session.updateOptions(updates.options);
    if (updates.providerId) {
      session.providerId = updates.providerId;
      session.chainId = undefined;
      if (session.options) session.options.chainId = undefined;
    }
    if (updates.model) {
      session.model = updates.model;
      session.chainId = undefined;
      if (session.options) session.options.chainId = undefined;
    }
    if (updates.systemDirective) session.setSystemDirective(updates.systemDirective);

    session.updatedAt = Date.now();
    this.persistSession(session);
    return session;
  }

  public getActiveSession(): ChatSession | undefined {
    if (this.activeSessionId && this.sessions.has(this.activeSessionId)) {
      return this.sessions.get(this.activeSessionId);
    }
    const all = Array.from(this.sessions.values());
    if (all.length > 0) {
      this.activeSessionId = all[0].id;
      return all[0];
    }
    return undefined;
  }

  public setActiveSession(idOrName: string): boolean {
    const id = sanitizeSessionId(idOrName);
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      this.designatedDefaultSessionId = id;
      this.persistSettings();
      return true;
    }
    return false;
  }

  public getSessionHistory(idOrName: string): any[] | undefined { return this.sessions.get(sanitizeSessionId(idOrName))?.messages; }

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

  public listSessions(): ChatSession[] { return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt); }

  public async executeTurn(params: ChatTurnParams): Promise<string> {
    const session = this.sessions.get(params.sessionId) || this.getActiveSession();
    if (!session) throw new Error('No active chat session found. Create a session with "chat new <name>".');

    session.addMessage('user', params.userPrompt, params.images);
    this.persistSession(session);

    const mergedOptions = mergeChatOptions(session.options, params.turnOptions);
    const targetChainId = mergedOptions.chainId || session.chainId;

    // Delegate to Workflow Chain Engine if a chain association exists
    if (targetChainId && this.chainEngine) {
      const chainSummary = await this.chainEngine.executeChain({
        chainId: targetChainId,
        sessionId: session.id,
        userPrompt: params.userPrompt
      });
      const chainOutput = chainSummary.finalOutput || `[Chain '${targetChainId}' completed successfully]`;
      session.addMessage('assistant', chainOutput);
      this.persistSession(session);
      return chainOutput;
    }

    const providerId = params.providerId || session.providerId;
    if (!providerId) {
      throw new Error(`Chat session '${session.id}' is unconfigured. Specify a provider/model ('chat config -p <provider> -m <model>') or link a chain ('chat config --chain <id>').`);
    }

    const aiService = this.kernel.getService<AIService>(providerId);
    if (!aiService) throw new Error(`AI Service provider '${providerId}' is not registered or active in HoneyKernel.`);

    let systemMsgContent = session.messages.find((m) => m.role === 'system')?.content;
    const targetPackId = mergedOptions.contextPackId || session.contextPackId;

    // Dynamically assemble Context Pack system prompt if associated
    if (targetPackId && this.contextEngine) {
      const assembled = this.contextEngine.assembleContext({ packId: targetPackId });
      if (assembled.systemPrompt) {
        systemMsgContent = assembled.systemPrompt;
      }
    }

    const nonSystemMsgs = session.messages.filter((m) => m.role !== 'system');
    let turnHistory = nonSystemMsgs;
    const historyLimit = mergedOptions.maxHistory;
    if (historyLimit !== undefined && historyLimit !== null && historyLimit >= 0) {
      turnHistory = nonSystemMsgs.slice(Math.max(0, nonSystemMsgs.length - historyLimit));
    }

    const conversationTurns = turnHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const targetModel = params.model || session.model || 'llama3';
    const req = buildTextGenRequest(
      targetModel,
      conversationTurns,
      systemMsgContent,
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
