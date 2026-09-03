/**
 * JSAIOS - Service Driver: CopilotService
 * Pure HTTP REST API transport driver for GitHub Copilot model endpoints.
 */

import type { AIService } from '../AIService';
import type { ServiceDescriptor, ServiceStatus } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../AIService';
import { checkCopilotHealth } from './helpers/checkHealth';
import { fetchCopilotModels } from './helpers/fetchModels';
import { generateCopilotText } from './helpers/generateText';

export class CopilotService implements AIService {
  public readonly id = 'copilot';
  private status: ServiceStatus = 'uninitialized';

  public get descriptor(): ServiceDescriptor {
    return {
      id: this.id,
      name: 'GitHub Copilot AI Service',
      version: '1.0.0',
      status: this.status,
      capabilities: ['text-generation', 'chat', 'code-synthesis', 'models-list'],
      commands: [
        {
          command: 'copilot status',
          description: 'Check GitHub Copilot REST API authorization and token status'
        },
        {
          command: 'copilot models',
          description: 'List available GitHub Copilot models (gpt-4o, claude-3.5-sonnet, o3-mini, etc.)'
        },
        {
          command: 'copilot prompt <model> [options] <text>',
          description: 'Send direct prompt turn to a GitHub Copilot model',
          options: [
            { flag: '-s, --system "<text>"', description: 'Set custom system directive prompt' }
          ]
        }
      ]
    };
  }

  public async initialize(): Promise<void> {
    const healthy = await this.checkHealth();
    this.status = healthy ? 'running' : 'degraded';
    console.log(`[CopilotService] Driver initialized (status: ${this.status})`);
  }

  public async shutdown(): Promise<void> {
    this.status = 'stopped';
  }

  public async checkHealth(): Promise<boolean> {
    return checkCopilotHealth();
  }

  public async getModels(): Promise<ModelInfo[]> {
    return fetchCopilotModels();
  }

  public async generateText(
    request: TextGenerationRequest,
    onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse> {
    return generateCopilotText(request, onChunk);
  }

  public async generateMedia(
    request: MediaGenerationRequest
  ): Promise<MediaGenerationResponse> {
    throw new Error('CopilotService does not support media generation.');
  }
}
