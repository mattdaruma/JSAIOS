/**
 * JSAIOS - Service Driver: ComfyUIService
 * Pure HTTP REST API transport driver for local ComfyUI node workflows.
 */

import { AIService } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../AIService';
import { checkComfyUIHealth } from './helpers/checkHealth';
import { getComfyUIModels } from './helpers/getModels';
import { generateComfyUIMedia } from './helpers/generateMedia';
import { getComfyUINodeInfo } from './helpers/getNodeInfo';
import { fetchComfyWorkflows } from './helpers/listWorkflows';
import { inspectComfyWorkflow, type WorkflowInspectionResult } from './helpers/inspectWorkflow';
import { buildComfyUIWorkflow } from './helpers/buildWorkflow';
import { handleComfyCLI } from './adapters/ComfyCLIAdapter';

export class ComfyUIService extends AIService {
  public readonly id = 'comfyui';

  constructor(private baseUrl: string = 'http://localhost:8188') {
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
      commands: [
        {
          command: 'comfy status',
          description: 'Check status of local ComfyUI server'
        },
        {
          command: 'comfy workflows',
          description: 'List saved workflow templates on server'
        },
        {
          command: 'comfy options <workflow>',
          description: 'Inspect exposed input parameters for workflow template'
        },
        {
          command: 'comfy prompt [options] <text>',
          description: 'Submit media generation task to ComfyUI',
          options: [
            { flag: '--neg "<prompt>"', description: 'Negative prompt string' },
            { flag: '--steps <num>', description: 'Denoising sampler steps integer' },
            { flag: '--cfg <num>', description: 'Classifier-free guidance float' },
            { flag: '--width <num>', description: 'Output image width pixels' },
            { flag: '--height <num>', description: 'Output image height pixels' },
            { flag: '--seed <num>', description: 'Random seed integer' },
            { flag: '--sampler <name>', description: 'Sampler name (euler, dpmpp_2m, etc.)' },
            { flag: '--ckpt <name>', description: 'Model checkpoint safetensors filename' }
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

  public async getModels(): Promise<ModelInfo[]> {
    return getComfyUIModels(this.baseUrl);
  }

  public async getNodeInfo(nodeName?: string): Promise<any[]> {
    return getComfyUINodeInfo(this.baseUrl, nodeName);
  }

  public async getWorkflows(): Promise<string[]> {
    return fetchComfyWorkflows(this.baseUrl);
  }

  public async inspectWorkflow(workflowId: string): Promise<WorkflowInspectionResult | null> {
    return inspectComfyWorkflow(this.baseUrl, workflowId);
  }

  public async generateText(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    throw new Error('ComfyUIService does not support pure text generation. Use generateMedia instead.');
  }

  public async generateMedia(
    request: MediaGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse> {
    const promptGraph = buildComfyUIWorkflow(request.workflowId || 'default', request);
    return generateComfyUIMedia(this.baseUrl, promptGraph, onProgress);
  }

  public async executeCommand(args: string[], onStreamChunk?: (chunkText: string) => void): Promise<string> {
    return handleComfyCLI(this, args);
  }
}
