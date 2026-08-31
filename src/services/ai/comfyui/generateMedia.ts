/**
 * JSAIOS - Single-purpose function: generateComfyUIMedia
 * Dynamically loads workflow graph JSON from config/workflows/ and submits to /prompt.
 */

import fs from 'fs';
import path from 'path';
import type { MediaGenerationRequest, MediaGenerationResponse } from '../AIService';
import { injectWorkflowParameters } from './buildWorkflow';

export async function generateComfyUIMedia(
  baseUrl: string,
  request: MediaGenerationRequest,
  onProgress?: (percent: number, statusText: string) => void,
  customWorkflowTemplate?: Record<string, any>
): Promise<MediaGenerationResponse> {
  if (onProgress) onProgress(10, 'Loading ComfyUI workflow template from config...');

  let template = customWorkflowTemplate;

  if (!template) {
    const workflowName = request.workflowId || 'txt2img';
    const workflowPath = path.resolve(process.cwd(), 'config', 'workflows', `${workflowName}.json`);

    if (!fs.existsSync(workflowPath)) {
      throw new Error(`[ComfyUI Driver] Workflow JSON file not found at: '${workflowPath}'`);
    }

    const rawJson = fs.readFileSync(workflowPath, 'utf-8');
    template = JSON.parse(rawJson);
  }

  const parameterizedWorkflow = injectWorkflowParameters(template!, {
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
