import { describe, it, expect, beforeEach } from 'vitest';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { ServiceRegistry } from '../../src/kernel/ServiceRegistry';
import { EventBus } from '../../src/kernel/EventBus';
import { OllamaService } from '../../src/services/ai/ollama/OllamaService';
import { ComfyUIService } from '../../src/services/ai/comfyui/ComfyUIService';
import { TerminalInterpreter } from '../../src/shell/terminal/TerminalInterpreter';

describe('JSAIOS HoneyKernel Core & Service Registry', () => {
  let kernel: HoneyKernel;
  let registry: ServiceRegistry;
  let eventBus: EventBus;

  beforeEach(() => {
    registry = new ServiceRegistry();
    eventBus = new EventBus();
    kernel = new HoneyKernel(registry, eventBus);
  });

  it('should initialize unbooted kernel status', () => {
    const status = kernel.getStatus();
    expect(status.booted).toBe(false);
    expect(status.activeServices.length).toBe(0);
  });

  it('should register micro-services cleanly', async () => {
    const ollama = new OllamaService();
    const comfy = new ComfyUIService();

    kernel.registerService(ollama);
    kernel.registerService(comfy);

    expect(kernel.getService('ollama')).toBe(ollama);
    expect(kernel.getService('comfyui')).toBe(comfy);

    await kernel.boot();

    const status = kernel.getStatus();
    expect(status.booted).toBe(true);
    expect(status.activeServices.length).toBe(2);
  });

  it('should dispatch IPC events via EventBus', () => {
    let receivedPayload: any = null;
    eventBus.subscribe('test:channel', (evt) => {
      receivedPayload = evt.payload;
    });

    eventBus.publish('test:channel', 'testSender', { foo: 'bar' });
    expect(receivedPayload).toEqual({ foo: 'bar' });
  });

  it('should parse CLI terminal commands in TerminalInterpreter', async () => {
    const ollama = new OllamaService();
    kernel.registerService(ollama);
    await kernel.boot();

    const interpreter = new TerminalInterpreter(kernel);

    const helpOutput = await interpreter.execute('help');
    expect(helpOutput).toContain('JSAIOS HoneyKernel Core Terminal Reference');
    expect(helpOutput).toContain('ollama');

    const ollamaHelp = await interpreter.execute('help ollama');
    expect(ollamaHelp).toContain('--think');

    const chatHelp = await interpreter.execute('help chat');
    expect(chatHelp).toContain('JSAIOS Chat Engine');

    const chatHelpAlt = await interpreter.execute('chat help');
    expect(chatHelpAlt).toContain('JSAIOS Chat Engine');

    const statusOutput = await interpreter.execute('status');
    expect(statusOutput).toContain('JSAIOS HoneyKernel Status');
    expect(statusOutput).toContain('ACTIVE');

    const servicesOutput = await interpreter.execute('services');
    expect(servicesOutput).toContain('Ollama Transport Driver');

    const comfy = new ComfyUIService();
    kernel.registerService(comfy);
    const workflowsOutput = await interpreter.execute('comfy workflows');
    expect(workflowsOutput).toBeDefined();

    const optionsOutput = await interpreter.execute('comfy options test_workflow');
    expect(optionsOutput).toContain('test_workflow');
  });
});
