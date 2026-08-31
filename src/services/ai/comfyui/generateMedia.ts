/**
 * JSAIOS - Single-purpose function: generateComfyUIMedia
 * Submits dynamic ComfyUI workflow graph payload to /prompt.
 */

import type { MediaGenerationRequest, MediaGenerationResponse } from '../AIService';
import { injectWorkflowParameters } from './buildWorkflow';
import defaultTxt2ImgWorkflow from './workflows/txt2img.json';

export async function generateComfyUIMedia(
  baseUrl: string,
  request: MediaGenerationRequest,
  onProgress?: (percent: number, statusText: string) => void,
  customWorkflowTemplate?: Record<string, any>
): Promise<MediaGenerationResponse> {
  if (onProgress) onProgress(10, 'Building ComfyUI workflow graph...');

  const template = customWorkflowTemplate || defaultTxt2ImgWorkflow;

  const parameterizedWorkflow = injectWorkflowParameters(template, {
    prompt: request.prompt,
    negativePrompt: request.negativePrompt,
    seed: request.seed || Math.floor(Math.random() * 1000000),
    steps: request.steps || 20,
    cfg: request.cfg,
    width: request.width || 512,
    height: request.height || 512,
    samplerName: request.samplerName,
    scheduler: request.scheduler,
    checkpoint: request.checkpoint
  });

  if (onProgress) onProgress(30, 'Submitting compiled workflow graph to ComfyUI...');

  const res = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: parameterizedWorkflow })
  });

  if (!res.ok) {
    throw new Error(`ComfyUI prompt submission failed with status ${res.status}`);
  }

  const data = await res.json();
  const promptId = data.prompt_id;

  if (onProgress) onProgress(50, `Queued in ComfyUI (Task ID: ${promptId})...`);

  return { taskId: promptId };
}
