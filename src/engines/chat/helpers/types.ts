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
  onChunk?: (chunk: string) => void;
}
