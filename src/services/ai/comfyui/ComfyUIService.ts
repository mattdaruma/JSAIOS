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
      ],
      cliCommands: [
        {
          command: 'comfy status',
          description: 'Ping local ComfyUI provider health'
        },
        {
          command: 'comfy workflows',
          description: 'List local JSON workflow templates in config/workflows/'
        },
        {
          command: 'comfy nodes [filter]',
          description: 'List available ComfyUI graph nodes from /object_info'
        },
        {
          command: 'comfy node <name>',
          description: 'Inspect input/output schema for a specific node type'
        },
        {
          command: 'comfy prompt [options] <text>',
          description: 'Trigger workflow execution in ComfyUI',
          options: [
            { flag: '--neg "<text>"', description: 'Set negative prompt text' },
            { flag: '--steps <num>', description: 'Set KSampler steps (default: 20)' },
            { flag: '--cfg <num>', description: 'Set KSampler CFG scale (default: 8.0)' },
            { flag: '--width <num>', description: 'Set image width (default: 512)' },
            { flag: '--height <num>', description: 'Set image height (default: 512)' },
            { flag: '--seed <num>', description: 'Set random noise seed' },
            { flag: '--sampler <name>', description: 'Set KSampler algorithm (e.g. euler)' },
            { flag: '--ckpt <name>', description: 'Set Checkpoint model filename' }
          ]
        }
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
