/**
 * JSAIOS - Service Driver: ComfyUIService
 * Pure HTTP REST & WebSocket transport driver for local ComfyUI node graph execution server.
 * Supports configurable enableWebSocket feature flag (defaults to true).
 */

import type { AIService } from '../AIService';
import type { ServiceDescriptor } from '../../../kernel/types';
import type { TextGenerationRequest, TextGenerationResponse, MediaGenerationRequest, MediaGenerationResponse, ModelInfo } from '../AIService';
import { checkComfyUIHealth } from './helpers/checkHealth';
import { getComfyUIModels } from './helpers/getModels';
import { getComfyUINodeInfo } from './helpers/getNodeInfo';
import { fetchComfyWorkflows } from './helpers/listWorkflows';
import { inspectComfyWorkflow, type WorkflowInspectionResult } from './helpers/inspectWorkflow';
import { generateComfyUIMedia } from './helpers/generateMedia';
import { connectComfyWebSocket, type ComfyWebSocketController } from './helpers/connectComfyWebSocket';

export interface ComfyUIServiceConfig {
  baseUrl?: string;
  enableWebSocket?: boolean;
}

export class ComfyUIService implements AIService {
  public readonly id = 'comfyui';
  private baseUrl: string;
  private enableWebSocket: boolean;
  private wsController: ComfyWebSocketController | null = null;
  private onLogCallback?: (msg: string) => void;

  constructor(
    configOrBaseUrl: string | ComfyUIServiceConfig = 'http://localhost:8188',
    enableWebSocket: boolean = true
  ) {
    if (typeof configOrBaseUrl === 'string') {
      this.baseUrl = configOrBaseUrl;
      this.enableWebSocket = enableWebSocket;
    } else {
      this.baseUrl = configOrBaseUrl.baseUrl || 'http://localhost:8188';
      this.enableWebSocket = configOrBaseUrl.enableWebSocket !== false;
    }
  }

  public setLogHandler(handler?: (msg: string) => void): void {
    this.onLogCallback = handler;
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
        '3d-synthesis',
        'websocket-events'
      ],
      commands: [
        {
          command: 'comfy status',
          description: 'Check connectivity and health of local ComfyUI server'
        },
        {
          command: 'comfy models',
          description: 'List installed model checkpoints on local ComfyUI server'
        },
        {
          command: 'comfy workflows',
          description: 'List saved node workflow templates on local ComfyUI server'
        },
        {
          command: 'comfy options <workflow>',
          description: 'Inspect exposed input parameters and node structure for workflow template'
        },
        {
          command: 'comfy prompt <workflow> [options]',
          description: 'Submit execution graph to ComfyUI node pipeline (options are dynamic per workflow; use \'comfy options <workflow>\' to inspect)'
        }
      ]
    };
  }

  public async initialize(): Promise<void> {
    console.log(`[ComfyUIService] Driver initialized (endpoint: ${this.baseUrl}, enableWebSocket: ${this.enableWebSocket})`);
    if (this.enableWebSocket) {
      this.wsController = connectComfyWebSocket(
        this.baseUrl,
        undefined,
        (msg) => {
          if (this.onLogCallback) this.onLogCallback(msg);
          else console.log(msg);
        }
      );
    }
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

  public async getWorkflows(): Promise<any[]> {
    return fetchComfyWorkflows(this.baseUrl);
  }

  public async inspectWorkflow(workflowId: string): Promise<WorkflowInspectionResult | null> {
    return inspectComfyWorkflow(this.baseUrl, workflowId);
  }

  public async generateText(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    throw new Error('ComfyUIService does not support direct text generation natively. Use generateMedia().');
  }

  public async generateMedia(
    request: MediaGenerationRequest
  ): Promise<MediaGenerationResponse> {
    const clientId = this.wsController?.clientId;
    return generateComfyUIMedia(this.baseUrl, request, clientId);
  }

  public shutdown(): void {
    if (this.wsController) {
      this.wsController.close();
      this.wsController = null;
    }
  }
}
