/**
 * JSAIOS - Single-purpose function: fetchComfyUIModels
 */

import type { ModelInfo } from '../AIService';

export async function fetchComfyUIModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${baseUrl}/object_info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const checkpointNode = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];

    if (Array.isArray(checkpointNode)) {
      return checkpointNode.map((ckpt: string) => ({
        id: ckpt,
        name: ckpt,
        family: 'diffusion'
      }));
    }
    return [];
  } catch {
    return [];
  }
}
