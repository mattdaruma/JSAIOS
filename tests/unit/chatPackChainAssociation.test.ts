import { describe, it, expect } from 'vitest';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { ContextEngine } from '../../src/engines/context/ContextEngine';
import { ChainEngine } from '../../src/engines/chain/ChainEngine';
import { InMemorySessionStorage } from '../../src/adapters/storage/InMemorySessionStorage';
import { handleChatSessions } from '../../src/adapters/terminal/chat/handleChatSessions';
import { handleChatStatus } from '../../src/adapters/terminal/chat/handleChatStatus';
import { parseChatCLIArgs } from '../../src/engines/chat/helpers/chatOptions';

describe('Chat Session Associations with Context Packs and Workflow Chains', () => {
  it('should parse --pack and --chain flags in parseChatCLIArgs', () => {
    const tokens = ['my-session', '--pack', 'sec-audit-pack', '--chain', 'multi-pass-chain'];
    const parsed = parseChatCLIArgs(tokens);

    expect(parsed.options.contextPackId).toBe('sec-audit-pack');
    expect(parsed.options.chainId).toBe('multi-pass-chain');
  });

  it('should create and persist chat sessions with associated Context Pack and Chain IDs', () => {
    const kernel = new HoneyKernel();
    const storage = new InMemorySessionStorage();
    const chatEngine = new ChatEngine(kernel, storage);

    const session = chatEngine.createSession('test-assoc', 'ollama', 'llama3', undefined, {
      contextPackId: 'dev-pack-1',
      chainId: 'review-chain-1'
    });

    expect(session.contextPackId).toBe('dev-pack-1');
    expect(session.chainId).toBe('review-chain-1');

    const listOutput = handleChatSessions(chatEngine, 'list', []);
    expect(listOutput).toContain('Pack: dev-pack-1');
    expect(listOutput).toContain('Chain: review-chain-1');
  });

  it('should update and clear session context pack and chain options mid-session via updateSessionConfig', () => {
    const kernel = new HoneyKernel();
    const storage = new InMemorySessionStorage();
    const chatEngine = new ChatEngine(kernel, storage);

    const session = chatEngine.createSession('dynamic-assoc');
    expect(session.contextPackId).toBeUndefined();

    chatEngine.updateSessionConfig('dynamic-assoc', {
      options: {
        contextPackId: 'qa-pack',
        chainId: 'qa-chain'
      }
    });

    const updated = chatEngine.getActiveSession();
    expect(updated?.contextPackId).toBe('qa-pack');
    expect(updated?.chainId).toBe('qa-chain');

    const statusOutput = handleChatStatus(chatEngine);
    expect(statusOutput).toContain('qa-pack');
    expect(statusOutput).toContain('qa-chain');

    // Test clearing via --pack none --chain none
    const clearParsed = parseChatCLIArgs(['chat', 'config', '--pack', 'none', '--chain', 'none']);
    chatEngine.updateSessionConfig('dynamic-assoc', {
      options: clearParsed.options
    });

    const cleared = chatEngine.getActiveSession();
    expect(cleared?.contextPackId).toBeUndefined();
    expect(cleared?.chainId).toBeUndefined();
  });

  it('should dynamically assemble Context Pack system prompt during turn execution', async () => {
    const kernel = new HoneyKernel();
    const storage = new InMemorySessionStorage();
    const contextEngine = new ContextEngine();
    const chatEngine = new ChatEngine(kernel, storage, contextEngine);

    // Register a mock context pack
    contextEngine.registerTemplate({
      id: 'sys-tmpl',
      name: 'System Template',
      template: 'You are a senior security auditor.'
    });
    contextEngine.createPack('sec-pack', 'Security Pack');
    contextEngine.addPromptToPack('sec-pack', { id: 'item1', promptId: 'sys-tmpl', priority: 1 });

    const session = chatEngine.createSession('sec-session', 'mock', 'mock', undefined, {
      contextPackId: 'sec-pack'
    });

    // Mock AI Service
    let capturedRequestSystemPrompt: string | undefined;
    kernel.registerService({
      id: 'mock',
      descriptor: { id: 'mock', name: 'Mock', version: '1.0', status: 'running', capabilities: [], commands: [] },
      initialize: async () => {},
      checkHealth: async () => true,
      getModels: async () => [],
      generateText: async (req: any) => {
        capturedRequestSystemPrompt = req.systemDirective;
        return { text: 'Audit clean.' };
      }
    } as any);

    await chatEngine.executeTurn({
      sessionId: session.id,
      userPrompt: 'Check code safety'
    });

    expect(capturedRequestSystemPrompt).toBe('You are a senior security auditor.');
  });
});
