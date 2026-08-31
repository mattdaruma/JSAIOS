/**
 * JSAIOS - Single-purpose function: fetchOllamaModels
 */

import type { ModelInfo } from '../AIService';

export async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      family: m.details?.family || 'llm',
      sizeBytes: m.size,
      modifiedAt: m.modified_at
    }));
  } catch (err) {
    console.error('[OllamaService] Error fetching models:', err);
    return [];
  }
}
