/**
 * JSAIOS - Single-purpose helper: generateComfyUIMedia
 * Posts workflow execution graph to ComfyUI /prompt endpoint.
 */

import type { MediaGenerationRequest, MediaGenerationResponse } from '../../AIService';
import { buildText2ImgWorkflow } from './buildWorkflow';

export async function generateComfyUIMedia(
  endpoint: string,
  request: MediaGenerationRequest
): Promise<MediaGenerationResponse> {
  const promptGraph = request.workflowGraph || buildText2ImgWorkflow(request);

  const res = await fetch(`${endpoint}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptGraph })
  });

  if (!res.ok) {
    throw new Error(`ComfyUI prompt submission failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const promptId = data.prompt_id || data.number;

  return {
    taskId: String(promptId),
    status: 'queued'
  };
}
