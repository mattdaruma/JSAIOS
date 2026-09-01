/**
 * JSAIOS - Single-purpose adapter: BrowserLocalAdapter
 * In-browser client adapter for Mode B (Standalone In-Browser Kernel).
 * Runs HoneyKernel, ChatEngine, and LocalStorageSessionStorage directly in browser memory.
 * ZERO imports from terminal shell files.
 */

import { HoneyKernel } from '../../../kernel/HoneyKernel';
import { OllamaService } from '../../../services/ai/ollama/OllamaService';
import { ComfyUIService } from '../../../services/ai/comfyui/ComfyUIService';
import { CopilotService } from '../../../services/ai/copilot/CopilotService';
import { ChatEngine } from '../../../engines/chat/ChatEngine';
import { LocalStorageSessionStorage } from '../../../engines/chat/adapters/LocalStorageSessionStorage';
import { BrowserLocalCommandDispatcher } from '../helpers/BrowserLocalCommandDispatcher';

export class BrowserLocalAdapter {
  private kernel: HoneyKernel;
  private chatEngine: ChatEngine;
  private dispatcher: BrowserLocalCommandDispatcher;
  private isInitialized = false;

  constructor() {
    this.kernel = new HoneyKernel();

    // Register AI REST transport drivers
    this.kernel.registerService(new OllamaService());
    this.kernel.registerService(new ComfyUIService());
    this.kernel.registerService(new CopilotService());

    // Initialize ChatEngine with LocalStorageSessionStorage
    const storageDriver = new LocalStorageSessionStorage();
    this.chatEngine = new ChatEngine(this.kernel, storageDriver);
    this.dispatcher = new BrowserLocalCommandDispatcher(this.kernel, this.chatEngine);
  }

  public async boot(): Promise<void> {
    if (this.isInitialized) return;
    console.log('[BrowserLocalAdapter] Booting in-browser HoneyKernel Core (Mode B)...');
    await this.kernel.boot();
    await this.chatEngine.initializeDefaultSession();
    this.isInitialized = true;
    console.log('[BrowserLocalAdapter] HoneyKernel booted cleanly in browser memory.');
  }

  public async fetchStatus(): Promise<{ booted: boolean; activeSession?: { name: string; providerId: string; model: string } }> {
    if (!this.isInitialized) await this.boot();
    const active = this.chatEngine.getActiveSession();
    return {
      booted: this.kernel.getStatus().booted,
      activeSession: active ? { name: active.name, providerId: active.providerId, model: active.model } : undefined
    };
  }

  public async executeCommandStream(
    input: string,
    onChunk?: (chunkText: string) => void
  ): Promise<string> {
    if (!this.isInitialized) await this.boot();
    return this.dispatcher.execute(input, onChunk);
  }
}
