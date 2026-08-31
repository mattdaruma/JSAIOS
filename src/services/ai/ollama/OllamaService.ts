/**
 * JSAIOS - OllamaService Master Driver Script
 * Clean orchestrator inheriting AIService and calling imported single-purpose functions.
 */

import { AIService } from '../AIService';
import type { ModelInfo, TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import { checkOllamaHealth } from './helpers/checkHealth';
import { fetchOllamaModels } from './helpers/fetchModels';
import { generateOllamaText } from './helpers/generateText';
import { handleOllamaCLI } from '../../../shell/terminal/commands/ollamaCLI';

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
      capabilities: ['text-generation', 'streaming', 'chat', 'model-enumeration'],
      cliCommands: [
        {
          command: 'ollama status',
          description: 'Ping local Ollama LLM provider health'
        },
        {
          command: 'ollama models',
          description: 'List available Ollama models'
        },
        {
          command: 'ollama prompt <model> [options] <text>',
          description: 'Stream raw text prompt to specified Ollama model',
          options: [
            { flag: '--think [true|false]', description: 'Enable or disable reasoning mode (default: true if flag present)' },
            { flag: '--temp <num>, -t', description: 'Set generation temperature (e.g. 0.7)' },
            { flag: '--system "<text>", -s', description: 'Set custom system directive prompt' },
            { flag: '--max-tokens <num>', description: 'Set max response token limit (num_predict)' },
            { flag: '--top-p <num>', description: 'Set top_p sampling threshold' },
            { flag: '--top-k <num>', description: 'Set top_k sampling limit' },
            { flag: '--min-p <num>', description: 'Set min_p sampling threshold' },
            { flag: '--seed <num>', description: 'Set RNG seed' },
            { flag: '--ctx <num>', description: 'Set context window size (num_ctx e.g. 8192)' },
            { flag: '--repeat-penalty <num>', description: 'Set repetition penalty factor' },
            { flag: '--stop "<token>"', description: 'Set stop token sequence' },
            { flag: '--format <json>', description: 'Set output format structure (e.g. json)' },
            { flag: '--raw', description: 'Bypass template formatting' },
            { flag: '--image <path>, -i', description: 'Attach local image file for multimodal LLMs' },
            { flag: '--keep-alive <time>', description: 'Set model unload timeout (e.g. 5m, 0)' }
          ]
        }
      ]
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

  public async executeCLICommand(args: string[], onChunk?: (chunkText: string) => void): Promise<string> {
    return handleOllamaCLI(this, args, onChunk);
  }
}
