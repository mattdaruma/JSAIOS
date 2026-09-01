/**
 * JSAIOS - Single-purpose helper: buildText2ImgWorkflow
 * Constructs standard ComfyUI text-to-image workflow prompt graph JSON.
 */

import type { MediaGenerationRequest } from '../../AIService';

export function buildText2ImgWorkflow(request: MediaGenerationRequest): Record<string, any> {
  const seed = request.seed ?? Math.floor(Math.random() * 1000000000);
  const steps = request.steps ?? 20;
  const cfg = request.cfg ?? 8.0;
  const width = request.width ?? 512;
  const height = request.height ?? 512;
  const samplerName = request.samplerName ?? 'euler';
  const checkpoint = request.checkpoint ?? 'v1-5-pruned-emaonly.safetensors';

  return {
    "3": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": samplerName,
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
      "inputs": {
        "ckpt_name": checkpoint
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": request.prompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": request.negativePrompt || "text, watermark, bad quality, blurry",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": "JSAIOS_ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

export function buildComfyUIWorkflow(workflowId: string, params: Record<string, any>): Record<string, any> {
  return buildText2ImgWorkflow({
    prompt: params.prompt || 'A scenic landscape',
    ...params
  });
}
