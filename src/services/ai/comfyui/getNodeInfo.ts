/**
 * JSAIOS - Single-purpose function: fetchComfyNodeInfo
 * Queries /object_info endpoint to inspect available nodes and their input/output schemas.
 */

export interface ComfyNodeSchema {
  name: string;
  category: string;
  description?: string;
  inputsRequired: Record<string, any>;
  inputsOptional?: Record<string, any>;
  outputTypes: string[];
}

export async function fetchComfyNodeInfo(baseUrl: string, nodeName?: string): Promise<ComfyNodeSchema[]> {
  try {
    const url = nodeName ? `${baseUrl}/object_info/${nodeName}` : `${baseUrl}/object_info`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const results: ComfyNodeSchema[] = [];

    const keys = nodeName ? [nodeName] : Object.keys(data);
    for (const key of keys) {
      const node = data[key];
      if (!node) continue;

      results.push({
        name: key,
        category: node.category || 'General',
        description: node.description || '',
        inputsRequired: node.input?.required || {},
        inputsOptional: node.input?.optional || {},
        outputTypes: node.output || []
      });
    }

    return results;
  } catch (err) {
    console.error('[ComfyUIService] Error fetching node info:', err);
    return [];
  }
}
