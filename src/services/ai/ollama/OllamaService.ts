/**
 * JSAIOS - OllamaService Master Driver Script
 * Clean orchestrator inheriting AIService and calling imported single-purpose functions.
 * Manages active AbortController instances for graceful resource cleanup on shutdown.
 */

import { AIService } from '../AIService';
import type { ModelInfo, TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import { checkOllamaHealth } from './checkHealth';
import { fetchOllamaModels } from './fetchModels';
import { generateOllamaText } from './generateText';

export class OllamaService extends AIService {
  public readonly id = 'ollama';
  private baseUrl: string;
  private activeControllers: Set<AbortController> = new Set();

  constructor(baseUrl: string = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl;
  }

  public get descriptor(): ServiceDescriptor {
    return {
      id: this.id,
      name: 'Ollama Transport Driver',
      version: '1.0.0',
      status: 'running',
      capabilities: ['text-generation', 'streaming', 'chat', 'model-enumeration']
    };
  }

  public async initialize(): Promise<void> {
    console.log(`[OllamaService] Driver initialized (endpoint: ${this.baseUrl})`);
  }

  public async checkHealth(): Promise<boolean> {
    return checkOllamaHealth(this.baseUrl);
  }

  public async shutdown(): Promise<void> {
    console.log(`[OllamaService] Aborting ${this.activeControllers.size} active request(s)...`);
    for (const controller of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
    console.log('[OllamaService] Driver shutdown complete.');
  }

  public async getModels(): Promise<ModelInfo[]> {
    return fetchOllamaModels(this.baseUrl);
  }

  public async generateText(
    request: TextGenerationRequest,
    onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse> {
    const controller = new AbortController();
    this.activeControllers.add(controller);

    try {
      const response = await generateOllamaText(this.baseUrl, request, onChunk, controller.signal);
      return response;
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  public async generateMedia(
    _request: MediaGenerationRequest,
    _onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse> {
    throw new Error('[OllamaService] Media generation not supported by Ollama driver.');
  }
}
