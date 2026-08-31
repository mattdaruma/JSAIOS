/**
 * JSAIOS - Single-purpose class: ChatEngine
 * High-level business logic engine that manages active chat sessions and orchestrates multi-turn chat interactions with HoneyKernel AI providers.
 */

import { HoneyKernel } from '../../kernel/HoneyKernel';
import { ChatSession } from './helpers/ChatSession';
import type { ChatTurnParams } from './helpers/types';
import type { AIService, TextGenerationRequest } from '../../services/ai/AIService';
import { saveSessionToDisk, loadSessionsFromDisk, deleteSessionFromDisk } from './helpers/persistence';
import { sanitizeSessionId } from './helpers/sanitizeId';

export class ChatEngine {
  private kernel: HoneyKernel;
  private storageDir: string;
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId?: string;

  constructor(kernel: HoneyKernel, storageDir: string = 'chat-sessions') {
    this.kernel = kernel;
    this.storageDir = storageDir;
    this.initSessionsFromDisk();
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  private initSessionsFromDisk(): void {
    const loaded = loadSessionsFromDisk(this.storageDir);
    // Sort sessions by most recently updated timestamp descending
    loaded.sort((a, b) => b.updatedAt - a.updatedAt);

    for (const session of loaded) {
      this.sessions.set(session.id, session);
    }

    if (loaded.length > 0) {
      this.activeSessionId = loaded[0].id;
    }
  }

  public createSession(
    name: string = 'default',
    providerId: string = 'ollama',
    model: string = 'llama3',
    systemDirective?: string
  ): ChatSession {
    const id = sanitizeSessionId(name);
    let session = this.sessions.get(id);

    if (session) {
      session.providerId = providerId;
      session.model = model;
      if (systemDirective) session.setSystemDirective(systemDirective);
      session.updatedAt = Date.now();
    } else {
      session = new ChatSession(id, name, providerId, model, systemDirective);
      this.sessions.set(id, session);
    }

    this.activeSessionId = id;
    saveSessionToDisk(this.storageDir, session);
    return session;
  }

  public getActiveSession(): ChatSession | null {
    if (!this.activeSessionId && this.sessions.size > 0) {
      const sorted = Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      this.activeSessionId = sorted[0].id;
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

    // Append user turn
    session.addMessage('user', params.userPrompt, params.images);
    saveSessionToDisk(this.storageDir, session);

    // Resolve provider dynamically (e.g. 'ollama', 'copilot')
    const providerId = session.providerId || 'ollama';
    const aiService = this.kernel.getService<AIService>(providerId);
    if (!aiService) {
      throw new Error(`AI Service provider '${providerId}' is not registered or active in HoneyKernel.`);
    }

    // Build prompt combining sticky system directives, previous turns, and prompt
    const systemMsg = session.messages.find((m) => m.role === 'system');
    const conversationTurns = session.messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const req: TextGenerationRequest = {
      model: session.model,
      prompt: conversationTurns,
      systemDirective: systemMsg?.content,
      images: params.images,
      stream: true
    };

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
