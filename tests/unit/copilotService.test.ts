import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CopilotService } from '../../src/services/ai/copilot/CopilotService';
import { fetchCopilotModels } from '../../src/services/ai/copilot/helpers/fetchModels';
import { fetchCopilotSessionToken } from '../../src/services/ai/copilot/helpers/fetchCopilotToken';
import { ChatEngine } from '../../src/engines/chat/ChatEngine';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ServiceRegistry } from '../../src/kernel/ServiceRegistry';
import { EventBus } from '../../src/kernel/EventBus';

describe('GitHub Copilot AI Service Driver (Pure HTTP REST)', () => {
  it('should handle session token fetch gracefully when token is unconfigured', async () => {
    const orig = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.COPILOT_TOKEN;
    delete process.env.GH_TOKEN;

    try {
      const token = await fetchCopilotSessionToken(true);
      expect(token).toBeNull();
    } finally {
      if (orig) process.env.GITHUB_TOKEN = orig;
    }
  });

  it('should list available Copilot models', async () => {
    const models = await fetchCopilotModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.name === 'default')).toBe(true);
    expect(models.some((m) => m.name === 'gpt-4o')).toBe(true);
  });

  it('should initialize CopilotService driver cleanly', async () => {
    const copilot = new CopilotService();
    expect(copilot.id).toBe('copilot');
    expect(copilot.descriptor.name).toBe('GitHub Copilot AI Service');
  });

  it('should route ChatEngine turns through copilot provider', async () => {
    const registry = new ServiceRegistry();
    const eventBus = new EventBus();
    const kernel = new HoneyKernel(registry, eventBus);
    const copilot = new CopilotService();

    kernel.registerService(copilot);

    const testDir = `test-copilot-sessions-${Date.now()}`;
    const engine = new ChatEngine(kernel, testDir);
    const session = engine.createSession('Copilot Chat', 'copilot', 'default');

    expect(session.providerId).toBe('copilot');

    // Mock copilot generateText
    copilot.generateText = async (_req, onChunk) => {
      if (onChunk) onChunk('Hello from Copilot REST!');
      return { text: 'Hello from Copilot REST!', done: true };
    };

    const response = await engine.executeTurn({
      sessionId: session.id,
      userPrompt: 'Hello Copilot'
    });

    expect(response).toBe('Hello from Copilot REST!');
    expect(session.messages).toHaveLength(2); // user, assistant
    expect(session.messages[1].content).toBe('Hello from Copilot REST!');

    // Cleanup temporary test directory
    const fullDir = path.join(process.cwd(), testDir);
    if (fs.existsSync(fullDir)) fs.rmSync(fullDir, { recursive: true, force: true });
  });
});
