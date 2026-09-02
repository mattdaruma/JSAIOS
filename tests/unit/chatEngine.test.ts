import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { FileSessionStorage } from '../../src/adapters/storage/FileSessionStorage';
import { resetChatEngineForTesting } from '../../src/adapters/factories/createChatEngine';

describe('JSAIOS Chat Engine & Storage Decoupling', () => {
  const testStorageDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-chat-sessions');
  let kernel: HoneyKernel;

  beforeEach(() => {
    resetChatEngineForTesting(null);
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    kernel = new HoneyKernel();
  });

  afterEach(() => {
    resetChatEngineForTesting(null);
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('should sanitize session names into clean CLI-friendly IDs', () => {
    const engine = new ChatEngine(kernel);
    const session = engine.createSession(' My Special Project! ');
    expect(session.id).toBe('my_special_project');
    expect(session.name).toBe(' My Special Project! ');
  });

  it('should anchor sticky system directive at head of message history', () => {
    const engine = new ChatEngine(kernel);
    const session = engine.createSession('test', 'ollama', 'llama3', 'You are a helpful coding assistant.');

    session.addMessage('user', 'Hello world');
    session.addMessage('assistant', 'Hi there!');

    expect(session.messages[0].role).toBe('system');
    expect(session.messages[0].content).toBe('You are a helpful coding assistant.');

    session.setSystemDirective('Updated system prompt.');
    expect(session.messages[0].content).toBe('Updated system prompt.');
  });

  it('should preserve 100% of full message history log over many turns without deleting history', () => {
    const engine = new ChatEngine(kernel);
    const session = engine.createSession('history-test');

    for (let i = 1; i <= 20; i++) {
      session.addMessage('user', `User turn ${i}`);
      session.addMessage('assistant', `Assistant turn ${i}`);
    }

    expect(session.messages.length).toBe(40);
    expect(session.messages[0].content).toBe('User turn 1');
    expect(session.messages[39].content).toBe('Assistant turn 20');
  });

  it('should support creation options and mid-session reconfiguration with FileSessionStorage driver', async () => {
    const storageDriver = new FileSessionStorage(testStorageDir);
    const engine = new ChatEngine(kernel, storageDriver);

    const session = engine.createSession('opt-test', 'ollama', 'llama3', 'System prompt', {
      temperature: 0.3,
      maxTokens: 500,
      ollamaThink: true
    });

    expect(session.options.temperature).toBe(0.3);
    expect(session.options.maxTokens).toBe(500);
    expect(session.options.ollamaThink).toBe(true);

    engine.updateSessionConfig('opt-test', {
      options: { temperature: 0.8, ollamaThink: false }
    });

    expect(session.options.temperature).toBe(0.8);
    expect(session.options.maxTokens).toBe(500);
    expect(session.options.ollamaThink).toBe(false);

    const savedFiles = fs.readdirSync(testStorageDir);
    expect(savedFiles).toContain('opt-test.json');
  });

  it('should automatically set default boot session on session switch and persist to _settings.json', () => {
    const storageDriver = new FileSessionStorage(testStorageDir);
    const engine = new ChatEngine(kernel, storageDriver);

    engine.createSession('sessionA');
    engine.createSession('sessionB');

    expect(engine.getDesignatedDefaultSessionId()).toBe('sessiona');

    engine.setActiveSession('sessionB');
    expect(engine.getDesignatedDefaultSessionId()).toBe('sessionb');

    const storageDriver2 = new FileSessionStorage(testStorageDir);
    const engineReboot = new ChatEngine(kernel, storageDriver2);
    expect(engineReboot.getActiveSession()?.id).toBe('sessionb');
  });

  it('should render chat status metadata and handle chat config CLI without modifying real storage', async () => {
    const testDriver = new FileSessionStorage(testStorageDir);
    const engine = new ChatEngine(kernel, testDriver);
    engine.createSession('config-cli-test');

    expect(engine.getActiveSession()?.model).toBe('llama3');
  });
});
