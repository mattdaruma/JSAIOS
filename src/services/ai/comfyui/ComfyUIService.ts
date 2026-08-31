/**
 * JSAIOS - ComfyUIService Master Driver Script
 * Clean orchestrator inheriting AIService and calling imported single-purpose functions.
 */

import { AIService } from '../AIService';
import type { ModelInfo, TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import { checkComfyUIHealth } from './checkHealth';
import { fetchComfyUIModels } from './getModels';
import { generateComfyUIMedia } from './generateMedia';
import { listLocalWorkflows, WorkflowFileInfo } from './listWorkflows';
import { fetchComfyNodeInfo, ComfyNodeSchema } from './getNodeInfo';

export class ComfyUIService extends AIService {
  public readonly id = 'comfyui';
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8188') {
    super();
    this.baseUrl = baseUrl;
  }

  public get descriptor(): ServiceDescriptor {
    return {
      id: this.id,
      name: 'ComfyUI Transport Driver',
      version: '1.0.0',
      status: 'running',
      capabilities: [
        'workflow-execution',
        'media-generation',
        'image-synthesis',
        'video-synthesis',
        'audio-synthesis',
        '3d-synthesis'
      ]
    };
  }

  public async initialize(): Promise<void> {
    console.log(`[ComfyUIService] Driver initialized (endpoint: ${this.baseUrl})`);
  }

  public async checkHealth(): Promise<boolean> {
    return checkComfyUIHealth(this.baseUrl);
  }

  public async shutdown(): Promise<void> {
    console.log('[ComfyUIService] Driver shutdown.');
  }

  public async getModels(): Promise<ModelInfo[]> {
    return fetchComfyUIModels(this.baseUrl);
  }

  public getWorkflows(): WorkflowFileInfo[] {
    return listLocalWorkflows();
  }

  public async getNodeInfo(nodeName?: string): Promise<ComfyNodeSchema[]> {
    return fetchComfyNodeInfo(this.baseUrl, nodeName);
  }

  public async generateText(
    _request: TextGenerationRequest,
    _onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse> {
    throw new Error('[ComfyUIService] Text generation not supported by ComfyUI driver.');
  }

  public async generateMedia(
    request: MediaGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse> {
    return generateComfyUIMedia(this.baseUrl, request, onProgress);
  }
}
