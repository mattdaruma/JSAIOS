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
      capabilities: ['text-generation', 'streaming', 'chat', 'model-enumeration', 'thinking-mode'],
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
          command: 'ollama run <model> <prompt>',
          description: 'Send direct prompt turn to an Ollama model',
          options: [
            { flag: '--think [true|false]', description: 'Toggle model thinking/reasoning mode (qwen, deepseek)' }
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
