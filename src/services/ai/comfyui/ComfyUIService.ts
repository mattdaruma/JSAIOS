/**
 * JSAIOS - Service Driver: ComfyUIService
 * Pure HTTP REST API transport driver for local ComfyUI node workflows.
 */

import { AIService } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../types';
import { checkComfyUIHealth } from './helpers/checkHealth';
import { getComfyUIModels } from './helpers/getModels';
import { generateComfyUIMedia } from './helpers/generateMedia';
import { getComfyUINodeInfo } from './helpers/getNodeInfo';
import { fetchComfyWorkflows } from './helpers/listWorkflows';
import { inspectComfyWorkflow, type WorkflowInspectionResult } from './helpers/inspectWorkflow';
import { buildComfyUIWorkflow } from './helpers/buildWorkflow';
import { handleComfyCLI } from '../../../shell/terminal/commands/comfyCLI';

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
          description: 'Check ComfyUI local server connectivity and health'
        },
        {
          command: 'comfy models',
          description: 'List installed ComfyUI models and checkpoints'
        },
        {
          command: 'comfy workflows',
          description: 'List available preset ComfyUI workflow JSON files'
        },
        {
          command: 'comfy inspect <workflow_id>',
          description: 'Inspect inputs and parameters of a ComfyUI workflow'
        },
        {
          command: 'comfy run <workflow_id> [key=value...]',
          description: 'Execute a ComfyUI workflow and generate media assets'
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
    console.log('[ComfyUIService] Shutting down ComfyUI driver connection.');
  }

  public async getModels(): Promise<ModelInfo[]> {
    return getComfyUIModels(this.baseUrl);
  }

  public async getNodeInfo(nodeClass: string): Promise<Record<string, any>> {
    return getComfyUINodeInfo(this.baseUrl, nodeClass);
  }

  public async listWorkflows(): Promise<string[]> {
    const list = await fetchComfyWorkflows(this.baseUrl);
    return list.map(w => w.id);
  }

  public async getWorkflows(): Promise<string[]> {
    const list = await fetchComfyWorkflows(this.baseUrl);
    return list.map(w => w.id);
  }

  public async inspectWorkflow(workflowId: string): Promise<WorkflowInspectionResult | null> {
    return inspectComfyWorkflow(this.baseUrl, workflowId);
  }

  public async buildWorkflow(workflowId: string, params: Record<string, any>): Promise<Record<string, any>> {
    return buildComfyUIWorkflow(workflowId, params);
  }

  public async generateText(
    _request: TextGenerationRequest,
    _onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse> {
    throw new Error('[ComfyUIService] Direct text generation not supported. Use generateMedia or executeCommand with a workflow for ComfyUI driver.');
  }

  public async generateMedia(
    request: MediaGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse> {
    return generateComfyUIMedia(this.baseUrl, request, onProgress);
  }

  public async executeCommand(args: string[]): Promise<string> {
    return handleComfyCLI(this, args);
  }
}
