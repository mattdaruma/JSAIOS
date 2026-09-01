/**
 * JSAIOS - Chat Engine Core Interfaces & Contracts
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  images?: string[];
  sticky?: boolean;
  timestamp: number;
}

export interface ChatSessionOptions {
  maxTurns?: number;
  maxChars?: number;
  maxHistory?: number;
  // OpenAI Standard Options
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[];
  seed?: number;
  // Ollama-Specific Options
  ollamaThink?: boolean;
  ollamaNumCtx?: number;
  ollamaKeepAlive?: string;
  ollamaRepeatPenalty?: number;
  ollamaTopK?: number;
  ollamaMinP?: number;
}

export interface ChatSessionData {
  id: string;
  name: string;
  providerId: string;
  model: string;
  systemDirective?: string;
  messages: ChatMessage[];
  options: ChatSessionOptions;
  createdAt: number;
  updatedAt: number;
}

export interface ChatTurnParams {
  sessionId: string;
  userPrompt: string;
  images?: string[];
  turnOptions?: Partial<ChatSessionOptions>;
  onChunk?: (chunk: string) => void;
}

export interface ChatEngineSettings {
  defaultSessionId?: string;
  updatedAt?: number;
}

export interface IChatSessionStorage {
  loadSessions(): any[] | Promise<any[]>;
  saveSession(session: any): void | Promise<void>;
  deleteSession(sessionId: string): void | Promise<void>;
  loadSettings?(): ChatEngineSettings | Promise<ChatEngineSettings>;
  saveSettings?(settings: ChatEngineSettings): void | Promise<void>;
}
