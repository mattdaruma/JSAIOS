/**
 * JSAIOS - Single-purpose function: generateComfyUIMedia
 */

import type { MediaGenerationRequest, MediaGenerationResponse } from '../AIService';

export async function generateComfyUIMedia(
  baseUrl: string,
  request: MediaGenerationRequest,
  onProgress?: (percent: number, statusText: string) => void
): Promise<MediaGenerationResponse> {
  if (onProgress) onProgress(10, 'Submitting prompt to ComfyUI...');

  const promptPayload = {
    prompt: {
      "3": {
        "inputs": {
          "seed": request.seed || Math.floor(Math.random() * 1000000),
          "steps": request.steps || 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": { "ckpt_name": "v1-5-pruned-emaonly.safetensors" },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": { "width": request.width || 512, "height": request.height || 512, "batch_size": 1 },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": { "text": request.prompt, "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": { "text": request.negativePrompt || "", "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": { "filename_prefix": "JSAIOS", "images": ["8", 0] },
        "class_type": "SaveImage"
      }
    }
  };

  const res = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promptPayload)
  });

  if (!res.ok) {
    throw new Error(`ComfyUI prompt submission failed with status ${res.status}`);
  }

  const data = await res.json();
  const promptId = data.prompt_id;

  if (onProgress) onProgress(50, `Queued in ComfyUI (Task ID: ${promptId})...`);

  return { taskId: promptId };
}
