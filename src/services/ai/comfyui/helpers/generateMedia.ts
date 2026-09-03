/**
 * JSAIOS - Single-purpose helper: generateComfyUIMedia
 * Fetches target workflow from ComfyUI server, applies default graph baseline values + CLI overrides,
 * and posts execution graph to ComfyUI /prompt endpoint with active client_id.
 */

import type { MediaGenerationRequest, MediaGenerationResponse } from '../../AIService';
import { buildText2ImgWorkflow } from './buildWorkflow';
import { inspectComfyWorkflow } from './inspectWorkflow';
import { applyWorkflowOverrides } from './applyWorkflowOverrides';

export async function generateComfyUIMedia(
  endpoint: string,
  request: MediaGenerationRequest,
  clientId?: string
): Promise<MediaGenerationResponse> {
  let promptGraph: any = undefined;

  const targetWorkflowName = request.workflowName || request.model;

  if (targetWorkflowName) {
    const rawResult = await inspectComfyWorkflow(endpoint, targetWorkflowName);
    if (rawResult) {
      const cleanName = targetWorkflowName.replace(/^["']|["']$/g, '').replace(/\.json$/i, '').trim();
      const encodedSubdirPath = encodeURIComponent(`workflows/${cleanName}.json`);
      try {
        const res = await fetch(`${endpoint}/userdata/${encodedSubdirPath}`);
        if (res.ok) {
          const rawGraph = await res.json();
          promptGraph = applyWorkflowOverrides(rawGraph, request);
        }
      } catch {}
    }
  }

  if (!promptGraph) {
    promptGraph = request.workflowGraph || buildText2ImgWorkflow(request);
  }

  const payload: any = { prompt: promptGraph };
  if (clientId) payload.client_id = clientId;

  const res = await fetch(`${endpoint}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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
