import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ChatSession } from '../../src/engines/chat/helpers/ChatSession';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
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

describe('JSAIOS Chat Engine & Session ID Sanitization', () => {
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

  it('should persist chat session data using sanitized name ID to storage directory on disk', async () => {
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);
    const engine = new ChatEngine(kernel, testStorageDir);

    const session = engine.createSession('My Copilot Session', 'copilot', 'gpt-4o', 'System directive text');
    expect(session.id).toBe('my_copilot_session');

    const fileCreatedPath = path.join(testStorageDir, `${session.id}.json`);
    expect(fs.existsSync(fileCreatedPath)).toBe(true);

    const raw = fs.readFileSync(fileCreatedPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.name).toBe('My Copilot Session');
    expect(parsed.providerId).toBe('copilot');

    // Test reload from disk
    const engine2 = new ChatEngine(kernel, testStorageDir);
    const sessions = engine2.listSessions();
    expect(sessions.some((s) => s.id === 'my_copilot_session')).toBe(true);

    // Delete session from memory and disk
    const deleted = engine2.deleteSession('my_copilot_session');
    expect(deleted).toBe(true);
    expect(fs.existsSync(fileCreatedPath)).toBe(false);
  });

  it('should render chat status metadata in handleChatCLI', async () => {
    const { handleChatCLI } = await import('../../src/shell/terminal/commands/chatCLI');
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);

    const statusNoSession = await handleChatCLI(kernel, ['status']);
    expect(statusNoSession).toContain('=== JSAIOS ChatEngine Status ===');

    await handleChatCLI(kernel, ['new', 'TestSessionCLI', '-p', 'copilot', '-m', 'gpt-4o']);
    const statusWithSession = await handleChatCLI(kernel, ['status']);
    expect(statusWithSession).toContain('Active Session : TestSessionCLI');
    expect(statusWithSession).toContain('Provider       : copilot');
    expect(statusWithSession).toContain('Model          : gpt-4o');
  });
});
