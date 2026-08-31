/**
 * JSAIOS - Single-purpose helper: fetchComfyUIModels
 * Fetches available Checkpoint and VAE model lists from ComfyUI object info.
 */

import type { ModelInfo } from '../../AIService';

export async function fetchComfyUIModels(endpoint: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${endpoint}/object_info/CheckpointLoaderSimple`);
    if (!res.ok) return [];

    const data = await res.json();
    const ckptNode = data.CheckpointLoaderSimple || data;
    const ckptList = ckptNode?.input?.required?.ckpt_name?.[0];

    if (Array.isArray(ckptList)) {
      return ckptList.map((modelName: string) => ({
        name: modelName,
        family: 'sd',
        format: 'safetensors'
      }));
    }

    return [];
  } catch {
    return [];
  }
}
