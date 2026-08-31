/**
 * JSAIOS - Single-purpose helper: fetchOllamaModels
 * Retrieves available model catalog from local/remote Ollama instance.
 */

import type { ModelInfo } from '../../AIService';

export async function fetchOllamaModels(endpoint: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${endpoint}/api/tags`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) return [];

    return data.models.map((m: any) => ({
      name: m.name || m.model,
      sizeBytes: m.size,
      digest: m.digest,
      family: m.details?.family || 'ollama',
      format: m.details?.format || 'gguf'
    }));
  } catch {
    return [];
  }
}
