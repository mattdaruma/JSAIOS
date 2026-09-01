/**
 * JSAIOS - Service Driver: CopilotService
 * Pure HTTP REST API transport driver for GitHub Copilot model endpoints.
 */

import type { AIService } from '../AIService';
import type { ServiceDescriptor, ServiceStatus } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../types';
import { checkCopilotHealth } from './helpers/checkHealth';
import { fetchCopilotModels } from './helpers/fetchModels';
import { generateCopilotText } from './helpers/generateText';
import { handleCopilotCLI } from '../../../shell/terminal/commands/copilotCLI';

export class CopilotService implements AIService {
  public readonly id = 'copilot';
  private status: ServiceStatus = 'uninitialized';

  public get descriptor(): ServiceDescriptor {
    return {
      id: this.id,
      name: 'GitHub Copilot AI Service',
      version: '1.0.0',
      status: this.status,
      capabilities: ['text-generation', 'chat', 'code-synthesis'],
      commands: [
        {
          command: 'copilot status',
          description: 'Check Copilot REST API authorization and connectivity'
        },
        {
          command: 'copilot models',
          description: 'List available GitHub Copilot models (gpt-4o, claude-3.5-sonnet, etc.)'
        },
        {
          command: 'copilot prompt <model> [options] <text>',
          description: 'Send prompt to GitHub Copilot model (e.g. gpt-4o)',
          options: [
            { flag: '--system "<text>", -s', description: 'Set custom system directive prompt' }
          ]
        }
      ]
    };
  }

  public async initialize(): Promise<void> {
    this.status = 'initializing';
    const healthy = await this.checkHealth();
    this.status = healthy ? 'running' : 'degraded';
    console.log(`[CopilotService] Driver initialized (status: ${this.status})`);
  }

  public async checkHealth(): Promise<boolean> {
    return checkCopilotHealth();
  }

  public async shutdown(): Promise<void> {
    this.status = 'stopped';
    console.log('[CopilotService] Driver shutdown complete.');
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
    _request: MediaGenerationRequest,
    _onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse> {
    throw new Error('[CopilotService] Direct media generation not supported by Copilot driver.');
  }

  public async executeCommand(args: string[], onChunk?: (chunkText: string) => void): Promise<string> {
    return handleCopilotCLI(this, args, onChunk);
  }
}
