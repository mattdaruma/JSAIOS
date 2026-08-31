/**
 * JSAIOS - AIService Abstract Base Class
 * Platform-agnostic contract for all AI providers (Ollama, ComfyUI, etc.).
 */

import type { IKernelService, ServiceDescriptor } from '../../kernel/types';

export interface ModelInfo {
  id: string;
  name: string;
  family?: string;
  sizeBytes?: number;
  modifiedAt?: string;
}

export interface TextGenerationRequest {
  model: string;
  prompt: string;
  systemDirective?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  typicalP?: number;
  repeatPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  numCtx?: number;
  stop?: string[];
  maxTokens?: number;
  think?: boolean;
  raw?: boolean;
  format?: string;
  keepAlive?: string;
  stream?: boolean;
  images?: string[];
  options?: Record<string, any>;
}

export interface TextGenerationResponse {
  text: string;
  done: boolean;
  tokensEvaluated?: number;
  tokensGenerated?: number;
}

export interface MediaGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  samplerName?: string;
  scheduler?: string;
  checkpoint?: string;
  workflowId?: string;
}

export interface MediaGenerationResponse {
  mediaUrl?: string;
  blob?: Blob;
  mimeType?: string;
  taskId?: string;
}

export abstract class AIService implements IKernelService {
  public abstract readonly id: string;
  public abstract readonly descriptor: ServiceDescriptor;

  public abstract initialize(): Promise<void>;
  public abstract checkHealth(): Promise<boolean>;
  public abstract shutdown(): Promise<void>;
  public abstract getModels(): Promise<ModelInfo[]>;

  public abstract generateText(
    request: TextGenerationRequest,
    onChunk?: (chunkText: string) => void
  ): Promise<TextGenerationResponse>;

  public abstract generateMedia(
    request: MediaGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<MediaGenerationResponse>;
}
