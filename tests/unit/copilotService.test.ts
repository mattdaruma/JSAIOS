import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { CopilotService } from '../../src/services/ai/copilot/CopilotService';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { FileSessionStorage } from '../../src/engines/chat/adapters/FileSessionStorage';
import { handleCopilotCLI } from '../../src/shell/terminal/commands/copilotCLI';

describe('JSAIOS Copilot Service Driver Architecture', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-copilot-sessions');
  let kernel: HoneyKernel;
  let copilotService: CopilotService;

  beforeEach(async () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    kernel = new HoneyKernel();
    copilotService = new CopilotService();
    kernel.registerService(copilotService);
    await kernel.boot();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should initialize Copilot service driver cleanly with correct descriptor capabilities', () => {
    const descriptor = copilotService.descriptor;
    expect(descriptor.id).toBe('copilot');
    expect(descriptor.capabilities).toContain('text-generation');
    expect(descriptor.capabilities).toContain('chat');
  });

  it('should report copilot service CLI status output correctly', async () => {
    const output = await handleCopilotCLI(copilotService, ['status']);
    expect(output).toBeDefined();
    expect(output).toContain('GitHub Copilot Service:');
  });

  it('should return available copilot models list', async () => {
    const models = await copilotService.getModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models.map(m => m.id)).toContain('gpt-4o');
  });

  it('should support switching chat session provider to copilot', async () => {
    const storageDriver = new FileSessionStorage(testDir);
    const chatEngine = new ChatEngine(kernel, storageDriver);

    const session = chatEngine.createSession('copilot-session', 'copilot', 'gpt-4o');
    expect(session.providerId).toBe('copilot');
    expect(session.model).toBe('gpt-4o');
  });
});
