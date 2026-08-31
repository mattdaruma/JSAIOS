import { describe, it, expect } from 'vitest';
import { ChatSession } from '../../src/engines/chat/helpers/ChatSession';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ServiceRegistry } from '../../src/kernel/ServiceRegistry';
import { EventBus } from '../../src/kernel/EventBus';
import { OllamaService } from '../../src/services/ai/ollama/OllamaService';
import { AIService } from '../../src/services/ai/AIService';

class MockSecondaryAIService extends AIService {
  public readonly id = 'mock_provider';
  public descriptor = { id: 'mock_provider', name: 'Mock Provider', version: '1.0.0', status: 'running' as const, capabilities: ['text-generation'] };
  public async initialize(): Promise<void> {}
  public async checkHealth(): Promise<boolean> { return true; }
  public async getModels() { return []; }
  public async generateText() { return { text: 'Secondary Provider Response', done: true }; }
  public async generateMedia() { throw new Error('Not implemented'); }
}

describe('JSAIOS Chat Engine & Provider Agnosticism', () => {
  it('should anchor sticky system directive at head of message history', () => {
    const session = new ChatSession('sess_1', 'Test Session', 'ollama', 'llama3', 'You are a helpful coding assistant.');

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].role).toBe('system');
    expect(session.messages[0].sticky).toBe(true);
    expect(session.messages[0].content).toBe('You are a helpful coding assistant.');
  });

  it('should preserve sticky system directive when trimming message log history', () => {
    const session = new ChatSession('sess_1', 'Test Session', 'ollama', 'llama3', 'Sticky System Directive', {
      maxTurns: 2, // max 2 dynamic turns (4 messages)
      maxChars: 500
    });

    // Add 10 user/assistant turns (20 dynamic messages)
    for (let i = 1; i <= 10; i++) {
      session.addMessage('user', `User Turn ${i}`);
      session.addMessage('assistant', `Assistant Turn ${i}`);
    }

    // System message MUST still be present at index 0
    expect(session.messages[0].role).toBe('system');
    expect(session.messages[0].content).toBe('Sticky System Directive');

    // Dynamic turns should be trimmed down to maxTurns * 2 (4 messages) + 1 sticky system message
    expect(session.messages).toHaveLength(5);
    expect(session.messages[1].content).toBe('User Turn 9');
    expect(session.messages[4].content).toBe('Assistant Turn 10');
  });

  it('should execute chat turns dynamically across multiple AI providers', async () => {
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);
    const ollama = new OllamaService();
    const secondary = new MockSecondaryAIService('http://localhost');

    kernel.registerService(ollama);
    kernel.registerService(secondary);

    const engine = new ChatEngine(kernel);

    // Create session for Ollama
    const ollamaSession = engine.createSession('Ollama Session', 'ollama', 'llama3');
    // Create session for Secondary Provider
    const secondarySession = engine.createSession('Secondary Session', 'mock_provider', 'custom-model');

    expect(ollamaSession.providerId).toBe('ollama');
    expect(secondarySession.providerId).toBe('mock_provider');

    // Mock ollama generateText
    ollama.generateText = async () => ({ text: 'Ollama Response', done: true });

    const res1 = await engine.executeTurn({ sessionId: ollamaSession.id, userPrompt: 'Hi Ollama' });
    expect(res1).toBe('Ollama Response');

    const res2 = await engine.executeTurn({ sessionId: secondarySession.id, userPrompt: 'Hi Secondary' });
    expect(res2).toBe('Secondary Provider Response');
  });

  it('should render chat status metadata in handleChatCLI', async () => {
    const { handleChatCLI } = await import('../../src/shell/terminal/commands/chatCLI');
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);

    const statusNoSession = await handleChatCLI(kernel, ['status']);
    expect(statusNoSession).toContain('=== JSAIOS ChatEngine Status ===');
    expect(statusNoSession).toContain('Active Session : NONE');

    await handleChatCLI(kernel, ['new', 'TestSession', '-p', 'copilot', '-m', 'gpt-4o']);
    const statusWithSession = await handleChatCLI(kernel, ['status']);
    expect(statusWithSession).toContain('Active Session : TestSession');
    expect(statusWithSession).toContain('Provider       : copilot');
    expect(statusWithSession).toContain('Model          : gpt-4o');
  });
});
