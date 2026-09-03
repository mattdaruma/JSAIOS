/**
 * JSAIOS - Service Driver: OllamaService
 * Pure HTTP REST API transport driver for local Ollama LLM provider.
 */

import type { AIService } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../AIService';
import { checkOllamaHealth } from './helpers/checkHealth';
import { fetchOllamaModels } from './helpers/fetchModels';
import { generateOllamaText } from './helpers/generateText';

export class OllamaService implements AIService {
  public readonly id = 'ollama';

  constructor(private baseUrl: string = 'http://localhost:11434') {}

  public get descriptor(): ServiceDescriptor {
    return {
      id: this.id,
      name: 'Ollama Transport Driver',
      version: '1.0.0',
      status: 'running',
      capabilities: ['text-generation', 'streaming', 'chat', 'model-enumeration', 'thinking-mode', 'multimodal'],
      commands: [
        {
          command: 'ollama status',
          description: 'Ping local Ollama LLM provider REST API health'
        },
        {
          command: 'ollama models',
          description: 'List locally pulled Ollama models available for inference'
        },
        {
          command: 'ollama run <model> [options] <prompt>',
          description: 'Send direct prompt turn to an Ollama model with full API options',
          options: [
            { flag: '--think [true|false]', description: 'Toggle model reasoning mode (qwen, deepseek)' },
            { flag: '--temp <float>, -t', description: 'Sampler temperature float (0.0 to 2.0)' },
            { flag: '--system "<text>", -s', description: 'Set custom system directive prompt' },
            { flag: '--num-ctx <int>, --ctx', description: 'Context window size in tokens (e.g. 8192, 32768)' },
            { flag: '--keep-alive <time>', description: 'Model memory keep-alive duration (e.g. 5m, 10m, -1)' },
            { flag: '--max-tokens <int>', description: 'Maximum completion tokens limit (num_predict)' },
            { flag: '--top-p <float>', description: 'Nucleus sampling top-p threshold float' },
            { flag: '--top-k <int>', description: 'Top-k sampling cutoff integer' },
            { flag: '--seed <int>', description: 'Random seed integer for deterministic sampling' },
            { flag: '--repeat-penalty <float>', description: 'Repetition penalty multiplier' },
            { flag: '--format json', description: 'Force structured JSON response formatting' },
            { flag: '--raw', description: 'Bypass prompt template wrapper processing' },
            { flag: '--image <path>, -i', description: 'Attach local image file for multimodal prompt' }
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

  public async getModels(): Promise<ModelInfo[]> {
    return fetchOllamaModels(this.baseUrl);
  }

  public async generateText(
    request: TextGenerationRequest,
    onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse> {
    return generateOllamaText(this.baseUrl, request, onChunk);
  }

  public async generateMedia(
    request: MediaGenerationRequest
  ): Promise<MediaGenerationResponse> {
    throw new Error('OllamaService does not support media generation natively.');
  }
}
