import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ChatSession } from '../../src/engines/chat/helpers/ChatSession';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { FileSessionStorage } from '../../src/shell/terminal/storage/FileSessionStorage';
import { sanitizeSessionId } from '../../src/engines/chat/helpers/sanitizeId';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ServiceRegistry } from '../../src/kernel/ServiceRegistry';
import { EventBus } from '../../src/kernel/EventBus';

const testStorageDir = path.join(process.cwd(), 'tests', 'tmpdir', `chat-test-${Date.now()}`);

afterAll(() => {
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }
});

describe('JSAIOS Chat Engine & Storage Decoupling', () => {
  it('should sanitize session names into clean CLI-friendly IDs', () => {
    expect(sanitizeSessionId('Copilot Chat!')).toBe('copilot_chat');
    expect(sanitizeSessionId('   my-session_1  ')).toBe('my-session_1');
    expect(sanitizeSessionId('!!!')).toBe('default');
  });

  it('should anchor sticky system directive at head of message history', () => {
    const session = new ChatSession('sess_1', 'Test Session', 'ollama', 'llama3', 'You are a helpful coding assistant.');

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].role).toBe('system');
    expect(session.messages[0].sticky).toBe(true);
    expect(session.messages[0].content).toBe('You are a helpful coding assistant.');
  });

  it('should preserve sticky system directive when trimming message log history', () => {
    const session = new ChatSession('sess_1', 'Test Session', 'ollama', 'llama3', 'Sticky System Directive', {
      maxTurns: 2,
      maxChars: 500
    });

    for (let i = 1; i <= 10; i++) {
      session.addMessage('user', `User Turn ${i}`);
      session.addMessage('assistant', `Assistant Turn ${i}`);
    }

    expect(session.messages[0].role).toBe('system');
    expect(session.messages[0].content).toBe('Sticky System Directive');
    expect(session.messages).toHaveLength(5);
  });

  it('should support creation options and mid-session reconfiguration with FileSessionStorage driver', async () => {
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);
    const storageDriver = new FileSessionStorage(testStorageDir);
    const engine = new ChatEngine(kernel, storageDriver);

    const session = engine.createSession('OptionSession', 'ollama', 'llama3', 'System directive', {
      temperature: 0.3,
      maxTokens: 500,
      ollamaThink: true
    });

    expect(session.options.temperature).toBe(0.3);
    expect(session.options.maxTokens).toBe(500);
    expect(session.options.ollamaThink).toBe(true);

    // Reconfigure mid-session
    const reconfigured = engine.updateSessionConfig(session.id, {
      providerId: 'copilot',
      model: 'gpt-4o',
      options: { temperature: 0.9, maxTokens: 1000 }
    });

    expect(reconfigured.providerId).toBe('copilot');
    expect(reconfigured.model).toBe('gpt-4o');
    expect(reconfigured.options.temperature).toBe(0.9);
    expect(reconfigured.options.maxTokens).toBe(1000);
  });

  it('should automatically set default boot session on session switch and persist to _settings.json', async () => {
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);
    const storageDriver = new FileSessionStorage(testStorageDir);
    const engine = new ChatEngine(kernel, storageDriver);

    engine.createSession('SessionA', 'ollama', 'llama3');
    engine.createSession('SessionB', 'copilot', 'gpt-4o');

    // Switch to SessionB -> should auto-set default to SessionB
    const switchSuccess = engine.setActiveSession('SessionB');
    expect(switchSuccess).toBe(true);
    expect(engine.getDesignatedDefaultSessionId()).toBe('sessionb');

    // Verify _settings.json was created
    const settingsPath = path.join(testStorageDir, '_settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
    const settingsRaw = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settingsRaw.defaultSessionId).toBe('sessionb');

    // Re-instantiate engine to test boot selection
    const storageDriver2 = new FileSessionStorage(testStorageDir);
    const engineReboot = new ChatEngine(kernel, storageDriver2);
    expect(engineReboot.getActiveSession()?.id).toBe('sessionb');
  });

  it('should render chat status metadata and handle chat config CLI without modifying real storage', async () => {
    const { handleChatCLI, resetChatEngineForTesting } = await import('../../src/shell/terminal/commands/chatCLI');
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);

    const testDriver = new FileSessionStorage(testStorageDir);
    const testEngine = new ChatEngine(kernel, testDriver);
    resetChatEngineForTesting(testEngine);

    try {
      const statusNoSession = await handleChatCLI(kernel, ['status']);
      expect(statusNoSession).toContain('=== JSAIOS ChatEngine Status ===');

      await handleChatCLI(kernel, ['new', 'TestSessionCLI', '-p', 'copilot', '-m', 'gpt-4o', '--temp', '0.4']);
      const statusWithSession = await handleChatCLI(kernel, ['status']);
      expect(statusWithSession).toContain('Active Session');
      expect(statusWithSession).toContain('Provider');
      expect(statusWithSession).toContain('Model');

      // Test mid-session config via CLI
      const configRes = await handleChatCLI(kernel, ['config', '-m', 'claude-3.5-sonnet', '--temp', '0.8']);
      expect(configRes).toContain('claude-3.5-sonnet');
      expect(configRes).toContain('temperature');

      // Test session switch auto-setting default
      const switchRes = await handleChatCLI(kernel, ['switch', 'TestSessionCLI']);
      expect(switchRes).toContain("Switched active chat session to 'TestSessionCLI'");
    } finally {
      resetChatEngineForTesting(null);
    }
  });
});
